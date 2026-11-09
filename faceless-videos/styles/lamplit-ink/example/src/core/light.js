// Lighting as a multiply pass: the whole panel sits in a cool ambient, and each practical light
// (lamp, candle, phone, window) adds its own pool. "Every scene has exactly one warm practical light."
import { scratch, rgba, clamp } from './lib.js';

/**
 * lights: [{ x, y, r, color, a, sx (x-stretch), sy (y-stretch) }]
 * ambient: hex colour the unlit room multiplies by (lighter = brighter grade)
 */
export function lightPass(ctx, w, h, { ambient = '#6C7898', lights = [], exposure = 1, keepAlpha = false } = {}) {
  let keep = null;
  if (keepAlpha) { const [kc, kx] = scratch('lightKeep' + w, w, h); kx.clearRect(0, 0, w, h); kx.drawImage(ctx.canvas, 0, 0); keep = kc; }
  const [c, x] = scratch('light' + w, w, h);
  x.fillStyle = ambient; x.fillRect(0, 0, w, h);
  x.globalCompositeOperation = 'lighter';
  for (const L of lights) {
    const a = clamp(L.a ?? 1, 0, 2);
    if (a <= 0 || L.r <= 0) continue;
    x.save(); x.translate(L.x, L.y); x.scale(L.sx ?? 1, L.sy ?? 1);
    const g = x.createRadialGradient(0, 0, 0, 0, 0, L.r);
    const falloff = L.falloff ?? 0.4;
    g.addColorStop(0, rgba(L.color, Math.min(1, a))); g.addColorStop(falloff, rgba(L.color, Math.min(1, a) * 0.55)); g.addColorStop(1, rgba(L.color, 0));
    x.fillStyle = g; x.fillRect(-L.r, -L.r, L.r * 2, L.r * 2);
    x.restore();
  }
  x.globalCompositeOperation = 'source-over';
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'multiply'; ctx.drawImage(c, 0, 0);
  if (exposure !== 1) { ctx.globalCompositeOperation = exposure > 1 ? 'screen' : 'multiply'; ctx.fillStyle = exposure > 1 ? `rgba(255,240,220,${clamp(exposure - 1, 0, 0.6)})` : `rgba(0,0,0,${clamp(1 - exposure, 0, 1)})`; ctx.fillRect(0, 0, w, h); }
  if (keep) { ctx.globalCompositeOperation = 'destination-in'; ctx.drawImage(keep, 0, 0); }
  ctx.restore();
}

/** additive bloom pools for emissive things (after the multiply) */
export function bloom(ctx, x, y, r, color, a = 0.35, sx = 1, sy = 1) {
  if (a <= 0 || r <= 0) return;
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.translate(x, y); ctx.scale(sx, sy);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
  g.addColorStop(0, rgba(color, a)); g.addColorStop(0.3, rgba(color, a * 0.4)); g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g; ctx.fillRect(-r, -r, r * 2, r * 2); ctx.restore();
}
