import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { CreateInterventionDto } from './dto/create-intervention.dto';

@Injectable()
export class InterventionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createInterventionDto: CreateInterventionDto) {
    return this.prisma.intervention.create({
      data: createInterventionDto,
    });
  }

  async findBySession(sessionId: string) {
    return this.prisma.intervention.findMany({
      where: { sessionId },
      orderBy: { shownAt: 'desc' },
    });
  }

  async respond(id: string, accepted: boolean) {
    return this.prisma.intervention.update({
      where: { id },
      data: { accepted },
    });
  }
}
