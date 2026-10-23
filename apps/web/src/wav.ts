// Records microphone audio as 16 kHz mono PCM16 WAV. Gnani STT does not accept browser WebM,
// so we skip MediaRecorder and encode samples ourselves (no server-side conversion needed).
const RATE = 16000;

export interface WavRecorder {
  stop(): Promise<Blob>;
  cancel(): void;
}

export async function startWavRecording(): Promise<WavRecorder> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } });
  const ctx = new AudioContext({ sampleRate: RATE });
  const src = ctx.createMediaStreamSource(stream);
  // ponytail: ScriptProcessorNode is deprecated but universally supported; move to AudioWorklet if browsers drop it.
  const proc = ctx.createScriptProcessor(4096, 1, 1);
  const chunks: Float32Array[] = [];
  proc.onaudioprocess = (e) => chunks.push(new Float32Array(e.inputBuffer.getChannelData(0)));
  src.connect(proc);
  proc.connect(ctx.destination);

  const release = () => {
    proc.disconnect();
    src.disconnect();
    stream.getTracks().forEach((t) => t.stop());
    void ctx.close();
  };

  return {
    async stop() {
      release();
      return encodeWav(chunks, ctx.sampleRate);
    },
    cancel: release,
  };
}

function encodeWav(chunks: Float32Array[], rate: number): Blob {
  const samples = chunks.reduce((n, c) => n + c.length, 0);
  const buf = new DataView(new ArrayBuffer(44 + samples * 2));
  const str = (o: number, s: string) => [...s].forEach((ch, i) => buf.setUint8(o + i, ch.charCodeAt(0)));
  str(0, "RIFF"); buf.setUint32(4, 36 + samples * 2, true); str(8, "WAVE");
  str(12, "fmt "); buf.setUint32(16, 16, true); buf.setUint16(20, 1, true); buf.setUint16(22, 1, true);
  buf.setUint32(24, rate, true); buf.setUint32(28, rate * 2, true); buf.setUint16(32, 2, true); buf.setUint16(34, 16, true);
  str(36, "data"); buf.setUint32(40, samples * 2, true);
  let off = 44;
  for (const c of chunks) for (const s of c) { buf.setInt16(off, Math.max(-1, Math.min(1, s)) * 0x7fff, true); off += 2; }
  return new Blob([buf], { type: "audio/wav" });
}

export async function blobToBase64(b: Blob): Promise<string> {
  const bytes = new Uint8Array(await b.arrayBuffer());
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
