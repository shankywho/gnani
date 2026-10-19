import { ExtractionProvider, ExtractionInput, ExtractionRawOutput } from "./provider.js";
import { ProposalIssue } from "@sakhiline/contracts";

function getCodePointSpan(fullText: string, matchedSubstring: string): [number, number] {
  const index = fullText.lastIndexOf(matchedSubstring);
  if (index === -1) {
    return [0, [...fullText].length];
  }
  const prefix = fullText.slice(0, index);
  const start = [...prefix].length;
  const length = [...matchedSubstring].length;
  return [start, start + length];
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/**
 * "27 October" -> ISO date. Year comes from the visit date; a month earlier than the visit
 * month means next year. Impossible calendar dates return null (caller abstains).
 */
function resolveDayMonth(day: number, monthWord: string, visitAt: string): string | null {
  const month = MONTHS.indexOf(monthWord.slice(0, 3).toLowerCase()) + 1;
  const visit = /^(\d{4})-(\d{2})/.exec(visitAt);
  if (!month || !visit) return null;
  let year = Number(visit[1]);
  if (month < Number(visit[2])) year += 1;
  const d = new Date(Date.UTC(year, month - 1, day));
  if (day < 1 || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) return null;
  return d.toISOString().slice(0, 10);
}

export class MockExtractionProvider implements ExtractionProvider {
  public readonly name = "regex-mock-v1";
  public readonly promptVersion = "2026-10-19";

  async extract(input: ExtractionInput): Promise<ExtractionRawOutput> {
    const text = input.transcript.trim();
    const issues: ProposalIssue[] = [];

    // Empty or blank transcript
    if (!text) {
      issues.push({
        field: "bloodPressure",
        code: "NO_SPEECH",
        clarificationKey: "ASK_BP_UNIT_OR_PAIR",
      });

      return {
        observations: {
          bloodPressure: { status: "not_mentioned" },
          hemoglobin: { status: "not_mentioned" },
          ttDose: { status: "not_mentioned" },
          followUpDate: { status: "not_mentioned" },
        },
        issues,
        model: {
          provider: "mock",
          name: this.name,
          promptVersion: this.promptVersion,
        },
      };
    }

    // 1. Blood Pressure Extraction
    let bpObservation: any = { status: "not_mentioned" };
    if (/(?:BP|blood pressure)\s*(?:nahi liya|nahi check kiya|nahi|nahin)/i.test(text)) {
      bpObservation = { status: "not_measured" };
    } else {
      // Regex for BP matches: (\d{2,3})\s*(by|\/|ऊपर)\s*(\d{2,3})
      // If multiple pairs exist (e.g. correction "110 nahi, 120 by 80"), take the last match
      const bpRegex = /(?<![\d/.-])(\d{2,3})\s*(by|\/|ऊपर)\s*(\d{2,3})(?![\d/.-])/gi;
      const bpMatches = [...text.matchAll(bpRegex)];
      if (bpMatches.length > 0) {
        const lastMatch = bpMatches[bpMatches.length - 1];
        if (lastMatch) {
          const sys = parseInt(lastMatch[1]!, 10);
          const dia = parseInt(lastMatch[3]!, 10);
          const span = getCodePointSpan(text, lastMatch[0]!);
          if (lastMatch[2] === "/" && sys <= 31 && dia <= 12) {
            // "27/10" reads as a calendar date as easily as a BP pair: abstain, ask the worker.
            bpObservation = { status: "unknown" };
            issues.push({ field: "bloodPressure", code: "CONFLICTING_READING", clarificationKey: "ASK_BP_UNIT_OR_PAIR" });
          } else bpObservation = {
            status: "recorded",
            systolic: sys,
            diastolic: dia,
            unit: "mmHg",
            source: {
              type: "transcript",
              span,
            },
          };
        }
      }
    }

    // 2. Hemoglobin Extraction
    let hbObservation: any = { status: "not_mentioned" };
    if (/(?:Hb|hemoglobin)\s*(?:nahi liya|nahi check kiya|nahi|nahin)/i.test(text)) {
      hbObservation = { status: "not_measured" };
    } else {
      const hbRegex = /(?:Hb|hemoglobin|HB)\s*(?:tha|hai|value|level)?\s*(\d{1,2}(?:\.\d{1,2})?)/gi;
      const hbMatches = [...text.matchAll(hbRegex)];
      if (hbMatches.length > 0) {
        const lastMatch = hbMatches[hbMatches.length - 1];
        if (lastMatch) {
          let valStr = lastMatch[1]!;
          if (!valStr.includes(".")) {
            valStr = `${valStr}.0`;
          }
          const span = getCodePointSpan(text, lastMatch[0]!);
          hbObservation = {
            status: "recorded",
            value: valStr,
            unit: "g/dL",
            source: {
              type: "transcript",
              span,
            },
          };
        }
      }
    }

    // 3. TT Dose Mention
    let ttObservation: any = { status: "not_mentioned" };
    if (/\bTT\b[^,.]{0,20}?\b(?:nahi|nahin)\b/i.test(text)) {
      ttObservation = { status: "not_measured" };
    } else {
      const ttRegex = /(?:TT|tt)\s*(?:ka\s*)?(?:doosra|pehla|first|second|1st|2nd)?\s*(?:injection|dose|teeka)/gi;
      const ttMatch = text.match(ttRegex);
      if (ttMatch) {
        const matchedStr = [...ttMatch[0]!.trim()].slice(0, 120).join("").trim();
        const span = getCodePointSpan(text, matchedStr);
        ttObservation = {
          status: "recorded",
          text: matchedStr,
          source: {
            type: "transcript",
            span,
          },
        };
      }
    }

    // 4. Follow-up Date
    let followUpObservation: any = { status: "not_mentioned" };
    if (/agle hafte|next week|agle mahine|next month|do hafte|few days/i.test(text)) {
      followUpObservation = { status: "unknown" };
      issues.push({
        field: "followUpDate",
        code: "AMBIGUOUS_DATE",
        clarificationKey: "ASK_FOLLOWUP_DATE",
      });
    } else {
      // Look for exact calendar date e.g. YYYY-MM-DD or "27 October"
      const isoDateMatch = text.match(/\b\d{4}-\d{2}-\d{2}\b/);
      if (isoDateMatch) {
        const span = getCodePointSpan(text, isoDateMatch[0]!);
        followUpObservation = {
          status: "recorded",
          date: isoDateMatch[0]!,
          source: {
            type: "transcript",
            span,
          },
        };
      } else {
        const dateWordsMatch = text.match(
          /(\d{1,2})\s*(January|Jan|February|Feb|March|Mar|April|Apr|May|June|Jun|July|Jul|August|Aug|September|Sept|Sep|October|Oct|November|Nov|December|Dec)\b/i
        );
        if (dateWordsMatch) {
          const span = getCodePointSpan(text, dateWordsMatch[0]!);
          const iso = resolveDayMonth(Number(dateWordsMatch[1]), dateWordsMatch[2]!, input.visitAt);
          if (iso) {
            followUpObservation = {
              status: "recorded",
              date: iso,
              source: { type: "transcript", span },
            };
          } else {
            followUpObservation = { status: "unknown" };
            issues.push({ field: "followUpDate", code: "AMBIGUOUS_DATE", clarificationKey: "ASK_FOLLOWUP_DATE" });
          }
        }
      }
    }

    return {
      observations: {
        bloodPressure: bpObservation,
        hemoglobin: hbObservation,
        ttDose: ttObservation,
        followUpDate: followUpObservation,
      },
      issues,
      model: {
        provider: "mock",
        name: this.name,
        promptVersion: this.promptVersion,
      },
    };
  }
}
