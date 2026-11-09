// Exteriors, cutaways and hand/prop close-ups. All flat vector, soft gradients, one practical light each.
import { PAL, rr, poly, circ, vgrad, rgrad, mixc, lerp, clamp, hash, TAU, eo } from '../core/lib.js';
import { glove } from '../core/fig.js';

/** FACADE at night: a block of dark windows, ours (col 3,row 2) glowing. o.lit 0..1, o.zombies drawn by caller */
export const FAC = { x0: 300, y0: -700, cols: 6, rows: 9, cw: 220, ch: 180, ours: [3, 6] };
export function facade(V, o = {}) {
  V.layer(3, o.skyDof || 0, (c) => {
    c.fillStyle = vgrad(c, 0, -900, 900, [[0, '#0b1020'], [1, '#26314f']]); c.fillRect(-1400, -1200, 4720, 3200);
    c.fillStyle = 'rgba(230,236,255,0.95)'; circ(c, 1650, 60, 50); c.fill();
    c.fillStyle = rgrad(c, 1650, 60, 0, 300, [[0, 'rgba(190,205,255,0.3)'], [1, 'rgba(190,205,255,0)']]); c.fillRect(1200, -400, 900, 900);
    c.fillStyle = '#121a2e'; for (let i = 0; i < 12; i++) { const bx = -600 + i * 300 + hash(i) * 80, bh = 600 + hash(i + 3) * 500; c.fillRect(bx, 900 - bh, 260, bh); }
  });
  V.layer(1.3, o.dof || 0, (c) => {
    const { x0, y0, cols, rows, cw, ch } = FAC;
    c.fillStyle = '#3a3646'; c.fillRect(x0 - 40, y0 - 60, cols * cw + 80, rows * ch + 120);
    c.fillStyle = '#332f3e'; for (let r = 0; r < rows * 6; r++) for (let q = 0; q < cols * 4; q++) if (hash(r * 91 + q) > 0.7) c.fillRect(x0 - 40 + q * 56 + (r % 2) * 28, y0 - 60 + r * 30, 50, 4);
    for (let r = 0; r < rows; r++) for (let q = 0; q < cols; q++) {
      const wx = x0 + q * cw + 40, wy = y0 + r * ch + 30, ours = q === FAC.ours[0] && r === FAC.ours[1];
      c.fillStyle = '#5a5668'; c.fillRect(wx - 8, wy - 8, cw - 64, ch - 64);
      const lit = ours ? (o.lit ?? 1) : 0;
      c.fillStyle = lit > 0 ? mixc('#1a1f2e', '#ffcf7a', lit) : '#1a1f2e'; c.fillRect(wx, wy, cw - 80, ch - 80);
      if (lit > 0) { c.fillStyle = `rgba(30,20,10,${0.85 * lit})`; c.beginPath(); c.arc(wx + 60, wy + 46, 16, 0, TAU); c.fill(); c.fillRect(wx + 50, wy + 60, 20, 40); }
      c.fillStyle = '#5a5668'; c.fillRect(wx + (cw - 80) / 2 - 3, wy, 6, ch - 80);
    }
    const [q, r] = FAC.ours, lx = x0 + q * cw + 40 + (cw - 80) / 2, ly = y0 + r * ch + 30 + (ch - 80) / 2;
    if ((o.lit ?? 1) > 0) { c.fillStyle = rgrad(c, lx, ly, 10, 420, [[0, `rgba(255,205,120,${0.55 * (o.lit ?? 1)})`], [1, 'rgba(255,205,120,0)']]); c.fillRect(lx - 500, ly - 500, 1000, 1000); }
    // street
    c.fillStyle = '#2a2d38'; c.fillRect(-1400, 920, 4720, 60); c.fillStyle = '#1f2129'; c.fillRect(-1400, 980, 4720, 900);
    c.fillStyle = '#c9b06a'; for (let x = -1400; x < 3320; x += 220) c.fillRect(x, 1180, 110, 10);
    // street lamp
    c.fillStyle = '#16171d'; c.fillRect(1700, 560, 12, 380); c.fillRect(1650, 560, 70, 10);
    c.fillStyle = '#ffc56b'; c.beginPath(); c.ellipse(1655, 574, 22, 8, 0, 0, TAU); c.fill();
    c.fillStyle = rgrad(c, 1655, 760, 10, 340, [[0, 'rgba(255,190,100,0.35)'], [1, 'rgba(255,190,100,0)']]); c.fillRect(1250, 500, 800, 600);
  });
  return FAC;
}
export function facadeOurs() { const [q, r] = FAC.ours; return [FAC.x0 + q * FAC.cw + 40 + (FAC.cw - 80) / 2, FAC.y0 + r * FAC.ch + 30 + (FAC.ch - 80) / 2]; }

