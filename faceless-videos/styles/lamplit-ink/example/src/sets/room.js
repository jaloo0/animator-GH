// THE FLAT — the hero's living room on the 40th floor (style sheet, "The World A/B/C").
// Real 3D layout in metres; the city lives only behind the glass ("Midnight Glass lives only outside").
import { PAL, clamp, lerp, mix, hash, noise1, scratch, rgba } from '../core/lib.js';
import { stroke, shape, fill, hatch, ellipsePts, rectPts, quad, glow } from '../core/ink.js';
import { Cam, box, poly3, line3, circle3, cylinder, P2 } from '../core/scene3d.js';
import { drawHero, relightFace, flame } from '../core/hero.js';
import { lightPass, bloom } from '../core/light.js';
import { drawCity, CW, HOR } from './city.js';

export const ROOM = { L: -2.7, R: 2.9, B: 5.4, Hc: 2.75, win: { x0: -1.75, x1: 2.15, y0: 0.32, y1: 2.55, m: [-0.45, 0.85] } };
export const LAMP = [-1.25, 0, 4.75], TABLE = { x0: -0.55, x1: 0.75, z0: 2.6, z1: 3.25, y: 0.44 };

export function roomCam(o = {}) { return new Cam({ x: 0.1, y: 1.3, z: -0.3, f: 760, cx: 540, cy: 380, ...o }); }

/**
 * st: { t, lamp (0..1), city: {...drawCity opts}, hero: {x, z, pose, facing, look, props, wrap, hide},
 *       candle: {x, z, k} on the table, phone: k (screen), ambient, faceGlow, clock: [h, m], breath }
 */
