// The hero: blank white circle head, two dot eyes, mustard beanie, concrete scarf, ink stick body.
// Poses are joint positions in head-radius units (y up = negative), feet on y = 0.
import { PAL, clamp, lerp, hash, noise1, mix } from './lib.js';
import { stroke, shape, ellipsePts, quad, fill, INK } from './ink.js';

const BASE = {
  head: [0, -6.1], neck: [0, -5.0], hip: [0, -2.75],
  eL: [-0.72, -3.6], hL: [-0.82, -2.6], eR: [0.72, -3.6], hR: [0.82, -2.6],
  kL: [-0.3, -1.4], fL: [-0.55, 0], kR: [0.3, -1.4], fR: [0.55, 0], tilt: 0,
};
const P = (o) => ({ ...BASE, ...o });
export const POSES = {
  stand: P({}),
  standMug: P({ eR: [0.85, -3.45], hR: [0.62, -3.95] }),
  standMugSip: P({ eR: [0.7, -3.9], hR: [0.3, -4.9], tilt: -0.05 }),
  holdCandle: P({ eR: [0.75, -3.45], hR: [0.42, -3.7] }),
  candleUp: P({ eR: [0.95, -4.0], hR: [0.62, -4.85], tilt: 0.04 }),
  candleCover: P({ eR: [0.95, -4.0], hR: [0.62, -4.85], eL: [-0.55, -3.95], hL: [0.5, -5.1], tilt: 0.04 }),
  arms: P({ eL: [-0.95, -3.4], hL: [-1.4, -2.9], eR: [0.95, -3.4], hR: [1.4, -2.9] }),
  shrug: P({ eL: [-0.9, -3.3], hL: [-1.25, -4.0], eR: [0.9, -3.3], hR: [1.25, -4.0] }),
  sit: P({ head: [0, -5.05], neck: [0, -3.95], hip: [0, -1.95], eL: [-0.75, -2.7], hL: [-0.7, -1.95], eR: [0.75, -2.7], hR: [0.7, -1.95], kL: [-0.55, -1.75], fL: [-0.65, 0], kR: [0.55, -1.75], fR: [0.65, 0] }),
  sitPhone: P({ head: [0, -4.95], neck: [0, -3.95], hip: [0, -1.95], eL: [-0.7, -2.55], hL: [-0.18, -2.95], eR: [0.7, -2.55], hR: [0.18, -2.95], kL: [-0.55, -1.75], fL: [-0.65, 0], kR: [0.55, -1.75], fR: [0.65, 0], tilt: 0.08 }),
  kneel: P({ head: [0.95, -5.25], neck: [0.55, -4.3], hip: [-0.35, -2.3], kL: [0.35, -0.22], fL: [-0.95, -0.08], kR: [0.6, -1.35], fR: [0.7, 0], eL: [0.9, -3.3], hL: [1.75, -2.9], eR: [1.35, -3.55], hR: [2.05, -3.25], tilt: 0.12 }),
  kneelPour: P({ head: [0.9, -5.2], neck: [0.5, -4.3], hip: [-0.35, -2.3], kL: [0.35, -0.22], fL: [-0.95, -0.08], kR: [0.6, -1.35], fR: [0.7, 0], eL: [0.95, -3.1], hL: [1.6, -2.4], eR: [1.3, -3.4], hR: [1.9, -2.8], tilt: 0.1 }),
  reachHigh: P({ eR: [0.9, -5.0], hR: [1.15, -6.0], eL: [-0.9, -5.0], hL: [-1.0, -6.0], tilt: -0.05 }),
  hug: P({ eL: [-0.6, -3.4], hL: [0.2, -3.6], eR: [0.6, -3.4], hR: [-0.2, -3.4] }),
};
export function mixPose(a, b, u) {
  const o = {};
  for (const k of Object.keys(BASE)) o[k] = k === 'tilt' ? lerp(a[k] ?? 0, b[k] ?? 0, u) : [lerp(a[k][0], b[k][0], u), lerp(a[k][1], b[k][1], u)];
  return o;
}

function limb(ctx, A, M, B, w, seed) {
  // a gentle curve through the joint
  const c = [2 * M[0] - (A[0] + B[0]) / 2, 2 * M[1] - (A[1] + B[1]) / 2];
  stroke(ctx, quad(A, c, B, 10), { w, seed, amp: 0.6, taper: 0.8, press: 0.2, step: 4 });
}

