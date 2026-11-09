// The style sheet as code: "every edge is hand-inked and slightly uneven — never clean vector line".
// Lines are variable-width filled ribbons along a noise-displaced path; fills sit slightly off the line
// (misregistration), and the whole drawing "boils" at 8 fps like hand-drawn animation.
import { PAL, noise1, noise2, hash, clamp, lerp, rgba, scratch } from './lib.js';

export const INK = PAL.ink;
let BOIL = 0, BOIL_AMT = 0.45;
export function setBoil(t, amt = 0.45) { BOIL = Math.floor(t * 8); BOIL_AMT = amt; }

// ---------- geometry helpers ----------
export function rectPts(x, y, w, h) { return [[x, y], [x + w, y], [x + w, y + h], [x, y + h]]; }
export function ellipsePts(cx, cy, rx, ry, a0 = 0, a1 = Math.PI * 2, n = 0) {
  n = n || Math.max(12, Math.round(Math.abs(a1 - a0) * Math.max(rx, ry) / 6));
  const out = [];
  for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * (i / n); out.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); }
  if (Math.abs(a1 - a0 - Math.PI * 2) < 1e-6) out.pop();
  return out;
}
export function bez(p0, p1, p2, p3, n = 16) {
  const o = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, u = 1 - t;
    o.push([u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]);
  }
  return o;
}
export function quad(p0, c, p1, n = 12) {
  const o = [];
  for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t; o.push([u * u * p0[0] + 2 * u * t * c[0] + t * t * p1[0], u * u * p0[1] + 2 * u * t * c[1] + t * t * p1[1]]); }
  return o;
}
/** round the corners of a closed polygon (screen space radius) */
export function roundPts(pts, r, seg = 4) {
  if (r <= 0.5) return pts;
  const out = [], n = pts.length;
  for (let i = 0; i < n; i++) {
    const p = pts[i], a = pts[(i - 1 + n) % n], b = pts[(i + 1) % n];
    const da = Math.hypot(a[0] - p[0], a[1] - p[1]), db = Math.hypot(b[0] - p[0], b[1] - p[1]);
    const rr = Math.min(r, da * 0.45, db * 0.45);
    const pa = [p[0] + (a[0] - p[0]) / da * rr, p[1] + (a[1] - p[1]) / da * rr];
    const pb = [p[0] + (b[0] - p[0]) / db * rr, p[1] + (b[1] - p[1]) / db * rr];
    for (let k = 0; k <= seg; k++) { const t = k / seg, u = 1 - t; out.push([u * u * pa[0] + 2 * u * t * p[0] + t * t * pb[0], u * u * pa[1] + 2 * u * t * p[1] + t * t * pb[1]]); }
  }
  return out;
}

