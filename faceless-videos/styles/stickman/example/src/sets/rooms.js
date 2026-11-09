// Flat-vector rooms (style-sheet.png "SETS"). World: 1920x960 picture at zoom 1, floor line FLOOR, walls/floor overdrawn
// far beyond the picture so the 9:16 frame (taller view) never sees an edge. Every set takes a mood blend:
// dark 0 = lamp-lit evening (warm), 1 = lights killed (moonlight navy).
import { PAL, rr, poly, circ, vgrad, rgrad, mixc, lerp, clamp, hash, TAU } from '../core/lib.js';
export const FLOOR = 780;
const M = (a, b, k) => mixc(a, b, k);

function planks(c, x0, x1, y0, y1, col, line) {
  c.fillStyle = col; c.fillRect(x0, y0, x1 - x0, y1 - y0);
  c.strokeStyle = line; c.lineWidth = 3;
  for (let y = y0 + 34, i = 0; y < y1; y += 34 + i * 6, i++) { c.beginPath(); c.moveTo(x0, y); c.lineTo(x1, y); c.stroke(); for (let k = 0; k < 6; k++) { const xx = x0 + ((hash(i * 7 + k) * (x1 - x0)) | 0); c.beginPath(); c.moveTo(xx, y); c.lineTo(xx, y - 34 - (i - 1) * 6); c.stroke(); } }
}
export function wallFloor(c, o) {
  const k = o.dark || 0;
  c.fillStyle = vgrad(c, 0, -700, FLOOR, [[0, M(o.wallTop || '#8f806b', '#232a3b', k)], [0.55, M(o.wall || '#bba98f', '#384259', k)], [1, M(o.wallLow || '#a8957b', '#2e364a', k)]]);
  c.fillRect(-1400, -900, 4720, FLOOR + 900);
  c.fillStyle = M('#e3d8c6', '#4a5470', k); c.fillRect(-1400, 92, 4720, 14);           // crown moulding
  c.fillStyle = M('#7a6a55', '#20263a', k); c.fillRect(-1400, -900, 4720, 992);         // ceiling band (only the 9:16 view sees it)
  planks(c, -1400, 3320, FLOOR, 1900, M(o.floor || '#7c5b41', '#272a37', k), M(o.floorLine || '#6a4c35', '#20222e', k));
  c.fillStyle = M('#e9dfcf', '#56607c', k); c.fillRect(-1400, FLOOR - 22, 4720, 22);    // skirting
  c.fillStyle = 'rgba(0,0,0,0.18)'; c.fillRect(-1400, FLOOR, 4720, 30);
}
export function door(c, x, y0, w, h, o = {}) {
  const k = o.dark || 0, sh = o.shake || 0;
  c.fillStyle = M('#efe6d6', '#59647e', k); c.fillRect(x - 18, y0 - 18, w + 36, h + 18);
  c.fillStyle = M('#3f2c22', '#1f1b22', k); c.fillRect(x, y0, w, h);
  c.save(); c.translate(sh * 4, 0);
  c.fillStyle = M(o.col || '#5b3d2d', '#2b2530', k); c.fillRect(x + 6, y0 + 6, w - 12, h - 6);
  c.strokeStyle = M('#4a3125', '#231e28', k); c.lineWidth = 5; for (const [yy, hh] of [[0.07, 0.36], [0.5, 0.42]]) c.strokeRect(x + w * 0.16, y0 + h * yy, w * 0.68, h * hh);
  c.fillStyle = M('#d9b56a', '#7d7462', k); circ(c, x + w - 28, y0 + h * 0.54, 11); c.fill();             // knob
  c.fillStyle = M('#c9a35c', '#6f6656', k); rr(c, x + w - 38, y0 + h * 0.43, 20, 30, 6); c.fill();          // deadbolt
  c.fillStyle = '#111'; circ(c, x + w / 2, y0 + h * 0.3, 6); c.fill();                                      // peephole
  if (o.num) { c.fillStyle = M('#d9b56a', '#7d7462', k); c.font = '700 34px Fredoka'; c.textAlign = 'center'; c.fillText(o.num, x + w / 2, y0 + h * 0.2); }
  c.restore();
  if (o.gap) { c.fillStyle = o.gap; c.fillRect(x + 6, y0 + h - 8, w - 12, 8); }
}
export function windowNight(c, x, y, w, h, o = {}) {
  const k = o.dark || 0;
  c.fillStyle = M('#efe6d6', '#5b6680', k); c.fillRect(x - 20, y - 20, w + 40, h + 40);
  c.fillStyle = vgrad(c, 0, y, y + h, [[0, '#121a33'], [1, '#2d3f66']]); c.fillRect(x, y, w, h);
  c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip();
  c.fillStyle = 'rgba(230,236,255,0.95)'; circ(c, x + w * 0.72, y + h * 0.26, h * 0.09); c.fill();
  c.fillStyle = rgrad(c, x + w * 0.72, y + h * 0.26, 0, h * 0.4, [[0, 'rgba(200,215,255,0.35)'], [1, 'rgba(200,215,255,0)']]); c.fillRect(x, y, w, h);
  for (let i = 0; i < 9; i++) {
    const bw = w * (0.1 + hash(i) * 0.12), bx = x + (i / 9) * w * 1.05 - 10, bh = h * (0.25 + hash(i + 9) * 0.4);
    c.fillStyle = '#0d1426'; c.fillRect(bx, y + h - bh, bw, bh);
    const lit = o.blackout != null ? hash(i * 3.1) > o.blackout : true;
    if (lit) { c.fillStyle = 'rgba(255,205,120,0.8)'; for (let r = 0; r < 6; r++) for (let q = 0; q < 3; q++) if (hash(i * 31 + r * 7 + q) > 0.55) c.fillRect(bx + 6 + q * (bw / 3.2), y + h - bh + 10 + r * 16, 5, 7); }
  }
  c.restore();
  c.fillStyle = M('#efe6d6', '#5b6680', k); c.fillRect(x + w / 2 - 6, y, 12, h); c.fillRect(x, y + h * 0.48, w, 10);
  c.fillStyle = M('#e3d8c6', '#4f5a74', k); c.fillRect(x - 34, y + h + 12, w + 68, 18);
}

