// Shared constants + math. Every frame is a pure function of time t (seek-safe, deterministic).
export const W = 1080, H = 1920, FPS = 30;
// the 9:16 frame holds a 3:2-ish illustrated panel, like the reference format
export const PW = 1080, PH = 740, PY = 588;

// "Lamplit Ink Cartoon" palette (the style sheet) + the neutrals the world needs
export const PAL = {
  ink: '#2B2724',        // Ink Brownblack — every line
  glass: '#1F2B52',      // Midnight Glass — only outside the window
  amber: '#F0B15A',      // Lamplight Amber — only light from a visible source
  mustard: '#C8952F',    // Mustard Beanie — the hero's beanie and nothing else
  moss: '#3E6A4C',       // Sofa Moss
  concrete: '#B3A996',   // Chalk Concrete
  cream: '#EFE6D3', paper: '#E7DCC4', face: '#FFFFFF',
  wall: '#7C8496', wallWarm: '#8E8A86', floor: '#7A5A40', wood: '#80603F', woodDark: '#5E4430',
  rug: '#B9AC93', tile: '#A9B3A8', water: '#7F98A6',
};

export const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const inv = (a, b, v) => clamp((v - a) / (b - a));
export const smooth = (t) => { t = clamp(t); return t * t * (3 - 2 * t); };
export const ease = {
  lin: (t) => clamp(t),
  inOut: (t) => { t = clamp(t); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; },
  out: (t) => 1 - Math.pow(1 - clamp(t), 3),
  in: (t) => Math.pow(clamp(t), 3),
  outBack: (t, s = 1.6) => { t = clamp(t); const c = s + 1; return 1 + c * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2); },
  sine: (t) => 0.5 - 0.5 * Math.cos(Math.PI * clamp(t)),
  outElastic: (t) => { t = clamp(t); if (t === 0 || t === 1) return t; return Math.pow(2, -9 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI) / 3.2) + 1; },
};

export function hash(a, b = 0) {
  let h = (Math.imul((a | 0) ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul((b | 0) + 0x632be5ab, 0xc2b2ae35)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x7feb352d); h = Math.imul(h ^ (h >>> 15), 0x846ca68b); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
export function rng(seed) {
  let a = (seed * 2654435761) >>> 0 || 1;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
/** smooth value noise in [-1, 1] */
export function noise1(x, seed = 0) {
  const i = Math.floor(x), f = x - i;
  return lerp(hash(i, seed), hash(i + 1, seed), f * f * (3 - 2 * f)) * 2 - 1;
}
export function noise2(x, y, seed = 0) {
  const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = hash(i + j * 7919, seed), b = hash(i + 1 + j * 7919, seed), c = hash(i + (j + 1) * 7919, seed), d = hash(i + 1 + (j + 1) * 7919, seed);
  return lerp(lerp(a, b, u), lerp(c, d, u), v) * 2 - 1;
}

// ---- colour ----
const cache = new Map();
export function rgb(hex) {
  if (cache.has(hex)) return cache.get(hex);
  const h = hex.replace('#', ''); const v = [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  cache.set(hex, v); return v;
}
export function mix(a, b, t) {
  const A = rgb(a), B = rgb(b);
  return '#' + A.map((v, i) => Math.round(lerp(v, B[i], clamp(t))).toString(16).padStart(2, '0')).join('');
}
export const shade = (hex, k) => (k < 0 ? mix(hex, '#141018', -k) : mix(hex, '#fff6e6', k));
export function rgba(hex, a) { const [r, g, b] = rgb(hex); return `rgba(${r},${g},${b},${a})`; }

// ---- scratch canvases (reused per key) ----
const pool = new Map();
export function scratch(key, w, h) {
  let c = pool.get(key);
  if (!c) { c = document.createElement('canvas'); pool.set(key, c); }
  if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
  const x = c.getContext('2d');
  x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; x.filter = 'none';
  return [c, x];
}

/** keyframe helper: k(t, [[t0, v0], [t1, v1], ...], easeFn) */
export function key(t, frames, fn = ease.inOut) {
  if (t <= frames[0][0]) return frames[0][1];
  for (let i = 1; i < frames.length; i++) {
    if (t <= frames[i][0]) {
      const [a, va] = frames[i - 1], [b, vb] = frames[i];
      const u = fn((t - a) / Math.max(1e-6, b - a));
      return Array.isArray(va) ? va.map((v, j) => lerp(v, vb[j], u)) : lerp(va, vb, u);
    }
  }
  return frames[frames.length - 1][1];
}
