// Shared constants + small helpers. Aspect comes from ?ar=9x16 (vertical) — default 16:9 with 2:1 cinema bars.
export const Q = new URLSearchParams(location.search);
export const PORTRAIT = Q.get('ar') === '9x16';
export const W = PORTRAIT ? 1080 : 1920, H = PORTRAIT ? 1920 : 1080;
export const FPS = 24;                       // animated on ones: a new pose every frame, no motion blur
export const BAR = PORTRAIT ? 0 : 60;        // 1920x960 picture between black bars
export const PIC = { x: 0, y: BAR, w: W, h: H - 2 * BAR };
export const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const inv = (a, b, v) => clamp((v - a) / (b - a));
export const eio = (t) => (t = clamp(t), t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const eo = (t) => 1 - Math.pow(1 - clamp(t), 3);
export const ei = (t) => Math.pow(clamp(t), 3);
export const eback = (t) => { t = clamp(t); const c = 1.9; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
export const TAU = Math.PI * 2;
export function rng(seed = 1) { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
export function hash(n) { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
const SCR = new Map();
export function scratch(name, w = W, h = H) {
  let c = SCR.get(name);
  if (!c || c.width !== w || c.height !== h) { c = document.createElement('canvas'); c.width = w; c.height = h; SCR.set(name, c); }
  const x = c.getContext('2d'); x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; x.filter = 'none'; x.clearRect(0, 0, w, h);
  return [c, x];
}
// shapes
export function rr(c, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
export function poly(c, pts) { c.beginPath(); c.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]); c.closePath(); }
export function circ(c, x, y, r) { c.beginPath(); c.arc(x, y, Math.max(0.01, r), 0, TAU); }
export function fillR(c, col, x, y, w, h) { c.fillStyle = col; c.fillRect(x, y, w, h); }
export function vgrad(c, x, y0, y1, stops) { const g = c.createLinearGradient(x, y0, x, y1); stops.forEach(([o, col]) => g.addColorStop(o, col)); return g; }
export function rgrad(c, x, y, r0, r1, stops) { const g = c.createRadialGradient(x, y, r0, x, y, r1); stops.forEach(([o, col]) => g.addColorStop(o, col)); return g; }
export function mixc(a, b, t) {
  const p = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const A = p(a), B = p(b); return '#' + A.map((v, i) => Math.round(lerp(v, B[i], clamp(t))).toString(16).padStart(2, '0')).join('');
}
// palette (style-sheet.png)
export const PAL = {
  ink: '#0e1016', rust: '#d2622a', rustHi: '#ec8a4f', amber: '#f2b266', beige: '#cdbfa8', sage: '#7e9a86',
  navy: '#1b2234', moon: '#5c7ba6', zomb: '#8a957f', zombD: '#5d6857', red: '#c8372d', cream: '#efe6d6',
};