/** LIVING ROOM. o: dark, couchX, blanket (0..1 covering the window), doorShake, lampOn, gap (light under door) */
export const LIV = { door: [300, 330, 220, 450], win: [1180, 250, 380, 330], sw: [600, 520] };
export function living(V, o = {}) {
  const k = o.dark ?? 0, dof = o.dof ?? 0;
  V.layer(1.5, dof, (c) => {
    wallFloor(c, { dark: k });
    door(c, ...LIV.door, { dark: k, shake: o.doorShake || 0, gap: o.gap, num: null });
    // light switch
    c.fillStyle = M('#efe6d6', '#646f8a', k); rr(c, LIV.sw[0] - 18, LIV.sw[1] - 28, 36, 56, 6); c.fill();
    c.fillStyle = M('#c8bca8', '#4c556c', k); rr(c, LIV.sw[0] - 6, LIV.sw[1] - 14 + (o.switchDown ? 10 : 0), 12, 18, 3); c.fill();
    windowNight(c, ...LIV.win, { dark: k, blackout: o.blackout });
    // curtains
    c.fillStyle = M('#c9a14a', '#3f4258', k); for (const xx of [LIV.win[0] - 70, LIV.win[0] + LIV.win[2] + 20]) { c.beginPath(); c.moveTo(xx, LIV.win[1] - 40); c.lineTo(xx + 50, LIV.win[1] - 40); c.lineTo(xx + 56, LIV.win[1] + LIV.win[3] + 60); c.lineTo(xx - 6, LIV.win[1] + LIV.win[3] + 60); c.fill(); }
    if (o.blanket) { const b = clamp(o.blanket); c.fillStyle = M('#7a4f6a', '#3a2b40', k * 0.7); const [wx, wy, ww, wh] = LIV.win; c.beginPath(); c.moveTo(wx - 40, wy - 40); c.lineTo(wx + ww + 40, wy - 40); c.lineTo(wx + ww + 40, wy - 40 + (wh + 90) * b); for (let i = 8; i >= 0; i--) c.lineTo(wx - 40 + (ww + 80) * i / 8, wy - 40 + (wh + 90) * b + Math.sin(i * 1.7) * 8 * b); c.closePath(); c.fill(); c.strokeStyle = 'rgba(0,0,0,0.15)'; c.lineWidth = 4; for (let i = 1; i < 5; i++) { c.beginPath(); c.moveTo(wx - 40 + (ww + 80) * i / 5, wy - 40); c.lineTo(wx - 40 + (ww + 80) * i / 5, wy - 40 + (wh + 90) * b); c.stroke(); } }
    // frames above the couch
    for (const [fx, fy, fw, fh] of [[820, 300, 120, 150], [970, 330, 160, 110]]) { c.fillStyle = M('#3b2d24', '#1d1f2a', k); c.fillRect(fx, fy, fw, fh); c.fillStyle = M('#9fb3a2', '#3a4560', k); c.fillRect(fx + 10, fy + 10, fw - 20, fh - 20); }
    // floor lamp
    c.fillStyle = M('#2b2622', '#16171e', k); c.fillRect(1708, 360, 8, FLOOR - 360); c.fillRect(1680, FLOOR - 10, 64, 10);
    c.fillStyle = M('#e8c98a', '#3c3f52', k); poly(c, [1662, 300, 1762, 300, 1782, 372, 1642, 372]); c.fill();
    if (!k && o.lampOn !== false) { c.fillStyle = rgrad(c, 1712, 360, 10, 520, [[0, 'rgba(255,200,120,0.45)'], [1, 'rgba(255,200,120,0)']]); c.fillRect(1100, -200, 1300, 1300); }
    // plant
    c.fillStyle = M('#8c5a3c', '#2a2430', k); poly(c, [1810, 700, 1880, 700, 1870, FLOOR, 1820, FLOOR]); c.fill();
    c.fillStyle = M('#55785b', '#26323a', k); for (let i = 0; i < 7; i++) { c.beginPath(); c.ellipse(1845 + Math.cos(i) * 40, 640 + Math.sin(i * 2) * 30, 22, 50, i, 0, TAU); c.fill(); }
    // moonlight beam
    if (k > 0.2) { c.fillStyle = `rgba(150,175,230,${0.12 * k * (1 - (o.blanket || 0))})`; poly(c, [LIV.win[0], LIV.win[1] + LIV.win[3], LIV.win[0] + LIV.win[2], LIV.win[1] + LIV.win[3], LIV.win[0] + LIV.win[2] - 120, 1400, LIV.win[0] - 380, 1400]); c.fill(); }
  });
  V.layer(1.12, dof * 0.6, (c) => couch(c, o.couchX ?? 980, k));
}
export function couch(c, cx, k = 0) {
  const w = 480, y = FLOOR;
  c.fillStyle = 'rgba(0,0,0,0.22)'; c.beginPath(); c.ellipse(cx, y + 6, w * 0.55, 18, 0, 0, TAU); c.fill();
  c.fillStyle = M('#466374', '#28323f', k); rr(c, cx - w / 2 + 30, y - 250, w - 60, 150, 26); c.fill();                     // back
  c.fillStyle = M('#527486', '#2f3b4a', k); rr(c, cx - w / 2 + 40, y - 140, w - 80, 70, 18); c.fill();                     // seat
  c.fillStyle = M('#3d5766', '#232c38', k); rr(c, cx - w / 2 + 40, y - 80, w - 80, 66, 10); c.fill();                      // base
  for (const s of [-1, 1]) { c.fillStyle = M('#4b6b7d', '#2b3644', k); rr(c, cx + s * (w / 2 - 34) - 34, y - 175, 68, 160, 22); c.fill(); }
  c.fillStyle = M('#2c2723', '#14151b', k); for (const s of [-1, 1]) c.fillRect(cx + s * (w / 2 - 50) - 6, y - 16, 12, 16);
  c.fillStyle = M('#d9a441', '#4a4636', k); rr(c, cx + 80, y - 200, 90, 70, 18); c.fill();                                // cushion
}

