import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PairRole } from '@prisma/client';

@Injectable()
export class CollaborationService {
  constructor(private prisma: PrismaService) {}

  async markOnline(userId: string, sessionId: string) {
    await this.prisma.sessionParticipant.update({
      where: { userId_sessionId: { userId, sessionId } },
      data: { isOnline: true, leftAt: null },
    });
  }

  async markOffline(userId: string, sessionId: string) {
    await this.prisma.sessionParticipant.update({
      where: { userId_sessionId: { userId, sessionId } },
      data: { isOnline: false, leftAt: new Date() },
    }).catch(() => {}); // Silently fail if participant not found
  }

  /**
   * Switches roles between Driver and Navigator within the session.
   * Finds the current Driver → makes them Navigator, and vice versa.
   */
  async switchRoles(requestingUserId: string, sessionId: string) {
    const participants = await this.prisma.sessionParticipant.findMany({
      where: { sessionId, leftAt: null },
      include: { user: { select: { id: true, username: true } } },
    });

    const requesting = participants.find((p) => p.userId === requestingUserId);
    if (!requesting) throw new NotFoundException('You are not in this session');

    // Toggle Driver ↔ Navigator
    const newRole: PairRole =
      requesting.pairRole === PairRole.DRIVER ? PairRole.NAVIGATOR : PairRole.DRIVER;

    const updates = participants.map((p) => {
      if (p.userId === requestingUserId) return { ...p, pairRole: newRole };
      // Swap the other main participant
      if (p.pairRole === PairRole.NAVIGATOR && newRole === PairRole.DRIVER) {
        return { ...p, pairRole: PairRole.NAVIGATOR };
      }
      if (p.pairRole === PairRole.DRIVER && newRole === PairRole.NAVIGATOR) {
        return { ...p, pairRole: PairRole.DRIVER };
      }
      return p;
    });

    // Persist all role changes in a transaction
    await this.prisma.$transaction(
      participants.map((p) => {
        const updated = updates.find((u) => u.id === p.id);
        return this.prisma.sessionParticipant.update({
          where: { id: p.id },
          data: { pairRole: updated?.pairRole ?? p.pairRole },
        });
      }),
    );

    return {
      newRole,
      participants: updates.map((p) => ({
        userId: p.userId,
        username: p.user.username,
        pairRole: p.pairRole,
      })),
    };
  }
}