/**
 * Draw the hero. x,y = feet on the floor (px). s = px per head radius.
 * o: pose (object or name), t (s), look [-1..1, -1..1], facing 'front'|'back', props {R:'mug'|'candle'|'phone', L:…},
 *    blink (0..1 override), wrap (blanket colour), seed, flip (mirror), scarf (true)
 * returns { flames: [{x,y,s}], screens: [pts], face: {x,y,r}, hands: {L, R} }
 */
export function drawHero(ctx, x, y, s, o = {}) {
  const t = o.t ?? 0, seed = o.seed ?? 1;
  const pose = typeof o.pose === 'string' ? POSES[o.pose] : o.pose || POSES.stand;
  const flip = o.flip ? -1 : 1;
  const breath = Math.sin(t * 1.7 + seed) * 0.045;
  const J = {};
  for (const k of Object.keys(BASE)) {
    if (k === 'tilt') continue;
    const up = ['head', 'neck', 'eL', 'hL', 'eR', 'hR'].includes(k) ? breath : 0;
    J[k] = [x + pose[k][0] * s * flip, y + (pose[k][1] + up) * s];
  }
  const tilt = (pose.tilt ?? 0) * flip + (o.tilt ?? 0) + Math.sin(t * 0.6 + seed * 2) * 0.012;
  const lw = Math.max(1.4, s * (o.lw ?? 0.13));
  const out = { flames: [], screens: [], face: null, hands: { L: J.hL, R: J.hR } };
  const facingBack = o.facing === 'back';

  ctx.save();
  ctx.globalAlpha *= o.alpha ?? 1;
  // ---- legs + shoes ----
  if (!o.wrap) {
    limb(ctx, J.hip, J.kL, J.fL, lw, seed + 1);
    limb(ctx, J.hip, J.kR, J.fR, lw, seed + 2);
    for (const [f, k, sg] of [[J.fL, J.kL, -1], [J.fR, J.kR, 1]]) {
      const dir = (f[0] - k[0] >= 0 ? 1 : -1) * 0.6 + sg * flip * 0.4;
      shape(ctx, ellipsePts(f[0] + dir * s * 0.16, f[1] - s * 0.06, s * 0.26, s * 0.12), { fill: '#3A332E', w: lw * 0.7, seed: seed + 5 + sg });
    }
    // torso
    stroke(ctx, quad(J.neck, [(J.neck[0] + J.hip[0]) / 2 + s * 0.04 * flip, (J.neck[1] + J.hip[1]) / 2], J.hip, 8), { w: lw * 1.05, seed: seed + 3, amp: 0.5, taper: 0.85 });
  }
  const back = o.facing === 'back';
  // ---- arms (behind scarf) ----
  const handFill = '#F3EEE6';
  const arm = (side) => {
    const E = side === 'L' ? J.eL : J.eR, Hh = side === 'L' ? J.hL : J.hR;
    limb(ctx, [J.neck[0], J.neck[1] + s * 0.38], E, Hh, lw * 0.95, seed + (side === 'L' ? 7 : 8));
  };
  if (!o.wrap) { arm('L'); arm('R'); }

  // ---- blanket wrap ----
  if (o.wrap) {
    const hx = J.head[0], hy = J.head[1];
    const pts = [[hx - s * 0.95, hy + s * 0.5], [hx - s * 1.9, y - s * 0.1], [hx + s * 1.9, y - s * 0.1], [hx + s * 0.95, hy + s * 0.5]];
    const blank = [];
    blank.push(...quad([hx - s * 0.9, hy + s * 0.3], [hx - s * 1.6, hy + s * 1.6], [hx - s * 2.0, y - s * 0.05], 10));
    blank.push(...quad([hx - s * 2.0, y - s * 0.05], [hx, y + s * 0.35], [hx + s * 2.0, y - s * 0.05], 10));
    blank.push(...quad([hx + s * 2.0, y - s * 0.05], [hx + s * 1.6, hy + s * 1.6], [hx + s * 0.9, hy + s * 0.3], 10));
    blank.push(...quad([hx + s * 0.9, hy + s * 0.3], [hx, hy - s * 0.25], [hx - s * 0.9, hy + s * 0.3], 10));
    shape(ctx, blank, { fill: o.wrap, w: lw, seed: seed + 30 });
    // folds
    stroke(ctx, quad([hx - s * 0.3, hy + s * 1.2], [hx - s * 0.6, hy + s * 2.6], [hx - s * 0.9, y - s * 0.3], 8), { w: lw * 0.6, seed: seed + 31, alpha: 0.7 });
    stroke(ctx, quad([hx + s * 0.5, hy + s * 1.4], [hx + s * 0.7, hy + s * 2.7], [hx + s * 1.2, y - s * 0.4], 8), { w: lw * 0.6, seed: seed + 32, alpha: 0.7 });
    stroke(ctx, quad([hx - s * 0.2, hy + s * 0.75], [hx + s * 0.1, hy + s * 0.95], [hx + s * 0.55, hy + s * 0.75], 6), { w: lw * 0.55, seed: seed + 33, alpha: 0.6 });
    void pts;
  }

  // ---- scarf ----
  if (o.scarf !== false && !o.wrap) {
    const nx = J.neck[0], ny = J.neck[1] + s * 0.05;
    const band = ellipsePts(nx, ny, s * 0.62, s * 0.24);
    shape(ctx, band, { fill: PAL.concrete, w: lw * 0.75, seed: seed + 11, round: 0 });
    const side = (back ? -0.25 : 0.25) * (o.props && o.props.R ? -1 : 1);
    const tail = [[nx + s * side * flip - s * 0.16, ny + s * 0.1], [nx + s * (side + 0.05) * flip - s * 0.17, ny + s * 1.45], [nx + s * (side + 0.05) * flip + s * 0.17, ny + s * 1.5], [nx + s * side * flip + s * 0.18, ny + s * 0.12]];
    shape(ctx, tail, { fill: mix(PAL.concrete, '#8f8676', 0.25), w: lw * 0.7, seed: seed + 12 });
    for (let k = 0; k < 4; k++) { const fx = lerp(tail[1][0], tail[2][0], (k + 0.5) / 4); stroke(ctx, [[fx, tail[1][1] + s * 0.02], [fx + s * 0.02, tail[1][1] + s * 0.2]], { w: lw * 0.45, seed: seed + 40 + k }); }
    stroke(ctx, [[tail[0][0] + s * 0.02, ny + s * 0.9], [tail[3][0] + s * 0.03, ny + s * 0.92]], { w: lw * 0.4, seed: seed + 45, alpha: 0.7 });
  }

  // ---- props in hands (drawn over the arms) ----
  for (const side of ['L', 'R']) {
    const prop = o.props && o.props[side]; if (!prop) continue;
    const Hh = side === 'L' ? J.hL : J.hR;
    if (prop === 'mug') {
      const mw = s * 0.4, mh = s * 0.44, mx = flip > 0 ? Hh[0] - mw * 0.12 : Hh[0] - mw * 0.88, my = Hh[1] - mh * 0.62;
      shape(ctx, [[mx, my], [mx + mw, my], [mx + mw * 0.96, my + mh], [mx + mw * 0.04, my + mh]], { fill: '#D9D3C7', w: lw * 0.7, seed: seed + 50 });
      stroke(ctx, ellipsePts(mx + mw + s * 0.06 * flip, my + mh * 0.45, s * 0.1, s * 0.14, -Math.PI / 2, Math.PI / 2), { w: lw * 0.6, seed: seed + 51 });
      // steam
      for (let k = 0; k < 2; k++) {
        const ph = t * 0.9 + k * 0.5, a = 0.45 * Math.sin(Math.PI * ((ph % 1)));
        const sx = mx + mw * (0.35 + 0.3 * k), sy = my - s * 0.15 - (ph % 1) * s * 0.4;
        stroke(ctx, [[sx, sy], [sx + s * 0.08 * Math.sin(ph * 6), sy - s * 0.2], [sx - s * 0.05, sy - s * 0.42]], { w: lw * 0.4, seed: seed + 60 + k, alpha: a, color: '#E8E1D4' });
      }
    } else if (prop === 'candle') {
      const cw = s * 0.26, ch = s * 0.46, cx = Hh[0], cy = Hh[1] - s * 0.05;
      shape(ctx, ellipsePts(cx, cy + s * 0.08, s * 0.38, s * 0.1), { fill: '#9C8E76', w: lw * 0.6, seed: seed + 70 });
      shape(ctx, [[cx - cw / 2, cy - ch], [cx + cw / 2, cy - ch], [cx + cw / 2, cy + s * 0.05], [cx - cw / 2, cy + s * 0.05]], { fill: '#EDE4D0', w: lw * 0.6, seed: seed + 71 });
      stroke(ctx, [[cx, cy - ch], [cx + s * 0.01, cy - ch - s * 0.1]], { w: lw * 0.4, seed: seed + 72 });
      out.flames.push({ x: cx, y: cy - ch - s * 0.08, s: s * 0.95 });
    } else if (prop === 'phone') {
      const pw = s * 0.5, ph = s * 0.85, cx = Hh[0] + (side === 'L' ? s * 0.2 : -s * 0.2) * flip, cy = Hh[1] - s * 0.15;
      const pts = [[cx - pw / 2, cy - ph / 2], [cx + pw / 2, cy - ph / 2], [cx + pw / 2, cy + ph / 2], [cx - pw / 2, cy + ph / 2]];
      shape(ctx, pts, { fill: '#2E2A2A', w: lw * 0.6, seed: seed + 80, round: s * 0.08 });
      out.screens.push([[cx - pw * 0.4, cy - ph * 0.42], [cx + pw * 0.4, cy - ph * 0.42], [cx + pw * 0.4, cy + ph * 0.42], [cx - pw * 0.4, cy + ph * 0.42]]);
    }
  }
  // hands (little mitts)
  if (!o.wrap) for (const Hh of [J.hL, J.hR]) shape(ctx, ellipsePts(Hh[0], Hh[1], s * 0.15, s * 0.15), { fill: handFill, w: lw * 0.6, seed: seed + 90 + Hh[0] });

  // ---- head ----
  const hx = J.head[0], hy = J.head[1];
  ctx.save(); ctx.translate(hx, hy); ctx.rotate(tilt);
  shape(ctx, ellipsePts(0, 0, s, s), { fill: PAL.face, w: lw * 0.95, seed: seed + 100 });
  out.face = { x: hx, y: hy, r: s, tilt };
  // eyes
  if (!facingBack) drawEyes(ctx, s, o, t, seed);
  // beanie
  drawBeanie(ctx, s, lw, seed, facingBack, o.beanieCol);
  ctx.restore();
  ctx.restore();
  out.eyes = !facingBack;
  out.opts = { s, lw, seed, o, t };
  return out;
}

