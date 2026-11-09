// THE LOUVRE HEIST — Clay Atlas documentary style (SKILL/styles/clay-atlas/STYLE.md + style-sheet.jpg).
// AI-generated stills (made by you, in any image tool) + local depth maps → WebGL 2.5D camera; every graphic (date stamps, labels, map, jewel board,
// timer, audit page, login) is drawn here. Capture contract = window.OP (tools/capture.mjs).
import { buildShots } from './shots.js';

export const W = 1920, H = 1080, FPS = 30;
const q = new URLSearchParams(location.search);
const CAPTURE = q.has('capture');
if (CAPTURE) document.body.classList.add('capture');

const out = document.getElementById('out'), glc = document.getElementById('gl');
const ctx = out.getContext('2d');
const errors = [];
let SHOTS = [], DURATION = 0;

// ---------- palette (style sheet) ----------
export const C = {
  clay: '#E6DFD3', amber: '#C8662A', umber: '#2A1A10', parch: '#D6C39A', orange: '#E08A3C', red: '#D2382C',
  yellow: '#F2E15B', slate: '#8E9A94', ink: '#1C1714', box: 'rgba(32,27,24,0.84)',
};

// ---------- timing ----------
export const T = { S: [], words: [], dur: 0 };
const norm = (w) => w.toLowerCase().replace(/[^a-z0-9]/g, '');
export const s = (i) => T.S[i].start, e = (i) => T.S[i].end;
export function w(i, word) {
  const a = T.S[i].start - 0.05, b = T.S[i].end + 0.05, n = norm(word);
  const hit = T.words.find((x) => x.s >= a && x.s <= b && norm(x.w).startsWith(n));
  return hit ? hit.s : T.S[i].start;
}
export function we(i, word) {
  const a = T.S[i].start - 0.05, b = T.S[i].end + 0.05, n = norm(word);
  const hit = T.words.find((x) => x.s >= a && x.s <= b && norm(x.w).startsWith(n));
  return hit ? hit.e : T.S[i].end;
}

// ---------- maths ----------
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const k = (t, a, b) => clamp((t - a) / (b - a));
export const eo = (x) => 1 - Math.pow(1 - x, 3);
export const eio = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
export const sine = (x) => -(Math.cos(Math.PI * x) - 1) / 2;
export function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// ---------- assets ----------
const loadImg = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('img ' + src)); i.src = src; });
/** the first of base.jpg / .png / .webp that exists (your image tool may save any of them) */
const loadAny = async (base) => { for (const ext of ['jpg', 'png', 'webp', 'jpeg']) { try { return await loadImg(`${base}.${ext}`); } catch {} } throw new Error('img ' + base + '.(jpg|png|webp)'); };
export const IMG = {};
export const DEP = {};   // small CPU copies of depth maps for projecting points
const STILLS = ['01_aerial', '02_truck', '03_basket', '04_cutter', '05_gallery', '06_smash', '07_jewels', '08_bikes', '09_crown', '10_security', '11_arrest', '12_empty'];

