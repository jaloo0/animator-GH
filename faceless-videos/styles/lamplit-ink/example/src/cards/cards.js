// Infographic cards — the reference's cream data cards, redrawn in the sheet's language:
// paper, ink drawn on stroke by stroke, hand-lettered numbers that count, amber only where there is light.
import { PAL, clamp, lerp, mix, hash, ease, inv, noise1, rgba } from '../core/lib.js';
import { stroke, shape, fill, rectPts, ellipsePts, quad, bez, hatch, hand, textWidth, line } from '../core/ink.js';
import { flame, drawHero } from '../core/hero.js';
import { bloom } from '../core/light.js';

const INK = PAL.ink, WATER = '#6F8FA3', WATER_L = '#A8BFCB';
const at = (lt, t0, d = 0.5) => clamp((lt - t0) / d);

export function cardBase(ctx, o = {}) {
  const w = ctx.canvas.width, h = ctx.canvas.height;
  ctx.fillStyle = o.bg || PAL.cream; ctx.fillRect(0, 0, w, h);
  // soft darker edges, like a paper sheet under a lamp
  const g = ctx.createRadialGradient(w / 2, h * 0.45, h * 0.3, w / 2, h / 2, w * 0.75);
  g.addColorStop(0, 'rgba(255,248,230,0.0)'); g.addColorStop(1, 'rgba(120,95,60,0.18)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  if (o.title) {
    hand(ctx, o.title, w / 2, 92, { font: 'Permanent Marker', size: 54, color: INK, align: 'center', reveal: o.titleK ?? 1, seed: 11, ls: 2 });
    const tw = textWidth(ctx, o.title, 'Permanent Marker', 54) + 2 * o.title.length;
    stroke(ctx, [[w / 2 - tw / 2 - 6, 112], [w / 2 + tw / 2 + 10, 108]], { w: 3.4, seed: 12, reveal: clamp((o.titleK ?? 1) * 1.4 - 0.4), color: PAL.amber });
  }
  if (o.sub) hand(ctx, o.sub, w / 2, h - 46, { font: 'Patrick Hand', size: 38, color: mix(INK, PAL.cream, 0.25), align: 'center', reveal: o.subK ?? 1, seed: 13 });
}

// ---------- icons (ink, write-on via k) ----------
export function icoDrop(c, x, y, s, k = 1, col = WATER) {
  const pts = [...quad([x, y - s], [x - s * 0.95, y + s * 0.15], [x - s * 0.6, y + s * 0.62], 10), ...quad([x - s * 0.6, y + s * 0.62], [x, y + s * 1.05], [x + s * 0.6, y + s * 0.62], 10), ...quad([x + s * 0.6, y + s * 0.62], [x + s * 0.95, y + s * 0.15], [x, y - s], 10)];
  if (k > 0.5) fill(c, pts, col, { seed: 31, alpha: clamp((k - 0.5) * 2) });
  stroke(c, pts, { w: s * 0.07, seed: 32, reveal: clamp(k * 1.5), taper: 0.9 });
  if (k > 0.8) stroke(c, quad([x + s * 0.3, y + s * 0.1], [x + s * 0.42, y + s * 0.35], [x + s * 0.3, y + s * 0.58], 6), { w: s * 0.06, seed: 33, color: '#E8F0F2', alpha: (k - 0.8) * 5 });
}
export function icoThermo(c, x, y, s, k = 1, level = 0.5) {
  const tube = [[x - s * 0.18, y - s], [x + s * 0.18, y - s], [x + s * 0.18, y + s * 0.5], [x - s * 0.18, y + s * 0.5]];
  shape(c, tube, { fill: '#F4EEE2', w: s * 0.06, seed: 41, round: s * 0.17, reveal: clamp(k * 1.5) });
  shape(c, ellipsePts(x, y + s * 0.7, s * 0.34, s * 0.34), { fill: WATER, w: s * 0.06, seed: 42, alpha: clamp(k * 2 - 0.4) });
  if (k > 0.6) fill(c, rectPts(x - s * 0.09, y + s * 0.5 - level * s * 1.35, s * 0.18, level * s * 1.35 + s * 0.1), WATER, { seed: 43 });
  for (let i = 0; i < 5; i++) stroke(c, [[x + s * 0.2, y - s * 0.8 + i * s * 0.3], [x + s * 0.36, y - s * 0.8 + i * s * 0.3]], { w: s * 0.04, seed: 44 + i, reveal: clamp(k * 2 - 0.8) });
}
export function icoCandle(c, x, y, s, k = 1, t = 0, lit = 1) {
  shape(c, ellipsePts(x, y + s * 0.02, s * 0.62, s * 0.14), { fill: '#9C8E76', w: s * 0.05, seed: 51, reveal: clamp(k * 1.6) });
  shape(c, [[x - s * 0.22, y - s * 0.9], [x + s * 0.22, y - s * 0.9], [x + s * 0.22, y], [x - s * 0.22, y]], { fill: '#F1E8D4', w: s * 0.05, seed: 52, reveal: clamp(k * 1.6 - 0.3) });
  stroke(c, [[x, y - s * 0.9], [x + s * 0.02, y - s * 1.05]], { w: s * 0.04, seed: 53, reveal: clamp(k * 2 - 1) });
  if (k > 0.8 && lit > 0) flame(c, x + s * 0.02, y - s * 1.02, s * 0.95, t, 54, lit * clamp((k - 0.8) * 5));
}
export function icoBulb(c, x, y, s, k = 1, glowK = 0, t = 0) {
  if (glowK > 0) bloom(c, x, y - s * 0.3, s * 2.2, PAL.amber, 0.45 * glowK);
  const pts = [...ellipsePts(x, y - s * 0.35, s * 0.62, s * 0.62, Math.PI * 0.72, Math.PI * 2.28)];
  pts.push([x + s * 0.24, y + s * 0.35], [x - s * 0.24, y + s * 0.35]);
  shape(c, pts, { fill: glowK > 0 ? mix('#F4EEE2', '#FFE2AA', glowK) : '#F4EEE2', w: s * 0.06, seed: 61, reveal: clamp(k * 1.5) });
  shape(c, rectPts(x - s * 0.24, y + s * 0.35, s * 0.48, s * 0.32), { fill: '#A9A39A', w: s * 0.05, seed: 62, alpha: clamp(k * 2 - 0.5) });
  for (let i = 0; i < 2; i++) stroke(c, [[x - s * 0.24, y + s * 0.45 + i * s * 0.1], [x + s * 0.24, y + s * 0.45 + i * s * 0.1]], { w: s * 0.03, seed: 63 + i, alpha: clamp(k * 2 - 1) });
  stroke(c, [[x - s * 0.14, y + s * 0.3], [x - s * 0.1, y - s * 0.2], [x, y - s * 0.05], [x + s * 0.1, y - s * 0.2], [x + s * 0.14, y + s * 0.3]], { w: s * 0.035, seed: 65, reveal: clamp(k * 2 - 0.8) });
  void t;
}
function cross(c, x, y, s, k, seed = 70) {
  stroke(c, [[x - s, y - s], [x + s, y + s]], { w: s * 0.16, seed, reveal: clamp(k * 2), color: '#8A3B2A', taper: 0.7 });
  stroke(c, [[x + s, y - s], [x - s, y + s]], { w: s * 0.16, seed: seed + 1, reveal: clamp(k * 2 - 1), color: '#8A3B2A', taper: 0.7 });
}
function jug(c, x, y, s, fillK = 1, k = 1, seed = 80) {
  const sc = ease.outBack(clamp(k));
  if (sc <= 0) return;
  c.save(); c.translate(x, y); c.scale(sc, sc);
  const body = [[-s * 0.42, -s * 0.75], [s * 0.42, -s * 0.75], [s * 0.45, s * 0.5], [-s * 0.45, s * 0.5]];
  shape(c, body, { fill: '#E4ECEE', w: s * 0.07, seed, round: s * 0.14 });
  if (fillK > 0) fill(c, [[-s * 0.38, s * 0.46 - fillK * s * 1.1], [s * 0.38, s * 0.46 - fillK * s * 1.1], [s * 0.4, s * 0.46], [-s * 0.4, s * 0.46]], WATER_L, { seed: seed + 1 });
  shape(c, [[-s * 0.2, -s * 0.75], [s * 0.2, -s * 0.75], [s * 0.16, -s * 0.98], [-s * 0.16, -s * 0.98]], { fill: '#E4ECEE', w: s * 0.06, seed: seed + 2 });
  shape(c, rectPts(-s * 0.2, -s * 1.12, s * 0.4, s * 0.16), { fill: PAL.moss, w: s * 0.05, seed: seed + 3 });
  c.restore();
}

