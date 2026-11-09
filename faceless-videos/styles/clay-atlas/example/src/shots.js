// The shot list: one entry per cut, each draws itself from the narration clock.
import { W, H, C, T, s, e, w, we, clamp, lerp, k, eo, eio, sine, rng, IMG, still, project, mixCam } from './main.js';
import { dateStamp, labelBox, redTag, mapLabel, pin, timeChip, truck, sparks, shards, dust, glint, streaks, rr, font } from './gfx.js';

const has = (n) => !!IMG[n];
const cam = (A, B, p, ease = sine) => mixCam(A, B, ease(clamp(p)));

// ---------- the map (a generated parchment map, its AI labels erased; Louvre fill revealed from map_base) ----------
let LOUVRE = null;
function louvreLayer() {
  if (LOUVRE) return LOUVRE;
  const m = IMG.map, c = document.createElement('canvas'); c.width = m.width; c.height = m.height; const x = c.getContext('2d');
  x.drawImage(IMG.map_mask, 0, 0);   // white = Louvre → use as alpha
  const id = x.getImageData(0, 0, c.width, c.height); for (let i = 0; i < id.data.length; i += 4) { id.data[i + 3] = id.data[i]; } x.putImageData(id, 0, 0);
  x.globalCompositeOperation = 'source-in'; x.drawImage(m, 0, 0);
  return (LOUVRE = c);
}
/** draw the map with zoom z centred on image point (cu,cv); returns a projector img→screen */
function drawMap(x, z, cu, cv, fill, fillT) {
  const m = IMG.map, IW = m.width, IH = m.height, sc = Math.max(W / IW, H / IH) * z;
  // keep the frame inside the map
  const hu = W / 2 / sc / IW, hv = H / 2 / sc / IH; cu = clamp(cu, hu, 1 - hu); cv = clamp(cv, hv, 1 - hv);
  const P = (u, v) => ({ x: W / 2 + (u - cu) * IW * sc, y: H / 2 + (v - cv) * IH * sc });
  const o = P(0, 0);
  x.drawImage(IMG.map_base, o.x, o.y, IW * sc, IH * sc);
  if (fill > 0) { // wipe the orange in from the west, with a soft edge
    const L = louvreLayer(), a = P(0.30, 0), b = P(0.70, 0), edge = lerp(a.x - 40, b.x + 40, eo(fill));
    x.save(); x.beginPath(); x.rect(0, 0, edge, H); x.clip(); x.drawImage(L, o.x, o.y, IW * sc, IH * sc); x.restore();
    if (fill < 1) { x.save(); x.globalAlpha = 0.5 * (1 - fill); x.globalCompositeOperation = 'lighter'; const g = x.createLinearGradient(edge - 60, 0, edge, 0); g.addColorStop(0, 'rgba(255,170,90,0)'); g.addColorStop(1, 'rgba(255,190,120,0.9)'); x.fillStyle = g; x.beginPath(); x.rect(edge - 60, 0, 60, H); x.clip(); x.drawImage(L, o.x, o.y, IW * sc, IH * sc); x.restore(); }
    if (fillT) { const pulse = Math.max(0, 1 - fillT) * 0.35; if (pulse > 0) { x.save(); x.globalAlpha = pulse; x.globalCompositeOperation = 'lighter'; x.drawImage(L, o.x, o.y, IW * sc, IH * sc); x.restore(); } }
  }
  return { P, sc };
}

