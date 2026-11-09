// Boot: fonts → timing → set + figures → shots → player UI or capture API (window.OP, contract of tools/capture.mjs).
import * as THREE from 'three';
import { makeEngine, W, H, FPS, LAND } from './core/engine.js';
import { buildStore, STORE } from './sets/store.js';
import { buildInst, INST } from './sets/inst.js';
import { Figure } from './core/figure.js';
import { loadTiming, T } from './core/timing.js';
import { buildShots, drawCaptions } from './shots.js';

const q = new URLSearchParams(location.search);
const CAPTURE = q.has('capture');
if (CAPTURE) document.body.classList.add('capture');
// Captions use the computer's own Arial when it has it (every Mac and Windows PC), else the free metric-compatible Arimo.
const FONTS = [['ArialB', "local('Arial Bold'), local('Arial-BoldMT'), url(fonts/Arimo-700.woff2)", {}], ['ArialBI', "local('Arial Bold Italic'), local('Arial-BoldItalicMT'), url(fonts/Arimo-700-italic.woff2)", {}], ['Barlow Condensed', 'BarlowCondensed-600.woff2', { weight: '600' }], ['Barlow Condensed', 'BarlowCondensed-700.woff2', { weight: '700' }]];

const out = document.getElementById('out'), gl = document.getElementById('gl');
out.width = gl.width = W; out.height = gl.height = H; out.style.aspectRatio = `${W} / ${H}`;
if (LAND) { out.style.height = 'auto'; out.style.width = 'min(96vw, 1400px)'; }
let SHOTS = [], DURATION = 0, world = null, engine = null;
const errors = [];

/** night sky behind the store: deep navy at the top, a faint warm city glow at the horizon */
function skyTex() {
  const c = document.createElement('canvas'); c.width = 8; c.height = 512; const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, 512); g.addColorStop(0, '#020306'); g.addColorStop(0.55, '#06080e'); g.addColorStop(0.8, '#120f0e'); g.addColorStop(1, '#0a0807');
  x.fillStyle = g; x.fillRect(0, 0, 8, 512); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

function makeWorld() {
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x000000);
  engine = makeEngine(gl);
  const store = buildStore(scene, engine.renderer);
  const inst = buildInst(scene, engine.renderer);
  const F = {
    gun: new Figure(scene, { kind: 2 }),                                   // the gunman (cap)
    brad: new Figure(scene, { kind: 3 }), james: new Figure(scene, { kind: 3 }),   // the clerks (short hair); reused as other men later
    fa: new Figure(scene, { kind: 0 }), fd: new Figure(scene, { kind: 0 }),         // women (the mothers in the witness room)
  };
  const camera = new THREE.PerspectiveCamera(50, W / H, 0.03, 120);
  return { scene, store, inst, ...F, figs: Object.values(F), camera, THREE, STORE, INST, sky: skyTex() };
}

/** every frame starts from the same world: all figures hidden, doors/props/lights at rest, the shot's set shown */
function resetWorld(wd, sh) {
  for (const f of wd.figs) { f.hide(false); f.gain = 1; f.eyes = 0; }
  const s = wd.store, n = wd.inst, set = sh.set || 'store';
  s.root.visible = set === 'store'; n.root.visible = set === 'inst';
  wd.scene.background = set === 'store' ? wd.sky : new THREE.Color(0x000000);
  wd.scene.environment = set === 'store' ? s.envTex : n.envTex; wd.scene.environmentIntensity = 0.3;
  s.frontDoor.rotation.set(0, 0, 0); s.odoor.rotation.set(0, -1.45, 0); s.drawer.position.z = -0.02; s.handle.rotation.set(0, 0, 0); s.tlHand.rotation.set(-0.9, 0, 0);
  s.sign.emissiveIntensity = 1.25; s.signLight.intensity = 1.6; s.key.intensity = 2.2; s.dlamp.intensity = 1.5; s.oceil.intensity = 0.5;
  s.LIGHTS.forEach((l) => (l.intensity = 1.6)); s.poleL.intensity = 40; s.poleR.intensity = 34;
  n.door.rotation.set(0, 0, 0); n.cellDoors.forEach((d) => (d.position.z = d.userData.z0 ?? (d.userData.z0 = d.position.z)));
  n.lampI.intensity = 2.0; n.chamberL.intensity = 7.0; n.witL.intensity = 0.08; n.cellLight.intensity = 0.25; n.hl.forEach((l, i) => (l.intensity = [1.3, 1.0, 1.0, 0.8][i]));
  wd.flash = 0;
}

