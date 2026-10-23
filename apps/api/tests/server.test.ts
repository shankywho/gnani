import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { getPrismaClient, seed, PrismaClient } from "@sakhiline/db";
import { createStubStageClip, createStubTranscribe } from "../test-helpers/stubs.js";
import { createApp } from "../src/server.js";

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
    expect(session.body.actor.role).toBe("worker");

    const roster = await agent.get("/api/v1/beneficiaries");
    expect(roster.status).toBe(200);

    const noCsrf = await agent.post("/api/v1/session/logout");
    expect(noCsrf.status).toBe(403);
    const withCsrf = await agent.post("/api/v1/session/logout").set("x-csrf-token", csrf);
    expect(withCsrf.status).toBe(204);
  });
});
