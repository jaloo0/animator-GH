// Every surface is painted here in code: timber, burlap, dirt, gravel, concrete, rock, primed steel, canvas,
// paper, plus printed type (slab stencil, letterpress, pencil) — each as colour + roughness + normal maps.
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
  // tileable fbm over period (px, py) in noise units
  n.tfbm = (x, y, px, py, o = 4) => {
    let s = 0, a = 0.5, f = 1, t = 0;
    for (let i = 0; i < o; i++) {
      const X = x * f, Y = y * f, PX = px * f, PY = py * f;
      const fx = X / PX - Math.floor(X / PX), fy = Y / PY - Math.floor(Y / PY);
      const xx = fx * PX, yy = fy * PY;
      const v = n(xx, yy) * (1 - fx) * (1 - fy) + n(xx - PX, yy) * fx * (1 - fy) + n(xx, yy - PY) * (1 - fx) * fy + n(xx - PX, yy - PY) * fx * fy;
      s += a * v; t += a; a *= 0.5; f *= 2;
    }
    return s / t;
  };
  return n;
}
export const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const mix = (a, b, t) => a + (b - a) * t;
export const sstep = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0)); return t * t * (3 - 2 * t); };
export function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
export function toTex(c, { srgb = true, repeat = [1, 1], aniso = 8, wrap = true } = {}) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  if (wrap) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  t.repeat.set(repeat[0], repeat[1]); t.anisotropy = aniso; t.needsUpdate = true;
  return t;
}
const hex = (h) => { const c = new THREE.Color(h); return [c.r * 255, c.g * 255, c.b * 255]; }; // sRGB 0..255
export const rgb = hex;

/** per-pixel painter: fn(u, v) → [r, g, b, rough, height] → { map, rough, normal } */
export function paintPBR(w, h, fn, { normalScale = 1, repeat = [1, 1] } = {}) {
  const c = canvas(w, h), x = c.getContext('2d'), img = x.createImageData(w, h), d = img.data;
  const rc = canvas(w, h), rimg = rc.getContext('2d').createImageData(w, h);
  const H = new Float32Array(w * h);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const o = j * w + i, res = fn(i / w, j / h, i, j);
    d[o * 4] = res[0]; d[o * 4 + 1] = res[1]; d[o * 4 + 2] = res[2]; d[o * 4 + 3] = 255;
    const r = clamp(res[3] ?? 0.8) * 255; rimg.data[o * 4] = rimg.data[o * 4 + 1] = rimg.data[o * 4 + 2] = r; rimg.data[o * 4 + 3] = 255;
    H[o] = res[4] ?? 0;
  }
  x.putImageData(img, 0, 0); rc.getContext('2d').putImageData(rimg, 0, 0);
  const nc = canvas(w, h), nimg = nc.getContext('2d').createImageData(w, h);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const hl = H[j * w + ((i - 1 + w) % w)], hr = H[j * w + ((i + 1) % w)], hu = H[((j - 1 + h) % h) * w + i], hd = H[((j + 1) % h) * w + i];
    let nx = (hl - hr) * normalScale, ny = (hd - hu) * normalScale, nz = 1; const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
    const o = (j * w + i) * 4; nimg.data[o] = (nx * 0.5 + 0.5) * 255; nimg.data[o + 1] = (ny * 0.5 + 0.5) * 255; nimg.data[o + 2] = (nz * 0.5 + 0.5) * 255; nimg.data[o + 3] = 255;
  }
  nc.getContext('2d').putImageData(nimg, 0, 0);
  return { map: toTex(c, { repeat }), roughnessMap: toTex(rc, { srgb: false, repeat }), normalMap: toTex(nc, { srgb: false, repeat }), canvas: c };
}

// ---------- surfaces ----------
/** weathered vertical-ish planks, grain along v; boards across u */
export function timber(seed = 3, { boards = 6, base = 0x8b5b3b, w = 512, h = 512, grey = 0.25 } = {}) {
  const n = noise2(seed), n2 = noise2(seed + 7), R = rng(seed + 1), b0 = hex(base);
  const tones = [...Array(boards)].map(() => 0.8 + 0.4 * R()), offs = [...Array(boards)].map(() => R() * 50);
  return paintPBR(w, h, (u, v) => {
    const pu = u * boards, k = Math.floor(pu), fu = pu - k;
    const g = n.fbm(fu * 2 + offs[k], v * 6, 4);
    const ring = 0.5 + 0.5 * Math.sin((fu * 5 + g * 6 + offs[k]) * 6.283);
    const fine = n2(u * 300, v * 22);
    const edge = Math.min(fu, 1 - fu);
    const gap = sstep(0.0, 0.03, edge);
    const knot = sstep(0.8, 0.95, n2(u * 9 + offs[k], v * 4));
    let t = tones[k] * (0.82 + 0.16 * ring + 0.1 * (fine - 0.5)) * (1 - 0.35 * knot);
    const weather = n.fbm(u * 3, v * 3, 3);
    t *= 0.85 + 0.25 * weather;
    const gr = clamp(grey * (0.5 + weather));
    let r = b0[0] * t, gg = b0[1] * t, bb = b0[2] * t;
    const L = (r + gg + bb) / 3; r = mix(r, L * 1.05, gr); gg = mix(gg, L, gr); bb = mix(bb, L * 0.92, gr);
    r *= gap * 0.75 + 0.25; gg *= gap * 0.75 + 0.25; bb *= gap * 0.75 + 0.25;
    const hgt = gap * 2 + ring * 0.6 + fine * 0.8 - knot;
    return [r, gg, bb, 0.78 + 0.18 * (1 - ring) * 0.5, hgt];
  }, { normalScale: 3 });
}
export function burlap(seed = 5, { base = 0xa58d66, w = 512, h = 512 } = {}) {
  const n = noise2(seed), b0 = hex(base);
  return paintPBR(w, h, (u, v) => {
    const wx = Math.sin(u * 6.283 * 64), wy = Math.sin(v * 6.283 * 64);
    const over = (Math.floor(u * 128) + Math.floor(v * 128)) % 2 ? wx * 0.5 + 0.5 : wy * 0.5 + 0.5;
    const thread = 0.5 + 0.5 * Math.abs(wx) * Math.abs(wy);
    const dirt = n.tfbm(u * 6, v * 6, 6, 6, 4);
    const t = (0.78 + 0.2 * over + 0.12 * (n(u * 400, v * 400) - 0.5)) * (0.75 + 0.45 * dirt);
    return [b0[0] * t, b0[1] * t, b0[2] * t, 0.95, over * 1.2 + thread * 0.5];
  }, { normalScale: 2.5 });
}
export function dirt(seed = 9, { base = 0x8a6a4a, w = 1024, h = 1024, pebbles = 0.5, wet = 0 } = {}) {
  const n = noise2(seed), n2 = noise2(seed + 3), b0 = hex(base);
  return paintPBR(w, h, (u, v) => {
    const f = n.tfbm(u * 8, v * 8, 8, 8, 5), g = n2.tfbm(u * 40, v * 40, 40, 40, 3);
    const peb = sstep(0.68 - pebbles * 0.1, 0.78, n2.tfbm(u * 60 + 3, v * 60, 60, 60, 2));
    let t = 0.72 + 0.4 * f + 0.15 * (g - 0.5);
    let r = b0[0] * t, gg = b0[1] * t, bb = b0[2] * t;
    if (peb > 0) { const pt = 0.9 + 0.3 * n(u * 300, v * 300); r = mix(r, r * 1.25 * pt, peb * 0.6); gg = mix(gg, gg * 1.25 * pt, peb * 0.6); bb = mix(bb, bb * 1.3 * pt, peb * 0.6); }
    return [r, gg, bb, clamp(0.95 - wet * 0.4 - peb * 0.1), f * 1.5 + g * 0.6 + peb * 1.2];
  }, { normalScale: 2.5 });
}
export function concrete(seed = 11, { base = 0xb9b3a6, w = 512, h = 512 } = {}) {
  const n = noise2(seed), n2 = noise2(seed + 5), b0 = hex(base);
  return paintPBR(w, h, (u, v) => {
    const f = n.tfbm(u * 6, v * 6, 6, 6, 5), pores = sstep(0.72, 0.8, n2.tfbm(u * 90, v * 90, 90, 90, 2));
    const stain = sstep(0.55, 0.8, n.tfbm(u * 3 + 9, v * 3, 3, 3, 3)) * sstep(0.2, 1.0, v);
    const t = (0.86 + 0.18 * f) * (1 - 0.35 * pores) * (1 - 0.22 * stain);
    return [b0[0] * t, b0[1] * t * 0.99, b0[2] * t * 0.97, 0.9, f - pores * 0.8];
  }, { normalScale: 1.5 });
}
export function rock(seed = 13, { base = 0x8e7a62, w = 1024, h = 1024 } = {}) {
  const n = noise2(seed), n2 = noise2(seed + 4), b0 = hex(base);
  return paintPBR(w, h, (u, v) => {
    const f = n.tfbm(u * 5, v * 5, 5, 5, 6), cr = Math.abs(n2.tfbm(u * 12, v * 12, 12, 12, 3) - 0.5);
    const crack = 1 - sstep(0.0, 0.02, cr);
    const strata = 0.5 + 0.5 * Math.sin(v * 50 + f * 8);
    const t = (0.72 + 0.4 * f + 0.05 * strata) * (1 - 0.22 * crack);
    return [b0[0] * t, b0[1] * t, b0[2] * t, 0.92, f * 2 + strata * 0.2 - crack * 0.25];
  }, { normalScale: 3 });
}
/** red-lead primed steel, desaturated toward trench timber; plates + rivet dimples via height */
export function steel(seed = 17, { base = 0x8a4e36, w = 512, h = 512, rivets = 8 } = {}) {
  const n = noise2(seed), n2 = noise2(seed + 2), b0 = hex(base);
  return paintPBR(w, h, (u, v) => {
    const f = n.tfbm(u * 5, v * 5, 5, 5, 5), spec = n2.tfbm(u * 70, v * 70, 70, 70, 2);
    const ru = (u * rivets) % 1, rv = (v * 2) % 1;
    const rd = Math.hypot(ru - 0.5, (rv - 0.08) * rivets / 2) * 2, rd2 = Math.hypot(ru - 0.5, (rv - 0.92) * rivets / 2) * 2;
    const riv = Math.max(1 - sstep(0.18, 0.26, rd), 1 - sstep(0.18, 0.26, rd2));
    const seam = 1 - sstep(0.0, 0.006, Math.min(rv, 1 - rv));
    const t = (0.82 + 0.25 * f) * (1 - 0.1 * spec) * (1 - 0.4 * seam);
    return [b0[0] * t, b0[1] * t, b0[2] * t, 0.62 + 0.25 * spec, riv * 2.5 + f * 0.6 - seam * 1.2];
  }, { normalScale: 2.5 });
}
export function canvasCloth(seed = 19, { base = 0xc9b48c, w = 512, h = 512 } = {}) {
  const n = noise2(seed), b0 = hex(base);
  return paintPBR(w, h, (u, v) => {
    const wx = Math.sin(u * 6.283 * 96), wy = Math.sin(v * 6.283 * 96);
    const over = (Math.floor(u * 192) + Math.floor(v * 192)) % 2 ? wx * 0.5 + 0.5 : wy * 0.5 + 0.5;
    const f = n.tfbm(u * 5, v * 5, 5, 5, 4);
    const t = (0.86 + 0.1 * over) * (0.85 + 0.25 * f);
    return [b0[0] * t, b0[1] * t, b0[2] * t, 0.9, over];
  }, { normalScale: 1.5 });
}
export function paper(seed = 23, { base = 0xe5dfd0, w = 1024, h = 1024 } = {}) {
  const n = noise2(seed), b0 = hex(base);
  const P = paintPBR(w, h, (u, v) => {
    const f = n.fbm(u * 6, v * 6, 4), fib = n(u * 500, v * 120);
    const age = sstep(0.3, 0.0, Math.min(u, v, 1 - u, 1 - v)) * 0.12;
    const t = (0.93 + 0.08 * f + 0.03 * (fib - 0.5)) * (1 - age);
    return [b0[0] * t, b0[1] * t * 0.995, b0[2] * t * 0.97, 0.88, fib * 0.3];
  }, { normalScale: 1 });
  return P;
}

