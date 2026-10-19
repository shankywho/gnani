import { PrismaClient, Visit, VisitRevision, Prisma } from "@prisma/client";
import {
  AppError,
  RevisionContent,
  contentHash as computeContentHash,
} from "@sakhiline/contracts";

export interface AllowedActions {
  canEdit: boolean;
  canConfirm: boolean;
  canSubmit: boolean;
  canApprove: boolean;
  canReturn: boolean;
  canReopen: boolean;
}

export interface VisitWithDetails extends Visit {
  currentRevisionData: VisitRevision | null;
  allowedActions: AllowedActions;
}

export function computeAllowedActions(
  role: "worker" | "supervisor",
  state: string,
  currentRevision: number,
  confirmedRevision: number | null
): AllowedActions {
  const isWorker = role === "worker";
  const isSupervisor = role === "supervisor";

  return {
    canEdit: isWorker && state === "draft",
    canConfirm: isWorker && state === "draft",
    canSubmit: isWorker && state === "draft" && confirmedRevision === currentRevision,
    canApprove: isSupervisor && state === "submitted",
    canReturn: isSupervisor && state === "submitted",
    canReopen: isWorker && state === "returned",
  };
}

export async function getVisitById(
  prisma: PrismaClient,
  scope: {
    organizationId: string;
    actorId: string;
    role: "worker" | "supervisor";
    visitId: string;
  }
): Promise<VisitWithDetails | null> {
  const visit = await prisma.visit.findFirst({
    where: {
      id: scope.visitId,
      organizationId: scope.organizationId,
      ...(scope.role === "worker"
        ? { workerId: scope.actorId }
        : { supervisorId: scope.actorId }),
    },
    include: {
      revisions: {
        orderBy: { revision: "desc" },
        take: 1,
      },
    },
  });

  if (!visit) return null;

  const currentRevisionData = visit.revisions[0] || null;
  const allowedActions = computeAllowedActions(
    scope.role,
    visit.state,
    visit.currentRevision,
    visit.confirmedRevision
  );

  return {
    ...visit,
    currentRevisionData,
    allowedActions,
  };
}

