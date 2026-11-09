// Outside views: the hero's tower at night (establishing / "everyone knows which window is yours"),
// and the city from above going dark block by block.
import { PAL, clamp, lerp, mix, hash, rng, rgba, noise1 } from '../core/lib.js';
import { stroke, shape, fill, rectPts, ellipsePts, quad } from '../core/ink.js';
import { snow } from './city.js';
import { bloom } from '../core/light.js';

// ------------------------------------------------------------------ the tower
const FLOOR = 28, FLOORS = 46, TW = 300, COLS = 7, OUR = { floor: 40, col: 4 };
let TL = null;
function towerLayout() {
  if (TL) return TL;
  const R = rng(77);
  const others = [];
  for (let i = 0; i < 18; i++) {
    const depth = 0.35 + R() * 0.55; // 1 = same plane as our tower
    const x = (R() - 0.5) * 2600, w = 140 + R() * 220, hgt = 300 + R() * (R() < 0.3 ? 1300 : 800);
    if (Math.abs(x) < 260 && depth > 0.8) continue;
    others.push({ x, w, h: hgt, depth, seed: i * 13 + 5 });
  }
  others.sort((a, b) => a.depth - b.depth);
  TL = { others };
  return TL;
}
export function ourWindowCenter() {
  const cw = TW / COLS;
  return [-TW / 2 + (OUR.col + 0.5) * cw, -(OUR.floor - 0.5) * FLOOR];
}
/**
 * o: { t, cx, cy, zoom, lit (city 0..1), ours: 0..1 window glow, oursKind: 'lamp'|'candle', snow }
 */
