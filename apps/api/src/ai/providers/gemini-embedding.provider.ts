import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import { EmbeddingProvider } from './embedding.provider';

@Injectable()
export class GeminiEmbeddingProvider implements EmbeddingProvider {
  private readonly client: GoogleGenAI;
  private readonly model: string;
  private readonly dimensions = 768; // text-embedding-004 output dimension
  private readonly logger = new Logger(GeminiEmbeddingProvider.name);

  constructor(private config: ConfigService) {
    this.client = new GoogleGenAI({
      apiKey: this.config.get<string>('GEMINI_API_KEY', ''),
    });
    this.model = this.config.get<string>(
      'AI_EMBEDDING_MODEL',
      'text-embedding-004',
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
      const promises = texts.map((text) =>
        this.client.models.embedContent({
          model: this.model,
          contents: text,
        }),
      );

      const responses = await Promise.all(promises);

      return responses.map(
        (response) => response.embeddings?.[0]?.values || [],
      );
    } catch (error) {
      this.logger.error('Gemini embedding generation failed', error);
      throw error;
    }
  }
}
