import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { getPrismaClient, seed, PrismaClient } from "@sakhiline/db";
import { createTestApp } from "../helpers/testApp.js";
import { ContextStore } from "../../apps/api/src/auth/contextStore.js";

const WORKER_A = "00000000-0000-0000-0000-000000000010";
const SYN_0001 = "00000000-0000-0000-0000-000000000101";

describe("Audit hardening regressions", () => {
  let prisma: PrismaClient;
  let app: any;

  beforeAll(async () => {
    prisma = getPrismaClient();
    await seed(prisma);
    app = createTestApp({ prisma, contextStore: new ContextStore(600) });
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });

  async function context() {
    const r = await request(app).post(`/api/v1/beneficiaries/${SYN_0001}/context`).set("x-fixture-actor-id", WORKER_A).send({});
    return r.body.contextId as string;
  }
  const body = (contextId: string) => ({ contextId, visitAt: "2026-10-19T10:00:00+05:30", visitTimezone: "Asia/Kolkata" });

  it("POST /visits requires Idempotency-Key", async () => {
    const res = await request(app).post("/api/v1/visits").set("x-fixture-actor-id", WORKER_A).send(body(await context()));
    expect(res.status).toBe(400);
  });

  it("POST /visits replays on same key+body (one visit), conflicts on changed body", async () => {
    const key = `create-${crypto.randomUUID()}`;
    const ctx = await context();
    const send = (b: object) => request(app).post("/api/v1/visits").set("x-fixture-actor-id", WORKER_A).set("Idempotency-Key", key).send(b);
    const results = await Promise.all([send(body(ctx)), send(body(ctx)), send(body(ctx))]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 200, 201]);
    expect(new Set(results.map((r) => r.body.visit.id)).size).toBe(1);
    const conflict = await send({ ...body(ctx), visitTimezone: "UTC" });
    expect(conflict.status).toBe(409);
    expect(conflict.body.error.code).toBe("IDEMPOTENCY_CONFLICT");
  });

  it("a proposal cannot be accepted on a different visit", async () => {
    const mk = async () => {
      const r = await request(app).post("/api/v1/visits").set("x-fixture-actor-id", WORKER_A).set("Idempotency-Key", `create-${crypto.randomUUID()}`).send(body(await context()));
      return r.body.visit.id as string;
    };
    const v1 = await mk();
    const v2 = await mk();
    const ex = await request(app)
      .post(`/api/v1/visits/${v1}/extractions`)
      .set("x-fixture-actor-id", WORKER_A)
      .send({ audio: Buffer.from("a").toString("base64"), mimeType: "audio/wav" });
    expect(ex.status).toBe(200);
    const accept = await request(app)
      .post(`/api/v1/visits/${v2}/proposals/${ex.body.proposal.proposalId}/accept`)
      .set("x-fixture-actor-id", WORKER_A)
      .set("If-Match", `"visit:${v2}:1"`)
      .send({ fields: ["bloodPressure"] });
    expect(accept.status).toBe(404);
  });

  it("extraction without audio is rejected (no fake default clip)", async () => {
    const r = await request(app).post("/api/v1/visits").set("x-fixture-actor-id", WORKER_A).set("Idempotency-Key", `create-${crypto.randomUUID()}`).send(body(await context()));
    const res = await request(app).post(`/api/v1/visits/${r.body.visit.id}/extractions`).set("x-fixture-actor-id", WORKER_A).send({});
    expect(res.status).toBe(400);
  });

  it("submit with If-Match different from body revision is rejected as stale", async () => {
    const r = await request(app).post("/api/v1/visits").set("x-fixture-actor-id", WORKER_A).set("Idempotency-Key", `create-${crypto.randomUUID()}`).send(body(await context()));
    const id = r.body.visit.id;
    const res = await request(app)
      .post(`/api/v1/visits/${id}/submit`)
      .set("x-fixture-actor-id", WORKER_A)
      .set("If-Match", `"visit:${id}:1"`)
      .set("Idempotency-Key", `submit-${crypto.randomUUID()}`)
      .send({ revision: 2 });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("STALE_REVISION");
  });
});