// ---------- 1. problem title ----------
export function problemCard(ctx, lt, o) {
  const w = ctx.canvas.width, h = ctx.canvas.height;
  cardBase(ctx, {});
  const k1 = at(lt, 0.05, 0.4), k2 = at(lt, o.wordAt ?? 0.9, 0.5), k3 = at(lt, (o.wordAt ?? 0.9) - 0.2, 0.9);
  hand(ctx, `PROBLEM ${o.n}`, w / 2, 230, { font: 'Patrick Hand SC', size: 68, color: mix(INK, PAL.cream, 0.2), align: 'center', reveal: k1, seed: 101, ls: 6 });
  const word = o.word;
  ctx.save(); ctx.translate(w / 2, 470); const sc = 0.85 + 0.15 * ease.outBack(k2); ctx.scale(sc, sc);
  hand(ctx, word, 0, 0, { font: 'Permanent Marker', size: 190, color: INK, align: 'center', reveal: k2, seed: 102, pop: 1, ls: 6 });
  ctx.restore();
  const tw = textWidth(ctx, word, 'Permanent Marker', 190) + word.length * 6;
  stroke(ctx, [[w / 2 - tw / 2, 512], [w / 2 + tw / 2, 506]], { w: 7, seed: 103, reveal: clamp(k2 * 1.5 - 0.5), color: PAL.amber });
  // the icon, small, beside the number
  const ix = w / 2 + 230, iy = 210;
  if (o.icon === 'drop') icoDrop(ctx, ix, iy, 34, k3);
  if (o.icon === 'thermo') icoThermo(ctx, ix, iy, 40, k3, 0.25);
  if (o.icon === 'candle') icoCandle(ctx, ix, iy + 40, 46, k3, lt);
}

