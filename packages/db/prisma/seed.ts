import { getPrismaClient } from "../src/client.js";
import { contentHash } from "@sakhiline/contracts";

const ORG_ID = "00000000-0000-0000-0000-000000000001";
const WORKER_A_ID = "00000000-0000-0000-0000-000000000010";
const WORKER_B_ID = "00000000-0000-0000-0000-000000000011";
const SUP_A_ID = "00000000-0000-0000-0000-000000000020";
const SUP_B_ID = "00000000-0000-0000-0000-000000000021";

export async function seed(prisma = getPrismaClient()) {
  // 1. Organization
  await prisma.organization.upsert({
    where: { id: ORG_ID },
    update: { label: "Demo Org (synthetic)" },
    create: { id: ORG_ID, label: "Demo Org (synthetic)" },
  });

  // 2. Actors
  const actors = [
    { id: WORKER_A_ID, issuer: "fixture", subject: "worker-a", role: "worker" },
    { id: WORKER_B_ID, issuer: "fixture", subject: "worker-b", role: "worker" },
    { id: SUP_A_ID, issuer: "fixture", subject: "sup-a", role: "supervisor" },
    { id: SUP_B_ID, issuer: "fixture", subject: "sup-b", role: "supervisor" },
  ];

  for (const a of actors) {
    await prisma.actor.upsert({
      where: { issuer_subject: { issuer: a.issuer, subject: a.subject } },
      update: { organizationId: ORG_ID, role: a.role, active: true },
      create: {
        id: a.id,
        organizationId: ORG_ID,
        issuer: a.issuer,
        subject: a.subject,
        role: a.role,
        active: true,
      },
    });
  }

  // 3. Beneficiaries (SYN-0001 through SYN-0008)
  // Two with displayName "Sunita" (SYN-0001 and SYN-0002)
  const beneficiaries = [
    { id: "00000000-0000-0000-0000-000000000101", ref: "SYN-0001", name: "Sunita" },
    { id: "00000000-0000-0000-0000-000000000102", ref: "SYN-0002", name: "Sunita" },
    { id: "00000000-0000-0000-0000-000000000103", ref: "SYN-0003", name: "Pooja Devi" },
    { id: "00000000-0000-0000-0000-000000000104", ref: "SYN-0004", name: "Anita Sharma" },
    { id: "00000000-0000-0000-0000-000000000105", ref: "SYN-0005", name: "Kavita Devi" },
    { id: "00000000-0000-0000-0000-000000000106", ref: "SYN-0006", name: "Rekha Kumari" },
    { id: "00000000-0000-0000-0000-000000000107", ref: "SYN-0007", name: "Meena Devi" },
    { id: "00000000-0000-0000-0000-000000000108", ref: "SYN-0008", name: "Geeta Devi" },
  ];

  for (const b of beneficiaries) {
    await prisma.beneficiary.upsert({
      where: {
        organizationId_reference: {
          organizationId: ORG_ID,
          reference: b.ref,
        },
      },
      update: { displayName: b.name },
      create: {
        id: b.id,
        organizationId: ORG_ID,
        reference: b.ref,
        displayName: b.name,
      },
    });
  }

  // 4. Assignments
  // SYN-0001 to SYN-0006 assigned to worker-a <-> sup-a
  // SYN-0007 and SYN-0008 assigned ONLY to worker-b <-> sup-b
  for (let i = 1; i <= 8; i++) {
    const benId = `00000000-0000-0000-0000-00000000010${i}`;
    const assignId = `00000000-0000-0000-0000-00000000020${i}`;
    const isWorkerB = i >= 7;
    const workerId = isWorkerB ? WORKER_B_ID : WORKER_A_ID;
    const supervisorId = isWorkerB ? SUP_B_ID : SUP_A_ID;

    await prisma.assignment.upsert({
      where: { id: assignId },
      update: {
        organizationId: ORG_ID,
        beneficiaryId: benId,
        workerId,
        supervisorId,
        active: true,
      },
      create: {
        id: assignId,
        organizationId: ORG_ID,
        beneficiaryId: benId,
        workerId,
        supervisorId,
        active: true,
      },
    });
  }

  // 5. 3 Approved historical visits for SYN-0001
  const historicalVisits = [
    {
      id: "00000000-0000-0000-0000-000000001001",
      visitAt: "2026-07-15T09:30:00+05:30",
      hb: "11.0",
      bpSys: 110,
      bpDia: 70,
      note: "First trimester baseline registration",
    },
    {
      id: "00000000-0000-0000-0000-000000001002",
      visitAt: "2026-08-18T10:00:00+05:30",
      hb: "10.8",
      bpSys: 112,
      bpDia: 72,
      note: "Routine ANC checkup",
    },
    {
      id: "00000000-0000-0000-0000-000000001003",
      visitAt: "2026-09-20T10:30:00+05:30",
      hb: "10.5",
      bpSys: 110,
      bpDia: 70,
      note: "Third ANC checkup, Hb slightly decreased",
    },
  ];

  const syn1Id = "00000000-0000-0000-0000-000000000101";

  for (const hv of historicalVisits) {
    const content = {
      visitAt: hv.visitAt,
      visitTimezone: "Asia/Kolkata",
      observations: {
        bloodPressure: {
          status: "recorded" as const,
          systolic: hv.bpSys,
          diastolic: hv.bpDia,
          unit: "mmHg" as const,
          source: { type: "manual" as const },
        },
        hemoglobin: {
          status: "recorded" as const,
          value: hv.hb,
          unit: "g/dL" as const,
          source: { type: "manual" as const },
        },
        ttDose: { status: "not_measured" as const },
        followUpDate: { status: "not_mentioned" as const },
      },
      note: hv.note,
      unresolvedAcknowledged: [],
    };

    const hash = contentHash(content);

    // Upsert Visit
    await prisma.visit.upsert({
      where: { id: hv.id },
      update: {
        state: "approved",
        currentRevision: 1,
        confirmedRevision: 1,
      },
      create: {
        id: hv.id,
        organizationId: ORG_ID,
        beneficiaryId: syn1Id,
        workerId: WORKER_A_ID,
        supervisorId: SUP_A_ID,
        state: "approved",
        currentRevision: 1,
        confirmedRevision: 1,
      },
    });

    // Upsert Revision 1
    const existingRev = await prisma.visitRevision.findUnique({
      where: { visitId_revision: { visitId: hv.id, revision: 1 } },
    });

    if (!existingRev) {
      await prisma.visitRevision.create({
        data: {
          visitId: hv.id,
          revision: 1,
          visitAt: new Date(hv.visitAt),
          visitTimezone: "Asia/Kolkata",
          observations: content.observations,
          note: hv.note,
          contentHash: hash,
          createdBy: WORKER_A_ID,
          confirmedBy: WORKER_A_ID,
          confirmedAt: new Date(hv.visitAt),
        },
      });
    }

    // Upsert transition audit row
    const existingAudit = await prisma.transitionAudit.findFirst({
      where: { visitId: hv.id, toState: "approved" },
    });
    if (!existingAudit) {
      await prisma.transitionAudit.create({
        data: {
          visitId: hv.id,
          revision: 1,
          actorId: SUP_A_ID,
          fromState: "submitted",
          toState: "approved",
          requestId: `seed-${hv.id}`,
        },
      });
    }
  }
}

if (process.argv[1]?.endsWith("seed.ts")) {
  seed()
    .then(async () => {
      console.log("Database seeded successfully.");
      await getPrismaClient().$disconnect();
    })
    .catch(async (e) => {
      console.error(e);
      await getPrismaClient().$disconnect();
      process.exit(1);
    });
}
