// Style-sheet components: date stamp, label box, red tag, map label, pin, time chip, particles.
import { W, H, C, clamp, lerp, k, eo, rng } from './main.js';

function rr(x, cx, cy, w, h, r) { x.beginPath(); x.roundRect(cx, cy, w, h, r); }
const font = (wt, px, fam = 'Inter') => `${wt} ${px}px ${fam}`;

/** "OCTOBER 19" + "9:30 a.m. | PARIS", lower-left, Fern stamp: dark box wipes in, text rises */
export function dateStamp(x, t, t0, big, small, opt = {}) {
  const a = k(t, t0, t0 + 0.45), out = opt.out ? 1 - k(t, opt.out, opt.out + 0.3) : 1;
  if (a <= 0 || out <= 0) return;
  const X = opt.x ?? 96, Y = opt.y ?? H - 112;
  x.save(); x.globalAlpha = out;
  x.font = font(900, 58); x.letterSpacing = '1px'; const bw = x.measureText(big).width;
  x.font = font(600, 22); x.letterSpacing = '2px'; const sw = x.measureText(small).width;
  const boxW = Math.max(bw, sw) + 44, boxH = 112;
  x.save(); rr(x, X - 22, Y - 78, boxW * eo(a), boxH, 4); x.clip();
  x.fillStyle = 'rgba(22,17,14,0.62)'; x.fillRect(X - 22, Y - 78, boxW, boxH);
  const r2 = eo(k(t, t0 + 0.12, t0 + 0.6));
  x.globalAlpha = out * r2; x.fillStyle = '#fff'; x.shadowColor = 'rgba(0,0,0,0.35)'; x.shadowBlur = 8;
  x.font = font(900, 58); x.letterSpacing = '1px'; x.fillText(big, X, Y - 16 + (1 - r2) * 10);
  x.font = font(600, 22); x.letterSpacing = '2px'; x.fillStyle = 'rgba(255,255,255,0.86)'; x.fillText(small, X + 2, Y + 18 + (1 - r2) * 10);
  x.restore(); x.restore();
}

/** charcoal label box with white caps (1–2 lines), centred at cx,cy; pops in */
export function labelBox(x, t, t0, lines, cx, cy, opt = {}) {
  const a = eo(k(t, t0, t0 + 0.28)), out = opt.out ? 1 - k(t, opt.out, opt.out + 0.25) : 1;
  if (a <= 0 || out <= 0) return;
  const px = opt.size ?? 26;
  x.save(); x.font = font(700, px); x.letterSpacing = '2px';
  const tw = Math.max(...lines.map((l) => x.measureText(l).width)), lh = px * 1.25;
  const bw = tw + 52, bh = lines.length * lh + 26;
  x.globalAlpha = a * out; x.translate(cx, cy); x.scale(0.94 + 0.06 * a, 0.94 + 0.06 * a);
  if (opt.leader) { // thin line + dot to a point (relative)
    x.strokeStyle = 'rgba(255,255,255,0.85)'; x.lineWidth = 2; x.beginPath(); x.moveTo(opt.leader[0] > 0 ? bw / 2 : -bw / 2, 0);
    const lx = opt.leader[0], ly = opt.leader[1], pr = eo(k(t, t0 + 0.15, t0 + 0.5));
    x.lineTo(lerp(opt.leader[0] > 0 ? bw / 2 : -bw / 2, lx, pr), lerp(0, ly, pr)); x.stroke();
    if (pr > 0.95) { x.fillStyle = '#fff'; x.beginPath(); x.arc(lx, ly, 6, 0, 7); x.fill(); }
  }
  x.fillStyle = opt.fill ?? C.box; rr(x, -bw / 2, -bh / 2, bw, bh, 3); x.fill();
  x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle';
  lines.forEach((l, i) => x.fillText(l, 0, -bh / 2 + 13 + lh * (i + 0.5) + 1));
  x.restore();
}

/** Fern org-chart red tag: title caps + small sub line, centred at cx, top at y */
export function redTag(x, a, title, sub, cx, y) {
  if (a <= 0) return;
  x.save(); x.globalAlpha = a;
  x.font = font(700, 19); x.letterSpacing = '1px'; const tw = x.measureText(title).width;
  x.font = font(600, 14); x.letterSpacing = '0px'; const sw = sub ? x.measureText(sub).width : 0;
  const bw = Math.max(tw, sw) + 30, bh = sub ? 54 : 34;
  x.fillStyle = C.red; rr(x, cx - bw / 2, y, bw, bh, 4); x.fill();
  x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.font = font(700, 19); x.letterSpacing = '1px'; x.fillText(title, cx, y + 18);
  if (sub) { x.font = font(600, 14); x.letterSpacing = '0px'; x.fillStyle = 'rgba(255,255,255,0.88)'; x.fillText(sub, cx, y + 39); }
  x.restore();
}

