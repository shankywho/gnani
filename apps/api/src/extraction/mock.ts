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
      const bpRegex = /(\d{2,3})\s*(?:by|\/|ऊपर)\s*(\d{2,3})/gi;
      const bpMatches = [...text.matchAll(bpRegex)];
      if (bpMatches.length > 0) {
        const lastMatch = bpMatches[bpMatches.length - 1];
        if (lastMatch) {
          const sys = parseInt(lastMatch[1]!, 10);
          const dia = parseInt(lastMatch[2]!, 10);
          const span = getCodePointSpan(text, lastMatch[0]!);
          bpObservation = {
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
    if (/(?:TT|tt)\s*(?:nahi|nahin)/i.test(text)) {
      ttObservation = { status: "not_measured" };
    } else {
      const ttRegex = /(?:TT|tt)\s*(?:ka\s*)?(?:doosra|pehla|first|second|1st|2nd)?\s*(?:injection|dose|teeka)[^,.]*/gi;
      const ttMatch = text.match(ttRegex);
      if (ttMatch) {
        const matchedStr = ttMatch[0]!.trim();
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
        const dateWordsMatch = text.match(/(\d{1,2})\s*(?:October|Oct|November|Nov|December|Dec|January|Jan)/i);
        if (dateWordsMatch) {
          const span = getCodePointSpan(text, dateWordsMatch[0]!);
          // Normalized ISO date for October 2026
          const day = dateWordsMatch[1]!.padStart(2, "0");
          followUpObservation = {
            status: "recorded",
            date: `2026-10-${day}`,
            source: {
              type: "transcript",
              span,
            },
          };
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
