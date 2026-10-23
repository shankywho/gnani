// Thin client for the SakhiLine API. The server is the authority; this only carries the session's CSRF token.
export type FieldKey = "bloodPressure" | "hemoglobin" | "ttDose" | "followUpDate";
export const FIELD_KEYS: FieldKey[] = ["bloodPressure", "hemoglobin", "ttDose", "followUpDate"];

export type Source = { type: "transcript"; span: [number, number] } | { type: "manual" };
type Missing = { status: "not_measured" } | { status: "unknown" } | { status: "not_mentioned" };
export type Observations = {
  bloodPressure: { status: "recorded"; systolic: number; diastolic: number; unit: "mmHg"; source: Source } | Missing;
  hemoglobin: { status: "recorded"; value: string; unit: "g/dL"; source: Source } | Missing;
  ttDose: { status: "recorded"; text: string; source: Source } | Missing;
  followUpDate: { status: "recorded"; date: string; source: Source } | Missing;
};
export type Actor = { id: string; organizationId: string; role: "worker" | "supervisor" };
export type Beneficiary = { id: string; reference: string; displayName: string };
export type Revision = {
  revision: number;
  visitAt: string;
  visitTimezone: string;
  observations: Observations;
  note: string | null;
  transcript: string | null;
  contentHash: string;
  confirmedAt: string | null;
};
export type VisitState = "draft" | "submitted" | "returned" | "approved";
export type VisitView = {
  id: string;
  beneficiaryId: string;
  state: VisitState;
  currentRevision: number;
  confirmedRevision: number | null;
  currentRevisionData: Revision | null;
  allowedActions?: string[];
  latestReturnReason?: string | null; // shown once the API exposes it
};
export type Issue = { field: FieldKey; code: string; clarificationKey: string };
export type Proposal = { proposalId: string; baseRevision: number; transcript: string; observations: Observations; issues: Issue[] };

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

let csrfToken: string | null = null;

export async function api<T>(method: string, path: string, opts: { body?: unknown; headers?: Record<string, string> } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api/v1${path}`, {
      method,
      credentials: "same-origin",
      headers: {
        ...(opts.body !== undefined ? { "content-type": "application/json" } : {}),
        ...(csrfToken && method !== "GET" ? { "x-csrf-token": csrfToken } : {}),
        ...opts.headers,
      },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
  } catch {
    throw new ApiError(0, "NETWORK", "No connection to the server. Your edits are kept on this page; try again when you are online.");
  }
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, data?.error?.code ?? "UNKNOWN", data?.error?.message ?? `Request failed (${res.status})`);
  return data as T;
}

export async function loadSession(): Promise<Actor | null> {
  try {
    const s = await api<{ actor: Actor; csrfToken: string }>("GET", "/session");
    csrfToken = s.csrfToken;
    return s.actor;
  } catch {
    return null;
  }
}

export async function fixtureLogin(actorId: string): Promise<Actor> {
  const s = await api<{ actor: Actor; csrfToken: string }>("POST", "/session/fixture-login", { body: { actorId } });
  csrfToken = s.csrfToken;
  return s.actor;
}

export async function logout() {
  await api("POST", "/session/logout").catch(() => {});
  csrfToken = null;
}

export const ifMatch = (visitId: string, revision: number) => ({ "If-Match": `"visit:${visitId}:${revision}"` });
export const newIdempotencyKey = () => `web-${crypto.randomUUID()}`;