export function drawRoom(ctx, cam, st) {
  const t = st.t ?? 0, w = ctx.canvas.width, h = ctx.canvas.height;
  const lamp = st.lamp ?? 0;
  const W0 = ROOM.win;
  // ---------------- 1. outside, through the glass ----------------
  const winPts = P2(cam, [[W0.x0, W0.y0, ROOM.B], [W0.x1, W0.y0, ROOM.B], [W0.x1, W0.y1, ROOM.B], [W0.x0, W0.y1, ROOM.B]]);
  ctx.save();
  ctx.fillStyle = PAL.glass; ctx.fillRect(0, 0, w, h);
  ctx.beginPath(); winPts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); ctx.clip();
  const wl = winPts[0][0], wr = winPts[1][0], s = ((wr - wl) * 1.22) / CW;
  const horizonY = cam.cy + Math.tan(cam.pitch) * cam.f;
  ctx.translate((wl + wr) / 2 - (CW / 2) * s - cam.x * 26 - cam.yaw * 400, horizonY - HOR * s);
  ctx.scale(s, s);
  drawCity(ctx, { t, snow: 0.8, ...(st.city || {}) });
  ctx.restore();
  // glass: faint diagonal reflections + condensation at the bottom edge when cold
  ctx.save(); ctx.beginPath(); winPts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); ctx.clip();
  ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < 4; i++) {
    const x0 = lerp(wl, wr, 0.08 + i * 0.27) + (i % 2) * 30, wd = 18 + (i % 3) * 14;
    ctx.fillStyle = `rgba(190,205,235,${0.05 + (i % 2) * 0.03})`;
    ctx.beginPath(); ctx.moveTo(x0, winPts[2][1]); ctx.lineTo(x0 + wd, winPts[2][1]); ctx.lineTo(x0 + wd - 160, winPts[0][1]); ctx.lineTo(x0 - 160, winPts[0][1]); ctx.fill();
  }
  if (st.frost) {
    const g = ctx.createLinearGradient(0, winPts[0][1] - 90, 0, winPts[0][1]);
    g.addColorStop(0, 'rgba(200,210,225,0)'); g.addColorStop(1, `rgba(200,210,225,${0.25 * st.frost})`);
    ctx.fillStyle = g; ctx.fillRect(wl, winPts[0][1] - 90, wr - wl, 90);
  }
  ctx.restore();

  // ---------------- 2. the room layer (lit separately) ----------------
  const [A, a] = scratch('roomA' + w, w, h);
  a.clearRect(0, 0, w, h);
  const nz = cam.z + 0.4;
  // back wall with the window punched out
  shape(a, P2(cam, [[ROOM.L, 0, ROOM.B], [ROOM.R, 0, ROOM.B], [ROOM.R, ROOM.Hc, ROOM.B], [ROOM.L, ROOM.Hc, ROOM.B]]), { fill: PAL.wall, w: 2, seed: 3 });
  a.save(); a.globalCompositeOperation = 'destination-out'; a.beginPath(); winPts.forEach((p, i) => (i ? a.lineTo(p[0], p[1]) : a.moveTo(p[0], p[1]))); a.closePath(); a.fill(); a.restore();
  // side walls, floor, ceiling
  shape(a, P2(cam, [[ROOM.L, 0, nz], [ROOM.L, 0, ROOM.B], [ROOM.L, ROOM.Hc, ROOM.B], [ROOM.L, ROOM.Hc, nz]]), { fill: mix(PAL.wall, '#5a6276', 0.25), w: 2, seed: 4 });
  shape(a, P2(cam, [[ROOM.R, 0, nz], [ROOM.R, 0, ROOM.B], [ROOM.R, ROOM.Hc, ROOM.B], [ROOM.R, ROOM.Hc, nz]]), { fill: mix(PAL.wall, '#9aa0ae', 0.15), w: 2, seed: 5 });
  shape(a, P2(cam, [[ROOM.L, ROOM.Hc, nz], [ROOM.R, ROOM.Hc, nz], [ROOM.R, ROOM.Hc, ROOM.B], [ROOM.L, ROOM.Hc, ROOM.B]]), { fill: '#6A7186', w: 2, seed: 6 });
  shape(a, P2(cam, [[ROOM.L, 0, nz], [ROOM.R, 0, nz], [ROOM.R, 0, ROOM.B], [ROOM.L, 0, ROOM.B]]), { fill: PAL.floor, w: 2, seed: 7 });
  // floorboards
  for (let x = ROOM.L + 0.24, k = 0; x < ROOM.R; x += 0.24, k++) {
    line3(a, cam, [x, 0, nz + 0.3], [x, 0, ROOM.B], { w: 1.1, alpha: 0.45, seed: 20 + k });
    const jz = 1.2 + hash(k, 3) * 3.6; const p1 = cam.p([x, 0, jz]), p2 = cam.p([x + 0.24, 0, jz]);
    stroke(a, [[p1[0], p1[1]], [p2[0], p2[1]]], { w: 1, alpha: 0.35, seed: 60 + k });
  }
  // skirting + window sill + frame
  line3(a, cam, [ROOM.L, 0.1, ROOM.B], [ROOM.R, 0.1, ROOM.B], { w: 1.4, alpha: 0.7, seed: 31 });
  box(a, cam, [W0.x0 - 0.08, W0.y0 - 0.08, ROOM.B - 0.16], [W0.x1 + 0.08, W0.y0, ROOM.B], { front: '#565B6B', top: '#6E7384', side: '#4B5060' }, { seed: 32, w: 2 });
  const frame = '#3D4150';
  for (const mx of W0.m) box(a, cam, [mx - 0.035, W0.y0, ROOM.B - 0.05], [mx + 0.035, W0.y1, ROOM.B], { front: frame, side: '#33364A', top: frame }, { seed: 33 + mx * 10, w: 1.6 });
  shape(a, P2(cam, [[W0.x0, W0.y0, ROOM.B], [W0.x1, W0.y0, ROOM.B], [W0.x1, W0.y1, ROOM.B], [W0.x0, W0.y1, ROOM.B]]), { w: 3, seed: 34 });
  line3(a, cam, [W0.x0, W0.y1 - 0.05, ROOM.B], [W0.x1, W0.y1 - 0.05, ROOM.B], { w: 1.5, seed: 35, alpha: 0.8 });

  // picture frame on the back wall
  shape(a, P2(cam, [[2.3, 1.42, ROOM.B], [2.75, 1.42, ROOM.B], [2.75, 1.98, ROOM.B], [2.3, 1.98, ROOM.B]]), { fill: '#6B5440', w: 2, seed: 40 });
  shape(a, P2(cam, [[2.36, 1.49, ROOM.B], [2.69, 1.49, ROOM.B], [2.69, 1.91, ROOM.B], [2.36, 1.91, ROOM.B]]), { fill: '#B8AE96', w: 1.4, seed: 41 });
  shape(a, P2(cam, [[2.4, 1.55, ROOM.B], [2.52, 1.75, ROOM.B], [2.6, 1.62, ROOM.B], [2.66, 1.55, ROOM.B]]), { fill: '#7E8C79', w: 1.2, seed: 42 });
  // wall clock on the right wall
  if (st.clock !== false) {
    const cc = [ROOM.R - 0.01, 2.08, 3.7], cr = 0.17;
    const ring = [];
    for (let i = 0; i < 28; i++) { const an = (i / 28) * Math.PI * 2; const q = cam.p([cc[0], cc[1] + Math.sin(an) * cr, cc[2] + Math.cos(an) * cr]); ring.push([q[0], q[1]]); }
    shape(a, ring, { fill: '#E2D8C2', w: 2, seed: 43 });
    const [hh, mm] = st.clock || [9, 10];
    const hand = (ang, L, wd) => { const q = cam.p([cc[0], cc[1] + Math.cos(ang) * L, cc[2] - Math.sin(ang) * L]); const c0 = cam.p(cc); stroke(a, [[c0[0], c0[1]], [q[0], q[1]]], { w: wd, seed: 44 + L * 10 }); };
    hand(((hh % 12) + mm / 60) / 12 * Math.PI * 2, cr * 0.5, 2.2); hand((mm / 60) * Math.PI * 2, cr * 0.78, 1.5);
  }
  // the door (right wall, near)
  {
    const dz0 = 1.35, dz1 = 2.3, dh = 2.08, X = ROOM.R - 0.005;
    shape(a, P2(cam, [[X, 0, dz0 - 0.08], [X, 0, dz1 + 0.08], [X, dh + 0.08, dz1 + 0.08], [X, dh + 0.08, dz0 - 0.08]]), { fill: '#6F6A64', w: 2, seed: 46 });
    shape(a, P2(cam, [[X, 0, dz0], [X, 0, dz1], [X, dh, dz1], [X, dh, dz0]]), { fill: '#7A5B42', w: 2.2, seed: 47 });
    shape(a, P2(cam, [[X, 1.15, dz0 + 0.12], [X, 1.15, dz1 - 0.12], [X, 1.9, dz1 - 0.12], [X, 1.9, dz0 + 0.12]]), { w: 1.3, seed: 48, inkAlpha: 0.6 });
    shape(a, P2(cam, [[X, 0.15, dz0 + 0.12], [X, 0.15, dz1 - 0.12], [X, 0.95, dz1 - 0.12], [X, 0.95, dz0 + 0.12]]), { w: 1.3, seed: 49, inkAlpha: 0.6 });
    const kn = cam.p([X - 0.04, 1.0, dz0 + 0.1]); shape(a, ellipsePts(kn[0], kn[1], 4, 6), { fill: '#C9B48A', w: 1.3, seed: 50 });
    const ph = cam.p([X, 1.55, (dz0 + dz1) / 2]); shape(a, ellipsePts(ph[0], ph[1], 2, 3), { fill: '#222', w: 1, seed: 51 });
  }

  // ---- depth-sorted things ----
  const items = [];
  // bookshelf on the left wall
  items.push({ d: cam.depth([-2.5, 1, 3.9]), f: () => {
    box(a, cam, [ROOM.L, 0, 3.25], [-2.33, 2.1, 4.65], { front: '#5C4532', side: '#6D523C', top: '#7B5F46' }, { seed: 60, w: 2.2 });
    const X = -2.33;
    const shelves = [0.06, 0.52, 0.98, 1.44, 1.9];
    const cols = ['#5E7A63', '#8B5E45', '#3E4C6E', '#B8AA8C', '#6F5B7A', '#A07A3E', '#4D6B5A', '#C7BBA0'];
    shelves.slice(0, 4).forEach((y0, si) => {
      line3(a, cam, [X, y0 + 0.44, 3.27], [X, y0 + 0.44, 4.63], { w: 1.8, seed: 70 + si });
      let z = 3.3, k = 0;
      while (z < 4.55) {
        const bw = 0.045 + hash(k, si) * 0.05, bh = 0.26 + hash(k, si + 9) * 0.12;
        if (hash(k, si + 3) < 0.12) { z += 0.08; k++; continue; }
        const lean = hash(k, si + 5) < 0.1 ? 0.06 : 0;
        poly3(a, cam, [[X, y0 + 0.02, z], [X, y0 + 0.02, z + bw], [X, y0 + bh, z + bw + lean], [X, y0 + bh, z + lean]], { fill: cols[(k + si * 3) % cols.length], w: 1.1, seed: 80 + k + si * 30 });
        z += bw + 0.004; k++;
      }
    });
  } });
  // floor lamp
  items.push({ d: cam.depth(LAMP), f: () => {
    const [lx, , lz] = LAMP;
    cylinder(a, cam, [lx, 0, lz], 0.17, 0.03, { fill: '#3C3A3A', seed: 90 });
    line3(a, cam, [lx, 0.03, lz], [lx, 1.48, lz], { w: 3.2, seed: 91, taper: 0.9 });
    const sh = cylinder(a, cam, [lx, 1.44, lz], 0.25, 0.34, { rTop: 0.16, fill: lamp > 0.05 ? mix('#D8C49A', '#F6D9A0', lamp) : '#BDB197', seed: 92, top: '#8D8371' });
    st._shade = sh;
    line3(a, cam, [lx + 0.12, 1.44, lz - 0.1], [lx + 0.12, 1.25, lz - 0.1], { w: 1, seed: 93, alpha: 0.8 });
  } });
  // plant in the corner
  items.push({ d: cam.depth([2.55, 0.4, 4.95]), f: () => {
    cylinder(a, cam, [2.52, 0, 4.95], 0.17, 0.32, { rTop: 0.2, fill: '#9B5E3F', seed: 100, top: '#4a3528' });
    const base = cam.p([2.52, 0.34, 4.95]), k = cam.k([2.52, 0.34, 4.95]);
    for (let i = 0; i < 9; i++) {
      const an = -Math.PI / 2 + (i - 4) * 0.33 + Math.sin(t * 0.7 + i) * 0.02, L = (0.35 + hash(i, 4) * 0.35) * k;
      const tip = [base[0] + Math.cos(an) * L * 0.6, base[1] + Math.sin(an) * L];
      const mid = [(base[0] + tip[0]) / 2, (base[1] + tip[1]) / 2];
      const leaf = [...quad([base[0], base[1]], [mid[0] - 0.12 * k, mid[1]], tip, 6), ...quad(tip, [mid[0] + 0.12 * k, mid[1]], [base[0], base[1]], 6)];
      shape(a, leaf, { fill: i % 2 ? '#4C7A55' : '#3E6A4C', w: 1.3, seed: 101 + i });
    }
  } });
  // sofa
  items.push({ d: cam.depth([1.25, 0.5, 4.6]), f: () => drawSofa(a, cam, t) });
  // rug + coffee table (+ things on it)
  items.push({ d: 1e5, f: () => {
    const rug = P2(cam, [[-1.4, 0.004, 2.25], [1.6, 0.004, 2.25], [1.6, 0.004, 4.25], [-1.4, 0.004, 4.25]]);
    shape(a, rug, { fill: PAL.rug, w: 1.8, seed: 110 });
    poly3(a, cam, [[-1.25, 0.005, 2.4], [1.45, 0.005, 2.4], [1.45, 0.005, 4.1], [-1.25, 0.005, 4.1]], { w: 1.2, seed: 111, inkAlpha: 0.55 });
    for (let i = 0; i < 4; i++) { const zc = 2.65 + i * 0.42, xc = 0.1; poly3(a, cam, [[xc - 0.35, 0.006, zc], [xc, 0.006, zc - 0.17], [xc + 0.35, 0.006, zc], [xc, 0.006, zc + 0.17]], { w: 1, seed: 112 + i, inkAlpha: 0.4 }); }
  } });
  items.push({ d: cam.depth([0.1, 0.4, 2.9]), f: () => drawTable(a, cam, st, t) });
  // the hero
  if (st.hero && !st.hero.hide) {
    const hr = st.hero, feet = [hr.x ?? 0.2, 0, hr.z ?? 4.6];
    items.push({ d: cam.depth(feet) - (hr.front ?? 0), f: () => {
      const p = cam.p(feet), k = cam.k(feet);
      const s = (k * (hr.height ?? 1.62)) / 7.1;
      // contact shadow
      fill(a, ellipsePts(p[0], p[1], s * 1.25, s * 0.3), 'rgba(30,25,30,0.35)', { seed: 120 });
      st._hero = drawHero(a, p[0], p[1] + (hr.lift ?? 0) * s, s, { t, seed: 7, ...hr });
    } });
  }
  if (st.extra) for (const e of st.extra) items.push({ d: e.d(cam), f: () => e.draw(a, cam, st) });
  items.sort((p, q) => q.d - p.d).forEach((it) => it.f());

  // ---------------- 3. light the room ----------------
  const lights = [];
  const lp = cam.p([LAMP[0], 1.6, LAMP[2]]), lk = cam.k([LAMP[0], 1.6, LAMP[2]]);
  if (lamp > 0) {
    lights.push({ x: lp[0], y: lp[1] + 0.25 * lk, r: 2.3 * lk, color: '#F7C47E', a: 1.0 * lamp, sy: 1.15, falloff: 0.3 });
    lights.push({ x: lp[0] + 0.9 * lk, y: lp[1] + 1.5 * lk, r: 3.6 * lk, color: '#B87A40', a: 0.75 * lamp, sx: 1.5, falloff: 0.25 });
  }
  const cityGlow = st.city ? 1 - clamp((st.city.wave ?? 0) * 1.3) : 1;
  const wc = [(winPts[0][0] + winPts[1][0]) / 2, (winPts[0][1] + winPts[2][1]) / 2];
  lights.push({ x: wc[0], y: wc[1] + 60, r: (winPts[1][0] - winPts[0][0]) * 0.95, color: mix('#3C4C80', '#8A6A50', 0.35 * cityGlow * (st.city?.cityLightSpill ?? 1)), a: st.windowLight ?? 0.5, sy: 0.6, falloff: 0.3 });
  const cands = [];
  if (st.candle && (st.candle.k ?? 1) > 0) {
    const cpos = [st.candle.x ?? 0.25, TABLE.y + 0.2, st.candle.z ?? 2.85];
    const q = cam.p(cpos), kk = cam.k(cpos);
    cands.push({ x: q[0], y: q[1], s: kk * 0.13, kpx: kk, k: st.candle.k ?? 1 });
  }
  for (const f of st._hero?.flames || []) cands.push({ x: f.x, y: f.y, s: f.s * 0.5, kpx: f.s * 9.2, k: st.heroCandle ?? 1 });
  for (const c of cands) lights.push({ x: c.x, y: c.y, r: (st.candleR ?? 2.4) * c.kpx, color: '#E9A45E', a: 1.0 * c.k * (1 + 0.06 * noise1(t * 8, 3)), falloff: 0.2 });
  if (st.phone && st._hero?.screens?.length) { const sc = st._hero.screens[0]; lights.push({ x: (sc[0][0] + sc[2][0]) / 2, y: (sc[0][1] + sc[2][1]) / 2 - 10, r: 260, color: '#F2D7A8', a: 0.9 * st.phone, falloff: 0.3 }); }
  if (st.lights) lights.push(...st.lights(cam));
  lightPass(a, w, h, { ambient: st.ambient ?? mix('#3A4468', '#40496E', lamp), lights, keepAlpha: true });
  // shadows under things (after light so they read as ink washes)
  ctx.drawImage(A, 0, 0);

  // ---------------- 4. emissive + bloom ----------------
  if (lamp > 0 && st._shade) {
    ctx.save(); ctx.globalAlpha = lamp;
    shape(ctx, st._shade.hull, { fill: '#F6D49A', w: 2, seed: 92 });
    ctx.restore();
    bloom(ctx, lp[0], lp[1] + 0.05 * lk, 1.9 * lk, '#F0B15A', 0.45 * lamp);
    bloom(ctx, lp[0], lp[1] + 0.05 * lk, 0.55 * lk, '#FFE2AE', 0.5 * lamp);
  }
  for (const c of cands) flame(ctx, c.x, c.y, c.s * 1.9, t, 5, c.k);
  if (st.phone && st._hero?.screens?.length) {
    for (const sc of st._hero.screens) { ctx.save(); ctx.globalAlpha = st.phone; shape(ctx, sc, { fill: '#F4E2BC', w: 1, seed: 140 }); ctx.restore(); bloom(ctx, (sc[0][0] + sc[2][0]) / 2, (sc[0][1] + sc[2][1]) / 2, 90, '#F0C27A', 0.35 * st.phone); }
  }
  if (st._hero) relightFace(ctx, st._hero, st.faceGlow ?? (lamp > 0.5 ? 0.35 : 0.7));
  if (st.breath && st._hero?.face) breathPuff(ctx, st._hero.face, t, st.breath);
  if (st.after) st.after(ctx, cam, st);
  return { winPts, lampPos: lp };
}

