// Every surface texture is painted here in code: wood planks, walnut, wallpaper, rug, portrait, glow sprites.
import * as THREE from 'three';

export function rng(seed) { let s = (seed >>> 0) || 1; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); }

export function noise2(seed = 1) {
  const r = rng(seed), P = new Uint16Array(512), V = new Float32Array(256);
  const p = [...Array(256).keys()];
  for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
  for (let i = 0; i < 512; i++) P[i] = p[i & 255];
  for (let i = 0; i < 256; i++) V[i] = r();
  const n = (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
    const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
    const a = V[P[P[xi & 255] + (yi & 255)]], b = V[P[P[(xi + 1) & 255] + (yi & 255)]];
    const c = V[P[P[xi & 255] + ((yi + 1) & 255)]], d = V[P[P[(xi + 1) & 255] + ((yi + 1) & 255)]];
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
  n.fbm = (x, y, o = 4) => { let s = 0, a = 0.5, f = 1, t = 0; for (let i = 0; i < o; i++) { s += a * n(x * f, y * f); t += a; a *= 0.5; f *= 2.03; } return s / t; };
  return n;
}

const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const mix = (a, b, t) => a + (b - a) * t;
function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

function toTex(c, { srgb = true, repeat = [1, 1], aniso = 8 } = {}) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = aniso; t.needsUpdate = true;
  return t;
}

/** per-pixel painter: fn(u, v) → [r, g, b] (0..255) and optional rough (0..1) */
function paint(w, h, fn, wantRough = false) {
  const c = canvas(w, h), x = c.getContext('2d'), img = x.createImageData(w, h), d = img.data;
  const rc = wantRough ? canvas(w, h) : null, rimg = wantRough ? rc.getContext('2d').createImageData(w, h) : null;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const o = (j * w + i) * 4, res = fn(i / w, j / h, i, j);
    d[o] = res[0]; d[o + 1] = res[1]; d[o + 2] = res[2]; d[o + 3] = 255;
    if (wantRough) { const r = clamp(res[3] ?? 0.5) * 255; rimg.data[o] = rimg.data[o + 1] = rimg.data[o + 2] = r; rimg.data[o + 3] = 255; }
  }
  x.putImageData(img, 0, 0);
  if (wantRough) rc.getContext('2d').putImageData(rimg, 0, 0);
  return { c, rc };
}

/** varnished floor planks; tile = 2 m × 2 m, planks run along v */
export function floorPlanks(seed = 3) {
  const n = noise2(seed), n2 = noise2(seed + 9), R = rng(seed + 4);
  const N = 14, segs = [];
  for (let k = 0; k < N; k++) { const cuts = [R()]; let v = cuts[0]; while (v < 1 + cuts[0]) { v += 0.35 + R() * 0.55; cuts.push(v); } segs.push(cuts.map((c) => [c, R()])); }
  const { c, rc } = paint(1024, 1024, (u, v) => {
    const pu = u * N, k = Math.floor(pu), fu = pu - k;
    const cuts = segs[k]; let seg = 0, tone = cuts[0][1];
    let vv = v; if (vv < cuts[0][0]) vv += 1;
    for (let s = 0; s < cuts.length - 1; s++) if (vv >= cuts[s][0] && vv < cuts[s + 1][0]) { seg = s; tone = cuts[s][1]; break; }
    const seam = Math.min(fu, 1 - fu) < 0.018 ? 1 : 0;
    let joint = 0; for (const [cv] of cuts) { const dv = Math.abs(vv - cv); if (dv < 0.0022) joint = 1; }
    const g = n.fbm(fu * 3 + k * 7.1, v * 26 + seg * 3.3, 4);
    const rings = 0.5 + 0.5 * Math.sin((fu * 9 + g * 7 + k) * Math.PI * 2);
    const fine = n2(u * 900, v * 40);
    let t = 0.55 + 0.25 * (tone - 0.5) + 0.18 * (rings - 0.5) + 0.12 * (fine - 0.5) + 0.2 * (n.fbm(u * 6, v * 3, 3) - 0.5);
    t = clamp(t);
    let r = mix(48, 112, t), gg = mix(24, 62, t), b = mix(14, 36, t);
    if (seam || joint) { r *= 0.35; gg *= 0.35; b *= 0.35; }
    const rough = 0.34 + 0.2 * n.fbm(u * 12, v * 5, 3) + 0.08 * (1 - t) + (seam || joint ? 0.4 : 0);
    return [r, gg, b, rough];
  }, true);
  return { map: toTex(c), rough: toTex(rc, { srgb: false }) };
}

