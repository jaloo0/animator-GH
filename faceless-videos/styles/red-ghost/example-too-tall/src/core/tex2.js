// More surfaces painted in code for the video store + the institution sets: VCT floor tiles, drop ceiling,
// painted walls, VHS box covers, the store sign, asphalt, cinder block, polished concrete, safe plates.
import * as THREE from 'three';
import { rng, noise2 } from './tex.js';

const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
export function toTex(c, { srgb = true, repeat = [1, 1], aniso = 8 } = {}) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = aniso; t.needsUpdate = true;
  return t;
}
/** multiply a canvas by fbm grime (k0..k1) */
function grime(c, seed, k0 = 0.85, k1 = 1.08, sc = 80) {
  const x = c.getContext('2d'), img = x.getImageData(0, 0, c.width, c.height), d = img.data, n = noise2(seed);
  for (let j = 0; j < c.height; j++) for (let i = 0; i < c.width; i++) {
    const o = (j * c.width + i) * 4, k = k0 + (k1 - k0) * n.fbm(i / sc, j / sc, 4) + 0.04 * (n(i * 1.3, j * 1.3) - 0.5);
    d[o] *= k; d[o + 1] *= k; d[o + 2] *= k;
  }
  x.putImageData(img, 0, 0);
}
function roughFrom(c, base = 0.4, var_ = 0.25, seed = 1) {
  const r = canvas(c.width, c.height), x = r.getContext('2d'), img = x.createImageData(c.width, c.height), d = img.data, n = noise2(seed);
  for (let j = 0; j < c.height; j++) for (let i = 0; i < c.width; i++) {
    const o = (j * c.width + i) * 4, v = clamp(base + var_ * (n.fbm(i / 40, j / 40, 3) - 0.5)) * 255;
    d[o] = d[o + 1] = d[o + 2] = v; d[o + 3] = 255;
  }
  x.putImageData(img, 0, 0); return r;
}

/** 30 cm vinyl composition tiles, waxed; one texture = 8 × 8 tiles (2.4 m) */
export function vct(seed = 4, { a = '#8f8676', b = '#5f574b', speck = true } = {}) {
  const S = 1024, c = canvas(S, S), x = c.getContext('2d'), R = rng(seed), T = S / 8;
  for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) {
    x.fillStyle = (i + j) % 2 ? a : b; x.fillRect(i * T, j * T, T, T);
    if (speck) for (let k = 0; k < 90; k++) { x.fillStyle = `rgba(${R() < 0.5 ? '30,26,20' : '220,210,190'},${0.08 + R() * 0.12})`; x.fillRect(i * T + R() * T, j * T + R() * T, 2 + R() * 5, 1 + R() * 3); }
  }
  x.strokeStyle = 'rgba(20,16,12,0.55)'; x.lineWidth = 2;
  for (let k = 0; k <= 8; k++) { x.beginPath(); x.moveTo(k * T, 0); x.lineTo(k * T, S); x.stroke(); x.beginPath(); x.moveTo(0, k * T); x.lineTo(S, k * T); x.stroke(); }
  grime(c, seed + 3, 0.8, 1.06, 120);
  const r = roughFrom(c, 0.28, 0.3, seed + 5);
  return { map: toTex(c), rough: toTex(r, { srgb: false }) };
}

/** 60 cm drop-ceiling tiles with a T-bar grid; one texture = 4 × 4 tiles */
export function ceilingTiles(seed = 9) {
  const S = 512, c = canvas(S, S), x = c.getContext('2d'), R = rng(seed), T = S / 4;
  x.fillStyle = '#b5ad9c'; x.fillRect(0, 0, S, S);
  for (let k = 0; k < 5000; k++) { x.fillStyle = `rgba(60,52,40,${0.05 + R() * 0.12})`; x.fillRect(R() * S, R() * S, 1 + R() * 2, 1 + R() * 2); }
  x.fillStyle = '#d8d2c4'; for (let k = 0; k <= 4; k++) { x.fillRect(k * T - 3, 0, 6, S); x.fillRect(0, k * T - 3, S, 6); }
  grime(c, seed, 0.82, 1.05, 60);
  return toTex(c);
}

/** painted drywall: flat colour, faint roller texture, scuffs low down */
export function paintWall(seed = 2, base = '#8c8070', { w = 512, h = 512, scuff = true } = {}) {
  const c = canvas(w, h), x = c.getContext('2d'), R = rng(seed);
  x.fillStyle = base; x.fillRect(0, 0, w, h);
  if (scuff) for (let k = 0; k < 40; k++) { x.fillStyle = `rgba(30,24,18,${0.04 + R() * 0.06})`; x.fillRect(R() * w, h * (0.85 + R() * 0.15), 10 + R() * 60, 2 + R() * 4); }
  grime(c, seed, 0.88, 1.06, 50);
  return toTex(c);
}