/** HALLWAY, one-point perspective. o: dark (flicker), shake4B, zombies [{z, u (−1 left … 1 right), t, kind}] */
const VP = [960, 470], NEAR = { l: -260, r: 2180, t: -420, b: 1360 };
const sx = (x, z) => VP[0] + (x - VP[0]) / z, sy = (y, z) => VP[1] + (y - VP[1]) / z;
export function hallway(V, o = {}) {
  const fl = o.flicker ?? 1, Z = 5.2;
  V.layer(1.4, o.dof || 0, (c) => {
    const k = o.dark || 0;
    const wallC = M('#8f8c7c', '#3a3d48', k), wallD = M('#7c7a6c', '#30333e', k), ceilC = M('#6f6c62', '#262832', k);
    // far end
    c.fillStyle = M('#6e6b60', '#2a2c36', k); c.fillRect(sx(NEAR.l, Z), sy(NEAR.t, Z), sx(NEAR.r, Z) - sx(NEAR.l, Z), sy(NEAR.b, Z) - sy(NEAR.t, Z));
    c.fillStyle = '#1b2440'; const ew = 70, eh = 90; c.fillRect(VP[0] - ew / 2, VP[1] - eh / 2 - 20, ew, eh); c.fillStyle = 'rgba(160,180,230,0.3)'; c.fillRect(VP[0] - 2, VP[1] - eh / 2 - 20, 4, eh);
    const quad = (x1, y1, x2, y2, z1, z2, col) => { c.fillStyle = col; poly(c, [sx(x1, z1), sy(y1, z1), sx(x2, z1), sy(y2, z1), sx(x2, z2), sy(y2, z2), sx(x1, z2), sy(y1, z2)]); c.fill(); };
    // walls / floor / ceiling
    c.fillStyle = wallC; poly(c, [sx(NEAR.l, 1), sy(NEAR.t, 1), sx(NEAR.l, Z), sy(NEAR.t, Z), sx(NEAR.l, Z), sy(NEAR.b, Z), sx(NEAR.l, 1), sy(NEAR.b, 1)]); c.fill();
    c.fillStyle = wallD; poly(c, [sx(NEAR.r, 1), sy(NEAR.t, 1), sx(NEAR.r, Z), sy(NEAR.t, Z), sx(NEAR.r, Z), sy(NEAR.b, Z), sx(NEAR.r, 1), sy(NEAR.b, 1)]); c.fill();
    c.fillStyle = M('#4e4840', '#1d1e26', k); poly(c, [sx(NEAR.l, 1), sy(NEAR.b, 1), sx(NEAR.r, 1), sy(NEAR.b, 1), sx(NEAR.r, Z), sy(NEAR.b, Z), sx(NEAR.l, Z), sy(NEAR.b, Z)]); c.fill();
    c.fillStyle = M('#6b3b32', '#2c1e22', k); poly(c, [sx(540, 1), sy(NEAR.b, 1), sx(1380, 1), sy(NEAR.b, 1), sx(1380, Z), sy(NEAR.b, Z), sx(540, Z), sy(NEAR.b, Z)]); c.fill();
    c.fillStyle = ceilC; poly(c, [sx(NEAR.l, 1), sy(NEAR.t, 1), sx(NEAR.r, 1), sy(NEAR.t, 1), sx(NEAR.r, Z), sy(NEAR.t, Z), sx(NEAR.l, Z), sy(NEAR.t, Z)]); c.fill();
    // dado stripe
    for (const X of [NEAR.l, NEAR.r]) quad(X, 560, X, 600, 1, Z, M('#5d7a77', '#283039', k));
    for (const X of [NEAR.l, NEAR.r]) { c.strokeStyle = M('#5d7a77', '#283039', k); c.lineWidth = 2; }
    // doors on both walls: z ranges
    const doorAt = (X, z1, z2, num, shake, col) => {
      const top = 210, j = shake ? (hash(Math.floor(V.lt * 24)) - 0.5) * 6 * shake : 0;
      c.fillStyle = M('#e6dccb', '#4f5870', k); poly(c, [sx(X, z1 - 0.05), sy(top - 30, z1 - 0.05), sx(X, z2 + 0.05), sy(top - 30, z2 + 0.05), sx(X, z2 + 0.05), sy(NEAR.b, z2 + 0.05), sx(X, z1 - 0.05), sy(NEAR.b, z1 - 0.05)]); c.fill();
      c.save(); c.translate(j, 0);
      c.fillStyle = M(col, '#2a2430', k); poly(c, [sx(X, z1), sy(top, z1), sx(X, z2), sy(top, z2), sx(X, z2), sy(NEAR.b, z2), sx(X, z1), sy(NEAR.b, z1)]); c.fill();
      const zm = (z1 + z2) / 2; c.fillStyle = M('#d9b56a', '#77705f', k); circ(c, sx(X, z2 - 0.12), sy(760, z2 - 0.12), 10 / zm); c.fill();
      c.font = `700 ${Math.round(60 / zm)}px Fredoka`; c.textAlign = 'center'; c.fillText(num, sx(X, zm), sy(330, zm));
      c.restore();
    };
    doorAt(NEAR.l, 1.45, 1.95, '4B', o.shake4B || 0, '#4c5e73');
    doorAt(NEAR.r, 1.5, 2.0, '4A', 0, '#5b3d2d');
    doorAt(NEAR.l, 2.9, 3.25, '4D', 0, '#4c5e73');
    doorAt(NEAR.r, 3.0, 3.35, '4C', 0, '#5b3d2d');
    // ceiling lights
    for (const z of [1.25, 2.3, 3.6]) {
      const on = z < 2 ? fl : 1; c.fillStyle = on > 0.5 ? '#fff3d6' : '#6a675e'; c.beginPath(); c.ellipse(VP[0], sy(NEAR.t + 30, z), 90 / z, 18 / z, 0, 0, TAU); c.fill();
      if (on > 0.5) { c.fillStyle = rgrad(c, VP[0], sy(NEAR.t + 120, z), 0, 900 / z, [[0, `rgba(255,236,190,${0.22 * (1 - k * 0.5)})`], [1, 'rgba(255,236,190,0)']]); c.fillRect(-500, -600, 2900, 2200); }
    }
  });
  if (o.zombies) V.chars(1.4, o.zdof || 0, o.rim || { col: '#e9c98f', w: 3.5, dx: 0.6, dy: -0.6 }, (c) => { for (const z of o.zombies) o.drawZ(c, z, sx, sy); });
}
export const HALL = { VP, NEAR, sx, sy };

