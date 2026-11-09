// Small animation kit: easing, keyframes, camera paths, hand-held drift, deterministic randomness.
import * as THREE from 'three';

export const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const sstep = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0)); return t * t * (3 - 2 * t); };
export const E = {
  lin: (t) => t,
  in: (t) => t * t * t,
  out: (t) => 1 - (1 - t) ** 3,
  io: (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2),
  io2: (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2),
  expo: (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? 2 ** (20 * t - 10) / 2 : (2 - 2 ** (-20 * t + 10)) / 2),
  outExpo: (t) => (t >= 1 ? 1 : 1 - 2 ** (-10 * t)),
  inExpo: (t) => (t <= 0 ? 0 : 2 ** (10 * t - 10)),
  back: (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2; },
  outBounce: (t) => { const n = 7.5625, d = 2.75; if (t < 1 / d) return n * t * t; if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75; if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375; return n * (t -= 2.625 / d) * t + 0.984375; },
};
/** progress of t through [a, b] with easing */
export const seg = (t, a, b, ease = E.io) => ease(clamp((t - a) / (b - a)));
/** keyframes: [[t, value(number|array)], ...] with per-segment easing */
export function kf(t, keys, ease = E.io) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) {
    const [t0, v0] = keys[i], [t1, v1, e1] = keys[i + 1];
    if (t <= t1) {
      const u = (e1 || ease)(clamp((t - t0) / (t1 - t0)));
      return Array.isArray(v0) ? v0.map((x, k) => lerp(x, v1[k], u)) : lerp(v0, v1, u);
    }
  }
  return keys[keys.length - 1][1];
}
/** Catmull-Rom through points (arrays), u in 0..1 */
export function spline(points, u) {
  const c = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)), false, 'centripetal');
  return c.getPoint(clamp(u)).toArray();
}
/** smooth hand-held drift (deterministic in t) — returns [rx, ry, rz] radians */
export function drift(t, amp = 0.15, seed = 0) {
  const n = (f, p) => Math.sin(t * f + p) * 0.55 + Math.sin(t * f * 2.31 + p * 1.7) * 0.3 + Math.sin(t * f * 4.77 + p * 0.3) * 0.15;
  const a = amp * Math.PI / 180;
  return [n(0.9, 0.2 + seed) * a, n(0.7, 1.9 + seed) * a, n(0.5, 3.1 + seed) * a * 0.6];
}
export const V = (x, y, z) => new THREE.Vector3(x, y, z);
export function hash(n) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }
