import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

// ─── Pluggable ML Interface (for future trained model swap) ──

export interface MLClassifier {
  predict(features: Record<string, number>): Promise<number>;
}

// ─── Scoring Result Types ────────────────────────────────────

export interface QualityScores {
  communicationScore: number; // 0–100
  participationScore: number; // 0–100
  reviewQualityScore: number; // 0–100
  overallCollaborationScore: number; // 0–100
  suggestions: string[];
  rawMetrics: Record<string, unknown>;
}

// ─── NLP Helpers ─────────────────────────────────────────────

const QUESTION_PATTERNS = /\?|how|why|what|when|where|could|should|would/i;
const ACTION_VERB_PATTERNS =
  /consider|try|refactor|rename|extract|simplify|fix|improve|add|remove|change|avoid|check|test|handle|use/i;
const CODE_REF_PATTERNS =
  /function|variable|class|method|line|loop|array|return|param|arg|if|else/i;

@Injectable()
export class QualityScoringService {
  private readonly logger = new Logger(QualityScoringService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Analyze collaboration quality for a session using heuristic + NLP scoring.
   */
  async analyzeSession(sessionId: string): Promise<QualityScores> {
    // Gather raw data
    const participants = await this.prisma.sessionParticipant.findMany({
      where: { sessionId },
      include: { user: { select: { id: true, username: true } } },
    });

    const chatMessages = await this.prisma.chatMessage.findMany({
      where: { sessionId },
      include: { user: { select: { id: true, username: true } } },
    });

    const reviews = await this.prisma.peerReview.findMany({
      where: { sessionId, status: 'SUBMITTED' },
      include: { comments: true },
    });

    // ── Communication Score ──────────────────────────────────
    const communicationScore = this.scoreCommunication(
      chatMessages,
      participants,
    );

    // ── Participation Score ──────────────────────────────────
    const participationScore = this.scoreParticipation(participants);

    // ── Review Quality Score ─────────────────────────────────
    const reviewQualityScore = this.scoreReviewQuality(reviews);

    // ── Overall weighted average ─────────────────────────────
    const overallCollaborationScore = Math.round(
      communicationScore.score * 0.35 +
        participationScore.score * 0.35 +
        reviewQualityScore.score * 0.3,
    );

    const suggestions = [
      ...communicationScore.suggestions,
      ...participationScore.suggestions,
      ...reviewQualityScore.suggestions,
    ];

    const result: QualityScores = {
      communicationScore: communicationScore.score,
      participationScore: participationScore.score,
      reviewQualityScore: reviewQualityScore.score,
      overallCollaborationScore,
      suggestions,
      rawMetrics: {
        totalMessages: chatMessages.length,
        totalParticipants: participants.length,
        totalReviews: reviews.length,
        communication: communicationScore.metrics,
        participation: participationScore.metrics,
        review: reviewQualityScore.metrics,
      },
    };

    // Persist the analysis
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    await (this.prisma as any).collaborationAnalysis.create({
      data: {
        sessionId,
        communicationScore: result.communicationScore,
        participationScore: result.participationScore,
        reviewQualityScore: result.reviewQualityScore,
        overallScore: result.overallCollaborationScore,
        suggestions: result.suggestions,
        rawMetrics: result.rawMetrics as object,
      },
    });

    return result;
  }

  // ─── Communication Scoring ─────────────────────────────────

  private scoreCommunication(
    messages: { content: string; userId: string }[],
    participants: { userId: string }[],
  ): {
    score: number;
    suggestions: string[];
    metrics: Record<string, number>;
  } {
    const suggestions: string[] = [];

    if (messages.length === 0) {
      return {
        score: 0,
        suggestions: [
          'No chat messages found. Communication is essential for effective pair programming.',
        ],
        metrics: {
          totalMessages: 0,
          avgLength: 0,
          questionRatio: 0,
          participantCoverage: 0,
        },
      };
    }

    // Metric: message count per participant
    const participantMsgCount = new Map<string, number>();
    for (const msg of messages) {
      participantMsgCount.set(
        msg.userId,
        (participantMsgCount.get(msg.userId) ?? 0) + 1,
      );
    }
    const participantCoverage =
      participantMsgCount.size / Math.max(participants.length, 1);

    // Metric: average message length (meaningful communication)
    const avgLength =
      messages.reduce((sum, m) => sum + m.content.length, 0) / messages.length;

    // NLP: question ratio (indicates dialogue)
    const questionCount = messages.filter((m) =>
      QUESTION_PATTERNS.test(m.content),
    ).length;
    const questionRatio = questionCount / messages.length;

    // Score calculation
    let score = 0;

    // Chat frequency (0–30 points; 20+ messages is ideal)
    score += Math.min(30, (messages.length / 20) * 30);

    // Message quality / length (0–25 points; avg >= 20 chars)
    score += Math.min(25, (avgLength / 20) * 25);

    // Question ratio (0–20 points; 20%+ questions)
    score += Math.min(20, (questionRatio / 0.2) * 20);

    // Participant coverage (0–25 points)
    score += participantCoverage * 25;

    score = Math.round(Math.min(100, score));

    // Suggestions
    if (participantCoverage < 1) {
      suggestions.push(
        'Not all participants are communicating in chat. ' +
          'Encourage everyone to share their thoughts.',
      );
    }
    if (questionRatio < 0.1) {
      suggestions.push(
        'Try asking more questions to your partner — ' +
          'it strengthens understanding.',
      );
    }
    if (avgLength < 15) {
      suggestions.push(
        'Chat messages are quite short. ' +
          'Try explaining your reasoning more clearly.',
      );
    }

    return {
      score,
      suggestions,
      metrics: {
        totalMessages: messages.length,
        avgLength: Math.round(avgLength),
        questionRatio: Math.round(questionRatio * 100),
        participantCoverage: Math.round(participantCoverage * 100),
      },
    };
  }

  // ─── Participation Scoring ─────────────────────────────────

  private scoreParticipation(
    participants: {
      userId: string;
      editCount: number;
      chatCount: number;
      roleSwitchCount: number;
    }[],
  ): {
    score: number;
    suggestions: string[];
    metrics: Record<string, number>;
  } {
    const suggestions: string[] = [];

    if (participants.length < 2) {
      return {
        score: 50,
        suggestions: [
          'Only one participant — pair programming requires at least two.',
        ],
        metrics: {
          editImbalance: 0,
          roleSwitches: 0,
          participantCount: participants.length,
        },
      };
    }

    const totalEdits = participants.reduce((s, p) => s + p.editCount, 0);
    const totalSwitches = participants.reduce(
      (s, p) => s + p.roleSwitchCount,
      0,
    );

    // Edit balance (how evenly edits are distributed)
    let editImbalance = 0;
    if (totalEdits > 0) {
      const maxEditShare = Math.max(
        ...participants.map((p) => p.editCount / totalEdits),
      );
      editImbalance = maxEditShare;
    }

    let score = 0;

    // Edit balance (0–40 points; 50/50 is ideal)
    const balanceScore = 1 - editImbalance;
    score += balanceScore * 2 * 40;

    // Role switches (0–30 points; 2+ switches is good)
    score += Math.min(30, (totalSwitches / 2) * 30);

    // Participation activity (0–30 points)
    score += Math.min(30, (totalEdits / 10) * 30);

    score = Math.round(Math.min(100, score));

    // Suggestions
    if (editImbalance > 0.7) {
      suggestions.push(
        'Participation is heavily imbalanced. ' +
          'Switch roles more often so both partners actively code.',
      );
    }
    if (totalSwitches === 0) {
      suggestions.push(
        'No role switches detected. ' +
          'Switching between Driver and Navigator improves learning.',
      );
    }

    return {
      score,
      suggestions,
      metrics: {
        editImbalance: Math.round(editImbalance * 100),
        roleSwitches: totalSwitches,
        participantCount: participants.length,
        totalEdits,
      },
    };
  }

  // ─── Review Quality Scoring ────────────────────────────────

  private scoreReviewQuality(
    reviews: {
      explanation: string | null;
      overallScore: number | null;
      rubricScores: unknown;
      comments: { content: string }[];
    }[],
  ): {
    score: number;
    suggestions: string[];
    metrics: Record<string, number>;
  } {
    const suggestions: string[] = [];

    if (reviews.length === 0) {
      return {
        score: 0,
        suggestions: [
          'No peer reviews submitted yet. ' +
            'Reviewing code helps both the reviewer and the author improve.',
        ],
        metrics: {
          reviewCount: 0,
          avgExplanationWords: 0,
          avgComments: 0,
          actionVerbPresence: 0,
        },
      };
    }

    // Explanation quality
    const explanationLengths = reviews.map(
      (r) => (r.explanation ?? '').split(/\s+/).filter(Boolean).length,
    );
    const avgExplanationWords =
      explanationLengths.reduce((a, b) => a + b, 0) / reviews.length;

    // Comment count
    const avgComments =
      reviews.reduce((s, r) => s + r.comments.length, 0) / reviews.length;

    // NLP: Action verb and code-reference presence
    const allTexts = reviews.flatMap((r) => [
      r.explanation ?? '',
      ...r.comments.map((c) => c.content),
    ]);
    const actionVerbCount = allTexts.filter((t) =>
      ACTION_VERB_PATTERNS.test(t),
    ).length;
    const codeRefCount = allTexts.filter((t) =>
      CODE_REF_PATTERNS.test(t),
    ).length;
    const actionVerbPresence =
      allTexts.length > 0 ? actionVerbCount / allTexts.length : 0;
    const codeRefPresence =
      allTexts.length > 0 ? codeRefCount / allTexts.length : 0;

    let score = 0;

    // Explanation length (0–30 points; 20+ words is good)
    score += Math.min(30, (avgExplanationWords / 20) * 30);

    // Comment count (0–25 points; 3+ comments is good)
    score += Math.min(25, (avgComments / 3) * 25);

    // Action verbs (0–20 points; 50%+ texts have them)
    score += Math.min(20, (actionVerbPresence / 0.5) * 20);

    // Code references (0–15 points)
    score += Math.min(15, (codeRefPresence / 0.3) * 15);

    // Rubric completeness (0–10 points)
    const rubricFilled = reviews.filter(
      (r) => r.rubricScores && Object.keys(r.rubricScores as object).length > 0,
    ).length;
    score += (rubricFilled / reviews.length) * 10;

    score = Math.round(Math.min(100, score));

    // Suggestions
    if (avgExplanationWords < 10) {
      suggestions.push(
        'Review explanations are too brief. ' +
          'Explain what went well and what could improve with specific examples.',
      );
    }
    if (avgComments < 2) {
      suggestions.push(
        'Add more line-specific comments to your reviews — ' +
          'they help the author understand exactly where improvements are needed.',
      );
    }
    if (actionVerbPresence < 0.3) {
      suggestions.push(
        'Use actionable language in your reviews ' +
          '(e.g., "consider renaming", "try extracting") to give concrete improvement steps.',
      );
    }

    return {
      score,
      suggestions,
      metrics: {
        reviewCount: reviews.length,
        avgExplanationWords: Math.round(avgExplanationWords),
        avgComments: Math.round(avgComments * 10) / 10,
        actionVerbPresence: Math.round(actionVerbPresence * 100),
      },
    };
  }
}
