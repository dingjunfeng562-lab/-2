import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MatchStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AutoScheduleDto, CreateVenueDto, UpdateMatchScheduleDto, UpdateVenueDto } from './dto/scheduling.dto';

const EVENT_TYPE_LABELS: Record<string, string> = {
  MENS_SINGLES: '男子单打',
  WOMENS_SINGLES: '女子单打',
  MENS_DOUBLES: '男子双打',
  WOMENS_DOUBLES: '女子双打',
  MIXED_DOUBLES: '混合双打',
};

type RegistrationView = {
  id: string;
  name: string;
  affiliation: string;
  playerIds: string[];
};

type ScheduleMatch = {
  id: string;
  eventId: string | null;
  eventType: string;
  eventTypeLabel: string;
  round: string;
  roundNo: number;
  matchNo: number;
  side1: RegistrationView | null;
  side2: RegistrationView | null;
  status: MatchStatus;
  venueId: string | null;
  venueName: string | null;
  scheduledAt: Date | null;
  durationMinutes: number;
};

type ConflictItem = {
  type: 'VENUE' | 'PLAYER';
  matchIds: string[];
  message: string;
};

@Injectable()
export class SchedulingService {
  constructor(private prisma: PrismaService) {}

  listVenues(tournamentId: string) {
    return this.prisma.venue.findMany({
      where: { tournamentId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async createVenue(tournamentId: string, dto: CreateVenueDto) {
    await this.ensureTournament(tournamentId);
    return this.prisma.venue.create({
      data: {
        tournamentId,
        name: dto.name,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async updateVenue(id: string, dto: UpdateVenueDto) {
    await this.ensureVenue(id);
    return this.prisma.venue.update({
      where: { id },
      data: dto,
    });
  }

  async removeVenue(id: string) {
    const venue = await this.ensureVenue(id);
    const linkedMatches = await this.prisma.match.count({ where: { venueId: id } });
    if (linkedMatches > 0) {
      return this.prisma.venue.update({
        where: { id },
        data: { isActive: false },
      });
    }
    return this.prisma.venue.delete({ where: { id: venue.id } });
  }

  async getSchedule(tournamentId: string, eventId?: string) {
    await this.ensureTournament(tournamentId);
    const [venues, matches] = await Promise.all([
      this.listVenues(tournamentId),
      this.loadScheduleMatches(tournamentId, eventId),
    ]);
    const conflicts = this.detectConflicts(matches);
    const conflictMap = new Map<string, ConflictItem[]>();
    for (const conflict of conflicts) {
      for (const matchId of conflict.matchIds) {
        const list = conflictMap.get(matchId) ?? [];
        list.push(conflict);
        conflictMap.set(matchId, list);
      }
    }

    return {
      venues,
      matches: matches.map((match) => ({
        ...match,
        scheduledAt: match.scheduledAt?.toISOString() ?? null,
        conflicts: conflictMap.get(match.id) ?? [],
      })),
      conflicts,
    };
  }

  async autoSchedule(dto: AutoScheduleDto) {
    const startAt = new Date(dto.startAt);
    if (Number.isNaN(startAt.getTime())) throw new BadRequestException('开始时间无效');
    const matchMinutes = dto.matchMinutes ?? 45;
    const breakMinutes = dto.breakMinutes ?? 5;
    const slotMinutes = matchMinutes + breakMinutes;

    const venueWhere: Prisma.VenueWhereInput = {
      tournamentId: dto.tournamentId,
      isActive: true,
      ...(dto.venueIds?.length ? { id: { in: dto.venueIds } } : {}),
    };
    const venues = await this.prisma.venue.findMany({
      where: venueWhere,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    if (!venues.length) throw new BadRequestException('请先维护至少一个可用场地');

    const matches = await this.prisma.match.findMany({
      where: {
        event: {
          tournamentId: dto.tournamentId,
          ...(dto.eventId ? { id: dto.eventId } : {}),
        },
        side1Id: { not: null },
        side2Id: { not: null },
        status: { not: MatchStatus.COMPLETED },
      },
      include: { event: true },
      orderBy: [{ roundNo: 'asc' }, { matchNo: 'asc' }],
    });
    if (!matches.length) throw new BadRequestException('暂无可排程场次，请先完成抽签编排');

    const allScheduled = await this.loadScheduleMatches(dto.tournamentId);
    const selectedIds = new Set(matches.map((match) => match.id));
    const anchors = allScheduled.filter(
      (match) => !selectedIds.has(match.id) && Boolean(match.scheduledAt),
    );

    const venueAvailableAt = new Map(venues.map((venue) => [venue.id, startAt.getTime()]));
    const playerAvailableAt = new Map<string, number>();
    for (const anchor of anchors) {
      const endAt = this.endTime(anchor).getTime();
      if (anchor.venueId && venueAvailableAt.has(anchor.venueId)) {
        venueAvailableAt.set(anchor.venueId, Math.max(venueAvailableAt.get(anchor.venueId)!, endAt));
      }
      for (const playerId of this.matchPlayerIds(anchor)) {
        playerAvailableAt.set(playerId, Math.max(playerAvailableAt.get(playerId) ?? startAt.getTime(), endAt));
      }
    }

    const registrationMap = await this.registrationMap(
      matches.flatMap((match) => [match.side1Id, match.side2Id]),
    );

    const updates: Array<{ matchId: string; venueId: string; scheduledAt: Date }> = [];
    for (const match of matches) {
      const playerIds = [
        ...this.playerIds(registrationMap.get(match.side1Id!)),
        ...this.playerIds(registrationMap.get(match.side2Id!)),
      ];
      const playerReadyAt = Math.max(
        startAt.getTime(),
        ...playerIds.map((playerId) => playerAvailableAt.get(playerId) ?? startAt.getTime()),
      );
      const candidates = venues.map((venue) => ({
        venue,
        startTime: Math.max(venueAvailableAt.get(venue.id) ?? startAt.getTime(), playerReadyAt),
      }));
      candidates.sort((a, b) => a.startTime - b.startTime || a.venue.sortOrder - b.venue.sortOrder);
      const winner = candidates[0];
      const scheduledAt = new Date(winner.startTime);
      const endAt = this.addMinutes(scheduledAt, slotMinutes).getTime();

      updates.push({ matchId: match.id, venueId: winner.venue.id, scheduledAt });
      venueAvailableAt.set(winner.venue.id, endAt);
      for (const playerId of playerIds) playerAvailableAt.set(playerId, endAt);
    }

    await this.prisma.$transaction(
      updates.map((update) =>
        this.prisma.match.update({
          where: { id: update.matchId },
          data: {
            venueId: update.venueId,
            scheduledAt: update.scheduledAt,
            durationMinutes: matchMinutes,
          },
        }),
      ),
    );

    return this.getSchedule(dto.tournamentId, dto.eventId);
  }

  async updateMatchSchedule(matchId: string, dto: UpdateMatchScheduleDto) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: { event: true },
    });
    if (!match) throw new NotFoundException('场次不存在');

    if (dto.venueId) {
      const venue = await this.prisma.venue.findUnique({ where: { id: dto.venueId } });
      if (!venue || (match.eventId && match.event && venue.tournamentId !== match.event.tournamentId)) {
        throw new BadRequestException('请选择当前赛事下的场地');
      }
    }

    await this.prisma.match.update({
      where: { id: matchId },
      data: {
        ...(dto.venueId !== undefined ? { venueId: dto.venueId } : {}),
        ...(dto.scheduledAt !== undefined
          ? { scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null }
          : {}),
        ...(dto.durationMinutes !== undefined ? { durationMinutes: dto.durationMinutes } : {}),
      },
    });

    const fallbackTournamentId = match.event?.tournamentId ?? (await this.resolveTeamMatchTournamentId(match.teamMatchId));
    return this.getSchedule(fallbackTournamentId, match.eventId ?? undefined);
  }

  private async loadScheduleMatches(tournamentId: string, eventId?: string) {
    const matches = await this.prisma.match.findMany({
      where: {
        event: {
          tournamentId,
          ...(eventId ? { id: eventId } : {}),
        },
      },
      include: {
        event: true,
        venue: true,
      },
      orderBy: [
        { scheduledAt: 'asc' },
        { roundNo: 'asc' },
        { matchNo: 'asc' },
      ],
    });
    const registrationMap = await this.registrationMap(
      matches.flatMap((match) => [match.side1Id, match.side2Id]),
    );

    return matches.map<ScheduleMatch>((match) => ({
      id: match.id,
      eventId: match.eventId,
      eventType: match.event?.type ?? 'TEAM_COMPETITION',
      eventTypeLabel: match.event ? (EVENT_TYPE_LABELS[match.event.type] ?? match.event.type) : '团体赛',
      round: match.round,
      roundNo: match.roundNo,
      matchNo: match.matchNo,
      side1: match.side1Id ? this.registrationView(registrationMap.get(match.side1Id) ?? null) : null,
      side2: match.side2Id ? this.registrationView(registrationMap.get(match.side2Id) ?? null) : null,
      status: match.status,
      venueId: match.venueId,
      venueName: match.venue?.name ?? null,
      scheduledAt: match.scheduledAt,
      durationMinutes: match.durationMinutes,
    }));
  }

  private detectConflicts(matches: ScheduleMatch[]) {
    const conflicts: ConflictItem[] = [];
    const scheduled = matches.filter((match) => match.scheduledAt);

    for (let i = 0; i < scheduled.length; i += 1) {
      for (let j = i + 1; j < scheduled.length; j += 1) {
        const a = scheduled[i];
        const b = scheduled[j];
        if (!this.overlaps(a, b)) continue;

        if (a.venueId && a.venueId === b.venueId) {
          conflicts.push({
            type: 'VENUE',
            matchIds: [a.id, b.id],
            message: `${a.venueName ?? '同一场地'} 同一时间段存在多场比赛`,
          });
        }

        const sharedPlayers = this.matchPlayerIds(a).filter((playerId) =>
          this.matchPlayerIds(b).includes(playerId),
        );
        if (sharedPlayers.length) {
          conflicts.push({
            type: 'PLAYER',
            matchIds: [a.id, b.id],
            message: '同一选手被安排在重叠时间段的多场比赛中',
          });
        }
      }
    }

    return conflicts;
  }

  private overlaps(a: ScheduleMatch, b: ScheduleMatch) {
    if (!a.scheduledAt || !b.scheduledAt) return false;
    return a.scheduledAt < this.endTime(b) && b.scheduledAt < this.endTime(a);
  }

  private endTime(match: ScheduleMatch) {
    return this.addMinutes(match.scheduledAt!, match.durationMinutes);
  }

  private addMinutes(date: Date, minutes: number) {
    return new Date(date.getTime() + minutes * 60 * 1000);
  }

  private matchPlayerIds(match: ScheduleMatch) {
    return [...(match.side1?.playerIds ?? []), ...(match.side2?.playerIds ?? [])];
  }

  private playerIds(registration: any) {
    if (!registration) return [];
    return [registration.player1Id, registration.player2Id].filter(Boolean) as string[];
  }

  private async registrationMap(ids: Array<string | null>) {
    const compactIds = ids.filter(Boolean) as string[];
    if (!compactIds.length) return new Map<string, any>();
    const registrations = await this.prisma.registration.findMany({
      where: { id: { in: compactIds } },
      include: { player1: true, player2: true },
    });
    return new Map(registrations.map((registration) => [registration.id, registration]));
  }

  private registrationView(registration: any): RegistrationView | null {
    if (!registration) return null;
    return {
      id: registration.id,
      name: registration.player2
        ? `${registration.player1.name} / ${registration.player2.name}`
        : registration.player1.name,
      affiliation: registration.player2
        ? `${registration.player1.affiliation} / ${registration.player2.affiliation}`
        : registration.player1.affiliation,
      playerIds: this.playerIds(registration),
    };
  }

  private async resolveTeamMatchTournamentId(teamMatchId?: string | null) {
    if (!teamMatchId) throw new BadRequestException('无法确定该场次所属赛事');
    const teamMatch = await this.prisma.teamMatch.findUnique({
      where: { id: teamMatchId },
      include: { teamCompetition: true },
    });
    if (!teamMatch) throw new NotFoundException('团体赛对阵不存在');
    return teamMatch.teamCompetition.tournamentId;
  }

  private async ensureTournament(id: string) {
    const tournament = await this.prisma.tournament.findUnique({ where: { id } });
    if (!tournament) throw new NotFoundException('赛事不存在');
    return tournament;
  }

  private async ensureVenue(id: string) {
    const venue = await this.prisma.venue.findUnique({ where: { id } });
    if (!venue) throw new NotFoundException('场地不存在');
    return venue;
  }
}
