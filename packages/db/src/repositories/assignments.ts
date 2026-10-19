import { PrismaClient, Assignment } from "@prisma/client";

export async function findAssignment(
  prisma: PrismaClient,
  scope: {
    organizationId: string;
    beneficiaryId: string;
    workerId?: string;
    supervisorId?: string;
  }
): Promise<Assignment | null> {
  const where: Record<string, unknown> = {
    organizationId: scope.organizationId,
    beneficiaryId: scope.beneficiaryId,
    active: true,
  };
  if (scope.workerId) where.workerId = scope.workerId;
  if (scope.supervisorId) where.supervisorId = scope.supervisorId;

  return prisma.assignment.findFirst({
    where,
  });
}

export async function isBeneficiaryAssignedToWorker(
  prisma: PrismaClient,
  scope: { organizationId: string; workerId: string; beneficiaryId: string }
): Promise<boolean> {
  const count = await prisma.assignment.count({
    where: {
      organizationId: scope.organizationId,
      workerId: scope.workerId,
      beneficiaryId: scope.beneficiaryId,
      active: true,
    },
  });
  return count > 0;
}

export async function isVisitAssignedToWorker(
  prisma: PrismaClient,
  scope: { organizationId: string; workerId: string; visitId: string }
): Promise<boolean> {
  const count = await prisma.visit.count({
    where: {
      id: scope.visitId,
      organizationId: scope.organizationId,
      workerId: scope.workerId,
    },
  });
  return count > 0;
}

export async function isVisitAssignedToSupervisor(
  prisma: PrismaClient,
  scope: { organizationId: string; supervisorId: string; visitId: string }
): Promise<boolean> {
  const count = await prisma.visit.count({
    where: {
      id: scope.visitId,
      organizationId: scope.organizationId,
      supervisorId: scope.supervisorId,
    },
  });
  return count > 0;
}