/** SKYLINE seen through our window: blackout wave 0..1 (right → left) */
export function skyline(V, o = {}) {
  const bo = clamp(o.blackout || 0);
  V.layer(4, o.dof || 0, (c) => {
    c.fillStyle = vgrad(c, 0, -600, 1000, [[0, '#0a0f1f'], [1, '#2a3a5e']]); c.fillRect(-1400, -1200, 4720, 3200);
    c.fillStyle = 'rgba(230,236,255,0.95)'; circ(c, 420, 120, 46); c.fill();
    for (let i = 0; i < 22; i++) {
      const bw = 110 + hash(i) * 160, bx = -500 + i * 150 + hash(i + 1) * 40, bh = 380 + hash(i + 7) * 640, by = 1000 - bh;
      c.fillStyle = i % 2 ? '#141c33' : '#101729'; c.fillRect(bx, by, bw, bh + 600);
      const dark = (1 - (bx + 500) / 3400) < bo * 1.15 - 0.05;   // wave sweeps right → left
      if (!dark) { c.fillStyle = 'rgba(255,205,120,0.85)'; for (let r = 0; r < bh / 34; r++) for (let q = 0; q < bw / 30; q++) if (hash(i * 131 + r * 17 + q) > 0.5) c.fillRect(bx + 10 + q * 30, by + 16 + r * 34, 14, 18); }
      c.fillStyle = '#ff5a4a'; if (!dark && i % 4 === 0) { circ(c, bx + bw / 2, by - 4, 5); c.fill(); }
    }
  });
  V.layer(1, 0, (c) => {   // our window frame + sill (foreground, sharp)
    c.fillStyle = '#20263a'; c.fillRect(-1400, -1200, 4720, 300 + 1200); c.fillRect(-1400, 860, 4720, 1200); c.fillRect(-1400, -1200, 1520, 3200); c.fillRect(1800, -1200, 1600, 3200);
    c.fillStyle = '#4b5672'; c.fillRect(100, 280, 1720, 22); c.fillRect(100, 840, 1720, 30); c.fillRect(100, 280, 22, 590); c.fillRect(1798, 280, 22, 590); c.fillRect(950, 280, 18, 590);
  });
}

/** BUILDING CUTAWAY: 7 floors, rooftop tank, basement pump. o.lights 0..1, o.pump 0..1 (running), o.water 0..1 in the riser */
export function section(V, o = {}) {
  V.layer(1, 0, (c) => {
    c.fillStyle = vgrad(c, 0, -800, 1500, [[0, '#121a2e'], [1, '#1d2740']]); c.fillRect(-1400, -1200, 4720, 3400);
    const x0 = 560, w = 800, fh = 110, n = 7, base = 900;
    c.fillStyle = '#2a3148'; c.fillRect(x0 - 30, base - n * fh - 30, w + 60, n * fh + 30);
    for (let i = 0; i < n; i++) {
      const y = base - (i + 1) * fh;
      const on = o.lights ?? 1, lit = on > hash(i * 7.7) * 0.9 + 0.05 ? 1 : 0;
      c.fillStyle = lit ? '#e9c98f' : '#353d55'; c.fillRect(x0, y + 8, w, fh - 14);
      if (lit) { c.fillStyle = 'rgba(255,214,140,0.25)'; c.fillRect(x0, y + 8, w, fh - 14); }
      c.fillStyle = lit ? '#c9a873' : '#2b3247'; for (let r = 0; r < 3; r++) c.fillRect(x0 + 60 + r * 260, y + fh - 40, 110, 28);                // tubs
      c.fillStyle = lit ? '#5fb0d6' : '#2e4a66'; for (let r = 0; r < 3; r++) c.fillRect(x0 + 66 + r * 260, y + fh - 36, 98, 8 * (o.tubs ?? 1));
      c.fillStyle = '#10131c'; for (let r = 0; r < 3; r++) { circ(c, x0 + 200 + r * 260, y + fh - 52, 12); c.fill(); c.fillRect(x0 + 196 + r * 260, y + fh - 42, 8, 30); }   // tiny people
    }
    c.fillStyle = '#3b4562'; c.fillRect(x0 - 40, base, w + 80, 170);   // basement
    // riser pipe
    const px = x0 + w + 70, top = base - n * fh - 40, wl = clamp(o.water ?? 1);
    c.fillStyle = '#4b5672'; c.fillRect(px - 16, top, 32, base + 120 - top);
    c.fillStyle = '#5fb0d6'; const wy = lerp(base + 120, top, wl); c.fillRect(px - 9, wy, 18, base + 120 - wy);
    for (let i = 0; i < n; i++) { c.fillStyle = '#4b5672'; c.fillRect(x0 + w, base - (i + 1) * fh + 30, 70, 10); }
    // pump
    const pmp = clamp(o.pump ?? 1);
    c.fillStyle = mixc('#5a6380', '#7e9a86', pmp); rr(c, px - 80, base + 70, 140, 80, 14); c.fill();
    c.save(); c.translate(px - 10, base + 110); c.rotate((V.lt * 9) * pmp); c.strokeStyle = '#1b2234'; c.lineWidth = 8; for (let i = 0; i < 3; i++) { c.rotate(TAU / 3); c.beginPath(); c.moveTo(0, 0); c.lineTo(26, 0); c.stroke(); } c.restore();
    c.fillStyle = '#efe6d6'; c.font = '800 30px Nunito'; c.textAlign = 'center'; c.fillText('PUMP', px - 10, base + 186);
    if (pmp < 0.5) { c.strokeStyle = PAL.red; c.lineWidth = 12; c.lineCap = 'round'; c.beginPath(); c.moveTo(px - 60, base + 60); c.lineTo(px + 40, base + 160); c.moveTo(px + 40, base + 60); c.lineTo(px - 60, base + 160); c.stroke(); }
  });
}

