import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { CodeRunnerService } from '../code-runner/code-runner.service';
import { PrismaService } from '../../common/prisma.service';
import { MlService } from '../ml/ml.service';
import { MongoDbService } from '../../common/mongodb.service';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
})
export class WebsocketGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit, OnModuleDestroy {
  @WebSocketServer()
  server: Server;

  // Track room membership: sessionId -> Set<{ socketId, userId }>
  private rooms = new Map<string, Map<string, string>>(); // socketId -> userId
  private inactivityInterval: NodeJS.Timeout;
  private activeWorkCounters = new Map<string, number>(); // sessionId -> event count

  constructor(
    private readonly codeRunnerService: CodeRunnerService,
    private readonly prisma: PrismaService,
    private readonly mlService: MlService,
    private readonly mongodb: MongoDbService,
  ) {}

  onModuleInit() {
    // Run every 60 seconds to check for inactivity across all active sessions
    this.inactivityInterval = setInterval(() => {
      this.rooms.forEach((members, sessionId) => {
        if (members.size > 0) {
          this.triggerMlPrediction(sessionId);
        }
      });
    }, 60000);
  }

  onModuleDestroy() {
    if (this.inactivityInterval) {
      clearInterval(this.inactivityInterval);
    }
  }

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
    // Remove from all rooms and notify
    this.rooms.forEach((members, sessionId) => {
      if (members.has(client.id)) {
        const userId = members.get(client.id);
        members.delete(client.id);
        this.server.to(sessionId).emit('user_left', { userId });
      }
    });
  }

  @SubscribeMessage('join_room')
  async handleJoinRoom(
    @MessageBody() data: { sessionId: string; userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { sessionId, userId } = data;

    // Join the Socket.IO room
    client.join(sessionId);

    // Track membership
    if (!this.rooms.has(sessionId)) {
      this.rooms.set(sessionId, new Map());
    }
    this.rooms.get(sessionId)!.set(client.id, userId);

    // Log event to database
    await this.logEvent(sessionId, userId, 'JOIN', {});

    // Notify others
    client.to(sessionId).emit('user_joined', { userId });

    // Send current room state
    const memberIds = Array.from(this.rooms.get(sessionId)!.values());
    this.server.to(sessionId).emit('room_state', { members: memberIds });
  }

  @SubscribeMessage('code_change')
  async handleCodeChange(
    @MessageBody() data: { sessionId: string; code: string; userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { sessionId, code, userId } = data;

    // Broadcast to others in room (not sender)
    client.to(sessionId).emit('code_update', { code, userId });

    // Log event
    await this.logEvent(sessionId, userId, 'CODE_EDIT', {
      codeLength: code.length,
    });
  }

  @SubscribeMessage('role_switch')
  async handleRoleSwitch(
    @MessageBody() data: { sessionId: string; userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { sessionId, userId } = data;

    // Get session members and swap roles in DB
    const members = await this.prisma.pairSessionMember.findMany({
      where: { sessionId },
    });

    const newRoles: Record<string, string> = {};
    for (const member of members) {
      const newRole = member.role === 'DRIVER' ? 'NAVIGATOR' : 'DRIVER';
      await this.prisma.pairSessionMember.update({
        where: { id: member.id },
        data: { role: newRole },
      });
      newRoles[member.userId] = newRole;
    }

    // Broadcast new roles to everyone
    this.server.to(sessionId).emit('role_switch', { roles: newRoles });

    // Log event
    await this.logEvent(sessionId, userId, 'ROLE_SWITCH', { newRoles });
  }

  @SubscribeMessage('discussion_note')
  async handleDiscussionNote(
    @MessageBody() data: { sessionId: string; note: string; userId: string; userName?: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { sessionId, note, userId, userName } = data;

    // Broadcast to others in room (sender adds locally)
    client.to(sessionId).emit('discussion_note', {
      note,
      userId,
      userName: userName || 'Partner',
      timestamp: new Date().toISOString(),
    });

    // Log event
    await this.logEvent(sessionId, userId, 'DISCUSSION_NOTE', { note });
  }

  @SubscribeMessage('run_code')
  async handleRunCode(
    @MessageBody() data: { sessionId: string; code: string; userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { sessionId, code, userId } = data;

    // Log the run attempt
    await this.logEvent(sessionId, userId, 'CODE_RUN', { codeLength: code.length });

    // Actually compile and run the Java code
    try {
      const result = await this.codeRunnerService.runJava({ code });

      // Broadcast result to everyone in room
      this.server.to(sessionId).emit('code_result', result);

      // Log the result
      await this.logEvent(sessionId, userId, 'CODE_RUN_RESULT', {
        success: result.success,
        hasError: !!result.compileError || !!result.stderr,
      });

      // If failed, trigger ML prediction for possible LOGIC_STRUGGLE
      if (!result.success) {
        this.triggerMlPrediction(sessionId);
      }
    } catch (error) {
      this.server.to(sessionId).emit('code_result', {
        success: false,
        stdout: '',
        stderr: 'Internal error running code',
        compileError: null,
      });
    }
  }

  @SubscribeMessage('intervention_response')
  async handleInterventionResponse(
    @MessageBody() data: { sessionId: string; interventionId: string; accepted: boolean },
    @ConnectedSocket() client: Socket,
  ) {
    const { sessionId, interventionId, accepted } = data;

    // Update intervention in DB if it exists
    if (interventionId) {
      try {
        await this.prisma.intervention.update({
          where: { id: interventionId },
          data: { accepted },
        });
      } catch {
        // Intervention may not exist in DB yet
      }
    }

    // Log event
    await this.logEvent(sessionId, '', 'INTERVENTION_RESPONSE', {
      interventionId,
      accepted,
    });
  }

  @SubscribeMessage('end_session')
  async handleEndSession(
    @MessageBody() data: { sessionId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { sessionId } = data;

    // Broadcast to all members to redirect to review
    this.server.to(sessionId).emit('session_ended', { sessionId });
  }

  // ─── Helper Methods ──────────────────────────────────────────────

  private async logEvent(
    sessionId: string,
    userId: string,
    eventType: string,
    metadata: Record<string, any>,
  ) {
    try {
      await this.prisma.sessionEvent.create({
        data: {
          sessionId,
          userId,
          role: '',
          eventType,
          metadata: JSON.stringify(metadata),
        },
      });

      // Trigger ML periodically while actively working (e.g. every 30 events)
      const count = (this.activeWorkCounters.get(sessionId) || 0) + 1;
      this.activeWorkCounters.set(sessionId, count);
      
      if (count % 30 === 0) {
        this.triggerMlPrediction(sessionId);
      }
    } catch (error) {
      console.error('Failed to log event:', error);
    }
  }

  private async triggerMlPrediction(sessionId: string) {
    try {
      // Get recent events for feature extraction
      const recentEvents = await this.prisma.sessionEvent.findMany({
        where: { sessionId },
        orderBy: { timestamp: 'desc' },
        take: 50,
      });

      // Skip prediction if not enough events yet (session just started)
      if (recentEvents.length < 5) {
        return;
      }

      // Build simple features from recent events
      const features = this.extractSimpleFeatures(recentEvents);

      // Call ML service
      const prediction = await this.mlService.predictPairState(sessionId, features);

      // Log prediction and features to MongoDB for research analytics
      await this.mongodb.logMLEvent(sessionId, {
        features,
        prediction,
        timestamp: new Date(),
        source: 'real_time_prediction_engine',
      });

      if (prediction && prediction.predictedState !== 'PRODUCTIVE') {
        // Get intervention recommendation
        const intervention = await this.mlService.recommendIntervention(
          sessionId,
          prediction.predictedState,
          prediction.confidence,
        );

        if (intervention && intervention.action !== 'NO_ACTION') {
          // Save intervention to DB
          const saved = await this.prisma.intervention.create({
            data: {
              sessionId,
              state: prediction.predictedState,
              action: intervention.action,
              uiTarget: intervention.delivery?.uiTarget || 'none',
              uiEffect: intervention.delivery?.uiEffect || 'none',
              message: intervention.delivery?.message || '',
            },
          });

          // Broadcast to room
          this.server.to(sessionId).emit('intervention', {
            id: saved.id,
            state: prediction.predictedState,
            action: intervention.action,
            delivery: intervention.delivery,
          });

          // If LOGIC_STRUGGLE, also retrieve RAG hint
          if (prediction.predictedState === 'LOGIC_STRUGGLE') {
            const session = await this.prisma.pairSession.findUnique({
              where: { id: sessionId },
              include: { question: true },
            });

            if (session?.question) {
              const conceptTags = (session.question.conceptTags as string[]) || [];
              const hint = await this.mlService.retrieveHint({
                sessionId,
                pairId: '',
                predictedState: 'LOGIC_STRUGGLE',
                interventionType: 'LOGIC_HINT',
                questionConceptTags: conceptTags,
                recentErrorContext: '',
                recentCodeSnippet: '',
              });

              if (hint) {
                this.server.to(sessionId).emit('rag_hint', hint);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('ML prediction failed:', error);
    }
  }

  private extractSimpleFeatures(events: any[]): Record<string, number> {
    const now = Date.now();
    const threeMinAgo = now - 3 * 60 * 1000;

    const recentEvents = events.filter(
      (e) => new Date(e.timestamp).getTime() > threeMinAgo,
    );

    const codeEdits = recentEvents.filter((e) => e.eventType === 'CODE_EDIT');
    const codeRuns = recentEvents.filter((e) => e.eventType === 'CODE_RUN_RESULT');
    const discussions = recentEvents.filter((e) => e.eventType === 'DISCUSSION_NOTE');
    const roleSwitches = recentEvents.filter((e) => e.eventType === 'ROLE_SWITCH');

    const uniqueEditors = new Set(codeEdits.map((e) => e.userId));
    const successfulRuns = codeRuns.filter((e) => {
      try { return JSON.parse(e.metadata)?.success; } catch { return false; }
    });

    return {
      edit_balance_ratio_3m: uniqueEditors.size >= 2 ? 0.5 : (codeEdits.length > 0 ? 0.9 : 0.5),
      avg_run_success_rate_3m: codeRuns.length > 0 ? successfulRuns.length / codeRuns.length : 0.5,
      total_discussion_note_count_3m: discussions.length,
      navigator_chat_count_3m: discussions.length, // simplified
      avg_idle_ratio_3m: recentEvents.length < 3 ? 0.8 : 0.2,
      role_switch_frequency_3m: roleSwitches.length,
      error_recovery_time_avg_3m: 30,
      collaboration_score_3m: 0.5,
    };
  }
}
