// ─── Interface ───────────────────────────────────────────────

export interface EmbeddingProvider {
  embed(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
  getDimensions(): number;
}

export const EMBEDDING_PROVIDER = 'EMBEDDING_PROVIDER';
