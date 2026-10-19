/**
 * Deterministic seeded pseudorandom number generator (Mulberry32).
 */
export function createMulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Applies transcript-level noise:
 * - "clean": returns original transcript
 * - "noise-a": 10% word dropout
 * - "noise-b": 25% word dropout + 5% adjacent-digit swap
 */
export function applyNoise(
  transcript: string,
  condition: "clean" | "noise-a" | "noise-b",
  seed: number
): string {
  if (condition === "clean") {
    return transcript;
  }

  const rng = createMulberry32(seed);

  // Split transcript into whitespace-separated tokens
  const words = transcript.split(/\s+/).filter(Boolean);
  if (words.length === 0) return transcript;

  const dropoutRate = condition === "noise-a" ? 0.1 : 0.25;

  const remainingWords: string[] = [];
  for (const word of words) {
    if (rng() >= dropoutRate) {
      remainingWords.push(word);
    }
  }

  // Ensure at least one word remains
  if (remainingWords.length === 0) {
    remainingWords.push(words[0]!);
  }

  if (condition === "noise-a") {
    return remainingWords.join(" ");
  }

  // noise-b: also apply 5% adjacent-digit swap
  const swappedWords = remainingWords.map((word) => {
    // Check if word contains at least 2 consecutive digits
    const chars = [...word];
    for (let i = 0; i < chars.length - 1; i++) {
      if (/\d/.test(chars[i]!) && /\d/.test(chars[i + 1]!)) {
        if (rng() < 0.05) {
          // Swap adjacent digits
          const tmp = chars[i]!;
          chars[i] = chars[i + 1]!;
          chars[i + 1] = tmp;
          i++; // Skip next index
        }
      }
    }
    return chars.join("");
  });

  return swappedWords.join(" ");
}
