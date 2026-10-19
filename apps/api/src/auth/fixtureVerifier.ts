import { Actor, IdentityVerifier } from "@sakhiline/contracts";
import { PrismaClient } from "@sakhiline/db";
import { authEnv } from "./env.js";
import { verifySession } from "./session.js";

export class FixtureVerifier implements IdentityVerifier {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly appMode: "local" | "live" = authEnv.APP_MODE,
    private readonly fixtureAuthEnabled: boolean = authEnv.FIXTURE_AUTH
  ) {}

  async verify(req: {
    headers: Record<string, string | undefined>;
    cookies: Record<string, string | undefined>;
  }): Promise<Actor | null> {
    // SAKHILINE_BUILD.md §2 A-2, §13: Remote/live mode must strictly reject fixture verifier
    if (this.appMode === "live") {
      return null;
    }

    if (!this.fixtureAuthEnabled) {
      return null;
    }

    // 1. Check session cookie
    const cookieToken = req.cookies["sakhi_session"];
    if (cookieToken) {
      const payload = verifySession(cookieToken);
      if (payload) {
        const actor = await this.prisma.actor.findUnique({
          where: { id: payload.actorId },
        });
        if (actor && actor.active && actor.organizationId === payload.organizationId) {
          return {
            id: actor.id,
            organizationId: actor.organizationId,
            role: actor.role as "worker" | "supervisor",
          };
        }
      }
    }

    // 2. Check fixture header: x-fixture-actor-id (local test double only)
    // Never trust client role spoof headers (e.g. x-role, x-org-id)
    const fixtureActorId = req.headers["x-fixture-actor-id"];
    if (fixtureActorId) {
      // Find actor by subject or id
      let actor = await this.prisma.actor.findUnique({
        where: { id: fixtureActorId },
      });
      if (!actor) {
        actor = await this.prisma.actor.findUnique({
          where: {
            issuer_subject: { issuer: "fixture", subject: fixtureActorId },
          },
        });
      }
      if (actor && actor.active) {
        return {
          id: actor.id,
          organizationId: actor.organizationId,
          role: actor.role as "worker" | "supervisor",
        };
      }
    }

    return null;
  }
}
