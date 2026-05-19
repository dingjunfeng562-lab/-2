import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PublicController } from './public.controller';
import { PublicService } from './public.service';
import { TeamCompetitionsModule } from '../team-competitions/team-competitions.module';
import { AnnouncementsModule } from '../announcements/announcements.module';

@Module({
  imports: [PrismaModule, TeamCompetitionsModule, AnnouncementsModule],
  controllers: [PublicController],
  providers: [PublicService],
})
export class PublicModule {}
