import { Module } from '@nestjs/common';
import { PeerReviewService } from './peer-review.service';
import { PeerReviewController } from './peer-review.controller';
import { PromptsModule } from '../prompts/prompts.module';
import { SessionsModule } from '../sessions/sessions.module';

@Module({
  imports: [PromptsModule, SessionsModule],
  providers: [PeerReviewService],
  controllers: [PeerReviewController],
})
export class PeerReviewModule {}