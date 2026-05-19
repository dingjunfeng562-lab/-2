import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  EventType,
  Format,
  Gender,
  Prisma,
  RegistrationStatus,
  ScoringMode,
  ScoringRule,
  TournamentStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SubmitCompetitionRegistrationDto } from './dto/competition-registration.dto';

const EVENT_TYPE_LABELS: Record<EventType, string> = {
  MENS_SINGLES: '男子单打',
  WOMENS_SINGLES: '女子单打',
  MENS_DOUBLES: '男子双打',
  WOMENS_DOUBLES: '女子双打',
  MIXED_DOUBLES: '混合双打',
};

const TOURNAMENT_STATUS_LABELS: Record<TournamentStatus, string> = {
  REGISTRATION_NOT_STARTED: '报名未开始',
  REGISTRATION_OPEN: '报名中',
  REGISTRATION_CLOSED: '报名已截止',
  ONGOING: '比赛进行中',
  FINISHED: '已结束',
};

const REGISTRATION_STATUS_LABELS: Record<RegistrationStatus, string> = {
  PENDING: '待审核',
  APPROVED: '已通过',
  REJECTED: '已拒绝',
  REMOVED: '已移除',
};

type CompetitionWithEvents = Prisma.TournamentGetPayload<{
  include: {
    events: {
      include: {
        registrations: true;
      };
    };
  };
}>;

type RegistrationWithRelations = Prisma.RegistrationGetPayload<{
  include: {
    event: true;
    player1: true;
    player2: true;
  };
}>;

@Injectable()
export class CompetitionsService {
  constructor(private prisma: PrismaService) {}

  async listPublicCompetitions() {
    const competitions = await this.prisma.tournament.findMany({
      where: { isArchived: false, isPublished: true },
      include: {
        events: {
          include: {
            registrations: true,
          },
          orderBy: { type: 'asc' },
        },
      },
      orderBy: [{ startDate: 'desc' }, { edition: 'desc' }],
    });

    return competitions.map((competition) => this.toCompetitionView(competition));
  }

  async getPublicCompetition(id: string) {
    const competition = await this.findCompetition(id, false);
    return this.toCompetitionView(competition, true);
  }

  async submitRegistration(competitionId: string, dto: SubmitCompetitionRegistrationDto) {
    const competition = await this.findCompetition(competitionId, false);
    this.ensureRegistrationWindow(competition);

    const eventType = this.normalizeEventType(dto.eventName);
    const eventName = EVENT_TYPE_LABELS[eventType];
    const gender = this.normalizeGender(dto.gender);
    const event = await this.ensureEvent(competition.id, competition.events, eventType);

    const existing = await this.prisma.registration.findFirst({
      where: {
        eventId: event.id,
        studentId: dto.studentId.trim(),
      },
    });
    if (existing) {
      throw new ConflictException('你已报名该赛事，请勿重复提交。');
    }

    const registration = await this.prisma.$transaction(async (tx) => {
      const player = await tx.player.create({
        data: {
          name: dto.name.trim(),
          gender,
          affiliation: dto.className.trim(),
          contact: dto.phone.trim(),
          notes: dto.remark?.trim() || null,
        },
      });

      return tx.registration.create({
        data: {
          eventId: event.id,
          player1Id: player.id,
          name: dto.name.trim(),
          studentId: dto.studentId.trim(),
          className: dto.className.trim(),
          phone: dto.phone.trim(),
          gender,
          eventName,
          remark: dto.remark?.trim() || null,
          status: RegistrationStatus.PENDING,
        },
        include: { event: true, player1: true, player2: true },
      });
    });

    return {
      message: '报名已提交，请等待管理员审核。审核通过后，你的信息将显示在参赛选手列表中。',
      registration: this.toRegistrationView(registration),
    };
  }

  async listPublicPlayers(competitionId: string) {
    await this.findCompetition(competitionId, false);
    const registrations = await this.findRegistrationsByCompetition(competitionId, {
      status: RegistrationStatus.APPROVED,
    });
    return this.groupPlayers(registrations);
  }

