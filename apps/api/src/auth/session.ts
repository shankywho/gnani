import { createHmac, timingSafeEqual } from "node:crypto";
import { authEnv } from "./env.js";

export interface SessionPayload {
  actorId: string;
  organizationId: string;
  role: "worker" | "supervisor";
  csrfSecret: string;
}

export function signSession(payload: SessionPayload, secret = authEnv.SESSION_SECRET): string {
  const json = JSON.stringify(payload);
  const dataB64 = Buffer.from(json, "utf8").toString("base64url");
  const signature = createHmac("sha256", secret).update(dataB64).digest("base64url");
  return `${dataB64}.${signature}`;
}

export function verifySession(rawToken: string, secret = authEnv.SESSION_SECRET): SessionPayload | null {
  try {
    const [dataB64, signature] = rawToken.split(".");
    if (!dataB64 || !signature) return null;

    const expectedSig = createHmac("sha256", secret).update(dataB64).digest("base64url");
    if (
      signature.length !== expectedSig.length ||
      !timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))
    ) {
      return null;
    }

    const json = Buffer.from(dataB64, "base64url").toString("utf8");
    const parsed = JSON.parse(json) as SessionPayload;
    if (!parsed.actorId || !parsed.organizationId || !parsed.role || !parsed.csrfSecret) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function computeCsrfToken(csrfSecret: string, secret = authEnv.SESSION_SECRET): string {
  return createHmac("sha256", secret).update(`csrf:${csrfSecret}`).digest("hex");
}
