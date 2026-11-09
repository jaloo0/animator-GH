// POV: looking out of the hero's window. The city (city.js) fills the panel; the window frame, sill and
// condensation sit in front. o.across adds the building across the street (night 7+), whose lit window
// shows a room just like ours — rendered with drawRoom into a small canvas, mirrored.
import { PAL, clamp, lerp, mix, hash, noise1, scratch, rgba, key, ease } from '../core/lib.js';
import { stroke, shape, fill, rectPts, ellipsePts, quad, hatch } from '../core/ink.js';
import { drawCity, snow, CW, HOR } from './city.js';
import { drawRoom, roomCam } from './room.js';
import { bloom } from '../core/light.js';
import { flame } from '../core/hero.js';

// the building across the street lives in city space, to the right of the river view
export const ACROSS = { x0: 1180, x1: 1980, top: HOR - 363, floorH: 80, cols: 7, ourRow: 4, litCol: 2 };
export function acrossWindowRect() {
  const A = ACROSS, cw = (A.x1 - A.x0) / A.cols;
  const y = A.top + A.ourRow * A.floorH + 11;
  return { x: A.x0 + A.litCol * cw + 14, y, w: cw - 28, h: A.floorH - 22 };
}

function drawAcross(ctx, o, t) {
  const A = ACROSS, cw = (A.x1 - A.x0) / A.cols, bottom = 1100;
  const body = '#3A3F5A';
  shape(ctx, [[A.x0, A.top], [A.x1, A.top], [A.x1, bottom], [A.x0, bottom]], { fill: body, w: 3.2, seed: 501 });
  if (o.snowRoofs) fill(ctx, rectPts(A.x0 - 4, A.top - 7, A.x1 - A.x0 + 8, 9), '#C9CBD2', { seed: 502 });
  // floor slabs + window grid (dark glass)
  for (let r = 0; r * A.floorH < bottom - A.top; r++) {
    const y = A.top + r * A.floorH;
    stroke(ctx, [[A.x0, y + A.floorH - 4], [A.x1, y + A.floorH - 4]], { w: 1.6, seed: 510 + r, alpha: 0.6 });
    for (let c = 0; c < A.cols; c++) {
      const x = A.x0 + c * cw + 14, wr = { x, y: y + 11, w: cw - 28, h: A.floorH - 22 };
      const isLit = r === A.ourRow && c === A.litCol;
      if (isLit && o.across.room) continue;
      const cityOn = (o.city?.wave ?? 1) < 0.55 && hash(r * 13 + c, 8) < 0.45 ? 0.75 : 0;
      const on = isLit ? (o.across.on ?? 0) : cityOn;
      shape(ctx, rectPts(wr.x, wr.y, wr.w, wr.h), { fill: on ? mix('#1d2340', PAL.amber, on) : (hash(r * 7 + c, 3) < 0.5 ? '#232A47' : '#262E4E'), w: 1.8, seed: 520 + r * 9 + c });
      if (isLit && on > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(wr.x + wr.w / 2, wr.y + wr.h / 2, 0, wr.x + wr.w / 2, wr.y + wr.h / 2, 160); g.addColorStop(0, rgba(PAL.amber, 0.4 * on)); g.addColorStop(1, rgba(PAL.amber, 0)); ctx.fillStyle = g; ctx.fillRect(wr.x - 160, wr.y - 160, 320 + wr.w, 320 + wr.h); ctx.restore(); }
      // glass glint
      stroke(ctx, [[wr.x + wr.w * 0.2, wr.y + wr.h * 0.8], [wr.x + wr.w * 0.45, wr.y + wr.h * 0.2]], { w: 1.2, seed: 600 + r * 9 + c, alpha: 0.18, color: '#9fb0d8' });
    }
  }
  // the lit room
  if (o.across.room) {
    const wr = acrossWindowRect();
    const [rc] = renderAcrossRoom(o.across, t);
    ctx.save();
    ctx.beginPath(); ctx.rect(wr.x, wr.y, wr.w, wr.h); ctx.clip();
    ctx.drawImage(rc, wr.x - wr.w * 0.03, wr.y - wr.h * 0.03, wr.w * 1.06, wr.h * 1.06);
    // glass tint + reflection
    ctx.fillStyle = 'rgba(40,50,90,0.18)'; ctx.fillRect(wr.x, wr.y, wr.w, wr.h);
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = 'rgba(160,180,220,0.08)'; ctx.beginPath(); ctx.moveTo(wr.x + wr.w * 0.6, wr.y); ctx.lineTo(wr.x + wr.w * 0.75, wr.y); ctx.lineTo(wr.x + wr.w * 0.35, wr.y + wr.h); ctx.lineTo(wr.x + wr.w * 0.2, wr.y + wr.h); ctx.fill();
    ctx.restore();
    shape(ctx, rectPts(wr.x, wr.y, wr.w, wr.h), { w: 2.2, seed: 650 });
    stroke(ctx, [[wr.x + wr.w / 2, wr.y], [wr.x + wr.w / 2, wr.y + wr.h]], { w: 2.4, seed: 651 });
  }
}

