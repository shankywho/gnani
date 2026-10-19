import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getPrismaClient, createPrismaClient } from "../src/client.js";
import { seed } from "../prisma/seed.js";
import { PrismaClient } from "@prisma/client";

describe("Database Integration Tests (Real Postgres)", () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = getPrismaClient();
    await seed(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("Integration #1: Seed twice produces identical row counts", async () => {
    const orgCount1 = await prisma.organization.count();
    const actorCount1 = await prisma.actor.count();
    const benCount1 = await prisma.beneficiary.count();
    const assignCount1 = await prisma.assignment.count();
    const visitCount1 = await prisma.visit.count();
    const revCount1 = await prisma.visitRevision.count();
    const auditCount1 = await prisma.transitionAudit.count();

    // Run seed again
    await seed(prisma);

    const orgCount2 = await prisma.organization.count();
    const actorCount2 = await prisma.actor.count();
    const benCount2 = await prisma.beneficiary.count();
    const assignCount2 = await prisma.assignment.count();
    const visitCount2 = await prisma.visit.count();
    const revCount2 = await prisma.visitRevision.count();
    const auditCount2 = await prisma.transitionAudit.count();

    expect(orgCount2).toBe(orgCount1);
    expect(actorCount2).toBe(actorCount1);
    expect(benCount2).toBe(benCount1);
    expect(assignCount2).toBe(assignCount1);
    expect(visitCount2).toBe(visitCount1);
    expect(revCount2).toBe(revCount1);
    expect(auditCount2).toBe(auditCount1);

    expect(benCount1).toBe(8);
    expect(actorCount1).toBe(4);
    expect(assignCount1).toBe(8);

    const seededVisits = await prisma.visit.count({
      where: {
        id: {
          in: [
            "00000000-0000-0000-0000-000000001001",
            "00000000-0000-0000-0000-000000001002",
            "00000000-0000-0000-0000-000000001003",
          ],
        },
      },
    });
    expect(seededVisits).toBe(3);
  });

  it("Integration #4: Raw-SQL UPDATE of visit_revision content is blocked by trigger", async () => {
    const rev = await prisma.visitRevision.findFirst();
    expect(rev).not.toBeNull();

    // Attempting raw SQL update on content column should throw
    await expect(
      prisma.$executeRaw`UPDATE visit_revision SET note = 'Tampered Note' WHERE visit_id = ${rev!.visitId}::uuid AND revision = ${rev!.revision}`
    ).rejects.toThrow(/visit_revision content columns are immutable/);

    await expect(
      prisma.$executeRaw`UPDATE visit_revision SET content_hash = 'badhash' WHERE visit_id = ${rev!.visitId}::uuid AND revision = ${rev!.revision}`
    ).rejects.toThrow(/visit_revision content columns are immutable/);
  });

  it("Integration #4: Raw-SQL UPDATE and DELETE of transition_audit is blocked by trigger", async () => {
    const audit = await prisma.transitionAudit.findFirst();
    expect(audit).not.toBeNull();

    // Attempting raw SQL update on transition_audit should throw
    await expect(
      prisma.$executeRaw`UPDATE transition_audit SET to_state = 'tampered' WHERE id = ${audit!.id}::uuid`
    ).rejects.toThrow(/transition_audit is append-only/);

    // Attempting raw SQL delete on transition_audit should throw
    await expect(
      prisma.$executeRaw`DELETE FROM transition_audit WHERE id = ${audit!.id}::uuid`
    ).rejects.toThrow(/transition_audit is append-only/);
  });

  it("Enforces visit state CHECK constraint in PostgreSQL", async () => {
    const ben = await prisma.beneficiary.findFirst();
    const worker = await prisma.actor.findFirst({ where: { role: "worker" } });
    const sup = await prisma.actor.findFirst({ where: { role: "supervisor" } });

    await expect(
      prisma.$executeRaw`INSERT INTO visit (id, organization_id, beneficiary_id, worker_id, supervisor_id, state, current_revision, updated_at)
        VALUES (gen_random_uuid(), ${ben!.organizationId}::uuid, ${ben!.id}::uuid, ${worker!.id}::uuid, ${sup!.id}::uuid, 'invalid_state', 1, now())`
    ).rejects.toThrow(/visit_state_check/);
  });

  it("Enforces actor role CHECK constraint in PostgreSQL", async () => {
    const org = await prisma.organization.findFirst();

    await expect(
      prisma.$executeRaw`INSERT INTO actor (id, organization_id, issuer, subject, role)
        VALUES (gen_random_uuid(), ${org!.id}::uuid, 'fixture', 'invalid-role-actor', 'admin')`
    ).rejects.toThrow(/actor_role_check/);
  });
});
