// Stick people (style-sheet.png): solid ink body, perfectly round head, thin rounded limbs, white eye shapes with flat lids,
// coloured clothes. Hands change with shot size: 'nub' (wide) · 'mitten' (medium) · glove() for close-ups.
// figure(c, o) draws one person in world units. o:
//   x, y        ground point (between the feet)     h   height (head top → feet)
//   kind        'hero' (rust hoodie) · 'zombie' (ash skin, torn shirt) · 'plain' (ink)
//   dir         1 faces right, -1 faces left ; view 'side' (3/4, default) | 'front'
//   lean        torso lean (rad, + = forward)  ; hipY  override hip height (sitting) ; bob  extra hip lift
//   feet        [[x,y],[x,y]] back/front foot (world) — default standing
//   hands       [[x,y],[x,y]] back/front hand targets — default hanging ; elbow bend sign via o.elb
//   face        { expr, look, t, seed, blinkOff }  expr: calm|neutral|worried|shocked|determined|scared|relieved|dead
//   hand        'nub' | 'mitten'
import { PAL, circ, clamp, TAU, lerp, hash } from './lib.js';

export const HOOD = { base: '#d2622a', shade: '#a94d1d', hi: '#ec8a4f', cuff: '#e07a3e' };
const ZOMB = { skin: '#8a957f', skinD: '#5f6a58', shirt: '#7c7f78', shirtD: '#5d605b', eye: '#eef4c8' };

function ik(ax, ay, bx, by, l1, l2, bend) {
  let dx = bx - ax, dy = by - ay; let d = Math.hypot(dx, dy); const max = (l1 + l2) * 0.999;
  if (d > max) { bx = ax + dx / d * max; by = ay + dy / d * max; dx = bx - ax; dy = by - ay; d = max; }
  const a = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1));
  const base = Math.atan2(dy, dx) + bend * a;
  return [ax + Math.cos(base) * l1, ay + Math.sin(base) * l1, bx, by];
}
function limb(c, pts, w, col) { c.strokeStyle = col; c.lineWidth = w; c.lineCap = 'round'; c.lineJoin = 'round'; c.beginPath(); c.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]); c.stroke(); }

/** blink: every 3.5–4 s, 3 frames closed */
export function blinking(t, seed = 0) { const per = 3.5 + hash(seed) * 0.5; const ph = (t + hash(seed + 3) * per) % per; return ph < 3 / 24; }

