// The other rooms of the flat: the bathroom (water), the small room (cold), the hallway (the door),
// and the phone close-up. Same pipeline as the living room: draw → light → emissive.
import { PAL, clamp, lerp, mix, hash, noise1, scratch, rgba, ease, key } from '../core/lib.js';
import { stroke, shape, fill, rectPts, ellipsePts, quad, hatch, hand, line } from '../core/ink.js';
import { Cam, box, poly3, line3, circle3, cylinder, P2 } from '../core/scene3d.js';
import { drawHero, relightFace, flame } from '../core/hero.js';
import { lightPass, bloom } from '../core/light.js';
import { drawCity, snow, CW, HOR } from './city.js';
import { breathPuff } from './room.js';

function lit(ctx, draw, lighting, emissive) {
  const w = ctx.canvas.width, h = ctx.canvas.height;
  const [A, a] = scratch('intA' + w, w, h);
  a.clearRect(0, 0, w, h);
  const info = draw(a) || {};
  const L = typeof lighting === 'function' ? lighting(info) : lighting;
  lightPass(a, w, h, { ...L, keepAlpha: true });
  ctx.drawImage(A, 0, 0);
  if (emissive) emissive(ctx, info);
  return info;
}
function smallWindow(ctx, pts, t, o = {}) {
  ctx.save(); ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); ctx.clip();
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const s = ((x1 - x0) * 1.6) / CW;
  ctx.translate((x0 + x1) / 2 - (o.fx ?? 700) * s, y0 + (y1 - y0) * (o.hy ?? 0.55) - HOR * s); ctx.scale(s, s);
  drawCity(ctx, { t, wave: 1, snowRoofs: true, snow: 1.2, moon: false, ...(o.city || {}) });
  ctx.restore();
}

