import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { UseGuards, Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { WsJwtGuard } from '../common/guards/ws-jwt.guard';
import { ChatService } from './chat.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { SessionsService } from '../sessions/sessions.service';
import { EventType } from '@prisma/client';

interface SocketUser {
  id: string;
  username: string;
  role: string;
}

interface SocketData {
  user: SocketUser;
  sessionId: string;
}

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private chatService: ChatService,
    private analyticsService: AnalyticsService,
    private sessionsService: SessionsService,
  ) {}

  handleConnection(client: Socket) {
    this.logger.log(`Chat client connected: ${client.id}`);
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('chat:join')
  async handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string },
  ) {
    await client.join(data.sessionId);
    (client.data as SocketData).sessionId = data.sessionId;

    const history = await this.chatService.getHistory(data.sessionId);
    client.emit('chat:history', history);

    return { success: true };
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('chat:message')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string; content: string },
  ) {
    const user = (client.data as SocketData).user;
    if (!data.content?.trim()) return;

    const message = await this.chatService.saveMessage(
      user.id,
      data.sessionId,
      data.content.trim(),
    );

    await this.analyticsService.incrementChatCount(user.id, data.sessionId);
    await this.sessionsService.logEvent(
      data.sessionId,
      user.id,
      EventType.CHAT_MESSAGE,
      { preview: data.content.substring(0, 50) },
    );

    // Broadcast to the full session room
    this.server.to(data.sessionId).emit('chat:message', {
      id: message.id,
      content: message.content,
      createdAt: message.createdAt,
      user: { id: user.id, username: user.username },
    });
  }
}
