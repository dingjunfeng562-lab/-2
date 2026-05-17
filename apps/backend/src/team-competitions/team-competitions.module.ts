import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TeamCompetitionsController } from './team-competitions.controller';
import { TeamCompetitionsService } from './team-competitions.service';

@Module({
  imports: [PrismaModule],
  controllers: [TeamCompetitionsController],
  providers: [TeamCompetitionsService],
  exports: [TeamCompetitionsService],
})
export class TeamCompetitionsModule {}