// ---------- printed type ----------
/** ink-print text onto an existing canvas with worn edges. style: 'slab' | 'stencil' | 'pencil' | 'stamp' */
export function printText(c, lines, { font = 'Rockwell', weight = 'bold', size = 120, x = 0.5, y = 0.5, align = 'center', color = '#4b4845', alpha = 0.92, rot = 0, track = 0, style = 'slab', seed = 1, lh = 1.05, wear = 0.35 } = {}) {
  const ctx = c.getContext('2d'), W = c.width, H = c.height;
  const tmp = canvas(W, H), t = tmp.getContext('2d');
  t.translate(x * W, y * H); t.rotate(rot);
  t.fillStyle = color; t.textAlign = align; t.textBaseline = 'middle';
  t.font = `${weight} ${size}px ${font}`;
  if ('letterSpacing' in t) t.letterSpacing = `${track}px`;
  lines.forEach((ln, i) => t.fillText(ln, 0, (i - (lines.length - 1) / 2) * size * lh));
  t.setTransform(1, 0, 0, 1, 0, 0);
  // wear / ink texture
  const n = noise2(seed), img = t.getImageData(0, 0, W, H), d = img.data;
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const o = (j * W + i) * 4; if (!d[o + 3]) continue;
    let a = d[o + 3] / 255;
    const grain = n(i * 0.25, j * 0.25), blot = n.fbm(i * 0.02, j * 0.02, 3);
    if (style === 'stencil') { a *= sstep(0.25, 0.55, blot * 0.6 + grain * 0.5 + 0.1); if (Math.abs(((i + j * 0.0) % (size * 0.62)) - size * 0.31) < size * 0.025) a = 0; }
    else if (style === 'pencil') { a *= 0.55 + 0.45 * sstep(0.3, 0.7, n(i * 0.8, j * 0.8)); }
    else if (style === 'stamp') { a *= sstep(0.2, 0.6, blot * 0.7 + grain * 0.6); }
    else { a *= 1 - wear * sstep(0.45, 0.75, grain * 0.6 + (1 - blot) * 0.6); }
    d[o + 3] = a * 255 * alpha;
  }
  t.putImageData(img, 0, 0);
  ctx.drawImage(tmp, 0, 0);
}
export function texFromCanvas(c, opts = {}) { return toTex(c, { wrap: false, ...opts }); }