  async listAdminCompetitions() {
    const competitions = await this.prisma.tournament.findMany({
      include: {
        events: {
          include: {
            registrations: true,
          },
          orderBy: { type: 'asc' },
        },
      },
      orderBy: [{ createdAt: 'desc' }],
    });

    return competitions.map((competition) => {
      const registrations = competition.events.flatMap((event) => event.registrations);
      return {
        ...this.toCompetitionView(competition, true),
        isArchived: competition.isArchived,
        isPublished: competition.isPublished,
        counts: {
          all: registrations.length,
          pending: registrations.filter((item) => item.status === RegistrationStatus.PENDING).length,
          approved: registrations.filter((item) => item.status === RegistrationStatus.APPROVED).length,
          rejected: registrations.filter((item) => item.status === RegistrationStatus.REJECTED).length,
          removed: registrations.filter((item) => item.status === RegistrationStatus.REMOVED).length,
        },
      };
    });
  }

  async publishCompetition(id: string) {
    await this.findCompetition(id, true);
    const competition = await this.prisma.tournament.update({
      where: { id },
      data: {
        isArchived: false,
        isPublished: true,
        status: TournamentStatus.REGISTRATION_OPEN,
      },
      include: {
        events: {
          include: { registrations: true },
        },
      },
    });
    return this.toCompetitionView(competition, true);
  }

  async unpublishCompetition(id: string) {
    await this.findCompetition(id, true);
    const competition = await this.prisma.tournament.update({
      where: { id },
      data: { isPublished: false },
      include: {
        events: {
          include: { registrations: true },
        },
      },
    });
    return this.toCompetitionView(competition, true);
  }

  async listAdminRegistrations(competitionId: string, status?: string) {
    await this.findCompetition(competitionId, true);
    const normalizedStatus = this.normalizeStatusFilter(status);
    const registrations = await this.findRegistrationsByCompetition(competitionId, {
      status: normalizedStatus,
    });

    return registrations
      .sort((a, b) => this.statusPriority(a.status) - this.statusPriority(b.status))
      .map((registration) => this.toRegistrationView(registration));
  }

  async listAdminPlayers(competitionId: string, eventName?: string, search?: string) {
    await this.findCompetition(competitionId, true);
    const eventType = eventName ? this.normalizeEventType(eventName) : undefined;
    const registrations = await this.findRegistrationsByCompetition(competitionId, {
      status: RegistrationStatus.APPROVED,
      eventType,
      search,
    });

    return registrations.map((registration) => this.toRegistrationView(registration));
  }

  async approveRegistration(registrationId: string, reviewedBy?: string) {
    const registration = await this.ensureRegistration(registrationId);
    return this.updateRegistrationStatus(
      registration.id,
      RegistrationStatus.APPROVED,
      reviewedBy,
    );
  }

  async rejectRegistration(registrationId: string, reviewedBy?: string, rejectReason?: string) {
    const registration = await this.ensureRegistration(registrationId);
    return this.updateRegistrationStatus(
      registration.id,
      RegistrationStatus.REJECTED,
      reviewedBy,
      rejectReason,
    );
  }

  async removeRegistration(registrationId: string, reviewedBy?: string) {
    const registration = await this.ensureRegistration(registrationId);
    return this.updateRegistrationStatus(
      registration.id,
      RegistrationStatus.REMOVED,
      reviewedBy,
    );
  }

  private async findCompetition(id: string, includeArchived: boolean) {
    const competition = await this.prisma.tournament.findFirst({
      where: {
        id,
        ...(includeArchived ? {} : { isArchived: false }),
        ...(includeArchived ? {} : { isPublished: true }),
      },
      include: {
        events: {
          include: {
            registrations: true,
          },
          orderBy: { type: 'asc' },
        },
      },
    });
    if (!competition) throw new NotFoundException('赛事不存在');
    return competition;
  }

