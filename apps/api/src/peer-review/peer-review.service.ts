import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PromptsService } from '../prompts/prompts.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { ReviewStatus, EventType } from '@prisma/client';
import { SessionsService } from '../sessions/sessions.service';

@Injectable()
export class PeerReviewService {
  constructor(
    private prisma: PrismaService,
    private promptsService: PromptsService,
    private sessionsService: SessionsService,
  ) {}

  async createOrUpdate(reviewerId: string, dto: CreateReviewDto) {
    const { sessionId, revieweeId, comments, ...reviewData } = dto;

    // Upsert the review
    const review = await this.prisma.peerReview.upsert({
      where: {
        // Prisma doesn't generate composite unique for non-@@unique fields automatically
        // so we query first then create/update
        id: await this.findExistingReviewId(reviewerId, sessionId, revieweeId),
      },
      create: {
        reviewerId,
        revieweeId,
        sessionId,
        ...reviewData,
      },
      update: reviewData,
    });

    // Replace all line comments if provided
    if (comments?.length) {
      await this.prisma.reviewComment.deleteMany({
        where: { reviewId: review.id },
      });
      await this.prisma.reviewComment.createMany({
        data: comments.map((c) => ({
          reviewId: review.id,
          authorId: reviewerId,
          lineNumber: c.lineNumber,
          content: c.content,
        })),
      });
    }

    return this.findById(review.id);
  }

  async submit(reviewId: string, reviewerId: string) {
    const review = await this.findById(reviewId);
    if (review.reviewerId !== reviewerId) {
      throw new ForbiddenException('Not your review');
    }

    const updated = await this.prisma.peerReview.update({
      where: { id: reviewId },
      data: { status: ReviewStatus.SUBMITTED, submittedAt: new Date() },
    });

    await this.sessionsService.logEvent(
      review.sessionId,
      reviewerId,
      EventType.PEER_REVIEW_SUBMITTED,
      { reviewId },
    );

    // Check review quality via prompts engine
    const prompt = await this.promptsService.evaluateReview(
      review.sessionId,
      review.explanation,
    );

    return { review: updated, prompt };
  }

  async findById(id: string) {
    const review = await this.prisma.peerReview.findUnique({
      where: { id },
      include: {
        reviewer: { select: { id: true, username: true } },
        reviewee: { select: { id: true, username: true } },
        comments: { orderBy: { lineNumber: 'asc' } },
      },
    });
    if (!review) throw new NotFoundException('Review not found');
    return review;
  }

  async findSessionReviews(sessionId: string) {
    return this.prisma.peerReview.findMany({
      where: { sessionId },
      include: {
        reviewer: { select: { id: true, username: true } },
        reviewee: { select: { id: true, username: true } },
        _count: { select: { comments: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async findExistingReviewId(
    reviewerId: string,
    sessionId: string,
    revieweeId: string,
  ): Promise<string> {
    const existing = await this.prisma.peerReview.findFirst({
      where: { reviewerId, sessionId, revieweeId },
    });
    return existing?.id ?? 'new'; // 'new' triggers a create in upsert
  }
}