// ================================================================= bathroom
const BATH = { L: -1.25, R: 1.25, B: 2.6, H: 2.5 };
export function bathCam(o = {}) { return new Cam({ x: 0.05, y: 1.2, z: -0.7, f: 720, cx: 540, cy: 360, ...o }); }
/** st: { t, water (0..1 tub level), stream (0..1 flow), cough (0..1 sputter), hero, candle k, pots: [k...], bottles: [k...] } */
export function drawBath(ctx, cam, st) {
  const t = st.t ?? 0;
  const tub = { x0: -1.2, x1: 0.55, z0: 1.85, z1: 2.6, y: 0.56 };
  const spout = [-0.33, 0.86, 2.6];
  return lit(ctx, (a) => {
    const nz = cam.z + 0.35;
    // walls: tiles to 1.4 m, paint above
    shape(a, P2(cam, [[BATH.L, 0, BATH.B], [BATH.R, 0, BATH.B], [BATH.R, BATH.H, BATH.B], [BATH.L, BATH.H, BATH.B]]), { fill: '#8C978E', w: 2, seed: 201 });
    shape(a, P2(cam, [[BATH.L, 0, BATH.B], [BATH.R, 0, BATH.B], [BATH.R, 1.45, BATH.B], [BATH.L, 1.45, BATH.B]]), { fill: PAL.tile, w: 2, seed: 202 });
    for (let y = 0.15; y < 1.45; y += 0.15) line3(a, cam, [BATH.L, y, BATH.B], [BATH.R, y, BATH.B], { w: 0.9, alpha: 0.35, seed: 210 + y * 20 });
    for (let x = BATH.L + 0.15; x < BATH.R; x += 0.15) line3(a, cam, [x, 0, BATH.B], [x, 1.45, BATH.B], { w: 0.9, alpha: 0.3, seed: 230 + x * 20 });
    shape(a, P2(cam, [[BATH.L, 0, nz], [BATH.L, 0, BATH.B], [BATH.L, BATH.H, BATH.B], [BATH.L, BATH.H, nz]]), { fill: '#7E897F', w: 2, seed: 203 });
    shape(a, P2(cam, [[BATH.R, 0, nz], [BATH.R, 0, BATH.B], [BATH.R, BATH.H, BATH.B], [BATH.R, BATH.H, nz]]), { fill: '#86918A', w: 2, seed: 204 });
    shape(a, P2(cam, [[BATH.L, 0, nz], [BATH.R, 0, nz], [BATH.R, 0, BATH.B], [BATH.L, 0, BATH.B]]), { fill: '#9C9A8E', w: 2, seed: 205 });
    for (let x = BATH.L + 0.3; x < BATH.R; x += 0.3) line3(a, cam, [x, 0, nz + 0.2], [x, 0, BATH.B], { w: 0.9, alpha: 0.3, seed: 240 + x * 9 });
    for (let z = 0.3; z < BATH.B; z += 0.3) line3(a, cam, [BATH.L, 0, z], [BATH.R, 0, z], { w: 0.9, alpha: 0.3, seed: 250 + z * 9 });
    // small window
    const wp = P2(cam, [[0.05, 1.6, BATH.B], [0.75, 1.6, BATH.B], [0.75, 2.2, BATH.B], [0.05, 2.2, BATH.B]]);
    smallWindow(a, wp, t, { fx: 900 });
    shape(a, wp, { w: 3, seed: 206 }); line3(a, cam, [0.4, 1.6, BATH.B], [0.4, 2.2, BATH.B], { w: 2.6, seed: 207 });
    box(a, cam, [0.0, 1.54, BATH.B - 0.1], [0.8, 1.6, BATH.B], { front: '#B9B3A4', top: '#CFC9BA', side: '#A49E90' }, { seed: 208, w: 2 });
    // sink + mirror on the right
    shape(a, P2(cam, [[0.8, 1.25, BATH.B], [1.15, 1.25, BATH.B], [1.15, 1.85, BATH.B], [0.8, 1.85, BATH.B]]), { fill: '#7D8C98', w: 2.2, seed: 209 });
    box(a, cam, [0.92, 0, 2.3], [1.04, 0.72, 2.42], { front: '#E3DED3', side: '#CFC9BC', top: '#E3DED3' }, { seed: 260 });
    box(a, cam, [0.78, 0.72, 2.12], [1.2, 0.86, 2.6], { front: '#E8E3D8', side: '#D2CCBF', top: '#F0EBE0' }, { seed: 261, round: 6 });
    // tub
    box(a, cam, [tub.x0, 0, tub.z0], [tub.x1, tub.y, tub.z1], { front: '#E4DFD4', side: '#CEC8BB', top: '#EEE9DF' }, { seed: 262, round: 7, w: 2.6 });
    const inner = P2(cam, [[tub.x0 + 0.08, tub.y, tub.z0 + 0.08], [tub.x1 - 0.08, tub.y, tub.z0 + 0.08], [tub.x1 - 0.08, tub.y, tub.z1 - 0.08], [tub.x0 + 0.08, tub.y, tub.z1 - 0.08]]);
    shape(a, inner, { fill: '#B9B6AE', w: 1.8, seed: 263, round: 10 });
    const wl = st.water ?? 0;
    if (wl > 0.01) {
      // water surface: inset rim projected down to the water level
      const yW = 0.1 + wl * 0.36;
      const surf = P2(cam, [[tub.x0 + 0.1, yW, tub.z0 + 0.1], [tub.x1 - 0.1, yW, tub.z0 + 0.1], [tub.x1 - 0.1, yW, tub.z1 - 0.1], [tub.x0 + 0.1, yW, tub.z1 - 0.1]]);
      // clip to the inner opening (the visible part of the surface)
      a.save(); a.beginPath(); inner.forEach((p, i) => (i ? a.lineTo(p[0], p[1]) : a.moveTo(p[0], p[1]))); a.closePath(); a.clip();
      shape(a, surf, { fill: '#6D93A8', w: 1.6, seed: 264, round: 8, inkAlpha: 0.7 });
      for (let i = 0; i < 4; i++) { const u = (i + 0.5) / 4, p0 = cam.p([lerp(tub.x0 + 0.2, tub.x1 - 0.3, u), yW, lerp(tub.z0 + 0.15, tub.z1 - 0.15, hash(i, 3))]); stroke(a, [[p0[0] - 18, p0[1]], [p0[0] + 18 + 6 * Math.sin(t * 3 + i), p0[1]]], { w: 1.2, seed: 265 + i, alpha: 0.5, color: '#E8F0F2' }); }
      // ripples where the stream lands
      if ((st.stream ?? 0) > 0.05) { const lp = cam.p([spout[0], yW, 2.38]); for (let r = 0; r < 3; r++) { const ph = (t * 1.6 + r / 3) % 1; stroke(a, ellipsePts(lp[0], lp[1], 6 + ph * 40, 2 + ph * 10), { closed: true, w: 1.1, seed: 270 + r, alpha: (1 - ph) * 0.6, color: '#E8F0F2' }); } }
      a.restore();
    }
    // tap on the wall
    {
      // a curved chrome spout coming off the wall
      const base = cam.p([spout[0], spout[1], BATH.B]), elbow = cam.p([spout[0], spout[1] + 0.01, 2.47]), tip = cam.p([spout[0], spout[1] - 0.04, 2.45]);
      const kk = cam.k([spout[0], spout[1], 2.5]);
      shape(a, ellipsePts(base[0], base[1], 0.045 * kk, 0.045 * kk), { fill: '#AEB4BB', w: 0.008 * kk + 1, seed: 279 });
      stroke(a, quad([base[0], base[1]], [elbow[0], elbow[1] - 0.01 * kk], [tip[0], tip[1]], 10), { w: 0.05 * kk, seed: 280, color: '#2B2724', taper: 1, amp: 0.3 });
      stroke(a, quad([base[0], base[1]], [elbow[0], elbow[1] - 0.01 * kk], [tip[0], tip[1]], 10), { w: 0.034 * kk, seed: 281, color: '#BCC2C8', taper: 1, amp: 0.3 });
      stroke(a, quad([base[0], base[1] - 0.008 * kk], [elbow[0], elbow[1] - 0.018 * kk], [tip[0] + 0.004 * kk, tip[1] - 0.01 * kk], 10), { w: 0.008 * kk, seed: 282, color: '#EEF2F4', taper: 0.6, amp: 0.2, alpha: 0.8 });
    }
    for (const dx of [-0.16, 0.16]) { const c = cam.p([spout[0] + dx, spout[1] + 0.14, BATH.B - 0.02]), k = cam.k([spout[0] + dx, spout[1] + 0.14, BATH.B]); shape(a, ellipsePts(c[0], c[1], 0.045 * k, 0.04 * k), { fill: '#C9CDD2', w: 1.8, seed: 281 + dx * 10 }); stroke(a, [[c[0] - 0.035 * k, c[1]], [c[0] + 0.035 * k, c[1]]], { w: 1.4, seed: 283 + dx * 10 }); }
    // the stream
    const flow = st.stream ?? 0;
    if (flow > 0.01) {
      const top = cam.p([spout[0], spout[1] - 0.05, 2.45]), bot = cam.p([spout[0], 0.1 + wl * 0.36, 2.42]);
      const cough = st.cough ?? 0;
      const segs = 14, ww = Math.max(3, 0.022 * cam.k([spout[0], 0.6, 2.45])) * (0.4 + 0.6 * flow);
      for (let i = 0; i < segs; i++) {
        const u0 = i / segs, u1 = (i + 1) / segs;
        if (cough > 0 && hash(i + Math.floor(t * 14) * 7, 5) < cough * 0.75) continue;
        const wob = (u) => Math.sin(t * 20 + u * 9) * 1.5 * flow;
        stroke(a, [[lerp(top[0], bot[0], u0) + wob(u0), lerp(top[1], bot[1], u0)], [lerp(top[0], bot[0], u1) + wob(u1), lerp(top[1], bot[1], u1)]], { w: ww, seed: 290 + i, color: '#A9C0CC', taper: 1, amp: 0.4 });
      }
      stroke(a, [[top[0] - 1, top[1]], [bot[0] - 1, bot[1]]], { w: 1.1, seed: 299, color: '#EEF5F7', alpha: 0.7 * flow * (1 - cough * 0.6) });
    }
    if (st.drip != null && st.drip >= 0) {
      const top = cam.p([spout[0], spout[1] - 0.05, 2.45]), bot = cam.p([spout[0], 0.1 + wl * 0.36, 2.42]);
      const u = st.drip % 1, gy = u < 0.5 ? 0 : (u - 0.5) * 2;
      const r = (3 + (u < 0.5 ? u * 4 : 2)) * Math.max(1, cam.k([spout[0], 0.6, 2.45]) / 400);
      shape(a, ellipsePts(top[0], lerp(top[1] + 4, bot[1], gy * gy), r * 0.8, r), { fill: '#A9C0CC', w: 1.2, seed: 300 });
    }
    // candle on the tub's corner
    if (st.candle) { const cp = [0.42, tub.y, 2.42]; cylinder(a, cam, cp, 0.04, 0.12, { fill: '#EFE6D2', seed: 301, top: '#E2D6BE' }); }
    // containers on the floor
    const row = (arr, kind, z, x0, dx) => arr.forEach((k, i) => {
      if (k <= 0) return;
      const c = [x0 + i * dx, 0, z], q = cam.p(c), kk = cam.k(c), sc = ease.outBack(clamp(k)) ;
      if (kind === 'pot') {
        const r = 0.13 * kk * sc, hh = 0.14 * kk * sc;
        shape(a, [[q[0] - r, q[1] - hh], [q[0] + r, q[1] - hh], [q[0] + r * 0.95, q[1]], [q[0] - r * 0.95, q[1]]], { fill: '#8D939C', w: 2, seed: 310 + i, round: 4 });
        shape(a, ellipsePts(q[0], q[1] - hh, r, r * 0.3), { fill: PAL.water, w: 1.8, seed: 320 + i });
        stroke(a, [[q[0] - r - 0.07 * kk * sc, q[1] - hh * 0.8], [q[0] - r, q[1] - hh * 0.8]], { w: 3, seed: 330 + i });
        stroke(a, [[q[0] + r, q[1] - hh * 0.8], [q[0] + r + 0.07 * kk * sc, q[1] - hh * 0.8]], { w: 3, seed: 335 + i });
      } else {
        const bw = 0.045 * kk * sc, bh = 0.3 * kk * sc, lvl = clamp(k * 1.4 - 0.3);
        shape(a, [[q[0] - bw, q[1] - bh * 0.7], [q[0] + bw, q[1] - bh * 0.7], [q[0] + bw, q[1]], [q[0] - bw, q[1]]], { fill: '#C8D4D6', w: 1.7, seed: 340 + i, round: 4 });
        fill(a, [[q[0] - bw * 0.85, q[1] - bh * 0.7 * lvl], [q[0] + bw * 0.85, q[1] - bh * 0.7 * lvl], [q[0] + bw * 0.85, q[1] - 2], [q[0] - bw * 0.85, q[1] - 2]], PAL.water, { seed: 350 + i });
        shape(a, [[q[0] - bw * 0.45, q[1] - bh], [q[0] + bw * 0.45, q[1] - bh], [q[0] + bw, q[1] - bh * 0.7], [q[0] - bw, q[1] - bh * 0.7]], { fill: '#C8D4D6', w: 1.5, seed: 360 + i });
        shape(a, rectPts(q[0] - bw * 0.5, q[1] - bh - 0.04 * kk * sc, bw, 0.045 * kk * sc), { fill: '#3E6A4C', w: 1.3, seed: 370 + i });
      }
    });
    if (st.pots) row(st.pots, 'pot', 1.5, -0.95, 0.36);
    if (st.bottles) row(st.bottles, 'bottle', 1.2, -1.0, 0.2);
    let hero = null;
    if (st.hero) {
      const feet = [st.hero.x ?? -0.85, 0, st.hero.z ?? 1.55], p = cam.p(feet), k = cam.k(feet), s = (k * (st.hero.height ?? 1.62)) / 7.1;
      fill(a, ellipsePts(p[0], p[1], s * 1.4, s * 0.3), 'rgba(30,25,30,0.3)', { seed: 380 });
      hero = drawHero(a, p[0], p[1], s, { t, seed: 7, ...st.hero });
    }
    return { hero, tub };
  }, (info) => {
    const cp = cam.p([0.42, 0.75, 2.42]), kk = cam.k([0.42, 0.75, 2.42]);
    const lights = [{ x: cp[0], y: cp[1], r: 2.3 * kk, color: '#E9A45E', a: st.candle ? 1 : 0, falloff: 0.22 }];
    const wpc = cam.p([0.4, 1.9, BATH.B]); lights.push({ x: wpc[0], y: wpc[1] + 40, r: 520, color: '#3E4E82', a: 0.55 });
    return { ambient: '#3C4566', lights };
  }, (c, info) => {
    if (st.candle) { const fp = cam.p([0.42, 0.7, 2.42]); flame(c, fp[0], fp[1], cam.k([0.42, 0.7, 2.42]) * 0.075, t, 9, st.candle); }
    if (info.hero) relightFace(c, info.hero, 0.6);
  });
}

