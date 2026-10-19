import { PrismaClient } from "@sakhiline/db";
import { Actor, AppError } from "@sakhiline/contracts";

export function assertRole(
  actor: Actor | null | undefined,
  requiredRole: "worker" | "supervisor"
): asserts actor is Actor {
  if (!actor) {
    throw new AppError("UNAUTHENTICATED", "Authentication required");
  }
  if (actor.role !== requiredRole) {
    throw new AppError("FORBIDDEN", "Insufficient role permissions");
  }
}

export async function canWorkerAccessBeneficiary(
  prisma: PrismaClient,
  scope: { organizationId: string; workerId: string; beneficiaryId: string }
): Promise<boolean> {
  const assignment = await prisma.assignment.findFirst({
    where: {
      organizationId: scope.organizationId,
      workerId: scope.workerId,
      beneficiaryId: scope.beneficiaryId,
      active: true,
    },
  });
  return Boolean(assignment);
}

export async function canWorkerAccessVisit(
  prisma: PrismaClient,
  scope: { organizationId: string; workerId: string; visitId: string }
): Promise<boolean> {
  const visit = await prisma.visit.findFirst({
    where: {
      id: scope.visitId,
      organizationId: scope.organizationId,
      workerId: scope.workerId,
    },
  });
  return Boolean(visit);
}

export async function canSupervisorReviewVisit(
  prisma: PrismaClient,
  scope: { organizationId: string; supervisorId: string; visitId: string }
): Promise<boolean> {
  const visit = await prisma.visit.findFirst({
    where: {
      id: scope.visitId,
      organizationId: scope.organizationId,
      supervisorId: scope.supervisorId,
    },
  });
  return Boolean(visit);
}

export async function assertWorkerBeneficiary(
  prisma: PrismaClient,
  scope: { organizationId: string; workerId: string; beneficiaryId: string }
): Promise<void> {
  const allowed = await canWorkerAccessBeneficiary(prisma, scope);
  if (!allowed) {
    // Deny by default: unassigned and non-existent are indistinguishable (404, identical body)
    throw new AppError("NOT_FOUND", "Beneficiary not found");
  }
}

export async function assertWorkerVisit(
  prisma: PrismaClient,
  scope: { organizationId: string; workerId: string; visitId: string }
): Promise<void> {
  const allowed = await canWorkerAccessVisit(prisma, scope);
  if (!allowed) {
    throw new AppError("NOT_FOUND", "Visit not found");
  }
}

export async function assertSupervisorVisit(
  prisma: PrismaClient,
  scope: { organizationId: string; supervisorId: string; visitId: string }
): Promise<void> {
  const allowed = await canSupervisorReviewVisit(prisma, scope);
  if (!allowed) {
    throw new AppError("NOT_FOUND", "Visit not found");
  }
}
