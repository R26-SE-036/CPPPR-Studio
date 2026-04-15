// ─── Interface ───────────────────────────────────────────────

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMOptions {
  temperature?: number;
  maxTokens?: number;
  model?: string;
}

export interface LLMProvider {
  chatCompletion(messages: LLMMessage[], options?: LLMOptions): Promise<string>;
}

export const LLM_PROVIDER = 'LLM_PROVIDER';