// ================================================================= the small room (blankets)
export function smallCam(o = {}) { return new Cam({ x: 0.0, y: 1.15, z: -0.4, f: 700, cx: 540, cy: 380, ...o }); }
/** st: { t, blanket (0..1 drop over the door), hero, candle (k), stoolCandle, frost } */
export function drawSmallRoom(ctx, cam, st) {
  const t = st.t ?? 0, B = 3.0, Lw = -1.5, Rw = 1.5, Hh = 2.45;
  const stool = [0.25, 0, 1.75];
  return lit(ctx, (a) => {
    const nz = cam.z + 0.35;
    shape(a, P2(cam, [[Lw, 0, B], [Rw, 0, B], [Rw, Hh, B], [Lw, Hh, B]]), { fill: '#7B7590', w: 2, seed: 401 });
    shape(a, P2(cam, [[Lw, 0, nz], [Lw, 0, B], [Lw, Hh, B], [Lw, Hh, nz]]), { fill: '#6F6A86', w: 2, seed: 402 });
    shape(a, P2(cam, [[Rw, 0, nz], [Rw, 0, B], [Rw, Hh, B], [Rw, Hh, nz]]), { fill: '#77728C', w: 2, seed: 403 });
    shape(a, P2(cam, [[Lw, 0, nz], [Rw, 0, nz], [Rw, 0, B], [Lw, 0, B]]), { fill: '#6D5541', w: 2, seed: 404 });
    shape(a, P2(cam, [[Lw, Hh, nz], [Rw, Hh, nz], [Rw, Hh, B], [Lw, Hh, B]]), { fill: '#625E78', w: 2, seed: 4041 });
    for (let x = Lw + 0.22; x < Rw; x += 0.22) line3(a, cam, [x, 0, nz + 0.2], [x, 0, B], { w: 1, alpha: 0.35, seed: 410 + x * 10 });
    // small window on the back wall (left)
    const wp = P2(cam, [[-1.2, 1.15, B], [-0.45, 1.15, B], [-0.45, 1.95, B], [-1.2, 1.95, B]]);
    smallWindow(a, wp, t, { fx: 600, hy: 0.4 });
    if (st.frost) { a.save(); a.globalAlpha = 0.3 * st.frost; fill(a, wp, '#C9D2DE', { seed: 405 }); a.restore(); }
    shape(a, wp, { w: 3, seed: 406 }); line3(a, cam, [-0.825, 1.15, B], [-0.825, 1.95, B], { w: 2.4, seed: 407 });
    // the doorway (dark hall beyond) and the blanket over it
    const door = P2(cam, [[0.35, 0, B], [1.2, 0, B], [1.2, 2.05, B], [0.35, 2.05, B]]);
    shape(a, door, { fill: '#1E2235', w: 2.6, seed: 408 });
    const bk = st.blanket ?? 0;
    if (bk > 0) {
      const yTop = 2.12, yBot = lerp(2.05, -0.02, ease.out(bk));
      const pts = [[0.28, yTop, B - 0.02], [1.27, yTop, B - 0.02], [1.27, yBot, B - 0.02], [0.28, yBot, B - 0.02]];
      const pp = P2(cam, pts);
      // a little sway at the hem while it settles
      const sway = (1 - clamp((bk - 0.7) / 0.3)) * 6 * Math.sin(t * 7);
      pp[2][0] += sway; pp[3][0] += sway;
      shape(a, pp, { fill: '#7E5E4B', w: 2.6, seed: 409 });
      for (let i = 1; i < 5; i++) { const u = i / 5, top = cam.p([lerp(0.28, 1.27, u), yTop, B]), bot = cam.p([lerp(0.28, 1.27, u) + 0.03 * Math.sin(i * 2), yBot, B]); stroke(a, quad([top[0], top[1]], [top[0] + 8 * Math.sin(i), (top[1] + bot[1]) / 2], [bot[0] + sway, bot[1]], 8), { w: 1.4, seed: 420 + i, alpha: 0.6 }); }
      // stripes (a woollen blanket)
      for (const v of [0.12, 0.17]) if (yBot < yTop - v * 2) { const l = cam.p([0.28, yTop - v * 2, B]), r = cam.p([1.27, yTop - v * 2, B]); stroke(a, [[l[0], l[1]], [r[0], r[1]]], { w: 3, seed: 430 + v * 100, color: '#C6A46A', alpha: 0.8 }); }
      for (const nx of [0.32, 0.78, 1.23]) { const n = cam.p([nx, yTop - 0.04, B]); shape(a, ellipsePts(n[0], n[1], 3, 3), { fill: '#9A9AA0', w: 1, seed: 440 + nx * 10 }); }
    }
    // mattress + bedding on the floor along the left wall
    box(a, cam, [-1.45, 0, 1.6], [-0.35, 0.22, 2.95], { front: '#B9AE97', side: '#A99E88', top: '#CFC5AF' }, { seed: 450, round: 8 });
    box(a, cam, [-1.42, 0.22, 1.9], [-0.4, 0.36, 2.95], { front: '#3E6A4C', side: '#355C42', top: '#4C7A5A' }, { seed: 451, round: 12 });
    const pil = cam.p([-0.95, 0.4, 2.75]), pk = cam.k([-0.95, 0.4, 2.75]);
    shape(a, [[pil[0] - 0.32 * pk, pil[1] - 0.08 * pk], [pil[0] + 0.3 * pk, pil[1] - 0.1 * pk], [pil[0] + 0.33 * pk, pil[1] + 0.08 * pk], [pil[0] - 0.3 * pk, pil[1] + 0.1 * pk]], { fill: '#E2D9C6', w: 2, seed: 452, round: 0.06 * pk });
    // a stool with the candle
    box(a, cam, [stool[0] - 0.18, 0.36, stool[2] - 0.18], [stool[0] + 0.18, 0.42, stool[2] + 0.18], { front: PAL.woodDark, side: PAL.woodDark, top: PAL.wood }, { seed: 460, round: 4 });
    for (const [dx, dz] of [[-0.14, -0.14], [0.14, -0.14], [-0.14, 0.14], [0.14, 0.14]]) line3(a, cam, [stool[0] + dx, 0.36, stool[2] + dz], [stool[0] + dx * 1.1, 0, stool[2] + dz * 1.1], { w: 2.6, seed: 461 + dx * 10 + dz });
    if (st.candle != null) { cylinder(a, cam, [stool[0], 0.42, stool[2]], 0.08, 0.012, { fill: '#9C8E76', seed: 470 }); cylinder(a, cam, [stool[0], 0.432, stool[2]], 0.035, 0.12, { fill: '#EFE6D2', seed: 471, top: '#E2D6BE' }); }
    let hero = null;
    if (st.hero) {
      const feet = [st.hero.x ?? -0.3, 0, st.hero.z ?? 2.2], p = cam.p(feet), k = cam.k(feet), s = (k * (st.hero.height ?? 1.62)) / 7.1;
      fill(a, ellipsePts(p[0], p[1], s * 1.6, s * 0.35), 'rgba(30,25,30,0.3)', { seed: 480 });
      hero = drawHero(a, p[0], p[1] + (st.hero.lift ?? 0) * s, s, { t, seed: 7, ...st.hero });
      if (st.hero.wrap && st.hero.mitts) {
        // two little mitts held out towards the candle
        const hx = hero.face.x, hy = hero.face.y + s * 2.7;
        for (const d of [-1, 1]) shape(a, ellipsePts(hx + s * 0.35 + d * s * 0.3, hy + d * s * 0.06, s * 0.21, s * 0.18), { fill: '#F3EEE6', w: s * 0.09, seed: 490 + d });
      }
    }
    return { hero };
  }, (info) => {
    const cp = cam.p([stool[0], 0.6, stool[2]]), kk = cam.k([stool[0], 0.6, stool[2]]);
    const lights = [];
    if (st.candle) lights.push({ x: cp[0], y: cp[1], r: (st.candleR ?? 2.0) * kk, color: '#E9A45E', a: st.candle, falloff: 0.2 });
    const wpc = cam.p([-0.8, 1.55, B]); lights.push({ x: wpc[0], y: wpc[1] + 60, r: 480, color: '#3F4F86', a: 0.6 });
    if (st.extraLight) lights.push(...st.extraLight(cam));
    return { ambient: st.ambient ?? '#3A4062', lights };
  }, (c, info) => {
    if (st.candle) { const fp = cam.p([stool[0], 0.555, stool[2]]); flame(c, fp[0], fp[1], cam.k([stool[0], 0.555, stool[2]]) * 0.08, t, 11, st.candle); }
    if (info.hero) { relightFace(c, info.hero, st.faceGlow ?? 0.55); if (st.breath) breathPuff(c, info.hero.face, t, st.breath); }
  });
}