// ---------- the jewel board ----------
const JEWELS = [
  ['SAPPHIRE TIARA', 'Queens Marie-Amélie & Hortense'], ['SAPPHIRE NECKLACE', 'Queens Marie-Amélie & Hortense'],
  ['SAPPHIRE EARRING', 'Queens Marie-Amélie & Hortense'], ['EMERALD NECKLACE', 'Empress Marie-Louise'],
  ['EMERALD EARRINGS', 'Empress Marie-Louise'], ['RELIQUARY BROOCH', ''],
  ['PEARL TIARA', 'Empress Eugénie'], ['BOW BROOCH', 'Empress Eugénie'],
];
let PAPER = null, BOARD = null;
function paper() {
  if (PAPER) return PAPER;
  const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
  const g = x.createRadialGradient(W / 2, H * 0.45, 100, W / 2, H / 2, W * 0.7); g.addColorStop(0, '#EEE7D7'); g.addColorStop(1, '#D9CDB4');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  const r = rng(11); x.globalAlpha = 0.05; for (let i = 0; i < 9000; i++) { x.fillStyle = r() < 0.5 ? '#7a6548' : '#fff'; x.fillRect(r() * W, r() * H, 1 + r() * 2, 1 + r() * 2); }
  return (PAPER = c);
}
function board(t, show) {
  if (!BOARD) { BOARD = document.createElement('canvas'); BOARD.width = W; BOARD.height = H; }
  const x = BOARD.getContext('2d'); x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.drawImage(paper(), 0, 0);
  const cols = [0, 1, 2, 3].map((i) => W / 2 + (i - 1.5) * 410), R = 100, y1 = 372, y2 = 712, busY = 214;
  // top node + bus
  const a0 = eo(k(t, show.start, show.start + 0.35));
  x.strokeStyle = C.red; x.lineWidth = 4;
  if (a0 > 0) {
    x.beginPath(); x.moveTo(W / 2, 150); x.lineTo(W / 2, lerp(150, busY, a0)); x.stroke();
    const bw = (cols[3] - cols[0]) / 2 * eo(k(t, show.start + 0.15, show.start + 0.55));
    x.beginPath(); x.moveTo(W / 2 - bw, busY); x.lineTo(W / 2 + bw, busY); x.stroke();
  }
  labelBox(x, t, show.start, ['8 PIECES TAKEN'], W / 2, 118, { size: 24 });
  const tiles = IMG.jewelTiles;
  for (let i = 0; i < 8; i++) {
    const col = i % 4, row = i < 4 ? 0 : 1, cx = cols[col], cy = row ? y2 : y1, ta = show.at[i];
    const a = eo(k(t, ta, ta + 0.35)); if (a <= 0) continue;
    // connector
    x.strokeStyle = C.red; x.lineWidth = 4; x.beginPath();
    const fromY = row ? y1 + R + 62 : busY, toY = cy - R; x.moveTo(cx, fromY); x.lineTo(cx, lerp(fromY, toY, eo(k(t, ta - 0.05, ta + 0.2)))); x.stroke();
    // badge
    const sc = 0.7 + 0.3 * a; x.save(); x.translate(cx, cy); x.scale(sc, sc); x.globalAlpha = a;
    x.fillStyle = '#1c1714'; x.beginPath(); x.arc(0, 0, R + 7, 0, 7); x.fill();
    x.save(); x.beginPath(); x.arc(0, 0, R, 0, 7); x.clip();
    const [tx, ty, tw, th] = tiles[i], m = 0.06; x.drawImage(IMG['07_jewels'], tx + tw * m, ty + th * m, tw * (1 - 2 * m), th * (1 - 2 * m), -R * 1.08, -R * 1.08, R * 2.16, R * 2.16);
    x.restore(); x.restore();
    redTag(x, a, JEWELS[i][0], JEWELS[i][1], cx, cy + R + 14);
  }
  return BOARD;
}

