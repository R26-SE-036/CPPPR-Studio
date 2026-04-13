import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { PromptsService } from './prompts.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('prompts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('prompts')
export class PromptsController {
  constructor(private promptsService: PromptsService) {}

  @Get('session/:sessionId')
  getSessionPrompts(@Param('sessionId') sessionId: string) {
    return this.promptsService.getSessionPrompts(sessionId);
  }
}
