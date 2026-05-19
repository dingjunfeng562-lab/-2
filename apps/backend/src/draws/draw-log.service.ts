import { Injectable } from '@nestjs/common';
import { DrawOperationType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DrawLogService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    tx: Prisma.TransactionClient,
    params: {
      eventItemId: string;
      drawBracketId: string;
      operationType: DrawOperationType;
      operatorId: string;
      operatorNameSnapshot?: string | null;
      positionA?: number | null;
      positionB?: number | null;
      beforeData?: Prisma.InputJsonValue | null;
      afterData?: Prisma.InputJsonValue | null;
      remark?: string | null;
    },
  ) {
    return tx.drawOperationLog.create({
      data: {
        eventItemId: params.eventItemId,
        drawBracketId: params.drawBracketId,
        operationType: params.operationType,
        operatorId: params.operatorId,
        operatorNameSnapshot: params.operatorNameSnapshot ?? null,
        positionA: params.positionA ?? null,
        positionB: params.positionB ?? null,
        beforeData: params.beforeData ?? undefined,
        afterData: params.afterData ?? undefined,
        remark: params.remark ?? null,
      },
    });
  }
}
