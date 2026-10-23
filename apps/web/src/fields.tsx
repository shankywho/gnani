import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Actor, FieldKey, FIELD_KEYS, Observations, loadSession } from "./api";

export const FIELD_LABEL: Record<FieldKey, string> = {
  bloodPressure: "Blood pressure",
  hemoglobin: "Hemoglobin",
  ttDose: "TT injection",
  followUpDate: "Follow-up date",
};

// Status is always spelled out, never colour alone.
export const STATUS_LABEL = {
  recorded: "Recorded",
  not_measured: "Not measured",
  unknown: "Unclear",
  not_mentioned: "Not mentioned",
} as const;

export function fieldValue(obs: Observations, key: FieldKey): string {
  const o = obs[key];
  if (o.status !== "recorded") return STATUS_LABEL[o.status];
  switch (key) {
    case "bloodPressure": { const b = obs.bloodPressure as Extract<Observations["bloodPressure"], { status: "recorded" }>; return `${b.systolic}/${b.diastolic} mmHg`; }
    case "hemoglobin": return `${(obs.hemoglobin as { value: string }).value} g/dL`;
    case "ttDose": return `“${(obs.ttDose as { text: string }).text}”`;
    case "followUpDate": return new Date(`${(obs.followUpDate as { date: string }).date}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
  }
}

export function ObservationList({ obs, caption }: { obs: Observations; caption?: string }) {
  return (
    <dl className="obs" aria-label={caption}>
      {FIELD_KEYS.map((k) => (
        <div key={k} className={`obs-row status-${obs[k].status}`}>
          <dt>{FIELD_LABEL[k]}</dt>
          <dd>{fieldValue(obs, k)}</dd>
        </div>
      ))}
    </dl>
  );
}

export const formatVisitTime = (iso: string, tz: string) =>
  new Date(iso).toLocaleString(undefined, { timeZone: tz, day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });

/** Loads the session; sends signed-out or wrong-role users to sign-in. */
export function useActor(role?: Actor["role"]): Actor | null {
  const [actor, setActor] = useState<Actor | null>(null);
  const navigate = useNavigate();
  useEffect(() => {
    loadSession().then((a) => {
      if (!a || (role && a.role !== role)) navigate("/sign-in", { replace: true });
      else setActor(a);
    });
  }, [navigate, role]);
  return actor;
}
