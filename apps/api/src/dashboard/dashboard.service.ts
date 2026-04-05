import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getInstructorDashboard() {
    const [totalUsers, totalSessions, totalReviews, totalPrompts] =
      await Promise.all([
        this.prisma.user.count(),
        this.prisma.session.count(),
        this.prisma.peerReview.count({ where: { status: 'SUBMITTED' } }),
        this.prisma.promptEvent.count(),
      ]);

    const recentSessions = await this.prisma.session.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        creator: { select: { username: true } },
        _count: { select: { participants: true, chatMessages: true } },
      },
    });

    return {
      summary: { totalUsers, totalSessions, totalReviews, totalPrompts },
      recentSessions,
    };
  }

  async getStudentDashboard(userId: string) {
    const sessions = await this.prisma.session.findMany({
      where: { participants: { some: { userId } } },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { chatMessages: true, peerReviews: true } },
      },
    });

    const reviewsGiven = await this.prisma.peerReview.count({
      where: { reviewerId: userId, status: 'SUBMITTED' },
    });

    const reviewsReceived = await this.prisma.peerReview.count({
      where: { revieweeId: userId, status: 'SUBMITTED' },
    });

    return { sessions, reviewsGiven, reviewsReceived };
  }
}