/** VHS rental box covers: an atlas of 8 × 4 covers (no red — ember red belongs to the figures) */
export function vhsAtlas(seed = 21) {
  const CW = 128, CH = 224, c = canvas(CW * 8, CH * 4), x = c.getContext('2d'), R = rng(seed);
  const pal = ['#1d2a44', '#2a3a2a', '#3d3a24', '#1b1b1f', '#5a5446', '#2c2238', '#203a3c', '#6b5a32', '#3a3f46', '#c9bc98', '#24302a', '#4a4030'];
  for (let j = 0; j < 4; j++) for (let i = 0; i < 8; i++) {
    const X = i * CW, Y = j * CH, bg = pal[Math.floor(R() * pal.length)];
    x.fillStyle = bg; x.fillRect(X, Y, CW, CH);
    const g = x.createLinearGradient(0, Y, 0, Y + CH); g.addColorStop(0, 'rgba(255,240,210,0.10)'); g.addColorStop(1, 'rgba(0,0,0,0.35)'); x.fillStyle = g; x.fillRect(X, Y, CW, CH);
    // art: a blurred silhouette / horizon / big circle
    x.save(); x.beginPath(); x.rect(X + 6, Y + 40, CW - 12, CH - 80); x.clip(); x.filter = 'blur(2px)';
    const kind = Math.floor(R() * 3);
    if (kind === 0) { x.fillStyle = `rgba(230,215,180,${0.25 + R() * 0.3})`; x.beginPath(); x.arc(X + CW * (0.3 + R() * 0.4), Y + CH * (0.35 + R() * 0.2), 18 + R() * 30, 0, 7); x.fill(); }
    if (kind === 1) { x.fillStyle = 'rgba(0,0,0,0.45)'; x.beginPath(); x.ellipse(X + CW / 2, Y + CH * 0.62, 26, 50, 0, 0, 7); x.fill(); x.beginPath(); x.arc(X + CW / 2, Y + CH * 0.36, 16, 0, 7); x.fill(); }
    if (kind === 2) { x.fillStyle = `rgba(200,190,160,${0.2 + R() * 0.2})`; x.fillRect(X, Y + CH * (0.5 + R() * 0.2), CW, 4 + R() * 30); }
    x.restore(); x.filter = 'none';
    // title band + spine stripe
    x.fillStyle = `rgba(235,225,200,${0.55 + R() * 0.3})`; x.fillRect(X + 10, Y + 12, CW - 20, 8 + R() * 10);
    x.fillRect(X + 10, Y + CH - 30, (CW - 20) * (0.4 + R() * 0.5), 6);
    x.fillStyle = 'rgba(0,0,0,0.5)'; x.fillRect(X, Y, 3, CH); x.fillRect(X + CW - 3, Y, 3, CH);
  }
  grime(c, seed, 0.85, 1.05, 30);
  return toTex(c, { aniso: 4 });
}

/** big lettering on a board, e.g. aisle headers ("NEW RELEASES"); cream type on dark */
export function boardText(text, { w = 1024, h = 128, bg = '#1c1812', fg = '#d9ccad', font = '700 84px "Barlow Condensed"', track = 6 } = {}) {
  const c = canvas(w, h), x = c.getContext('2d');
  x.fillStyle = bg; x.fillRect(0, 0, w, h);
  x.font = font; x.textAlign = 'center'; x.textBaseline = 'middle'; if ('letterSpacing' in x) x.letterSpacing = `${track}px`;
  x.fillStyle = fg; x.fillText(text, w / 2, h / 2 + 4);
  grime(c, 7, 0.85, 1.05, 40);
  return toTex(c, { aniso: 4 });
}

/** the store sign: a ticket-shaped lightbox. Returns { map, emissive } (emissive lights only the letters + rim) */
export function signTex() {
  const w = 1024, h = 400, c = canvas(w, h), e = canvas(w, h), x = c.getContext('2d'), y = e.getContext('2d');
  const ticket = (g) => {
    g.beginPath(); const r = 46, nx = 70;
    g.moveTo(nx, 20); g.lineTo(w - nx, 20); g.arc(w - nx + 0, h / 2, 54, -Math.PI / 2, Math.PI / 2, true);
    g.lineTo(w - nx, h - 20); g.lineTo(nx, h - 20); g.arc(nx, h / 2, 54, Math.PI / 2, -Math.PI / 2, true); g.closePath();
  };
  x.fillStyle = '#000'; x.fillRect(0, 0, w, h); ticket(x); x.fillStyle = '#141b2c'; x.fill();
  x.lineWidth = 10; x.strokeStyle = '#a89a78'; x.stroke();
  y.fillStyle = '#000'; y.fillRect(0, 0, w, h); ticket(y); y.lineWidth = 10; y.strokeStyle = '#7a6a4c'; y.stroke();
  for (const g of [x, y]) {
    g.font = '700 210px "Barlow Condensed"'; g.textAlign = 'center'; g.textBaseline = 'middle'; if ('letterSpacing' in g) g.letterSpacing = '26px';
    g.fillStyle = g === x ? '#efe2c0' : '#ffffff'; g.fillText('VIDEO', w / 2 + 12, h / 2 + 8);
  }
  return { map: toTex(c, { aniso: 4 }), emissive: toTex(e, { aniso: 4 }) };
}