  private async ensureRegistration(id: string) {
    const registration = await this.prisma.registration.findUnique({
      where: { id },
      include: { event: true, player1: true, player2: true },
    });
    if (!registration) throw new NotFoundException('报名记录不存在');
    return registration;
  }

  private async ensureEvent(
    tournamentId: string,
    events: CompetitionWithEvents['events'],
    type: EventType,
  ) {
    const existing = events.find((event) => event.type === type);
    if (existing) return existing;

    return this.prisma.event.create({
      data: {
        tournamentId,
        type,
        format: Format.SINGLE_ELIMINATION,
        scoringRule: ScoringRule.TWENTYONE_BO3,
        scoringMode: ScoringMode.STANDARD_GOLDEN,
      },
      include: { registrations: true },
    });
  }

  private ensureRegistrationWindow(competition: CompetitionWithEvents) {
    if (competition.status !== TournamentStatus.REGISTRATION_OPEN) {
      throw new BadRequestException('当前赛事暂未开放报名。');
    }
    const now = new Date();
    if (competition.registrationStartDate && competition.registrationStartDate > now) {
      throw new BadRequestException('报名尚未开始。');
    }
    if (competition.registrationEndDate && competition.registrationEndDate < now) {
      throw new BadRequestException('报名已截止。');
    }
  }

