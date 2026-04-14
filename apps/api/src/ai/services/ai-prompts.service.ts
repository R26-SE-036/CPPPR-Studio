import { Injectable, Inject, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LLM_PROVIDER } from '../providers/llm.provider';
import type { LLMProvider } from '../providers/llm.provider';
import { QualityScoringService } from './quality-scoring.service';
import type { PromptType } from '@prisma/client';

/**
 * Extends the existing rule-based PromptsService with AI-powered suggestions.
 * The existing PromptsService still handles rule-based triggers.
 * This service adds richer, context-aware AI suggestions.
 */
@Injectable()
export class AiPromptsService {
  private readonly logger = new Logger(AiPromptsService.name);
  private readonly COOLDOWN_MS = 10 * 60 * 1000; // 10 min cooldown

  constructor(
    private prisma: PrismaService,
    private qualityScoring: QualityScoringService,
    @Inject(LLM_PROVIDER) private llm: LLMProvider,
  ) {}

  /**
   * Generate an AI-enhanced suggestion for a specific prompt type.
   * Called when the existing rule-based system fires a prompt.
   */
  async generateEnhancedSuggestion(
    sessionId: string,
    promptType: PromptType,
  ): Promise<string | null> {
    // Cooldown check — don't spam AI suggestions
    const recent = await this.prisma.promptEvent.findFirst({
      where: {
        sessionId,
        type: promptType,
        createdAt: {
          gte: new Date(Date.now() - this.COOLDOWN_MS),
        },
      },
    });
    if (recent) return null;

    // Get session context
    const participants = await this.prisma.sessionParticipant.findMany({
      where: { sessionId, leftAt: null },
      include: { user: { select: { username: true } } },
    });

    const participantInfo = participants
      .map(
        (p) =>
          `${p.user.username} (${p.pairRole}, ` +
          `edits: ${p.editCount}, chats: ${p.chatCount})`,
      )
      .join('; ');

    const promptMap: Record<string, string> = {
      PARTICIPATION_IMBALANCE:
        `In this pair programming session, the participation is imbalanced. ` +
        `Participants: ${participantInfo}. ` +
        `Write a brief, encouraging suggestion (2-3 sentences) to balance participation.`,
      WEAK_COMMUNICATION:
        `In this pair programming session, communication is weak. ` +
        `Participants: ${participantInfo}. ` +
        `Write a brief suggestion (2-3 sentences) encouraging better communication.`,
      WEAK_REVIEW_EXPLANATION:
        `A student submitted a peer review with a very brief explanation. ` +
        `Write a brief suggestion (2-3 sentences) on how to write better review feedback.`,
      ROLE_SWITCH_REMINDER:
        `This pair programming session has been running without a role switch. ` +
        `Participants: ${participantInfo}. ` +
        `Write a brief reminder (2-3 sentences) why switching roles is beneficial.`,
      ENCOURAGEMENT:
        `This pair programming session is going well. ` +
        `Participants: ${participantInfo}. ` +
        `Write a brief encouraging message (2-3 sentences).`,
    };

    const userPrompt = promptMap[promptType];
    if (!userPrompt) return null;

    try {
      const suggestion = await this.llm.chatCompletion(
        [
          {
            role: 'system',
            content:
              'You are a friendly pair programming coach. ' +
              'Write concise, actionable suggestions. ' +
              'Do not use markdown formatting.',
          },
          { role: 'user', content: userPrompt },
        ],
        { temperature: 0.7, maxTokens: 200 },
      );

      return suggestion;
    } catch {
      this.logger.warn(
        'Failed to generate AI suggestion, falling back to rule-based',
      );
      return null;
    }
  }

  /**
   * Get AI-generated improvement suggestions based on quality analysis.
   */
  async getImprovementSuggestions(sessionId: string): Promise<{
    suggestions: string[];
    scores: Record<string, number>;
  }> {
    const scores = await this.qualityScoring.analyzeSession(sessionId);

    // Enrich with AI if any score is low
    const lowScoreAreas: string[] = [];
    if (scores.communicationScore < 50) {
      lowScoreAreas.push('communication');
    }
    if (scores.participationScore < 50) {
      lowScoreAreas.push('participation balance');
    }
    if (scores.reviewQualityScore < 50) {
      lowScoreAreas.push('peer review quality');
    }

    if (lowScoreAreas.length > 0) {
      try {
        const aiSuggestion = await this.llm.chatCompletion(
          [
            {
              role: 'system',
              content:
                'You are a pair programming coach. Given areas of weakness, ' +
                'provide 2-3 specific, actionable tips. Be concise.',
            },
            {
              role: 'user',
              content:
                `Areas needing improvement: ${lowScoreAreas.join(', ')}. ` +
                `Communication: ${scores.communicationScore}/100, ` +
                `Participation: ${scores.participationScore}/100, ` +
                `Review quality: ${scores.reviewQualityScore}/100.`,
            },
          ],
          { temperature: 0.6, maxTokens: 300 },
        );

        scores.suggestions.push(aiSuggestion);
      } catch {
        // Graceful fallback — heuristic suggestions still present
      }
    }

    return {
      suggestions: scores.suggestions,
      scores: {
        communication: scores.communicationScore,
        participation: scores.participationScore,
        reviewQuality: scores.reviewQualityScore,
        overall: scores.overallCollaborationScore,
      },
    };
  }
}
