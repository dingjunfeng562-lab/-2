import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTournamentDto, UpdateTournamentDto } from './dto/tournament.dto';

@Injectable()
export class TournamentsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateTournamentDto) {
    return this.prisma.$transaction(async (tx) => {
      if (dto.showOnHome) {
        await tx.tournament.updateMany({ data: { showOnHome: false } });
      }
      return tx.tournament.create({
        data: this.toTournamentData(dto) as Prisma.TournamentUncheckedCreateInput,
        include: { events: true },
      });
    });
  }

  findAll() {
    return this.prisma.tournament.findMany({
      include: { _count: { select: { events: true } } },
      orderBy: [{ edition: 'desc' }],
    });
  }

  async findOne(id: string) {
    const t = await this.prisma.tournament.findUnique({
      where: { id },
      include: { events: true },
    });
    if (!t) throw new NotFoundException(`赛事 ${id} 不存在`);
    return t;
  }

  async update(id: string, dto: UpdateTournamentDto) {
    await this.findOne(id);
    return this.prisma.$transaction(async (tx) => {
      if (dto.showOnHome) {
        await tx.tournament.updateMany({
          where: { id: { not: id } },
          data: { showOnHome: false },
        });
      }
      return tx.tournament.update({
        where: { id },
        data: this.toTournamentData(dto) as Prisma.TournamentUncheckedUpdateInput,
        include: { events: true },
      });
    });
  }

  async archive(id: string) {
    await this.findOne(id);
    return this.prisma.tournament.update({
      where: { id },
      data: { isArchived: true },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.tournament.delete({ where: { id } });
  }

  private toTournamentData(dto: CreateTournamentDto | UpdateTournamentDto) {
    const data: Record<string, unknown> = { ...dto };
    if (dto.startDate) data.startDate = new Date(dto.startDate);
    if (dto.endDate) data.endDate = new Date(dto.endDate);
    if (dto.registrationStartDate) {
      data.registrationStartDate = new Date(dto.registrationStartDate);
    }
    if (dto.registrationEndDate) {
      data.registrationEndDate = new Date(dto.registrationEndDate);
    }
    return data;
  }
}
