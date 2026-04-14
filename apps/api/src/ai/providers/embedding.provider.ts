import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

// ─── Interface ───────────────────────────────────────────────

export interface EmbeddingProvider {
  embed(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
  getDimensions(): number;
}

export const EMBEDDING_PROVIDER = 'EMBEDDING_PROVIDER';

// ─── OpenAI Implementation ──────────────────────────────────

@Injectable()
export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  private readonly client: OpenAI;
  private readonly model: string;
  private readonly dimensions = 1536;
  private readonly logger = new Logger(OpenAIEmbeddingProvider.name);

  constructor(private config: ConfigService) {
    this.client = new OpenAI({
      apiKey: this.config.get<string>('OPENAI_API_KEY', ''),
    });
    this.model = this.config.get<string>(
      'AI_EMBEDDING_MODEL',
      'text-embedding-3-small',
    );
  }

  getDimensions(): number {
    return this.dimensions;
  }

  async embed(text: string): Promise<number[]> {
    const results = await this.embedBatch([text]);
    return results[0];
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];

    try {
      const response = await this.client.embeddings.create({
        model: this.model,
        input: texts,
      });

      return response.data
        .sort((a, b) => a.index - b.index)
        .map((item) => item.embedding);
    } catch (error) {
      this.logger.error('Embedding generation failed', error);
      throw error;
    }
  }
}