/** white spaced caps on a map */
export function mapLabel(x, a, text, cx, cy, px = 30, color = '#fff') {
  if (a <= 0) return;
  x.save(); x.globalAlpha = a; x.font = font(700, px); x.letterSpacing = `${Math.round(px * 0.14)}px`;
  x.textAlign = 'center'; x.textBaseline = 'middle'; x.shadowColor = 'rgba(60,30,10,0.35)'; x.shadowBlur = 6;
  x.fillStyle = color; x.fillText(text, cx, cy); x.restore();
}

/** red pin with white ring and two pulse rings */
export function pin(x, t, t0, cx, cy) {
  const a = eo(k(t, t0, t0 + 0.3)); if (a <= 0) return;
  x.save();
  for (let r = 0; r < 2; r++) { const ph = ((t - t0) * 0.8 + r * 0.5) % 1; x.globalAlpha = a * (1 - ph) * 0.7; x.strokeStyle = C.red; x.lineWidth = 3; x.beginPath(); x.arc(cx, cy, 12 + ph * 46, 0, 7); x.stroke(); }
  x.globalAlpha = a; x.fillStyle = '#fff'; x.beginPath(); x.arc(cx, cy, 13 * a, 0, 7); x.fill();
  x.fillStyle = C.red; x.beginPath(); x.arc(cx, cy, 9 * a, 0, 7); x.fill();
  x.restore();
}

/** dark chip top-centre, mono-ish clock (Fern's "FEB 28 03:00 ET") */
export function timeChip(x, a, l1, l2, cx = W / 2, y = 54) {
  if (a <= 0) return;
  x.save(); x.globalAlpha = a; x.font = font(700, 17); x.letterSpacing = '2px';
  const tw = Math.max(x.measureText(l1).width, x.measureText(l2 || '').width) + 40, bh = l2 ? 64 : 40;
  x.fillStyle = 'rgba(38,32,28,0.86)'; rr(x, cx - tw / 2, y, tw, bh, 3); x.fill();
  x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(l1, cx, y + 21);
  if (l2) { x.fillStyle = 'rgba(255,255,255,0.72)'; x.fillText(l2, cx, y + 45); }
  x.restore();
}

/** flat white truck glyph with a furniture-lift ladder (angle 0..1), facing right, at cx,cy (bottom centre) */
export function truck(x, cx, cy, sc, ladder) {
  x.save(); x.translate(cx, cy); x.scale(sc, sc);
  x.shadowColor = 'rgba(40,20,10,0.45)'; x.shadowBlur = 8; x.shadowOffsetY = 3;
  x.fillStyle = '#fff';
  rr(x, -46, -30, 62, 22, 3); x.fill();            // bed
  rr(x, 18, -38, 28, 30, 5); x.fill();             // cab
  x.shadowBlur = 0; x.shadowOffsetY = 0;
  x.fillStyle = 'rgba(60,70,80,0.75)'; rr(x, 30, -33, 12, 10, 2); x.fill();    // window
  x.fillStyle = '#2a211b'; for (const wx of [-30, 0, 32]) { x.beginPath(); x.arc(wx, -6, 7, 0, 7); x.fill(); }
  if (ladder > 0) { // ladder pivots at the back of the bed
    x.save(); x.translate(-40, -30); x.rotate(-ladder * 1.05);
    x.strokeStyle = '#fff'; x.lineWidth = 4; x.lineCap = 'round';
    x.beginPath(); x.moveTo(0, -3); x.lineTo(78, -3); x.moveTo(0, 4); x.lineTo(78, 4); x.stroke();
    x.lineWidth = 2; for (let r = 8; r < 78; r += 10) { x.beginPath(); x.moveTo(r, -3); x.lineTo(r, 4); x.stroke(); }
    x.fillStyle = '#fff'; rr(x, 72, -10, 16, 20, 2); x.fill();
    x.restore();
  }
  x.restore();
}

// ---------- particles (deterministic in t) ----------
/** sparks from a grinder: fan of glowing streaks from (ox,oy), angles a0..a1 (radians, canvas) */
export function sparks(x, t, ox, oy, a0, a1, rate = 220, seed = 5, scale = 1) {
  x.save(); x.globalCompositeOperation = 'lighter'; x.lineCap = 'round';
  const life = 0.42, n = Math.floor(t * rate);
  for (let i = Math.max(0, n - Math.ceil(life * rate)); i <= n; i++) {
    const r = rng(seed * 100003 + i); const born = i / rate, age = t - born; if (age < 0 || age > life) continue;
    const ang = lerp(a0, a1, r()), sp = (520 + r() * 900) * scale, g = 900 * scale;
    const px = ox + Math.cos(ang) * sp * age, py = oy + Math.sin(ang) * sp * age + 0.5 * g * age * age;
    const vx = Math.cos(ang) * sp, vy = Math.sin(ang) * sp + g * age, len = 0.022;
    const f = 1 - age / life;
    x.strokeStyle = `rgba(255,${Math.round(150 + 90 * f)},${Math.round(60 * f)},${0.85 * f})`; x.lineWidth = (1.2 + 2 * r()) * scale;
    x.beginPath(); x.moveTo(px, py); x.lineTo(px - vx * len, py - vy * len); x.stroke();
  }
  // hot core glow
  const gr = x.createRadialGradient(ox, oy, 0, ox, oy, 90 * scale); gr.addColorStop(0, 'rgba(255,220,150,0.55)'); gr.addColorStop(1, 'rgba(255,140,40,0)');
  x.fillStyle = gr; x.fillRect(ox - 100 * scale, oy - 100 * scale, 200 * scale, 200 * scale);
  x.restore();
}

