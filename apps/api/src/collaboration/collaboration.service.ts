import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PairRole } from '@prisma/client';

interface ParticipantRow {
  id: string;
  userId: string;
  sessionId: string;
  pairRole: PairRole;
  isOnline: boolean;
}

interface RoleSwitchResult {
  newRole: PairRole;
  participants: { userId: string; username: string; pairRole: PairRole }[];
  /** userIds whose role actually changed (for analytics) */
  switchedUserIds: string[];
}

@Injectable()
export class CollaborationService {
  private readonly logger = new Logger(CollaborationService.name);

  constructor(private prisma: PrismaService) {}

  async markOnline(userId: string, sessionId: string) {
    await this.prisma.sessionParticipant.update({
      where: { userId_sessionId: { userId, sessionId } },
      data: { isOnline: true, leftAt: null },
    });
  }

  async markOffline(userId: string, sessionId: string) {
    await this.prisma.sessionParticipant
      .update({
        where: { userId_sessionId: { userId, sessionId } },
        data: { isOnline: false, leftAt: new Date() },
      })
      .catch(() => {}); // Silently fail if participant not found
  }

  /**
   * Switches roles between Driver and Navigator using pessimistic locking.
   * Uses SELECT … FOR UPDATE to prevent race conditions.
   */
  async switchRoles(
    requestingUserId: string,
    sessionId: string,
  ): Promise<RoleSwitchResult> {
    return this.prisma.$transaction(async (tx) => {
      // Lock participant rows for this session to prevent concurrent switches
      const participants: ParticipantRow[] = await tx.$queryRawUnsafe(
        `SELECT id, "userId", "sessionId", "pairRole", "isOnline"
         FROM session_participants
         WHERE "sessionId" = $1 AND "leftAt" IS NULL
         FOR UPDATE`,
        sessionId,
      );

      const requesting = participants.find(
        (p) => p.userId === requestingUserId,
      );
      if (!requesting) {
        throw new NotFoundException('You are not in this session');
      }

      // Determine the new role for the requester
      const newRole: PairRole =
        requesting.pairRole === PairRole.DRIVER
          ? PairRole.NAVIGATOR
          : PairRole.DRIVER;

      // Guard: if trying to become DRIVER, ensure current DRIVER gives up
      if (newRole === PairRole.DRIVER) {
        const currentDriver = participants.find(
          (p) =>
            p.pairRole === PairRole.DRIVER && p.userId !== requestingUserId,
        );
        if (!currentDriver) {
          // No other driver exists, just promote self
          await tx.sessionParticipant.update({
            where: { id: requesting.id },
            data: { pairRole: PairRole.DRIVER },
          });
        } else {
          // Atomic swap: current DRIVER → NAVIGATOR, requester → DRIVER
          await tx.sessionParticipant.update({
            where: { id: currentDriver.id },
            data: { pairRole: PairRole.NAVIGATOR },
          });
          await tx.sessionParticipant.update({
            where: { id: requesting.id },
            data: { pairRole: PairRole.DRIVER },
          });
        }
      } else {
        // Requester is DRIVER wanting to become NAVIGATOR
        // Find the first NAVIGATOR to promote to DRIVER
        const currentNavigator = participants.find(
          (p) =>
            p.pairRole === PairRole.NAVIGATOR &&
            p.userId !== requestingUserId &&
            p.isOnline,
        );

        await tx.sessionParticipant.update({
          where: { id: requesting.id },
          data: { pairRole: PairRole.NAVIGATOR },
        });

        if (currentNavigator) {
          await tx.sessionParticipant.update({
            where: { id: currentNavigator.id },
            data: { pairRole: PairRole.DRIVER },
          });
        }
        // If no navigator to promote, the session has no DRIVER until
        // someone switches again — this is intentional for 1-user sessions
      }

      // Re-read the final state after updates
      const updated = await tx.sessionParticipant.findMany({
        where: { sessionId, leftAt: null },
        include: { user: { select: { id: true, username: true } } },
      });

      // Determine which users actually switched roles
      const switchedUserIds = updated
        .filter((u) => {
          const old = participants.find((p) => p.userId === u.userId);
          return old && old.pairRole !== u.pairRole;
        })
        .map((u) => u.userId);

      this.logger.log(
        `Role switch in session ${sessionId}: ` +
          updated.map((p) => `${p.user.username}=${p.pairRole}`).join(', '),
      );

      return {
        newRole,
        participants: updated.map((p) => ({
          userId: p.userId,
          username: p.user.username,
          pairRole: p.pairRole,
        })),
        switchedUserIds,
      };
    });
  }

  /**
   * Promote the first online NAVIGATOR to DRIVER.
   * Used when the current DRIVER disconnects.
   */
  async promoteNextDriver(sessionId: string): Promise<RoleSwitchResult | null> {
    return this.prisma.$transaction(async (tx) => {
      // Lock rows
      const participants: ParticipantRow[] = await tx.$queryRawUnsafe(
        `SELECT id, "userId", "sessionId", "pairRole", "isOnline"
         FROM session_participants
         WHERE "sessionId" = $1 AND "leftAt" IS NULL
         FOR UPDATE`,
        sessionId,
      );

      // Check if there's still a DRIVER online
      const onlineDriver = participants.find(
        (p) => p.pairRole === PairRole.DRIVER && p.isOnline,
      );
      if (onlineDriver) return null; // Someone else is driving, no failover needed

      // Find the first online NAVIGATOR to promote
      const candidate = participants.find(
        (p) => p.pairRole === PairRole.NAVIGATOR && p.isOnline,
      );
      if (!candidate) return null; // No one to promote

      await tx.sessionParticipant.update({
        where: { id: candidate.id },
        data: { pairRole: PairRole.DRIVER },
      });

      const updated = await tx.sessionParticipant.findMany({
        where: { sessionId, leftAt: null },
        include: { user: { select: { id: true, username: true } } },
      });

      this.logger.log(
        `DRIVER failover in session ${sessionId}: ` +
          `${updated.find((p) => p.userId === candidate.userId)?.user.username} promoted to DRIVER`,
      );

      return {
        newRole: PairRole.DRIVER,
        participants: updated.map((p) => ({
          userId: p.userId,
          username: p.user.username,
          pairRole: p.pairRole,
        })),
        switchedUserIds: [candidate.userId],
      };
    });
  }
}
