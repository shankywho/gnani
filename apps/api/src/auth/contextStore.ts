import { randomUUID } from "node:crypto";
import { authEnv } from "./env.js";

export interface IdentityContextRecord {
  contextId: string;
  actorId: string;
  beneficiaryId: string;
  expiresAt: Date;
}

export class ContextStore {
  private store = new Map<string, IdentityContextRecord>();

  constructor(
    private readonly ttlSeconds: number = authEnv.CONTEXT_TTL_SECONDS,
    private readonly now: () => Date = () => new Date()
  ) {}

  create(actorId: string, beneficiaryId: string): { contextId: string; expiresAt: string } {
    const contextId = randomUUID();
    const expiresAt = new Date(this.now().getTime() + this.ttlSeconds * 1000);

    this.store.set(contextId, {
      contextId,
      actorId,
      beneficiaryId,
      expiresAt,
    });

    return {
      contextId,
      expiresAt: expiresAt.toISOString(),
    };
  }

  validate(contextId: string, actorId: string, beneficiaryId: string): boolean {
    const record = this.store.get(contextId);
    if (!record) return false;

    if (record.actorId !== actorId || record.beneficiaryId !== beneficiaryId) {
      return false;
    }

    if (this.now().getTime() > record.expiresAt.getTime()) {
      this.store.delete(contextId);
      return false;
    }

    return true;
  }
}
