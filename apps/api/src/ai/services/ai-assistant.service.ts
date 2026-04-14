import { Injectable, Inject, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { RagContextService } from './rag-context.service';
import { LLM_PROVIDER, LLMMessage } from '../providers/llm.provider';
import type { LLMProvider } from '../providers/llm.provider';

@Injectable()
export class AiAssistantService {
  private readonly logger = new Logger(AiAssistantService.name);
  private readonly CACHE_TTL = 300; // 5 min cache

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private ragContext: RagContextService,
    @Inject(LLM_PROVIDER) private llm: LLMProvider,
  ) {}

  /**
   * Answer a user's question about a session, grounded in session context.
   */
  async askQuestion(
    userId: string,
    sessionId: string,
    question: string,
  ): Promise<{ answer: string; conversationId: string }> {
    const context = await this.ragContext.buildContext(sessionId, question);
    const contextStr = this.ragContext.formatContextForPrompt(context);

    const messages: LLMMessage[] = [
      {
        role: 'system',
        content:
          'You are an AI assistant embedded in CPPPR Studio, a collaborative pair programming and peer review platform. ' +
          "Answer the student's question using the session context provided. Be concise, helpful, and educational. " +
          "If you don't have enough context, say so honestly.\n\n" +
          `Session Context:\n${contextStr}`,
      },
      { role: 'user', content: question },
    ];

    const answer = await this.llm.chatCompletion(messages);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const conversation = await (this.prisma as any).aiConversation.create({
      data: {
        sessionId,
        userId,
        messages: {
          create: [
            { role: 'user', content: question },
            { role: 'assistant', content: answer },
          ],
        },
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    return { answer, conversationId: conversation.id as string };
  }

  /**
   * Explain a code snippet with optional session context.
   */
  async explainCode(
    sessionId: string,
    code: string,
    language?: string,
  ): Promise<string> {
    const cacheKey = `ai:explain:${sessionId}:${this.hashStr(code)}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return cached;

    const context = await this.ragContext.buildContext(
      sessionId,
      'explain code',
    );
    const lang = language ?? context.language;

    const messages: LLMMessage[] = [
      {
        role: 'system',
        content:
          'You are a coding tutor in a pair programming session. ' +
          'Explain the following code clearly and concisely. ' +
          'Focus on what the code does, key logic, and any potential issues. ' +
          `Use simple language suitable for students.\n\nSession: "${context.sessionTitle}" (${lang})`,
      },
      {
        role: 'user',
        content: `Explain this code:\n\n\`\`\`${lang}\n${code}\n\`\`\``,
      },
    ];

    const explanation = await this.llm.chatCompletion(messages, {
      temperature: 0.5,
    });

    await this.redis.set(cacheKey, explanation, this.CACHE_TTL);
    return explanation;
  }

  /**
   * Improve a weak peer review comment.
   */
  async improveReview(
    sessionId: string,
    comment: string,
  ): Promise<{ original: string; improved: string }> {
    const context = await this.ragContext.buildContext(
      sessionId,
      'peer review feedback',
    );

    const messages: LLMMessage[] = [
      {
        role: 'system',
        content:
          'You are a peer review coach in a collaborative programming session. ' +
          'The student wrote a review comment that could be more helpful. ' +
          "Rewrite it to be more specific, constructive, and actionable while preserving the student's intent. " +
          'Return only the improved comment text. Do not wrap in quotes.\n\n' +
          `Session context:\n${this.ragContext.formatContextForPrompt(context)}`,
      },
      {
        role: 'user',
        content: `Improve this peer review comment: "${comment}"`,
      },
    ];

    const improved = await this.llm.chatCompletion(messages, {
      temperature: 0.6,
    });

    return { original: comment, improved };
  }

  /**
   * Generate a comprehensive collaboration session summary.
   */
  async generateSessionSummary(sessionId: string): Promise<string> {
    const cacheKey = `ai:summary:${sessionId}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return cached;

    const context = await this.ragContext.buildContext(
      sessionId,
      'summarize session collaboration',
    );
    const contextStr = this.ragContext.formatContextForPrompt(context);

    const messages: LLMMessage[] = [
      {
        role: 'system',
        content:
          'You are an AI assistant summarizing a pair programming session. ' +
          'Create a concise but comprehensive summary covering:\n' +
          '1. What the session was about\n' +
          '2. Who participated and in what roles\n' +
          '3. Key code changes and decisions\n' +
          '4. Communication patterns\n' +
          '5. Peer review highlights\n' +
          '6. Areas for improvement\n\n' +
          `Use the session context below.\n\n${contextStr}`,
      },
      {
        role: 'user',
        content: 'Generate a summary of this collaboration session.',
      },
    ];

    const summary = await this.llm.chatCompletion(messages, {
      maxTokens: 1500,
      temperature: 0.5,
    });

    await this.redis.set(cacheKey, summary, this.CACHE_TTL);
    return summary;
  }

  private hashStr(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const chr = str.charCodeAt(i);
      hash = (hash << 5) - hash + chr;
      hash |= 0;
    }
    return Math.abs(hash).toString(36);
  }
}