// ---------- 2. pressure: why the taps stop ----------
export function pressureCard(ctx, lt, o) {
  const w = ctx.canvas.width, h = ctx.canvas.height;
  cardBase(ctx, { title: 'WHY THE TAPS STOP', titleK: at(lt, 0, 0.7) });
  const k = (t0, d = 0.6) => at(lt, t0, d);
  // the tower, cut open
  const bx = 150, bw = 250, gy = 650, floors = 40, fh = 12, top = gy - floors * fh;
  shape(ctx, rectPts(bx, top, bw, gy - top), { fill: '#E6DCC6', w: 3.4, seed: 201, reveal: k(0.2, 0.8) });
  for (let f = 2; f < floors; f += 2) stroke(ctx, [[bx + 6, gy - f * fh], [bx + bw - 6, gy - f * fh]], { w: 1.1, seed: 210 + f, alpha: 0.3, reveal: k(0.4 + f * 0.01, 0.4) });
  // ground + street main
  stroke(ctx, [[40, gy], [w - 40, gy]], { w: 3.4, seed: 202, reveal: k(0.1, 0.6) });
  hatch(ctx, rectPts(40, gy, w - 80, 60), { gap: 10, alpha: 0.22, seed: 203 });
  stroke(ctx, [[40, gy + 30], [bx + 40, gy + 30]], { w: 16, seed: 204, color: WATER, reveal: k(0.6, 0.5), taper: 1 });
  hand(ctx, 'city main', 48, gy + 82, { font: 'Patrick Hand', size: 34, color: INK, seed: 205, reveal: k(0.8) });
  // riser pipe
  const rx = bx + 40;
  stroke(ctx, [[rx, gy + 30], [rx, top + 8]], { w: 14, seed: 206, color: '#CFC6B2', reveal: k(0.5, 0.6), taper: 1 });
  const press = ease.out(k(1.2, 1.4));
  const sixY = gy - 6 * fh;
  if (press > 0) stroke(ctx, [[rx, gy + 30], [rx, lerp(gy + 30, sixY, press)]], { w: 11, seed: 207, color: WATER, taper: 1, amp: 0.3 });
  if (press > 0.9) {
    stroke(ctx, [[rx + 16, sixY], [bx + bw + 40, sixY]], { w: 2.4, seed: 208, reveal: k(2.4, 0.5), alpha: 0.85 });
    hand(ctx, '≈ 6 floors', bx + bw + 56, sixY + 14, { font: 'Permanent Marker', size: 54, color: INK, seed: 209, reveal: k(2.5, 0.6) });
    hand(ctx, 'as high as city pressure goes', bx + bw + 58, sixY + 58, { font: 'Patrick Hand', size: 34, color: mix(INK, PAL.cream, 0.3), seed: 211, reveal: k(2.8, 0.8) });
  }
  // pumps lift the rest
  const pumpK = k(o.pumpAt ?? 4.3, 0.6);
  if (pumpK > 0) {
    const px = bx + 80, py = gy - 44;
    shape(ctx, rectPts(px, py, 90, 44), { fill: '#C9C1AE', w: 2.8, seed: 220, reveal: pumpK });
    hand(ctx, 'PUMP', px + 45, py + 32, { font: 'Patrick Hand SC', size: 30, color: INK, align: 'center', seed: 221, reveal: pumpK });
    const lx = px + 120, ly = py + 6;
    const bolt = [[lx, ly - 26], [lx - 14, ly + 5], [lx - 1, ly + 5], [lx - 9, ly + 30], [lx + 14, ly - 5], [lx + 1, ly - 5], [lx + 9, ly - 26]];
    shape(ctx, bolt, { fill: PAL.amber, w: 2.4, seed: 222, reveal: pumpK });
    const lift = ease.inOut(at(lt, (o.pumpAt ?? 4.3) + 0.3, 1.4));
    if (lift > 0.01) stroke(ctx, [[rx, sixY], [rx, lerp(sixY, top + 12, lift)]], { w: 11, seed: 224, color: WATER, taper: 1, amp: 0.3 });
    const ak = k((o.pumpAt ?? 4.3) + 0.5, 0.9);
    hand(ctx, 'electric pumps', bx + bw + 56, top + 150, { font: 'Permanent Marker', size: 54, color: INK, seed: 225, reveal: ak });
    hand(ctx, 'push it up the rest of the way', bx + bw + 58, top + 196, { font: 'Patrick Hand', size: 34, color: mix(INK, PAL.cream, 0.3), seed: 226, reveal: k((o.pumpAt ?? 4.3) + 0.9, 0.9) });
    // arrow up the riser
    const arK = k((o.pumpAt ?? 4.3) + 0.6, 0.8);
    stroke(ctx, [[rx + 30, sixY - 30], [rx + 30, top + 60]], { w: 3, seed: 227, reveal: arK });
    if (arK > 0.9) stroke(ctx, [[rx + 18, top + 78], [rx + 30, top + 58], [rx + 42, top + 78]], { w: 3, seed: 228 });
    // you, at the top
    const yk = k((o.pumpAt ?? 4.3) + 1.4, 0.5);
    if (yk > 0) {
      const yx = bx + bw - 40, yy = top + 22;
      shape(ctx, ellipsePts(yx, yy, 16, 16), { fill: PAL.face, w: 2.2, seed: 230, alpha: yk });
      const dome = ellipsePts(yx, yy - 5, 17, 15, Math.PI, Math.PI * 2); dome.push([yx + 17, yy - 2], [yx - 17, yy - 2]);
      shape(ctx, dome, { fill: PAL.mustard, w: 2, seed: 231, alpha: yk });
      hand(ctx, 'you · 40', yx - 30, yy - 30, { font: 'Patrick Hand', size: 34, color: INK, align: 'right', seed: 233, reveal: yk });
    }
  }
}

