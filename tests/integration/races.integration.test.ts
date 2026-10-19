import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getPrismaClient, seed, PrismaClient, submitVisit, reviewVisit, editDraft, createVisit } from "@sakhiline/db";
import { contentHash, RevisionContent } from "@sakhiline/contracts";

// Repo-level races: many truly parallel callers, repeated, to expose read-then-write gaps.
describe("repository race stress", () => {
  let prisma: PrismaClient;
  const ORG = "00000000-0000-0000-0000-000000000001";
  const WORKER_A = "00000000-0000-0000-0000-000000000010";
  const SUP_A = "00000000-0000-0000-0000-000000000020";
  const SYN_0001 = "00000000-0000-0000-0000-000000000101";

  beforeAll(async () => {
    prisma = getPrismaClient();
    await seed(prisma);
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });

  const content: RevisionContent = {
    visitAt: "2026-10-19T10:00:00+05:30",
    visitTimezone: "Asia/Kolkata",
    observations: {
      bloodPressure: { status: "not_measured" },
      hemoglobin: { status: "not_mentioned" },
      ttDose: { status: "not_mentioned" },
      followUpDate: { status: "not_mentioned" },
    },
    unresolvedAcknowledged: [],
  };

  async function newSubmitted(n: number) {
    const { visit } = await createVisit(prisma, {
      organizationId: ORG, workerId: WORKER_A, beneficiaryId: SYN_0001,
      visitAt: content.visitAt, visitTimezone: content.visitTimezone, idempotencyKey: `create-${crypto.randomUUID()}`, requestHash: "h", requestId: `r-${n}`,
    });
    const { confirmRevision } = await import("@sakhiline/db");
    const e = await editDraft(prisma, { organizationId: ORG, workerId: WORKER_A, visitId: visit.id, expectedRevision: 1, content, requestId: "e" });
    await confirmRevision(prisma, { organizationId: ORG, workerId: WORKER_A, visitId: visit.id, revision: 2, contentHash: contentHash(content), unresolvedAcknowledged: [], requestId: "c" });
    await submitVisit(prisma, { organizationId: ORG, workerId: WORKER_A, visitId: visit.id, revision: 2, idempotencyKey: `k-submit-${visit.id}`.padEnd(20, "x"), requestHash: "h", requestId: "s" });
    void e;
    return visit.id;
  }

  it("approve vs return: exactly one wins over 25 rounds", async () => {
    for (let i = 0; i < 25; i++) {
      const id = await newSubmitted(i);
      const base = { organizationId: ORG, supervisorId: SUP_A, visitId: id, revision: 2, requestId: "q" };
      const results = await Promise.allSettled([
        reviewVisit(prisma, { ...base, action: "approve", idempotencyKey: `ka-${id}`.padEnd(20, "x"), requestHash: "a" }),
        reviewVisit(prisma, { ...base, action: "return", reason: "r", idempotencyKey: `kr-${id}`.padEnd(20, "x"), requestHash: "b" }),
      ]);
      const ok = results.filter((r) => r.status === "fulfilled").length;
      const audits = await prisma.transitionAudit.count({ where: { visitId: id, fromState: "submitted" } });
      expect({ round: i, ok, audits }).toEqual({ round: i, ok: 1, audits: 1 });
    }
  });

  it("same-key concurrent submit: all replay/succeed, one transition (20 rounds x 8)", async () => {
    for (let i = 0; i < 20; i++) {
      const { visit } = await createVisit(prisma, {
        organizationId: ORG, workerId: WORKER_A, beneficiaryId: SYN_0001,
        visitAt: content.visitAt, visitTimezone: content.visitTimezone, idempotencyKey: `create-${crypto.randomUUID()}`, requestHash: "h", requestId: "x",
      });
      const { confirmRevision } = await import("@sakhiline/db");
      await editDraft(prisma, { organizationId: ORG, workerId: WORKER_A, visitId: visit.id, expectedRevision: 1, content, requestId: "e" });
      await confirmRevision(prisma, { organizationId: ORG, workerId: WORKER_A, visitId: visit.id, revision: 2, contentHash: contentHash(content), unresolvedAcknowledged: [], requestId: "c" });
      const call = () => submitVisit(prisma, { organizationId: ORG, workerId: WORKER_A, visitId: visit.id, revision: 2, idempotencyKey: "same-key-1234567890-abc", requestHash: "h", requestId: "s" });
      const res = await Promise.allSettled(Array.from({ length: 8 }, call));
      const bad = res.filter((r) => r.status === "rejected").map((r: any) => r.reason?.code ?? r.reason?.message);
      const audits = await prisma.transitionAudit.count({ where: { visitId: visit.id, toState: "submitted" } });
      expect({ i, bad, audits }).toEqual({ i, bad: [], audits: 1 });
    }
  });

  it("concurrent edits on same expected revision: exactly one wins, others STALE_REVISION", async () => {
    for (let i = 0; i < 20; i++) {
      const { visit } = await createVisit(prisma, {
        organizationId: ORG, workerId: WORKER_A, beneficiaryId: SYN_0001,
        visitAt: content.visitAt, visitTimezone: content.visitTimezone, idempotencyKey: `create-${crypto.randomUUID()}`, requestHash: "h", requestId: "x",
      });
      const edit = (n: string) => editDraft(prisma, { organizationId: ORG, workerId: WORKER_A, visitId: visit.id, expectedRevision: 1, content: { ...content, note: n }, requestId: "e" });
      const res = await Promise.allSettled([edit("a"), edit("b"), edit("c"), edit("d")]);
      const ok = res.filter((r) => r.status === "fulfilled").length;
      const codes = res.filter((r) => r.status === "rejected").map((r: any) => r.reason?.code);
      expect({ i, ok, codes }).toEqual({ i, ok: 1, codes: ["STALE_REVISION", "STALE_REVISION", "STALE_REVISION"] });
    }
  });
});