// ---------- WebGL 2.5D still renderer ----------
let gl, prog, U = {}, TEX = {};
const VS = `#version 300 es
in vec2 p; out vec2 vUv;
void main(){ vUv = vec2(p.x*0.5+0.5, 0.5-p.y*0.5); gl_Position = vec4(p,0.,1.); }`;
const FS = `#version 300 es
precision highp float;
in vec2 vUv; out vec4 o;
uniform sampler2D uImg, uDep;
uniform float uScale, uDolly, uFocus, uGlow, uBright, uImgAspect, uWarm, uSat;
uniform vec2 uPan, uPar, uC;
void main(){
  vec2 p = vUv, sp = p;
  for (int i = 0; i < 10; i++) {
    vec2 st = vec2((sp.x-0.5)*(16.0/9.0)/uImgAspect+0.5, sp.y);
    float d = texture(uDep, st).r - uFocus;
    sp = uC + (p - uC - uPan - uPar*d) / (uScale*(1.0 + uDolly*d));
  }
  vec2 st = vec2((sp.x-0.5)*(16.0/9.0)/uImgAspect+0.5, sp.y);
  vec3 c = texture(uImg, st).rgb;
  if (uGlow > 0.0) { float m = smoothstep(0.10, 0.28, c.r - max(c.g, c.b)) * smoothstep(0.45, 0.7, c.r); c += uGlow * m * vec3(0.42, 0.08, 0.07); }
  float l = dot(c, vec3(0.299,0.587,0.114)); c = mix(vec3(l), c, uSat);
  c *= uBright; c *= vec3(1.0 + 0.03*uWarm, 1.0, 1.0 - 0.04*uWarm);
  o = vec4(c, 1.0);
}`;
function initGL() {
  gl = glc.getContext('webgl2', { preserveDrawingBuffer: true, antialias: false });
  const sh = (t, src) => { const x = gl.createShader(t); gl.shaderSource(x, src); gl.compileShader(x); if (!gl.getShaderParameter(x, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(x)); return x; };
  prog = gl.createProgram(); gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  gl.useProgram(prog);
  const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  for (const n of ['uImg', 'uDep', 'uScale', 'uDolly', 'uFocus', 'uGlow', 'uBright', 'uImgAspect', 'uPan', 'uPar', 'uC', 'uWarm', 'uSat']) U[n] = gl.getUniformLocation(prog, n);
  gl.uniform1i(U.uImg, 0); gl.uniform1i(U.uDep, 1);
}
function texFrom(img, mip) {
  const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
  if (mip) gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mip ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return t;
}
export const CAM0 = { s: 1.1, x: 0, y: 0, d: 0, px: 0, py: 0, cx: 0.5, cy: 0.5, f: 0.5, glow: 0, bright: 1, warm: 0, sat: 1 };
export function mixCam(a, b, t) { const o = {}; for (const key in CAM0) o[key] = lerp(a[key] ?? CAM0[key], b[key] ?? CAM0[key], t); return o; }

/** draw still `name` with camera `cam` onto ctx (full frame) */
export function still(name, cam) {
  const c = { ...CAM0, ...cam };
  if (!TEX[name]) TEX[name] = { img: texFrom(IMG[name], true), dep: texFrom(IMG[name + '_d'], false) };
  gl.viewport(0, 0, W, H);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, TEX[name].img);
  gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, TEX[name].dep);
  gl.uniform1f(U.uScale, c.s); gl.uniform1f(U.uDolly, c.d); gl.uniform1f(U.uFocus, c.f); gl.uniform1f(U.uGlow, c.glow);
  gl.uniform1f(U.uBright, c.bright); gl.uniform1f(U.uImgAspect, IMG[name].width / IMG[name].height); gl.uniform1f(U.uWarm, c.warm); gl.uniform1f(U.uSat, c.sat);
  gl.uniform2f(U.uPan, c.x, c.y); gl.uniform2f(U.uPar, c.px, c.py); gl.uniform2f(U.uC, c.cx, c.cy);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  ctx.drawImage(glc, 0, 0);
}
/** where image point (u,v) of still `name` lands on screen under `cam` → {x,y} in px */
export function project(name, cam, u, v) {
  const c = { ...CAM0, ...cam }, im = IMG[name], A = im.width / im.height;
  const sx = (u - 0.5) / ((16 / 9) / A) + 0.5, sy = v;
  const D = DEP[name]; const dd = D ? D.data[(Math.min(D.h - 1, Math.floor(v * D.h)) * D.w + Math.min(D.w - 1, Math.floor(u * D.w))) * 4] / 255 : c.f;
  const d = dd - c.f, sc = c.s * (1 + c.d * d);
  return { x: (c.cx + (sx - c.cx) * sc + c.x + c.px * d) * W, y: (c.cy + (sy - c.cy) * sc + c.y + c.py * d) * H };
}

