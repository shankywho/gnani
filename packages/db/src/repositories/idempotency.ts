import { PrismaClient, IdempotencyRecord, Prisma } from "@prisma/client";

export async function findIdempotencyRecord(
  prisma: PrismaClient,
  params: {
    actorId: string;
    operation: string;
    resourceKey: string;
    key: string;
  }
): Promise<IdempotencyRecord | null> {
  return prisma.idempotencyRecord.findUnique({
    where: {
      actorId_operation_resourceKey_key: {
        actorId: params.actorId,
        operation: params.operation,
        resourceKey: params.resourceKey,
        key: params.key,
      },
    },
  });
}

export async function recordIdempotency(
  prisma: PrismaClient,
  params: {
    actorId: string;
    operation: string;
    resourceKey: string;
    key: string;
    requestHash: string;
    responseStatus: number;
    responseBody: Prisma.InputJsonValue;
  }
): Promise<IdempotencyRecord> {
  return prisma.idempotencyRecord.create({
    data: {
      actorId: params.actorId,
      operation: params.operation,
      resourceKey: params.resourceKey,
      key: params.key,
      requestHash: params.requestHash,
      responseStatus: params.responseStatus,
      responseBody: params.responseBody,
    },
  });
}
