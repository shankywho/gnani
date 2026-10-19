import { StageClip, TranscribeClip, SttResult } from "@sakhiline/contracts";

export function createStubStageClip(onCleanup?: () => void): StageClip {
  return async (upload) => ({
    path: "/tmp/mock-audio.wav",
    mimeType: upload.mimeType,
    seconds: 10,
    cleanup: async () => {
      if (onCleanup) onCleanup();
    },
  });
}

export function createStubTranscribe(
  outcome: SttResult = {
    ok: true,
    transcript: "Sunita ka BP check kiya, 110 by 70, Hb 9 tha, TT ka doosra injection due hai agle hafte.",
    latencyMs: 150,
    mode: "mock",
  }
): TranscribeClip {
  return async () => outcome;
}
