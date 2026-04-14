import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
  WsException,
} from '@nestjs/websockets';
import { UseGuards, Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { WsJwtGuard } from '../common/guards/ws-jwt.guard';
import { CollaborationService } from './collaboration.service';
import { SessionsService } from '../sessions/sessions.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { PromptsService } from '../prompts/prompts.service';
import { EventType, PairRole } from '@prisma/client';

interface SocketUser {
  id: string;
  username: string;
  role: string;
}

interface SocketData {
  user: SocketUser;
  sessionId: string;
  pairRole: string;
}

// Debounce tracking: sessionId → last switch timestamp
const roleSwitchCooldowns = new Map<string, number>();
const ROLE_SWITCH_COOLDOWN_MS = 2000; // 2 seconds

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/collab',
})
export class CollaborationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(CollaborationGateway.name);

  constructor(
    private collaborationService: CollaborationService,
    private sessionsService: SessionsService,
    private analyticsService: AnalyticsService,
    private promptsService: PromptsService,
  ) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  async handleDisconnect(client: Socket) {
    const socketData = client.data as Partial<SocketData>;
    const user = socketData.user;
    const sessionId = socketData.sessionId;

    if (user && sessionId) {
      const wasDriver = socketData.pairRole === PairRole.DRIVER;

      await this.collaborationService.markOffline(user.id, sessionId);

      client.to(sessionId).emit('participant:left', {
        userId: user.id,
        username: user.username,
      });

      this.logger.log(`${user.username} left session ${sessionId}`);

      // DRIVER failover: if the disconnecting user was DRIVER,
      // promote the first online NAVIGATOR
      if (wasDriver) {
        const failover =
          await this.collaborationService.promoteNextDriver(sessionId);

        if (failover) {
          // Update all remaining sockets in the room
          this.updateSocketRolesInRoom(sessionId, failover.participants);

          // Log the automatic event
          await this.sessionsService.logEvent(
            sessionId,
            null,
            EventType.ROLE_SWITCHED,
            {
              reason: 'driver_disconnect_failover',
              promoted: failover.switchedUserIds,
            },
          );

          // Broadcast updated roles to all remaining participants
          this.server.to(sessionId).emit('role:updated', failover.participants);

          this.logger.log(`DRIVER failover triggered in session ${sessionId}`);
        }
      }
    }
  }

  // ── Join a session room ──────────────────────────────────────
  @UseGuards(WsJwtGuard)
  @SubscribeMessage('session:join')
  async handleJoinSession(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string },
  ) {
    const user = (client.data as SocketData).user;
    const { sessionId } = data;

    try {
      const session = await this.sessionsService.findById(sessionId);
      const participant = session.participants.find(
        (p) => p.userId === user.id,
      );

      if (!participant)
        throw new WsException('You are not a participant of this session');

      // Join the Socket.IO room
      client.join(sessionId);
      (client.data as SocketData).sessionId = sessionId;
      (client.data as SocketData).pairRole = participant.pairRole;

      // Mark as online
      await this.collaborationService.markOnline(user.id, sessionId);

      // Send current code state to the joining client
      client.emit('session:state', {
        code: session.currentCode,
        language: session.language,
        participants: session.participants,
      });

      // Notify others
      client.to(sessionId).emit('participant:joined', {
        userId: user.id,
        username: user.username,
        pairRole: participant.pairRole,
      });

      this.logger.log(
        `${user.username} joined session room ${sessionId} as ${participant.pairRole}`,
      );
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      throw new WsException(message);
    }
  }

  // ── Code change (only Driver can edit) ──────────────────────
  @UseGuards(WsJwtGuard)
  @SubscribeMessage('code:change')
  async handleCodeChange(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { code: string; sessionId: string },
  ) {
    const user = (client.data as SocketData).user;
    const { code, sessionId } = data;

    // Permission check: only Driver can push code changes
    if ((client.data as SocketData).pairRole !== PairRole.DRIVER) {
      throw new WsException('Only the Driver can edit code');
    }

    // Persist code state
    await this.sessionsService.updateCode(sessionId, code);

    // Increment edit count for analytics
    await this.analyticsService.incrementEditCount(user.id, sessionId);

    // Log event
    await this.sessionsService.logEvent(
      sessionId,
      user.id,
      EventType.CODE_EDITED,
      { length: code.length },
    );

    // Broadcast to everyone in the room
    client.to(sessionId).emit('code:update', { code, userId: user.id });

    // Run prompt rules (async — don't block)
    void this.promptsService
      .evaluateParticipation(sessionId)
      .then((prompt) => {
        if (prompt) {
          this.server.to(sessionId).emit('prompt:new', prompt);
        }
      })
      .catch(() => {});
  }

  // ── Role switch ──────────────────────────────────────────────
  @UseGuards(WsJwtGuard)
  @SubscribeMessage('role:switch')
  async handleRoleSwitch(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string },
  ) {
    const user = (client.data as SocketData).user;
    const { sessionId } = data;

    // Debounce: prevent rapid switching spam
    const lastSwitch = roleSwitchCooldowns.get(sessionId) ?? 0;
    const now = Date.now();
    if (now - lastSwitch < ROLE_SWITCH_COOLDOWN_MS) {
      throw new WsException(
        'Role switch is on cooldown. Please wait a moment.',
      );
    }
    roleSwitchCooldowns.set(sessionId, now);

    const result = await this.collaborationService.switchRoles(
      user.id,
      sessionId,
    );

    // Update ALL sockets in the room with their new pairRole
    this.updateSocketRolesInRoom(sessionId, result.participants);

    // Log event
    await this.sessionsService.logEvent(
      sessionId,
      user.id,
      EventType.ROLE_SWITCHED,
      { newRole: result.newRole },
    );

    // Increment role switch counter for ALL participants whose role changed
    for (const switchedUserId of result.switchedUserIds) {
      await this.analyticsService.incrementRoleSwitchCount(
        switchedUserId,
        sessionId,
      );
    }

    // Broadcast new role assignments to everyone in room
    this.server.to(sessionId).emit('role:updated', result.participants);

    return { success: true, newRole: result.newRole };
  }

  // ── Cursor position (Navigator sees where Driver is) ────────
  @UseGuards(WsJwtGuard)
  @SubscribeMessage('cursor:move')
  handleCursorMove(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: { sessionId: string; line: number; column: number },
  ) {
    const user = (client.data as SocketData).user;
    client.to(data.sessionId).emit('cursor:update', {
      userId: user.id,
      username: user.username,
      line: data.line,
      column: data.column,
    });
  }

  // ── Helper: update pairRole on ALL sockets in a session room ──
  private updateSocketRolesInRoom(
    sessionId: string,
    participants: { userId: string; pairRole: PairRole }[],
  ) {
    const room = this.server.sockets.adapter.rooms.get(sessionId);
    if (!room) return;

    for (const socketId of room) {
      const socket = this.server.sockets.sockets.get(socketId);
      if (!socket) continue;

      const socketUser = (socket.data as Partial<SocketData>).user;
      if (!socketUser) continue;

      const match = participants.find((p) => p.userId === socketUser.id);
      if (match) {
        (socket.data as SocketData).pairRole = match.pairRole;
      }
    }
  }
}
