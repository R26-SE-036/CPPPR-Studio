import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { JoinSessionDto } from './dto/join-session.dto';
import { SessionStatus, EventType } from '@prisma/client';
import { nanoid } from 'nanoid';

@Injectable()
export class SessionsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateSessionDto) {
    const roomCode = nanoid(6).toUpperCase();

    const session = await this.prisma.session.create({
      data: {
        title: dto.title,
        description: dto.description,
        language: dto.language || 'javascript',
        roomCode,
        creatorId: userId,
        participants: {
          create: {
            userId,
            pairRole: 'DRIVER', // creator starts as Driver
          },
        },
      },
      include: {
        creator: { select: { id: true, username: true } },
        participants: {
          include: { user: { select: { id: true, username: true } } },
        },
      },
    });

    // Log event
    await this.logEvent(session.id, userId, EventType.SESSION_CREATED, {
      roomCode,
    });

    return session;
  }

  async join(userId: string, dto: JoinSessionDto) {
    const session = await this.prisma.session.findUnique({
      where: { roomCode: dto.roomCode },
      include: { participants: true },
    });

    if (!session) throw new NotFoundException('Session not found');
    if (session.status === SessionStatus.COMPLETED) {
      throw new ConflictException('Session is already completed');
    }

    const alreadyJoined = session.participants.some((p) => p.userId === userId);
    if (alreadyJoined) {
      // Re-mark as online if they rejoined
      await this.prisma.sessionParticipant.update({
        where: { userId_sessionId: { userId, sessionId: session.id } },
        data: { isOnline: true, leftAt: null },
      });
    } else {
      await this.prisma.sessionParticipant.create({
        data: {
          userId,
          sessionId: session.id,
          pairRole: 'NAVIGATOR', // Second person is Navigator by default
        },
      });
    }

    await this.logEvent(session.id, userId, EventType.SESSION_JOINED, {});

    return this.findById(session.id);
  }

  async findById(sessionId: string) {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        creator: { select: { id: true, username: true } },
        participants: {
          include: { user: { select: { id: true, username: true } } },
          where: { leftAt: null },
        },
      },
    });

    if (!session) throw new NotFoundException('Session not found');
    return session;
  }

  async findMySession(userId: string) {
    return this.prisma.session.findMany({
      where: {
        participants: { some: { userId } },
      },
      include: {
        creator: { select: { id: true, username: true } },
        _count: { select: { participants: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateStatus(sessionId: string, userId: string, status: SessionStatus) {
    const session = await this.findById(sessionId);
    if (session.creatorId !== userId) {
      throw new ForbiddenException(
        'Only the session creator can update status',
      );
    }

    const data: Record<string, unknown> = { status };
    if (status === SessionStatus.ACTIVE) data.startedAt = new Date();
    if (status === SessionStatus.COMPLETED) data.endedAt = new Date();

    return this.prisma.session.update({ where: { id: sessionId }, data });
  }

  async updateCode(sessionId: string, code: string) {
    return this.prisma.session.update({
      where: { id: sessionId },
      data: { currentCode: code },
    });
  }

  async logEvent(
    sessionId: string,
    userId: string | null,
    type: EventType,
    payload: object,
  ) {
    return this.prisma.sessionEvent.create({
      data: { sessionId, userId, type, payload },
    });
  }
}
