import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

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

// ─── OpenAI Implementation ──────────────────────────────────

@Injectable()
export class OpenAIProvider implements LLMProvider {
  private readonly client: OpenAI;
  private readonly defaultModel: string;
  private readonly defaultTemperature: number;
  private readonly logger = new Logger(OpenAIProvider.name);

  constructor(private config: ConfigService) {
    this.client = new OpenAI({
      apiKey: this.config.get<string>('OPENAI_API_KEY', ''),
    });
    this.defaultModel = this.config.get<string>('AI_MODEL', 'gpt-4o-mini');
    this.defaultTemperature = parseFloat(
      this.config.get<string>('AI_TEMPERATURE', '0.7'),
    );
  }

  async chatCompletion(
    messages: LLMMessage[],
    options?: LLMOptions,
  ): Promise<string> {
    try {
      const response = await this.client.chat.completions.create({
        model: options?.model ?? this.defaultModel,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        temperature: options?.temperature ?? this.defaultTemperature,
        max_tokens: options?.maxTokens ?? 1024,
      });

      return response.choices[0]?.message?.content?.trim() ?? '';
    } catch (error) {
      this.logger.error('LLM completion failed', error);
      throw error;
    }
  }
}
