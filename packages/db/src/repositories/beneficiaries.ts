import { PrismaClient, Beneficiary } from "@prisma/client";

export async function listAssignedBeneficiaries(
  prisma: PrismaClient,
  scope: {
    organizationId: string;
    workerId: string;
    cursor?: string;
    limit?: number;
  }
): Promise<{ beneficiaries: Beneficiary[]; nextCursor?: string }> {
  const take = Math.min(Math.max(scope.limit || 50, 1), 50);

  const assignments = await prisma.assignment.findMany({
    where: {
      organizationId: scope.organizationId,
      workerId: scope.workerId,
      active: true,
    },
    include: {
      beneficiary: true,
    },
    take: take + 1,
    cursor: scope.cursor ? { id: scope.cursor } : undefined,
    orderBy: { id: "asc" },
  });

  const hasMore = assignments.length > take;
  const sliced = hasMore ? assignments.slice(0, take) : assignments;
  const nextCursor = hasMore ? sliced[sliced.length - 1]?.id : undefined;

  return {
    beneficiaries: sliced.map((a) => a.beneficiary),
    nextCursor,
  };
}

export async function getBeneficiaryById(
  prisma: PrismaClient,
  scope: {
    organizationId: string;
    workerId: string;
    beneficiaryId: string;
  }
): Promise<Beneficiary | null> {
  const assignment = await prisma.assignment.findFirst({
    where: {
      organizationId: scope.organizationId,
      workerId: scope.workerId,
      beneficiaryId: scope.beneficiaryId,
      active: true,
    },
    include: {
      beneficiary: true,
    },
  });

  return assignment ? assignment.beneficiary : null;
}