// ---------- the wobble ----------
function resample(pts, closed, step) {
  const P = closed ? [...pts, pts[0]] : pts;
  const out = []; let s = 0;
  if (P.length < 2) return out;
  out.push({ x: P[0][0], y: P[0][1], s: 0 });
  let carry = 0;
  for (let i = 1; i < P.length; i++) {
    const ax = P[i - 1][0], ay = P[i - 1][1], bx = P[i][0], by = P[i][1];
    const L = Math.hypot(bx - ax, by - ay); if (L < 1e-6) continue;
    let d = step - carry;
    while (d <= L) { const t = d / L; s += step; out.push({ x: ax + (bx - ax) * t, y: ay + (by - ay) * t, s }); d += step; }
    carry = L - (d - step);
  }
  const last = P[P.length - 1], lp = out[out.length - 1];
  const tail = Math.hypot(last[0] - lp.x, last[1] - lp.y);
  if (tail > step * 0.35) out.push({ x: last[0], y: last[1], s: s + tail });
  if (closed && out.length > 2) out.pop();
  return out;
}
function normals(R, closed) {
  const n = R.length;
  for (let i = 0; i < n; i++) {
    const a = R[closed ? (i - 1 + n) % n : Math.max(0, i - 1)], b = R[closed ? (i + 1) % n : Math.min(n - 1, i + 1)];
    let dx = b.x - a.x, dy = b.y - a.y; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
    R[i].nx = -dy; R[i].ny = dx;
  }
}
/** displace a path by low-frequency noise along its normal (periodic for closed shapes) */
export function wobble(pts, { closed = false, amp = 1.2, freq = 0.018, seed = 1, step = 5, boil = 1 } = {}) {
  const R = resample(pts, closed, step); if (R.length < 2) return R;
  normals(R, closed);
  const L = R[R.length - 1].s + step;
  const b = boil * BOIL_AMT;
  for (const p of R) {
    let n;
    if (closed) { const a = (p.s / L) * Math.PI * 2, rad = Math.max(1, L * freq / (Math.PI * 2)); n = noise2(Math.cos(a) * rad + seed * 3.7, Math.sin(a) * rad, seed) * amp + noise2(Math.cos(a) * rad * 2.1, Math.sin(a) * rad * 2.1 + BOIL * 5.3, seed + 11) * b; }
    else n = noise1(p.s * freq + seed * 7.31, seed) * amp + noise1(p.s * freq * 2.1 + BOIL * 5.3, seed + 11) * b;
    p.x += p.nx * n; p.y += p.ny * n;
  }
  return R;
}

// ---------- strokes ----------
/** one inked line: variable width ribbon, tapered ends, optional reveal (0..1) for write-on */
export function stroke(ctx, pts, o = {}) {
  const { w = 2.4, closed = false, color = INK, alpha = 1, amp = 1.0, seed = 1, reveal = 1, taper = 0.55, press = 0.35, step = 4, freq = 0.018, boil = 1 } = o;
  if (reveal <= 0 || pts.length < 2) return;
  const R = wobble(pts, { closed, amp, seed, step, freq, boil });
  let n = R.length; if (n < 2) return;
  const isClosed = closed && reveal >= 1;
  if (!isClosed) { n = Math.max(2, Math.round(n * clamp(reveal))); normals(R, false); }
  const left = [], right = [];
  for (let i = 0; i < n; i++) {
    const p = R[i], u = n > 1 ? i / (n - 1) : 0;
    let ww = w * (1 + press * noise1(p.s * 0.035 + seed * 1.7, seed + 3));
    if (!isClosed) { const e = Math.min(u, 1 - u) / 0.14; ww *= taper + (1 - taper) * clamp(e) * clamp(e) * (3 - 2 * clamp(e)); }
    const h = Math.max(0.35, ww * 0.5);
    left.push([p.x + p.nx * h, p.y + p.ny * h]); right.push([p.x - p.nx * h, p.y - p.ny * h]);
  }
  ctx.save();
  ctx.globalAlpha *= alpha; ctx.fillStyle = color;
  ctx.beginPath();
  if (isClosed) {
    ctx.moveTo(left[0][0], left[0][1]); for (let i = 1; i < n; i++) ctx.lineTo(left[i][0], left[i][1]); ctx.closePath();
    ctx.moveTo(right[n - 1][0], right[n - 1][1]); for (let i = n - 2; i >= 0; i--) ctx.lineTo(right[i][0], right[i][1]); ctx.closePath();
  } else {
    ctx.moveTo(left[0][0], left[0][1]); for (let i = 1; i < n; i++) ctx.lineTo(left[i][0], left[i][1]);
    for (let i = n - 1; i >= 0; i--) ctx.lineTo(right[i][0], right[i][1]); ctx.closePath();
  }
  ctx.fill('nonzero');
  ctx.restore();
}
export function line(ctx, a, b, o = {}) { stroke(ctx, [a, b], { step: 4, ...o }); }