// ---------- the audit page ----------
function auditPage(x, t, t0, hl) {
  const pw = 1000, ph = 1300, drift = (t - t0) * 14;
  x.save(); x.translate(W / 2, 170 - drift); x.rotate(-0.018);
  x.shadowColor = 'rgba(0,0,0,0.55)'; x.shadowBlur = 40; x.shadowOffsetY = 18; x.fillStyle = '#EFEADF'; x.fillRect(-pw / 2, 0, pw, ph); x.shadowColor = 'transparent';
  x.fillStyle = '#1C1714'; x.font = font(900, 50); x.letterSpacing = '1px'; x.fillText('SECURITY AUDIT', -pw / 2 + 80, 130);
  x.font = '400 32px Playfair'; x.letterSpacing = '0px'; x.fillStyle = '#5b4f44'; x.fillText('Musée du Louvre · information systems · 2014', -pw / 2 + 80, 182);
  x.fillStyle = '#c9bfae'; x.fillRect(-pw / 2 + 80, 222, pw - 160, 2);
  // stamp
  x.save(); x.translate(pw / 2 - 190, 92); x.rotate(0.12); x.strokeStyle = 'rgba(210,56,44,0.85)'; x.lineWidth = 4; x.strokeRect(-120, -34, 240, 64);
  x.fillStyle = 'rgba(210,56,44,0.85)'; x.font = font(900, 30); x.letterSpacing = '4px'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('RESTRICTED', 0, 0); x.restore();
  // body: soft grey text bars, one readable heading
  const r = rng(42); let y = 290;
  for (let line = 0; line < 16; line++) {
    if (line === 6) {
      y += 18; const txt = 'Video surveillance server';
      x.font = font(700, 36); x.letterSpacing = '0px'; const tw = x.measureText(txt).width;
      if (hl > 0) { x.fillStyle = C.yellow; x.fillRect(-pw / 2 + 74, y - 34, (tw + 14) * eo(hl), 48); }
      x.fillStyle = '#1C1714'; x.fillText(txt, -pw / 2 + 80, y); y += 54; continue;
    }
    const lw = (pw - 160) * (line % 5 === 4 ? 0.55 + 0.2 * r() : 0.88 + 0.12 * r());
    x.fillStyle = 'rgba(70,60,50,0.22)'; rr(x, -pw / 2 + 80, y - 16, lw, 16, 8); x.fill(); y += 40;
  }
  x.restore();
}

// ---------- login card ----------
function loginCard(x, t, t0, typeS, typeE) {
  const a = eo(k(t, t0, t0 + 0.3)); if (a <= 0) return;
  const cw = 760, ch = 270, cx = W / 2, cy = H * 0.46;
  x.save(); x.globalAlpha = a; x.translate(cx, cy + (1 - a) * 16);
  x.shadowColor = 'rgba(0,0,0,0.6)'; x.shadowBlur = 50; x.fillStyle = 'rgba(20,17,15,0.93)'; rr(x, -cw / 2, -ch / 2, cw, ch, 8); x.fill(); x.shadowColor = 'transparent';
  x.strokeStyle = 'rgba(230,223,211,0.18)'; x.lineWidth = 1.5; rr(x, -cw / 2, -ch / 2, cw, ch, 8); x.stroke();
  x.fillStyle = 'rgba(230,223,211,0.85)'; x.font = font(700, 20); x.letterSpacing = '4px'; x.fillText('VIDEO SURVEILLANCE SERVER', -cw / 2 + 44, -ch / 2 + 58);
  x.fillStyle = 'rgba(230,223,211,0.5)'; x.font = font(600, 16); x.letterSpacing = '3px'; x.fillText('PASSWORD', -cw / 2 + 44, -ch / 2 + 112);
  const bx = -cw / 2 + 44, by = -ch / 2 + 128, bw = cw - 88, bh = 74;
  x.fillStyle = 'rgba(255,255,255,0.06)'; rr(x, bx, by, bw, bh, 4); x.fill(); x.strokeStyle = 'rgba(230,223,211,0.35)'; rr(x, bx, by, bw, bh, 4); x.stroke();
  const word = 'LOUVRE', n = Math.floor(clamp((t - typeS) / ((typeE - typeS) / word.length), 0, word.length)) * (t >= typeS ? 1 : 0);
  const typed = word.slice(0, n);
  x.font = '400 46px Mono'; x.letterSpacing = '10px'; const tw = x.measureText(typed).width;
  const hl = eo(k(t, typeE + 0.1, typeE + 0.45));
  if (hl > 0) { x.fillStyle = C.yellow; x.globalAlpha = a * 0.95; x.fillRect(bx + 18, by + 12, (tw + 8) * hl, bh - 24); x.globalAlpha = a; }
  x.fillStyle = '#fff'; x.fillText(typed, bx + 24, by + 54);
  if (hl > 0) { x.save(); x.beginPath(); x.rect(bx + 18, by + 12, (tw + 8) * hl, bh - 24); x.clip(); x.fillStyle = '#1C1714'; x.fillText(typed, bx + 24, by + 54); x.restore(); }
  if (n < word.length || t < typeE + 0.1) { if (Math.floor(t * 2.2) % 2 === 0) { x.fillStyle = '#fff'; x.fillRect(bx + 26 + tw, by + 18, 3, bh - 36); } }
  const g = eo(k(t, typeE + 0.35, typeE + 0.6));
  if (g > 0) { x.globalAlpha = a * g; x.fillStyle = C.clay; x.font = font(700, 17); x.letterSpacing = '4px'; x.fillText('✓  ACCESS GRANTED', bx, by + bh + 34); }
  x.restore();
}

