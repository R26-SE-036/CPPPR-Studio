import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EmbeddingService } from './embedding.service';

interface ContextChunk {
  type: string;
  content: string;
  similarity?: number;
}

interface SessionContext {
  sessionTitle: string;
  language: string;
  status: string;
  participantSummary: string;
  relevantChunks: ContextChunk[];
  codeSummary: string;
}

@Injectable()
export class RagContextService {
  private readonly logger = new Logger(RagContextService.name);

  constructor(
    private prisma: PrismaService,
    private embeddingService: EmbeddingService,
  ) {}

  /**
   * Build a comprehensive context for the LLM from a session.
   * Uses vector search if embeddings are available, otherwise falls back
   * to direct database queries.
   */
  async buildContext(
    sessionId: string,
    query: string,
    maxChunks = 8,
  ): Promise<SessionContext> {
    // Fetch session metadata
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        creator: { select: { username: true } },
        participants: {
          include: { user: { select: { username: true } } },
          where: { leftAt: null },
        },
      },
    });

    if (!session) {
      return {
        sessionTitle: 'Unknown session',
        language: 'unknown',
        status: 'unknown',
        participantSummary: '',
        relevantChunks: [],
        codeSummary: '',
      };
    }

    const participantSummary = session.participants
      .map(
        (p) =>
          `${p.user.username} (${p.pairRole}, edits: ${p.editCount}, chats: ${p.chatCount})`,
      )
      .join('; ');

    const codeSummary = session.currentCode
      ? `Current code (${session.currentCode.length} chars, first 500): ${session.currentCode.substring(0, 500)}`
      : 'No code written yet.';

    // Try vector search first, fall back to direct retrieval
    let relevantChunks: ContextChunk[];
    const hasEmbeddings = await this.embeddingService.hasEmbeddings(sessionId);

    if (hasEmbeddings) {
      this.logger.debug(`Using vector search for session ${sessionId}`);
      const results = await this.embeddingService.searchSimilar(
        sessionId,
        query,
        maxChunks,
      );
      relevantChunks = results.map((r) => ({
        type: r.sourceType,
        content: r.content,
        similarity: r.similarity,
      }));
    } else {
      this.logger.debug(`Falling back to direct retrieval for ${sessionId}`);
      relevantChunks = await this.directRetrieval(sessionId, maxChunks);
    }

    return {
      sessionTitle: session.title,
      language: session.language,
      status: session.status,
      participantSummary,
      relevantChunks,
      codeSummary,
    };
  }

  /**
   * Fallback: retrieve recent data directly from database without vectors.
   */
  private async directRetrieval(
    sessionId: string,
    maxChunks: number,
  ): Promise<ContextChunk[]> {
    const chunks: ContextChunk[] = [];

    // Recent chat messages
    const messages = await this.prisma.chatMessage.findMany({
      where: { sessionId },
      include: { user: { select: { username: true } } },
      orderBy: { createdAt: 'desc' },
      take: Math.min(maxChunks, 10),
    });
    for (const msg of messages) {
      chunks.push({
        type: 'chat',
        content: `[Chat] ${msg.user.username}: ${msg.content}`,
      });
    }

    // Recent events
    const events = await this.prisma.sessionEvent.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });
    for (const ev of events) {
      chunks.push({
        type: 'event',
        content: `[Event] ${ev.type} ${ev.payload ? JSON.stringify(ev.payload) : ''}`,
      });
    }

    // Peer review comments
    const reviews = await this.prisma.peerReview.findMany({
      where: { sessionId },
      include: {
        reviewer: { select: { username: true } },
        comments: { take: 5, orderBy: { lineNumber: 'asc' } },
      },
      take: 3,
    });
    for (const review of reviews) {
      const commentText = review.comments
        .map((c) => `L${c.lineNumber}: ${c.content}`)
        .join('; ');
      chunks.push({
        type: 'review',
        content: `[Review by ${review.reviewer.username}] Score: ${review.overallScore ?? 'N/A'}, Explanation: ${review.explanation ?? 'none'}. Comments: ${commentText || 'none'}`,
      });
    }

    return chunks.slice(0, maxChunks);
  }

  /**
   * Index all session data as embeddings for future vector search.
   */
  async indexSession(sessionId: string): Promise<number> {
    // Clear existing embeddings
    await this.embeddingService.clearSessionEmbeddings(sessionId);

    const items: { content: string; sourceType: string; sourceId: string }[] =
      [];

    // Chat messages
    const messages = await this.prisma.chatMessage.findMany({
      where: { sessionId },
      include: { user: { select: { username: true } } },
    });
    for (const msg of messages) {
      items.push({
        content: `${msg.user.username}: ${msg.content}`,
        sourceType: 'chat',
        sourceId: msg.id,
      });
    }

    // Session events (summarized)
    const events = await this.prisma.sessionEvent.findMany({
      where: { sessionId },
    });
    for (const ev of events) {
      items.push({
        content: `Event ${ev.type}: ${ev.payload ? JSON.stringify(ev.payload) : 'no payload'}`,
        sourceType: 'event',
        sourceId: ev.id,
      });
    }

    // Peer review data
    const reviews = await this.prisma.peerReview.findMany({
      where: { sessionId },
      include: {
        reviewer: { select: { username: true } },
        comments: true,
      },
    });
    for (const review of reviews) {
      if (review.explanation) {
        items.push({
          content: `Review by ${review.reviewer.username}: ${review.explanation}`,
          sourceType: 'review',
          sourceId: review.id,
        });
      }
      for (const comment of review.comments) {
        items.push({
          content: `Review comment on line ${comment.lineNumber}: ${comment.content}`,
          sourceType: 'review',
          sourceId: comment.id,
        });
      }
    }

    // Code chunks (split long code into ~500-char chunks)
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
    });
    if (session?.currentCode) {
      const codeChunks = this.chunkText(session.currentCode, 500);
      codeChunks.forEach((chunk, idx) => {
        items.push({
          content: `Code (chunk ${idx + 1}): ${chunk}`,
          sourceType: 'code',
          sourceId: `${sessionId}-code-${idx}`,
        });
      });
    }

    // Store in batches of 20 to avoid API rate limits
    const batchSize = 20;
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      await this.embeddingService.storeBatch(sessionId, batch);
    }

    this.logger.log(`Indexed ${items.length} chunks for session ${sessionId}`);
    return items.length;
  }

  /**
   * Format context into a string suitable for an LLM system prompt.
   */
  formatContextForPrompt(context: SessionContext): string {
    const parts = [
      `Session: "${context.sessionTitle}" (${context.language}, status: ${context.status})`,
      `Participants: ${context.participantSummary}`,
      `Code: ${context.codeSummary}`,
    ];

    if (context.relevantChunks.length > 0) {
      parts.push('Relevant session context:');
      for (const chunk of context.relevantChunks) {
        const sim = chunk.similarity
          ? ` (relevance: ${(chunk.similarity * 100).toFixed(0)}%)`
          : '';
        parts.push(`  - ${chunk.content}${sim}`);
      }
    }

    return parts.join('\n');
  }

  private chunkText(text: string, maxLen: number): string[] {
    const chunks: string[] = [];
    const lines = text.split('\n');
    let current = '';

    for (const line of lines) {
      if (current.length + line.length + 1 > maxLen && current.length > 0) {
        chunks.push(current);
        current = line;
      } else {
        current += (current ? '\n' : '') + line;
      }
    }
    if (current) chunks.push(current);
    return chunks;
  }
}
