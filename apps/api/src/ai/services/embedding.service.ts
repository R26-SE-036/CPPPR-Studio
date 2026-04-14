import { Injectable, Inject, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EMBEDDING_PROVIDER } from '../providers/embedding.provider';
import type { EmbeddingProvider } from '../providers/embedding.provider';

interface EmbeddingRecord {
  id: string;
  content: string;
  sourceType: string;
  sourceId: string;
  sessionId: string;
  similarity: number;
}

@Injectable()
export class EmbeddingService implements OnModuleInit {
  private readonly logger = new Logger(EmbeddingService.name);

  constructor(
    private prisma: PrismaService,
    @Inject(EMBEDDING_PROVIDER)
    private embeddingProvider: EmbeddingProvider,
  ) {}

  async onModuleInit() {
    // Ensure pgvector extension exists
    try {
      await this.prisma.$executeRawUnsafe(
        'CREATE EXTENSION IF NOT EXISTS vector',
      );
      this.logger.log('pgvector extension verified');
    } catch {
      this.logger.warn(
        'Could not enable pgvector extension — vector search will be unavailable',
      );
    }
  }

  /**
   * Store an embedding for a text chunk.
   */
  async storeEmbedding(
    sessionId: string,
    content: string,
    sourceType: string,
    sourceId: string,
  ): Promise<void> {
    const vector = await this.embeddingProvider.embed(content);
    const vectorStr = `[${vector.join(',')}]`;

    await this.prisma.$executeRawUnsafe(
      `INSERT INTO ai_embeddings (id, content, "sourceType", "sourceId", embedding, "createdAt", "sessionId")
       VALUES (gen_random_uuid(), $1, $2, $3, $4::vector, NOW(), $5)`,
      content,
      sourceType,
      sourceId,
      vectorStr,
      sessionId,
    );
  }

  /**
   * Store multiple embeddings in batch.
   */
  async storeBatch(
    sessionId: string,
    items: { content: string; sourceType: string; sourceId: string }[],
  ): Promise<void> {
    if (items.length === 0) return;

    const texts = items.map((i) => i.content);
    const vectors = await this.embeddingProvider.embedBatch(texts);

    // Insert in parallel (batch of raw queries)
    await this.prisma.$transaction(
      items.map((item, idx) => {
        const vectorStr = `[${vectors[idx].join(',')}]`;
        return this.prisma.$executeRawUnsafe(
          `INSERT INTO ai_embeddings (id, content, "sourceType", "sourceId", embedding, "createdAt", "sessionId")
           VALUES (gen_random_uuid(), $1, $2, $3, $4::vector, NOW(), $5)`,
          item.content,
          item.sourceType,
          item.sourceId,
          vectorStr,
          sessionId,
        );
      }),
    );
  }

  /**
   * Retrieve top-k most similar embeddings for a query within a session.
   */
  async searchSimilar(
    sessionId: string,
    query: string,
    topK = 5,
  ): Promise<EmbeddingRecord[]> {
    const queryVector = await this.embeddingProvider.embed(query);
    const vectorStr = `[${queryVector.join(',')}]`;

    const results: EmbeddingRecord[] = await this.prisma.$queryRawUnsafe(
      `SELECT id, content, "sourceType", "sourceId", "sessionId",
              1 - (embedding <=> $1::vector) AS similarity
       FROM ai_embeddings
       WHERE "sessionId" = $2
       ORDER BY embedding <=> $1::vector
       LIMIT $3`,
      vectorStr,
      sessionId,
      topK,
    );

    return results;
  }

  /**
   * Delete all embeddings for a session (before reindexing).
   */
  async clearSessionEmbeddings(sessionId: string): Promise<void> {
    await this.prisma.$executeRawUnsafe(
      `DELETE FROM ai_embeddings WHERE "sessionId" = $1`,
      sessionId,
    );
  }

  /**
   * Check if a session has embeddings indexed.
   */
  async hasEmbeddings(sessionId: string): Promise<boolean> {
    const result: { count: bigint }[] = await this.prisma.$queryRawUnsafe(
      `SELECT COUNT(*) as count FROM ai_embeddings WHERE "sessionId" = $1`,
      sessionId,
    );
    return Number(result[0]?.count ?? 0) > 0;
  }
}