export function drawTower(ctx, o) {
  const t = o.t ?? 0, w = ctx.canvas.width, h = ctx.canvas.height;
  const zoom = o.zoom ?? 1, cx = o.cx ?? 0, cy = o.cy ?? -900;
  // sky
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#141B36'); g.addColorStop(0.7, PAL.glass); g.addColorStop(1, '#2F3B66');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 90; i++) { ctx.fillStyle = `rgba(230,225,210,${0.2 + 0.4 * hash(i, 4)})`; ctx.fillRect(hash(i, 1) * w, hash(i, 2) * h * 0.8, 1.4, 1.4); }
  const mx = w * 0.82, my = h * 0.16;
  bloom(ctx, mx, my, 150, '#d8dbe4', 0.18);
  shape(ctx, ellipsePts(mx, my, 26, 26), { fill: '#E6E1D2', w: 2, seed: 41 });
  const L = towerLayout();
  const lit = o.lit ?? 1;
  // other buildings (parallax by depth)
  for (const b of L.others) {
    const z = zoom * (0.5 + b.depth * 0.5);
    const sx = w / 2 + (b.x - cx * b.depth) * z, sy = h / 2 + (0 - cy * b.depth) * z - (1 - b.depth) * 120 * zoom;
    const bw = b.w * z, bh = b.h * z;
    if (sx + bw / 2 < -50 || sx - bw / 2 > w + 50) continue;
    const body = mix('#252E55', '#38426C', b.depth);
    shape(ctx, rectPts(sx - bw / 2, sy - bh, bw, bh + 4000), { fill: body, w: 1.2 + b.depth * 1.6, seed: b.seed, amp: 0.7, inkAlpha: 0.7 });
    const cols = Math.max(3, Math.round(b.w / 40)), rows = Math.round(b.h / FLOOR);
    const cwid = bw / cols, rh = FLOOR * z;
    for (let r = 0; r < rows + 40; r++) {
      const yy = sy - bh + r * rh + rh * 0.25; if (yy > h + 10) break; if (yy < -10) continue;
      for (let c = 0; c < cols; c++) {
        const on = hash(c + r * 31, b.seed) < 0.45 ? lit * (0.5 + 0.5 * hash(c + r * 17, b.seed + 1)) : 0;
        ctx.fillStyle = on > 0.05 ? mix('#1C2344', PAL.amber, on) : '#1E2648';
        ctx.fillRect(sx - bw / 2 + c * cwid + cwid * 0.22, yy, cwid * 0.56, rh * 0.5);
      }
    }
  }
  // our tower
  const sx = w / 2 + (0 - cx) * zoom, sy = h / 2 + (0 - cy) * zoom;
  const tw = TW * zoom, th = FLOOR * FLOORS * zoom, rh = FLOOR * zoom, cw = tw / COLS;
  shape(ctx, rectPts(sx - tw / 2, sy - th, tw, th + 3000), { fill: '#3A4470', w: 3, seed: 61 });
  fill(ctx, rectPts(sx - tw / 2 - 2, sy - th - 4, tw + 4, 8), '#C9CBD2', { seed: 62 });
  shape(ctx, rectPts(sx - tw * 0.18, sy - th - rh * 1.4, tw * 0.36, rh * 1.4), { fill: '#343D66', w: 2.2, seed: 63 });
  for (let f = 1; f <= FLOORS; f++) {
    const yy = sy - f * rh;
    if (yy > h + rh || yy < -rh) continue;
    if (zoom > 0.9) stroke(ctx, [[sx - tw / 2, yy + rh], [sx + tw / 2, yy + rh]], { w: 1, seed: 70 + f, alpha: 0.35 });
    for (let c = 0; c < COLS; c++) {
      const x = sx - tw / 2 + c * cw + cw * 0.16, wy = yy + rh * 0.2, ww = cw * 0.68, wh = rh * 0.62;
      if (f === OUR.floor && c === OUR.col) { ourWindow(ctx, x, wy, ww, wh, o, t, zoom); continue; }
      const on = hash(c + f * 31, 9) < 0.5 ? lit * (0.45 + 0.55 * hash(c + f * 17, 10)) : 0;
      ctx.fillStyle = on > 0.05 ? mix('#1E2648', PAL.amber, on) : '#232B4F';
      ctx.fillRect(x, wy, ww, wh);
      if (zoom > 1.2) shape(ctx, rectPts(x, wy, ww, wh), { w: 1.1, seed: 90 + f * 7 + c, inkAlpha: 0.6 });
    }
  }
  if (o.snow !== 0) snow(ctx, t, o.snow ?? 0.9, 0, [-40, -60, w + 80, h + 120], 170);
}
function ourWindow(ctx, x, y, ww, wh, o, t, zoom) {
  const k = o.ours ?? 1, kind = o.oursKind || 'lamp';
  const warm = kind === 'lamp' ? '#E8A65A' : '#D99550';
  ctx.save();
  ctx.fillStyle = mix('#1E2648', warm, k * (kind === 'candle' ? 0.8 + 0.08 * noise1(t * 7, 2) : 1)); ctx.fillRect(x, y, ww, wh);
  if (zoom > 0.8 && k > 0) {
    ctx.beginPath(); ctx.rect(x, y, ww, wh); ctx.clip();
    // the hero, tiny, at the glass: a stick silhouette with the mustard beanie
    const s = wh * 0.085, fx = x + ww * 0.42, fy = y + wh * 0.98;
    ctx.strokeStyle = 'rgba(43,39,36,0.85)'; ctx.lineWidth = Math.max(1, s * 0.25); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(fx, fy - s * 6); ctx.lineTo(fx, fy - s * 2.7); ctx.lineTo(fx - s * 0.6, fy); ctx.moveTo(fx, fy - s * 2.7); ctx.lineTo(fx + s * 0.6, fy);
    ctx.moveTo(fx, fy - s * 4.6); ctx.lineTo(fx - s * 0.8, fy - s * 3); ctx.moveTo(fx, fy - s * 4.6); ctx.lineTo(fx + s * 0.6, fy - s * 3.9); ctx.stroke();
    ctx.fillStyle = '#F4EEE4'; ctx.beginPath(); ctx.arc(fx, fy - s * 6, s, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = PAL.mustard; ctx.beginPath(); ctx.arc(fx, fy - s * 6.2, s * 1.03, Math.PI, 0); ctx.fill();
    if (kind === 'lamp') { ctx.fillStyle = '#F6D49A'; ctx.beginPath(); ctx.moveTo(x + ww * 0.12, y + wh * 0.42); ctx.lineTo(x + ww * 0.26, y + wh * 0.42); ctx.lineTo(x + ww * 0.23, y + wh * 0.3); ctx.lineTo(x + ww * 0.15, y + wh * 0.3); ctx.fill(); ctx.fillRect(x + ww * 0.185, y + wh * 0.42, Math.max(1, ww * 0.012), wh * 0.56); }
    else { ctx.fillStyle = '#FFE2A6'; ctx.beginPath(); ctx.ellipse(fx + s * 0.75, fy - s * 4.25, s * 0.25, s * 0.45, 0, 0, Math.PI * 2); ctx.fill(); }
    // mullion
    ctx.fillStyle = 'rgba(30,30,40,0.8)'; ctx.fillRect(x + ww * 0.62, y, Math.max(1, ww * 0.03), wh);
  }
  ctx.restore();
  shape(ctx, rectPts(x, y, ww, wh), { w: Math.max(1, 1.3 * Math.min(zoom, 2)), seed: 97 });
  if (k > 0) { bloom(ctx, x + ww / 2, y + wh / 2, Math.max(ww, 30) * 2.2, PAL.amber, 0.35 * k); bloom(ctx, x + ww / 2, y + wh / 2, Math.max(ww, 20) * 0.8, '#FFD9A0', 0.3 * k); }
}

// ------------------------------------------------------------------ aerial
const BS = 128, ST = 34;
let AL = null;
function aerialLayout() {
  if (AL) return AL;
  const R = rng(91), blocks = [];
  for (let j = -4; j < 9; j++) for (let i = -5; i < 11; i++) {
    const x = i * (BS + ST), y = j * (BS + ST);
    // river: a diagonal band
    const d = (x * 0.45 - y) - 120;
    if (Math.abs(d) < 120) { blocks.push({ x, y, river: true }); continue; }
    const bl = [], n = 1 + Math.floor(R() * 3);
    if (n === 1) bl.push({ x: 6, y: 6, w: BS - 12, h: BS - 12, ht: 10 + R() * 30 });
    else if (n === 2) { const s = 30 + R() * 60; bl.push({ x: 6, y: 6, w: s, h: BS - 12, ht: 10 + R() * 30 }, { x: s + 12, y: 6, w: BS - s - 18, h: BS - 12, ht: 10 + R() * 40 }); }
    else { bl.push({ x: 6, y: 6, w: BS - 12, h: 50, ht: 12 + R() * 30 }, { x: 6, y: 62, w: 56, h: BS - 68, ht: 8 + R() * 20 }, { x: 68, y: 62, w: BS - 74, h: BS - 68, ht: 15 + R() * 40 }); }
    blocks.push({ x, y, bl, seed: blocks.length, park: R() < 0.07 });
  }
  AL = { blocks };
  return AL;
}
/** o: { t, wave (0..1.2), cx, cy, zoom, rot, origin: [x,y] where the dark starts, snow } */
export function drawAerial(ctx, o) {
  const t = o.t ?? 0, w = ctx.canvas.width, h = ctx.canvas.height;
  const A = aerialLayout();
  ctx.fillStyle = '#1B2140'; ctx.fillRect(0, 0, w, h);
  ctx.save();
  ctx.translate(w / 2, h / 2); ctx.rotate(o.rot ?? -0.12); ctx.scale(o.zoom ?? 1, o.zoom ?? 1); ctx.translate(-(o.cx ?? 700), -(o.cy ?? 500));
  const org = o.origin ?? [-700, -500];
  const order = (b) => Math.hypot(b.x - org[0], b.y - org[1]) / 2300 + hash(b.seed ?? 0, 4) * 0.04;
  const lit = (b) => clamp(((order(b) - (o.wave ?? 0)) * 22) + 0.5);
  // streets
  ctx.fillStyle = '#262C4C'; ctx.fillRect(-1200, -1000, 3200, 2600);
  for (const b of A.blocks) {
    if (b.river) { ctx.fillStyle = '#18203F'; ctx.fillRect(b.x - ST / 2, b.y - ST / 2, BS + ST, BS + ST); continue; }
    const k = lit(b);
    // street light pools at the corners
    if (k > 0.02) for (const [dx, dy] of [[-ST / 2, -ST / 2], [BS + ST / 2, -ST / 2], [-ST / 2, BS / 2]]) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(b.x + dx, b.y + dy, 0, b.x + dx, b.y + dy, 22);
      g.addColorStop(0, rgba(PAL.amber, 0.32 * k)); g.addColorStop(1, rgba(PAL.amber, 0));
      ctx.fillStyle = g; ctx.fillRect(b.x + dx - 22, b.y + dy - 22, 44, 44); ctx.restore();
      ctx.fillStyle = rgba('#FFE0A8', k); ctx.fillRect(b.x + dx - 1.5, b.y + dy - 1.5, 3, 3);
    }
    if (b.park) { shape(ctx, rectPts(b.x + 4, b.y + 4, BS - 8, BS - 8), { fill: '#2F4A45', w: 1.6, seed: b.seed }); for (let i = 0; i < 6; i++) shape(ctx, ellipsePts(b.x + 20 + hash(i, b.seed) * 88, b.y + 20 + hash(i + 9, b.seed) * 88, 9, 9), { fill: '#3E6A4C', w: 1.2, seed: b.seed + i }); continue; }
    for (const [i, q] of b.bl.entries()) {
      const x = b.x + q.x, y = b.y + q.y, off = q.ht * 0.45;
      // south wall (gives the top-down view some depth)
      shape(ctx, [[x, y + q.h], [x + q.w, y + q.h], [x + q.w, y + q.h + off], [x, y + q.h + off]], { fill: '#2A3156', w: 1.3, seed: b.seed * 7 + i, inkAlpha: 0.8 });
      if (k > 0.02) for (let c = 0; c < Math.floor(q.w / 9); c++) if (hash(c, b.seed * 3 + i) < 0.6) { ctx.fillStyle = rgba(PAL.amber, k * (0.5 + 0.5 * hash(c, b.seed + i))); ctx.fillRect(x + 4 + c * 9, y + q.h + off * 0.35, 4, off * 0.35); }
      shape(ctx, rectPts(x, y, q.w, q.h), { fill: o.snowRoofs ? mix('#BFC3CC', '#8E95A8', hash(i, b.seed) * 0.4) : '#3B4573', w: 1.5, seed: b.seed * 11 + i, inkAlpha: 0.85 });
      if (hash(i, b.seed + 7) < 0.5) shape(ctx, rectPts(x + q.w * 0.25, y + q.h * 0.3, Math.min(18, q.w * 0.3), Math.min(14, q.h * 0.25)), { fill: '#596285', w: 1.1, seed: b.seed + i + 50 });
      // lit skylight / rooftop glow
      if (k > 0.02 && hash(i, b.seed + 3) < 0.45) { ctx.fillStyle = rgba('#F2C27A', 0.85 * k); ctx.fillRect(x + q.w * 0.6, y + q.h * 0.55, 6, 6); }
    }
  }
  if (o.mark) {
    // our tower: a little pin of light that is the last one on
    const [mx, my] = o.mark; const k = o.markK ?? 1;
    bloom(ctx, mx, my, 70, PAL.amber, 0.5 * k); ctx.fillStyle = rgba('#FFE0A8', k); ctx.fillRect(mx - 3, my - 3, 6, 6);
  }
  ctx.restore();
  if (o.snow) snow(ctx, t, o.snow, 0, [-40, -60, w + 80, h + 120], 150);
}