// a tower two streets away, rising past our eye line (where the light is on night 5)
export const MID = { x0: 230, x1: 420, top: HOR - 210, floorH: 30, cols: 4 };
export function midWindowPos() { const cw = (MID.x1 - MID.x0) / MID.cols; return { x: MID.x0 + 2 * cw + cw / 2, y: HOR - 2 }; }
function drawMid(ctx, o, t) {
  const M = MID, cw = (M.x1 - M.x0) / M.cols, body = '#343C63';
  shape(ctx, [[M.x0, M.top], [M.x1, M.top], [M.x1, 1100], [M.x0, 1100]], { fill: body, w: 2.6, seed: 470 });
  if (o.city?.snowRoofs) fill(ctx, rectPts(M.x0 - 3, M.top - 5, M.x1 - M.x0 + 6, 7), '#C9CBD2', { seed: 471 });
  const on = o.mid?.on ?? 0;
  for (let r = 0; M.top + r * M.floorH < 1100; r++) for (let c = 0; c < M.cols; c++) {
    const x = M.x0 + c * cw + 8, y = M.top + r * M.floorH + 7, isLit = c === 2 && Math.abs(y + 8 - HOR) < 16;
    const cityOn = (o.city?.wave ?? 1) < 0.5 && hash(r * 11 + c, 21) < 0.5 ? 0.7 : 0;
    const k = isLit ? on : cityOn;
    ctx.fillStyle = k > 0 ? mix('#202848', PAL.amber, k) : '#232A4A'; ctx.fillRect(x, y, cw - 16, M.floorH - 13);
    if (isLit && k > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(x + cw / 2 - 8, y + 8, 0, x + cw / 2 - 8, y + 8, 110); g.addColorStop(0, rgba('#FFD08A', 0.8 * k)); g.addColorStop(0.25, rgba(PAL.amber, 0.3 * k)); g.addColorStop(1, rgba(PAL.amber, 0)); ctx.fillStyle = g; ctx.fillRect(x - 120, y - 120, 260, 260); ctx.restore(); }
  }
}

/** the room across the street: our room, mirrored, lamp off, someone at the window with a candle */
function renderAcrossRoom(ac, t) {
  const [c, x] = scratch('acrossRoom', 640, 440);
  x.save(); x.translate(640, 0); x.scale(-1, 1);
  const cam = roomCam({ x: 0.15, y: 1.35, z: 1.3, f: 430, cx: 320, cy: 230 });
  const st = {
    t, lamp: 0, city: { wave: 1, snowRoofs: true, moon: false },
    hero: ac.hero === false ? null : { x: -0.2, z: 4.75, pose: ac.pose || 'holdCandle', props: { R: 'candle' }, look: [0, 0.05], facing: 'back', seed: 21, beanieCol: ac.beanieCol },
    candle: null, windowLight: 0.3, ambient: '#2A3050', faceGlow: 0, clock: false, book: true, mug: false, candleR: 2.6,
  };
  // inside their room we look from the window side: put the "window" behind the camera by flipping depth
  drawAcrossInterior(x, st, t, ac);
  x.restore();
  return [c, x];
}