/** STOVE: pot of water coming to the boil (b 0..1) under a blue flame */
export function stove(V, o = {}) {
  const b = clamp(o.boil || 0), t = V.lt;
  V.layer(1.5, o.dof ?? 6, (c) => { c.fillStyle = '#3a3f4a'; c.fillRect(-1400, -1200, 4720, 3400); c.fillStyle = '#e9e6de'; for (let x = -1400; x < 3320; x += 90) for (let y = -1200; y < 520; y += 90) c.fillRect(x + 3, y + 3, 84, 84); });
  V.layer(1, 0, (c) => {
    c.fillStyle = '#2b2f38'; c.fillRect(-1400, 640, 4720, 1600); c.fillStyle = '#1f2229'; c.fillRect(-1400, 640, 4720, 18);
    for (let i = 0; i < 14; i++) { const a = i / 14 * TAU, fx = 960 + Math.cos(a) * 170, fl = 26 + Math.sin(t * 40 + i * 2) * 6; c.fillStyle = '#4f8cff'; c.beginPath(); c.ellipse(fx, 640 - fl / 2, 9, fl / 2 + 2, 0, 0, TAU); c.fill(); }
    c.fillStyle = '#9aa3ad'; rr(c, 680, 300, 560, 340, 30); c.fill(); c.fillStyle = '#b7bec6'; rr(c, 680, 280, 560, 40, 20); c.fill();
    c.fillStyle = '#6e7883'; rr(c, 600, 330, 90, 26, 13); c.fill(); rr(c, 1230, 330, 90, 26, 13); c.fill();
    c.fillStyle = '#4f9fcb'; c.beginPath(); c.ellipse(960, 300, 260, 20, 0, 0, TAU); c.fill();
    for (let i = 0; i < 26 * b; i++) { const bx = 740 + hash(i) * 440, ph = (t * (1.5 + hash(i + 3)) + hash(i + 9)) % 1; c.fillStyle = 'rgba(220,240,255,0.8)'; circ(c, bx, 300 + Math.sin(ph * 3) * 4, 4 + ph * 6); c.fill(); }
    for (let i = 0; i < 5; i++) { const ph = (t * 0.6 + i / 5) % 1; c.strokeStyle = `rgba(240,240,240,${0.45 * b * Math.sin(ph * Math.PI)})`; c.lineWidth = 14; c.lineCap = 'round'; c.beginPath(); const sx = 800 + i * 80; c.moveTo(sx, 260 - ph * 60); c.bezierCurveTo(sx + 40, 180 - ph * 120, sx - 40, 120 - ph * 160, sx + 10, 40 - ph * 200); c.stroke(); }
  });
}