/** glass shards bursting from (ox,oy) at time t0 */
export function shards(x, t, t0, ox, oy, n = 70, seed = 9) {
  const age = t - t0; if (age < 0 || age > 1.6) return;
  x.save();
  for (let i = 0; i < n; i++) {
    const r = rng(seed * 7919 + i); const ang = -Math.PI * (0.05 + 0.9 * r()) + (r() - 0.5) * 0.6, sp = 300 + r() * 900;
    const px = ox + Math.cos(ang) * sp * age, py = oy + Math.sin(ang) * sp * age + 0.5 * 1600 * age * age;
    const sz = 4 + r() * 14, rot = r() * 6 + age * (r() - 0.5) * 18, f = 1 - k(age, 0.6, 1.6);
    x.save(); x.translate(px, py); x.rotate(rot); x.globalAlpha = 0.75 * f;
    x.fillStyle = `rgba(235,240,245,${0.35 + 0.4 * r()})`; x.strokeStyle = 'rgba(255,255,255,0.9)'; x.lineWidth = 1;
    x.beginPath(); x.moveTo(-sz * 0.5, -sz * 0.3); x.lineTo(sz * 0.6, -sz * 0.1); x.lineTo(-sz * 0.1, sz * 0.5); x.closePath(); x.fill(); x.stroke();
    x.restore();
  }
  if (age < 0.12) { x.globalCompositeOperation = 'lighter'; x.globalAlpha = (1 - age / 0.12) * 0.5; const gr = x.createRadialGradient(ox, oy, 0, ox, oy, 260); gr.addColorStop(0, 'rgba(255,240,220,1)'); gr.addColorStop(1, 'rgba(255,200,150,0)'); x.fillStyle = gr; x.fillRect(ox - 280, oy - 280, 560, 560); }
  x.restore();
}

/** slow dust motes inside a rect */
export function dust(x, t, rx, ry, rw, rh, n = 70, seed = 3, alpha = 0.5) {
  x.save(); x.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const r = rng(seed * 31337 + i);
    const px = rx + ((r() * rw + t * (6 + r() * 14)) % rw), py = ry + ((r() * rh - t * (3 + r() * 8) + rh * 10) % rh);
    const tw = 0.5 + 0.5 * Math.sin(t * (0.8 + r() * 1.5) + r() * 6), sz = 1 + r() * 2.6;
    x.globalAlpha = alpha * tw * (0.3 + 0.7 * r()); x.fillStyle = '#ffe8c4'; x.beginPath(); x.arc(px, py, sz, 0, 7); x.fill();
  }
  x.restore();
}

/** four-point star glint */
export function glint(x, cx, cy, s, a) {
  if (a <= 0) return;
  x.save(); x.globalCompositeOperation = 'lighter'; x.globalAlpha = a; x.translate(cx, cy);
  const g = x.createRadialGradient(0, 0, 0, 0, 0, s * 0.5); g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(1, 'rgba(255,240,210,0)');
  x.fillStyle = g; x.beginPath(); x.arc(0, 0, s * 0.5, 0, 7); x.fill();
  x.fillStyle = 'rgba(255,250,235,0.9)';
  for (const r of [0, Math.PI / 2]) { x.save(); x.rotate(r + 0.3); x.beginPath(); x.moveTo(-s, 0); x.lineTo(0, -s * 0.06); x.lineTo(s, 0); x.lineTo(0, s * 0.06); x.closePath(); x.fill(); x.restore(); }
  x.restore();
}

/** soft speed streaks (horizontal), for the escape */
export function streaks(x, t, rx, ry, rw, rh, dir = -1, n = 26, seed = 2, alpha = 0.18) {
  x.save(); x.globalCompositeOperation = 'lighter'; x.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const r = rng(seed * 101 + i); const len = 60 + r() * 160, sp = 900 + r() * 900;
    const px = rx + (((r() * rw) + dir * t * sp) % rw + rw) % rw, py = ry + r() * rh;
    x.globalAlpha = alpha * (0.4 + 0.6 * r()); x.strokeStyle = '#fff3dc'; x.lineWidth = 1 + r() * 1.5;
    x.beginPath(); x.moveTo(px, py); x.lineTo(px - dir * len, py); x.stroke();
  }
  x.restore();
}
export { rr, font };