  private findRegistrationsByCompetition(
    competitionId: string,
    filters: {
      status?: RegistrationStatus;
      eventType?: EventType;
      search?: string;
    } = {},
  ) {
    const search = filters.search?.trim();
    return this.prisma.registration.findMany({
      where: {
        event: {
          tournamentId: competitionId,
          ...(filters.eventType ? { type: filters.eventType } : {}),
        },
        ...(filters.status ? { status: filters.status } : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: search } },
                { studentId: { contains: search } },
                { className: { contains: search } },
                { player1: { name: { contains: search } } },
                { player1: { affiliation: { contains: search } } },
              ],
            }
          : {}),
      },
      include: {
        event: true,
        player1: true,
        player2: true,
      },
      orderBy: [{ createdAt: 'desc' }],
    });
  }

  private async updateRegistrationStatus(
    id: string,
    status: RegistrationStatus,
    reviewedBy?: string,
    rejectReason?: string,
  ) {
    const registration = await this.prisma.registration.update({
      where: { id },
      data: {
        status,
        reviewedAt: new Date(),
        reviewedBy,
        rejectReason: status === RegistrationStatus.REJECTED ? rejectReason?.trim() || null : null,
        groupName: status === RegistrationStatus.APPROVED ? undefined : null,
        isSeed: status === RegistrationStatus.APPROVED ? undefined : false,
        seedRank: status === RegistrationStatus.APPROVED ? undefined : null,
      },
      include: { event: true, player1: true, player2: true },
    });

    return this.toRegistrationView(registration);
  }

  private toCompetitionView(competition: CompetitionWithEvents, detailed = false) {
    const approvedCount = competition.events.reduce(
      (sum, event) =>
        sum + event.registrations.filter((item) => item.status === RegistrationStatus.APPROVED).length,
      0,
    );
    const events = this.projectLabels(competition);

    return {
      id: competition.id,
      title: competition.name,
      name: competition.name,
      subtitle: competition.subtitle,
      coverImage: competition.coverImageUrl,
      cover: competition.coverImageUrl,
      startDate: competition.startDate.toISOString(),
      endDate: competition.endDate.toISOString(),
      location: competition.location,
      events,
      projects: events,
      description: competition.rules,
      status: competition.status,
      statusLabel: TOURNAMENT_STATUS_LABELS[competition.status],
      registrationStatus: this.registrationStatusText(competition),
      registrationStartTime: competition.registrationStartDate?.toISOString() ?? null,
      registrationEndTime: competition.registrationEndDate?.toISOString() ?? null,
      registeredCount: approvedCount,
      createdAt: detailed ? competition.createdAt.toISOString() : undefined,
      updatedAt: detailed ? competition.updatedAt.toISOString() : undefined,
      isPublished: detailed ? competition.isPublished : undefined,
    };
  }

  private toRegistrationView(registration: RegistrationWithRelations) {
    const gender = registration.gender ?? registration.player1.gender;
    return {
      id: registration.id,
      competitionId: registration.event.tournamentId,
      eventId: registration.eventId,
      name: registration.name ?? registration.player1.name,
      studentId: registration.studentId ?? '',
      className: registration.className ?? registration.player1.affiliation,
      phone: registration.phone ?? registration.player1.contact ?? '',
      gender,
      genderLabel: gender === Gender.MALE ? '男' : '女',
      eventName: registration.eventName ?? EVENT_TYPE_LABELS[registration.event.type],
      eventType: registration.event.type,
      remark: registration.remark ?? registration.player1.notes ?? '',
      status: registration.status.toLowerCase(),
      statusRaw: registration.status,
      statusLabel: REGISTRATION_STATUS_LABELS[registration.status],
      createdAt: registration.createdAt.toISOString(),
      reviewedAt: registration.reviewedAt?.toISOString() ?? null,
      reviewedBy: registration.reviewedBy,
      rejectReason: registration.rejectReason,
    };
  }

  private groupPlayers(registrations: RegistrationWithRelations[]) {
    const players = registrations.map((registration) => this.toRegistrationView(registration));
    return {
      players,
      groups: {
        mensSingles: players.filter((item) => item.eventType === EventType.MENS_SINGLES),
        womensSingles: players.filter((item) => item.eventType === EventType.WOMENS_SINGLES),
      },
    };
  }

  private projectLabels(competition: {
    projectText: string | null;
    events: Array<{ type: EventType }>;
  }) {
    const fromText = (competition.projectText ?? '')
      .split(/[\/、,，]/)
      .map((item) => item.trim())
      .filter(Boolean);
    if (fromText.length) return fromText;

    const labels = competition.events.map((event) => EVENT_TYPE_LABELS[event.type]);
    return [...new Set(labels)].filter(Boolean);
  }

  private registrationStatusText(competition: CompetitionWithEvents) {
    const now = new Date();
    if (competition.status !== TournamentStatus.REGISTRATION_OPEN) {
      return TOURNAMENT_STATUS_LABELS[competition.status];
    }
    if (competition.registrationStartDate && competition.registrationStartDate > now) {
      return '报名未开始';
    }
    if (competition.registrationEndDate && competition.registrationEndDate < now) {
      return '报名已截止';
    }
    return '报名中';
  }

  private normalizeEventType(value: string): EventType {
    if (value === EventType.MENS_SINGLES || value === '男子单打') return EventType.MENS_SINGLES;
    if (value === EventType.WOMENS_SINGLES || value === '女子单打') return EventType.WOMENS_SINGLES;
    throw new BadRequestException('暂时只支持男子单打和女子单打报名。');
  }

  private normalizeGender(value: string): Gender {
    if (value === Gender.MALE || value === '男') return Gender.MALE;
    if (value === Gender.FEMALE || value === '女') return Gender.FEMALE;
    throw new BadRequestException('性别填写有误。');
  }

  private normalizeStatusFilter(value?: string): RegistrationStatus | undefined {
    if (!value || value === 'all') return undefined;
    const normalized = value.toUpperCase();
    if (Object.values(RegistrationStatus).includes(normalized as RegistrationStatus)) {
      return normalized as RegistrationStatus;
    }
    throw new BadRequestException('审核状态筛选有误。');
  }

  private statusPriority(status: RegistrationStatus) {
    const priorities: Record<RegistrationStatus, number> = {
      PENDING: 0,
      APPROVED: 1,
      REJECTED: 2,
      REMOVED: 3,
    };
    return priorities[status] ?? 9;
  }
}
