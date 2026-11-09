// Narration timing: sentence starts/ends from the TTS build (exact), word offsets from whisper (re-anchored to the sentence).
export const T = { S: [], words: [], dur: 0 };
const norm = (x) => x.toLowerCase().replace(/[^a-z0-9]/g, '');

export async function loadTiming() {
  const s = await (await fetch('data/narration.sentences.json')).json();
  T.S = s.sentences; T.dur = s.duration;
  try { T.words = await (await fetch('data/words.json')).json(); } catch { T.words = []; }
  // re-anchor: whisper word times drift early; keep their spacing inside each sentence but pin the first word to the sentence start
  let wi = 0;
  for (const sen of T.S) {
    const toks = sen.text.split(/\s+/).map(norm).filter(Boolean);
    let k = wi; while (k < T.words.length && norm(T.words[k].w) !== toks[0]) k++;
    if (k >= T.words.length) { sen.words = []; continue; }
    const off = sen.start - T.words[k].s; sen.words = [];
    for (let j = 0; j < toks.length && k + j < T.words.length; j++) {
      const w = T.words[k + j];
      sen.words.push({ w: w.w, s: Math.min(sen.end, Math.max(sen.start, w.s + off)), e: Math.min(sen.end, w.e + off) });
    }
    wi = k + toks.length;
  }
  return T;
}
export const s = (i) => T.S[i].start;
export const e = (i) => T.S[i].end;
/** time of word `word` inside sentence i (first match), or the sentence start */
export function w(i, word) {
  const t = norm(word);
  for (const x of T.S[i].words || []) if (norm(x.w) === t) return x.s;
  return T.S[i].start;
}