// ---------- 3. water math ----------
export function waterCard(ctx, lt, o) {
  const w = ctx.canvas.width;
  cardBase(ctx, { title: 'WATER', titleK: at(lt, 0, 0.5) });
  const t1 = o.galAt ?? 1.5, t2 = o.dayAt ?? 3, t3 = o.monthAt ?? 5.9;
  // tub icon + count
  const tk = at(lt, 0.15, 0.8);
  const tx = 120, ty = 220;
  shape(ctx, [[tx, ty], [tx + 300, ty], [tx + 280, ty + 110], [tx + 20, ty + 110]], { fill: '#EEE9DF', w: 3, seed: 301, reveal: tk, round: 16 });
  const lvl = ease.out(at(lt, 0.4, t1 + 0.6));
  if (lvl > 0) { fill(ctx, [[tx + 16, ty + 16 + (1 - lvl) * 70], [tx + 284, ty + 16 + (1 - lvl) * 70], [tx + 272, ty + 100], [tx + 28, ty + 100]], WATER_L, { seed: 302 }); }
  stroke(ctx, [[tx + 30, ty + 110], [tx + 20, ty + 135]], { w: 4, seed: 303, reveal: tk }); stroke(ctx, [[tx + 270, ty + 110], [tx + 280, ty + 135]], { w: 4, seed: 304, reveal: tk });
  const gal = Math.round(40 * ease.out(at(lt, 0.4, t1 + 0.4)));
  hand(ctx, `≈ ${gal} gal`, tx + 340, ty + 80, { font: 'Permanent Marker', size: 80, color: INK, seed: 305, reveal: at(lt, 0.3, 0.3) });
  hand(ctx, 'one full bath', tx + 345, ty + 125, { font: 'Patrick Hand', size: 38, color: mix(INK, PAL.cream, 0.3), seed: 306, reveal: at(lt, t1, 0.6) });
  // one person, one gallon a day
  const pk = at(lt, t2, 0.6);
  if (pk > 0) {
    jug(ctx, 160, 470, 46, 1, pk, 310);
    hand(ctx, '1 gallon  =  1 person  ·  1 day', 230, 488, { font: 'Patrick Hand', size: 47, color: INK, seed: 311, reveal: at(lt, t2 + 0.2, 0.9) });
  }
  // calendar of 40 days
  const ck = at(lt, t3 - 1.6, 0.4);
  if (ck > 0) {
    const cx0 = 130, cy0 = 560, cs = 19, gap = 4;
    for (let i = 0; i < 40; i++) {
      const kk = at(lt, t3 - 1.6 + i * 0.035, 0.12);
      if (kk <= 0) continue;
      const x = cx0 + (i % 20) * (cs + gap), y = cy0 + Math.floor(i / 20) * (cs + gap);
      shape(ctx, rectPts(x, y, cs * ease.outBack(kk), cs * ease.outBack(kk)), { fill: i < 30 ? WATER_L : '#D8E2E6', w: 1.4, seed: 320 + i });
    }
    const mk = at(lt, t3, 0.5);
    if (mk > 0) {
      ctx.save(); ctx.translate(800, 590); ctx.rotate(-0.08); const s2 = 0.7 + 0.3 * ease.outBack(mk); ctx.scale(s2, s2);
      shape(ctx, rectPts(-150, -48, 300, 96), { w: 4, seed: 330, inkColor: '#8A3B2A', reveal: mk });
      hand(ctx, '≈ 40 DAYS', 0, 18, { font: 'Permanent Marker', size: 54, color: '#8A3B2A', align: 'center', seed: 331, reveal: mk });
      ctx.restore();
    }
  }
}

