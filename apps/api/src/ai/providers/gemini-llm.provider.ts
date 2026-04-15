import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import { LLMMessage, LLMOptions, LLMProvider } from './llm.provider';

@Injectable()
export class GeminiProvider implements LLMProvider {
  private readonly client: GoogleGenAI;
  private readonly defaultModel: string;
  private readonly defaultTemperature: number;
  private readonly logger = new Logger(GeminiProvider.name);

  constructor(private config: ConfigService) {
    this.client = new GoogleGenAI({
      apiKey: this.config.get<string>('GEMINI_API_KEY', ''),
    });
    this.defaultModel = this.config.get<string>('AI_MODEL', 'gemini-2.5-flash');
    this.defaultTemperature = parseFloat(
      this.config.get<string>('AI_TEMPERATURE', '0.7'),
    );
  }

  async chatCompletion(
    messages: LLMMessage[],
    options?: LLMOptions,
  ): Promise<string> {
    try {
      // Extract system instructions if present
      const systemMessage = messages.find((m) => m.role === 'system');
      const standardMessages = messages.filter((m) => m.role !== 'system');

      // Convert messages to Gemini format
      const geminiContents = standardMessages.map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user', // Gemini uses model/user
        parts: [{ text: m.content }],
      }));

      const model = options?.model ?? this.defaultModel;

      const generateConfig: {
        temperature?: number;
        systemInstruction?: string;
      } = {
        temperature: options?.temperature ?? this.defaultTemperature,
      };

      if (systemMessage) {
        generateConfig.systemInstruction = systemMessage.content;
      }

      const response = await this.client.models.generateContent({
        model,
        contents: geminiContents,
        config: generateConfig,
      });

      return response.text?.trim() ?? '';
    } catch (error) {
      this.logger.error('Gemini completion failed', error);
      throw error;
    }
  }
}
