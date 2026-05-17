import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventType, Format, MatchStatus, Prisma, Registration } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateRegistrationDto,
  GenerateDrawDto,
  UpdateRegistrationDto,
} from './dto/draw.dto';

type RegistrationWithPlayers = Registration & {
  player1: { id: string; name: string; gender: string; affiliation: string };
  player2: { id: string; name: string; gender: string; affiliation: string } | null;
};

type MatchDraft = {
  round: string;
  roundNo: number;
  matchNo: number;
  side1Id: string | null;
  side2Id: string | null;
  status: MatchStatus;
  winnerSide: number | null;
};

@Injectable()
export class DrawsService {
  constructor(private prisma: PrismaService) {}

  async listRegistrations(eventId: string) {
    await this.ensureEvent(eventId);
    return this.prisma.registration.findMany({
      where: { eventId },
      include: { player1: true, player2: true },
      orderBy: [{ isSeed: 'desc' }, { seedRank: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async createRegistration(eventId: string, dto: CreateRegistrationDto) {
    const event = await this.ensureEvent(eventId);
    if (event.drawLocked) {
      throw new ConflictException('抽签结果已冻结，请先重新抽签后再调整报名');
    }
    await this.validateRegistrationPlayers(event.type, dto.player1Id, dto.player2Id);
    await this.ensureRegistrationLimit(dto.player1Id, eventId);
    if (dto.player2Id) await this.ensureRegistrationLimit(dto.player2Id, eventId);

    const existing = await this.prisma.registration.findFirst({
      where: {
        eventId,
        player1Id: dto.player1Id,
        player2Id: dto.player2Id ?? null,
      },
    });
    if (existing) throw new ConflictException('该报名已存在');

    return this.prisma.registration.create({
      data: {
        eventId,
        player1Id: dto.player1Id,
        player2Id: dto.player2Id,
        isSeed: dto.isSeed ?? false,
        seedRank: dto.isSeed ? dto.seedRank : null,
      },
      include: { player1: true, player2: true },
    });
  }

  async updateRegistration(id: string, dto: UpdateRegistrationDto) {
    const registration = await this.prisma.registration.findUnique({
      where: { id },
      include: { event: true },
    });
    if (!registration) throw new NotFoundException('报名不存在');
    if (registration.event.drawLocked) {
      throw new ConflictException('抽签结果已冻结，请先重新抽签后再调整报名');
    }

    const player1Id = dto.player1Id ?? registration.player1Id;
    const player2Id = dto.player2Id === undefined ? registration.player2Id : dto.player2Id;
    await this.validateRegistrationPlayers(registration.event.type, player1Id, player2Id ?? undefined);

    return this.prisma.registration.update({
      where: { id },
      data: {
        player1Id,
        player2Id,
        isSeed: dto.isSeed ?? registration.isSeed,
        seedRank: dto.isSeed === false ? null : dto.seedRank,
      },
      include: { player1: true, player2: true },
    });
  }

  async removeRegistration(id: string) {
    const registration = await this.prisma.registration.findUnique({
      where: { id },
      include: { event: true },
    });
    if (!registration) throw new NotFoundException('报名不存在');
    if (registration.event.drawLocked) {
      throw new ConflictException('抽签结果已冻结，请先重新抽签后再调整报名');
    }
    return this.prisma.registration.delete({ where: { id } });
  }

  async generateDraw(eventId: string, dto: GenerateDrawDto) {
    const event = await this.ensureEvent(eventId);
    if (event.drawLocked && !dto.force) {
      throw new ConflictException('抽签结果已冻结，如需覆盖请使用重新抽签');
    }

    const registrations = await this.prisma.registration.findMany({
      where: { eventId },
      include: { player1: true, player2: true },
      orderBy: [{ isSeed: 'desc' }, { seedRank: 'asc' }, { createdAt: 'asc' }],
    });
    if (registrations.length < 2) throw new BadRequestException('至少需要 2 个报名才能抽签');

    if (event.format === Format.GROUP_PLUS_KNOCKOUT) {
      await this.generateGroupDraw(eventId, registrations, event.groupSize ?? 4);
    } else {
      await this.generateSingleEliminationDraw(eventId, registrations);
    }

    return this.getBracket(eventId);
  }

  async getBracket(eventId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: { tournament: true },
    });
    if (!event) throw new NotFoundException('单项不存在');

    const registrations = await this.prisma.registration.findMany({
      where: { eventId },
      include: { player1: true, player2: true },
      orderBy: [{ isSeed: 'desc' }, { seedRank: 'asc' }, { createdAt: 'asc' }],
    });
    const registrationMap = new Map(registrations.map((item) => [item.id, item]));
    const matches = await this.prisma.match.findMany({
      where: { eventId },
      orderBy: [{ roundNo: 'asc' }, { matchNo: 'asc' }],
    });

    const hydrateMatch = (match: (typeof matches)[number]) => ({
      ...match,
      side1: match.side1Id ? registrationMap.get(match.side1Id) ?? null : null,
      side2: match.side2Id ? registrationMap.get(match.side2Id) ?? null : null,
    });

    const rounds = matches
      .filter((match) => match.roundNo > 0)
      .reduce<Array<{ roundNo: number; round: string; matches: ReturnType<typeof hydrateMatch>[] }>>(
        (acc, match) => {
          let round = acc.find((item) => item.roundNo === match.roundNo);
          if (!round) {
            round = { roundNo: match.roundNo, round: match.round, matches: [] };
            acc.push(round);
          }
          round.matches.push(hydrateMatch(match));
          return acc;
        },
        [],
      );

    const groups = registrations
      .filter((registration) => registration.groupName)
      .reduce<
        Array<{
          name: string;
          registrations: RegistrationWithPlayers[];
          matches: ReturnType<typeof hydrateMatch>[];
        }>
      >((acc, registration) => {
        const name = registration.groupName!;
        let group = acc.find((item) => item.name === name);
        if (!group) {
          group = { name, registrations: [], matches: [] };
          acc.push(group);
        }
        group.registrations.push(registration);
        return acc;
      }, []);

    for (const group of groups) {
      group.matches = matches
        .filter((match) => match.round === group.name)
        .map((match) => hydrateMatch(match));
    }

    return { event, registrations, rounds, groups };
  }

  private async ensureEvent(eventId: string) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundException('单项不存在');
    return event;
  }

  private isDoubles(type: EventType) {
    const doublesTypes: EventType[] = [
      EventType.MENS_DOUBLES,
      EventType.WOMENS_DOUBLES,
      EventType.MIXED_DOUBLES,
    ];
    return doublesTypes.includes(type);
  }

  private async validateRegistrationPlayers(
    eventType: EventType,
    player1Id: string,
    player2Id?: string | null,
  ) {
    if (player1Id === player2Id) throw new BadRequestException('同一报名中不能选择同一位选手');
    const players = await this.prisma.player.findMany({
      where: { id: { in: [player1Id, player2Id].filter(Boolean) as string[] } },
    });
    if (players.length !== (player2Id ? 2 : 1)) throw new NotFoundException('选手不存在');
    if (this.isDoubles(eventType) && !player2Id) {
      throw new BadRequestException('双打项目需要选择两位选手');
    }
    if (!this.isDoubles(eventType) && player2Id) {
      throw new BadRequestException('单打项目只能选择一位选手');
    }
  }

  private async ensureRegistrationLimit(playerId: string, currentEventId: string) {
    const count = await this.prisma.registration.count({
      where: {
        OR: [{ player1Id: playerId }, { player2Id: playerId }],
        eventId: { not: currentEventId },
      },
    });
    if (count >= 2) throw new ConflictException('同一选手最多报名 2 个单项');
  }

  private async generateSingleEliminationDraw(
    eventId: string,
    registrations: RegistrationWithPlayers[],
  ) {
    const bracketSize = this.nextPowerOfTwo(registrations.length);
    const slots = this.seedSingleEliminationSlots(registrations, bracketSize);
    const drafts: MatchDraft[] = [];
    let roundNo = 1;
    let currentSlots = slots;

    while (currentSlots.length >= 2) {
      const roundLabel = this.roundLabel(currentSlots.length);
      const nextSlots: Array<RegistrationWithPlayers | null> = [];
      for (let i = 0; i < currentSlots.length; i += 2) {
        const side1 = currentSlots[i];
        const side2 = currentSlots[i + 1];
        const hasBye = Boolean(side1) !== Boolean(side2);
        drafts.push({
          round: roundLabel,
          roundNo,
          matchNo: i / 2 + 1,
          side1Id: side1?.id ?? null,
          side2Id: side2?.id ?? null,
          status: hasBye ? MatchStatus.COMPLETED : MatchStatus.PENDING,
          winnerSide: hasBye ? (side1 ? 1 : 2) : null,
        });
        nextSlots.push(hasBye ? (side1 ?? side2) : null);
      }
      currentSlots = nextSlots;
      roundNo += 1;
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.match.deleteMany({ where: { eventId } });
      await tx.registration.updateMany({ where: { eventId }, data: { groupName: null } });
      await this.createMatchDrafts(tx, eventId, drafts);
      await tx.event.update({
        where: { id: eventId },
        data: { drawLocked: true, drawGeneratedAt: new Date() },
      });
    });
  }

  private async generateGroupDraw(
    eventId: string,
    registrations: RegistrationWithPlayers[],
    groupSize: number,
  ) {
    const groupCount = Math.max(2, Math.ceil(registrations.length / groupSize));
    const groupNames = Array.from({ length: groupCount }, (_, index) =>
      String.fromCharCode(65 + index),
    );
    const groups = groupNames.map((name) => ({ name, registrations: [] as RegistrationWithPlayers[] }));
    const seeds = registrations
      .filter((registration) => registration.isSeed)
      .sort((a, b) => (a.seedRank ?? 999) - (b.seedRank ?? 999));
    const nonSeeds = this.shuffle(registrations.filter((registration) => !registration.isSeed));
    const ordered = [...seeds, ...nonSeeds];

    for (const registration of ordered) {
      const target = [...groups].sort(
        (a, b) => a.registrations.length - b.registrations.length,
      )[0];
      target.registrations.push(registration);
    }

    const drafts: MatchDraft[] = [];
    for (const group of groups) {
      for (let i = 0; i < group.registrations.length; i += 1) {
        for (let j = i + 1; j < group.registrations.length; j += 1) {
          drafts.push({
            round: group.name,
            roundNo: 0,
            matchNo: drafts.filter((draft) => draft.round === group.name).length + 1,
            side1Id: group.registrations[i].id,
            side2Id: group.registrations[j].id,
            status: MatchStatus.PENDING,
            winnerSide: null,
          });
        }
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.match.deleteMany({ where: { eventId } });
      for (const group of groups) {
        await tx.registration.updateMany({
          where: { id: { in: group.registrations.map((registration) => registration.id) } },
          data: { groupName: group.name },
        });
      }
      await this.createMatchDrafts(tx, eventId, drafts);
      await tx.event.update({
        where: { id: eventId },
        data: { drawLocked: true, drawGeneratedAt: new Date() },
      });
    });
  }

  private async createMatchDrafts(
    tx: Prisma.TransactionClient,
    eventId: string,
    drafts: MatchDraft[],
  ) {
    for (const draft of drafts) {
      await tx.match.create({
        data: {
          eventId,
          round: draft.round,
          roundNo: draft.roundNo,
          matchNo: draft.matchNo,
          side1Id: draft.side1Id,
          side2Id: draft.side2Id,
          status: draft.status,
          winnerSide: draft.winnerSide,
        },
      });
    }
  }

  private seedSingleEliminationSlots(
    registrations: RegistrationWithPlayers[],
    bracketSize: number,
  ) {
    const slots: Array<RegistrationWithPlayers | null> = Array.from({ length: bracketSize }, () => null);
    const seedPositions = this.seedPositions(bracketSize);
    const seeds = registrations
      .filter((registration) => registration.isSeed)
      .sort((a, b) => (a.seedRank ?? 999) - (b.seedRank ?? 999));
    const placedSeedIds = new Set<string>();

    seeds.forEach((registration, index) => {
      const position = seedPositions[index];
      if (position !== undefined) {
        slots[position] = registration;
        placedSeedIds.add(registration.id);
      }
    });

    const remaining = this.shuffle(
      registrations.filter((registration) => !placedSeedIds.has(registration.id)),
    );
    for (const registration of remaining) {
      const emptyIndex = slots.findIndex((slot) => slot === null);
      if (emptyIndex >= 0) slots[emptyIndex] = registration;
    }
    return slots;
  }

  private seedPositions(size: number) {
    const positions = [0, size - 1, Math.floor(size / 2), Math.floor(size / 2) - 1];
    for (let i = 0; i < size; i += 1) {
      if (!positions.includes(i)) positions.push(i);
    }
    return positions;
  }

  private roundLabel(slotCount: number) {
    if (slotCount === 2) return 'F';
    if (slotCount === 4) return 'SF';
    if (slotCount === 8) return 'QF';
    return `R${slotCount}`;
  }

  private nextPowerOfTwo(value: number) {
    return 2 ** Math.ceil(Math.log2(value));
  }

  private shuffle<T>(items: T[]) {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
}