function drawSofa(a, cam, t) {
  const M = PAL.moss, Ms = mix(PAL.moss, '#1d2b22', 0.3), Mt = mix(PAL.moss, '#86a58c', 0.22);
  const x0 = 0.1, x1 = 2.3, z0 = 4.45, z1 = 5.3;
  // back
  box(a, cam, [x0 + 0.05, 0.12, z1 - 0.28], [x1 - 0.05, 0.92, z1 - 0.02], { front: M, side: Ms, top: Mt }, { seed: 150, round: 10, w: 2.4 });
  // seat base
  box(a, cam, [x0 + 0.05, 0.12, z0 + 0.05], [x1 - 0.05, 0.42, z1 - 0.2], { front: Ms, side: Ms, top: M }, { seed: 151, round: 8, w: 2.4 });
  // cushions
  box(a, cam, [x0 + 0.22, 0.4, z0 + 0.06], [1.2, 0.54, z1 - 0.3], { front: M, side: Ms, top: Mt }, { seed: 152, round: 9, w: 2.2 });
  box(a, cam, [1.2, 0.4, z0 + 0.06], [x1 - 0.22, 0.54, z1 - 0.3], { front: M, side: Ms, top: Mt }, { seed: 153, round: 9, w: 2.2 });
  // arms
  box(a, cam, [x0, 0.12, z0], [x0 + 0.24, 0.68, z1], { front: M, side: Ms, top: Mt }, { seed: 154, round: 10, w: 2.4 });
  box(a, cam, [x1 - 0.24, 0.12, z0], [x1, 0.68, z1], { front: M, side: Ms, top: Mt }, { seed: 155, round: 10, w: 2.4 });
  // legs
  for (const lx of [x0 + 0.08, x1 - 0.08]) line3(a, cam, [lx, 0.12, z0 + 0.06], [lx, 0, z0 + 0.08], { w: 3, seed: 156 + lx });
  // pillows
  for (const [px, col] of [[0.55, '#8E8A70'], [1.95, '#9A9479']]) {
    const c = cam.p([px, 0.72, z1 - 0.32]), k = cam.k([px, 0.72, z1 - 0.32]);
    const pts = [[c[0] - 0.24 * k, c[1] - 0.17 * k], [c[0] + 0.22 * k, c[1] - 0.2 * k], [c[0] + 0.26 * k, c[1] + 0.16 * k], [c[0] - 0.22 * k, c[1] + 0.19 * k]];
    shape(a, pts, { fill: col, w: 2, seed: 160 + px * 10, round: 0.08 * k });
    stroke(a, [[c[0] - 0.05 * k, c[1] - 0.08 * k], [c[0] + 0.06 * k, c[1] + 0.06 * k]], { w: 1.2, seed: 162 + px, alpha: 0.6 });
  }
  void t;
}

