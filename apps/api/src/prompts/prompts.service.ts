import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PromptType } from '@prisma/client';

const IMBALANCE_THRESHOLD = 70; // If one person has >70% of edits → warn
const WEAK_CHAT_THRESHOLD = 3;  // If chat count is very low → warn
const PROMPT_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes between same prompt type

@Injectable()
export class PromptsService {
  private readonly logger = new Logger(PromptsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Main rules evaluation — called after each code change.
   * Returns a prompt if a rule fires, otherwise null.
   */
  async evaluateParticipation(sessionId: string): Promise<{
    type: PromptType;
    message: string;
  } | null> {
    const participants = await this.prisma.sessionParticipant.findMany({
      where: { sessionId, leftAt: null },
    });

    if (participants.length < 2) return null;

    const totalEdits = participants.reduce((sum, p) => sum + p.editCount, 0);
    if (totalEdits < 10) return null; // Not enough data yet

    // Rule 1: Participation imbalance
    for (const p of participants) {
      const percentage = (p.editCount / totalEdits) * 100;
      if (percentage > IMBALANCE_THRESHOLD) {
        return this.maybeEmitPrompt(sessionId, PromptType.PARTICIPATION_IMBALANCE, {
          message: `One participant is doing most of the coding. Consider switching roles or explaining your approach to your partner.`,
        });
      }
    }

    // Rule 2: Weak communication (low chat count relative to edits)
    const totalChats = participants.reduce((sum, p) => sum + p.chatCount, 0);
    if (totalEdits > 20 && totalChats < WEAK_CHAT_THRESHOLD) {
      return this.maybeEmitPrompt(sessionId, PromptType.WEAK_COMMUNICATION, {
        message: `Your team hasn't communicated much yet. Try explaining your reasoning to your partner as you code.`,
      });
    }

    return null;
  }

  /**
   * Evaluate review quality — called when a review is submitted.
   */
  async evaluateReview(
    sessionId: string,
    explanation: string | null | undefined,
  ): Promise<{ type: PromptType; message: string } | null> {
    if (!explanation || explanation.trim().split(' ').length < 10) {
      return this.maybeEmitPrompt(sessionId, PromptType.WEAK_REVIEW_EXPLANATION, {
        message: `Your peer review explanation is brief. Try to be more specific — mention what was done well and what could be improved.`,
      });
    }
    return null;
  }

  /**
   * Prevents the same prompt type from firing too often within a cooldown window.
   */
  private async maybeEmitPrompt(
    sessionId: string,
    type: PromptType,
    data: { message: string },
  ): Promise<{ type: PromptType; message: string } | null> {
    const recent = await this.prisma.promptEvent.findFirst({
      where: {
        sessionId,
        type,
        createdAt: { gte: new Date(Date.now() - PROMPT_COOLDOWN_MS) },
      },
    });

    if (recent) return null; // Still within cooldown

    await this.prisma.promptEvent.create({
      data: { sessionId, type, message: data.message },
    });

    this.logger.log(`Prompt emitted: [${type}] for session ${sessionId}`);
    return { type, message: data.message };
  }

  async getSessionPrompts(sessionId: string) {
    return this.prisma.promptEvent.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
    });
  }
}