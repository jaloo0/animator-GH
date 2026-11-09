// Boot: fonts → timing → sets + cast → shots → player UI or capture API (window.OP, the contract of tools/capture.mjs).
import * as THREE from 'three';
import { makeEngine, W, H, FPS, PORT } from './core/engine.js';
import { loadTiming, T } from './core/timing.js';
import { drift } from './core/util.js';
import { buildWorld } from './world.js';
import { buildShots } from './shots.js';

const q = new URLSearchParams(location.search);
const CAPTURE = q.has('capture');
if (CAPTURE) document.body.classList.add('capture');
// Printed type: the computer's own Rockwell when it has it (every Mac), else the free Arvo slab.
const FONTS = [['Rockwell', "local('Rockwell Bold'), local('Rockwell-Bold'), url(fonts/Arvo-700.woff2)", { weight: 'bold' }], ['Rockwell', "local('Rockwell'), local('Rockwell-Regular'), url(fonts/Arvo-400.woff2)", { weight: 'normal' }], ['Kalam', 'Kalam-700.woff2', { weight: 'bold' }], ['Anton', 'Anton.woff2', {}]];

const out = document.getElementById('out'), gl = document.getElementById('gl');
out.width = gl.width = W; out.height = gl.height = H; out.style.aspectRatio = `${W} / ${H}`;
if (PORT) { out.style.width = 'auto'; out.style.height = 'calc(100vh - 110px)'; }
let SHOTS = [], DURATION = 0, world = null, engine = null;
const errors = [];
const camera = new THREE.PerspectiveCamera(40, W / H, 0.02, 2000);

function shotAt(t) { for (let i = SHOTS.length - 1; i >= 0; i--) if (t >= SHOTS[i].start - 1e-6) return i; return 0; }

function pose(t) {
  const i = shotAt(t), sh = SHOTS[i], lt = t - sh.start;
  const set = world.sets[sh.set];
  set.reset?.(t);
  const r = sh.setup(world, lt, t) || {};
  set.update?.(t, lt, r);
  const c = r.cam;
  const fovScale = PORT ? 1.55 : 1;
  camera.fov = Math.min(110, (c.fov ?? 40) * fovScale); camera.near = c.near ?? 0.03; camera.far = c.far ?? 2000; camera.updateProjectionMatrix();
  camera.position.set(...c.pos); camera.up.set(0, 1, 0); camera.lookAt(...c.look);
  const [a, b, rr] = drift(t, c.shake ?? 0.12, i * 1.3);
  camera.rotateX(a); camera.rotateY(b); camera.rotateZ(rr + (c.roll ?? 0) * Math.PI / 180);
  set.sky.frame(new THREE.Vector3(...(r.shadowAt || c.look)), r.shadowSize ?? 3);
  return { sh, set, r };
}

function render(t) {
  const ctx = out.getContext('2d');
  try {
    const { sh, set, r } = pose(t);
    const n = r.mb ?? 1;
    if (n <= 1) engine.render(set.scene, camera, t, r.look || {});
    else {
      const shutter = (r.shutter ?? 0.5) / FPS;
      for (let k = 0; k < n; k++) {
        const ts = t + (k / (n - 1) - 0.5) * shutter;
        const p = k === n - 1 ? pose(t) : pose(Math.max(sh.start, ts));
        engine.render(p.set.scene, camera, t, p.r.look || {}, { i: k, n });
      }
    }
    ctx.drawImage(gl, 0, 0, W, H);
  } catch (err) {
    const sh = SHOTS[shotAt(t)];
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#400'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = '#f88'; ctx.font = '28px monospace'; ctx.fillText(`${sh.id}: ${err.message}`.slice(0, 90), 30, H / 2);
    if (!errors.find((x) => x.id === sh.id)) { errors.push({ id: sh.id, msg: err.message, stack: err.stack }); console.error(sh.id, err); }
  }
}

async function boot() {
  await Promise.all(FONTS.map(async ([fam, file, d]) => { const f = new FontFace(fam, file.includes('(') ? file : `url(fonts/${file})`, d); await f.load(); document.fonts.add(f); }));
  await loadTiming();
  engine = makeEngine(gl);
  world = await buildWorld(engine.renderer); window.WORLD = world; window.ENGINE = engine;
  SHOTS = buildShots(T, world);
  for (let i = 0; i < SHOTS.length; i++) SHOTS[i].end = SHOTS[i + 1] ? SHOTS[i + 1].start : SHOTS[i].end ?? T.dur;
  DURATION = SHOTS[SHOTS.length - 1].end;
  for (const s of SHOTS) { try { render(s.start + 0.01); } catch { /* compile */ } }
  window.OP.ready = true;
  if (!CAPTURE) player();
}

window.OP = {
  ready: false, duration: () => DURATION,
  scenes: () => SHOTS.map((s, i) => ({ i, id: s.id, start: s.start, end: s.end, tech: s.note || '', title: s.note || '' })),
  errors: () => errors,
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
