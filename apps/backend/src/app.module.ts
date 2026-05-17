import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { PlayersModule } from './players/players.module';
import { TournamentsModule } from './tournaments/tournaments.module';
import { EventsModule } from './events/events.module';
import { DrawsModule } from './draws/draws.module';
import { PublicModule } from './public/public.module';
import { UploadsModule } from './uploads/uploads.module';
import { ScoringModule } from './scoring/scoring.module';
import { SchedulingModule } from './scheduling/scheduling.module';
import { ExportsModule } from './exports/exports.module';
import { TeamCompetitionsModule } from './team-competitions/team-competitions.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    PlayersModule,
    TournamentsModule,
    EventsModule,
    DrawsModule,
    PublicModule,
    UploadsModule,
    ScoringModule,
    SchedulingModule,
    ExportsModule,
    TeamCompetitionsModule,
  ],
})
export class AppModule {}
