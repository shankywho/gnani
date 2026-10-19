import { PrismaClient } from "@sakhiline/db";
import {
  Actor,
  AppError,
  RevisionContent,
  ConfirmRequest,
  SubmitRequest,
  RequestContext,
  Observations,
} from "@sakhiline/contracts";
import {
  createVisit as repoCreateVisit,
  getVisitById as repoGetVisitById,
  editDraft as repoEditDraft,
  confirmRevision as repoConfirmRevision,
  submitVisit as repoSubmitVisit,
  reviewVisit as repoReviewVisit,
  reopenReturnedVisit as repoReopenReturnedVisit,
} from "@sakhiline/db";
import {
  assertWorkerBeneficiary,
  assertWorkerVisit,
  assertSupervisorVisit,
} from "../policy/assignments.js";
import { createHash } from "node:crypto";

export interface DomainVisitDeps {
  prisma: PrismaClient;
}

export function parseETag(etagHeader?: string): number | null {
  if (!etagHeader) return null;
  const match = etagHeader.match(/^(?:W\/)?"?(?:visit:)?[^:]+:(\d+)"?$/);
  if (match && match[1]) {
    return parseInt(match[1], 10);
  }
  const num = parseInt(etagHeader.replace(/["']/g, ""), 10);
  return Number.isNaN(num) ? null : num;
}

export function makeETag(visitId: string, revision: number): string {
  return `"visit:${visitId}:${revision}"`;
}

export async function createVisit(
  deps: DomainVisitDeps,
  params: {
    actor: Actor;
    beneficiaryId: string;
    visitAt: string;
    visitTimezone: string;
    idempotencyKey?: string;
    ctx: RequestContext;
  }
) {
  const start = Date.now();
  await assertWorkerBeneficiary(deps.prisma, {
    organizationId: params.actor.organizationId,
    workerId: params.actor.id,
    beneficiaryId: params.beneficiaryId,
  });

  const res = await repoCreateVisit(deps.prisma, {
    organizationId: params.actor.organizationId,
    workerId: params.actor.id,
    beneficiaryId: params.beneficiaryId,
    visitAt: params.visitAt,
    visitTimezone: params.visitTimezone,
    idempotencyKey: params.idempotencyKey,
    requestId: params.ctx.requestId,
  });

  params.ctx.log.info({
    op: "createVisit",
    actorRole: params.actor.role,
    visitId: res.visit.id,
    fromState: "none",
    toState: res.visit.state,
    revision: res.visit.currentRevision,
    durationMs: Date.now() - start,
  });

  return res;
}

export async function getVisit(
  deps: DomainVisitDeps,
  params: {
    actor: Actor;
    visitId: string;
  }
) {
  const visit = await repoGetVisitById(deps.prisma, {
    organizationId: params.actor.organizationId,
    actorId: params.actor.id,
    role: params.actor.role,
    visitId: params.visitId,
  });

  if (!visit) {
    throw new AppError("NOT_FOUND", "Visit not found");
  }

  return visit;
}

export async function editDraft(
  deps: DomainVisitDeps,
  params: {
    actor: Actor;
    visitId: string;
    expectedRevision: number;
    content: RevisionContent;
    ctx: RequestContext;
  }
) {
  const start = Date.now();
  await assertWorkerVisit(deps.prisma, {
    organizationId: params.actor.organizationId,
    workerId: params.actor.id,
    visitId: params.visitId,
  });

  const res = await repoEditDraft(deps.prisma, {
    organizationId: params.actor.organizationId,
    workerId: params.actor.id,
    visitId: params.visitId,
    expectedRevision: params.expectedRevision,
    content: params.content,
    requestId: params.ctx.requestId,
  });

  params.ctx.log.info({
    op: "editDraft",
    actorRole: params.actor.role,
    visitId: res.visit.id,
    fromState: "draft",
    toState: "draft",
    revision: res.visit.currentRevision,
    durationMs: Date.now() - start,
  });

  return res;
}

export async function confirmRevision(
  deps: DomainVisitDeps,
  params: {
    actor: Actor;
    visitId: string;
    expectedRevision: number;
    data: ConfirmRequest;
    ctx: RequestContext;
  }
) {
  const start = Date.now();
  await assertWorkerVisit(deps.prisma, {
    organizationId: params.actor.organizationId,
    workerId: params.actor.id,
    visitId: params.visitId,
  });

  if (params.data.revision !== params.expectedRevision) {
    throw new AppError("STALE_REVISION", "Refresh this visit before retrying.");
  }

  // Verify that all unresolved observations are explicitly acknowledged
  const visit = await getVisit(deps, { actor: params.actor, visitId: params.visitId });
  if (!visit.currentRevisionData) {
    throw new AppError("NOT_FOUND", "Revision not found");
  }

  const obs = visit.currentRevisionData.observations as unknown as Observations;
  const unknownFields: string[] = [];
  if (obs.bloodPressure?.status === "unknown") unknownFields.push("bloodPressure");
  if (obs.hemoglobin?.status === "unknown") unknownFields.push("hemoglobin");
  if (obs.ttDose?.status === "unknown") unknownFields.push("ttDose");
  if (obs.followUpDate?.status === "unknown") unknownFields.push("followUpDate");

  for (const f of unknownFields) {
    if (!params.data.unresolvedAcknowledged.includes(f)) {
      throw new AppError(
        "UNRESOLVED_INPUT",
        `Unresolved observation for ${f} must be acknowledged before confirmation`
      );
    }
  }

  const res = await repoConfirmRevision(deps.prisma, {
    organizationId: params.actor.organizationId,
    workerId: params.actor.id,
    visitId: params.visitId,
    revision: params.data.revision,
    contentHash: params.data.contentHash,
    unresolvedAcknowledged: params.data.unresolvedAcknowledged,
    requestId: params.ctx.requestId,
  });

  params.ctx.log.info({
    op: "confirmRevision",
    actorRole: params.actor.role,
    visitId: params.visitId,
    fromState: "draft",
    toState: "draft",
    revision: params.data.revision,
    durationMs: Date.now() - start,
  });

  return res;
}

export async function submitVisit(
  deps: DomainVisitDeps,
  params: {
    actor: Actor;
    visitId: string;
    expectedRevision: number;
    data: SubmitRequest;
    idempotencyKey: string;
    requestBody: unknown;
    ctx: RequestContext;
  }
) {
  const start = Date.now();
  await assertWorkerVisit(deps.prisma, {
    organizationId: params.actor.organizationId,
    workerId: params.actor.id,
    visitId: params.visitId,
  });

  const requestHash = createHash("sha256")
    .update(JSON.stringify(params.requestBody))
    .digest("hex");

  const res = await repoSubmitVisit(deps.prisma, {
    organizationId: params.actor.organizationId,
    workerId: params.actor.id,
    visitId: params.visitId,
    revision: params.data.revision,
    idempotencyKey: params.idempotencyKey,
    requestHash,
    requestId: params.ctx.requestId,
  });

  params.ctx.log.info({
    op: "submitVisit",
    actorRole: params.actor.role,
    visitId: params.visitId,
    fromState: "draft",
    toState: "submitted",
    revision: params.data.revision,
    durationMs: Date.now() - start,
  });

  return res;
}

export async function reviewVisit(
  deps: DomainVisitDeps,
  params: {
    actor: Actor;
    visitId: string;
    expectedRevision: number;
    action: "approve" | "return";
    reason?: string;
    idempotencyKey: string;
    requestBody: unknown;
    ctx: RequestContext;
  }
) {
  const start = Date.now();
  await assertSupervisorVisit(deps.prisma, {
    organizationId: params.actor.organizationId,
    supervisorId: params.actor.id,
    visitId: params.visitId,
  });

  const requestHash = createHash("sha256")
    .update(JSON.stringify(params.requestBody))
    .digest("hex");

  const res = await repoReviewVisit(deps.prisma, {
    organizationId: params.actor.organizationId,
    supervisorId: params.actor.id,
    visitId: params.visitId,
    revision: params.expectedRevision,
    action: params.action,
    reason: params.reason,
    idempotencyKey: params.idempotencyKey,
    requestHash,
    requestId: params.ctx.requestId,
  });

  const toState = params.action === "approve" ? "approved" : "returned";
  params.ctx.log.info({
    op: "reviewVisit",
    actorRole: params.actor.role,
    visitId: params.visitId,
    fromState: "submitted",
    toState,
    revision: params.expectedRevision,
    durationMs: Date.now() - start,
  });

  return res;
}

export async function reopenVisit(
  deps: DomainVisitDeps,
  params: {
    actor: Actor;
    visitId: string;
    expectedRevision: number;
    ctx: RequestContext;
  }
) {
  const start = Date.now();
  await assertWorkerVisit(deps.prisma, {
    organizationId: params.actor.organizationId,
    workerId: params.actor.id,
    visitId: params.visitId,
  });

  const res = await repoReopenReturnedVisit(deps.prisma, {
    organizationId: params.actor.organizationId,
    workerId: params.actor.id,
    visitId: params.visitId,
    expectedRevision: params.expectedRevision,
    requestId: params.ctx.requestId,
  });

  params.ctx.log.info({
    op: "reopenVisit",
    actorRole: params.actor.role,
    visitId: params.visitId,
    fromState: "returned",
    toState: "draft",
    revision: res.visit.currentRevision,
    durationMs: Date.now() - start,
  });

  return res;
}

export async function readbackVisit(
  deps: DomainVisitDeps,
  params: {
    actor: Actor;
    visitId: string;
  }
) {
  const visit = await getVisit(deps, { actor: params.actor, visitId: params.visitId });
  if (!visit.currentRevisionData) {
    throw new AppError("NOT_FOUND", "Revision not found");
  }

  // Must have a confirmed revision or approved state
  if (!visit.confirmedRevision && visit.state !== "approved") {
    throw new AppError("VALIDATION", "Read-back is available only for confirmed revisions");
  }

  const { generateReadback } = await import("../extraction/readback.js");
  const text = generateReadback(visit.currentRevisionData.observations as unknown as Observations);
  return { readbackText: text };
}