// ---------- 4. temperature ----------
export function tempCard(ctx, lt, o) {
  const w = ctx.canvas.width, h = ctx.canvas.height;
  cardBase(ctx, { title: 'INSIDE THE FLAT', titleK: at(lt, 0, 0.5) });
  const gx = 170, gy = 600, gw = 760, gh = 400, tmax = 22;
  stroke(ctx, [[gx, gy - gh], [gx, gy]], { w: 3, seed: 401, reveal: at(lt, 0.1, 0.5) });
  stroke(ctx, [[gx, gy], [gx + gw, gy]], { w: 3, seed: 402, reveal: at(lt, 0.2, 0.6) });
  for (const v of [0, 5, 10, 15, 20]) { const y = gy - (v / tmax) * gh; stroke(ctx, [[gx - 10, y], [gx, y]], { w: 2, seed: 403 + v }); hand(ctx, `${v}°`, gx - 20, y + 10, { font: 'Patrick Hand', size: 33, color: INK, align: 'right', seed: 410 + v, reveal: at(lt, 0.3, 0.4) }); if (v > 0) stroke(ctx, [[gx + 4, y], [gx + gw, y]], { w: 1, seed: 420 + v, alpha: 0.18 }); }
  const labels = ['night 1', 'morning 1', 'night 2', 'morning 2', ''];
  labels.forEach((L, i) => L && hand(ctx, L, gx + 40 + i * 175, gy + 40, { font: 'Patrick Hand', size: 33, color: INK, seed: 430 + i, reveal: at(lt, 0.4 + i * 0.1, 0.4) }));
  const data = [[0, 20], [1, 16], [2, 12.5], [3, 8]];
  const X = (i) => gx + 70 + i * 175, Y = (v) => gy - (v / tmax) * gh;
  const pts = data.map(([i, v]) => [X(i), Y(v)]);
  const dk = at(lt, 0.8, (o.eightAt ?? 3.4) - 0.8);
  // smooth line through the points
  const path = [];
  for (let i = 0; i < pts.length - 1; i++) path.push(...quad(pts[i], [(pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2 - 6], pts[i + 1], 10));
  stroke(ctx, path, { w: 5, seed: 440, reveal: dk, color: WATER, taper: 0.9 });
  pts.forEach((p, i) => { const kk = at(lt, 0.8 + (i / 3) * ((o.eightAt ?? 3.4) - 0.8), 0.25); if (kk > 0) shape(ctx, ellipsePts(p[0], p[1], 9 * ease.outBack(kk), 9 * ease.outBack(kk)), { fill: i === 3 ? PAL.cream : WATER, w: 2.4, seed: 450 + i }); });
  const ek = at(lt, o.eightAt ?? 3.4, 0.5);
  if (ek > 0) {
    const p = pts[3];
    hand(ctx, '8°C', p[0] + 26, p[1] - 22, { font: 'Permanent Marker', size: 72, color: INK, seed: 460, reveal: ek });
    hand(ctx, '(46°F)', p[0] + 30, p[1] + 18, { font: 'Patrick Hand', size: 35, color: mix(INK, PAL.cream, 0.3), seed: 461, reveal: ek });
  }
  const fk = at(lt, o.fallAt ?? 4.4, 0.9);
  if (fk > 0) {
    // dashed: and falling
    const p = pts[3];
    for (let i = 0; i < 5; i++) { const u0 = i / 5, u1 = (i + 0.55) / 5; if (fk * 5 < i) break; stroke(ctx, [[p[0] + u0 * 140, p[1] + u0 * 80], [p[0] + u1 * 140, p[1] + u1 * 80]], { w: 4, seed: 470 + i, color: WATER }); }
    hand(ctx, '…and falling', p[0] - 40, p[1] + 150, { font: 'Patrick Hand', size: 40, color: INK, seed: 480, reveal: fk });
  }
}

// ---------- 5. floor plan: shrink your world ----------
export function planCard(ctx, lt, o) {
  const w = ctx.canvas.width;
  cardBase(ctx, { title: 'SHRINK YOUR WORLD', titleK: at(lt, 0, 0.6) });
  const ox = 200, oy = 170, S = 1;
  const rooms = [
    { n: 'living room', r: [0, 0, 380, 300] }, { n: 'kitchen', r: [380, 0, 300, 170] },
    { n: 'bath', r: [380, 170, 150, 130] }, { n: 'small room', r: [530, 170, 150, 230], keep: true }, { n: 'hall', r: [0, 300, 530, 100] },
  ];
  const draw = at(lt, 0.15, 0.9), out = at(lt, o.outAt ?? 1.0, 0.8);
  rooms.forEach((R, i) => {
    const [x, y, ww, hh] = R.r;
    const pts = rectPts(ox + x * S, oy + y * S, ww * S, hh * S);
    const dim = !R.keep ? out : 0;
    shape(ctx, pts, { fill: R.keep && out > 0 ? mix('#EFE6D3', '#F3D9A8', out) : mix('#E8DDC6', '#CFC6B3', dim), w: 3.2, seed: 501 + i, reveal: draw });
    if (dim > 0) hatch(ctx, pts, { gap: 12, alpha: 0.35 * dim, seed: 510 + i, angle: -0.8 });
    hand(ctx, R.n, ox + (x + ww / 2) * S, oy + (y + hh / 2 + 10) * S, { font: 'Patrick Hand', size: 35, color: R.keep ? INK : mix(INK, PAL.cream, 0.15 + 0.4 * dim), align: 'center', seed: 520 + i, reveal: at(lt, 0.4 + i * 0.08, 0.4) });
  });
  if (out > 0) {
    // a hand-drawn loop around the small room + "live here"
    const cx = ox + 605 * S, cy = oy + 285 * S;
    stroke(ctx, ellipsePts(cx, cy, 120, 150, -1.3, -1.3 + Math.PI * 2.1, 60), { w: 4.5, seed: 530, color: PAL.amber, reveal: at(lt, (o.outAt ?? 1.0) + 0.4, 0.7) });
    hand(ctx, 'live here', cx + 110, cy + 190, { font: 'Permanent Marker', size: 44, color: INK, seed: 531, reveal: at(lt, (o.outAt ?? 1.0) + 0.9, 0.5) });
  }
}

// ---------- 6. candle ≈ bulb ----------
export function heatCard(ctx, lt, o) {
  const w = ctx.canvas.width;
  cardBase(ctx, { title: 'ONE CANDLE', titleK: at(lt, 0, 0.5) });
  icoCandle(ctx, 300, 470, 120, at(lt, 0.2, 0.8), lt, 1);
  const bk = at(lt, o.bulbAt ?? 2.4, 0.8);
  if (bk > 0) icoBulb(ctx, 780, 400, 120, bk, clamp(bk * 1.4 - 0.4), lt);
  const ek = at(lt, (o.bulbAt ?? 2.4) - 0.3, 0.5);
  if (ek > 0) hand(ctx, '≈', 540, 430, { font: 'Permanent Marker', size: 120, color: INK, align: 'center', seed: 601, reveal: ek });
  hand(ctx, '≈ 80 W of heat', 300, 600, { font: 'Patrick Hand', size: 45, color: INK, align: 'center', seed: 602, reveal: at(lt, 1.0, 0.7) });
  if (bk > 0) hand(ctx, 'an old 80 W bulb', 780, 600, { font: 'Patrick Hand', size: 45, color: INK, align: 'center', seed: 603, reveal: at(lt, (o.bulbAt ?? 2.4) + 0.4, 0.7) });
}

// ---------- 7. do not ----------
export function noCard(ctx, lt, o) {
  cardBase(ctx, { title: 'NEVER FOR HEAT', titleK: at(lt, 0, 0.5) });
  // gas stove
  const sk = at(lt, 0.2, 0.8);
  const sx = 170, sy = 230;
  shape(ctx, rectPts(sx, sy + 60, 290, 250), { fill: '#D9D3C6', w: 3.2, seed: 701, reveal: sk });
  shape(ctx, rectPts(sx + 20, sy + 140, 250, 150), { fill: '#BDB6A8', w: 2.4, seed: 702, reveal: sk });
  for (const [bx, by] of [[sx + 80, sy + 92], [sx + 210, sy + 92]]) {
    shape(ctx, ellipsePts(bx, by, 52, 16), { fill: '#7E7A74', w: 2.4, seed: 703 + bx, reveal: sk });
    if (sk > 0.7) for (let i = 0; i < 6; i++) { const ax = bx - 40 + i * 16; const fl = 10 + 5 * Math.sin(lt * 12 + i); shape(ctx, [[ax - 5, by - 6], [ax, by - 6 - fl], [ax + 5, by - 6]], { fill: '#7FA0D8', w: 1.2, seed: 710 + i + bx }); }
  }
  for (let i = 0; i < 4; i++) shape(ctx, ellipsePts(sx + 55 + i * 60, sy + 120, 10, 10), { fill: '#3A332E', w: 1.6, seed: 720 + i, reveal: sk });
  hand(ctx, 'gas stove', sx + 145, sy + 360, { font: 'Patrick Hand', size: 45, color: INK, align: 'center', seed: 721, reveal: sk });
  // barbecue
  const bk = at(lt, o.bbqAt ?? 2.7, 0.8);
  const gx = 700, gy = 300;
  if (bk > 0) {
    const bowl = [...ellipsePts(gx, gy, 140, 22, 0, Math.PI, 20), ...quad([gx - 140, gy], [gx - 120, gy + 120], [gx, gy + 130], 10).reverse()];
    shape(ctx, [...quad([gx - 140, gy], [gx - 110, gy + 125], [gx, gy + 128], 12), ...quad([gx, gy + 128], [gx + 110, gy + 125], [gx + 140, gy], 12)], { fill: '#3A3A3E', w: 3, seed: 730, reveal: bk });
    shape(ctx, ellipsePts(gx, gy, 140, 22), { fill: '#5B5B60', w: 2.6, seed: 731, reveal: bk });
    for (let i = -5; i <= 5; i++) stroke(ctx, [[gx + i * 22, gy - 18 + Math.abs(i) * 1.5], [gx + i * 22, gy + 18 - Math.abs(i) * 1.5]], { w: 1.6, seed: 732 + i, alpha: 0.8, reveal: bk });
    for (const lx of [-80, 80, 0]) stroke(ctx, [[gx + lx * 0.7, gy + 115], [gx + lx * 1.2, gy + 230]], { w: 4, seed: 745 + lx, reveal: bk });
    // smoke
    for (let i = 0; i < 3; i++) { const pts = []; for (let j = 0; j <= 10; j++) { const u = j / 10; pts.push([gx - 40 + i * 40 + Math.sin(u * 6 + lt * 2 + i) * 14, gy - 30 - u * 120]); } stroke(ctx, pts, { w: 2.6, seed: 750 + i, color: '#9A958C', alpha: 0.6 * bk }); }
    void bowl;
  }
  hand(ctx, 'barbecue', gx, gy + 290, { font: 'Patrick Hand', size: 45, color: INK, align: 'center', seed: 760, reveal: at(lt, (o.bbqAt ?? 2.7) + 0.2, 0.6) });
  cross(ctx, sx + 145, sy + 185, 130, at(lt, o.x1At ?? 1.4, 0.6), 770);
  cross(ctx, gx, gy + 70, 130, at(lt, o.x2At ?? 3.8, 0.6), 780);
}

// ---------- 8. carbon monoxide ----------
export function coCard(ctx, lt, o) {
  const w = ctx.canvas.width;
  cardBase(ctx, { title: 'CARBON MONOXIDE', titleK: at(lt, 0, 0.6) });
  // "CO" drawn as a faint dotted ghost — you can't see it
  const gk = at(lt, 0.4, 1.2);
  ctx.save(); ctx.globalAlpha = 0.16 + 0.08 * Math.sin(lt * 2);
  hand(ctx, 'CO', 330, 470, { font: 'Permanent Marker', size: 300, color: '#8C8678', align: 'center', seed: 801, reveal: gk });
  ctx.restore();
  ctx.save(); ctx.setLineDash([6, 14]); ctx.lineWidth = 3; ctx.strokeStyle = rgba(INK, 0.55 * gk); ctx.font = '300px "Permanent Marker"'; ctx.textAlign = 'center'; ctx.strokeText('CO', 330, 470); ctx.restore();
  const items = [['no smell', o.smellAt ?? 1.2], ['no colour', o.colourAt ?? 2.0]];
  items.forEach(([txt, t0], i) => {
    const k = at(lt, t0, 0.5);
    if (k <= 0) return;
    const y = 270 + i * 90;
    shape(ctx, rectPts(600, y - 34, 40, 40), { w: 2.8, seed: 810 + i, reveal: k });
    stroke(ctx, [[606, y - 14], [618, y], [646, y - 44]], { w: 4.5, seed: 812 + i, reveal: clamp(k * 1.5 - 0.3), color: PAL.moss });
    hand(ctx, txt, 662, y, { font: 'Permanent Marker', size: 48, color: INK, seed: 814 + i, reveal: k });
  });
  // it works while you sleep — a tiny sleeping hero
  const sk = at(lt, o.sleepAt ?? 3.2, 0.7);
  if (sk > 0) {
    ctx.save(); ctx.globalAlpha = sk;
    const bx = 610, by = 560;
    shape(ctx, [[bx, by], [bx + 330, by], [bx + 330, by + 40], [bx, by + 40]], { fill: '#B9AE97', w: 2.6, seed: 820, round: 10 });
    shape(ctx, [[bx + 90, by - 34], [bx + 320, by - 30], [bx + 330, by + 8], [bx + 80, by + 8]], { fill: PAL.moss, w: 2.6, seed: 821, round: 22 });
    shape(ctx, ellipsePts(bx + 50, by - 18, 34, 34), { fill: PAL.face, w: 2.6, seed: 822 });
    const dome = ellipsePts(bx + 42, by - 26, 36, 30, Math.PI * 0.55, Math.PI * 1.45); shape(ctx, dome, { fill: PAL.mustard, w: 2.4, seed: 823 });
    stroke(ctx, [[bx + 52, by - 12], [bx + 64, by - 12]], { w: 2.6, seed: 824 }); stroke(ctx, [[bx + 70, by - 10], [bx + 80, by - 10]], { w: 2.6, seed: 825 });
    for (let i = 0; i < 3; i++) { const ph = (lt * 0.6 + i / 3) % 1; hand(ctx, 'z', bx + 90 + ph * 60 + i * 6, by - 50 - ph * 70, { font: 'Permanent Marker', size: 26 + i * 8, color: INK, alpha: Math.sin(ph * Math.PI), seed: 826 + i }); }
    ctx.restore();
    hand(ctx, 'it works while you sleep', 775, 670, { font: 'Patrick Hand', size: 40, color: INK, align: 'center', seed: 830, reveal: at(lt, (o.sleepAt ?? 3.2) + 0.3, 0.8) });
  }
}

// ---------- 9. how far a candle can be seen ----------
export function seeCard(ctx, lt, o) {
  const w = ctx.canvas.width, h = ctx.canvas.height;
  // dark card: it's about darkness
  cardBase(ctx, { bg: '#26294A' });
  hand(ctx, 'IN A DARK CITY', w / 2, 92, { font: 'Permanent Marker', size: 54, color: PAL.cream, align: 'center', reveal: at(lt, 0, 0.5), seed: 901, ls: 2 });
  // eye on the left
  const ek = at(lt, 0.3, 0.6), ex = 130, ey = 400;
  stroke(ctx, [...quad([ex - 55, ey], [ex, ey - 46], [ex + 55, ey], 10), ...quad([ex + 55, ey], [ex, ey + 46], [ex - 55, ey], 10)], { w: 4, seed: 902, color: PAL.cream, reveal: ek, closed: true });
  if (ek > 0.6) { fill(ctx, ellipsePts(ex, ey, 20, 20), PAL.cream, { seed: 903 }); fill(ctx, ellipsePts(ex + 3, ey, 9, 9), '#26294A', { seed: 904 }); }
  // the line of sight
  const lk = at(lt, o.lineAt ?? 1.2, 1.8);
  for (let i = 0; i < 40; i++) { const u0 = i / 40, u1 = (i + 0.5) / 40; if (u0 > lk) break; stroke(ctx, [[lerp(ex + 80, 940, u0), ey], [lerp(ex + 80, 940, u1), ey]], { w: 2.4, seed: 905 + i, color: PAL.cream, alpha: 0.7 }); }
  // the tiny candle far away
  const ck = at(lt, 0.6, 0.6);
  if (ck > 0) { flame(ctx, 960, ey, 22, lt, 911, ck); }
  // ruler
  const rk = at(lt, o.mileAt ?? 2.6, 0.9);
  if (rk > 0) {
    stroke(ctx, [[ex + 80, ey + 110], [lerp(ex + 80, 940, rk), ey + 110]], { w: 3, seed: 920, color: PAL.cream });
    for (let i = 0; i <= 10; i++) if (i / 10 <= rk) stroke(ctx, [[lerp(ex + 80, 940, i / 10), ey + 98 - (i % 5 === 0 ? 10 : 0)], [lerp(ex + 80, 940, i / 10), ey + 122]], { w: 2, seed: 921 + i, color: PAL.cream });
    hand(ctx, '0', ex + 80, ey + 170, { font: 'Patrick Hand', size: 38, color: PAL.cream, align: 'center', seed: 935 });
    if (rk > 0.95) hand(ctx, '1 mile +', 940, ey + 170, { font: 'Permanent Marker', size: 46, color: PAL.amber, align: 'center', seed: 936 });
  }
  hand(ctx, 'one candle can be seen from more than a mile away', w / 2, h - 60, { font: 'Patrick Hand', size: 38, color: mix(PAL.cream, '#26294A', 0.2), align: 'center', seed: 937, reveal: at(lt, (o.mileAt ?? 2.6) + 0.6, 1.0) });
  hand(ctx, '(≈ 2.6 km, measured)', w / 2, h - 22, { font: 'Patrick Hand', size: 28, color: mix(PAL.cream, '#26294A', 0.45), align: 'center', seed: 938, reveal: at(lt, (o.mileAt ?? 2.6) + 1.2, 0.6) });
}

// ---------- 10. supplies, night 5 ----------
export function suppliesCard(ctx, lt, o) {
  const w = ctx.canvas.width;
  cardBase(ctx, { title: 'SUPPLIES · NIGHT 5', titleK: at(lt, 0, 0.6) });
  const rowY = [230, 405, 575], lx = 90;
  // water: 33 of 40 gallons (jugs of 5)
  const wk = at(lt, o.waterAt ?? 1.5, 0.5);
  hand(ctx, 'water', lx, rowY[0] + 14, { font: 'Patrick Hand SC', size: 47, color: INK, seed: 1001, reveal: at(lt, 0.3, 0.4) });
  for (let i = 0; i < 8; i++) { const fillK = i < 6 ? 1 : i === 6 ? 0.6 : 0; jug(ctx, 300 + i * 66, rowY[0], 32, fillK, at(lt, (o.waterAt ?? 1.5) + i * 0.06, 0.35), 1010 + i * 4); }
  if (wk > 0) hand(ctx, `${Math.round(33 * ease.out(wk))} gal`, 860, rowY[0] + 18, { font: 'Permanent Marker', size: 54, color: INK, seed: 1040 });
  // candles: 9
  hand(ctx, 'candles', lx, rowY[1] + 14, { font: 'Patrick Hand SC', size: 47, color: INK, seed: 1041, reveal: at(lt, 0.4, 0.4) });
  const ck = at(lt, o.candlesAt ?? 3.6, 0.5);
  for (let i = 0; i < 9; i++) { const kk = at(lt, (o.candlesAt ?? 3.6) + i * 0.05, 0.3); if (kk > 0) icoCandle(ctx, 300 + i * 52, rowY[1] + 40, 34, kk, lt, 0); }
  if (ck > 0) hand(ctx, '9', 860, rowY[1] + 18, { font: 'Permanent Marker', size: 54, color: INK, seed: 1050, reveal: ck });
  // phone 4%
  hand(ctx, 'phone', lx, rowY[2] + 14, { font: 'Patrick Hand SC', size: 47, color: INK, seed: 1051, reveal: at(lt, 0.5, 0.4) });
  const pk = at(lt, o.phoneAt ?? 5.6, 0.5);
  if (pk > 0) {
    shape(ctx, rectPts(300, rowY[2] - 30, 150, 60), { w: 3, seed: 1052, reveal: pk, round: 10 });
    shape(ctx, rectPts(452, rowY[2] - 12, 10, 24), { fill: INK, w: 1.5, seed: 1053, reveal: pk });
    const bl = lerp(1, 0.04, ease.inOut(at(lt, (o.phoneAt ?? 5.6) + 0.2, 0.8)));
    fill(ctx, rectPts(306, rowY[2] - 24, 138 * bl, 48), bl < 0.15 ? '#B2563A' : PAL.moss, { seed: 1054 });
    hand(ctx, `${Math.round(bl * 100)}%`, 860, rowY[2] + 18, { font: 'Permanent Marker', size: 54, color: INK, seed: 1055 });
  }
  const tk = at(lt, o.pocketAt ?? 8.2, 0.7);
  if (tk > 0) {
    ctx.save(); ctx.translate(560, rowY[2]); ctx.rotate(-0.04);
    hand(ctx, '→ inside pocket', 0, 12, { font: 'Patrick Hand', size: 42, color: INK, seed: 1056, reveal: tk });
    hand(ctx, 'cold eats batteries', 10, 52, { font: 'Patrick Hand', size: 33, color: mix(INK, PAL.cream, 0.3), seed: 1057, reveal: at(lt, (o.pocketAt ?? 8.2) + 0.9, 0.8) });
    ctx.restore();
  }
}

// ---------- 11. the map: the light is coming closer ----------
export function mapCard(ctx, lt, o) {
  const w = ctx.canvas.width, h = ctx.canvas.height;
  cardBase(ctx, { title: 'THE LIGHT', titleK: at(lt, 0, 0.5) });
  const mk = at(lt, 0.1, 1.0);
  // river (wavy band)
  const rv = [];
  for (let i = 0; i <= 20; i++) rv.push([60 + i * 48, 250 + Math.sin(i * 0.7) * 18]);
  const rv2 = rv.map(([x, y]) => [x, y + 90]).reverse();
  shape(ctx, [...rv, ...rv2], { fill: '#C9D3D6', w: 2.6, seed: 1101, reveal: mk });
  hand(ctx, 'river', 120, 312, { font: 'Patrick Hand', size: 35, color: mix(INK, PAL.cream, 0.3), seed: 1102, reveal: mk });
  // blocks (the far bank + our side)
  for (let j = 0; j < 1; j++) for (let i = 0; i < 9; i++) shape(ctx, rectPts(80 + i * 105, 160, 80, 70), { fill: '#E2D7BF', w: 1.8, seed: 1110 + i + j * 10, reveal: mk, inkAlpha: 0.7 });
  for (let j = 0; j < 3; j++) for (let i = 0; i < 9; i++) {
    const x = 80 + i * 105, y = 380 + j * 105;
    const ours = i === 4 && j === 2;
    shape(ctx, rectPts(x, y, 80, 80), { fill: ours ? '#F3D9A8' : '#E2D7BF', w: ours ? 3 : 1.8, seed: 1130 + i + j * 10, reveal: mk, inkAlpha: ours ? 1 : 0.7 });
  }
  // you
  const yx = 80 + 4 * 105 + 40, yy = 380 + 2 * 105 + 40;
  hand(ctx, 'YOU', yx, yy + 14, { font: 'Permanent Marker', size: 34, color: INK, align: 'center', seed: 1160, reveal: at(lt, 0.6, 0.4) });
  // the light on each night
  const nights = [
    { n: 'night 3', x: 80 + 7 * 105 + 40, y: 195, t: 0.5 },
    { n: 'night 5', x: 80 + 5 * 105 + 40, y: 380 + 0 * 105 + 40, t: o.fiveAt ?? 3.2 },
  ];
  if (o.seven) nights.push({ n: 'night 7', x: 80 + 4 * 105 + 40, y: 380 + 1 * 105 + 40, t: o.sevenAt ?? 4.5 });
  nights.forEach((N, i) => {
    const k = at(lt, N.t, 0.5);
    if (k <= 0) return;
    if (i > 0) {
      const P = nights[i - 1];
      for (let d = 0; d < 12; d++) { const u0 = d / 12, u1 = (d + 0.5) / 12; if (u0 > k) break; stroke(ctx, [[lerp(P.x, N.x, u0), lerp(P.y, N.y, u0)], [lerp(P.x, N.x, u1), lerp(P.y, N.y, u1)]], { w: 3, seed: 1170 + d + i * 20, color: '#8A6A3A' }); }
    }
    bloom(ctx, N.x, N.y, 70 * k, PAL.amber, 0.5);
    shape(ctx, ellipsePts(N.x, N.y, 14 * ease.outBack(k), 14 * ease.outBack(k)), { fill: PAL.amber, w: 2.4, seed: 1180 + i });
    hand(ctx, N.n, N.x + 24, N.y - 18, { font: 'Patrick Hand', size: 38, color: INK, seed: 1190 + i, reveal: k });
  });
  if ((o.fiveAt ?? 3.2) < lt) hand(ctx, 'two streets away', w / 2 + 150, h - 50, { font: 'Permanent Marker', size: 40, color: INK, align: 'center', seed: 1195, reveal: at(lt, (o.fiveAt ?? 3.2) + 0.5, 0.8) });
}

// ---------- end card ----------
export function endCard(ctx, lt) {
  const w = ctx.canvas.width, h = ctx.canvas.height;
  ctx.fillStyle = '#1E1C26'; ctx.fillRect(0, 0, w, h);
  const k = at(lt, 0.2, 0.8);
  hand(ctx, 'Part 2 tomorrow', w / 2, h / 2 - 10, { font: 'Permanent Marker', size: 84, color: PAL.cream, align: 'center', reveal: k, seed: 1201 });
  hand(ctx, "follow so you don't miss it", w / 2, h / 2 + 60, { font: 'Patrick Hand', size: 47, color: PAL.amber, align: 'center', reveal: at(lt, 0.9, 0.8), seed: 1202 });
  // a last candle, relit
  const ck = at(lt, 1.6, 0.6);
  if (ck > 0) icoCandle(ctx, w / 2, h / 2 + 200, 46, 1, lt, ck);
}