export async function listHistoricalVisits(
  prisma: PrismaClient,
  scope: {
    organizationId: string;
    workerId: string;
    beneficiaryId: string;
    cursor?: string;
    limit?: number;
  }
) {
  const limit = Math.min(Math.max(scope.limit || 50, 1), 50);

  // Assignment check: worker must be assigned to beneficiary
  const assignment = await prisma.assignment.findFirst({
    where: {
      organizationId: scope.organizationId,
      workerId: scope.workerId,
      beneficiaryId: scope.beneficiaryId,
      active: true,
    },
  });
  if (!assignment) {
    throw new AppError("NOT_FOUND", "Beneficiary not found or not assigned");
  }

  const visits = await prisma.visit.findMany({
    where: {
      organizationId: scope.organizationId,
      beneficiaryId: scope.beneficiaryId,
      state: "approved",
    },
    include: {
      revisions: {
        orderBy: { revision: "desc" },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    cursor: scope.cursor ? { id: scope.cursor } : undefined,
  });

  const hasMore = visits.length > limit;
  const sliced = hasMore ? visits.slice(0, limit) : visits;
  const nextCursor = hasMore ? sliced[sliced.length - 1]?.id : undefined;

  return {
    visits: sliced,
    nextCursor,
  };
}

export async function listPendingReviews(
  prisma: PrismaClient,
  scope: {
    organizationId: string;
    supervisorId: string;
    cursor?: string;
    limit?: number;
  }
) {
  const limit = Math.min(Math.max(scope.limit || 50, 1), 50);

  const visits = await prisma.visit.findMany({
    where: {
      organizationId: scope.organizationId,
      supervisorId: scope.supervisorId,
      state: "submitted",
    },
    include: {
      revisions: {
        orderBy: { revision: "desc" },
        take: 1,
      },
      beneficiary: true,
    },
    orderBy: { updatedAt: "desc" },
    take: limit + 1,
    cursor: scope.cursor ? { id: scope.cursor } : undefined,
  });

  const hasMore = visits.length > limit;
  const sliced = hasMore ? visits.slice(0, limit) : visits;
  const nextCursor = hasMore ? sliced[sliced.length - 1]?.id : undefined;

  return {
    reviews: sliced,
    nextCursor,
  };
}

export async function createVisit(
  prisma: PrismaClient,
  params: {
    organizationId: string;
    workerId: string;
    beneficiaryId: string;
    visitAt: string;
    visitTimezone: string;
    idempotencyKey?: string;
    requestId: string;
  }
) {
  // Validate assignment
  const assignment = await prisma.assignment.findFirst({
    where: {
      organizationId: params.organizationId,
      workerId: params.workerId,
      beneficiaryId: params.beneficiaryId,
      active: true,
    },
  });
  if (!assignment) {
    throw new AppError("NOT_FOUND", "Beneficiary not found or not assigned");
  }

  const initialContent: RevisionContent = {
    visitAt: params.visitAt,
    visitTimezone: params.visitTimezone,
    observations: {
      bloodPressure: { status: "not_mentioned" },
      hemoglobin: { status: "not_mentioned" },
      ttDose: { status: "not_mentioned" },
      followUpDate: { status: "not_mentioned" },
    },
    unresolvedAcknowledged: [],
  };

  const hash = computeContentHash(initialContent);

  return prisma.$transaction(async (tx) => {
    const visit = await tx.visit.create({
      data: {
        organizationId: params.organizationId,
        beneficiaryId: params.beneficiaryId,
        workerId: params.workerId,
        supervisorId: assignment.supervisorId,
        state: "draft",
        currentRevision: 1,
        confirmedRevision: null,
      },
    });

    const revision = await tx.visitRevision.create({
      data: {
        visitId: visit.id,
        revision: 1,
        visitAt: new Date(params.visitAt),
        visitTimezone: params.visitTimezone,
        observations: initialContent.observations as unknown as Prisma.InputJsonValue,
        contentHash: hash,
        createdBy: params.workerId,
      },
    });

    await tx.transitionAudit.create({
      data: {
        visitId: visit.id,
        revision: 1,
        actorId: params.workerId,
        fromState: "draft",
        toState: "draft",
        requestId: params.requestId,
      },
    });

    return {
      visit,
      revision,
    };
  });
}

export async function editDraft(
  prisma: PrismaClient,
  params: {
    organizationId: string;
    workerId: string;
    visitId: string;
    expectedRevision: number;
    content: RevisionContent;
    requestId: string;
  }
) {
  const hash = computeContentHash(params.content);

  return prisma.$transaction(async (tx) => {
    const visit = await tx.visit.findFirst({
      where: {
        id: params.visitId,
        organizationId: params.organizationId,
        workerId: params.workerId,
      },
    });
    if (!visit) {
      throw new AppError("NOT_FOUND", "Visit not found");
    }

    if (visit.state !== "draft") {
      throw new AppError("VALIDATION", "Only draft visits can be edited");
    }

    if (visit.currentRevision !== params.expectedRevision) {
      throw new AppError("STALE_REVISION", "Refresh this visit before retrying.");
    }

    const nextRevision = visit.currentRevision + 1;

    // Advance pointer and clear confirmation
    const updatedVisit = await tx.visit.update({
      where: { id: visit.id },
      data: {
        currentRevision: nextRevision,
        confirmedRevision: null,
      },
    });

    const newRevision = await tx.visitRevision.create({
      data: {
        visitId: visit.id,
        revision: nextRevision,
        visitAt: new Date(params.content.visitAt),
        visitTimezone: params.content.visitTimezone,
        observations: params.content.observations as unknown as Prisma.InputJsonValue,
        note: params.content.note,
        transcript: params.content.transcript,
        unresolvedAcknowledged: params.content.unresolvedAcknowledged as unknown as Prisma.InputJsonValue,
        contentHash: hash,
        createdBy: params.workerId,
      },
    });

    await tx.transitionAudit.create({
      data: {
        visitId: visit.id,
        revision: nextRevision,
        actorId: params.workerId,
        fromState: "draft",
        toState: "draft",
        requestId: params.requestId,
      },
    });

    return {
      visit: updatedVisit,
      revision: newRevision,
    };
  });
}

export async function confirmRevision(
  prisma: PrismaClient,
  params: {
    organizationId: string;
    workerId: string;
    visitId: string;
    revision: number;
    contentHash: string;
    unresolvedAcknowledged: string[];
    requestId: string;
  }
) {
  return prisma.$transaction(async (tx) => {
    const visit = await tx.visit.findFirst({
      where: {
        id: params.visitId,
        organizationId: params.organizationId,
        workerId: params.workerId,
      },
    });
    if (!visit) {
      throw new AppError("NOT_FOUND", "Visit not found");
    }

    if (visit.state !== "draft") {
      throw new AppError("VALIDATION", "Only draft visits can be confirmed");
    }

    if (visit.currentRevision !== params.revision) {
      throw new AppError("STALE_REVISION", "Refresh this visit before retrying.");
    }

    const rev = await tx.visitRevision.findUnique({
      where: {
        visitId_revision: {
          visitId: visit.id,
          revision: params.revision,
        },
      },
    });
    if (!rev) {
      throw new AppError("NOT_FOUND", "Revision not found");
    }

    if (rev.contentHash !== params.contentHash) {
      throw new AppError("VALIDATION", "Content hash mismatch");
    }

    const now = new Date();

    // Update confirmation metadata on revision (allowed once from null by trigger)
    await tx.visitRevision.update({
      where: {
        visitId_revision: {
          visitId: visit.id,
          revision: params.revision,
        },
      },
      data: {
        confirmedBy: params.workerId,
        confirmedAt: now,
      },
    });

    const updatedVisit = await tx.visit.update({
      where: { id: visit.id },
      data: {
        confirmedRevision: params.revision,
      },
    });

    await tx.transitionAudit.create({
      data: {
        visitId: visit.id,
        revision: params.revision,
        actorId: params.workerId,
        fromState: "draft",
        toState: "draft",
        requestId: params.requestId,
      },
    });

    return {
      visit: updatedVisit,
      confirmedRevision: params.revision,
      confirmedAt: now.toISOString(),
    };
  });
}

export async function submitVisit(
  prisma: PrismaClient,
  params: {
    organizationId: string;
    workerId: string;
    visitId: string;
    revision: number;
    idempotencyKey: string;
    requestHash: string;
    requestId: string;
  }
): Promise<{ visit: Visit; isReplay: boolean }> {
  return prisma.$transaction(async (tx) => {
    // Check idempotency
    const existing = await tx.idempotencyRecord.findUnique({
      where: {
        actorId_operation_resourceKey_key: {
          actorId: params.workerId,
          operation: "submitVisit",
          resourceKey: params.visitId,
          key: params.idempotencyKey,
        },
      },
    });

    if (existing) {
      if (existing.requestHash !== params.requestHash) {
        throw new AppError(
          "IDEMPOTENCY_CONFLICT",
          "Idempotency key reused with different request payload"
        );
      }
      return {
        visit: existing.responseBody as unknown as Visit,
        isReplay: true,
      };
    }

    const visit = await tx.visit.findFirst({
      where: {
        id: params.visitId,
        organizationId: params.organizationId,
        workerId: params.workerId,
      },
    });
    if (!visit) {
      throw new AppError("NOT_FOUND", "Visit not found");
    }

    if (visit.state !== "draft") {
      throw new AppError("VALIDATION", "Visit is not in draft state");
    }

    if (visit.currentRevision !== params.revision) {
      throw new AppError("STALE_REVISION", "Refresh this visit before retrying.");
    }

    if (visit.confirmedRevision !== params.revision) {
      throw new AppError(
        "UNRESOLVED_INPUT",
        "Must confirm current revision before submitting"
      );
    }

    const updatedVisit = await tx.visit.update({
      where: { id: visit.id },
      data: {
        state: "submitted",
      },
    });

    await tx.transitionAudit.create({
      data: {
        visitId: visit.id,
        revision: params.revision,
        actorId: params.workerId,
        fromState: "draft",
        toState: "submitted",
        requestId: params.requestId,
      },
    });

    await tx.idempotencyRecord.create({
      data: {
        actorId: params.workerId,
        operation: "submitVisit",
        resourceKey: params.visitId,
        key: params.idempotencyKey,
        requestHash: params.requestHash,
        responseStatus: 200,
        responseBody: updatedVisit as unknown as Prisma.InputJsonValue,
      },
    });

    return {
      visit: updatedVisit,
      isReplay: false,
    };
  });
}

export async function reviewVisit(
  prisma: PrismaClient,
  params: {
    organizationId: string;
    supervisorId: string;
    visitId: string;
    revision: number;
    action: "approve" | "return";
    reason?: string;
    idempotencyKey: string;
    requestHash: string;
    requestId: string;
  }
): Promise<{ visit: Visit; isReplay: boolean }> {
  return prisma.$transaction(async (tx) => {
    // Check idempotency
    const existing = await tx.idempotencyRecord.findUnique({
      where: {
        actorId_operation_resourceKey_key: {
          actorId: params.supervisorId,
          operation: "reviewVisit",
          resourceKey: params.visitId,
          key: params.idempotencyKey,
        },
      },
    });

    if (existing) {
      if (existing.requestHash !== params.requestHash) {
        throw new AppError(
          "IDEMPOTENCY_CONFLICT",
          "Idempotency key reused with different request payload"
        );
      }
      return {
        visit: existing.responseBody as unknown as Visit,
        isReplay: true,
      };
    }

    const visit = await tx.visit.findFirst({
      where: {
        id: params.visitId,
        organizationId: params.organizationId,
        supervisorId: params.supervisorId,
      },
    });
    if (!visit) {
      throw new AppError("NOT_FOUND", "Visit not found");
    }

    if (visit.state !== "submitted") {
      throw new AppError("VALIDATION", "Visit is not pending review");
    }

    if (visit.currentRevision !== params.revision) {
      throw new AppError("STALE_REVISION", "Refresh this visit before retrying.");
    }

    const nextState = params.action === "approve" ? "approved" : "returned";

    const updatedVisit = await tx.visit.update({
      where: { id: visit.id },
      data: {
        state: nextState,
      },
    });

    await tx.transitionAudit.create({
      data: {
        visitId: visit.id,
        revision: params.revision,
        actorId: params.supervisorId,
        fromState: "submitted",
        toState: nextState,
        returnReason: params.action === "return" ? params.reason : null,
        requestId: params.requestId,
      },
    });

    await tx.idempotencyRecord.create({
      data: {
        actorId: params.supervisorId,
        operation: "reviewVisit",
        resourceKey: params.visitId,
        key: params.idempotencyKey,
        requestHash: params.requestHash,
        responseStatus: 200,
        responseBody: updatedVisit as unknown as Prisma.InputJsonValue,
      },
    });

    return {
      visit: updatedVisit,
      isReplay: false,
    };
  });
}

export async function reopenReturnedVisit(
  prisma: PrismaClient,
  params: {
    organizationId: string;
    workerId: string;
    visitId: string;
    expectedRevision: number;
    requestId: string;
  }
) {
  return prisma.$transaction(async (tx) => {
    const visit = await tx.visit.findFirst({
      where: {
        id: params.visitId,
        organizationId: params.organizationId,
        workerId: params.workerId,
      },
    });
    if (!visit) {
      throw new AppError("NOT_FOUND", "Visit not found");
    }

    if (visit.state !== "returned") {
      throw new AppError("VALIDATION", "Only returned visits can be reopened");
    }

    if (visit.currentRevision !== params.expectedRevision) {
      throw new AppError("STALE_REVISION", "Refresh this visit before retrying.");
    }

    const lastRevision = await tx.visitRevision.findUnique({
      where: {
        visitId_revision: {
          visitId: visit.id,
          revision: visit.currentRevision,
        },
      },
    });
    if (!lastRevision) {
      throw new AppError("NOT_FOUND", "Previous revision not found");
    }

    const nextRev = visit.currentRevision + 1;

    // Construct fresh content for the reopened revision
    const freshContent: RevisionContent = {
      visitAt: lastRevision.visitAt.toISOString(),
      visitTimezone: lastRevision.visitTimezone,
      observations: lastRevision.observations as unknown as RevisionContent["observations"],
      note: lastRevision.note || undefined,
      transcript: lastRevision.transcript || undefined,
      unresolvedAcknowledged: [],
    };
    const freshHash = computeContentHash(freshContent);

    const updatedVisit = await tx.visit.update({
      where: { id: visit.id },
      data: {
        state: "draft",
        currentRevision: nextRev,
        confirmedRevision: null,
      },
    });

    const newRevision = await tx.visitRevision.create({
      data: {
        visitId: visit.id,
        revision: nextRev,
        visitAt: lastRevision.visitAt,
        visitTimezone: lastRevision.visitTimezone,
        observations: lastRevision.observations as unknown as Prisma.InputJsonValue,
        note: lastRevision.note,
        transcript: lastRevision.transcript,
        provenance: lastRevision.provenance as unknown as Prisma.InputJsonValue,
        contentHash: freshHash,
        createdBy: params.workerId,
      },
    });

    await tx.transitionAudit.create({
      data: {
        visitId: visit.id,
        revision: nextRev,
        actorId: params.workerId,
        fromState: "returned",
        toState: "draft",
        requestId: params.requestId,
      },
    });

    return {
      visit: updatedVisit,
      revision: newRevision,
    };
  });
}