function drawEyes(ctx, s, o, t, seed) {
  const look = o.look || [0, 0];
  const lx = look[0] * s * 0.32, ly = look[1] * s * 0.2;
  let blink = o.blink;
  if (blink == null) { const per = 3.3 + hash(seed, 3) * 1.6, ph = (t + hash(seed, 4) * per) % per; blink = ph < 0.13 ? Math.sin((ph / 0.13) * Math.PI) : 0; }
  const size = o.eyeSize ?? 1;
  const ry = s * 0.125 * size * Math.max(0.12, 1 - blink), rx = s * 0.095 * size;
  const ey = s * 0.2 + ly;
  ctx.save(); ctx.fillStyle = PAL.ink;
  for (const sx of [-1, 1]) { ctx.beginPath(); ctx.ellipse(sx * s * 0.34 + lx, ey, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}

function drawBeanie(ctx, s, lw, seed, back, col) {
  const dome = [];
  // dome: from the cuff's left top, over the crown, to the right
  const top = -1.32;
  for (let i = 0; i <= 22; i++) {
    const a = Math.PI + (i / 22) * Math.PI;
    const r = 1.06 + 0.04 * Math.sin(i * 0.9);
    dome.push([Math.cos(a) * s * r, -s * 0.32 + Math.sin(a) * s * (-top - 0.32) * 1.0 + (i === 11 ? -s * 0.02 : 0)]);
  }
  shape(ctx, dome, { fill: col || PAL.mustard, w: lw * 0.95, seed: seed + 120 });
  // crease + knit lines on the dome
  stroke(ctx, quad([-s * 0.55, -s * 0.42], [-s * 0.45, -s * 0.95], [-s * 0.05, -s * 1.22], 8), { w: lw * 0.55, seed: seed + 121, alpha: 0.65 });
  stroke(ctx, quad([s * 0.35, -s * 0.45], [s * 0.45, -s * 0.85], [s * 0.2, -s * 1.15], 8), { w: lw * 0.45, seed: seed + 122, alpha: 0.4 });
  // cuff band
  const cuffTop = back ? -0.3 : -0.36, cuffBot = back ? 0.1 : 0.02;
  const cuff = [
    ...quad([-s * 1.1, s * cuffTop], [0, s * (cuffTop + 0.1)], [s * 1.1, s * cuffTop], 10),
    ...quad([s * 1.08, s * cuffBot], [0, s * (cuffBot + 0.12)], [-s * 1.08, s * cuffBot], 10),
  ];
  shape(ctx, cuff, { fill: col ? mix(col, '#1a1410', 0.15) : '#B5852B', w: lw * 0.9, seed: seed + 123, round: s * 0.08 });
  for (let k = -5; k <= 5; k++) {
    const u = k / 5.6, xx = u * s * 1.0, bow = (1 - u * u) * 0.1;
    stroke(ctx, [[xx, s * (cuffTop + 0.06 + bow * 0.6)], [xx * 1.01, s * (cuffBot - 0.05 + bow)]], { w: lw * 0.4, seed: seed + 130 + k, alpha: 0.55 });
  }
}

/** after lighting: re-ink the face so the hero's face stays the only pure white in frame */
export function relightFace(ctx, info, amt = 0.85) {
  if (!info || !info.face || amt <= 0 || !info.eyes) return;
  const { x, y, r, tilt } = info.face; const { s, lw, seed, o, t } = info.opts;
  ctx.save(); ctx.translate(x, y); ctx.rotate(tilt); ctx.globalAlpha = amt;
  // only the lower face (the beanie keeps the room's light)
  ctx.beginPath(); ctx.rect(-r * 1.2, -r * 0.02, r * 2.4, r * 1.3); ctx.clip();
  ctx.fillStyle = PAL.face; ctx.beginPath(); ctx.ellipse(0, 0, r * 0.93, r * 0.93, 0, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;
  if (info.eyes) drawEyes(ctx, s, o, t, seed);
  ctx.restore();
  void lw;
}

/** a candle flame (emissive; draw after lighting). k = 0..1 alive */
export function flame(ctx, x, y, s, t, seed = 1, k = 1) {
  if (k <= 0) return;
  const fl = 1 + 0.12 * noise1(t * 9 + seed, seed) + 0.06 * Math.sin(t * 23 + seed);
  const lean = noise1(t * 3 + seed * 2, seed + 1) * 0.25 + (fl - 1);
  const h = s * 0.55 * fl * k, w = s * 0.18 * k;
  ctx.save();
  const g = ctx.createRadialGradient(x, y - h * 0.3, 0, x, y - h * 0.3, s * 3.2 * k);
  g.addColorStop(0, 'rgba(255,214,140,0.55)'); g.addColorStop(0.25, 'rgba(240,177,90,0.22)'); g.addColorStop(1, 'rgba(240,177,90,0)');
  ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(x - s * 3.4, y - s * 3.6, s * 6.8, s * 6.8);
  ctx.globalCompositeOperation = 'source-over';
  const tip = [x + lean * w * 2, y - h];
  const outer = [[x - w, y], ...quad([x - w, y], [x - w * 1.1, y - h * 0.55], tip, 8), ...quad(tip, [x + w * 1.1, y - h * 0.55], [x + w, y], 8), ...quad([x + w, y], [x, y + w * 1.2], [x - w, y], 6)];
  ctx.fillStyle = '#F0B15A'; ctx.beginPath(); outer.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.fill();
  ctx.fillStyle = '#FFE7B0'; ctx.beginPath(); ctx.ellipse(x + lean * w * 0.6, y - h * 0.28, w * 0.5, h * 0.3, lean * 0.3, 0, Math.PI * 2); ctx.fill();
  stroke(ctx, outer, { closed: true, w: Math.max(1, s * 0.05), seed, amp: 0.3, alpha: 0.5, color: '#7a4a1a' });
  ctx.restore();
}
