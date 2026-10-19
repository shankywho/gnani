import { PrismaClient, Beneficiary } from "@prisma/client";
import { AppError } from "@sakhiline/contracts";

/** Unknown/foreign cursors make Prisma throw P2025; surface that as a client error, not a 500. */
export async function findPage<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (err) {
    if ((err as { code?: string })?.code === "P2025") {
      throw new AppError("VALIDATION", "Invalid cursor");
    }
    throw err;
  }
}

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

  if (scope.cursor) {
    const ok = await prisma.assignment.count({
      where: { id: scope.cursor, organizationId: scope.organizationId, workerId: scope.workerId, active: true },
    });
    if (!ok) throw new AppError("VALIDATION", "Invalid cursor");
  }

  const assignments = await findPage(() => prisma.assignment.findMany({
    where: {
      organizationId: scope.organizationId,
      workerId: scope.workerId,
      active: true,
    },
    include: {
      beneficiary: true,
    },
    take: take + 1,
    // Prisma cursors are inclusive: skip the cursor row or page N+1 repeats page N's last item.
    ...(scope.cursor ? { cursor: { id: scope.cursor }, skip: 1 } : {}),
    orderBy: { id: "asc" },
  }));

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
