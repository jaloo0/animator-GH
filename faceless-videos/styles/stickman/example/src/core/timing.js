// Narration timing: data/lines.json (voice.py) + data/words.json (align.py). Shots are keyed to words, never to seconds.
export const T = { lines: [], words: [], dur: 0 };
export async function loadTiming() {
  const [l, w] = await Promise.all([fetch('data/lines.json').then((r) => r.json()), fetch('data/words.json').then((r) => r.json())]);
  T.lines = l.lines; T.words = w; T.dur = l.duration;
}
/** k-th word of line li → {s, e} (negative k counts from the end) */
export function wd(li, k = 0) {
  const ws = T.words.filter((x) => x.line === li); if (!ws.length) { const L = T.lines[li]; return { s: L.start, e: L.end }; }
  const x = ws[(k + ws.length) % ws.length]; return { s: x.s, e: x.e, w: x.w };
}
export const ln = (li) => T.lines[li];
/** a cut lands 3 frames before the words */
export const cut = (li, k = 0) => Math.max(0, wd(li, k).s - 3 / 24);
