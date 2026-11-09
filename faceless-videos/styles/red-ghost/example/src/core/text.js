// 2D overlay: one-line yellow captions (lower third), the white condensed hook line with one boxed word,
// glowing cream date stamps, and on-screen sound words ("Knock.") pinned to 3D points.
import { W, H, LAND, UI } from './engine.js';

export const YEL = '#F4EC1C', CREAM = '#F2E2BE';
export const CAP_Y = LAND ? 912 : 1395;
const ease = (x) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);

export function caption(ctx, text, { y = CAP_Y, alpha = 1, italic = false, size = LAND ? 42 : 54, color = YEL } = {}) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = `${italic ? 'italic ' : ''}${size}px "ArialB${italic ? 'I' : ''}"`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  let s = size; while (ctx.measureText(text).width > W - 110 && s > 34) { s -= 2; ctx.font = `${italic ? 'italic ' : ''}${s}px "ArialB${italic ? 'I' : ''}"`; }
  ctx.shadowColor = 'rgba(0,0,0,0.75)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 4;
  ctx.lineWidth = s * 0.15; ctx.strokeStyle = 'rgba(0,0,0,0.92)'; ctx.strokeText(text, W / 2, y);
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = color; ctx.fillText(text, W / 2, y);
  ctx.restore();
}

/** "IN 1990 THE [HALE] FAMILY" — white condensed caps, one word in a box */
export function hook(ctx, words, boxed, { y = CAP_Y, alpha = 1, size = LAND ? 62 : 84 } = {}) {
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha = alpha;
  ctx.font = `700 ${size}px "Barlow Condensed"`; ctx.textBaseline = 'middle';
  const gap = size * 0.26, ws = words.map((w) => ctx.measureText(w).width), pad = size * 0.14;
  const total = ws.reduce((a, b) => a + b, 0) + gap * (words.length - 1) + (boxed >= 0 ? pad * 2 : 0);
  let x = (W - total) / 2;
  words.forEach((w, i) => {
    if (i === boxed) {
      const bx = x, bw = ws[i] + pad * 2, by = y - size * 0.56, bh = size * 1.1;
      ctx.fillStyle = 'rgba(20,8,6,0.72)'; ctx.fillRect(bx, by, bw, bh);
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(242,226,190,0.9)'; ctx.strokeRect(bx, by, bw, bh);
      x += pad;
    }
    ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 16; ctx.shadowOffsetY = 3;
    ctx.fillStyle = '#ffffff'; ctx.fillText(w, x, y + size * 0.03);
    ctx.shadowColor = 'transparent';
    x += ws[i] + (i === boxed ? pad : 0) + gap;
  });
  ctx.restore();
}

/** glowing cream date stamp — dates and numbers glow, sentences never do */
export function stamp(ctx, text, { x = W / 2, y = 900, size = 300, alpha = 1, track = 0.02 } = {}) {
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha = alpha;
  ctx.font = `600 ${size}px "Barlow Condensed"`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${size * track}px`;
  for (const [blur, col] of [[size * 0.32, 'rgba(255,150,70,0.55)'], [size * 0.14, 'rgba(255,196,130,0.75)'], [size * 0.05, 'rgba(255,230,190,0.9)']]) {
    ctx.shadowColor = col; ctx.shadowBlur = blur; ctx.fillStyle = 'rgba(242,226,190,0.0)'; ctx.fillStyle = CREAM; ctx.fillText(text, x, y);
  }
  ctx.shadowColor = 'transparent';
  const g = ctx.createLinearGradient(0, y - size * 0.4, 0, y + size * 0.4);
  g.addColorStop(0, '#fff7e6'); g.addColorStop(1, '#f2d6a6');
  ctx.fillStyle = g; ctx.fillText(text, x, y);
  ctx.restore();
}

/** on-screen sound word, e.g. "Knock." — pops in at (x, y) */
export function sfxWord(ctx, text, x, y, k, { size = 74, rot = -0.06, alpha = 0.92 } = {}) {
  if (k <= 0) return;
  size *= UI;
  const a = Math.min(1, k * 6) * alpha, s = 0.82 + 0.18 * ease(k * 4);
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s); ctx.globalAlpha = a;
  ctx.font = `${size}px "ArialBI"`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 3;
  ctx.fillStyle = '#f6f1ea'; ctx.fillText(text, 0, 0);
  ctx.restore();
}

/** project a world point to overlay pixels */
export function toScreen(camera, v) {
  const p = v.clone().project(camera);
  return { x: (p.x * 0.5 + 0.5) * W, y: (-p.y * 0.5 + 0.5) * H, behind: p.z > 1 };
}
