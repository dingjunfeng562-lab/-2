import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PublicController } from './public.controller';
import { PublicService } from './public.service';
import { TeamCompetitionsModule } from '../team-competitions/team-competitions.module';

@Module({
  imports: [PrismaModule, TeamCompetitionsModule],
  controllers: [PublicController],
  providers: [PublicService],
})
export class PublicModule {}
