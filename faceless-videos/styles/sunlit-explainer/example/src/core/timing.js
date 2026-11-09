// Narration timing: sentence starts/ends from the TTS build (exact) + whisper word times.
// wt('war') → start of the first word matching after an optional time; S(i) / Se(i) sentence start / end.
export const T = { S: [], words: [], dur: 0 };
const norm = (x) => x.toLowerCase().replace(/[^a-z0-9]/g, '');

export async function loadTiming() {
  const s = await (await fetch('data/narration.sentences.json')).json();
  T.S = s.sentences; T.dur = s.duration;
  try { T.words = await (await fetch('data/words.json')).json(); } catch { T.words = []; }
  return T;
}
export const S = (i) => T.S[i].start;
export const Se = (i) => T.S[i].end;
/** start time of word (normalised match, prefix ok) at or after `after` seconds */
export function wt(word, after = 0, which = 's') {
  const n = norm(word);
  for (const x of T.words) if (x.s >= after - 0.05 && (norm(x.w) === n || norm(x.w).startsWith(n))) return x[which];
  throw new Error('word not found: ' + word + ' after ' + after);
}
