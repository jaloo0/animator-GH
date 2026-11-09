// Graphics timed to the frame: labels pop in over 3 frames, numbers count up and land on the end of their word.
// All screen-space (px of the output frame), sized by the shorter side so 16:9 and 9:16 read the same.
import { W, H, PIC, PORTRAIT, PAL, rr, circ, clamp, eo, eback, rgrad, lerp } from './lib.js';
export const U = Math.min(W, H) / 1080;           // 1 at 1080p in both aspects
export const pop = (lt, at, frames = 3) => clamp((lt - at) / (frames / 24));

/** dark rounded pill (LEAK · TODAY style). k = pop 0..1 */
export function pill(c, text, x, y, k = 1, o = {}) {
  if (k <= 0) return;
  const sz = (o.size || 34) * U; c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
  c.font = `900 ${sz}px Nunito`; const tw = c.measureText(text).width + text.length * sz * 0.06;
  const w = tw + sz * 1.3, h = sz * 1.65, s = lerp(0.55, 1, k);
  c.translate(x, y); c.scale(s, s); c.globalAlpha = clamp(k * 1.5);
  c.fillStyle = o.bg || 'rgba(27,34,52,0.94)'; rr(c, -w / 2, -h / 2, w, h, h / 2); c.fill();
  if (o.ring) { c.strokeStyle = o.ring; c.lineWidth = 3 * U; c.stroke(); }
  c.fillStyle = o.fg || '#efe6d6'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.letterSpacing = `${sz * 0.06}px`; c.fillText(text, 0, sz * 0.04);
  c.restore();
}
/** top-left place/time stamp (HOME · 6:40 P.M. style) */
export function stamp(c, text, k = 1) {
  if (k <= 0) return; c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = clamp(k * 1.5);
  const sz = 34 * U; c.font = `700 ${sz}px Fredoka`; c.letterSpacing = `${sz * 0.08}px`; c.fillStyle = '#f3ecdf'; c.shadowColor = 'rgba(0,0,0,0.55)'; c.shadowBlur = 10 * U;
  c.textAlign = 'left'; c.textBaseline = 'top'; c.fillText(text, PIC.x + 44 * U, PIC.y + (PORTRAIT ? 230 : 34) * U); c.restore();
}
/** top-right round counter (minutes left in the first hour) */
export function counter(c, n, k = 1, o = {}) {
  if (k <= 0) return; c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
  const r = 46 * U, x = PIC.x + PIC.w - 80 * U, y = PIC.y + (PORTRAIT ? 250 : 80) * U, s = lerp(0.6, 1, eback(k));
  c.translate(x, y); c.scale(s, s);
  c.fillStyle = 'rgba(20,26,42,0.92)'; circ(c, 0, 0, r); c.fill(); c.strokeStyle = o.ring || '#f2b266'; c.lineWidth = 5 * U; circ(c, 0, 0, r - 4 * U); c.stroke();
  if (o.frac != null) { c.strokeStyle = 'rgba(242,178,102,0.25)'; c.lineWidth = 5 * U; c.beginPath(); c.arc(0, 0, r - 4 * U, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - o.frac), true); c.stroke(); }
  c.fillStyle = '#f3ecdf'; c.font = `700 ${36 * U}px Fredoka`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(n), 0, 2 * U);
  c.font = `800 ${13 * U}px Nunito`; c.fillStyle = '#f2b266'; c.fillText('MIN', 0, r + 16 * U);
  c.restore();
}
/** glowing warm-gold type on navy (title cards, numbers) */
export function goldText(c, text, x, y, size, o = {}) {
  c.save(); c.font = `700 ${size}px Fredoka`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.letterSpacing = `${size * (o.ls ?? 0.04)}px`;
  c.shadowColor = o.glow || 'rgba(242,178,102,0.75)'; c.shadowBlur = size * 0.45; c.fillStyle = o.col || '#f6c27a'; c.fillText(text, x, y);
  c.shadowBlur = size * 0.12; c.fillStyle = o.col2 || o.col || '#fbd79c'; c.fillText(text, x, y); c.restore();
}
export function navyBg(c, lt, o = {}) {
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
  c.fillStyle = '#121828'; c.fillRect(0, 0, W, H);
  c.fillStyle = rgrad(c, W / 2, H * (o.cy ?? 0.48), 0, Math.max(W, H) * 0.65, [[0, o.hot || '#26304a'], [1, 'rgba(18,24,40,0)']]); c.fillRect(0, 0, W, H);
  c.restore();
}
/** red rubber stamp */
export function rubber(c, text, x, y, k, rot = -0.12) {
  if (k <= 0) return; const s = lerp(1.8, 1, eo(k)); c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.translate(x, y); c.rotate(rot); c.scale(s, s); c.globalAlpha = clamp(k * 2);
  const sz = 64 * U; c.font = `700 ${sz}px Fredoka`; c.letterSpacing = `${sz * 0.06}px`; const w = c.measureText(text).width + sz;
  c.strokeStyle = PAL.red; c.lineWidth = 8 * U; rr(c, -w / 2, -sz * 0.75, w, sz * 1.5, 14 * U); c.stroke(); c.fillStyle = PAL.red; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text, 0, 4 * U); c.restore();
}