/** night asphalt, a little wet-looking */
export function asphalt(seed = 31) {
  const S = 512, c = canvas(S, S), x = c.getContext('2d'), R = rng(seed);
  x.fillStyle = '#26241f'; x.fillRect(0, 0, S, S);
  for (let k = 0; k < 16000; k++) { const v = 20 + R() * 60; x.fillStyle = `rgba(${v},${v * 0.96},${v * 0.9},${0.25 + R() * 0.4})`; x.fillRect(R() * S, R() * S, 1 + R() * 2, 1 + R() * 2); }
  grime(c, seed, 0.7, 1.1, 90);
  const r = roughFrom(c, 0.62, 0.4, seed);
  return { map: toTex(c), rough: toTex(r, { srgb: false }) };
}

/** brick for the storefront piers / side walls */
export function brick(seed = 41) {
  const S = 512, c = canvas(S, S), x = c.getContext('2d'), R = rng(seed), bh = 32, bw = 96;
  x.fillStyle = '#2a221c'; x.fillRect(0, 0, S, S);
  for (let r = 0; r < S / bh; r++) for (let k = -1; k < S / bw + 1; k++) {
    const ox = (r % 2) * bw / 2, v = 0.75 + R() * 0.35;
    x.fillStyle = `rgb(${86 * v},${66 * v},${52 * v})`; x.fillRect(k * bw + ox + 3, r * bh + 3, bw - 6, bh - 6);
  }
  grime(c, seed, 0.75, 1.08, 70);
  return toTex(c);
}

/** painted cinder block (institution walls); tile = 4 × 8 blocks of 40 × 20 cm */
export function cinder(seed = 51, base = [150, 146, 132]) {
  const S = 512, c = canvas(S, S), x = c.getContext('2d'), R = rng(seed), bh = S / 8, bw = S / 4;
  x.fillStyle = `rgb(${base.map((v) => v * 0.72).join(',')})`; x.fillRect(0, 0, S, S);
  for (let r = 0; r < 8; r++) for (let k = -1; k < 5; k++) {
    const ox = (r % 2) * bw / 2, v = 0.93 + R() * 0.1;
    x.fillStyle = `rgb(${base.map((q) => q * v).join(',')})`; x.fillRect(k * bw + ox + 4, r * bh + 4, bw - 8, bh - 8);
  }
  const img = x.getImageData(0, 0, S, S), d = img.data, n = noise2(seed);
  for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) { const o = (j * S + i) * 4, k = 0.9 + 0.14 * n.fbm(i / 18, j / 18, 3); d[o] *= k; d[o + 1] *= k; d[o + 2] *= k; }
  x.putImageData(img, 0, 0);
  grime(c, seed + 1, 0.86, 1.04, 110);
  return toTex(c);
}

/** sealed, polished concrete (corridor floor — glossy so the figure reflects) */
export function concrete(seed = 61) {
  const S = 1024, c = canvas(S, S), x = c.getContext('2d');
  x.fillStyle = '#6a655b'; x.fillRect(0, 0, S, S);
  grime(c, seed, 0.65, 1.15, 160); grime(c, seed + 2, 0.9, 1.05, 20);
  x.strokeStyle = 'rgba(20,18,14,0.5)'; x.lineWidth = 2; x.beginPath(); x.moveTo(0, S / 2); x.lineTo(S, S / 2); x.stroke();
  const r = roughFrom(c, 0.22, 0.3, seed);
  return { map: toTex(c), rough: toTex(r, { srgb: false }) };
}