export function buildShots() {
  const END = T.dur + 1.9;
  const cut = [0, s(1) - 0.12, s(3) - 0.12, s(4) - 0.12, s(5) - 0.12, s(6) - 0.15, s(7) - 0.12, s(8) - 0.15, s(10) - 0.12, s(11) - 0.12, s(12) - 0.15, s(13) - 0.25, w(14, 'password') - 0.15, s(16) - 0.15, s(17) - 0.15, END];
  const S = [];
  const add = (id, note, draw, extra = {}) => { const i = S.length; S.push({ id, note, start: cut[i], end: cut[i + 1], draw, ...extra }); };

  // S01 — aerial, the target glows, the date
  add('S01', 'aerial Louvre + date', (x, t, p) => {
    const c = cam({ s: 1.12, d: 0.0, px: -0.012, cx: 0.6, cy: 0.46, glow: 0.35 }, { s: 1.27, d: 0.1, px: 0.014, cx: 0.6, cy: 0.46, glow: 0.35 }, p);
    c.glow = 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(t * 3.2));
    still('01_aerial', c);
    const L = project('01_aerial', c, 0.64, 0.30);
    mapLabel(x, eo(k(t, 1.6, 2.1)), 'THE LOUVRE', L.x, L.y - 20, 30);
    dateStamp(x, t, 0.55, 'OCTOBER 19', '2025  ·  9:30 a.m.  |  PARIS');
  });

  // S02 — map: the Louvre fills, opening time, Apollo Gallery pin, truck along the quay
  const tFill = w(1, 'Louvre'), tHalf = w(1, 'half'), tAp = w(2, 'Apollo'), tPark = w(2, 'parks');
  add('S02', 'map: Louvre, 9:30, truck', (x, t) => {
    const z1 = k(t, cut[1], s(2) + 0.2), z2 = k(t, s(2) + 0.2, cut[2]);
    const z = lerp(lerp(1.04, 1.45, eio(z1)), 1.95, eio(z2)), cu = lerp(lerp(0.5, 0.52, eio(z1)), 0.56, eio(z2)), cv = lerp(lerp(0.5, 0.52, eio(z1)), 0.6, eio(z2));
    const { P, sc } = drawMap(x, z, cu, cv, k(t, tFill - 0.05, tFill + 0.6), (t - tFill) / 0.8);
    const sp = P(0.395, 0.672); mapLabel(x, eo(k(t, cut[1] + 0.3, cut[1] + 0.8)) * 0.85, 'SEINE', sp.x, sp.y, 26 * Math.min(1.4, z / 1.2), 'rgba(245,245,240,0.9)');
    const lp = P(0.5, 0.455); mapLabel(x, eo(k(t, tFill + 0.35, tFill + 0.7)), 'LOUVRE', lp.x, lp.y, 34 * Math.min(1.5, z / 1.1));
    const mm = Math.round(30 * eio(k(t, tHalf - 0.1, tHalf + 0.9)));
    timeChip(x, eo(k(t, cut[1] + 0.2, cut[1] + 0.5)), `OCT 19  ·  09:${String(mm).padStart(2, '0')}`, mm < 30 ? 'MUSEUM OPEN' : 'OPEN FOR 30 MIN');
    // truck: rolls along the quay and parks under the gallery, then raises the lift
    const A = [0.40, 0.5935], B = [0.566, 0.6475], tp = eo(k(t, s(2) + 0.05, tPark + 0.35));
    if (t > s(2) - 0.1) {
      const a = P(A[0], A[1]), b = P(B[0], B[1]), ang = Math.atan2(b.y - a.y, b.x - a.x);
      const px = lerp(a.x, b.x, tp), py = lerp(a.y, b.y, tp);
      x.save(); x.globalAlpha = eo(k(t, s(2) - 0.1, s(2) + 0.2)); x.translate(px, py); x.rotate(ang);
      truck(x, 0, 0, 0.95 * sc / 1.37, eo(k(t, tPark + 0.45, tPark + 1.1))); x.restore();
    }
    const ap = P(0.572, 0.612); pin(x, t, tAp - 0.05, ap.x, ap.y);
    labelBox(x, t, tAp + 0.05, ['APOLLO GALLERY'], ap.x, ap.y - 92, { size: 24 });
  }, { xin: 0.3 });

  // S03 — the truck and its furniture lift
  add('S03', 'truck + lift', (x, t, p) => {
    const c = cam({ s: 1.12, px: -0.012, cx: 0.48, cy: 0.5 }, { s: 1.22, d: 0.12, px: 0.012, cx: 0.48, cy: 0.5 }, p);
    still('02_truck', c);
    const lad = project('02_truck', c, 0.515, 0.56), lb = { x: W * 0.74, y: H * 0.34 };
    labelBox(x, t, w(3, 'furniture'), ['FURNITURE LIFT'], lb.x, lb.y, { size: 24, leader: [lad.x - lb.x, lad.y - lb.y] });
  });

  // S04 — riding up (camera rises with the basket)
  add('S04', 'basket rising', (x, t, p) => {
    if (has('03_basket')) {
      const c = cam({ s: 1.16, y: -0.035, py: -0.018, d: 0.0 }, { s: 1.22, y: 0.035, py: 0.018, d: 0.08 }, p);
      still('03_basket', c);
    } else {
      const c = cam({ s: 1.5, cx: 0.4, cy: 0.3, y: 0.05, py: -0.02 }, { s: 1.62, cx: 0.4, cy: 0.3, y: -0.02, py: 0.02 }, p);
      still('02_truck', c);
    }
  });

  // S05 — the disc cutter
  add('S05', 'disc cutter sparks', (x, t, p) => {
    const c = cam({ s: 1.12, cx: 0.45, cy: 0.42 }, { s: 1.2, d: 0.07, cx: 0.45, cy: 0.42 }, p);
    c.bright = 1 + 0.05 * Math.sin(t * 37) * Math.sin(t * 13.3);
    still('04_cutter', c);
    const o = project('04_cutter', c, 0.418, 0.405);
    sparks(x, t, o.x, o.y, 1.35, 2.75, 240, 5, 1.0);
  });

  // S06 — the Apollo Gallery
  add('S06', 'gallery dolly', (x, t, p) => {
    const nm = has('05_gallery') ? '05_gallery' : '12_empty';
    const c = cam({ s: 1.1, f: 0.35 }, { s: 1.26, d: 0.2, f: 0.35 }, p, (v) => v);
    still(nm, c);
    dust(x, t, W * 0.15, H * 0.1, W * 0.7, H * 0.7, 60, 4, 0.45);
    labelBox(x, t, w(6, 'crown') - 0.15, ['THE APOLLO GALLERY', 'FRENCH CROWN JEWELS'], W * 0.5, H * 0.14, { size: 24 });
  });

  // S07 — smash
  const tSmash = w(7, 'smash');
  add('S07', 'smash the case', (x, t, p) => {
    const c = cam({ s: 1.12, px: 0.01, cx: 0.45 }, { s: 1.2, d: 0.1, px: -0.01, cx: 0.45 }, p);
    const sh = Math.max(0, 1 - (t - tSmash) / 0.4) * (t > tSmash ? 1 : 0);
    c.x += Math.sin(t * 91) * 0.006 * sh; c.y += Math.cos(t * 77) * 0.005 * sh; c.bright = 1 + 0.25 * Math.max(0, 1 - (t - tSmash) / 0.12) * (t > tSmash ? 1 : 0);
    still('06_smash', c);
    const o = project('06_smash', c, 0.46, 0.5);
    shards(x, t, tSmash, o.x, o.y);
    labelBox(x, t, w(7, 'two'), ['2 DISPLAY CASES BROKEN'], W * 0.73, H * 0.16, { size: 24 });
  });

  // S08 — the jewel board, then €88,000,000
  // order on the board: sapphire tiara, necklace, earring, emerald necklace / emerald earrings, reliquary, pearl tiara, bow
  const tN = w(8, 'Necklaces'), tE = w(8, 'earrings'), tT = w(8, 'tiaras'), tB = w(8, 'brooches');
  const at = [tT, tN, tE, tN + 0.15, tE + 0.15, tB, tT + 0.15, tB + 0.15];
  add('S08', 'jewel board + €88M', (x, t) => {
    const B = board(t, { start: cut[7], at });
    const v0 = s(9) - 0.05, dim = eo(k(t, v0, v0 + 0.5)), zoom = 1 + 0.03 * k(t, cut[7], cut[8]);
    x.save(); x.translate(W / 2, H / 2); x.scale(zoom, zoom); x.translate(-W / 2, -H / 2);
    x.filter = dim > 0 ? `blur(${(8 * dim).toFixed(1)}px)` : 'none'; x.drawImage(B, 0, 0); x.filter = 'none';
    if (dim > 0) { x.fillStyle = `rgba(233,224,206,${0.72 * dim})`; x.fillRect(0, 0, W, H); }
    x.restore();
    if (dim > 0) {
      const val = Math.round(88e6 * eo(k(t, w(9, 'eighty') - 0.05, we(9, 'euros') + 0.1)) / 1e5) * 1e5;
      const txt = '€' + val.toLocaleString('en-US');
      x.save(); x.globalAlpha = dim; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.font = font(900, 150); x.letterSpacing = '0px'; const tw = x.measureText('€88,000,000').width;
      const hl = eo(k(t, v0 + 0.2, v0 + 0.7)); x.fillStyle = C.yellow; x.fillRect(W / 2 - tw / 2 - 24, H / 2 - 62, (tw + 48) * hl, 138);
      x.fillStyle = C.ink; x.fillText(txt, W / 2, H / 2 + 8);
      x.font = font(700, 26); x.letterSpacing = '8px'; x.fillStyle = '#6b5a48'; x.fillText('ESTIMATED VALUE', W / 2, H / 2 - 120);
      x.restore();
    }
  });

  // S09 — four minutes inside
  add('S09', 'timer 4 minutes', (x, t) => {
    const g = x.createRadialGradient(W / 2, H / 2, 50, W / 2, H / 2, W * 0.6); g.addColorStop(0, '#3a2414'); g.addColorStop(1, '#0e0a08');
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    const pr = eio(k(t, cut[8] + 0.25, w(10, 'four') + 0.35)), secs = Math.round(240 * pr);
    const R = 330, a = eo(k(t, cut[8], cut[8] + 0.3));
    x.save(); x.globalAlpha = a; x.lineCap = 'round';
    x.strokeStyle = 'rgba(230,223,211,0.12)'; x.lineWidth = 6; x.beginPath(); x.arc(W / 2, H / 2, R, 0, 7); x.stroke();
    x.strokeStyle = C.amber; x.lineWidth = 8; x.shadowColor = 'rgba(232,130,60,0.8)'; x.shadowBlur = 24; x.beginPath(); x.arc(W / 2, H / 2, R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pr); x.stroke();
    x.shadowBlur = 0; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillStyle = C.clay; x.font = font(900, 190); x.letterSpacing = '4px'; x.fillText(`${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`, W / 2, H / 2 + 12);
    x.fillStyle = 'rgba(230,223,211,0.7)'; x.font = font(700, 24); x.letterSpacing = '8px'; x.fillText('TIME INSIDE', W / 2, H / 2 - 150);
    x.fillText('MINUTES', W / 2, H / 2 + 160);
    x.restore();
  });

  // S10 — escape on motorbikes
  add('S10', 'escape', (x, t, p) => {
    const c = cam({ s: 1.14, x: -0.02, px: -0.01 }, { s: 1.2, x: 0.025, px: 0.02, d: 0.05 }, p);
    still('08_bikes', c);
    streaks(x, t, 0, H * 0.5, W, H * 0.28, 1, 22, 2, 0.1);
  });

  // S11 — the dropped crown
  add('S11', 'dropped crown', (x, t, p) => {
    const c = cam({ s: 1.1, cx: 0.58, cy: 0.5 }, { s: 1.24, d: 0.1, cx: 0.58, cy: 0.5 }, p);
    still('09_crown', c);
    const G = [[0.535, 0.33, 0.0], [0.585, 0.41, 0.9], [0.47, 0.575, 1.7], [0.64, 0.55, 0.5], [0.71, 0.45, 2.4], [0.56, 0.62, 1.2]];
    for (const [u, v, ph] of G) { const o = project('09_crown', c, u, v), f = Math.pow(Math.max(0, Math.sin(t * 1.7 + ph * 2.1)), 6); glint(x, o.x, o.y, 46, f * 0.9); }
    dateStamp(x, t, w(12, 'crown') - 0.1, 'CROWN OF EMPRESS EUGÉNIE', '1,354 DIAMONDS  ·  56 EMERALDS  ·  FOUND DAMAGED');
  });

  // S12 — the audit
  add('S12', 'audit page', (x, t) => {
    const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#2a1a10'); g.addColorStop(1, '#120c08'); x.fillStyle = g; x.fillRect(0, 0, W, H);
    const z = 1 + 0.06 * eio(k(t, cut[11], cut[12]));
    x.save(); x.translate(W / 2, H * 0.62); x.scale(z, z); x.translate(-W / 2, -H * 0.62);
    auditPage(x, t, cut[11], k(t, w(13, 'audit') + 0.25, w(13, 'audit') + 0.75));
    x.restore();
  }, { xin: 0.25 });

  // S13 — the password
  add('S13', 'login: LOUVRE', (x, t, p) => {
    const c = cam({ s: 1.1, cy: 0.42 }, { s: 1.3, d: 0.12, cy: 0.42 }, p);
    c.bright = 1 - 0.18 * eo(k(t, w(14, 'video') - 0.1, w(14, 'video') + 0.4));
    still('10_security', c);
    loginCard(x, t, w(14, 'video') - 0.1, s(15), e(15));
  });

  // S14 — arrests
  add('S14', 'arrests', (x, t, p) => {
    if (has('11_arrest')) still('11_arrest', cam({ s: 1.12, px: -0.012 }, { s: 1.19, d: 0.07, px: 0.012 }, p));
    dateStamp(x, t, cut[13] + 0.25, 'OCTOBER 25', 'FIRST ARRESTS  |  PARIS');
  });

  // S15 — still missing
  add('S15', 'empty case', (x, t, p) => {
    const c = cam({ s: 1.3, d: 0.14 }, { s: 1.12, d: 0.0 }, Math.min(1, p * 1.2));
    still('12_empty', c);
    const a = project('12_empty', c, 0.36, 0.05), b = project('12_empty', c, 0.74, 0.8);
    dust(x, t, a.x, a.y, b.x - a.x, b.y - a.y, 90, 8, 0.55);
    labelBox(x, t, w(17, 'still'), ['8 PIECES  ·  STILL MISSING'], W / 2, H * 0.86, { size: 24, out: END - 1.5 });
  });

  // sound cues for tools/mix.py
  S.cues = [
    { t: 0, type: 'city', end: cut[1] + 0.3 },
    { t: cut[1] - 0.25, type: 'whoosh', gain: 0.8 },
    { t: tFill, type: 'fill' },
    { t: s(2), type: 'truck', end: tPark + 0.4 },
    { t: tAp, type: 'pin' },
    { t: tPark + 0.45, type: 'lift', end: cut[4] + 0.2 },
    { t: cut[2], type: 'street', end: cut[4] },
    { t: cut[4] + 0.05, type: 'grinder', end: cut[5] + 0.05 },
    { t: cut[5], type: 'room', end: cut[7] },
    { t: tSmash, type: 'smash' },
    ...at.map((tt) => ({ t: tt, type: 'pop', gain: 0.7 })),
    { t: w(9, 'eighty') - 0.05, type: 'count', end: we(9, 'euros') + 0.1 },
    { t: cut[8], type: 'clock', end: cut[9] },
    { t: cut[9], type: 'scooters', end: cut[10] + 0.4 },
    { t: cut[10] + 0.05, type: 'clink' },
    { t: cut[11], type: 'paper' },
    { t: cut[12], type: 'hum', end: cut[13] },
    ...'LOUVRE'.split('').map((_, i) => ({ t: s(15) + i * (e(15) - s(15)) / 6, type: 'key' })),
    { t: e(15) + 0.12, type: 'sting' },
    { t: w(17, 'still'), type: 'end' },
  ];
  return S;
}
