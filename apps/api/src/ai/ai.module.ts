import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiAssistantService } from './services/ai-assistant.service';
import { RagContextService } from './services/rag-context.service';
import { EmbeddingService } from './services/embedding.service';
import { QualityScoringService } from './services/quality-scoring.service';
import { AiPromptsService } from './services/ai-prompts.service';
import { GeminiProvider } from './providers/gemini-llm.provider';
import { GeminiEmbeddingProvider } from './providers/gemini-embedding.provider';
import { LLM_PROVIDER } from './providers/llm.provider';
import { EMBEDDING_PROVIDER } from './providers/embedding.provider';
import { RedisModule } from '../redis/redis.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [RedisModule, AuthModule],
  controllers: [AiController],
  providers: [
    // Provider abstractions (swap implementations here)
    { provide: LLM_PROVIDER, useClass: GeminiProvider },
    { provide: EMBEDDING_PROVIDER, useClass: GeminiEmbeddingProvider },

    // Core services
    AiAssistantService,
    RagContextService,
    EmbeddingService,
    QualityScoringService,
    AiPromptsService,
  ],
  exports: [AiAssistantService, QualityScoringService, AiPromptsService],
})
export class AiModule {}