export function eyes(c, hx, hy, R, f = {}, kind = 'hero', dir = 1, view = 'side') {
  const expr = f.expr || 'calm';
  const closed = expr !== 'dead' && f.t != null && blinking(f.t, f.seed || 0) && !f.noBlink;
  const turn = view === 'front' ? 0 : dir * (f.turn ?? 0.32);
  const lk = f.look ?? 0;
  const ex = [hx + (turn - 0.34) * R, hx + (turn + 0.34) * R], ey = hy + (f.eyeY ?? 0.06) * R;
  const white = kind === 'zombie' ? ZOMB.eye : '#ffffff';
  c.fillStyle = white; c.strokeStyle = white; c.lineCap = 'round';
  if (kind === 'zombie') {
    c.save(); c.shadowColor = 'rgba(238,244,200,0.9)'; c.shadowBlur = R * 0.5;
    for (let i = 0; i < 2; i++) { c.beginPath(); c.ellipse(ex[i], ey, R * 0.17, R * 0.15, 0, 0, TAU); c.fill(); }
    c.restore();
    c.fillStyle = '#1a1d16'; c.beginPath(); c.ellipse(hx + turn * R * 0.9, hy + R * 0.52, R * 0.2, R * (0.1 + 0.08 * (f.jaw ?? 0.5)), 0, 0, TAU); c.fill();
    return;
  }
  if (closed) { c.lineWidth = R * 0.07; for (let i = 0; i < 2; i++) { c.beginPath(); c.moveTo(ex[i] - R * 0.15, ey); c.lineTo(ex[i] + R * 0.15, ey); c.stroke(); } return; }
  const rx = R * 0.19, ry = R * 0.16;
  const pup = (i, s = 0.45) => { c.fillStyle = PAL.ink; c.beginPath(); c.arc(ex[i] + lk * rx * 0.45 + turn * rx * 0.25, ey + 0.1 * ry, rx * s, 0, TAU); c.fill(); c.fillStyle = white; };
  if (expr === 'calm' || expr === 'determined') {
    for (let i = 0; i < 2; i++) {
      c.save(); c.beginPath();
      if (expr === 'calm') c.rect(ex[i] - rx * 1.2, ey - ry * 0.05, rx * 2.4, ry * 2);
      else { const s = i === 0 ? 1 : -1; c.moveTo(ex[i] - rx * 1.3, ey - ry * (0.5 - s * 0.45)); c.lineTo(ex[i] + rx * 1.3, ey - ry * (0.5 + s * 0.45)); c.lineTo(ex[i] + rx * 1.3, ey + ry * 2); c.lineTo(ex[i] - rx * 1.3, ey + ry * 2); c.closePath(); }
      c.clip(); c.beginPath(); c.ellipse(ex[i], ey, rx * 1.05, ry * 1.1, 0, 0, TAU); c.fill(); c.restore();
    }
    if (expr === 'calm' && f.mouth === 'smirk') { c.lineWidth = R * 0.06; c.beginPath(); c.moveTo(hx + turn * R - R * 0.14, hy + R * 0.5); c.quadraticCurveTo(hx + turn * R, hy + R * 0.56, hx + turn * R + R * 0.16, hy + R * 0.46); c.stroke(); }
    return;
  }
  if (expr === 'relieved') {
    c.lineWidth = R * 0.075;
    for (let i = 0; i < 2; i++) { c.beginPath(); c.arc(ex[i], ey + ry * 0.4, rx * 0.9, Math.PI * 1.15, Math.PI * 1.85); c.stroke(); }
    c.lineWidth = R * 0.06; c.beginPath(); c.arc(hx + turn * R, hy + R * 0.32, R * 0.16, Math.PI * 0.2, Math.PI * 0.8); c.stroke(); return;
  }
  if (expr === 'shocked') {
    for (let i = 0; i < 2; i++) { c.beginPath(); c.arc(ex[i], ey, rx * 1.3, 0, TAU); c.fill(); pup(i, 0.42); }
    c.fillStyle = white; c.beginPath(); c.ellipse(hx + turn * R, hy + R * 0.52, R * 0.12, R * 0.15, 0, 0, TAU); c.fill(); return;
  }
  // neutral / worried / scared: open ovals + pupils (+ brows, mouth)
  for (let i = 0; i < 2; i++) { c.beginPath(); c.ellipse(ex[i], ey, rx, ry * 1.15, 0, 0, TAU); c.fill(); pup(i); }
  if (expr === 'worried' || expr === 'scared') {
    c.lineWidth = R * 0.055; c.strokeStyle = white;
    for (let i = 0; i < 2; i++) { const s = i === 0 ? 1 : -1; c.beginPath(); c.moveTo(ex[i] - rx * 1.0, ey - ry * (1.7 - s * 0.35)); c.lineTo(ex[i] + rx * 1.0, ey - ry * (1.7 + s * 0.35)); c.stroke(); }
    const mx = hx + turn * R, my = hy + R * 0.5;
    if (expr === 'scared') { c.beginPath(); c.ellipse(mx, my, R * 0.13, R * 0.08, 0, 0, TAU); c.fill(); c.fillStyle = '#7fb6e6'; c.beginPath(); const sx = hx + R * 0.72 * (dir || 1), sy = hy - R * 0.35; c.moveTo(sx, sy - R * 0.2); c.quadraticCurveTo(sx + R * 0.1, sy, sx, sy + R * 0.06); c.quadraticCurveTo(sx - R * 0.1, sy, sx, sy - R * 0.2); c.fill(); }
    else { c.beginPath(); c.moveTo(mx - R * 0.15, my + R * 0.03); c.quadraticCurveTo(mx, my - R * 0.07, mx + R * 0.15, my + R * 0.03); c.stroke(); }
  }
}