/** BATHROOM. o: dark, level 0..1 water, flow 0..1 */
export function bathroom(V, o = {}) {
  const k = o.dark || 0, L = clamp(o.level || 0);
  V.layer(1.4, o.dof || 0, (c) => {
    c.fillStyle = M('#9fb2bd', '#33405a', k); c.fillRect(-1400, -900, 4720, FLOOR + 900);
    c.strokeStyle = M('#8ea1ac', '#2c3850', k); c.lineWidth = 3;
    for (let y = -900; y < FLOOR; y += 64) { c.beginPath(); c.moveTo(-1400, y); c.lineTo(3320, y); c.stroke(); }
    for (let x = -1400; x < 3320; x += 64) { c.beginPath(); c.moveTo(x, -900); c.lineTo(x, FLOOR); c.stroke(); }
    c.fillStyle = M('#d8d2c6', '#4a5370', k); for (let y = FLOOR; y < 1900; y += 70) for (let x = -1400; x < 3320; x += 70) { c.fillStyle = ((x + y) / 70) % 2 ? M('#cfc8bb', '#3b4460', k) : M('#e0dacd', '#454f6b', k); c.fillRect(x, y, 70, 70); }
    // curtain rail + curtain
    c.fillStyle = M('#b8b8b8', '#55607a', k); c.fillRect(380, 120, 1240, 10);
    c.fillStyle = M('#5a7c96', '#28354c', k); for (let i = 0; i < 6; i++) { c.beginPath(); c.moveTo(390 + i * 36, 130); c.lineTo(426 + i * 36, 130); c.lineTo(432 + i * 36 + Math.sin(i) * 8, 560); c.lineTo(396 + i * 36, 560); c.fill(); }
    // towel + mirror
    c.fillStyle = M('#e9e1d2', '#5d6782', k); rr(c, 1720, 260, 110, 220, 10); c.fill(); c.fillStyle = M('#c75c3b', '#4b3540', k); c.fillRect(1720, 420, 110, 18);
    c.fillStyle = M('#c4c0b6', '#555e78', k); rr(c, 1700, 230, 150, 12, 6); c.fill();
  });
  V.layer(1.1, (o.dof || 0) * 0.5, (c) => tub(c, 1000, L, o.flow || 0, k, V.lt));
}
export function tub(c, cx, L, flow, k, t) {
  const w = 980, top = 520, rim = 600;
  c.fillStyle = 'rgba(0,0,0,0.2)'; c.beginPath(); c.ellipse(cx, FLOOR + 6, w * 0.52, 20, 0, 0, TAU); c.fill();
  c.fillStyle = M('#b9c2c8', '#3d4760', k); rr(c, cx - w / 2 + 20, top, w - 40, rim - top + 20, 30); c.fill();          // inner back wall
  if (L > 0) {
    const wy = lerp(rim + 4, top + 12, L);
    c.fillStyle = M('#5fb0d6', '#2f5f86', k); c.fillRect(cx - w / 2 + 26, wy, w - 52, rim - wy + 10);
    c.fillStyle = 'rgba(255,255,255,0.55)'; c.fillRect(cx - w / 2 + 26, wy, w - 52, 5);
    if (flow) for (let i = 0; i < 4; i++) { const r = ((t * 1.3 + i * 0.25) % 1); c.strokeStyle = `rgba(255,255,255,${0.5 * (1 - r)})`; c.lineWidth = 3; c.beginPath(); c.ellipse(cx + 360, wy + 3, 20 + r * 110, 4 + r * 9, 0, Math.PI, TAU); c.stroke(); }
  }
  c.fillStyle = M('#efebe3', '#596380', k); rr(c, cx - w / 2, rim - 20, w, 40, 20); c.fill();                          // front rim
  c.fillStyle = M('#e2ddd3', '#4c5571', k); c.fillRect(cx - w / 2 + 10, rim + 10, w - 20, FLOOR - rim - 30);         // front panel
  c.fillStyle = M('#d2ccc1', '#434b66', k); c.fillRect(cx - w / 2 + 10, FLOOR - 40, w - 20, 22);
  // tap
  const tx = cx + 360;
  c.fillStyle = M('#c9cdd2', '#69728b', k); rr(c, tx - 14, top - 120, 28, 110, 10); c.fill(); rr(c, tx - 14, top - 124, 80, 26, 12); c.fill();
  c.fillStyle = M('#c9cdd2', '#69728b', k); rr(c, tx - 70, top - 104, 56, 16, 8); c.fill(); rr(c, tx + 14, top - 104, 56, 16, 8); c.fill();
  if (flow > 0) {
    const y0 = top - 98, y1 = lerp(rim + 4, top + 12, L);
    c.fillStyle = `rgba(150,210,240,${0.75 * flow})`; c.beginPath(); c.moveTo(tx + 54, y0);
    for (let i = 0; i <= 10; i++) c.lineTo(tx + 54 + 8 + Math.sin(t * 30 + i) * 2, lerp(y0, y1, i / 10));
    for (let i = 10; i >= 0; i--) c.lineTo(tx + 54 - 8 + Math.sin(t * 30 + i + 1) * 2, lerp(y0, y1, i / 10)); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.6)'; c.fillRect(tx + 50, y0, 3, y1 - y0);
  }
}