// ================================================================= the hallway + front door
export function hallCam(o = {}) { return new Cam({ x: 0.0, y: 1.3, z: -0.5, f: 760, cx: 540, cy: 370, ...o }); }
/** st: { t, line (0..1 the warm line under the door), feet (0..1 shadows in it), hero, heroCandle, ambient } */
export function drawHall(ctx, cam, st) {
  const t = st.t ?? 0, D = 4.2, L = -0.68, R = 0.68, Hh = 2.5;
  return lit(ctx, (a) => {
    const nz = cam.z + 0.3;
    shape(a, P2(cam, [[L, 0, D], [R, 0, D], [R, Hh, D], [L, Hh, D]]), { fill: '#6E7086', w: 2, seed: 501 });
    shape(a, P2(cam, [[L, 0, nz], [L, 0, D], [L, Hh, D], [L, Hh, nz]]), { fill: '#64667C', w: 2, seed: 502 });
    shape(a, P2(cam, [[R, 0, nz], [R, 0, D], [R, Hh, D], [R, Hh, nz]]), { fill: '#6A6C82', w: 2, seed: 503 });
    shape(a, P2(cam, [[L, Hh, nz], [R, Hh, nz], [R, Hh, D], [L, Hh, D]]), { fill: '#5C5E72', w: 2, seed: 504 });
    shape(a, P2(cam, [[L, 0, nz], [R, 0, nz], [R, 0, D], [L, 0, D]]), { fill: '#6B5240', w: 2, seed: 505 });
    for (let z = nz + 0.4; z < D; z += 0.5) line3(a, cam, [L, 0, z], [R, 0, z], { w: 1, alpha: 0.3, seed: 506 + z * 9 });
    // runner rug
    poly3(a, cam, [[-0.32, 0.004, 0.8], [0.32, 0.004, 0.8], [0.32, 0.004, 3.7], [-0.32, 0.004, 3.7]], { fill: '#7A4E45', w: 1.6, seed: 507 });
    // the door
    const dp = P2(cam, [[-0.46, 0, D], [0.46, 0, D], [0.46, 2.08, D], [-0.46, 2.08, D]]);
    shape(a, P2(cam, [[-0.54, 0, D], [0.54, 0, D], [0.54, 2.16, D], [-0.54, 2.16, D]]), { fill: '#5D5A60', w: 2, seed: 508 });
    shape(a, dp, { fill: '#6B4E38', w: 2.6, seed: 509 });
    poly3(a, cam, [[-0.34, 1.12, D], [0.34, 1.12, D], [0.34, 1.9, D], [-0.34, 1.9, D]], { w: 1.4, seed: 510, inkAlpha: 0.6 });
    poly3(a, cam, [[-0.34, 0.15, D], [0.34, 0.15, D], [0.34, 0.95, D], [-0.34, 0.95, D]], { w: 1.4, seed: 511, inkAlpha: 0.6 });
    const ph = cam.p([0, 1.55, D]), pk = cam.k([0, 1.55, D]); shape(a, ellipsePts(ph[0], ph[1], 0.018 * pk, 0.018 * pk), { fill: '#1d1b1d', w: 1.2, seed: 512 });
    const kn = cam.p([0.36, 1.0, D - 0.04]); shape(a, ellipsePts(kn[0], kn[1], 0.03 * pk, 0.03 * pk), { fill: '#C9B48A', w: 1.4, seed: 513 });
    // chain lock
    const c0 = cam.p([0.3, 1.35, D - 0.02]), c1 = cam.p([0.48, 1.32, D - 0.02]); stroke(a, quad([c0[0], c0[1]], [(c0[0] + c1[0]) / 2, c0[1] + 10], [c1[0], c1[1]], 8), { w: 2, seed: 514 });
    // coat hooks + coat on the left wall
    for (const z of [2.3, 2.75]) { const p = cam.p([L + 0.01, 1.75, z]); shape(a, ellipsePts(p[0], p[1], 4, 4), { fill: '#BBA77E', w: 1.2, seed: 520 + z * 9 }); }
    const c = (z, y) => { const p = cam.p([L + 0.06, y, z]); return [p[0], p[1]]; };
    shape(a, [c(2.2, 1.74), c(2.42, 1.74), c(2.5, 0.85), c(2.1, 0.85)], { fill: '#4F5A4C', w: 2.2, seed: 522, round: 6 });
    shape(a, [c(2.68, 1.72), c(2.84, 1.72), c(2.88, 1.15), c(2.62, 1.15)], { fill: '#7A5F43', w: 2, seed: 523, round: 5 });
    // shoes
    box(a, cam, [L + 0.05, 0, 3.2], [L + 0.17, 0.08, 3.45], '#3A332E', { seed: 524, round: 4 });
    box(a, cam, [L + 0.2, 0, 3.22], [L + 0.32, 0.08, 3.47], '#3A332E', { seed: 525, round: 4 });
    // light switch + a framed photo on the right wall
    poly3(a, cam, [[R, 1.05, 3.5], [R, 1.05, 3.6], [R, 1.2, 3.6], [R, 1.2, 3.5]], { fill: '#D8D0BE', w: 1.2, seed: 526 });
    poly3(a, cam, [[R, 1.4, 1.9], [R, 1.4, 2.4], [R, 1.85, 2.4], [R, 1.85, 1.9]], { fill: '#6B5440', w: 1.8, seed: 527 });
    poly3(a, cam, [[R, 1.46, 1.96], [R, 1.46, 2.34], [R, 1.79, 2.34], [R, 1.79, 1.96]], { fill: '#A99F88', w: 1.2, seed: 528 });
    let hero = null;
    if (st.hero) {
      const feet = [st.hero.x ?? 0, 0, st.hero.z ?? 2.0], p = cam.p(feet), k = cam.k(feet), s = (k * (st.hero.height ?? 1.62)) / 7.1;
      fill(a, ellipsePts(p[0], p[1], s * 1.2, s * 0.28), 'rgba(30,25,30,0.3)', { seed: 530 });
      hero = drawHero(a, p[0], p[1], s, { t, seed: 7, ...st.hero });
    }
    return { hero, dp };
  }, (info) => {
    const lights = [];
    const lk = st.line ?? 0;
    const lb = cam.p([0, 0, D - 0.05]), lkk = cam.k([0, 0, D]);
    if (lk > 0) lights.push({ x: lb[0], y: lb[1], r: 1.6 * lkk, color: '#C98B4C', a: 0.65 * lk, sy: 0.35, falloff: 0.25 });
    if (info.hero && info.hero.flames.length && (st.heroCandle ?? 1) > 0) { const f = info.hero.flames[0]; lights.push({ x: f.x, y: f.y, r: f.s * 22, color: '#E9A45E', a: st.heroCandle ?? 1, falloff: 0.2 }); }
    lights.push({ x: 540, y: 120, r: 700, color: '#2F3A66', a: 0.5 });
    return { ambient: st.ambient ?? '#30364F', lights };
  }, (c, info) => {
    const lk = st.line ?? 0;
    if (lk > 0) {
      // the line of warm light under the door (the only light left at the end)
      const l = cam.p([-0.46, 0.0, D - 0.01]), r = cam.p([0.46, 0.0, D - 0.01]), k = cam.k([0, 0, D]);
      const hgt = 0.022 * k;
      c.save();
      c.fillStyle = rgba('#FFD08A', lk); c.fillRect(l[0], l[1] - hgt, r[0] - l[0], hgt);
      // feet shadows breaking the line
      const fk = st.feet ?? 0;
      if (fk > 0) { c.fillStyle = `rgba(20,16,18,${0.92 * fk})`; for (const fx of [0.38, 0.6]) c.fillRect(lerp(l[0], r[0], fx) - 0.06 * k, l[1] - hgt - 1, 0.12 * k, hgt + 2); }
      c.restore();
      bloom(c, (l[0] + r[0]) / 2, l[1] - hgt / 2, (r[0] - l[0]) * 0.75, PAL.amber, 0.5 * lk, 1, 0.22);
      // light spill on the floor towards us
      bloom(c, (l[0] + r[0]) / 2, l[1] + 6, (r[0] - l[0]) * 0.6, '#C98B4C', 0.22 * lk, 1, 0.3);
    }
    if (info.hero) {
      for (const f of info.hero.flames) flame(c, f.x, f.y, f.s * 0.55, t, 13, st.heroCandle ?? 1);
      relightFace(c, info.hero, st.faceGlow ?? 0.5);
      if (st.smoke) smoke(c, info.hero.flames[0] || st.smokeAt, t, st.smoke);
    }
  });
}
export function smoke(c, f, t, k) {
  if (!f || k <= 0) return;
  for (let i = 0; i < 3; i++) {
    const pts = [];
    for (let j = 0; j <= 14; j++) { const u = j / 14; pts.push([f.x + Math.sin(u * 7 + t * 2 + i) * 10 * u + i * 3, f.y - u * f.s * 4.5 * Math.min(1, k * 1.4)]); }
    stroke(c, pts, { w: 2.2 - i * 0.5, seed: 540 + i, color: '#C9C6C0', alpha: 0.5 * (1 - (k > 0.8 ? (k - 0.8) * 5 : 0)), amp: 1.4 });
  }
}