export function figure(c, o) {
  const h = o.h, x = o.x, y = o.y, dir = o.dir ?? 1, view = o.view || 'side', kind = o.kind || 'hero';
  const R = h * 0.14, lean = o.lean || 0;
  const hipY = o.hipY ?? (y - h * 0.45 - (o.bob || 0));
  const hipX = x + (o.hipDx || 0);
  const torso = h * 0.29;
  const nx = hipX + Math.sin(lean) * torso * dir, ny = hipY - Math.cos(lean) * torso;
  const hx = nx + dir * (o.headDx ?? (kind === 'zombie' ? R * 0.55 : R * 0.12)) + Math.sin(lean) * R * 0.6 * dir, hy = ny - R * 0.86 + (kind === 'zombie' ? R * 0.25 : 0);
  const shX = nx - Math.sin(lean) * h * 0.03 * dir, shY = ny + h * 0.035;
  const legW = h * 0.042, armW = h * 0.036, LT = h * 0.235, AT = h * 0.165;
  const body = kind === 'zombie' ? ZOMB.skin : PAL.ink, bodyB = kind === 'zombie' ? ZOMB.skinD : '#06070a';
  const spread = view === 'front' ? h * 0.05 : 0;
  const feet = o.feet || [[x - (view === 'front' ? h * 0.06 : h * 0.03), y], [x + (view === 'front' ? h * 0.06 : h * 0.035), y]];
  const hands = o.hands || [[shX - dir * h * 0.03 - spread * 1.9, shY + h * 0.31], [shX + dir * h * 0.04 + spread * 1.9, shY + h * 0.31]];
  const hipP = [[hipX - spread, hipY], [hipX + spread, hipY]];
  const legs = feet.map((f, i) => ik(hipP[i][0], hipP[i][1], f[0], f[1], LT, LT, -dir * (view === 'front' ? 0.15 * (i ? -1 : 1) : 1)));
  const shP = [[shX - spread * 1.8, shY], [shX + spread * 1.8, shY]];
  const elb = o.elb ?? 1;
  const arms = hands.map((p, i) => ik(shP[i][0], shP[i][1], p[0], p[1], AT, AT, dir * elb * (view === 'front' ? (i ? -1 : 1) * 0.6 : 1)));
  const sleeve = (i, col) => { const a = arms[i]; limb(c, [shP[i][0], shP[i][1], a[0], a[1], lerp(a[0], a[2], 0.86), lerp(a[1], a[3], 0.86)], armW * 1.75, col); };
  const handDraw = (i) => {
    const a = arms[i]; const hd = o.hand || 'nub';
    if (kind === 'hero') limb(c, [lerp(a[0], a[2], 0.8), lerp(a[1], a[3], 0.8), a[2], a[3]], armW, body);
    c.fillStyle = body; circ(c, a[2], a[3], h * (hd === 'mitten' ? 0.034 : 0.028)); c.fill();
    if (hd === 'mitten') { const ang = Math.atan2(a[3] - a[1], a[2] - a[0]); circ(c, a[2] + Math.cos(ang - 1.6 * dir) * h * 0.03, a[3] + Math.sin(ang - 1.6 * dir) * h * 0.03, h * 0.014); c.fill(); }
  };
  // back arm, back leg
  if (kind === 'hero') sleeve(0, HOOD.shade); else limb(c, [shP[0][0], shP[0][1], arms[0][0], arms[0][1], arms[0][2], arms[0][3]], armW, bodyB);
  handDraw(0);
  limb(c, [hipP[0][0], hipP[0][1], legs[0][0], legs[0][1], legs[0][2], legs[0][3]], legW, bodyB === '#06070a' ? body : bodyB);
  foot(c, legs[0][2], legs[0][3], dir, h, body);
  limb(c, [hipP[1][0], hipP[1][1], legs[1][0], legs[1][1], legs[1][2], legs[1][3]], legW, body);
  foot(c, legs[1][2], legs[1][3], dir, h, body);
  // torso
  if (kind === 'hero') hoodie(c, shX, shY, hipX, hipY, h, dir, view, lean);
  else if (kind === 'zombie') shirt(c, shX, shY, hipX, hipY, h, dir, o.seed || 1);
  else limb(c, [nx, ny, hipX, hipY], h * 0.05, body);
  // neck + head
  limb(c, [nx, ny + h * 0.02, hx - dir * R * 0.1, hy + R * 0.7], h * 0.05, body);
  if (kind === 'hero' && o.hood !== false) { c.fillStyle = HOOD.shade; c.beginPath(); c.ellipse(nx - dir * R * 0.15, ny - R * 0.08, R * 0.62, R * 0.36, -dir * 0.15, 0, TAU); c.fill(); }
  c.fillStyle = body; circ(c, hx, hy, R); c.fill();
  if (kind === 'zombie') { c.fillStyle = ZOMB.skinD; c.beginPath(); c.arc(hx, hy, R, Math.PI * 0.15, Math.PI * 0.9); c.fill(); c.fillStyle = body; c.beginPath(); c.ellipse(hx, hy - R * 0.05, R * 0.95, R * 0.85, 0, 0, TAU); c.fill(); }
  if (kind === 'hero' && o.hood !== false) { c.fillStyle = HOOD.base; c.beginPath(); c.ellipse(nx + dir * R * 0.05, ny + R * 0.06, R * 0.48, R * 0.2, 0, 0, TAU); c.fill(); }
  if (!o.noFace) eyes(c, hx, hy, R, o.face || {}, kind, dir, view);
  // front arm
  if (kind === 'hero') sleeve(1, HOOD.base); else limb(c, [shP[1][0], shP[1][1], arms[1][0], arms[1][1], arms[1][2], arms[1][3]], armW, body);
  handDraw(1);
  return { head: [hx, hy, R], hands: arms.map((a) => [a[2], a[3]]), neck: [nx, ny] };
}

