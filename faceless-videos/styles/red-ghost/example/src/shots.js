// THE 2 A.M. CALL — shot list. Every shot is a camera move inside the one hallway set, keyed to the narration.
import * as THREE from 'three';
import { stand, local, ldir, V } from './core/figure.js';
import { caption, hook, stamp, sfxWord, toScreen, CAP_Y } from './core/text.js';
import { T, s as S0, e as E0, w as W0 } from './core/timing.js';
import { W, H, LAND, UI } from './core/engine.js';
import { HALL } from './sets/hall.js';

const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const sm = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
const ease = (x) => { x = clamp(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const span = (t, a, b) => sm((t - a) / (b - a));
const lerp = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);
const lerpV = (a, b, k) => a.clone().lerp(b, k);
/** camera dolly between two framings over the shot (eased), extra keys optional */
const dolly = (a, b, k, fov = [50, 50], o = {}) => ({ pos: lerp(a[0], b[0], k), look: lerp(a[1], b[1], k), fov: fov[0] + (fov[1] - fov[0]) * k, ...o });

// where things are
const GIRL_HALL = [0.55, -1.55];          // mid-hall, facing the front door
const GIRL_PHONE = [1.5, -0.5];           // at the wall phone (wall on her right)
const GIRL_STAIRS = [-0.5, 1.8];          // foot of the stairs, the closet right behind her
const NEWEL = V(-1.1, 1.29, 1.53);
const CLOSET = V(HALL.closet.x, 1.2, HALL.Z1);
const MAN = [-0.1, 2.92];

// ---------- poses ----------
function onPhone(w, pos, yaw, t, o = {}) {
  const P = stand(pos, yaw, t, { contra: 0.5, nod: 6, ...o });
  P.b.head = [P.b.head[0] + 4, -8, 7]; P.b.neck = [P.b.neck[0], -4, 3];
  P.b.chest = [P.b.chest[0] + 2, -4, P.b.chest[2]];
  P.ik.handL = { target: local(pos, yaw, -0.07, 1.0 + 0.004 * Math.sin(t * 1.5), 0.13), pole: ldir(yaw, 1, -0.6, 0.15), rot: [0, 0, 12] };
  w.girl.pose(P);
  const g = w.girl;
  const ear = g.at('head', V(-0.098, 0.085, 0.0)), mouth = g.at('head', V(-0.05, -0.005, 0.1)), mid = g.at('head', V(0, 0.06, 0));
  const out = ear.clone().sub(mid).normalize();
  const c = ear.clone().add(mouth).multiplyScalar(0.5);
  const wrist = c.addScaledVector(out, 0.045).add(V(0, -0.085, 0)).addScaledVector(ldir(yaw, 0, 0, 1), -0.01);
  return { P, wrist };
}
function phonePose(w, pos, yaw, t, o = {}) {
  const { P, wrist } = onPhone(w, pos, yaw, t, o);
  const tremble = o.tremble ? V(Math.sin(t * 31) * 0.002, Math.sin(t * 23 + 1) * 0.002, 0) : V(0, 0, 0);
  P.ik.handR = { target: wrist.add(tremble), pole: ldir(yaw, -0.3, -1, 0.75), rot: [0, -30, -15] };
  w.girl.pose(P);
  w.handset.mode = 'hand';
}

// ---------- shots ----------
export function buildShots() {
  const s = (i) => S0(i), e = (i) => E0(i), wd = (i, x) => W0(i, x);
  const SH = [], cues = [];
  const add = (id, start, note, setup, over) => SH.push({ id, start, note, setup, over });
  const cue = (t, type, o = {}) => cues.push({ t: +t.toFixed(3), type, ...o });

  // timeline anchors
  const tLeft = wd(0, 'left') - 0.08;
  const tRing1 = s(1) + 0.05;
  const tPick1 = s(2) - 0.35;
  const tHang = s(4) + 0.15;
  const tRing2 = s(5) + 0.02;
  const tPick2 = s(6) - 0.12;
  const knocks = [e(8) + 0.18, e(8) + 0.7, e(8) + 1.22];
  const tFroze = s(9) - 0.12;
  const tBut = s(10) - 0.3;
  const tCloset = s(11) - 0.2;
  const tBehind = s(12) - 0.08;
  const tEnd = T.dur + 0.9;

  // S01 — establishing: the hall at night, she's small, 1990 glows
  add('S01', 0, 'establishing · 1990', (w, lt, t) => {
    w.girl.pose(stand(GIRL_HALL, 180, t));
    return { cam: dolly([[0.95, 1.32, 2.3], [0.05, 1.05, -2.6]], [[0.85, 1.28, 1.75], [0.05, 1.02, -2.6]], ease(lt / tLeft), [64, 62]), black: 1 - sm(lt / 0.5), exposure: 1.0 };
  }, (ctx, w, lt, t) => {
    stamp(ctx, '1990', { y: LAND ? 430 : 780, size: LAND ? 230 : 290, alpha: span(t, s(0) + 0.05, s(0) + 0.5) * (1 - span(t, tLeft - 0.45, tLeft)) });
  });

  // S02 — low front angle: left home alone; the far end (closet, table lamp) sits behind her
  add('S02', tLeft, 'home alone · low front', (w, lt, t) => {
    w.girl.pose(stand(GIRL_HALL, 180, t, { nod: 4 }));
    const k = ease(lt / (tRing1 - 0.35 - tLeft));
    return { cam: dolly([[0.2, 0.32, -3.55], [0.58, 1.08, -1.55]], [[0.32, 0.4, -3.3], [0.58, 1.05, -1.55]], k, [56, 52]) };
  });

  // S03 — the wall phone rings (2:00 A.M.)
  add('S03', tRing1 - 0.35, 'phone rings · 2 AM', (w, lt, t) => {
    w.girl.pose(stand([0.9, -1.4], 160, t)); // off frame, her red spill creeps onto the wall
    w.handset.ring = (t > tRing1 && t < tRing1 + 2.0) ? 1 : 0;
    const k = ease(lt / (tPick1 - tRing1 + 0.35));
    return { cam: dolly([[1.12, 1.3, 0.25], [1.95, 1.38, -0.62]], [[1.4, 1.36, -0.08], [1.95, 1.4, -0.62]], k, [44, 40], { shake: 0.1 }) };
  }, (ctx, w, lt, t) => {
    stamp(ctx, '2:00 A.M.', { y: LAND ? 190 : 380, size: LAND ? 120 : 170, alpha: span(t, s(1) - 0.05, s(1) + 0.4) * (1 - span(t, e(1) + 0.1, e(1) + 0.4)), track: 0.01 });
    const p = toScreen(w.camera, V(HALL.phone.x - 0.08, HALL.phone.y + 0.17, HALL.phone.z + 0.05));
    sfxWord(ctx, 'Ring!', p.x + 250 * UI, p.y + 190 * UI, (t - tRing1) * (t < tRing1 + 2.0 ? 1 : 0), { size: 78, rot: -0.08 });
    sfxWord(ctx, 'Ring!', p.x + 300 * UI, p.y + 285 * UI, (t - tRing1 - 0.9) * (t < tRing1 + 2.0 ? 1 : 0), { size: 62, rot: -0.04, alpha: 0.7 });
  });

  // S04 — low angle: phone at her ear. No voice, just breathing.
  add('S04', tPick1, 'on the phone · low', (w, lt, t) => {
    phonePose(w, GIRL_PHONE, 180, t, { tremble: t > s(3) });
    const k = ease(lt / (tHang - tPick1));
    return { cam: dolly([[0.82, 0.32, -2.35], [1.45, 1.12, -0.5]], [[0.92, 0.36, -2.1], [1.47, 1.15, -0.5]], k, [52, 48]) };
  });

  // S05 — side: she hangs up… it rings again; she flinches back
  add('S05', tHang - 0.35, 'hang up · rings again', (w, lt, t) => {
    const { P, wrist } = onPhone(w, GIRL_PHONE, 180, t);
    const cradle = V(HALL.phone.x - 0.16, HALL.phone.y - 0.07, HALL.phone.z + 0.02);
    const rest = local(GIRL_PHONE, 180, -0.2, 0.86, 0.03);
    const chest = local(GIRL_PHONE, 180, -0.05, 1.22, 0.16);
    const a = span(t, tHang, tHang + 0.5), b = span(t, tHang + 0.6, tHang + 1.0), fl = span(t, tRing2, tRing2 + 0.35);
    let tgt = lerpV(wrist, cradle, a); tgt = lerpV(tgt, rest, b); tgt = lerpV(tgt, chest, fl);
    P.ik.handR = { target: tgt, pole: ldir(180, -0.3 - 0.4 * a, -1, 0.75 - 0.9 * a), rot: [0, -30 * (1 - b), -15 * (1 - b)] };
    if (fl > 0) {
      const back = 0.12 * fl; P.pos = [GIRL_PHONE[0] - 0.05 * fl, GIRL_PHONE[1] + back];
      P.ik.handL.target = lerpV(P.ik.handL.target, local(P.pos, 180, 0.06, 1.24, 0.15), fl);
      P.b.chest = [P.b.chest[0] - 6 * fl, -4 - 10 * fl, P.b.chest[2]]; P.b.head = [P.b.head[0] - 4 * fl, -8 - 22 * fl, P.b.head[2] * (1 - fl)];
      P.root.pos[1] -= 0.02 * fl;
    }
    w.girl.pose(P);
    w.handset.mode = a < 1 ? 'hand' : 'cradle'; w.handset.blend = 1 - a;
    w.handset.ring = (t > tRing2 && t < tPick2) ? 1 : 0;
    const k = ease(lt / (tPick2 - tHang + 0.35));
    return { cam: dolly([[0.62, 1.32, -2.05], [1.68, 1.2, -0.55]], [[0.72, 1.32, -1.85], [1.68, 1.22, -0.55]], k, [50, 47]) };
  }, (ctx, w, lt, t) => {
    const p = toScreen(w.camera, V(HALL.phone.x - 0.08, HALL.phone.y + 0.2, HALL.phone.z));
    const on = t < tPick2 ? 1 : 0;
    sfxWord(ctx, 'Ring!', p.x + 120 * UI, p.y - 190 * UI, (t - tRing2) * on, { size: 76, rot: -0.07 });
    sfxWord(ctx, 'Ring!', p.x + 190 * UI, p.y - 110 * UI, (t - tRing2 - 0.7) * on, { size: 58, rot: -0.03, alpha: 0.7 });
  });

  // S06 — over her shoulder, the hall stretches to the front door. "Don't open the door."
  add('S06', tPick2, 'whisper · over shoulder', (w, lt, t) => {
    phonePose(w, GIRL_PHONE, 180, t, { tremble: true });
    const k = ease(lt / (s(8) - 0.25 - tPick2));
    return { cam: dolly([[1.9, 1.7, 0.95], [0.2, 1.15, -4.0]], [[1.88, 1.68, 0.7], [0.2, 1.15, -4.0]], k, [38, 36], { shake: 0.08 }), bloom: 0.55 };
  });

  // S07 — the front door. Three slow knocks.
  add('S07', s(8) - 0.25, 'three knocks · door', (w, lt, t) => {
    w.girl.visible = false; w.girl.pose(stand(GIRL_PHONE, 180, t)); w.girl.hide(false);
    let hit = 0; for (const kt of knocks) if (t > kt) hit += Math.exp(-(t - kt) * 22);
    w.hall.frontDoor.position.z = HALL.Z0 + 0.02 - 0.003 * hit;
    w.hall.lamp.intensity = 1.6 * (1 - 0.18 * hit); w.hall.lampShade.emissiveIntensity = 0.32 * (1 - 0.18 * hit);
    const k = ease(lt / (tFroze - s(8) + 0.25));
    return { cam: dolly([[1.05, 0.85, -1.15], [0.42, 1.1, -4.0]], [[0.95, 0.9, -1.8], [0.42, 1.12, -4.0]], k, [52, 48], { shake: 0.1 + 0.25 * hit }) };
  }, (ctx, w, lt, t) => {
    const pos = [V(0.2, 1.62, -3.95), V(0.52, 1.28, -3.95), V(0.24, 0.92, -3.95)];
    knocks.forEach((kt, i) => { const p = toScreen(w.camera, pos[i]); sfxWord(ctx, 'Knock.', p.x, p.y, t - kt, { size: [80, 70, 62][i], rot: -0.05, alpha: [0.95, 0.8, 0.65][i] }); });
  });

  // S08 — wide from behind: frozen at the foot of the stairs, staring at the door
  add('S08', tFroze, 'frozen · foot of stairs', (w, lt, t) => {
    const P = frozen(w, t, 0);
    w.girl.pose(P);
    const k = ease(lt / (tBut - tFroze));
    return { cam: dolly([[-1.55, 2.75, -0.95], [-0.45, 0.85, 2.1]], [[-1.55, 2.62, -0.6], [-0.45, 0.88, 2.1]], k, [50, 46]) };
  });

  // S09 — close, from the front; something behind her. Her head turns a little.
  add('S09', tBut, 'close · head turn', (w, lt, t) => {
    const P = frozen(w, t, span(t, wd(10, 'front') - 0.6, e(10) + 0.2));
    w.girl.pose(P);
    const k = ease(lt / (tCloset - tBut));
    return { cam: dolly([[-0.3, 1.38, 0.45], [-0.48, 1.3, 2.3]], [[-0.32, 1.4, 0.62], [-0.48, 1.32, 2.3]], k, [44, 40], { shake: 0.09 }), exposure: 1.15 };
  });

  // S10 — the closet: a soft knock, then the door eases open into black
  add('S10', tCloset, 'closet · creak', (w, lt, t) => {
    w.girl.pose(frozen(w, t, 1));
    w.hall.closetPivot.rotation.y = 0.36 * ease(span(t, tCloset + 0.45, tBehind + 0.1));
    w.man.visible = true; w.man.pose(manPose(t)); w.man.gain = 0.1; w.man.eyes = 0;
    const k = ease(lt / (tBehind - tCloset));
    return { cam: dolly([[0.45, 1.15, 1.2], [-0.22, 1.1, 2.6]], [[0.4, 1.17, 1.45], [-0.22, 1.1, 2.6]], k, [46, 42], { shake: 0.08 }), exposure: 1.35 };
  }, (ctx, w, lt, t) => {
    const p = toScreen(w.camera, V(-0.45, 1.45, HALL.Z1 - 0.06));
    sfxWord(ctx, 'knock.', p.x, p.y, t - (tCloset + 0.12), { size: 64, rot: -0.05, alpha: 0.85 });
  });

  // S11 — the reveal: she's in front, frozen; behind her the closet gap, two eyes
  add('S11', tBehind, 'eyes · behind her', (w, lt, t) => {
    // (ends at tEnd: see SH[SH.length-1].end below)
    w.girl.pose(frozen(w, t, 1));
    w.hall.closetPivot.rotation.y = 0.38 + 0.24 * ease(lt / (tEnd - tBehind - 0.4));
    w.man.visible = true; w.man.pose(manPose(t)); w.man.gain = 0.12 + 0.16 * span(t, tBehind, tEnd - 0.8); w.man.eyes = span(t, tBehind + 0.05, tBehind + 0.55) * (1 - 0.92 * span(t, tEnd - 1.15, tEnd - 1.05) * (1 - span(t, tEnd - 0.95, tEnd - 0.85)));
    const k = ease(lt / (tEnd - tBehind));
    return {
      cam: dolly([[0.32, 1.28, -0.65], [-0.28, 1.3, 2.6]], [[0.26, 1.32, -0.1], [-0.24, 1.36, 2.6]], k, [44, 38], { shake: 0.07 }), exposure: 1.3,
      black: span(t, tEnd - 0.55, tEnd - 0.05),
    };
  });

  SH[SH.length - 1].end = tEnd;
  SH.cues = cues;
  // sound cues (read by tools/mix.py)
  cue(tRing1, 'ring', { dur: 2.0 }); cue(tPick1 - 0.05, 'pickup'); cue(tPick1, 'line', { dur: tHang + 0.3 - tPick1 });
  cue(s(3) + 0.95, 'breath', { dur: tHang - s(3) - 1.0 }); cue(tHang + 0.42, 'hangup');
  cue(tRing2, 'ring', { dur: tPick2 - tRing2 }); cue(tPick2, 'pickup'); cue(tPick2, 'line', { dur: s(8) - 0.25 - tPick2 });
  knocks.forEach((k, i) => cue(k, 'knock', { gain: [1, 1.05, 1.1][i] }));
  cue(tFroze + 0.2, 'swell', { dur: 4 }); cue(tCloset + 0.12, 'closetknock'); cue(tCloset + 0.5, 'creak', { dur: tBehind - tCloset });
  cue(tBehind, 'sting'); cue(tEnd - 0.5, 'lastknock');
  SH.anchors = { tLeft, tRing1, tPick1, tHang, tRing2, tPick2, knocks, tFroze, tBut, tCloset, tBehind, tEnd };
  CAPS = buildCaptions();
  return SH;
}

/** frozen at the foot of the stairs: left hand on the newel, right fist at her chest; `turn` 0→1 looks back over her right shoulder */
function frozen(w, t, turn) {
  const pos = GIRL_STAIRS, yaw = 180;
  const P = stand(pos, yaw, t * 1.6, { contra: 0.25, nod: 3, knee: 0.02 });
  const br = Math.sin(t * 2 * Math.PI * 0.42);
  P.b.chest = [P.b.chest[0] - 3 - 1.2 * br, 0, P.b.chest[2]];
  P.ik.handL = { target: NEWEL.clone().add(V(0.07, 0.07, 0.04)), pole: ldir(yaw, 0.6, -1, -0.4), rot: [-20, 0, 30] };
  P.ik.handR = { target: local(pos, yaw, 0.0, 1.21 + 0.004 * br, 0.15), pole: ldir(yaw, -1, -1, -0.1), rot: [-60, 0, 20] };
  const lookFront = local(pos, yaw, 0, 1.4, 4), lookBack = V(HALL.closet.x, 1.35, HALL.Z1 - 0.2);
  P.look = lerpV(lookFront, lookBack, ease(turn) * 0.55);
  P.b.chest[1] += -8 * ease(turn);
  return P;
}
function manPose(t) {
  const P = stand(MAN, 205, t * 0.7, { contra: 0.2, nod: 6 });
  P.b.head = [8, -14, 4];
  return P;
}

// ---------- captions ----------
let CAPS = [];
function buildCaptions() {
  const s = (i) => S0(i), e = (i) => E0(i), wd = (i, x) => W0(i, x);
  const C = [];
  const yel = (text, a, b, o = {}) => C.push({ text, a, b, ...o });
  const hk = (words, boxed, a, b) => C.push({ hook: words, boxed, a, b });
  hk(['IN', '1990,', 'THE', 'HALE', 'FAMILY'], 3, s(0), wd(0, 'left') - 0.04);
  hk(['LEFT', 'THEIR', 'DAUGHTER'], 2, wd(0, 'left') - 0.04, wd(0, 'home') - 0.04);
  hk(['HOME', 'ALONE', 'FOR', 'ONE', 'NIGHT.'], 1, wd(0, 'home') - 0.04, e(0) + 0.35);
  yel('At 2 A.M.,', s(1), wd(1, 'the') - 0.02);
  yel('the hallway phone rang.', wd(1, 'the') - 0.02, e(1) + 0.45);
  yel('No voice.', s(2), e(2) + 0.25);
  yel('Just breathing.', s(3), e(3) + 0.55);
  yel('She hung up.', s(4), e(4) + 0.28);
  yel('It rang again.', s(5), e(5) + 0.4);
  yel('“Don’t open the door,”', s(6), e(6) + 0.1, { italic: true });
  yel('a man whispered.', s(7), e(7) + 0.45);
  yel('Then came three slow knocks.', s(8), s(9) - 0.12);
  yel('She froze at the foot of the stairs,', s(9), wd(9, 'staring') - 0.02);
  yel('staring at the front door.', wd(9, 'staring') - 0.02, e(9) + 0.55);
  yel('But the knocking', s(10), wd(10, 'wasnt') - 0.02);
  yel('wasn’t coming from the front door.', wd(10, 'wasnt') - 0.02, e(10) + 0.35);
  yel('It was coming from the closet,', s(11), e(11) + 0.28);
  yel('behind her.', s(12), e(12) + 1.0);
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