function shake(t, amp) {
  const n = (f, p) => Math.sin(t * f + p) * 0.6 + Math.sin(t * f * 2.31 + p * 1.7) * 0.3 + Math.sin(t * f * 5.13 + p * 0.3) * 0.1;
  return [n(0.9, 0.2) * amp, n(0.7, 1.9) * amp, n(0.5, 3.1) * amp * 0.6];
}

function shotAt(t) { for (let i = SHOTS.length - 1; i >= 0; i--) if (t >= SHOTS[i].start - 1e-6) return i; return 0; }

function render(t) {
  const i = shotAt(t), sh = SHOTS[i];
  const tt = sh.step ? sh.start + Math.floor((t - sh.start) * sh.step + 1e-6) / sh.step : t; // CCTV: a still every 1/step s
  const lt = tt - sh.start;
  const ctx = out.getContext('2d');
  try {
    resetWorld(world, sh);
    const look = sh.setup(world, lt, tt) || {};
    const c = look.cam;
    const cam = world.camera;
    cam.fov = (c.fov ?? 50) * (LAND ? 0.88 : 1); cam.near = c.near ?? 0.03; cam.updateProjectionMatrix();
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look);
    const [a, b, r] = shake(t, (c.shake ?? 0.12) * Math.PI / 180);
    cam.rotateX(a); cam.rotateY(b); cam.rotateZ(r + (c.roll ?? 0) * Math.PI / 180);
    cam.updateMatrixWorld();
    engine.render(world.scene, cam, t, look);
    ctx.drawImage(gl, 0, 0, W, H);
    if (sh.over) { ctx.save(); sh.over(ctx, world, lt, tt, t); ctx.restore(); }
    drawCaptions(ctx, t);
    if (look.black) { ctx.fillStyle = `rgba(0,0,0,${look.black})`; ctx.fillRect(0, 0, W, H); }
    if (look.post) { ctx.save(); look.post(ctx); ctx.restore(); }
  } catch (err) {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#400'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = '#f88'; ctx.font = '28px monospace'; ctx.fillText(`${sh.id}: ${err.message}`.slice(0, 70), 30, H / 2);
    if (!errors.find((x) => x.id === sh.id)) { errors.push({ id: sh.id, msg: err.message, stack: err.stack }); console.error(sh.id, err); }
  }
}

async function boot() {
  await Promise.all(FONTS.map(async ([fam, file, d]) => { const f = new FontFace(fam, file.includes('(') ? file : `url(fonts/${file})`, d); await f.load(); document.fonts.add(f); }));
  await loadTiming();
  world = makeWorld();
  SHOTS = buildShots(T);
  for (let i = 0; i < SHOTS.length; i++) SHOTS[i].end = SHOTS[i + 1] ? SHOTS[i + 1].start : SHOTS[i].end ?? T.dur;
  DURATION = SHOTS[SHOTS.length - 1].end;
  render(0); // compile shaders
  window.OP.ready = true;
  if (!CAPTURE) player();
}