/** KITCHEN. o: dark, fridge 0..1 open, fridgeLight 0..1 */
export function kitchen(V, o = {}) {
  const k = o.dark || 0, op = clamp(o.fridge || 0), fl = o.fridgeLight ?? 1;
  V.layer(1.45, o.dof || 0, (c) => {
    wallFloor(c, { dark: k, wall: '#c3b398', floor: '#86664a' });
    c.fillStyle = M('#e9e6de', '#465068', k); c.fillRect(200, 380, 1100, 180);
    c.strokeStyle = M('#d6d2c8', '#3c455c', k); c.lineWidth = 3; for (let x = 200; x <= 1300; x += 46) { c.beginPath(); c.moveTo(x, 380); c.lineTo(x, 560); c.stroke(); } for (let y = 380; y <= 560; y += 46) { c.beginPath(); c.moveTo(200, y); c.lineTo(1300, y); c.stroke(); }
    for (let i = 0; i < 4; i++) { c.fillStyle = M('#7e9a86', '#2f3d42', k); c.fillRect(220 + i * 270, 150, 255, 210); c.fillStyle = M('#6c8874', '#283439', k); c.fillRect(220 + i * 270 + 120, 250, 14, 50); }
    c.fillStyle = M('#e6dccb', '#3f4860', k); c.fillRect(180, 560, 1150, 36);
    for (let i = 0; i < 4; i++) { c.fillStyle = M('#7e9a86', '#2f3d42', k); c.fillRect(200 + i * 278, 600, 266, FLOOR - 620); c.fillStyle = M('#6c8874', '#283439', k); c.fillRect(200 + i * 278 + 110, 630, 46, 12); }
    // pendant
    c.strokeStyle = M('#2b2a28', '#15161c', k); c.lineWidth = 4; c.beginPath(); c.moveTo(760, -400); c.lineTo(760, 250); c.stroke();
    c.fillStyle = M('#4b6150', '#1f2a2e', k); poly(c, [700, 300, 820, 300, 790, 250, 730, 250]); c.fill();
    if (!k) { c.fillStyle = rgrad(c, 760, 330, 10, 560, [[0, 'rgba(255,214,140,0.45)'], [1, 'rgba(255,214,140,0)']]); c.fillRect(100, 200, 1400, 900); }
    // fridge
    const fx = 1380, fy = 200, fw = 300, fh = FLOOR - 200;
    c.fillStyle = M('#e7e2d8', '#4c5570', k); rr(c, fx, fy, fw, fh, 18); c.fill();
    if (op > 0) {
      const lit = fl;
      c.fillStyle = mixc(M('#4c5570', '#2a2f40', k), '#fff4d8', lit); rr(c, fx + 14, fy + 14, fw - 28, fh - 28, 10); c.fill();
      c.fillStyle = mixc('#3a4054', '#d9cfb5', lit); for (let s = 1; s < 5; s++) c.fillRect(fx + 14, fy + s * fh / 5, fw - 28, 8);
      const items = [['#c8372d', 40, 70], ['#e8d27a', 140, 50], ['#7fb36a', 200, 60], ['#f0f0f0', 60, 90], ['#d98a3a', 180, 40]];
      items.forEach(([col, ix, ih], i) => { c.fillStyle = mixc('#2a2f40', col, 0.4 + 0.6 * lit); rr(c, fx + ix, fy + ((i % 4) + 1) * fh / 5 - ih, 60, ih, 8); c.fill(); });
      if (lit > 0.05) { c.fillStyle = rgrad(c, fx + fw / 2, fy + fh / 2, 20, 700, [[0, `rgba(255,244,210,${0.35 * lit})`], [1, 'rgba(255,244,210,0)']]); c.fillRect(fx - 800, fy - 400, 1900, 1600); }
      c.fillStyle = M('#dcd6ca', '#454e68', k); poly(c, [fx, fy, fx - 210 * op, fy + 40, fx - 210 * op, fy + fh - 30, fx, fy + fh]); c.fill();
    } else { c.fillStyle = M('#d3cdc1', '#434b66', k); c.fillRect(fx, fy + 210, fw, 6); c.fillStyle = M('#a9a398', '#3c4359', k); rr(c, fx + 24, fy + 60, 14, 120, 7); c.fill(); rr(c, fx + 24, fy + 250, 14, 160, 7); c.fill(); }
  });
}
