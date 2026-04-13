import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  async saveMessage(userId: string, sessionId: string, content: string) {
    return this.prisma.chatMessage.create({
      data: { userId, sessionId, content },
      include: { user: { select: { id: true, username: true } } },
    });
  }

  async getHistory(sessionId: string) {
    return this.prisma.chatMessage.findMany({
      where: { sessionId },
      include: { user: { select: { id: true, username: true } } },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });
  }
}
