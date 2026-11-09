// "It looks flat, but it isn't": every set piece / character is a flat card at a real depth, filmed by one camera.
// cam = { x, y, w }  world centre + visible world width (16:9 picture is 1920x960 world units at w=1920)
//       px, py, pw   overrides for the 9:16 frame (default: same centre, half the width → taller view)
//       push         tiny push-in (0.03 = 3 %) over pushDur (≤ 2 s) then it stops; close-ups never move. No shake, ever.
//       pan          world units of sideways drift over the shot (rare)
// layer(d, blur, fn): d = depth (1 = subject plane, 2 = twice as far → half the parallax), blur = depth-of-field px.
import { PORTRAIT, PIC, W, H, scratch, eo, clamp } from './lib.js';

export function makeView(ctx, cam, lt) {
  const pw = PORTRAIT ? (cam.pw ?? cam.w * 0.5) : cam.w;
  const cx = PORTRAIT ? (cam.px ?? cam.x) : cam.x, cy = PORTRAIT ? (cam.py ?? cam.y) : cam.y;
  const s = PIC.w / pw;
  const push = cam.push ? cam.push * eo(clamp((lt - (cam.pushAt || 0)) / (cam.pushDur || 1.8))) : 0;
  const pan = cam.pan ? cam.pan * eo(clamp(lt / (cam.panDur || 3))) : 0;
  const V = {
    ctx, s, lt, cam, PORTRAIT,
    /** set the world→screen transform for depth d on context c */
    tf(c, d = 1) {
      const k = s * (1 + push / d);
      const wx = cx + pan / d;
      c.setTransform(k, 0, 0, k, PIC.x + PIC.w / 2 - wx * k, PIC.y + PIC.h / 2 - cy * k);
    },
    layer(d, blur, fn) {
      if (blur > 0.3) {
        const [lc, lx] = scratch('lay', W, H); V.tf(lx, d); fn(lx);
        ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.filter = `blur(${(blur * s * (PORTRAIT ? 0.9 : 1)).toFixed(1)}px)`; ctx.drawImage(lc, 0, 0); ctx.restore();
      } else { ctx.save(); V.tf(ctx, d); fn(ctx); ctx.restore(); }
    },
    /** characters: drawn on their own card, then an amber (or moon) rim copy offset toward the light sits behind them */
    chars(d, blur, rim, fn) {
      const [fc, fx] = scratch('fig', W, H); V.tf(fx, d); fn(fx);
      const r = rim || {};
      if (r.col !== null) {
        const [tc, tx] = scratch('tint', W, H);
        tx.drawImage(fc, 0, 0); tx.globalCompositeOperation = 'source-in'; tx.fillStyle = r.col || '#f2b266'; tx.fillRect(0, 0, W, H);
        const k = (r.w ?? 5) * s;   // rim width: world units → screen px (close-ups get a thicker rim, like the originals)
        ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); if (blur > 0.3) ctx.filter = `blur(${(blur * s).toFixed(1)}px)`;
        ctx.globalAlpha = r.a ?? 1; ctx.drawImage(tc, (r.dx ?? -1) * k, (r.dy ?? -0.55) * k); ctx.globalAlpha = 1;
        ctx.drawImage(fc, 0, 0); ctx.restore();
      } else { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); if (blur > 0.3) ctx.filter = `blur(${(blur * s).toFixed(1)}px)`; ctx.drawImage(fc, 0, 0); ctx.restore(); }
    },
    /** world point → screen point (depth d) for screen-space graphics that track the world */
    toScreen(x, y, d = 1) { const k = s * (1 + push / d); return [PIC.x + PIC.w / 2 + (x - (cx + pan / d)) * k, PIC.y + PIC.h / 2 + (y - cy) * k]; },
  };
  return V;
}