/** fill a closed shape with a softly wobbled edge */
export function fill(ctx, pts, color, o = {}) {
  const { amp = 0.8, seed = 2, alpha = 1, dx = 0, dy = 0 } = o;
  if (pts.length < 3) return;
  const R = wobble(pts, { closed: true, amp, seed: seed + 50, step: 6, boil: 0.6 });
  ctx.save(); ctx.globalAlpha *= alpha; ctx.fillStyle = color; ctx.beginPath();
  R.forEach((p, i) => (i ? ctx.lineTo(p.x + dx, p.y + dy) : ctx.moveTo(p.x + dx, p.y + dy)));
  ctx.closePath(); ctx.fill(); ctx.restore();
}
export function pathOf(ctx, pts) { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); }

/** fill + ink outline (the workhorse). w = line weight in px. */
export function shape(ctx, pts, o = {}) {
  const { fill: f, w = 2.4, seed = 1, amp = 1.0, ink = true, round = 0, alpha = 1, inkColor = INK, inkAlpha = 1, reveal = 1 } = o;
  const P = round ? roundPts(pts, round) : pts;
  if (f) fill(ctx, P, f, { seed, alpha, amp: amp * 0.7, dx: 0.6, dy: -0.4 });
  if (ink && w > 0) stroke(ctx, P, { closed: true, w, seed, amp, color: inkColor, alpha: alpha * inkAlpha, taper: 1, reveal });
}

/** cross-hatching clipped to a polygon (shadows) */
export function hatch(ctx, pts, o = {}) {
  const { angle = -0.9, gap = 7, w = 1.1, alpha = 0.45, seed = 5, color = INK, cross = false } = o;
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  ctx.save(); pathOf(ctx, pts); ctx.clip();
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, R = Math.hypot(x1 - x0, y1 - y0) / 2 + gap;
  const angs = cross ? [angle, angle + 1.35] : [angle];
  angs.forEach((ang, ai) => {
    const ux = Math.cos(ang), uy = Math.sin(ang), vx = -uy, vy = ux;
    let k = 0;
    for (let d = -R; d <= R; d += gap) {
      const j = (hash(k++, seed + ai) - 0.5) * gap * 0.5;
      const px = cx + vx * (d + j), py = cy + vy * (d + j);
      stroke(ctx, [[px - ux * R, py - uy * R], [px + ux * R, py + uy * R]], { w, alpha, seed: seed + k, amp: 0.9, color, taper: 0.3, step: 6 });
    }
  });
  ctx.restore();
}

/** soft radial light blob */
export function glow(ctx, x, y, r, color, a = 1, op = 'lighter') {
  if (r <= 0 || a <= 0) return;
  ctx.save(); ctx.globalCompositeOperation = op;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(color, a)); g.addColorStop(0.35, rgba(color, a * 0.45)); g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.restore();
}

// ---------- hand lettering ----------
/** draw a string letter by letter with a little hand-made jitter; reveal 0..1 types it on */
export function hand(ctx, str, x, y, o = {}) {
  const { font = 'Patrick Hand', size = 40, color = INK, align = 'left', reveal = 1, jitter = 1, seed = 9, weight = '400', ls = 0, alpha = 1, pop = 0 } = o;
  ctx.save(); ctx.font = `${weight} ${size}px "${font}"`; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = color; ctx.globalAlpha *= alpha;
  const chars = [...str], ws = chars.map((c) => ctx.measureText(c).width + ls);
  const total = ws.reduce((a, b) => a + b, 0) - ls;
  let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
  const shown = reveal * chars.length;
  chars.forEach((c, i) => {
    const k = clamp(shown - i);
    if (k > 0 && c !== ' ') {
      const r = (hash(i, seed) - 0.5) * 0.07 * jitter, dy = (hash(i, seed + 1) - 0.5) * size * 0.05 * jitter;
      const s = pop ? 0.6 + 0.4 * Math.min(1, k * 1.0) + (k < 1 ? 0.15 * Math.sin(k * Math.PI) : 0) : 1;
      ctx.save(); ctx.translate(cx + ws[i] / 2, y + dy); ctx.rotate(r); ctx.scale(s, s); ctx.globalAlpha *= pop ? clamp(k * 1.6) : clamp(k * 3);
      ctx.fillText(c, -ws[i] / 2 + ls / 2, 0); ctx.restore();
    }
    cx += ws[i];
  });
  ctx.restore();
  return total;
}
export function textWidth(ctx, str, font, size, weight = '400') { ctx.save(); ctx.font = `${weight} ${size}px "${font}"`; const w = ctx.measureText(str).width; ctx.restore(); return w; }

