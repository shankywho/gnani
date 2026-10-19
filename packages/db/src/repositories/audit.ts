import { PrismaClient, TransitionAudit } from "@prisma/client";

export async function listAuditForVisit(
  prisma: PrismaClient,
  visitId: string
): Promise<TransitionAudit[]> {
  return prisma.transitionAudit.findMany({
    where: { visitId },
    orderBy: { createdAt: "asc" },
  });
}
