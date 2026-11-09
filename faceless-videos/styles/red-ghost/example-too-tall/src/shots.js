// TOO TALL — shot list. 1994 Dallas video-store case, told through the store camera that first cleared the killer.
// Every shot is a camera move in one of two sets (the store, the institution), keyed to the narration's sentences/words.
import * as THREE from 'three';
import { stand, local, ldir, V } from './core/figure.js';
import { caption, hook, stamp, sfxWord, toScreen, CAP_Y, CREAM } from './core/text.js';
import { T, s as S0, e as E0, w as W0 } from './core/timing.js';
import { W, H, LAND, UI } from './core/engine.js';
import { STORE } from './sets/store.js';
import { INST, OX } from './sets/inst.js';
import { walk, sit, handsUp, handsHidden, pathAt, pathLen, travel } from './poses.js';

const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const sm = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
const ease = (x) => { x = clamp(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const span = (t, a, b) => sm((t - a) / (b - a));
const lerp = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);
const lerpV = (a, b, k) => a.clone().lerp(b, k);
/** dolly between two framings: a = [camPos, lookAt] at the start, b = [camPos, lookAt] at the end */
const dolly = (a, b, k, fov = [50, 50], o = {}) => ({ pos: lerp(a[0], b[0], k), look: lerp(a[1], b[1], k), fov: fov[0] + (fov[1] - fov[0]) * k, ...o });
/** the same move written as a position path and a look path: P = [posA, posB], L = [lookA, lookB] */
const move = (P, L, k, fov = [50, 50], o = {}) => dolly([P[0], L[0]], [P[1], L[1]], k, fov, o);
const X = (x) => x + OX;                     // institution-local x → world x
const pulse = (t, t0, k = 22) => (t >= t0 ? Math.exp(-(t - t0) * k) : 0);

// ---------- where things are ----------
const D = STORE.door;
const P_IN = [[3.1, -10.6], [3.1, -6.3], [2.55, -4.95]];          // the walk in, seen by the camera (S01)
const D_FREEZE = 10.6 - 6.86;                                       // in the doorway: the still everyone measured
const BRAD_REG = [2.0, -3.22], JAMES_AISLE = [-0.55, -0.95];
const SAFE_J = [3.66, 7.42], SAFE_B = [3.62, 6.72], GUN_OFF = [2.3, 6.95];
const KEYPAD = V(4.14, 1.08, 7.47), HANDLE = V(4.13, 0.8, 7.35);
const CCTV = { pos: STORE.cam.toArray(), look: [3.05, 1.05, -6.9] };

/** glass door swings out as someone walks through it (z of the walker), closes behind them */
const doorFor = (z, dir = 1) => 1.45 * span(z * dir, -8.15 * dir, -7.55 * dir) * (1 - span(z * dir, -6.1 * dir, -4.8 * dir));

// ---------- poses ----------
function gunIn(w, t, t0, pts = P_IN, v = 1.25, freezeAt = null) {
  const L = pathLen(pts); let d = travel(t, t0, v, L);
  if (freezeAt != null) d = Math.min(d, freezeAt);
  const amp = clamp((L - d) / 0.35) * clamp(d / 0.05 + (d > 0 ? 1 : 0));
  const P = handsHidden(walk(pts, d, t, { amp: freezeAt != null && d >= freezeAt ? 1 : amp, nod: 6 }));
  w.gun.visible = true; w.gun.pose(P);
  return { P, d, pos: pathAt(pts, d).pos };
}
function bradRegister(t, o = {}) {
  const pos = BRAD_REG, yaw = 180;
  const P = stand(pos, yaw, t, { contra: 0.4, nod: 16, lean: 7 });
  const k = 0.005 * Math.sin(t * 6.5);
  P.ik.handL = { target: V(1.86, 1.14 + k, -3.66), pole: ldir(yaw, 1, -0.5, -0.3), rot: [-60, 0, 0] };
  P.ik.handR = { target: V(2.13, 1.13 - k, -3.68), pole: ldir(yaw, -1, -0.5, -0.3), rot: [-60, 0, 0] };
  P.look = V(2.0, 1.02, -3.85);
  if (o.up) { P.look = lerpV(P.look, o.up, o.k ?? 1); P.b.chest = [P.b.chest[0] - 4 * (o.k ?? 1), P.b.chest[1], P.b.chest[2]]; }
  return P;
}
function jamesShelf(t) {
  const pos = JAMES_AISLE, yaw = -90;
  const P = stand(pos, yaw, t, { contra: -0.6, nod: 8 });
  const reach = 0.5 + 0.5 * Math.sin(t * 1.3);
  P.ik.handR = { target: V(-0.98, 1.2 + 0.08 * reach, -1.05 - 0.05 * reach), pole: ldir(yaw, -1, -0.8, 0.2), rot: [-70, 0, 0] };
  P.ik.handL = { target: local(pos, yaw, 0.08, 1.12, 0.24), pole: ldir(yaw, 1, -0.6, -0.3), rot: [-80, 0, 30] };
  P.look = V(-1.02, 1.2, -1.0);
  return P;
}
function atSafe(pos, yaw, t, up = 1, o = {}) {
  const P = handsUp(stand(pos, yaw, t * 1.4, { contra: 0.2, nod: o.nod ?? 6, lean: o.lean ?? 2 }), up);
  if (o.look) P.look = o.look;
  return P;
}
/** pose blend (for standing up out of a chair) */
function blendPose(A, B, k) {
  const L = (a, b) => (a || [0, 0, 0]).map((v, i) => v + ((b || [0, 0, 0])[i] - v) * k);
  const P = { pos: L(A.pos, B.pos), yaw: A.yaw + (B.yaw - A.yaw) * k, root: { pos: L(A.root.pos, B.root.pos), rot: L(A.root.rot, B.root.rot) }, b: {}, ik: {} };
  for (const n of new Set([...Object.keys(A.b), ...Object.keys(B.b)])) P.b[n] = L(A.b[n], B.b[n]);
  for (const n of new Set([...Object.keys(A.ik), ...Object.keys(B.ik)])) {
    const a = A.ik[n], b = B.ik[n];
    if (a && b) P.ik[n] = { target: a.target.clone().lerp(b.target, k), pole: a.pole && b.pole ? a.pole.clone().lerp(b.pole, k).normalize() : (k < 0.5 ? a.pole : b.pole), rot: L(a.rot, b.rot) };
    else P.ik[n] = k < 0.5 ? a : b;
  }
  if (A.look && B.look) P.look = A.look.clone().lerp(B.look, k); else P.look = k < 0.5 ? A.look : B.look;
  return P;
}
const sidesIK = (P) => { P.ik.handL = { target: local(P.pos, P.yaw, 0.21, 0.86, 0.02), pole: ldir(P.yaw, 0.3, 0, -1) }; P.ik.handR = { target: local(P.pos, P.yaw, -0.21, 0.86, 0.02), pole: ldir(P.yaw, -0.3, 0, -1) }; return P; };

// ---------- 2D overlays ----------
const F_HUD = () => `bold ${Math.round(40 * UI)}px "Courier New", Menlo, monospace`;
function cctvHud(ctx, o = {}) {
  ctx.save(); ctx.font = F_HUD(); ctx.textBaseline = 'top'; ctx.fillStyle = 'rgba(238,238,228,0.92)';
  ctx.shadowColor = 'rgba(255,255,255,0.35)'; ctx.shadowBlur = 8;
  const m = 64 * UI, top = (LAND ? 50 : 150);
  ctx.textAlign = 'left'; ctx.fillText(o.cam ?? 'CAM 1', m, top);
  ctx.textAlign = 'right'; ctx.fillText(o.date ?? '04-04-94', W - m, top);
  if (o.pause) { const x = m, y = top + 60 * UI; ctx.fillRect(x, y, 12 * UI, 34 * UI); ctx.fillRect(x + 22 * UI, y, 12 * UI, 34 * UI); }
  ctx.restore();
}
const P2 = (w, x, y, z) => toScreen(w.camera, V(x, y, z));
function seg(ctx, a, b, col, lw, dash = null) { ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.setLineDash(dash || []); ctx.stroke(); ctx.setLineDash([]); }
/** measuring overlay on the doorway still: ruler on the right jamb, E = the 1994 estimate line, D = the suspect's real height */
function measure(ctx, w, o) {
  ctx.save(); ctx.lineCap = 'round';
  const z = -6.86, xr = D.x + D.w / 2 + 0.07;
  if (o.guides > 0) {  // 1998: the room's geometry traced first (jambs, header, floor lines)
    const g = o.guides, col = 'rgba(238,238,228,0.55)', lw = 2 * UI;
    const lines = [[[D.x - D.w / 2 - 0.05, 0, -7.0], [D.x - D.w / 2 - 0.05, 2.2, -7.0]], [[xr, 0, -7.0], [xr, 2.2, -7.0]], [[D.x - D.w / 2 - 0.05, 2.2, -7.0], [xr, 2.2, -7.0]],
      [[1.8, 0, -6.6], [4.6, 0, -6.6]], [[1.8, 0, -6.0], [4.6, 0, -6.0]], [[2.4, 0, -6.95], [2.4, 0, -4.6]], [[3.0, 0, -6.95], [3.0, 0, -4.6]], [[3.6, 0, -6.95], [3.6, 0, -4.6]]];
    lines.forEach((L, i) => { const k = clamp(g * lines.length - i); if (k <= 0) return; const a = P2(w, ...L[0]), b0 = P2(w, ...L[1]); seg(ctx, a, { x: a.x + (b0.x - a.x) * k, y: a.y + (b0.y - a.y) * k }, col, lw, [10 * UI, 8 * UI]); });
  }
  if (o.ruler > 0) {
    const top = 2.2 * o.ruler, a = P2(w, xr, 0, -7.0), b = P2(w, xr, top, -7.0);
    seg(ctx, a, b, 'rgba(240,240,232,0.95)', 3 * UI);
    for (let h = 0; h <= top + 1e-6; h += 0.1) { const p = P2(w, xr, h, -7.0), lg = Math.round(h * 10) % 5 === 0; seg(ctx, p, { x: p.x + (lg ? 30 : 15) * UI, y: p.y }, 'rgba(240,240,232,0.95)', (lg ? 3 : 2) * UI); }
  }
  const hl = (h, col, lw, dash, al, glowC) => {
    if (al <= 0 || h == null) return;
    const a = P2(w, 2.55, h, z), b = P2(w, xr + 0.04, h, z);
    ctx.globalAlpha = al;
    if (glowC) { ctx.shadowColor = glowC; ctx.shadowBlur = 22; }
    seg(ctx, a, b, col, lw, dash); seg(ctx, { x: a.x, y: a.y - 12 * UI }, { x: a.x, y: a.y + 12 * UI }, col, lw);
    ctx.shadowBlur = 0; ctx.globalAlpha = 1;
  };
  hl(o.D, 'rgba(242,226,190,0.95)', 3 * UI, [14 * UI, 10 * UI], o.Da ?? 0);
  hl(o.E, o.match ? CREAM : 'rgba(250,250,244,1)', (o.match ? 5 : 4) * UI, null, o.Ea ?? 0, o.match ? 'rgba(255,190,120,0.9)' : null);
  if (o.gap > 0 && o.E != null && o.D != null) {  // bracket showing the difference
    const a = P2(w, xr + 0.22, o.E, z), b = P2(w, xr + 0.22, o.D, z);
    ctx.globalAlpha = o.gap; seg(ctx, a, b, 'rgba(250,250,244,0.9)', 3 * UI); seg(ctx, { x: a.x - 10 * UI, y: a.y }, { x: a.x + 10 * UI, y: a.y }, 'rgba(250,250,244,0.9)', 3 * UI); seg(ctx, { x: b.x - 10 * UI, y: b.y }, { x: b.x + 10 * UI, y: b.y }, 'rgba(250,250,244,0.9)', 3 * UI); ctx.globalAlpha = 1;
  }
  ctx.restore();
}
const CCTV_LOOK = (o = {}) => ({ mono: 1, scan: 1, grain: 0.05, bloom: 0.3, bloomThreshold: 0.55, vignette: 0.62, exposure: 1.9, ...o });

// ---------- shots ----------
export function buildShots() {
  const s = (i) => S0(i), e = (i) => E0(i), wd = (i, x) => W0(i, x);
  const SH = [], cues = [];
  const add = (id, start, note, set, setup, over, o = {}) => SH.push({ id, start, note, set, setup, over, ...o });
  const cue = (t, type, o = {}) => cues.push({ t: +t.toFixed(3), type, ...o });

  // timeline anchors
  const tWalk0 = 0.25;                                    // the walk in starts (CCTV)
  const tFreeze = tWalk0 + D_FREEZE / 1.25 + 0.175;        // he reaches the doorway → the still
  const tStop = e(2) + 0.12;                               // tape stops (roll → black), title in the gap
  const tGunIn = s(6) - 0.55;                              // S07 walk-in start
  const tMarch = s(7) - 0.9;
  const tRun = s(9) + 0.12;
  const bangs = [e(10) + 0.14, e(10) + 0.44];
  const tBlack = e(11) + 0.28;
  const tLeave = s(12) - 1.5;
  const tCaught = wd(15, 'caught') - 0.32;
  const tMatch = wd(17, 'height') - 0.05;
  const tEnd = T.dur + 0.9;

  // S01 — the store camera: a man walks in; the tape freezes on him in the doorway
  add('S01', 0, 'CCTV · the walk in', 'store', (w, lt, t) => {
    const { pos } = gunIn(w, t, tWalk0, P_IN, 1.25, D_FREEZE);
    w.store.frontDoor.rotation.y = doorFor(pos[1]);
    return { cam: { ...CCTV, fov: 64, shake: 0 }, ...CCTV_LOOK(), black: 1 - sm(lt / 0.35) };
  }, (ctx, w, lt, t) => cctvHud(ctx, { pause: t >= tFreeze }), { step: 3 });

  // S02 — frozen frame, push in; a ruler draws up the door jamb
  add('S02', s(1) - 0.12, 'CCTV still · ruler', 'store', (w, lt, t) => {
    const { pos } = gunIn(w, 99, tWalk0, P_IN, 1.25, D_FREEZE); w.store.frontDoor.rotation.y = doorFor(pos[1]);
    const k = ease(lt / (s(2) - s(1)));
    return { cam: { ...CCTV, look: lerp(CCTV.look, [3.12, 1.05, -6.9], k), fov: 64 - 16 * k, shake: 0 }, ...CCTV_LOOK() };
  }, (ctx, w, lt, t) => {
    cctvHud(ctx, { pause: true });
    measure(ctx, w, { ruler: span(t, s(1) + 0.1, e(1) + 0.1) });
  });

  // S03 — "looked too tall": the estimate line rises above his head; the tape rolls out
  add('S03', s(2) - 0.12, 'too tall · tape rolls', 'store', (w, lt, t) => {
    const { pos } = gunIn(w, 99, tWalk0, P_IN, 1.25, D_FREEZE); w.store.frontDoor.rotation.y = doorFor(pos[1]);
    const tear = span(t, tStop - 0.35, tStop + 0.2);
    return { cam: { ...CCTV, look: [3.12, 1.05, -6.9], fov: 48 - 3 * ease(lt / 1.9), shake: 0 }, ...CCTV_LOOK({ tear: tear * 0.8 }), black: span(t, tStop, tStop + 0.12),
      post: (ctx) => { const a = span(t, tStop + 0.12, tStop + 0.22) * (1 - span(t, s(3) - 0.5, s(3) - 0.32)); if (a > 0) hook(ctx, ['TOO', 'TALL'], 1, { y: H * 0.47, alpha: a, size: (LAND ? 120 : 170) }); } };
  }, (ctx, w, lt, t) => {
    cctvHud(ctx, { pause: true });
    const head = w.gun.at('head', V(0, 0.2, 0)).y;
    const up = ease(span(t, wd(2, 'tape') - 0.1, wd(2, 'tall') + 0.1));
    measure(ctx, w, { ruler: 1, D: head, Da: span(t, s(2), s(2) + 0.3), E: head + 0.24 * up, Ea: span(t, s(2) + 0.2, s(2) + 0.45), gap: up });
  });

  // S04 — the store from the parking lot, around midnight
  add('S04', s(3) - 0.32, 'exterior · sign', 'store', (w, lt, t) => {
    w.brad.visible = true; w.brad.pose(bradRegister(t)); w.brad.gain = 0.9;
    w.james.visible = true; w.james.pose(jamesShelf(t)); w.james.gain = 0.8;
    const k = ease(lt / (s(4) - s(3) + 0.22));
    return { cam: dolly([[0.6, 3.4, -19.5], [0.0, 3.0, -6.8]], [[0.45, 2.3, -17.4], [0.4, 2.55, -6.8]], k, [46, 45], { shake: 0.06 }), exposure: 1.0, black: 1 - sm(lt / 0.25) };
  }, (ctx, w, lt, t) => {
    stamp(ctx, 'APRIL 4, 1994', { y: LAND ? 170 : 330, size: LAND ? 96 : 128, alpha: span(t, s(3) - 0.1, s(3) + 0.35) * (1 - span(t, e(3) + 0.05, e(3) + 0.3)), track: 0.04 });
  });

  // S05 — at the glass: two clerks closing up inside
  add('S05', s(4) - 0.1, 'through the glass · two clerks', 'store', (w, lt, t) => {
    w.brad.visible = true; w.brad.pose(bradRegister(t));
    const jp = [[-0.5, 1.9], [-0.5, -0.4]], L = pathLen(jp), d = travel(t, s(4) - 0.4, 0.95, L);
    const P = walk(jp, d, t, { amp: clamp((L - d) / 0.4) });
    P.ik.handL = { target: local(P.pos, P.yaw, 0.12, 1.1, 0.26), pole: ldir(P.yaw, 1, -0.6, -0.3), rot: [-80, 0, 20] }; P.ik.handR = { target: local(P.pos, P.yaw, -0.12, 1.1, 0.26), pole: ldir(P.yaw, -1, -0.6, -0.3), rot: [-80, 0, -20] };
    w.james.visible = true; w.james.pose(P); w.james.gain = 0.85;
    const k = ease(lt / (s(5) - s(4)));
    return { cam: dolly([[1.9, 1.5, -11.6], [1.4, 1.25, -3.0]], [[1.7, 1.42, -8.6], [1.0, 1.2, -3.0]], k, [40, 38], { shake: 0.08 }) };
  });

  // S06 — Brad at the register (close, from the customer side), then James on the shelves
  add('S06', s(5) - 0.1, 'Brad · register', 'store', (w, lt, t) => {
    w.brad.visible = true; w.brad.pose(bradRegister(t));
    const k = ease(lt / (wd(5, 'james') - s(5)));
    return { cam: move([[0.95, 1.12, -5.6], [1.12, 1.14, -5.2]], [[2.05, 1.3, -3.25], [2.05, 1.32, -3.25]], k, [34, 31], { shake: 0.09 }) };
  });
  add('S06b', wd(5, 'james') - 0.15, 'James · shelving', 'store', (w, lt, t) => {
    w.james.visible = true; w.james.pose(jamesShelf(t));
    w.brad.visible = true; w.brad.pose(bradRegister(t)); w.brad.gain = 0.25;
    const k = ease(lt / (s(6) - wd(5, 'james')));
    return { cam: move([[1.0, 1.32, -3.45], [0.85, 1.32, -3.15]], [[-0.62, 1.22, -0.95], [-0.62, 1.24, -0.95]], k, [40, 37], { shake: 0.09 }) };
  });

  // S07 — over Brad's shoulder: the door swings open, a man walks in
  add('S07', s(6) - 0.2, 'walks in · over the counter', 'store', (w, lt, t) => {
    const pts = [[3.15, -10.2], [3.15, -6.2], [2.5, -4.95]];
    const { pos } = gunIn(w, t, tGunIn, pts, 1.3);
    w.store.frontDoor.rotation.y = doorFor(pos[1]);
    const look = span(t, s(6) + 0.6, s(6) + 1.3);
    w.brad.visible = true; w.brad.pose(bradRegister(t, { up: V(pos[0], 1.5, pos[1]), k: look })); w.brad.gain = 0.16;
    const k = ease(lt / (s(7) - s(6) + 0.12));
    return { cam: dolly([[2.12, 1.62, -2.72], [3.2, 1.3, -7.0]], [[2.08, 1.55, -2.95], [3.0, 1.3, -6.0]], k, [46, 44], { shake: 0.1 }) };
  }, (ctx, w, lt, t) => {
    const tDing = SH.anchors?.tDing ?? 0; const p = P2(w, D.x + 0.1, D.h + 0.25, D.z ?? -7.0);
    sfxWord(ctx, 'Ding.', p.x + 70 * UI, p.y - 40 * UI, t - tDing, { size: 66, rot: -0.06, alpha: 0.85 });
  });

  // S08 — the office: the clerks come in with their hands up; he's behind them in the doorway
  const PJ = [[2.55, 3.85], [2.55, 5.5], [3.2, 6.6], SAFE_J], PB = [[2.55, 2.95], [2.55, 5.4], SAFE_B], PG = [[2.55, 2.05], [2.55, 5.3], GUN_OFF];
  const marchJ = (t) => { const L = pathLen(PJ), d = travel(t, tMarch, 1.05, L); return handsUp(walk(PJ, d, t, { amp: clamp((L - d) / 0.4), nod: 8 }), 1); };
  const marchB = (t) => { const L = pathLen(PB), d = travel(t, tMarch + 0.6, 1.05, L); return handsUp(walk(PB, d, t, { amp: clamp((L - d) / 0.4), nod: 8 }), 1); };
  const marchG = (t) => { const L = pathLen(PG), d = travel(t, tMarch + 1.15, 1.0, L); return handsHidden(walk(PG, d, t, { amp: clamp((L - d) / 0.4), nod: 4 })); };
  add('S08', s(7) - 0.08, 'office · marched in', 'store', (w, lt, t) => {
    w.james.visible = true; w.james.pose(marchJ(t)); w.james.gain = 0.7;
    w.brad.visible = true; w.brad.pose(marchB(t)); w.brad.gain = 0.7;
    w.gun.visible = true; w.gun.pose(marchG(t));
    const k = ease(lt / (s(8) - s(7)));
    return { cam: dolly([[4.62, 1.62, 8.62], [2.55, 1.25, 5.0]], [[4.5, 1.58, 8.45], [2.6, 1.2, 5.2]], k, [52, 50], { shake: 0.1 }) };
  });

  // S09 — the safe: keypad, then the handle won't turn
  const tKeys = [s(8) - 0.05, s(8) + 0.22, s(8) + 0.46, s(8) + 0.7];
  const tGrab = s(8) + 0.95, tClunk = wd(8, 'lock') + 0.05;
  add('S09', s(8) - 0.2, 'safe · keypad · handle', 'store', (w, lt, t) => {
    const P = atSafe(SAFE_J, 90, t, 0, { nod: 18, lean: 8, look: KEYPAD });
    const keyOff = [[0.03, 0.02], [-0.03, -0.01], [0.0, -0.03], [0.03, 0.0]];
    let ki = 0; for (let i = 0; i < 4; i++) if (t > tKeys[i] - 0.1) ki = i;
    const press = tKeys.reduce((a, tk) => a + Math.max(0, 1 - Math.abs(t - tk) / 0.08), 0);
    let tgt = V(KEYPAD.x - 0.035 + 0.02 * press, KEYPAD.y + keyOff[ki][1], KEYPAD.z + keyOff[ki][0]);
    const g = span(t, tGrab, tGrab + 0.35); tgt = lerpV(tgt, V(HANDLE.x - 0.06, HANDLE.y + 0.12, HANDLE.z + 0.02), g);
    P.ik.handR = { target: tgt, pole: ldir(90, -1, -0.6, -0.2), rot: [-75, 0, 0] };
    P.ik.handL = { target: local(SAFE_J, 90, 0.24, 1.32, 0.16), pole: ldir(90, 1, -0.6, -0.3) };
    w.james.visible = true; w.james.pose(P);
    w.store.handle.rotation.x = -0.28 * span(t, tGrab + 0.35, tClunk) + 0.04 * Math.sin((t - tClunk) * 60) * pulse(t, tClunk, 9);
    w.brad.visible = true; w.brad.pose(atSafe(SAFE_B, 95, t, 1, { look: KEYPAD })); w.brad.gain = 0.22;
    const k = ease(lt / (wd(8, 'nothing') - s(8) + 0.1));
    return { cam: move([[3.92, 1.34, 6.74], [3.97, 1.24, 6.92]], [[4.12, 1.0, 7.4], [4.14, 1.0, 7.36]], k, [42, 35], { shake: 0.1 + 0.2 * pulse(t, tClunk, 10) }), exposure: 1.15 };
  }, (ctx, w, lt, t) => {
    const p = P2(w, HANDLE.x - 0.05, HANDLE.y + 0.05, HANDLE.z - 0.18);
    sfxWord(ctx, 'Clunk.', p.x, p.y, t - tClunk, { size: 66, rot: -0.05 });
  });

  // S10 — the time lock dial: nothing will open it tonight
  add('S10', wd(8, 'nothing') - 0.1, 'time lock dial', 'store', (w, lt, t) => {
    const P = atSafe(SAFE_J, 90, t, 0.2, { nod: 12, look: V(4.17, 1.1, 7.25) });
    P.ik.handR = { target: V(HANDLE.x - 0.07, HANDLE.y + 0.1, HANDLE.z + 0.02), pole: ldir(90, -1, -0.6, -0.2), rot: [-75, 0, 0] };
    w.james.visible = true; w.james.pose(P); w.james.gain = 0.85;
    w.store.tlHand.rotation.x = -0.9 - 0.02 * lt;
    const k = ease(lt / (s(9) - wd(8, 'nothing') - 0.05));
    return { cam: move([[3.97, 1.13, 6.97], [4.02, 1.1, 7.06]], [[4.17, 1.08, 7.25], [4.17, 1.08, 7.25]], k, [36, 29], { shake: 0.07 }), exposure: 1.2 };
  });

  // S11 — James runs for the door
  const PR = [SAFE_J, [3.3, 6.35], [2.62, 5.45], [2.5, 4.6], [1.45, 3.95]];
  add('S11', s(9) - 0.15, 'run for the door', 'store', (w, lt, t) => {
    const L = pathLen(PR), d = travel(t, tRun, 3.6, L, 0.3);
    const P = walk(PR, d, t, { run: true, amp: clamp(d / 0.15 + 0.3) * clamp((L - d) / 0.1 + 0.4), look: V(2.55, 1.5, 4.5) });
    w.james.visible = true; w.james.pose(P);
    const turn = span(t, tRun + 0.1, tRun + 0.7);
    const G = handsHidden(stand(GUN_OFF, 90 + 82 * turn, t, { contra: 0.3, nod: 4 }), { raise: 0.2 * turn, fwd: 0.15 * turn });
    G.look = lerpV(V(3.8, 1.5, 7.2), V(2.55, 1.5, 4.8), turn); w.gun.visible = true; w.gun.pose(G); w.gun.gain = 0.38;
    w.brad.visible = true; w.brad.pose(atSafe(SAFE_B, 90 - 60 * turn, t, 1)); w.brad.gain = 0.25;
    const k = ease(lt / (s(10) - s(9)));
    return { cam: move([[2.35, 1.48, 3.4], [2.32, 1.45, 3.55]], [[3.3, 1.15, 7.2], [3.0, 1.12, 6.4]], k, [52, 54], { shake: 0.18 }) };
  });

  // S12 — the shop floor, empty. Two flashes in the office doorway; the red light by the door goes out.
  add('S12', s(10) - 0.05, 'doorway · two flashes', 'store', (w, lt, t) => {
    w.james.visible = true; w.james.pose(stand([1.45, 3.95], -120, t, { lean: 10 })); w.james.gain = 1 - span(t, bangs[1] + 0.35, bangs[1] + 1.3);
    const f = pulse(t, bangs[0], 26) + pulse(t, bangs[1], 26);
    w.store.oceil.intensity = 0.5 + 40 * f; w.store.dlamp.intensity = 1.5 + 6 * f;
    return { cam: move([[2.95, 0.55, -1.6], [2.9, 0.6, -1.0]], [[2.6, 1.0, 5.0], [2.6, 1.0, 5.0]], ease(lt / 2.2), [31, 30], { shake: 0.08 + 0.35 * f }), flash: 0.05 * f };
  }, (ctx, w, lt, t) => {
    bangs.forEach((b, i) => { const p = P2(w, 2.55 + (i ? 0.32 : -0.28), 1.9 - i * 0.35, 5.0); sfxWord(ctx, 'Bang.', p.x, p.y, (t - b) * (t - b < 1.3 ? 1 : 0), { size: [72, 62][i], rot: -0.06, alpha: [0.9, 0.75][i] }); });
  });

  // S13 — over his shoulder: he turns to Brad. Cut to black.
  add('S13', s(11) - 0.3, 'turns to Brad · black', 'store', (w, lt, t) => {
    const turn = span(t, s(11) + 0.1, wd(11, 'brad') + 0.2);
    const G = handsHidden(stand(GUN_OFF, 172 - 78 * turn, t, { contra: 0.3, nod: 4 }), { raise: 0.25, fwd: 0.2 });
    G.look = lerpV(V(2.55, 1.5, 5.0), V(3.85, 1.55, 6.85), turn); w.gun.visible = true; w.gun.pose(G); w.gun.gain = 0.3;
    const B = atSafe([3.8, 6.8], -90, t * 1.6, 0.85, { look: V(2.3, 1.55, 6.95), lean: -3 }); B.root.pos[0] += 0.02 * Math.sin(t * 9);
    w.brad.visible = true; w.brad.pose(B);
    const k = ease(lt / (tBlack - s(11) + 0.3));
    return { cam: move([[1.2, 1.78, 7.78], [1.42, 1.74, 7.62]], [[3.8, 1.32, 6.8], [3.8, 1.38, 6.8]], k, [40, 35], { shake: 0.09 }), black: span(t, tBlack, tBlack + 0.18) };
  });

  // S14 — outside: he walks away across the lot. $392.
  const PL = [[3.1, -6.3], [3.1, -8.6], [1.7, -12.0], [-1.6, -16.9]];
  add('S14', s(12) - 0.25, 'walks away · $392', 'store', (w, lt, t) => {
    const L = pathLen(PL), d = travel(t, tLeave, 1.35, L);
    const P = handsHidden(walk(PL, d, t, { amp: clamp((L - d) / 0.4), nod: 6 })); w.gun.visible = true; w.gun.pose(P);
    w.store.frontDoor.rotation.y = 1.45 * (1 - span(t, tLeave + 1.6, tLeave + 2.8));
    w.store.LIGHTS.forEach((l) => (l.intensity = 1.3));
    const k = ease(lt / (s(13) - s(12)));
    return { cam: move([[-0.6, 0.95, -17.6], [-0.9, 1.0, -17.9]], [[1.7, 1.05, -8.0], [0.6, 1.0, -11.0]], k, [46, 50], { shake: 0.07 }), black: 1 - sm(lt / 0.3) };
  }, (ctx, w, lt, t) => {
    stamp(ctx, '$392', { y: LAND ? 230 : 1060, size: LAND ? 150 : 210, alpha: span(t, wd(12, 'three') - 0.05, wd(12, 'three') + 0.35) * (1 - span(t, s(13) - 0.5, s(13) - 0.25)) });
  });

  // S15 — weeks later: the interview room. Leon Dorsey at the table.
  const SEAT = [X(0), 0.95];
  const dorseySit = (t) => { const P = sit(SEAT, 180, t, { hunch: 10, nod: 14 }); P.ik.handL.target = local(SEAT, 180, 0.17, 0.79, 0.45); P.ik.handR.target = local(SEAT, 180, -0.15, 0.79, 0.47); P.ik.handL.rot = P.ik.handR.rot = [-80, 0, 0]; return P; };
  add('S15', s(13) - 0.2, 'interview room', 'inst', (w, lt, t) => {
    w.gun.visible = true; w.gun.pose(dorseySit(t));
    const det = handsHidden(stand([X(0.85), -0.95], -25, t, { contra: 0.5, nod: 2 })); det.look = V(X(0), 1.2, 0.95); w.james.visible = true; w.james.pose(det); w.james.gain = 0.22;
    const k = ease(lt / (s(14) - s(13) + 0.1));
    return { cam: move([[X(-1.6), 1.68, -1.5], [X(-1.3), 1.55, -1.05]], [[X(0.05), 1.0, 0.9], [X(0.0), 1.1, 0.95]], k, [42, 38], { shake: 0.08 }), black: 1 - sm(lt / 0.3), exposure: 1.1 };
  });

  // S16 — the tape again: the man in the photos seems taller
  add('S16', s(14) - 0.12, 'CCTV · seems taller', 'store', (w, lt, t) => {
    const { pos } = gunIn(w, 99, tWalk0, P_IN, 1.25, D_FREEZE); w.store.frontDoor.rotation.y = doorFor(pos[1]);
    return { cam: { ...CCTV, look: [3.12, 1.05, -6.9], fov: 46 - 3 * ease(lt / 1.6), shake: 0 }, ...CCTV_LOOK(), black: 1 - sm(lt / 0.12) };
  }, (ctx, w, lt, t) => {
    cctvHud(ctx, { pause: true });
    const head = w.gun.at('head', V(0, 0.2, 0)).y;
    measure(ctx, w, { ruler: 1, D: head, Da: span(t, s(14), s(14) + 0.25), E: head + 0.24, Ea: span(t, s(14) + 0.15, s(14) + 0.4), gap: span(t, wd(14, 'taller') - 0.2, wd(14, 'taller') + 0.2) });
  });

  // S17 — they let him go: he gets up and walks out
  const PX = [[X(0.0), 0.95], [X(0.9), 0.95], [X(1.1), -1.3], [X(1.1), -3.2]];
  const tUp = wd(14, 'they') - 0.05, tOut = tUp + 0.55;
  add('S17', wd(14, 'they') - 0.12, 'walks out', 'inst', (w, lt, t) => {
    const k = span(t, tUp, tOut), Sd = dorseySit(t), St = sidesIK(stand(SEAT, 90, t, { nod: 4 }));
    let P;
    if (t < tOut) P = blendPose(Sd, St, k);
    else { const L = pathLen(PX), d = travel(t, tOut, 1.25, L); P = walk(PX, d, t, { amp: clamp(d / 0.2 + 0.3) * clamp((L - d) / 0.4) }); }
    w.gun.visible = true; w.gun.pose(P);
    w.inst.door.rotation.y = 1.35;
    const det = handsHidden(stand([X(-0.95), -1.05], 40, t, { contra: 0.5 })); det.look = V(X(1.1), 1.4, -1.6); w.james.visible = true; w.james.pose(det); w.james.gain = 0.2;
    return { cam: move([[X(0.28), 1.72, -1.78], [X(0.22), 1.7, -1.72]], [[X(0.1), 1.05, 0.9], [X(0.75), 1.15, 0.1]], ease(lt / 2.6), [58, 60], { shake: 0.06 }), exposure: 1.1 };
  });

  // S18 — five months later: behind bars. The door slams.
  const CELL = [X(-2.86), 6.8];
  add('S18', s(15) - 0.15, 'cell · door slams', 'inst', (w, lt, t) => {
    const P = sit(CELL, 90, t, { seat: 0.56, hunch: 18, nod: 26, lean: 14, feet: 0.02 });
    P.ik.handL = { target: local(CELL, 90, 0.07, 0.66, 0.34), pole: ldir(90, 1, -0.3, -0.6), rot: [-40, 0, 0] }; P.ik.handR = { target: local(CELL, 90, -0.07, 0.66, 0.35), pole: ldir(90, -1, -0.3, -0.6), rot: [-40, 0, 0] };
    w.gun.visible = true; w.gun.pose(P);
    const cd = w.inst.cellDoors[0]; cd.position.z = cd.userData.z0 - 0.95 * (1 - ease(span(t, tCaught, tCaught + 0.28))) + 0.015 * Math.sin((t - tCaught - 0.28) * 50) * pulse(t, tCaught + 0.28, 10);
    const hit = pulse(t, tCaught + 0.28, 9);
    const k = ease(lt / (s(16) - s(15)));
    return { cam: move([[X(0.62), 1.42, 7.75], [X(0.35), 1.35, 7.45]], [[X(-2.8), 0.9, 6.55], [X(-2.85), 0.88, 6.75]], k, [44, 40], { shake: 0.07 + 0.3 * hit }), black: 1 - sm(lt / 0.25) };
  }, (ctx, w, lt, t) => {
    stamp(ctx, 'SEPT. 1994', { y: LAND ? 200 : 470, size: LAND ? 104 : 140, alpha: span(t, s(15) - 0.05, s(15) + 0.35) * (1 - span(t, wd(15, 'and') - 0.2, wd(15, 'and'))), track: 0.04 });
    const p = P2(w, X(-1.1), 1.65, 6.5); sfxWord(ctx, 'Clang.', p.x, p.y, t - tCaught - 0.28, { size: 70, rot: -0.05 });
  });

  // S19 — 1998: the old tapes, measured properly — the room's geometry first
  add('S19', s(16) - 0.15, 'CCTV · 1998 · guides', 'store', (w, lt, t) => {
    const { pos } = gunIn(w, 99, tWalk0, P_IN, 1.25, D_FREEZE); w.store.frontDoor.rotation.y = doorFor(pos[1]);
    const k = ease(lt / (s(17) - s(16)));
    return { cam: { ...CCTV, look: lerp([3.0, 1.1, -6.9], [3.12, 1.05, -6.9], k), fov: 58 - 12 * k, shake: 0 }, ...CCTV_LOOK(), black: 1 - sm(lt / 0.15) };
  }, (ctx, w, lt, t) => {
    cctvHud(ctx, { pause: true });
    measure(ctx, w, { guides: span(t, wd(16, 'fbi') - 0.2, e(16)), ruler: span(t, wd(16, 'measures') - 0.1, e(16) + 0.2) });
    stamp(ctx, '1998', { y: LAND ? 200 : 520, size: LAND ? 190 : 260, alpha: span(t, s(16) - 0.05, s(16) + 0.35) * (1 - span(t, wd(16, 'the') - 0.1, wd(16, 'the') + 0.25)) });
  });

  // S20 — the line comes down onto his head: Leon Dorsey's height
  add('S20', s(17) - 0.1, 'CCTV · the match', 'store', (w, lt, t) => {
    const { pos } = gunIn(w, 99, tWalk0, P_IN, 1.25, D_FREEZE); w.store.frontDoor.rotation.y = doorFor(pos[1]);
    const k = ease(lt / (s(18) - s(17)));
    return { cam: { ...CCTV, look: [3.12, 1.12 + 0.12 * k, -6.9], fov: 46 - 8 * k, shake: 0 }, ...CCTV_LOOK({ flash: 0.06 * pulse(t, tMatch, 6) }) };
  }, (ctx, w, lt, t) => {
    cctvHud(ctx, { pause: true });
    const head = w.gun.at('head', V(0, 0.2, 0)).y, dn = ease(span(t, wd(17, 'leon') - 0.3, tMatch));
    measure(ctx, w, { guides: 1 - span(t, s(17), s(17) + 0.5), ruler: 1, D: head, Da: 1 - span(t, tMatch, tMatch + 0.15), E: head + 0.24 * (1 - dn), Ea: 1, gap: (1 - dn) * 0.8, match: t >= tMatch });
  });

  // S21 — 2008: the corridor
  const PC = [[X(0.05), 6.6], [X(0.0), 17.2]];
  add('S21', s(18) - 0.25, 'corridor · 2008', 'inst', (w, lt, t) => {
    const L = pathLen(PC), d = travel(t, s(18) - 1.2, 0.9, L);
    w.gun.visible = true; w.gun.pose(walk(PC, d, t, { amp: clamp((L - d) / 0.4), nod: 10, hunch: 4 }));
    const k = ease(lt / (s(19) - s(18) + 0.1));
    return { cam: move([[X(0.32), 1.78, 4.35], [X(0.25), 1.72, 5.6]], [[X(0.0), 0.72, 12.0], [X(0.0), 0.74, 13.0]], k, [50, 46], { shake: 0.06 }), black: 1 - sm(lt / 0.25) };
  }, (ctx, w, lt, t) => {
    stamp(ctx, 'AUG. 12, 2008', { y: LAND ? 170 : 300, size: LAND ? 100 : 132, alpha: span(t, s(18) - 0.05, s(18) + 0.35) * (1 - span(t, e(18) + 0.05, e(18) + 0.35)), track: 0.04, shade: 0.72 });
  });

  // S22 — the witness room: the parents, from behind, facing the lit glass
  const SEATS = [[-1.2, 'fa', 0.36], [-0.4, 'brad', 0.6], [0.4, 'fd', 0.56], [1.2, 'james', 0.36]];
  add('S22', s(19) - 0.15, 'witness room', 'inst', (w, lt, t) => {
    for (const [x, who, g] of SEATS) { const f = w[who], P = sit([X(x), 23.42], 0, t + x * 3, { hunch: 6, nod: 6 }); P.look = V(X(0), 1.3, 26); f.visible = true; f.pose(P); f.gain = g; }
    const k = ease(lt / (tEnd - 2.0 - s(19) + 0.15));
    return { cam: move([[X(0.22), 1.72, 21.12], [X(0.16), 1.66, 21.5]], [[X(0.0), 1.22, 24.6], [X(0.0), 1.25, 24.6]], k, [56, 50], { shake: 0.05 }), black: 1 - sm(lt / 0.3), exposure: 1.05 };
  });

  // S23 — the store camera again: the doorway, empty. Black.
  add('S23', tEnd - 2.0, 'CCTV · empty doorway', 'store', (w, lt, t) => {
    return { cam: { ...CCTV, fov: 64, shake: 0 }, ...CCTV_LOOK(), black: span(t, tEnd - 0.75, tEnd - 0.1) };
  }, (ctx, w, lt, t) => cctvHud(ctx, {}), { step: 3 });

  SH[SH.length - 1].end = tEnd;
  SH.cues = cues;
  // ---------- sound cues (read by tools/mix.py) ----------
  // the door chime when he walks in (S07): the door starts to open at z ≈ -8.15 on his path
  const pts7 = [[3.15, -10.2], [3.15, -6.2], [2.5, -4.95]];
  let tDing = s(6); for (let tt = s(6) - 0.5; tt < s(7); tt += 0.01) { const d = travel(tt, tGunIn, 1.3, pathLen(pts7)); if (pathAt(pts7, d).pos[1] > -7.75) { tDing = tt; break; } }
  cue(0.05, 'vcr', { dur: tStop - 0.05 }); cue(tStop - 0.05, 'vcrstop');
  cue(s(3) - 0.32, 'night', { dur: s(5) - 0.1 - (s(3) - 0.32) });
  cue(s(5) - 0.1, 'buzz', { dur: tBlack - (s(5) - 0.1) });
  cue(tDing, 'chime'); cue(tDing - 0.1, 'swell', { dur: 4.5 });
  // footfalls of the run (soft, low): where a foot lands
  { const L = pathLen(PR); let last = 0; for (let tt = tRun; tt < s(10); tt += 0.005) { const d = travel(tt, tRun, 3.6, L, 0.3); const n = Math.floor(d / 1.0); if (n > last && d < L) { cue(tt, 'step', { gain: 0.8 }); last = n; } } }
  tKeys.forEach((tk) => cue(tk, 'key')); cue(tClunk, 'handle');
  bangs.forEach((b, i) => cue(b, 'bang', { gain: [1, 0.9][i] }));
  cue(tBlack + 0.75, 'thud');
  cue(s(12) - 0.25, 'night', { dur: s(13) - s(12) });
  cue(s(14) - 0.12, 'vcr', { dur: wd(14, 'they') - s(14) }); cue(wd(14, 'they') - 0.16, 'vcrstop');
  cue(tCaught + 0.28, 'clang');
  cue(s(16) - 0.15, 'vcr', { dur: s(18) - s(16) }); cue(s(18) - 0.3, 'vcrstop');
  cue(tMatch, 'sting');
  cue(tEnd - 2.0, 'vcr', { dur: 1.8 }); cue(tEnd - 0.45, 'vcrstop');
  // score arc keys: calm open → tension from the walk-in → peak at the shots → hollow → rise in 1998 → the match → quiet end
  cue(0, 'arc', { v: 0.45 }); cue(s(3), 'arc', { v: 0.5 }); cue(s(6), 'arc', { v: 0.62 }); cue(s(8), 'arc', { v: 0.85 }); cue(bangs[0], 'arc', { v: 1.15 });
  cue(tBlack + 0.3, 'arc', { v: 0.3 }); cue(s(13), 'arc', { v: 0.42 }); cue(s(16), 'arc', { v: 0.6 }); cue(tMatch - 0.2, 'arc', { v: 1.0 }); cue(tMatch + 0.5, 'arc', { v: 0.55 }); cue(tEnd, 'arc', { v: 0.3 });
  SH.anchors = { tWalk0, tFreeze, tStop, tGunIn, tMarch, tRun, bangs, tBlack, tLeave, tCaught, tMatch, tEnd, tDing };
  CAPS = buildCaptions();
  return SH;
}

// ---------- captions ----------
let CAPS = [];
function buildCaptions() {
  const s = (i) => S0(i), e = (i) => E0(i), wd = (i, x, n) => W0(i, x, n);
  const C = [];
  const yel = (text, a, b, o = {}) => C.push({ text, a, b, ...o });
  const hk = (words, boxed, a, b) => C.push({ hook: words, boxed, a, b });
  hk(['IN', '1994,', 'A', 'STORE', 'CAMERA'], 1, s(0), wd(0, 'photographed') - 0.04);
  hk(['PHOTOGRAPHED', 'A', 'KILLER.'], 2, wd(0, 'photographed') - 0.04, e(0) + 0.25);
  yel('Police let their suspect go.', s(1), e(1) + 0.22);
  yel('The man on the tape looked too tall.', s(2), e(2) + 0.1);
  yel('April fourth, around midnight.', s(3), e(3) + 0.22);
  yel('Two clerks are closing', s(4), wd(4, 'a') - 0.02);
  yel('a Blockbuster Video in Dallas.', wd(4, 'a') - 0.02, e(4) + 0.22);
  yel('Brad Lindsey, 20.', s(5), wd(5, 'james') - 0.04);
  yel('James Armstrong, 26.', wd(5, 'james') - 0.04, e(5) + 0.4);
  yel('An 18-year-old walks in with a pistol,', s(6), e(6) + 0.1);
  yel('and marches them to the safe', s(7), wd(7, 'in') - 0.02);
  yel('in the back office.', wd(7, 'in') - 0.02, e(7) + 0.3);
  yel('It’s on a time lock.', s(8), wd(8, 'nothing') - 0.04);
  yel('Nothing will open it tonight.', wd(8, 'nothing') - 0.04, e(8) + 0.45);
  yel('James runs for the door.', s(9), e(9) + 0.18);
  yel('He doesn’t make it.', s(10), e(10) + 0.9);
  yel('Then the gunman turns to Brad,', s(11), wd(11, 'the', 1) - 0.02);
  yel('the only witness.', wd(11, 'the', 1) - 0.02, e(11) + 0.3);
  yel('He leaves with $392.', s(12), e(12) + 0.5);
  yel('Weeks later, a tip leads police', s(13), wd(13, 'to') - 0.02);
  yel('to Leon Dorsey.', wd(13, 'to') - 0.02, e(13) + 0.22);
  yel('But the man in the photos seems taller.', s(14), wd(14, 'they') - 0.04);
  yel('They let him go.', wd(14, 'they') - 0.04, e(14) + 0.45);
  yel('Five months later, he kills again,', s(15), wd(15, 'and') - 0.04);
  yel('and this time he’s caught.', wd(15, 'and') - 0.04, e(15) + 0.5);
  yel('In 1998,', s(16), wd(16, 'the') - 0.04);
  yel('the FBI measures the old tapes.', wd(16, 'the') - 0.04, e(16) + 0.25);
  yel('The man in the doorway', s(17), wd(17, 'is') - 0.04);
  yel('is Leon Dorsey’s height.', wd(17, 'is') - 0.04, e(17) + 0.7);
  yel('In 2008, Texas executes him.', s(18), e(18) + 0.4);
  yel('Brad and James’s parents', s(19), wd(19, 'watch') - 0.04);
  yel('watch through the glass.', wd(19, 'watch') - 0.04, e(19) + 1.2);
  return C;
}

export function drawCaptions(ctx, t) {
  for (const c of CAPS) {
    if (t < c.a || t >= c.b) continue;
    const a = Math.min(1, (t - c.a) / 0.08) * Math.min(1, (c.b - t) / 0.08);
    if (c.hook) hook(ctx, c.hook, c.boxed, { alpha: a });
    else caption(ctx, c.text, { alpha: a, italic: c.italic });
  }
}
