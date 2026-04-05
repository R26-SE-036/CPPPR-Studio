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
import { SessionsService } from './sessions.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { JoinSessionDto } from './dto/join-session.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SessionStatus } from '@prisma/client';

@ApiTags('sessions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('sessions')
export class SessionsController {
  constructor(private sessionsService: SessionsService) {}

  @Post()
  create(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateSessionDto,
  ) {
    return this.sessionsService.create(user.id, dto);
  }

  @Post('join')
  join(@CurrentUser() user: { id: string }, @Body() dto: JoinSessionDto) {
    return this.sessionsService.join(user.id, dto);
  }

  @Get('mine')
  getMine(@CurrentUser() user: { id: string }) {
    return this.sessionsService.findMySession(user.id);
  }

  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.sessionsService.findById(id);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body('status') status: SessionStatus,
  ) {
    return this.sessionsService.updateStatus(id, user.id, status);
  }
}