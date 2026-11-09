// Narration timing: sentence starts/ends from the TTS build, word times from whisper.
export const T = { S: [], words: [], dur: 0 };
export async function loadTiming() {
  const s = await (await fetch('data/narration.sentences.json')).json();
  T.S = s.sentences; T.dur = s.duration;
  try { T.words = await (await fetch('data/words.json')).json(); } catch { T.words = []; }
  return T;
}
export const s = (i) => T.S[i].start;
export const e = (i) => T.S[i].end;
/** time of the first word matching w (case/punct-insensitive) at or after time t0 */
export function w(word, t0 = 0, fallback = null) {
  const norm = (x) => x.toLowerCase().replace(/[^a-z0-9%-]/g, '');
  const target = norm(word);
  for (const x of T.words) if (x.s >= t0 - 0.05 && norm(x.w) === target) return x.s;
  return fallback ?? t0;
}
