import { describe, it, expect } from "vitest";
import { FixtureVerifier } from "../../apps/api/src/auth/fixtureVerifier.js";
import { signSession, computeCsrfToken } from "../../apps/api/src/auth/session.js";

describe("auth: live mode rejects fixture verifier", () => {
  const fakePrisma = {
    actor: {
      findUnique: async () => ({
        id: "00000000-0000-0000-0000-000000000010",
        organizationId: "00000000-0000-0000-0000-000000000001",
        role: "worker",
        active: true,
      }),
    },
  } as any;

  it("strictly returns null in live mode even with valid fixture header", async () => {
    const liveVerifier = new FixtureVerifier(fakePrisma, "live", true);
    const actor = await liveVerifier.verify({
      headers: { "x-fixture-actor-id": "worker-a" },
      cookies: {},
    });
    expect(actor).toBeNull();
  });

  it("strictly returns null in live mode even with session cookie", async () => {
    const token = signSession({
      actorId: "00000000-0000-0000-0000-000000000010",
      organizationId: "00000000-0000-0000-0000-000000000001",
      role: "worker",
      csrfSecret: "test-secret",
    });

    const liveVerifier = new FixtureVerifier(fakePrisma, "live", true);
    const actor = await liveVerifier.verify({
      headers: {},
      cookies: { sakhi_session: token },
    });
    expect(actor).toBeNull();
  });

  it("resolves actor in local mode with fixture header", async () => {
    const localVerifier = new FixtureVerifier(fakePrisma, "local", true);
    const actor = await localVerifier.verify({
      headers: { "x-fixture-actor-id": "worker-a" },
      cookies: {},
    });
    expect(actor).toEqual({
      id: "00000000-0000-0000-0000-000000000010",
      organizationId: "00000000-0000-0000-0000-000000000001",
      role: "worker",
    });
  });

  it("ignores role spoof headers (e.g. x-role: supervisor)", async () => {
    const localVerifier = new FixtureVerifier(fakePrisma, "local", true);
    const actor = await localVerifier.verify({
      headers: {
        "x-fixture-actor-id": "worker-a",
        "x-role": "supervisor", // spoof attempt
      },
      cookies: {},
    });
    // DB role 'worker' is preserved, spoofed 'supervisor' is ignored
    expect(actor?.role).toBe("worker");
  });
});
