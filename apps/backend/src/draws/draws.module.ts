import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { DrawAlgorithmService } from './draw-algorithm.service';
import { DrawLogService } from './draw-log.service';
import { DrawsController } from './draws.controller';
import { DrawsService } from './draws.service';

@Module({
  imports: [PrismaModule],
  controllers: [DrawsController],
  providers: [DrawsService, DrawAlgorithmService, DrawLogService],
})
export class DrawsModule {}
