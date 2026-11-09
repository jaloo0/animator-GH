// The city seen from the 40th floor, drawn in a virtual 1600×900 space (horizon at y = 360).
// Almost everything is below eye level: rooftops, a river, and the far bank's towers.
// o.lit (0..1) = blackout progress inverse; o.wave = 0..1 blackout sweep (far → near);
// o.signal = { on: 0..1 } the amber window across the river; o.near = the building across the street.
import { PAL, rng, hash, clamp, lerp, mix, noise1, rgba } from '../core/lib.js';
import { stroke, shape, fill, rectPts, ellipsePts } from '../core/ink.js';

export const CW = 1600, CH = 900, HOR = 360;
let LAYOUT = null;
function layout() {
  if (LAYOUT) return LAYOUT;
  const R = rng(4242);
  const far = [];          // far band of tiny buildings below the horizon
  for (let row = 0; row < 7; row++) {
    const yb = HOR + 6 + row * row * 1.6 + row * 3;
    let x = -300 + R() * 20;
    while (x < CW + 300) {
      const w = 8 + R() * (10 + row * 4), h = 4 + R() * (8 + row * 5);
      far.push({ x, yb, w, h, row, ord: 0.05 + row * 0.035 + R() * 0.06, seed: far.length });
      x += w + R() * 6;
    }
  }
  const skyline = [];      // distant towers poking above the horizon
  for (let i = 0; i < 26; i++) { const w = 10 + R() * 26; skyline.push({ x: -250 + R() * (CW + 500), w, h: 10 + R() * 70 * (R() < 0.3 ? 1.8 : 1), ord: R() * 0.12, seed: i }); }
  skyline.sort((a, b) => b.h - a.h);
  const bank = [];         // the far bank, across the river (towers that rise past the horizon)
  let x = -260;
  while (x < CW + 260) {
    const w = 46 + R() * 70, h = 50 + R() * 120;
    bank.push({ x, w, h, ord: 0.25 + R() * 0.12, seed: 100 + bank.length });
    x += w + 8 + R() * 30;
  }
  // the signal tower: its 40th floor sits on our eye line
  const sig = { x: 1010, w: 92, h: 196, ord: 0.3, seed: 999, signal: true };
  bank.splice(bank.findIndex((b) => b.x > 900), 0, sig);
  const near = [];         // our bank: roofs below us, seen from above
  const rows = [{ y: 548, d: 30 }, { y: 610, d: 46 }, { y: 700, d: 70 }, { y: 820, d: 110 }];
  rows.forEach((rw, ri) => {
    let xx = -320 - R() * 60;
    while (xx < CW + 320) {
      const w = rw.d * (2.2 + R() * 2.6), top = rw.d * (0.5 + R() * 0.6), wall = rw.d * (0.8 + R() * 1.6);
      near.push({ x: xx, y: rw.y + (R() - 0.5) * rw.d * 0.3, w, top, wall, ri, ord: 0.55 + ri * 0.1 + R() * 0.08, seed: 300 + near.length, tank: R() < 0.35, ac: R() < 0.6 });
      xx += w + rw.d * (0.35 + R() * 0.5);
    }
  });
  const stars = Array.from({ length: 70 }, (_, i) => ({ x: hash(i, 7) * CW * 1.4 - 200, y: hash(i, 8) * HOR * 0.9 - 120, s: 0.6 + hash(i, 9) * 1.3 }));
  LAYOUT = { far, skyline, bank, near, stars, sig };
  return LAYOUT;
}

const isLit = (b, o) => {
  // wave goes far → near: anything whose ord is below the wave front is dark
  const w = o.wave ?? 0;
  return w <= 0 ? 1 : clamp((b.ord - w) * 18 + 0.5);
};
function windowsOn(ctx, x, y, w, h, cols, rows, seed, litK, o, colLit = PAL.amber, colDark = '#2a3354', pad = 0.22) {
  const cw = w / cols, rh = h / rows;
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const hv = hash(i + j * 131, seed);
    const on = hv < 0.55 && litK > 0 ? litK * (0.55 + 0.45 * hash(i + j * 77, seed + 3)) : 0;
    ctx.fillStyle = on > 0.05 ? mix(colDark, colLit, on) : colDark;
    ctx.fillRect(x + i * cw + cw * pad, y + j * rh + rh * pad, cw * (1 - pad * 2), rh * (1 - pad * 2));
  }
}

