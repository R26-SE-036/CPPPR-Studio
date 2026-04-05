import { Module } from '@nestjs/common';
import { CollaborationGateway } from './collaboration.gateway';
import { CollaborationService } from './collaboration.service';
import { SessionsModule } from '../sessions/sessions.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { PromptsModule } from '../prompts/prompts.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [SessionsModule, AnalyticsModule, PromptsModule, AuthModule],
  providers: [CollaborationGateway, CollaborationService],
  exports: [CollaborationService],
})
export class CollaborationModule {}