/** TOP-DOWN DESK: phone, power bank, flashlight + charge bars. o.charge [0..1]×3, o.pop [0..1]×3 */
export const DESK = [[600, 520, 'PHONE'], [960, 520, 'POWER BANK'], [1330, 520, 'FLASHLIGHT']];
export function desk(V, o = {}) {
  V.layer(1, 0, (c) => {
    c.fillStyle = '#7b5a3e'; c.fillRect(-1400, -1200, 4720, 3400);
    c.strokeStyle = '#6a4c33'; c.lineWidth = 4; for (let y = -1200; y < 2200; y += 120) { c.beginPath(); c.moveTo(-1400, y); c.lineTo(3320, y); c.stroke(); }
    c.strokeStyle = 'rgba(0,0,0,0.12)'; c.lineWidth = 2; for (let i = 0; i < 40; i++) { const y = hash(i) * 2000 - 600; c.beginPath(); c.moveTo(-1400, y); c.bezierCurveTo(200, y + 20, 1400, y - 20, 3320, y + 10); c.stroke(); }
    // power strip
    c.fillStyle = '#e6e2d8'; rr(c, 760, 120, 400, 70, 16); c.fill(); for (let i = 0; i < 4; i++) { c.fillStyle = '#9a958b'; rr(c, 790 + i * 92, 140, 50, 30, 8); c.fill(); }
    DESK.forEach(([x, y, name], i) => {
      const p = clamp(o.pop?.[i] ?? 1), ch = clamp(o.charge?.[i] ?? 0); if (p <= 0) return;
      c.save(); c.translate(x, y); const s = 0.6 + 0.4 * eo(p * 1.4) + Math.sin(Math.min(1, p) * Math.PI) * 0.06; c.scale(s, s);
      // cable
      c.strokeStyle = '#f2f0ea'; c.lineWidth = 9; c.lineCap = 'round'; c.beginPath(); c.moveTo(0, -120); c.bezierCurveTo(0, -260, 815 - x - 0 + i * 92 - 0, -300, (815 + i * 92) - x, 160 - y); c.stroke();
      if (i === 0) { c.fillStyle = '#16181f'; rr(c, -85, -160, 170, 320, 26); c.fill(); c.fillStyle = mixc('#0d0f14', '#3b5a8a', ch); rr(c, -74, -146, 148, 292, 18); c.fill(); }
      if (i === 1) { c.fillStyle = '#5b6070'; rr(c, -95, -140, 190, 280, 22); c.fill(); c.fillStyle = '#474c5a'; rr(c, -60, -100, 120, 30, 10); c.fill(); }
      if (i === 2) { c.fillStyle = '#1d2027'; rr(c, -46, -150, 92, 260, 30); c.fill(); c.fillStyle = '#2b2f38'; rr(c, -66, -170, 132, 90, 30); c.fill(); c.fillStyle = mixc('#3a3f4a', '#fff1c8', ch); c.beginPath(); c.ellipse(0, -168, 52, 14, 0, 0, TAU); c.fill(); }
      // battery bar
      c.fillStyle = 'rgba(14,16,22,0.92)'; rr(c, -90, 200, 180, 64, 18); c.fill();
      c.strokeStyle = '#efe6d6'; c.lineWidth = 5; rr(c, -60, 214, 100, 36, 7); c.stroke(); c.fillStyle = '#efe6d6'; c.fillRect(42, 224, 8, 16);
      c.fillStyle = ch > 0.99 ? '#7fd17a' : '#f2b266'; c.fillRect(-55, 219, 90 * ch, 26);
      c.fillStyle = '#efe6d6'; c.font = '800 30px Nunito'; c.textAlign = 'center'; c.fillText(name, 0, 320);
      c.restore();
    });
  });
}