/** walnut grain for panels, treads, rails, door */
export function walnut(seed = 5, { dark = 1, w = 512, h = 512, stretch = 18 } = {}) {
  const n = noise2(seed), n2 = noise2(seed + 2);
  const { c, rc } = paint(w, h, (u, v) => {
    const g = n.fbm(u * 2.2, v * stretch * 0.1, 4);
    const rings = 0.5 + 0.5 * Math.sin((u * 7 + g * 5) * Math.PI * 2);
    const fine = n2(u * 400, v * 25);
    const t = clamp(0.45 + 0.22 * (rings - 0.5) + 0.14 * (fine - 0.5) + 0.25 * (n.fbm(u * 3, v * 2, 3) - 0.5));
    return [mix(40, 104, t) * dark, mix(18, 52, t) * dark, mix(10, 32, t) * dark, 0.38 + 0.15 * (1 - t)];
  }, true);
  return { map: toTex(c), rough: toTex(rc, { srgb: false }) };
}

/** cream damask wallpaper, a little aged; tile ≈ 0.5 m */
export function wallpaper(seed = 7) {
  const S = 512, c = canvas(S, S), x = c.getContext('2d'), n = noise2(seed);
  x.fillStyle = '#cbb894'; x.fillRect(0, 0, S, S);
  // faint vertical stripes
  for (let i = 0; i < S; i += 32) { x.fillStyle = 'rgba(120,96,64,0.06)'; x.fillRect(i, 0, 3, S); }
  // damask motif: mirrored curls around a central stem, twice per tile (half-drop)
  const motif = (cx, cy, s) => {
    x.save(); x.translate(cx, cy); x.scale(s, s);
    for (const m of [1, -1]) {
      x.save(); x.scale(m, 1);
      x.beginPath(); x.moveTo(0, -90); x.bezierCurveTo(40, -80, 55, -40, 30, -20); x.bezierCurveTo(10, -5, 25, 20, 45, 15);
      x.bezierCurveTo(70, 8, 70, 50, 40, 60); x.bezierCurveTo(20, 66, 8, 80, 0, 95);
      x.lineWidth = 5; x.strokeStyle = 'rgba(150,120,80,0.16)'; x.stroke();
      x.beginPath(); x.ellipse(36, -48, 9, 16, 0.5, 0, Math.PI * 2); x.fillStyle = 'rgba(150,120,80,0.13)'; x.fill();
      x.beginPath(); x.ellipse(52, 34, 7, 12, -0.4, 0, Math.PI * 2); x.fill();
      x.restore();
    }
    x.beginPath(); x.ellipse(0, 0, 10, 22, 0, 0, Math.PI * 2); x.fillStyle = 'rgba(150,120,80,0.14)'; x.fill();
    x.restore();
  };
  for (const [cx, cy] of [[128, 128], [384, 384], [384, -128], [128, 640], [384, 896 - 512], [-128, 384], [640, 384]]) motif(cx, cy, 1.05);
  // age: blotches + dark toward the floor is handled by lighting; here just stains
  const img = x.getImageData(0, 0, S, S), d = img.data;
  for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
    const o = (j * S + i) * 4, k = 0.86 + 0.18 * n.fbm(i / 90, j / 90, 4) + 0.05 * (n(i * 0.9, j * 0.9) - 0.5);
    d[o] *= k; d[o + 1] *= k; d[o + 2] *= k * 0.97;
  }
  x.putImageData(img, 0, 0);
  return toTex(c);
}

/** long hall runner: muted oxblood/walnut/cream medallions, worn */
export function rug(seed = 11) {
  const w = 512, h = 1536, c = canvas(w, h), x = c.getContext('2d'), n = noise2(seed);
  x.fillStyle = '#3a1611'; x.fillRect(0, 0, w, h);
  const band = (inset, col, lw) => { x.strokeStyle = col; x.lineWidth = lw; x.strokeRect(inset, inset, w - inset * 2, h - inset * 2); };
  band(18, '#6b4a2e', 22); band(52, '#24100c', 14); band(70, '#8a6a46', 5); band(92, '#5a2a1c', 9);
  for (let k = 0; k < 4; k++) {
    const cy = 230 + k * 360;
    x.save(); x.translate(w / 2, cy);
    for (let r = 5; r > 0; r--) {
      x.beginPath();
      for (let a = 0; a <= 64; a++) { const t = (a / 64) * Math.PI * 2, rr = r * 26 * (1 + 0.18 * Math.cos(t * 8)); x.lineTo(Math.cos(t) * rr * 1.35, Math.sin(t) * rr * 1.1); }
      x.fillStyle = ['#2a120d', '#7a5a3a', '#4a1d14', '#a08060', '#5b2418'][r - 1]; x.fill();
    }
    x.restore();
  }
  for (let y = 120; y < h - 120; y += 28) for (const xx of [120, w - 120]) { x.fillStyle = '#6b4a2e'; x.beginPath(); x.moveTo(xx, y); x.lineTo(xx + 9, y + 12); x.lineTo(xx, y + 24); x.lineTo(xx - 9, y + 12); x.fill(); }
  const img = x.getImageData(0, 0, w, h), d = img.data;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const o = (j * w + i) * 4, wear = n.fbm(i / 60, j / 60, 4), k = 0.75 + 0.35 * wear + 0.12 * (n(i * 1.7, j * 1.7) - 0.5);
    d[o] = d[o] * k; d[o + 1] = d[o + 1] * k; d[o + 2] = d[o + 2] * k;
  }
  x.putImageData(img, 0, 0);
  return toTex(c);
}