function drawTable(a, cam, st, t) {
  const T = TABLE;
  const wood = PAL.wood, wd = PAL.woodDark;
  for (const [lx, lz] of [[T.x0 + 0.06, T.z0 + 0.06], [T.x1 - 0.06, T.z0 + 0.06], [T.x0 + 0.06, T.z1 - 0.06], [T.x1 - 0.06, T.z1 - 0.06]]) box(a, cam, [lx - 0.03, 0, lz - 0.03], [lx + 0.03, T.y - 0.05, lz + 0.03], { front: wd, side: wd, top: wd }, { seed: 170 + lx * 9 + lz, w: 1.6 });
  box(a, cam, [T.x0, T.y - 0.06, T.z0], [T.x1, T.y, T.z1], { front: wd, side: wd, top: wood }, { seed: 175, round: 4, w: 2.2 });
  // open book
  if (st.book !== false) {
    const y = T.y + 0.005;
    poly3(a, cam, [[-0.35, y, 2.75], [-0.02, y + 0.012, 2.72], [-0.02, y + 0.012, 3.05], [-0.38, y, 3.08]], { fill: '#E6DCC6', w: 1.4, seed: 180 });
    poly3(a, cam, [[-0.02, y + 0.012, 2.72], [0.3, y, 2.77], [0.33, y, 3.08], [-0.02, y + 0.012, 3.05]], { fill: '#EDE4D0', w: 1.4, seed: 181 });
    for (let i = 0; i < 4; i++) { line3(a, cam, [-0.3, y + 0.01, 2.8 + i * 0.06], [-0.08, y + 0.012, 2.79 + i * 0.06], { w: 0.9, alpha: 0.5, seed: 182 + i }); line3(a, cam, [0.04, y + 0.012, 2.8 + i * 0.06], [0.26, y + 0.01, 2.81 + i * 0.06], { w: 0.9, alpha: 0.5, seed: 186 + i }); }
  }
  // mug with the swirl
  if (st.mug !== false) {
    const mc = [0.52, T.y, 2.92];
    cylinder(a, cam, mc, 0.055, 0.11, { fill: '#D7D1C6', seed: 190, top: '#5B4637' });
    const c = cam.p([0.52, T.y + 0.055, 2.865]), k = cam.k(mc);
    stroke(a, ellipsePts(c[0], c[1], 0.02 * k, 0.022 * k, 0, Math.PI * 1.7), { w: 1.1, seed: 191 });
    const hnd = cam.p([0.585, T.y + 0.06, 2.92]); stroke(a, ellipsePts(hnd[0] + 0.012 * k, hnd[1], 0.018 * k, 0.03 * k, -Math.PI / 2, Math.PI / 2), { w: 1.6, seed: 192 });
  }
  // candle on a saucer
  if (st.candle) {
    const cx = st.candle.x ?? 0.25, cz = st.candle.z ?? 2.85;
    cylinder(a, cam, [cx, T.y, cz], 0.075, 0.012, { fill: '#9C8E76', seed: 195 });
    const melt = st.candle.melt ?? 0;
    cylinder(a, cam, [cx, T.y + 0.012, cz], 0.032, 0.17 - melt * 0.09, { fill: '#EFE6D2', seed: 196, top: '#E2D6BE' });
    st.candle._top = [cx, T.y + 0.012 + 0.17 - melt * 0.09, cz];
  }
  void t;
}

export function breathPuff(ctx, face, t, amt = 1) {
  const per = 3.4, ph = (t % per) / per;
  if (ph > 0.55) return;
  const u = ph / 0.55, x = face.x + face.r * (0.9 + u * 1.6), y = face.y + face.r * (0.45 - u * 0.5);
  ctx.save(); ctx.globalAlpha = amt * Math.sin(u * Math.PI) * 0.55;
  for (let i = 0; i < 3; i++) { ctx.fillStyle = '#E8E6E2'; ctx.beginPath(); ctx.ellipse(x + i * face.r * 0.32 * u, y - i * face.r * 0.1, face.r * (0.18 + u * 0.3 - i * 0.04), face.r * (0.12 + u * 0.18), 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}