// a simple, readable interior seen from outside: back wall, lamp (off), sofa, the figure facing us
function drawAcrossInterior(x, st, t, ac) {
  const w = 640, h = 440;
  x.fillStyle = '#4A4F68'; x.fillRect(0, 0, w, h);
  shape(x, [[0, 300], [w, 300], [w, h], [0, h]], { fill: '#5A4634', w: 2, seed: 701 });
  // back wall details: a picture, a bookshelf edge
  shape(x, rectPts(430, 90, 70, 86), { fill: '#6B5440', w: 2, seed: 702 });
  shape(x, rectPts(440, 100, 50, 66), { fill: '#A79E88', w: 1.5, seed: 703 });
  // lamp (off) on the left
  const lamp = ac.lamp ?? 1;
  stroke(x, [[150, 300], [150, 120]], { w: 4, seed: 704 });
  shape(x, [[112, 120], [188, 120], [172, 70], [128, 70]], { fill: '#BDB197', w: 2.4, seed: 705 });
  shape(x, ellipsePts(150, 302, 26, 7), { fill: '#3C3A3A', w: 2, seed: 706 });
  // sofa on the right
  const sofa = ac.sofa ?? 1;
  x.save(); x.globalAlpha = sofa;
  shape(x, [[350, 200], [610, 200], [610, 300], [350, 300]], { fill: PAL.moss, w: 2.6, seed: 707, round: 12 });
  shape(x, [[335, 235], [372, 235], [372, 312], [335, 312]], { fill: mix(PAL.moss, '#1d2b22', 0.25), w: 2.4, seed: 708, round: 10 });
  shape(x, [[590, 235], [626, 235], [626, 312], [590, 312]], { fill: mix(PAL.moss, '#1d2b22', 0.25), w: 2.4, seed: 709, round: 10 });
  shape(x, [[370, 250], [600, 250], [600, 290], [370, 290]], { fill: mix(PAL.moss, '#86a58c', 0.2), w: 2.2, seed: 710, round: 8 });
  x.restore();
  // the figure at the window, facing out (towards us), holding a candle
  let fl = null;
  if (ac.figure) {
    const k = ac.figure;
    x.save(); x.globalAlpha = k;
    const s = 26, fx = 270, fy = 418;
    const info = drawHeroLite(x, fx, fy, s, t, ac);
    fl = info;
    x.restore();
  }
  // light: dark room, one candle
  x.save(); x.globalCompositeOperation = 'multiply';
  x.fillStyle = '#4A5078'; x.fillRect(0, 0, w, h);
  x.restore();
  if (!fl) {
    // nobody yet — a candle burns on the sill, low in frame
    x.save(); x.globalCompositeOperation = 'lighter';
    const g = x.createRadialGradient(300, 400, 0, 300, 400, 420);
    g.addColorStop(0, 'rgba(240,177,90,0.6)'); g.addColorStop(0.4, 'rgba(200,130,60,0.25)'); g.addColorStop(1, 'rgba(200,130,60,0)');
    x.fillStyle = g; x.fillRect(0, 0, w, h); x.restore();
    shape(x, [[288, 438], [312, 438], [312, 404], [288, 404]], { fill: '#EFE6D2', w: 2, seed: 720 });
    flame(x, 300, 400, 30, t, 34, 1);
  }
  if (fl) {
    x.save(); x.globalCompositeOperation = 'lighter';
    const g = x.createRadialGradient(fl.fx, fl.fy, 0, fl.fx, fl.fy, 420);
    g.addColorStop(0, 'rgba(240,177,90,0.85)'); g.addColorStop(0.35, 'rgba(200,130,60,0.3)'); g.addColorStop(1, 'rgba(200,130,60,0)');
    x.fillStyle = g; x.fillRect(0, 0, w, h); x.restore();
    // re-draw the face + beanie so the reveal reads (the candle lights them)
    drawHeroLite(x, 270, 418, 26, t, ac, true);
    flame(x, fl.fx, fl.fy, 28, t, 33, 1);
  }
  void st; void lamp;
}

