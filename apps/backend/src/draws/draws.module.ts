import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { DrawsController } from './draws.controller';
import { DrawsService } from './draws.service';

@Module({
  imports: [PrismaModule],
  controllers: [DrawsController],
  providers: [DrawsService],
})
export class DrawsModule {}