function foot(c, fx, fy, dir, h, col) { c.fillStyle = col; c.beginPath(); c.ellipse(fx + dir * h * 0.025, fy - h * 0.012, h * 0.045, h * 0.02, 0, 0, TAU); c.fill(); }

function hoodie(c, sx, sy, hx, hy, h, dir, view, lean) {
  const wTop = view === 'front' ? h * 0.12 : h * 0.085, wBot = view === 'front' ? h * 0.115 : h * 0.09;
  const bx = hx + Math.sin(lean) * h * 0.02 * dir, by = hy + h * 0.05;
  c.fillStyle = HOOD.base;
  c.beginPath(); c.moveTo(sx - wTop, sy + h * 0.01); c.quadraticCurveTo(sx, sy - h * 0.03, sx + wTop, sy + h * 0.01);
  c.lineTo(bx + wBot, by); c.quadraticCurveTo(bx, by + h * 0.012, bx - wBot, by); c.closePath(); c.fill();
  c.fillStyle = HOOD.cuff; c.beginPath(); c.moveTo(bx - wBot, by - h * 0.025); c.lineTo(bx + wBot, by - h * 0.025); c.lineTo(bx + wBot, by); c.quadraticCurveTo(bx, by + h * 0.012, bx - wBot, by); c.closePath(); c.fill();
  // pocket + strings
  c.strokeStyle = HOOD.shade; c.lineWidth = h * 0.006;
  const px = lerp(sx, bx, 0.72) + (view === 'front' ? 0 : dir * h * 0.02), py = lerp(sy, by, 0.72);
  c.beginPath(); c.moveTo(px - h * 0.05, py - h * 0.01); c.lineTo(px + h * 0.05, py - h * 0.01); c.lineTo(px + h * 0.06, py + h * 0.05); c.lineTo(px - h * 0.06, py + h * 0.05); c.closePath(); c.stroke();
  if (view === 'front') { c.strokeStyle = '#f3e3cf'; c.lineWidth = h * 0.005; for (const s of [-1, 1]) { c.beginPath(); c.moveTo(sx + s * h * 0.022, sy + h * 0.01); c.lineTo(sx + s * h * 0.026, sy + h * 0.08); c.stroke(); } }
}

