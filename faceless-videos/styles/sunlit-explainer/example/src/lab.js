// Lab: look at one character under the film's light. ?lab&char=bullard — views are "times" 0,1,2… for capture.mjs panels.
import * as THREE from 'three';
import { makeEngine, W, H } from './core/engine.js';
import { makeSky } from './core/sky.js';
import { Human, GRIPS } from './chars/human.js';

const q = new URLSearchParams(location.search);
const out = document.getElementById('out'), gl = document.getElementById('gl');
out.width = gl.width = W; out.height = gl.height = H;
const engine = makeEngine(gl);
const scene = new THREE.Scene();
const sky = makeSky(engine.renderer, { az: Number(q.get('az') ?? 60), el: 16 });
scene.add(sky.dome, sky.sun, sky.sun.target); scene.environment = sky.env; scene.environmentIntensity = 0.55;
sky.frame(new THREE.Vector3(0, 1, 0), 1.5);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshStandardMaterial({ color: 0x9a8064, roughness: 0.95 }));
ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
const cam = new THREE.PerspectiveCamera(30, W / H, 0.02, 1000);
let man;
const V = (x, y, z) => new THREE.Vector3(x, y, z);

const VIEWS = [
  { n: 'rest front', f() { man.reset(); return { pos: [0.8, 1.1, 3.6], look: [0, 0.95, 0], fov: 32 }; } },
  { n: 'face 3/4', f() { man.reset(); man.look(V(1.5, 1.6, 3), 1); return { pos: [0.28, 1.66, 0.55], look: [0, 1.625, 0.04], fov: 24, focus: 0.6, aper: 0.0 }; } },
  { n: 'face profile', f() { man.reset(); return { pos: [0.62, 1.63, 0.1], look: [0, 1.62, 0.04], fov: 24 }; } },
  { n: 'hand back', f() { man.reset(); const h = man.at('handL'); return { pos: [h.x + 0.28, h.y + 0.05, h.z + 0.18], look: [h.x + 0.03, h.y - 0.08, h.z], fov: 30 }; } },
  { n: 'hands working', f() {
    man.reset();
    man.rot('spine', 12, 0, 0); man.rot('chest', 8, 0, 0);
    man.armIK('L', V(0.12, 1.02, 0.36), V(0.6, 0.9, -0.3), Human.handQ('L', V(-0.3, -0.2, 1), V(0, -1, 0.2)));
    man.armIK('R', V(-0.1, 1.05, 0.38), V(-0.6, 0.9, -0.3), Human.handQ('R', V(0.4, -0.1, 1), V(0, -1, 0)));
    man.fingers('L', GRIPS.hold); man.fingers('R', GRIPS.pinch);
    man.look(V(0, 0.98, 0.42), 1);
    return { pos: [0.9, 1.5, 1.4], look: [0, 1.1, 0.25], fov: 30 };
  } },
  { n: 'grips', f() {
    man.reset();
    man.armIK('L', V(0.2, 1.25, 0.35), V(0.7, 0.9, -0.3), Human.handQ('L', V(0, 0.2, 1), V(-1, 0, 0)));
    man.armIK('R', V(-0.2, 1.25, 0.35), V(-0.7, 0.9, -0.3), Human.handQ('R', V(0, 0.2, 1), V(1, 0, 0)));
    man.fingers('L', GRIPS[q.get('gl') || 'fist']); man.fingers('R', GRIPS[q.get('gr') || 'hold']);
    return { pos: [0.0, 1.35, 1.2], look: [0, 1.25, 0.3], fov: 30 };
  } },
  { n: 'face front', f() { man.reset(); return { pos: [0.0, 1.665, 0.62], look: [0, 1.655, 0.04], fov: 22 }; } },
  { n: 'eye close', f() { man.reset(); return { pos: [0.1, 1.67, 0.3], look: [0.032, 1.662, 0.06], fov: 20 }; } },
  { n: 'back 3/4', f() { man.reset(); return { pos: [-1.6, 1.4, -2.2], look: [0, 1.1, 0], fov: 30 }; } },
  { n: 'body close', f() { man.reset(); return { pos: [0.5, 1.35, 1.25], look: [0, 1.2, 0], fov: 32 }; } },
];

function render(t) {
  const v = VIEWS[Math.max(0, Math.min(VIEWS.length - 1, Math.floor(t)))];
  const c = v.f();
  cam.fov = c.fov ?? 30; cam.updateProjectionMatrix(); cam.position.set(...c.pos); cam.lookAt(...c.look);
  engine.render(scene, cam, 0, { focus: c.focus ?? cam.position.distanceTo(V(...c.look)), aper: c.aper ?? 0.0 });
  out.getContext('2d').drawImage(gl, 0, 0, W, H);
}
const errors = [];
window.OP = {
  ready: false, duration: () => VIEWS.length, errors: () => errors, cues: () => [],
  scenes: () => VIEWS.map((v, i) => ({ i, id: 'V' + i, start: i, end: i + 1, tech: v.n })),
  frame(i, qq = 0.92) { render(i / 30); return out.toDataURL('image/jpeg', qq); },
  sheet(times, cols = 2, scale = 0.5, qq = 0.88) {
    const w = Math.round(W * scale), h = Math.round(H * scale), rows = Math.ceil(times.length / cols);
    const c = document.createElement('canvas'); c.width = w * cols; c.height = (h + 20) * rows; const x = c.getContext('2d');
    x.fillStyle = '#111'; x.fillRect(0, 0, c.width, c.height);
    times.forEach((t, k) => { try { render(t); } catch (e) { errors.push({ id: 'V' + t, msg: e.message, stack: e.stack }); } x.drawImage(out, (k % cols) * w, Math.floor(k / cols) * (h + 20), w, h); x.fillStyle = '#fff'; x.font = '14px monospace'; x.fillText(VIEWS[Math.floor(t)]?.n || '', (k % cols) * w + 4, Math.floor(k / cols) * (h + 20) + h + 15); });
    return c.toDataURL('image/jpeg', qq);
  },
};
window.OP.panels = window.OP.sheet;
(async () => {
  man = await Human.load(q.get('char') || 'bullard', { skin: 0xc68d6c, hair: 0x3b2a1f });
  scene.add(man.group);
  render(0); window.OP.ready = true;
})().catch((e) => { console.error(e); window.OP.bootError = e.message + '\n' + e.stack; });
