import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { getPrismaClient, seed, PrismaClient } from "@sakhiline/db";
import { createStubStageClip, createStubTranscribe } from "../test-helpers/stubs.js";
import { createApp } from "../src/server.js";
import { stageClip } from "../src/media/stage.js";
import { mockTranscribe } from "../src/providers/gnani.js";

describe("server.ts composition (J2)", () => {
  let prisma: PrismaClient;
  let app: ReturnType<typeof createApp>;

  beforeAll(async () => {
    prisma = getPrismaClient();
    await seed(prisma);
    app = createApp({ prisma, transcribe: createStubTranscribe(), stageClip: createStubStageClip() });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("health checks the database without auth", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });

  it("unknown API path returns the error envelope", async () => {
    const res = await request(app).get("/api/v1/nope").set("x-request-id", "req-test-1");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: { code: "NOT_FOUND", message: "Resource not found" }, requestId: "req-test-1" });
    // Visit ETags only track revision; caching would hide confirm/submit/review changes.
    expect(res.headers["cache-control"]).toBe("no-store");
  });

  it("malformed JSON is a 400 envelope, not a 500", async () => {
    const res = await request(app).post("/api/v1/session/fixture-login").set("content-type", "application/json").send("{bad");
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION");
  });

  it("session → roster → CSRF-guarded mutation works end to end", async () => {
    const agent = request.agent(app);
    // worker-a by UUID: seed keys like "worker-a" currently 500 (non-UUID hits a uuid column).
    const login = await agent.post("/api/v1/session/fixture-login").send({ actorId: "00000000-0000-0000-0000-000000000010" });
    expect(login.status).toBe(200);
    const csrf = login.body.csrfToken as string;

    const session = await agent.get("/api/v1/session");
    const again = await agent.get("/api/v1/session").set("If-None-Match", session.headers.etag ?? "*");
    expect(again.status).toBe(200); // conditional GETs are ignored on /api
    expect(session.body.actor.role).toBe("worker");

    const roster = await agent.get("/api/v1/beneficiaries");
    expect(roster.status).toBe(200);

    const noCsrf = await agent.post("/api/v1/session/logout");
    expect(noCsrf.status).toBe(403);
    const withCsrf = await agent.post("/api/v1/session/logout").set("x-csrf-token", csrf);
    expect(withCsrf.status).toBe(204);
  });

  it("real WAV staging + mock STT → proposal through the running app (J3)", async () => {
    const real = createApp({ prisma, transcribe: mockTranscribe, stageClip, sttMode: "mock" });
    expect((await request(real).get("/health")).body.stt).toBe("mock");

    const agent = request.agent(real);
    const login = await agent.post("/api/v1/session/fixture-login").send({ actorId: "00000000-0000-0000-0000-000000000010" });
    const csrf = login.body.csrfToken as string;
    const ctx = await agent.post("/api/v1/beneficiaries/00000000-0000-0000-0000-000000000101/context").set("x-csrf-token", csrf);
    expect(ctx.status).toBe(200);
    const visit = await agent
      .post("/api/v1/visits")
      .set("x-csrf-token", csrf)
      .set("Idempotency-Key", `j3-smoke-${Date.now()}`)
      .send({ contextId: ctx.body.contextId, visitAt: "2026-10-19T10:00:00+05:30", visitTimezone: "Asia/Kolkata" });
    expect(visit.status).toBe(201);
    const visitId = visit.body.visit.id as string;

    // 1s of silent 16 kHz mono PCM16 WAV
    const data = 32000, wav = Buffer.alloc(44 + data);
    wav.write("RIFF", 0); wav.writeUInt32LE(36 + data, 4); wav.write("WAVE", 8); wav.write("fmt ", 12);
    wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22); wav.writeUInt32LE(16000, 24);
    wav.writeUInt32LE(32000, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write("data", 36); wav.writeUInt32LE(data, 40);

    const ok = await agent.post(`/api/v1/visits/${visitId}/extractions`).set("x-csrf-token", csrf)
      .send({ audio: wav.toString("base64"), mimeType: "audio/wav" });
    expect(ok.status).toBe(200);
    expect(ok.body.proposal.observations.bloodPressure).toMatchObject({ status: "recorded" });
    expect(ok.body.proposal.observations.followUpDate).toMatchObject({ status: "unknown" });

    const webm = await agent.post(`/api/v1/visits/${visitId}/extractions`).set("x-csrf-token", csrf)
      .send({ audio: Buffer.from("not audio").toString("base64"), mimeType: "audio/webm" });
    expect(webm.status).toBe(415);
    expect(webm.body.error.code).toBe("UNSUPPORTED_MEDIA");
  });
});