function shirt(c, sx, sy, hx, hy, h, dir, seed) {
  const w = h * 0.085, by = hy + h * 0.06;
  c.fillStyle = ZOMB.shirt; c.beginPath(); c.moveTo(sx - w, sy); c.lineTo(sx + w, sy);
  const n = 7; for (let i = 0; i <= n; i++) { const t = i / n; c.lineTo(hx + w * (1 - 2 * t) * 1.05, by + (hash(seed * 13 + i) - 0.3) * h * 0.06); }
  c.closePath(); c.fill();
  c.fillStyle = ZOMB.shirtD; for (let i = 0; i < 3; i++) { const yy = lerp(sy, by, 0.25 + i * 0.22), xx = sx + (hash(seed + i * 5) - 0.5) * w; c.beginPath(); c.ellipse(xx, yy, h * 0.012, h * 0.022, 0.4, 0, TAU); c.fill(); }
}

/** planted-feet walk. Body moves at v (world u/s) from x0; one step = stepT (5 frames = brisk). Returns hip x, feet, bob. */
export function walk(t, x0, v, dir, h, y, stepT = 5 / 24, tStop = Infinity) {
  const tw = Math.max(0, Math.min(t, Math.floor(tStop / stepT) * stepT));
  const k = Math.floor(tw / stepT), f = tw / stepT - k, L = v * stepT;
  const X = (tt) => x0 + dir * v * tt;
  const plant = (kk) => X(kk * stepT) + dir * L / 2;
  const stance = plant(k), from = plant(k - 1), to = plant(k + 1);
  const moving = t < tStop;
  const sw = moving ? lerp(from, to, f * f * (3 - 2 * f)) : from;
  const lift = moving ? Math.sin(Math.PI * f) * h * 0.05 : 0;
  const feet = [];
  feet[k % 2] = [stance, y]; feet[(k + 1) % 2] = [sw, y - lift];
  return { x: X(tw), feet, bob: moving ? Math.abs(Math.sin(Math.PI * f)) * h * 0.012 : 0, swing: moving ? Math.sin(Math.PI * (k + f)) : 0 };
}

/** hand close-up: black five-finger glove. ang = wrist→fingers direction. curl 0 open … 1 fist/grip */
export function glove(c, x, y, s, ang = 0, curl = 0.4, o = {}) {
  c.save(); c.translate(x, y); c.rotate(ang); c.scale(s, s * (o.flip ? -1 : 1));
  const col = o.col || '#15171d', hi = o.hi || '#2a2e38';
  // sleeve
  c.fillStyle = o.sleeve || HOOD.base; c.beginPath(); c.moveTo(-260, -70); c.lineTo(-40, -62); c.lineTo(-40, 62); c.lineTo(-260, 70); c.closePath(); c.fill();
  c.fillStyle = HOOD.cuff; c.fillRect(-70, -64, 32, 128);
  // palm
  c.fillStyle = col; c.beginPath(); c.moveTo(-42, -52); c.quadraticCurveTo(40, -66, 70, -40); c.lineTo(78, 42); c.quadraticCurveTo(30, 66, -42, 50); c.closePath(); c.fill();
  // fingers
  const F = [[-38, 62, 26], [-14, 78, 24], [10, 74, 23], [32, 58, 20]];
  F.forEach(([fy, len, w], i) => {
    const bend = curl * (1.3 + i * 0.1);
    c.save(); c.translate(70, fy * 0.95); c.rotate(bend * 0.55);
    c.fillStyle = i % 2 ? hi : col; c.beginPath(); c.roundRect(0, -w / 2, len * 0.55, w, w / 2); c.fill();
    c.translate(len * 0.5, 0); c.rotate(bend * 0.6); c.fillStyle = col; c.beginPath(); c.roundRect(0, -w / 2 * 0.95, len * 0.5, w * 0.95, w / 2); c.fill();
    c.restore();
  });
  // thumb
  c.save(); c.translate(10, 46); c.rotate(0.9 - curl * 0.9); c.fillStyle = hi; c.beginPath(); c.roundRect(0, -14, 70, 28, 14); c.fill(); c.restore();
  c.restore();
}