/** the safe's keypad (12 keys) */
export function keypadTex() {
  const w = 256, h = 320, c = canvas(w, h), x = c.getContext('2d');
  x.fillStyle = '#16171a'; x.fillRect(0, 0, w, h);
  x.fillStyle = '#2b2d30'; x.fillRect(24, 20, w - 48, 52); x.fillStyle = '#3c4a3a'; x.fillRect(34, 30, w - 68, 32);
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];
  x.font = '700 34px "Barlow Condensed"'; x.textAlign = 'center'; x.textBaseline = 'middle';
  keys.forEach((k, i) => { const cx = 58 + (i % 3) * 70, cy = 112 + Math.floor(i / 3) * 56; x.fillStyle = '#4a4c50'; x.fillRect(cx - 26, cy - 20, 52, 40); x.fillStyle = '#d0c8b4'; x.fillText(k, cx, cy + 2); });
  return toTex(c, { aniso: 4 });
}

/** brass time-lock plate: TIME LOCK + a small clock dial (hand angle drawn separately as a mesh) */
export function timelockTex() {
  const w = 512, h = 512, c = canvas(w, h), x = c.getContext('2d');
  x.fillStyle = '#5c4a2c'; x.fillRect(0, 0, w, h);
  const g = x.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#8a7448'); g.addColorStop(1, '#4a3a22'); x.fillStyle = g; x.fillRect(10, 10, w - 20, h - 20);
  x.font = '700 64px "Barlow Condensed"'; x.textAlign = 'center'; x.textBaseline = 'middle'; if ('letterSpacing' in x) x.letterSpacing = '8px';
  x.fillStyle = '#1e160c'; x.fillText('TIME LOCK', w / 2, 70);
  x.beginPath(); x.arc(w / 2, 290, 170, 0, 7); x.fillStyle = '#d8ccb0'; x.fill(); x.lineWidth = 8; x.strokeStyle = '#2a2014'; x.stroke();
  x.fillStyle = '#2a2014'; x.font = '600 40px "Barlow Condensed"'; if ('letterSpacing' in x) x.letterSpacing = '0px';
  for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2 - Math.PI / 2; x.fillText(String(k === 0 ? 12 : k), w / 2 + Math.cos(a) * 130, 290 + Math.sin(a) * 130); }
  for (let k = 0; k < 60; k++) { const a = k / 60 * Math.PI * 2; x.fillRect(w / 2 + Math.cos(a) * 158 - 1.5, 290 + Math.sin(a) * 158 - 1.5, 3, 3); }
  grime(c, 3, 0.8, 1.05, 40);
  return toTex(c, { aniso: 4 });
}

/** cork board with pinned papers (office wall) */
export function corkboard(seed = 71) {
  const w = 512, h = 384, c = canvas(w, h), x = c.getContext('2d'), R = rng(seed);
  x.fillStyle = '#6b5436'; x.fillRect(0, 0, w, h);
  for (let k = 0; k < 9000; k++) { x.fillStyle = `rgba(${R() < 0.5 ? '40,28,16' : '150,120,80'},0.3)`; x.fillRect(R() * w, R() * h, 2, 2); }
  for (let k = 0; k < 9; k++) {
    x.save(); x.translate(40 + R() * (w - 80), 40 + R() * (h - 80)); x.rotate((R() - 0.5) * 0.25);
    x.fillStyle = R() < 0.7 ? '#d8d0bc' : '#c9b27a'; x.fillRect(-45, -60, 90 + R() * 30, 110 + R() * 20);
    x.fillStyle = 'rgba(40,36,30,0.5)'; for (let l = 0; l < 7; l++) x.fillRect(-35, -45 + l * 13, 60 + R() * 30, 3);
    x.restore();
  }
  x.lineWidth = 14; x.strokeStyle = '#4a3a24'; x.strokeRect(0, 0, w, h);
  return toTex(c, { aniso: 4 });
}

/** a dim grey CCTV picture for the office monitor (static, nothing readable) */
export function monitorTex(seed = 81) {
  const w = 256, h = 192, c = canvas(w, h), x = c.getContext('2d'), R = rng(seed);
  x.fillStyle = '#4a4e4c'; x.fillRect(0, 0, w, h);
  x.fillStyle = '#2a2e2c'; x.fillRect(0, h * 0.55, w, h * 0.45);
  x.fillStyle = '#6a6e6a'; x.fillRect(w * 0.55, h * 0.15, w * 0.25, h * 0.45);
  for (let k = 0; k < 6; k++) { x.fillStyle = '#383c3a'; x.fillRect(w * 0.05 + k * 22, h * 0.3, 14, h * 0.3); }
  for (let j = 0; j < h; j += 2) { x.fillStyle = 'rgba(0,0,0,0.18)'; x.fillRect(0, j, w, 1); }
  for (let k = 0; k < 900; k++) { x.fillStyle = `rgba(255,255,255,${R() * 0.08})`; x.fillRect(R() * w, R() * h, 1, 1); }
  return toTex(c, { aniso: 2 });
}