// ================================================================= the phone
/** st: { t, lines: [{text, k}], bars (0..1), noService (0..1), glow } */
export function drawPhone(ctx, st) {
  const t = st.t ?? 0, w = ctx.canvas.width, h = ctx.canvas.height;
  return lit(ctx, (a) => {
    // dark room behind: the sofa back + a window edge, out of focus (soft shapes)
    a.fillStyle = '#4C5470'; a.fillRect(0, 0, w, h);
    a.save(); a.filter = 'blur(6px)';
    shape(a, [[-40, 470], [1120, 430], [1120, 800], [-40, 800]], { fill: PAL.moss, w: 0, seed: 601 });
    shape(a, [[700, 330], [1000, 300], [1020, 470], [690, 500]], { fill: '#8E8A70', w: 0, seed: 602 });
    a.fillStyle = '#26305A'; a.fillRect(-20, -20, 300, 420);
    a.restore();
    // the hero's face, big, at the top left, looking down at the phone
    const s = 150, fx = 300, fy = 260;
    a.save(); a.translate(fx, fy); a.rotate(0.12);
    shape(a, ellipsePts(0, 0, s, s), { fill: PAL.face, w: 7, seed: 603 });
    const dome = [];
    for (let i = 0; i <= 22; i++) { const an = Math.PI + (i / 22) * Math.PI; dome.push([Math.cos(an) * s * 1.06, -s * 0.32 + Math.sin(an) * s * 1.0]); }
    shape(a, dome, { fill: PAL.mustard, w: 7, seed: 604 });
    const cuff = [...quad([-s * 1.1, -s * 0.36], [0, -s * 0.26], [s * 1.1, -s * 0.36], 10), ...quad([s * 1.08, s * 0.02], [0, s * 0.14], [-s * 1.08, s * 0.02], 10)];
    shape(a, cuff, { fill: '#B5852B', w: 6, seed: 605, round: 12 });
    for (let k = -5; k <= 5; k++) { const xx = (k / 5.6) * s; stroke(a, [[xx, -s * 0.28], [xx, -s * 0.0]], { w: 2.4, seed: 606 + k, alpha: 0.5 }); }
    a.restore();
    // scarf edge
    shape(a, [[150, 420], [470, 400], [500, 520], [120, 540]], { fill: PAL.concrete, w: 5, seed: 610, round: 30 });
    // the phone, held in two mitts
    a.save(); a.translate(640, 470); a.rotate(-0.08);
    shape(a, [[-150, -250], [150, -250], [150, 250], [-150, 250]], { fill: '#2B2828', w: 6, seed: 611, round: 34 });
    a.restore();
    return { fx, fy, s };
  }, () => ({ ambient: '#3A4060', lights: [{ x: 640, y: 420, r: 560, color: '#E2B87C', a: 0.95 * (st.glow ?? 1), falloff: 0.25 }] }), (c, info) => {
    // face eyes (looking down-right at the screen) — always the brightest white
    c.save(); c.translate(info.fx, info.fy); c.rotate(0.12);
    c.globalAlpha = 0.75; c.fillStyle = PAL.face; c.beginPath(); c.rect(-info.s * 1.1, -info.s * 0.0, info.s * 2.2, info.s * 1.2); c.clip();
    c.beginPath(); c.ellipse(0, 0, info.s * 0.95, info.s * 0.95, 0, 0, Math.PI * 2); c.fill();
    c.globalAlpha = 1; c.fillStyle = PAL.ink;
    const per = 3.6, ph = t % per, bl = ph < 0.13 ? Math.sin((ph / 0.13) * Math.PI) : 0;
    for (const sx of [-1, 1]) { c.beginPath(); c.ellipse(sx * info.s * 0.34 + info.s * 0.22, info.s * 0.3, info.s * 0.095, info.s * 0.125 * Math.max(0.12, 1 - bl), 0, 0, Math.PI * 2); c.fill(); }
    c.restore();
    // the screen (warm, it is the room's only light now)
    c.save(); c.translate(640, 470); c.rotate(-0.08);
    const sw = 252, sh = 440;
    shape(c, [[-sw / 2, -sh / 2], [sw / 2, -sh / 2], [sw / 2, sh / 2], [-sw / 2, sh / 2]], { fill: '#F2E4C6', w: 2, seed: 612, round: 18 });
    // status bar
    const bars = st.bars ?? 1;
    for (let i = 0; i < 4; i++) { const on = bars * 4 > i + 0.5; c.fillStyle = on ? PAL.ink : 'rgba(43,39,36,0.2)'; c.fillRect(sw / 2 - 64 + i * 11, -sh / 2 + 34 - i * 5, 7, 8 + i * 5); }
    hand(c, '21:12', -sw / 2 + 22, -sh / 2 + 40, { font: 'Patrick Hand', size: 24, color: PAL.ink, seed: 620 });
    if ((st.noService ?? 0) > 0) hand(c, 'No service', sw / 2 - 18, -sh / 2 + 66, { font: 'Patrick Hand', size: 22, color: '#8A3B2A', align: 'right', seed: 621, alpha: st.noService });
    // alert card
    shape(c, [[-sw / 2 + 16, -sh / 2 + 86], [sw / 2 - 16, -sh / 2 + 86], [sw / 2 - 16, sh / 2 - 30], [-sw / 2 + 16, sh / 2 - 30]], { fill: '#FBF3E2', w: 2.2, seed: 622, round: 14 });
    // warning triangle
    const tx = -sw / 2 + 50, ty = -sh / 2 + 130;
    shape(c, [[tx, ty - 22], [tx + 22, ty + 16], [tx - 22, ty + 16]], { fill: PAL.amber, w: 2.6, seed: 623 });
    hand(c, '!', tx, ty + 12, { font: 'Permanent Marker', size: 26, color: PAL.ink, align: 'center', seed: 624 });
    hand(c, 'EMERGENCY', tx + 36, ty - 2, { font: 'Patrick Hand SC', size: 25, color: PAL.ink, seed: 625 });
    hand(c, 'ALERT', tx + 36, ty + 22, { font: 'Patrick Hand SC', size: 25, color: PAL.ink, seed: 626 });
    stroke(c, [[-sw / 2 + 32, ty + 40], [sw / 2 - 32, ty + 40]], { w: 1.6, seed: 627, alpha: 0.5 });
    (st.lines || []).forEach((L, i) => hand(c, L.text, -sw / 2 + 32, ty + 80 + i * 40, { font: L.big ? 'Permanent Marker' : 'Patrick Hand', size: L.big ? 27 : 31, color: PAL.ink, reveal: L.k, seed: 630 + i * 7 }));
    c.restore();
    bloom(c, 640, 470, 420, '#F0C27A', 0.22 * (st.glow ?? 1));
    // mitts holding the phone
    for (const [mx, my] of [[505, 640], [775, 615]]) shape(c, ellipsePts(mx, my, 46, 40), { fill: '#E9E2D6', w: 6, seed: 640 + mx });
    void info;
  });
}