window.OP = {
  ready: false, duration: () => DURATION,
  scenes: () => SHOTS.map((s, i) => ({ i, id: s.id, start: s.start, end: s.end, tech: s.note || '', title: s.note || '' })),
  errors: () => errors,
  dbg(t) { render(t); const f = {}; for (const k of ['gun', 'brad', 'james', 'fa', 'fd']) { const g = world[k]; f[k] = g.visible ? ['pelvis', 'head', 'footL', 'handR'].map((b) => g.at(b).toArray().map((v) => +v.toFixed(2))) : null; } return { cam: world.camera.position.toArray().map((v) => +v.toFixed(2)), f }; },
  cues: () => (SHOTS.cues || []).map((c) => ({ gain: 1, ...c })).sort((a, b) => a.t - b.t),
  frame(i, qq = 0.92) { render(i / FPS); return out.toDataURL('image/jpeg', qq); },
  bench(i) { const t0 = performance.now(); render(i / FPS); engine.renderer.getContext().finish(); return performance.now() - t0; },
  sheet(times, cols = 4, scale = 0.25, qq = 0.85) {
    const w = Math.round(W * scale), h = Math.round(H * scale), rows = Math.ceil(times.length / cols);
    const c = document.createElement('canvas'); c.width = w * cols; c.height = (h + 22) * rows;
    const x = c.getContext('2d'); x.fillStyle = '#111'; x.fillRect(0, 0, c.width, c.height);
    times.forEach((t, k) => {
      render(t); const cx = (k % cols) * w, cy = Math.floor(k / cols) * (h + 22);
      x.drawImage(out, cx, cy, w, h); const s = SHOTS[shotAt(t)];
      x.fillStyle = '#fff'; x.font = '14px monospace'; x.fillText(`${t.toFixed(2)}s ${s.id} ${s.note || ''}`.slice(0, Math.floor(w / 8.5)), cx + 4, cy + h + 16);
    });
    return c.toDataURL('image/jpeg', qq);
  },
};
window.OP.panels = window.OP.sheet;

function player() {
  const song = document.getElementById('song'), scrub = document.getElementById('scrub'), info = document.getElementById('info');
  const play = document.getElementById('play'), jump = document.getElementById('jump');
  scrub.max = DURATION;
  SHOTS.forEach((s) => { const o = document.createElement('option'); o.value = s.start; o.textContent = `${s.id} ${s.start.toFixed(2)} ${s.note || ''}`; jump.appendChild(o); });
  let t = parseFloat(q.get('t') || '0');
  if (q.get('shot')) { const s = SHOTS.find((x) => x.id === q.get('shot')); if (s) t = s.start; }
  let playing = false, last = -1;
  const show = () => { const f = Math.round(t * FPS); if (f !== last) { render(t); last = f; } const s = SHOTS[shotAt(t)]; scrub.value = t; info.textContent = `${t.toFixed(2)}s · f${f} · ${s.id} ${s.note || ''}`; };
  const loop = () => { if (playing) { t = song.currentTime; show(); requestAnimationFrame(loop); } };
  const toggle = () => { playing = !playing; play.textContent = playing ? '❚❚ pause' : '▶ play'; if (playing) { song.currentTime = t; song.play(); loop(); } else song.pause(); };
  const seek = (v) => { t = Math.max(0, Math.min(DURATION - 1 / FPS, v)); if (playing) song.currentTime = t; show(); };
  play.onclick = toggle; scrub.oninput = () => seek(parseFloat(scrub.value)); jump.onchange = () => seek(parseFloat(jump.value) + 0.001);
  addEventListener('keydown', (e) => {
    if (e.code === 'Space') { e.preventDefault(); toggle(); }
    if (e.code === 'ArrowRight') seek(t + (e.shiftKey ? 1 : 1 / FPS));
    if (e.code === 'ArrowLeft') seek(t - (e.shiftKey ? 1 : 1 / FPS));
    if (e.key === ']') { const i = shotAt(t); if (SHOTS[i + 1]) seek(SHOTS[i + 1].start + 0.001); }
    if (e.key === '[') { const i = shotAt(t); seek(SHOTS[Math.max(0, t - SHOTS[i].start < 0.3 ? i - 1 : i)].start + 0.001); }
  });
  show();
}
boot().catch((e) => { console.error(e); document.getElementById('info').textContent = 'BOOT ERROR ' + e.message; window.OP.bootError = e.message + '\n' + e.stack; });
