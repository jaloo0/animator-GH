// The film finish: grade tint, vignette, fine grain, cinema bars (16:9). Applied to every live-action picture.
import { W, H, BAR, PORTRAIT, rgrad, hash } from './lib.js';
const GRAIN = [];
export function initGrain() {
  for (let k = 0; k < 6; k++) {
    const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
    const im = x.createImageData(256, 256);
    for (let i = 0; i < 256 * 256; i++) { const v = 128 + (hash(i * 7.3 + k * 999) - 0.5) * 255; im.data[i * 4] = im.data[i * 4 + 1] = im.data[i * 4 + 2] = v; im.data[i * 4 + 3] = 255; }
    x.putImageData(im, 0, 0); GRAIN.push(c);
  }
}
export function finish(c, frame, o = {}) {
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
  if (o.tint) { c.globalCompositeOperation = 'soft-light'; c.fillStyle = o.tint; c.globalAlpha = o.tintA ?? 0.35; c.fillRect(0, 0, W, H); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; }
  const vg = o.vig ?? 0.42;
  c.fillStyle = rgrad(c, W / 2, H / 2, Math.min(W, H) * 0.35, Math.hypot(W, H) * 0.62, [[0, 'rgba(0,0,0,0)'], [1, `rgba(5,6,10,${vg})`]]); c.fillRect(0, 0, W, H);
  const g = GRAIN[frame % GRAIN.length];
  if (g) { c.globalCompositeOperation = 'overlay'; c.globalAlpha = o.grain ?? 0.075; c.fillStyle = c.createPattern(g, 'repeat'); c.fillRect(0, 0, W, H); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; }
  if (BAR && o.bars !== false) { c.fillStyle = '#000'; c.fillRect(0, 0, W, BAR); c.fillRect(0, H - BAR, W, BAR); }
  c.restore();
}
