import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePlayerDto, UpdatePlayerDto } from './dto/player.dto';

@Injectable()
export class PlayersService {
  constructor(private prisma: PrismaService) {}

  create(dto: CreatePlayerDto) {
    return this.prisma.player.create({ data: dto });
  }

  findAll(search?: string) {
    return this.prisma.player.findMany({
      where: search
        ? {
            OR: [
              { name: { contains: search } },
              { affiliation: { contains: search } },
            ],
          }
        : undefined,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const player = await this.prisma.player.findUnique({ where: { id } });
    if (!player) throw new NotFoundException(`选手 ${id} 不存在`);
    return player;
  }

  async update(id: string, dto: UpdatePlayerDto) {
    await this.findOne(id);
    return this.prisma.player.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.player.delete({ where: { id } });
  }
}
