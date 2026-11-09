// A tiny 3D → ink projector. Rooms are real geometry (metres), so a camera dolly gives true parallax,
// but everything is drawn by the ink kit (wobbly lines, offset fills), never shaded like "glossy 3D".
import { shape, stroke, fill, roundPts } from './ink.js';

export class Cam {
  constructor(o = {}) { Object.assign(this, { x: 0, y: 1.35, z: 0, yaw: 0, pitch: 0, f: 780, cx: 540, cy: 370 }, o); }
  toCam(P) {
    const x = P[0] - this.x, y = P[1] - this.y, z = P[2] - this.z;
    const cyw = Math.cos(this.yaw), syw = Math.sin(this.yaw);
    const x1 = x * cyw - z * syw, z1 = x * syw + z * cyw;
    const cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
    return [x1, y * cp - z1 * sp, y * sp + z1 * cp];
  }
  p(P) { const [x, y, z] = this.toCam(P); const zz = Math.max(z, 0.05); return [this.cx + (this.f * x) / zz, this.cy - (this.f * y) / zz, z]; }
  /** pixels per metre at P */
  k(P) { return this.f / Math.max(this.toCam(P)[2], 0.05); }
  depth(P) { return this.toCam(P)[2]; }
  pos() { return [this.x, this.y, this.z]; }
}

export const P2 = (cam, pts) => pts.map((P) => { const q = cam.p(P); return [q[0], q[1]]; });

// face list of an axis-aligned box: corner index bits = x | y<<1 | z<<2
const FACES = {
  nx: { idx: [0, 4, 6, 2], n: [-1, 0, 0] }, px: { idx: [1, 3, 7, 5], n: [1, 0, 0] },
  ny: { idx: [0, 1, 5, 4], n: [0, -1, 0] }, py: { idx: [2, 6, 7, 3], n: [0, 1, 0] },
  nz: { idx: [0, 2, 3, 1], n: [0, 0, -1] }, pz: { idx: [4, 5, 7, 6], n: [0, 0, 1] },
};
/**
 * Draw an axis-aligned box a..b. col: {front (−z), back, side (±x), top, bottom} or one colour.
 * o.round rounds the projected face corners; o.skip: list of face keys never drawn.
 */
export function box(ctx, cam, a, b, col, o = {}) {
  const C = [];
  for (let i = 0; i < 8; i++) C.push([i & 1 ? b[0] : a[0], i & 2 ? b[1] : a[1], i & 4 ? b[2] : a[2]]);
  const Pp = C.map((P) => cam.p(P));
  const cp = cam.pos();
  const colors = typeof col === 'string' ? { front: col, side: col, top: col, bottom: col, back: col } : col;
  const pick = { nz: colors.front, pz: colors.back ?? colors.front, nx: colors.sideL ?? colors.side, px: colors.sideR ?? colors.side, py: colors.top, ny: colors.bottom ?? colors.side };
  const vis = [];
  for (const [k, F] of Object.entries(FACES)) {
    if (o.skip && o.skip.includes(k)) continue;
    const c = F.idx.map((i) => C[i]);
    const m = [0, 1, 2].map((d) => (c[0][d] + c[1][d] + c[2][d] + c[3][d]) / 4);
    const v = [cp[0] - m[0], cp[1] - m[1], cp[2] - m[2]];
    if (v[0] * F.n[0] + v[1] * F.n[1] + v[2] * F.n[2] > 1e-4) vis.push([k, F]);
  }
  const seed = o.seed ?? 1;
  vis.forEach(([k, F], i) => {
    const pts = F.idx.map((j) => [Pp[j][0], Pp[j][1]]);
    shape(ctx, pts, { fill: pick[k], w: o.w ?? 2.8, seed: seed + i * 7, round: o.round ?? 0, amp: o.amp ?? 0.9, ink: o.ink ?? true });
  });
  return vis.map(([k]) => k);
}

/** flat polygon in 3D */
export function poly3(ctx, cam, pts3, o = {}) {
  const pts = P2(cam, pts3);
  shape(ctx, pts, { w: 2.2, ...o });
  return pts;
}
export function line3(ctx, cam, A, B, o = {}) {
  const a = cam.p(A), b = cam.p(B);
  stroke(ctx, [[a[0], a[1]], [b[0], b[1]]], { w: 2.2, ...o });
}
/** circle in 3D on a horizontal plane (axis y) or vertical plane (axis z/x) */
export function circle3(cam, c, r, axis = 'y', n = 28) {
  const o = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2, u = Math.cos(a) * r, v = Math.sin(a) * r;
    const P = axis === 'y' ? [c[0] + u, c[1], c[2] + v] : axis === 'z' ? [c[0] + u, c[1] + v, c[2]] : [c[0], c[1] + v, c[2] + u];
    const q = cam.p(P); o.push([q[0], q[1]]);
  }
  return o;
}
function hull(points) {
  const p = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const q of p) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  up.pop(); lo.pop(); return lo.concat(up);
}
/** vertical cylinder / truncated cone standing on base (y up). rTop defaults to r. */
export function cylinder(ctx, cam, base, r, h, o = {}) {
  const rTop = o.rTop ?? r;
  const bot = circle3(cam, base, r), top = circle3(cam, [base[0], base[1] + h, base[2]], rTop);
  const H = hull(bot.concat(top));
  shape(ctx, H, { fill: o.fill, w: o.w ?? 2.2, seed: o.seed ?? 3, amp: o.amp ?? 0.8 });
  const camAbove = cam.y > base[1] + h, camBelow = cam.y < base[1];
  if (camAbove && o.top !== false) shape(ctx, top, { fill: o.top ?? o.fill, w: (o.w ?? 2.2) * 0.85, seed: (o.seed ?? 3) + 1, amp: 0.6 });
  if (camBelow && o.bottom) shape(ctx, bot, { fill: o.bottom, w: (o.w ?? 2.2) * 0.85, seed: (o.seed ?? 3) + 2, amp: 0.6 });
  return { hull: H, top, bot };
}
export { roundPts, fill };