// ---------- post: vignette + fine grain, then fades ----------
let VIG, GRAIN = [];
function makePost() {
  VIG = document.createElement('canvas'); VIG.width = W; VIG.height = H;
  const v = VIG.getContext('2d'); const g = v.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 1.05);
  g.addColorStop(0, 'rgba(20,10,5,0)'); g.addColorStop(1, 'rgba(20,10,5,0.55)'); v.fillStyle = g; v.fillRect(0, 0, W, H);
  for (let n = 0; n < 6; n++) {
    const c = document.createElement('canvas'); c.width = 512; c.height = 512; const x = c.getContext('2d'); const id = x.createImageData(512, 512); const r = rng(77 + n);
    for (let i = 0; i < id.data.length; i += 4) { const g2 = 128 + (r() - 0.5) * 90; id.data[i] = id.data[i + 1] = id.data[i + 2] = g2; id.data[i + 3] = 255; }
    x.putImageData(id, 0, 0); GRAIN.push(c);
  }
}
function post(t, fi) {
  ctx.save(); ctx.globalAlpha = 1; ctx.drawImage(VIG, 0, 0);
  ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = 0.05;
  const g = GRAIN[fi % GRAIN.length]; const pat = ctx.createPattern(g, 'repeat'); ctx.fillStyle = pat;
  ctx.translate((fi * 137) % 512, (fi * 211) % 512); ctx.fillRect(-512, -512, W + 1024, H + 1024);
  ctx.restore();
  // fade in from black / out to black
  const a = Math.max(1 - k(t, 0.0, 0.7), k(t, DURATION - 1.3, DURATION - 0.15));
  if (a > 0) { ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); ctx.restore(); }
}