/**
 * Draw the city into ctx (already transformed so 1 unit = 1 virtual px). o.t, o.px (parallax px),
 * o.wave, o.snow, o.snowOnRoofs, o.signal {on, blink}, o.moon, o.river.
 */
export function drawCity(ctx, o = {}) {
  const L = layout(), t = o.t ?? 0, px = o.px ?? 0;
  // ---- sky ----
  const sky = ctx.createLinearGradient(0, -300, 0, HOR + 20);
  sky.addColorStop(0, '#18213F'); sky.addColorStop(0.65, PAL.glass); sky.addColorStop(1, o.dawn ? '#56658a' : '#34436C');
  ctx.fillStyle = sky; ctx.fillRect(-400, -500, CW + 800, HOR + 520);
  ctx.fillStyle = '#252E56'; ctx.fillRect(-400, HOR, CW + 800, CH + 600);
  ctx.save(); ctx.translate(px * 0.05, 0);
  for (const s of L.stars) { ctx.fillStyle = `rgba(230,225,210,${0.25 + 0.35 * (0.5 + 0.5 * Math.sin(t * 1.3 + s.x))})`; ctx.fillRect(s.x, s.y, s.s, s.s); }
  if (o.moon !== false) {
    const mx = o.moonX ?? 1320, my = o.moonY ?? 110;
    const g = ctx.createRadialGradient(mx, my, 0, mx, my, 160); g.addColorStop(0, 'rgba(225,228,235,0.28)'); g.addColorStop(1, 'rgba(225,228,235,0)');
    ctx.fillStyle = g; ctx.fillRect(mx - 160, my - 160, 320, 320);
    shape(ctx, ellipsePts(mx, my, 30, 30), { fill: '#E6E1D2', w: 2, seed: 77 });
    fill(ctx, ellipsePts(mx + 9, my - 4, 7, 6), '#CFC8B6', { seed: 78 }); fill(ctx, ellipsePts(mx - 10, my + 9, 5, 4), '#CFC8B6', { seed: 79 });
  }
  ctx.restore();

  // ---- distant skyline + far band ----
  ctx.save(); ctx.translate(px * 0.1, 0);
  for (const b of L.skyline) {
    const k = isLit(b, o);
    ctx.fillStyle = '#26305A'; ctx.fillRect(b.x, HOR - b.h, b.w, b.h + 6);
    windowsOn(ctx, b.x, HOR - b.h + 3, b.w, b.h - 3, Math.max(2, Math.round(b.w / 6)), Math.max(3, Math.round(b.h / 6)), b.seed, k * (o.cityGlow ?? 1), o, '#E9B865', '#26305A', 0.3);
  }
  // haze line at the horizon
  const hz = ctx.createLinearGradient(0, HOR - 30, 0, HOR + 40);
  hz.addColorStop(0, 'rgba(70,84,125,0)'); hz.addColorStop(0.5, `rgba(90,100,140,${o.dawn ? 0.5 : 0.35})`); hz.addColorStop(1, 'rgba(70,84,125,0)');
  ctx.fillStyle = hz; ctx.fillRect(-400, HOR - 30, CW + 800, 70);
  for (const b of L.far) {
    const k = isLit(b, o);
    ctx.fillStyle = b.row % 2 ? '#2B355E' : '#303B66'; ctx.fillRect(b.x, b.yb - b.h, b.w, b.h);
    ctx.fillStyle = o.snowRoofs ? '#B9BCC4' : '#3B4672'; ctx.fillRect(b.x, b.yb - b.h, b.w, Math.max(1, b.h * 0.18));
    if (k > 0.02 && hash(b.seed, 5) < 0.8) {
      const n = 1 + Math.floor(hash(b.seed, 6) * 3);
      for (let i = 0; i < n; i++) { ctx.fillStyle = rgba('#F2C27A', k * (0.5 + 0.5 * hash(b.seed + i, 8))); ctx.fillRect(b.x + 1 + hash(b.seed + i, 9) * (b.w - 3), b.yb - b.h * (0.3 + 0.5 * hash(b.seed + i, 10)), 1.6 + b.row * 0.3, 1.6 + b.row * 0.3); }
    }
  }
  // city glow over the lit band
  const cityK = 1 - clamp((o.wave ?? 0) * 2.2);
  if (cityK > 0) {
    const g = ctx.createLinearGradient(0, HOR - 60, 0, HOR + 80);
    g.addColorStop(0, 'rgba(240,177,90,0)'); g.addColorStop(0.55, `rgba(240,177,90,${0.16 * cityK})`); g.addColorStop(1, 'rgba(240,177,90,0)');
    ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(-400, HOR - 60, CW + 800, 140); ctx.globalCompositeOperation = 'source-over';
  }
  ctx.restore();

  // ---- the river ----
  ctx.save(); ctx.translate(px * 0.2, 0);
  const rv = ctx.createLinearGradient(0, 440, 0, 530);
  rv.addColorStop(0, '#2B3766'); rv.addColorStop(1, '#202A50');
  ctx.fillStyle = rv; ctx.fillRect(-400, 446, CW + 800, 86);
  for (let i = 0; i < 26; i++) {
    const yy = 452 + hash(i, 31) * 74, xx = -200 + hash(i, 32) * (CW + 400), L2 = 30 + hash(i, 33) * 90;
    stroke(ctx, [[xx, yy], [xx + L2, yy + 1]], { w: 1.2, seed: i + 400, color: '#4A5888', alpha: 0.6, amp: 0.6 });
  }
  // the moon's path on the water
  for (let i = 0; i < 9; i++) { const yy = 452 + i * 9, ww = 30 + i * 9; stroke(ctx, [[1320 - ww / 2 + Math.sin(t + i) * 4, yy], [1320 + ww / 2, yy + 1]], { w: 1.6, seed: 450 + i, color: '#9AA6C8', alpha: 0.5 - i * 0.04, amp: 0.5 }); }
  ctx.restore();

  // ---- the far bank: towers across the river ----
  ctx.save(); ctx.translate(px * 0.22, 0);
  for (const b of L.bank) {
    const k = b.signal ? 0 : isLit(b, o), base = 448, top = base - b.h - (b.signal ? 0 : 0);
    const body = b.signal ? '#2E3A68' : (hash(b.seed, 2) < 0.5 ? '#2A3562' : '#313D6C');
    const pts = rectPts(b.x, top, b.w, base - top);
    shape(ctx, pts, { fill: body, w: 1.6, seed: b.seed, amp: 0.6, inkAlpha: 0.75 });
    const floors = Math.round((base - top) / 7.5), cols = Math.max(3, Math.round(b.w / 11));
    windowsOn(ctx, b.x + 3, top + 4, b.w - 6, base - top - 8, cols, floors, b.seed, k * (o.cityGlow ?? 1), o, PAL.amber, mix(body, '#1a2244', 0.4), 0.26);
    if (o.snowRoofs) fill(ctx, rectPts(b.x - 1, top - 2, b.w + 2, 4), '#C9CBD0', { seed: b.seed + 3 });
    if (b.signal) {
      // our eye-line floor (≈ 40th) and the amber window
      const fy = HOR - 5, wx = b.x + b.w * 0.56;
      L.sigWin = { x: wx + px * 0.22, y: fy, w: 12, h: 8 };
      const on = o.signal ? (o.signal.on ?? 0) : 0;
      ctx.fillStyle = mix('#222a50', '#FFC983', on); ctx.fillRect(wx - 1, fy - 0.5, 12, 8);
      if (on > 0) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createRadialGradient(wx + 5, fy + 3, 0, wx + 5, fy + 3, 60 * (o.signal.glow ?? 1));
        g.addColorStop(0, rgba('#FFD08A', 0.9 * on)); g.addColorStop(0.2, rgba(PAL.amber, 0.35 * on)); g.addColorStop(1, rgba(PAL.amber, 0));
        ctx.fillStyle = g; ctx.fillRect(wx - 70, fy - 70, 150, 150);
        // reflection in the river
        const rg = ctx.createLinearGradient(0, 452, 0, 530); rg.addColorStop(0, rgba(PAL.amber, 0.35 * on)); rg.addColorStop(1, rgba(PAL.amber, 0));
        ctx.fillStyle = rg; ctx.fillRect(wx + 1, 452, 8, 78);
        ctx.restore();
      }
    }
  }
  ctx.restore();

  // ---- our bank: rooftops below us ----
  ctx.save(); ctx.translate(px * 0.45, 0);
  // street glow (lit only before the blackout)
  for (const b of L.near) {
    const k = isLit(b, o), par = 1 + b.ri * 0.18;
    ctx.save(); ctx.translate(px * 0.25 * b.ri, 0);
    const wallTop = b.y, roofTop = b.y - b.top;
    const body = b.ri % 2 ? '#323D69' : '#2B355F';
    // front wall
    shape(ctx, rectPts(b.x, wallTop, b.w, b.wall), { fill: body, w: 1.4 + b.ri * 0.5, seed: b.seed, amp: 0.7, inkAlpha: 0.8 });
    windowsOn(ctx, b.x + 4, wallTop + 4, b.w - 8, b.wall - 6, Math.max(3, Math.round(b.w / (8 + b.ri * 5))), Math.max(2, Math.round(b.wall / (7 + b.ri * 5))), b.seed, k * (o.cityGlow ?? 1), o, PAL.amber, mix(body, '#151c3a', 0.35), 0.25);
    // roof (seen from above)
    const roof = [[b.x, wallTop], [b.x + b.w, wallTop], [b.x + b.w - b.top * 0.35, roofTop], [b.x + b.top * 0.25, roofTop]];
    shape(ctx, roof, { fill: o.snowRoofs ? mix('#C8CBD2', '#8E95A8', 0.25 + 0.1 * b.ri) : '#3E4977', w: 1.3 + b.ri * 0.5, seed: b.seed + 1, amp: 0.7, inkAlpha: 0.8 });
    if (b.tank && b.ri >= 1) {
      // a rooftop water tank (the city's old answer to "pumps only lift water so high")
      const tx = b.x + b.w * 0.65, ty = wallTop - b.top * 0.45, tw = b.top * 0.32 * par, th = b.top * 0.7;
      for (const lx of [-0.35, 0.35]) stroke(ctx, [[tx + lx * tw, ty], [tx + lx * tw * 0.8, ty + th * 0.45]], { w: 1.1 + b.ri * 0.3, seed: b.seed + 9 + lx * 10, alpha: 0.8 });
      shape(ctx, [[tx - tw / 2, ty - th], [tx + tw / 2, ty - th], [tx + tw / 2, ty], [tx - tw / 2, ty]], { fill: '#5B4B48', w: 1.2 + b.ri * 0.3, seed: b.seed + 11, round: 2 });
      shape(ctx, [[tx - tw * 0.55, ty - th], [tx, ty - th - tw * 0.45], [tx + tw * 0.55, ty - th]], { fill: o.snowRoofs ? '#C9CBD0' : '#4D3F3C', w: 1.2 + b.ri * 0.3, seed: b.seed + 12 });
    }
    if (b.ac && b.ri >= 2) shape(ctx, rectPts(b.x + b.w * 0.2, wallTop - b.top * 0.55, b.top * 0.4, b.top * 0.25), { fill: o.snowRoofs ? '#B5B9C2' : '#4A557F', w: 1.4, seed: b.seed + 13 });
    ctx.restore();
  }
  ctx.restore();

  // ---- snow ----
  if (o.snow) snow(ctx, t, o.snow, px);
}

export function snow(ctx, t, amt = 1, px = 0, region = [-200, -300, CW + 400, CH + 400], n = 220) {
  ctx.save();
  for (let i = 0; i < n * amt; i++) {
    const depth = 0.3 + hash(i, 51) * 0.9;
    const sp = 18 + depth * 46, H = region[3];
    const y = region[1] + ((hash(i, 52) * H + t * sp) % H);
    const x = region[0] + hash(i, 53) * region[2] + Math.sin(t * (0.6 + depth) + i) * 12 * depth + px * depth * 0.5;
    ctx.fillStyle = `rgba(236,232,222,${0.35 + depth * 0.45})`;
    ctx.beginPath(); ctx.arc(x, y, 0.8 + depth * 2.1, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}
export function signalWindowPos() { layout(); return { x: 1010 + 92 * 0.56 + 5, y: HOR - 5 + 3.5 }; }