import { drawHero } from '../core/hero.js';
function drawHeroLite(x, fx, fy, s, t, ac, headOnly = false) {
  if (headOnly) {
    // just the lit head + beanie, on top of the multiply
    x.save(); x.globalAlpha = (ac.figure ?? 1) * 0.92;
    const hx = fx, hy = fy - 6.1 * s;
    x.beginPath(); x.rect(hx - s * 1.4, hy - s * 1.6, s * 2.8, s * 2.9); x.clip();
    drawHero(x, fx, fy, s, { t, pose: 'candleUp', props: { R: 'candle' }, look: [0, 0.1], seed: 21, beanieCol: ac.beanieCol, eyeSize: 1 });
    x.restore();
    return null;
  }
  const info = drawHero(x, fx, fy, s, { t, pose: 'candleUp', props: { R: 'candle' }, look: [0, 0.1], seed: 21, beanieCol: ac.beanieCol });
  const f = info.flames[0];
  return { fx: f.x, fy: f.y };
}

/**
 * POV shot. o: { t, zoom, cx, cy (focus point in city space), city: {...}, frame: 0..1 (window frame visibility),
 *   across: { on, room, figure, beanieCol, sofa, lamp }, sill: {candle}, breathOnGlass }
 */
export function drawPOV(ctx, o) {
  const t = o.t ?? 0, w = ctx.canvas.width, h = ctx.canvas.height;
  const zoom = o.zoom ?? 1, fx = o.cx ?? 800, fy = o.cy ?? HOR + 40;
  const s = (w * 1.12) / CW * zoom;
  ctx.save();
  ctx.translate(w / 2 - fx * s, (o.screenY ?? h * 0.48) - fy * s);
  ctx.scale(s, s);
  drawCity(ctx, { t, snow: 0, ...(o.city || {}) });
  drawMid(ctx, o, t);
  drawAcross(ctx, { ...o, across: o.across || { on: 0 } }, t);
  ctx.restore();
  // snow in screen space (near the glass, independent of zoom)
  if ((o.city?.snow ?? 0.8) > 0) snow(ctx, t, o.city?.snow ?? 0.8, 0, [-40, -60, w + 80, h + 120], 130);
  // ---- the window frame in front ----
  const fk = o.frame ?? 1;
  if (fk > 0) {
    ctx.save(); ctx.globalAlpha = fk;
    const mul = '#2C303F';
    const mx = [w * 0.18 + (o.frameShift ?? 0), w * 0.84 + (o.frameShift ?? 0)];
    for (const [i, x] of mx.entries()) {
      shape(ctx, [[x - 16, -20], [x + 16, -20], [x + 16, h + 20], [x - 16, h + 20]], { fill: mul, w: 3, seed: 801 + i });
      stroke(ctx, [[x + 6, -10], [x + 6, h + 10]], { w: 1.2, seed: 803 + i, alpha: 0.35, color: '#7d86a6' });
    }
    // sill
    shape(ctx, [[-20, h - 58], [w + 20, h - 58], [w + 20, h + 20], [-20, h + 20]], { fill: '#3B3F4F', w: 3, seed: 805 });
    stroke(ctx, [[-20, h - 46], [w + 20, h - 46]], { w: 1.4, seed: 806, alpha: 0.45, color: '#8d94b0' });
    // condensation along the bottom of the glass
    const g = ctx.createLinearGradient(0, h - 170, 0, h - 58);
    g.addColorStop(0, 'rgba(190,200,220,0)'); g.addColorStop(1, `rgba(190,200,220,${0.22 * (o.frost ?? 1)})`);
    ctx.fillStyle = g; ctx.fillRect(0, h - 170, w, 112);
    ctx.restore();
  }
  if (o.after) o.after(ctx, s);
  return { s };
}
