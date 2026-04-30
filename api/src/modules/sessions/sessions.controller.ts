import { Controller, Post, Get, Param, Body, UseGuards, Req } from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { JoinSessionDto } from './dto/join-session.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Request } from 'express';

@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() createSessionDto: CreateSessionDto, @Req() req: any) {
    return this.sessionsService.create(createSessionDto, req.user.userId);
  }

  @Post('join')
  @UseGuards(JwtAuthGuard)
  join(@Body() joinSessionDto: JoinSessionDto, @Req() req: any) {
    return this.sessionsService.join(joinSessionDto, req.user.userId);
  }

  @Get('analytics/all')
  getAllAnalytics() {
    return this.sessionsService.getAllAnalytics();
  }

  @Get('analytics/:id')
  getOneAnalytics(@Param('id') id: string) {
    return this.sessionsService.getOneAnalytics(id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string) {
    return this.sessionsService.findById(id);
  }

  @Post(':id/end')
  @UseGuards(JwtAuthGuard)
  end(@Param('id') id: string, @Body() body: { finalCode?: string }, @Req() req: any) {
    return this.sessionsService.end(id, req.user.userId, body.finalCode);
  }
}
