// Boot: fonts → timing → set + figures → shots → player UI or capture API (window.OP, contract of tools/capture.mjs).
import * as THREE from 'three';
import { makeEngine, W, H, FPS, LAND } from './core/engine.js';
import { buildHall, updateCord, HALL } from './sets/hall.js';
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

const HANDSET_CRADLE = new THREE.Matrix4().compose(new THREE.Vector3(HALL.phone.x - 0.093, HALL.phone.y, HALL.phone.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI / 2, 0)), new THREE.Vector3(1, 1, 1));
const CORD_ANCHOR = new THREE.Vector3(HALL.phone.x - 0.04, HALL.phone.y - 0.115, HALL.phone.z);

function makeWorld() {
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x000000);
  engine = makeEngine(gl);
  const hall = buildHall(scene, engine.renderer);
  const girl = new Figure(scene, { kind: 0 });
  const man = new Figure(scene, { kind: 1, coreGain: 0.35, rimGain: 1.1, light: 0.08 });
  const camera = new THREE.PerspectiveCamera(50, W / H, 0.03, 60);
  return { scene, hall, girl, man, camera, THREE, HALL };
}

function resetWorld(wd, t) {
  const h = wd.hall;
  wd.girl.visible = true; wd.girl.gain = 1; wd.man.hide(false); wd.man.gain = 1; wd.man.eyes = 0;
  h.closetPivot.rotation.y = 0; h.frontDoor.position.x = HALL.door.x; h.frontDoor.rotation.set(0, 0, 0);
  h.under.uniforms.uI.value = 1; h.under.uniforms.uFeetW.value = 0; h.spill.material.opacity = 1;
  h.lamp.intensity = 1.6; h.lampShade.emissiveIntensity = 0.32; h.tlamp.intensity = 1.1;
  h.phoneBase.rotation.set(0, 0, 0);
  wd.handset = { mode: 'cradle', ring: 0 };
}

/** handset placement: in the cradle (with ring rattle) or held against the girl's right ear */
function placeHandset(wd, t) {
  const hs = wd.hall.handset, st = wd.handset;
  if (st.mode === 'hand') {
    const g = wd.girl;
    const ear = g.at('head', new THREE.Vector3(-0.098, 0.085, 0.0)), mouth = g.at('head', new THREE.Vector3(-0.05, -0.005, 0.1));
    const y = ear.clone().sub(mouth).normalize();
    const inward = g.at('head', new THREE.Vector3(0, 0.06, 0.0)).sub(ear).normalize();
    const x = new THREE.Vector3().crossVectors(y, inward).normalize(), z = new THREE.Vector3().crossVectors(x, y);
    const c = ear.clone().add(mouth).multiplyScalar(0.5).addScaledVector(inward, -0.03);
    hs.matrixAutoUpdate = false; hs.matrix.makeBasis(x, y, z).setPosition(c);
    if (st.blend != null && st.blend < 1) { // travelling between cradle and ear
      const a = new THREE.Vector3(), b = new THREE.Vector3(), qa = new THREE.Quaternion(), qb = new THREE.Quaternion(), s = new THREE.Vector3();
      HANDSET_CRADLE.decompose(a, qa, s); hs.matrix.decompose(b, qb, s);
      const k = st.blend; hs.matrix.compose(a.lerp(b, k), qa.slerp(qb, k), s.set(1, 1, 1));
    }
  } else {
    hs.matrixAutoUpdate = false; hs.matrix.copy(HANDSET_CRADLE);
    if (st.ring > 0) {
      const j = st.ring * 0.012 * Math.sin(t * 2 * Math.PI * 21), j2 = st.ring * 0.006 * Math.sin(t * 2 * Math.PI * 17 + 1);
      hs.matrix.multiply(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(j2, 0, j)));
      wd.hall.phoneBase.rotation.set(j2 * 0.3, 0, j * 0.3);
    }
  }
  hs.matrixWorldNeedsUpdate = true;
  const bottom = new THREE.Vector3(0, -0.1, 0.0).applyMatrix4(hs.matrix);
  updateCord(wd.hall.cord, CORD_ANCHOR, bottom, t);
}

function shake(t, amp) {
  const n = (f, p) => Math.sin(t * f + p) * 0.6 + Math.sin(t * f * 2.31 + p * 1.7) * 0.3 + Math.sin(t * f * 5.13 + p * 0.3) * 0.1;
  return [n(0.9, 0.2) * amp, n(0.7, 1.9) * amp, n(0.5, 3.1) * amp * 0.6];
}

function shotAt(t) { for (let i = SHOTS.length - 1; i >= 0; i--) if (t >= SHOTS[i].start - 1e-6) return i; return 0; }

function render(t) {
  const i = shotAt(t), sh = SHOTS[i], lt = t - sh.start;
  const ctx = out.getContext('2d');
  try {
    resetWorld(world, t);
    const look = sh.setup(world, lt, t) || {};
    const c = look.cam;
    const cam = world.camera;
    cam.fov = (c.fov ?? 50) * (LAND ? 0.88 : 1); cam.near = c.near ?? 0.03; cam.updateProjectionMatrix();
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look);
    const [a, b, r] = shake(t, (c.shake ?? 0.12) * Math.PI / 180);
    cam.rotateX(a); cam.rotateY(b); cam.rotateZ(r + (c.roll ?? 0) * Math.PI / 180);
    placeHandset(world, t);
    engine.render(world.scene, cam, t, look);
    ctx.drawImage(gl, 0, 0, W, H);
    if (sh.over) { ctx.save(); sh.over(ctx, world, lt, t); ctx.restore(); }
    drawCaptions(ctx, t);
    if (look.black) { ctx.fillStyle = `rgba(0,0,0,${look.black})`; ctx.fillRect(0, 0, W, H); }
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