/** PHONE in a gloved hand, close-up. o.glow 0..1 (screen on), o.notif 0..1, o.typed (chars of the message), o.time */
export const MSG = 'Let me in. I\'m not bitten.';
export function phone(V, o = {}) {
  const g = clamp(o.glow || 0);
  V.layer(2, 8, (c) => { c.fillStyle = '#1a1f2e'; c.fillRect(-1400, -1200, 4720, 3400); c.fillStyle = '#2b3550'; poly(c, [1200, -200, 1700, -200, 1600, 1400, 1100, 1400]); c.fill(); c.fillStyle = '#26304a'; rr(c, 200, 500, 700, 400, 40); c.fill(); });
  V.layer(1, 0, (c) => {
    const x = 960, y = 470;
    if (g > 0) { c.fillStyle = rgrad(c, x, y, 50, 900, [[0, `rgba(140,180,255,${0.28 * g})`], [1, 'rgba(140,180,255,0)']]); c.fillRect(-500, -500, 3000, 2000); }
    glove(c, x + 40, y + 380, 1.7, -Math.PI / 2 - 0.12, 0.85, { sleeve: '#a94d1d' });
    c.fillStyle = '#0d0f14'; rr(c, x - 190, y - 360, 380, 760, 54); c.fill();
    c.fillStyle = mixc('#06070a', '#1c2b4a', g); rr(c, x - 174, y - 344, 348, 728, 42); c.fill();
    if (g > 0.02) {
      c.globalAlpha = g; c.fillStyle = '#e8eefc'; c.textAlign = 'center'; c.font = '600 112px Fredoka'; c.fillText(o.time || '11:58', x, y - 170); c.font = '700 30px Nunito'; c.fillText('Tuesday', x, y - 270);
      const n = clamp(o.notif || 0);
      if (n > 0) {
        c.save(); c.translate(0, (1 - eo(n)) * 40); c.globalAlpha = g * eo(n);
        c.fillStyle = 'rgba(236,240,250,0.95)'; rr(c, x - 158, y - 80, 316, 200, 28); c.fill();
        c.fillStyle = '#c8372d'; rr(c, x - 138, y - 60, 44, 44, 12); c.fill(); c.fillStyle = '#fff'; c.font = '800 22px Nunito'; c.fillText('4B', x - 116, y - 30);
        c.textAlign = 'left'; c.fillStyle = '#1b2234'; c.font = '800 28px Nunito'; c.fillText('Neighbor · 4B', x - 82, y - 30);
        const txt = MSG.slice(0, o.typed ?? MSG.length); c.font = '700 30px Nunito'; c.fillStyle = '#20263a';
        const wds = txt.split(' '); let line = '', ly = y + 20; for (const w of wds) { const tl = line ? line + ' ' + w : w; if (c.measureText(tl).width > 270) { c.fillText(line, x - 138, ly); line = w; ly += 40; } else line = tl; } c.fillText(line, x - 138, ly);
        c.restore();
      }
      c.globalAlpha = 1;
    }
    if (o.thumb) glove(c, x - 150, y + 300, 1.5, -0.35, 0.75, { sleeve: '#d2622a', flip: false });
  });
}

/** CALENDAR card of water days: n filled of 37, counter drawn by caller */
export function waterDays(c, cx, cy, s, fill) {
  for (let i = 0; i < 37; i++) {
    const col = i % 7, row = Math.floor(i / 7), x = cx + (col - 3) * 118 * s, y = cy + (row - 2.5) * 118 * s, f = clamp(fill * 37 - i);
    c.fillStyle = 'rgba(239,230,214,0.08)'; rr(c, x - 50 * s, y - 50 * s, 100 * s, 100 * s, 18 * s); c.fill();
    if (f > 0) { const k = 0.5 + 0.5 * eo(f * 1.5); c.fillStyle = '#5fb0d6'; c.beginPath(); c.moveTo(x, y - 34 * s * k); c.bezierCurveTo(x + 30 * s * k, y, x + 26 * s * k, y + 30 * s * k, x, y + 30 * s * k); c.bezierCurveTo(x - 26 * s * k, y + 30 * s * k, x - 30 * s * k, y, x, y - 34 * s * k); c.fill(); }
  }
}

/** CANS on the counter (top shelf view) — n popped */
export function cans(c, x, y, s, n) {
  const C = [['#c8372d', 'TOMATO'], ['#e0b04a', 'CORN'], ['#7e9a86', 'PEAS'], ['#d2622a', 'SOUP'], ['#5c7ba6', 'BEANS'], ['#c8372d', 'TOMATO']];
  const pos = [[-220, 0], [0, 0], [220, 0], [-110, -190], [110, -190], [0, -380]];
  pos.forEach(([dx, dy], i) => {
    const p = clamp(n - i); if (p <= 0) return; const k = eo(p * 1.6), j = (1 - k) * -60;
    const X = x + dx * s, Y = y + dy * s + j * s, w = 190 * s, h = 180 * s;
    c.fillStyle = '#b9bcc2'; rr(c, X - w / 2, Y - h, w, h, 14 * s); c.fill();
    c.fillStyle = C[i][0]; c.fillRect(X - w / 2, Y - h * 0.8, w, h * 0.62);
    c.fillStyle = '#efe6d6'; c.fillRect(X - w * 0.36, Y - h * 0.62, w * 0.72, h * 0.26);
    c.fillStyle = C[i][0]; c.font = `800 ${Math.round(26 * s)}px Nunito`; c.textAlign = 'center'; c.fillText(C[i][1], X, Y - h * 0.43);
    c.fillStyle = '#d6d9de'; c.beginPath(); c.ellipse(X, Y - h, w / 2, 14 * s, 0, 0, TAU); c.fill();
  });
}
