import { Controller, Post, Get, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AiAssistantService } from './services/ai-assistant.service';
import { QualityScoringService } from './services/quality-scoring.service';
import { RagContextService } from './services/rag-context.service';
import { AskQuestionDto } from './dto/ask-question.dto';
import { ExplainCodeDto } from './dto/explain-code.dto';
import { ImproveReviewDto } from './dto/improve-review.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('ai')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  constructor(
    private aiAssistant: AiAssistantService,
    private qualityScoring: QualityScoringService,
    private ragContext: RagContextService,
  ) {}

  @Post('ask')
  ask(@CurrentUser() user: { id: string }, @Body() dto: AskQuestionDto) {
    return this.aiAssistant.askQuestion(user.id, dto.sessionId, dto.question);
  }

  @Post('explain-code')
  explainCode(@Body() dto: ExplainCodeDto) {
    return this.aiAssistant
      .explainCode(dto.sessionId, dto.code, dto.language)
      .then((explanation) => ({ explanation }));
  }

  @Post('improve-review')
  improveReview(@Body() dto: ImproveReviewDto) {
    return this.aiAssistant.improveReview(dto.sessionId, dto.comment);
  }

  @Post('session-summary/:sessionId')
  generateSummary(@Param('sessionId') sessionId: string) {
    return this.aiAssistant
      .generateSessionSummary(sessionId)
      .then((summary) => ({ summary }));
  }

  @Get('quality/:sessionId')
  analyzeQuality(@Param('sessionId') sessionId: string) {
    return this.qualityScoring.analyzeSession(sessionId);
  }

  @Post('index-session/:sessionId')
  indexSession(@Param('sessionId') sessionId: string) {
    return this.ragContext
      .indexSession(sessionId)
      .then((count) => ({ indexed: count }));
  }
}