// ---------- paper ----------
const tex = {};
export function paperTexture(w, h, seed = 3) {
  const k = `${w}x${h}:${seed}`; if (tex[k]) return tex[k];
  const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
  const img = x.createImageData(w, h), d = img.data;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const n = hash(i + j * 9173, seed) * 0.6 + (noise2(i * 0.012, j * 0.012, seed) * 0.5 + 0.5) * 0.4 + (noise2(i * 0.002, j * 0.002, seed + 4) * 0.5 + 0.5) * 0.25;
    const v = 255 - n * 46; const o = (j * w + i) * 4; d[o] = v; d[o + 1] = v - 3; d[o + 2] = v - 10; d[o + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  // a few long fibres
  for (let i = 0; i < w * h / 9000; i++) {
    const px = hash(i, seed + 9) * w, py = hash(i, seed + 10) * h, a = hash(i, seed + 11) * Math.PI, L = 6 + hash(i, seed + 12) * 22;
    x.strokeStyle = `rgba(90,70,50,${0.05 + hash(i, seed + 13) * 0.08})`; x.lineWidth = 0.7; x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(a) * L, py + Math.sin(a) * L); x.stroke();
  }
  tex[k] = c; return c;
}
/** low-frequency wash so flat fills read like gouache, not vector */
export function washTexture(w, h, seed = 7) {
  const k = `wash${w}x${h}:${seed}`; if (tex[k]) return tex[k];
  const sw = Math.ceil(w / 4), sh = Math.ceil(h / 4);
  const c = document.createElement('canvas'); c.width = sw; c.height = sh; const x = c.getContext('2d');
  const img = x.createImageData(sw, sh), d = img.data;
  for (let j = 0; j < sh; j++) for (let i = 0; i < sw; i++) {
    const n = noise2(i * 0.03, j * 0.03, seed) * 0.6 + noise2(i * 0.09, j * 0.09, seed + 1) * 0.3 + noise2(i * 0.25, j * 0.25, seed + 2) * 0.1;
    const v = 128 + n * 60; const o = (j * sw + i) * 4; d[o] = v; d[o + 1] = v; d[o + 2] = v; d[o + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  const big = document.createElement('canvas'); big.width = w; big.height = h; const bx = big.getContext('2d');
  bx.imageSmoothingQuality = 'high'; bx.drawImage(c, 0, 0, w, h);
  tex[k] = big; return big;
}
/** finish a panel: gouache wash, paper grain, soft vignette */
export function finish(ctx, w, h, { grain = 0.16, wash = 0.22, vignette = 0.35, seed = 3 } = {}) {
  ctx.save();
  if (wash > 0) { ctx.globalCompositeOperation = 'soft-light'; ctx.globalAlpha = wash; ctx.drawImage(washTexture(w, h, seed + 4), 0, 0); }
  if (grain > 0) { ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = grain * 2.2; ctx.drawImage(paperTexture(w, h, seed), 0, 0); }
  if (vignette > 0) {
    ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = 1;
    const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.hypot(w, h) * 0.6);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, `rgba(${Math.round(255 - 150 * vignette)},${Math.round(255 - 160 * vignette)},${Math.round(255 - 140 * vignette)},1)`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  }
  ctx.restore();
}
export { scratch };
