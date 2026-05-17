import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ScoringController } from './scoring.controller';
import { ScoringGateway } from './scoring.gateway';
import { ScoringService } from './scoring.service';
import { TeamCompetitionsModule } from '../team-competitions/team-competitions.module';

@Module({
  imports: [PrismaModule, TeamCompetitionsModule],
  controllers: [ScoringController],
  providers: [ScoringService, ScoringGateway],
})
export class ScoringModule {}