// ---------- frame ----------
export const shotAt = (t) => { let i = 0; for (let j = 0; j < SHOTS.length; j++) if (t >= SHOTS[j].start) i = j; return i; };
function render(t) {
  const fi = Math.round(t * FPS);
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  const i = shotAt(t), sh = SHOTS[i];
  try { sh.draw(ctx, t, (t - sh.start) / (sh.end - sh.start), fi); } catch (err) { errors.push({ id: sh.id, msg: String(err.message || err), stack: err.stack }); }
  // cross-dissolve into this shot when asked
  if (sh.xin && i > 0 && t < sh.start + sh.xin) {
    const pv = SHOTS[i - 1], a = 1 - (t - sh.start) / sh.xin;
    const tmp = document.createElement('canvas'); tmp.width = W; tmp.height = H;
    const keep = tmp.getContext('2d'); keep.drawImage(out, 0, 0);
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    try { pv.draw(ctx, t, (t - pv.start) / (pv.end - pv.start), fi); } catch (err) { errors.push({ id: pv.id, msg: String(err.message || err) }); }
    ctx.save(); ctx.globalAlpha = 1 - a; ctx.drawImage(tmp, 0, 0); ctx.restore();
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
  post(t, fi);
}

// ---------- boot ----------
async function boot() {
  const FONTS = [['Inter', 'Inter-400.woff2', '400'], ['Inter', 'Inter-600.woff2', '600'], ['Inter', 'Inter-700.woff2', '700'], ['Inter', 'Inter-900.woff2', '900'], ['Playfair', 'PlayfairDisplay-Roman.woff2', '400'], ['Mono', 'JetBrainsMono-400.woff2', '400']];
  await Promise.all(FONTS.map(async ([f, file, wt]) => { const ff = new FontFace(f, `url(fonts/${file})`, { weight: wt }); await ff.load(); document.fonts.add(ff); }));
  const sen = await (await fetch('data/narration.sentences.json')).json();
  T.S = sen.sentences; T.words = await (await fetch('data/words.json')).json(); T.dur = sen.duration;
  await Promise.all(STILLS.map(async (n) => {
    try { IMG[n] = await loadAny(`stills/${n}`); IMG[n + '_d'] = await loadImg(`stills/${n}_depth.png`); }
    catch { IMG[n] = null; }
  }));
  for (const n of STILLS) if (IMG[n]) {
    const c = document.createElement('canvas'); c.width = 256; c.height = 143; const x = c.getContext('2d', { willReadFrequently: true });
    x.drawImage(IMG[n + '_d'], 0, 0, 256, 143); DEP[n] = { w: 256, h: 143, data: x.getImageData(0, 0, 256, 143).data };
  }
  for (const n of ['map', 'map_base', 'map_mask']) IMG[n] = await loadAny(`data/${n === 'map' ? 'map_clean' : n}`);
  IMG.jewelTiles = (await (await fetch('data/jewels.json')).json()).tiles;
  initGL(); makePost();
  SHOTS = buildShots(); DURATION = SHOTS[SHOTS.length - 1].end;
  window.OP.ready = true;
  if (!CAPTURE) player();
}

window.OP = {
  ready: false, duration: () => DURATION,
  scenes: () => SHOTS.map((x, i) => ({ i, id: x.id, start: x.start, end: x.end, tech: x.note || '', title: x.note || '' })),
  errors: () => errors,
  cues: () => (SHOTS.cues || []).map((c) => ({ gain: 1, ...c })).sort((a, b) => a.t - b.t),
  frame(i, qq = 0.92) { render(i / FPS); return out.toDataURL('image/jpeg', qq); },
  bench(i) { const t0 = performance.now(); render(i / FPS); gl.finish(); return performance.now() - t0; },
  sheet(times, cols = 4, scale = 0.25, qq = 0.85) {
    const w2 = Math.round(W * scale), h2 = Math.round(H * scale), rows = Math.ceil(times.length / cols);
    const c = document.createElement('canvas'); c.width = w2 * cols; c.height = (h2 + 22) * rows;
    const x = c.getContext('2d'); x.fillStyle = '#111'; x.fillRect(0, 0, c.width, c.height);
    times.forEach((t, j) => {
      render(t); const cx = (j % cols) * w2, cy = Math.floor(j / cols) * (h2 + 22);
      x.drawImage(out, cx, cy, w2, h2); const sh = SHOTS[shotAt(t)];
      x.fillStyle = '#fff'; x.font = '14px monospace'; x.fillText(`${t.toFixed(2)}s ${sh.id} ${sh.note || ''}`.slice(0, Math.floor(w2 / 8.5)), cx + 4, cy + h2 + 16);
    });
    return c.toDataURL('image/jpeg', qq);
  },
};
window.OP.panels = window.OP.sheet;

function player() {
  const song = document.getElementById('song'), scrub = document.getElementById('scrub'), info = document.getElementById('info'), jump = document.getElementById('jump'), play = document.getElementById('play');
  scrub.max = DURATION; let t = parseFloat(q.get('t') || '0'), playing = false, t0 = 0, p0 = 0;
  if (q.get('shot')) { const sh = SHOTS.find((x) => x.id === q.get('shot')); if (sh) t = sh.start + 0.01; }
  SHOTS.forEach((x) => { const o = document.createElement('option'); o.value = x.start; o.textContent = `${x.id} ${x.start.toFixed(1)}s ${x.note || ''}`; jump.appendChild(o); });
  jump.onchange = () => { t = parseFloat(jump.value) + 0.01; song.currentTime = t; };
  const show = () => { render(t); scrub.value = t; info.textContent = `${t.toFixed(2)}s / ${DURATION.toFixed(1)}s · ${SHOTS[shotAt(t)].id}`; };
  const tick = () => { if (playing) { t = song.duration ? song.currentTime : p0 + (performance.now() - t0) / 1000; if (t >= DURATION) { playing = false; song.pause(); } } show(); requestAnimationFrame(tick); };
  play.onclick = () => { playing = !playing; if (playing) { song.currentTime = t; song.play().catch(() => {}); t0 = performance.now(); p0 = t; } else song.pause(); };
  scrub.oninput = () => { t = parseFloat(scrub.value); song.currentTime = t; };
  addEventListener('keydown', (ev) => {
    if (ev.code === 'Space') { ev.preventDefault(); play.onclick(); }
    if (ev.code === 'ArrowRight') t = Math.min(DURATION, t + (ev.shiftKey ? 1 : 1 / FPS));
    if (ev.code === 'ArrowLeft') t = Math.max(0, t - (ev.shiftKey ? 1 : 1 / FPS));
  });
  tick();
}

boot().catch((err) => { window.OP.bootError = String(err.stack || err); console.error(err); });