/** an old varnished portrait with a blank pale face — unsettling, never readable */
export function portrait(seed = 13, { w = 448, h = 576 } = {}) {
  const c = canvas(w, h), x = c.getContext('2d'), n = noise2(seed);
  let g = x.createRadialGradient(w * 0.5, h * 0.35, 20, w * 0.5, h * 0.45, h * 0.7);
  g.addColorStop(0, '#5a5a3a'); g.addColorStop(0.6, '#2c2a1a'); g.addColorStop(1, '#141209');
  x.fillStyle = g; x.fillRect(0, 0, w, h);
  // landscape hint
  x.fillStyle = 'rgba(90,90,60,0.35)'; x.beginPath(); x.moveTo(0, h * 0.55); x.bezierCurveTo(w * 0.2, h * 0.45, w * 0.35, h * 0.6, w * 0.5, h * 0.52); x.lineTo(w, h * 0.5); x.lineTo(w, h * 0.7); x.lineTo(0, h * 0.7); x.fill();
  // body
  x.fillStyle = '#1a140c'; x.beginPath(); x.moveTo(w * 0.12, h); x.bezierCurveTo(w * 0.15, h * 0.62, w * 0.32, h * 0.56, w * 0.5, h * 0.55); x.bezierCurveTo(w * 0.68, h * 0.56, w * 0.85, h * 0.62, w * 0.88, h); x.fill();
  // hands
  x.fillStyle = '#b39a6e'; x.beginPath(); x.ellipse(w * 0.46, h * 0.86, 46, 22, -0.2, 0, Math.PI * 2); x.fill();
  // hair
  x.fillStyle = '#16100a'; x.beginPath(); x.ellipse(w * 0.5, h * 0.33, 82, 108, 0, 0, Math.PI * 2); x.fill();
  x.fillRect(w * 0.5 - 86, h * 0.33, 172, 150);
  // face: pale, no features
  g = x.createRadialGradient(w * 0.48, h * 0.32, 5, w * 0.5, h * 0.34, 70);
  g.addColorStop(0, '#d9c6a0'); g.addColorStop(1, '#8a7650');
  x.fillStyle = g; x.beginPath(); x.ellipse(w * 0.5, h * 0.35, 52, 70, 0, 0, Math.PI * 2); x.fill();
  x.fillStyle = '#a89068'; x.fillRect(w * 0.5 - 18, h * 0.46, 36, 40);
  // varnish + craquelure
  const img = x.getImageData(0, 0, w, h), d = img.data;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const o = (j * w + i) * 4, cr = Math.abs(n(i / 7, j / 7) - 0.5) < 0.012 ? 0.7 : 1, k = (0.85 + 0.2 * n.fbm(i / 50, j / 50, 3)) * cr;
    d[o] *= k * 1.02; d[o + 1] *= k * 0.95; d[o + 2] *= k * 0.72;
  }
  x.putImageData(img, 0, 0);
  return toTex(c, { aniso: 4 });
}

/** a little framed family photo (blurred, warm) */
export function photo(seed = 17) {
  const w = 256, h = 192, c = canvas(w, h), x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#6d6a58'); g.addColorStop(1, '#3a3022'); x.fillStyle = g; x.fillRect(0, 0, w, h);
  x.filter = 'blur(3px)';
  for (const [cx, s] of [[70, 1], [128, 1.15], [186, 0.8]]) {
    x.fillStyle = '#2a2018'; x.beginPath(); x.ellipse(cx, 150, 34 * s, 60 * s, 0, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#b49a74'; x.beginPath(); x.ellipse(cx, 150 - 70 * s, 16 * s, 20 * s, 0, 0, Math.PI * 2); x.fill();
  }
  x.filter = 'none';
  return toTex(c, { aniso: 2 });
}

/** soft radial sprite (white → transparent) */
export function glow(size = 256, power = 2) {
  const c = canvas(size, size), x = c.getContext('2d'), img = x.createImageData(size, size), d = img.data;
  for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
    const dx = (i + 0.5) / size * 2 - 1, dy = (j + 0.5) / size * 2 - 1, r = Math.sqrt(dx * dx + dy * dy);
    const a = Math.pow(clamp(1 - r), power), o = (j * size + i) * 4;
    d[o] = d[o + 1] = d[o + 2] = 255; d[o + 3] = a * 255;
  }
  x.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
