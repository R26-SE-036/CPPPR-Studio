import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async incrementEditCount(userId: string, sessionId: string) {
    await this.prisma.sessionParticipant.update({
      where: { userId_sessionId: { userId, sessionId } },
      data: { editCount: { increment: 1 } },
    });
  }

  async incrementChatCount(userId: string, sessionId: string) {
    await this.prisma.sessionParticipant.update({
      where: { userId_sessionId: { userId, sessionId } },
      data: { chatCount: { increment: 1 } },
    });
  }

  async incrementRoleSwitchCount(userId: string, sessionId: string) {
    await this.prisma.sessionParticipant.update({
      where: { userId_sessionId: { userId, sessionId } },
      data: { roleSwitchCount: { increment: 1 } },
    });
  }

  async getSessionStats(sessionId: string) {
    const participants = await this.prisma.sessionParticipant.findMany({
      where: { sessionId },
      include: { user: { select: { id: true, username: true } } },
    });

    const events = await this.prisma.sessionEvent.findMany({
      where: { sessionId },
    });

    const prompts = await this.prisma.promptEvent.findMany({
      where: { sessionId },
    });

    const reviews = await this.prisma.peerReview.findMany({
      where: { sessionId },
    });

    const totalEdits = participants.reduce((sum, p) => sum + p.editCount, 0);
    const totalChats = participants.reduce((sum, p) => sum + p.chatCount, 0);

    return {
      participants: participants.map((p) => ({
        userId: p.userId,
        username: p.user.username,
        pairRole: p.pairRole,
        editCount: p.editCount,
        chatCount: p.chatCount,
        roleSwitchCount: p.roleSwitchCount,
        editPercentage:
          totalEdits > 0 ? Math.round((p.editCount / totalEdits) * 100) : 0,
        chatPercentage:
          totalChats > 0 ? Math.round((p.chatCount / totalChats) * 100) : 0,
      })),
      totalEvents: events.length,
      totalPrompts: prompts.length,
      totalReviews: reviews.length,
      promptBreakdown: this.groupBy(prompts, 'type'),
    };
  }

  private groupBy<T extends { type: string }>(items: T[], key: keyof T) {
    return items.reduce(
      (acc, item) => {
        const k = String(item[key]);
        acc[k] = (acc[k] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
  }
}
