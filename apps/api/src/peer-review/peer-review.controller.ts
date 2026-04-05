import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  Patch,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { PeerReviewService } from './peer-review.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('peer-review')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('peer-review')
export class PeerReviewController {
  constructor(private peerReviewService: PeerReviewService) {}

  @Post()
  createOrUpdate(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateReviewDto,
  ) {
    return this.peerReviewService.createOrUpdate(user.id, dto);
  }

  @Patch(':id/submit')
  submit(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.peerReviewService.submit(id, user.id);
  }

  @Get('session/:sessionId')
  getSessionReviews(@Param('sessionId') sessionId: string) {
    return this.peerReviewService.findSessionReviews(sessionId);
  }

  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.peerReviewService.findById(id);
  }
}