// 1933: the top of the Golden Gate's south tower under construction at sunset — riveted cellular steel legs,
// a plank work deck with a rail, a derrick, catwalk cables, the bay far below in fog, Marin hills, the north tower.
// The ironworkers wear Bullard's Hard Boiled hats. A wooden sign: HARD HAT AREA.
import * as THREE from 'three';
import { makeSky } from '../core/sky.js';
import { steel, timber, noise2, rng } from '../core/tex.js';
import { pbr, mesh, boxM, decal, printText, scatter } from '../props/kit.js';
import { makeHat } from '../props/hats.js';

export const BR = { deck: 0, legX: 2.2 };

export function buildBridge(renderer, cast) {
  const scene = new THREE.Scene();
  const sky = makeSky(renderer, { az: -100, el: 6.5, top: 0x4a86c8, mid: 0x98c0e4, haze: 0xf7d2a6, ground: 0x7a8a90, sunI: 4.8, sunCol: 0xffb87a, cloud: 0.6, glow: 1.4, groundBounce: 0.5 });
  scene.add(sky.dome, sky.sun, sky.sun.target); scene.environment = sky.env; scene.environmentIntensity = 0.6;
  scene.fog = new THREE.Fog(0xf0d0ac, 120, 2600);
  const R = rng(81);
  const stT = steel(82, { base: 0x8a4e36, rivets: 8 }), stM = pbr(stT, { repeat: [1, 1], ns: 1.4, rough: 0.7 });
  const stM2 = pbr(stT, { repeat: [3, 1], ns: 1.4, rough: 0.7 });
  const plankM = pbr(timber(83, { boards: 3, base: 0x8b5b3b, grey: 0.3 }), { repeat: [0.25, 0.25], ns: 0.7 });

  // tower legs: clusters of riveted cells rising from far below to the work level (y = 0)
  const legs = new THREE.Group();
  for (const sx of [-1, 1]) {
    for (let i = 0; i < 3; i++) for (let j = -2; j <= 2; j++) {
      const top = (i + j) % 2 === 0 ? -0.05 : -0.8 - R() * 1.6;
      const h = 90;
      mesh(boxM(1.25, h, 1.25, 1), stM2, { pos: [sx * (BR.legX + 0.2 + i * 1.28), top - h / 2, j * 1.28 - 1.5], parent: legs });
    }
  }
  // portal struts between the legs below the deck
  for (const y of [-7, -19, -34]) for (const z of [-4.2, 1.2]) mesh(boxM(5.0, 1.6, 0.9, 1), stM2, { pos: [0, y, z], parent: legs });
  scene.add(legs);
  // stamped plate on a cell top (the only type at this height): mill mark
  const stampPlate = decal(0.5, 0.26, (c) => {
    printText(c, ['BETHLEHEM'], { size: 150, y: 0.32, style: 'stamp', color: '#4b4845', seed: 81, track: 4 });
    printText(c, ['G.G.B. · 1933 · 74-S'], { size: 110, y: 0.75, style: 'stamp', color: '#4b4845', seed: 82 });
  }, { res: 1024, rough: 0.7, opacity: 0.85 });
  stampPlate.rotation.x = -Math.PI / 2; stampPlate.position.set(BR.legX - 1.08 + 0.05, 0.002, -1.5 - 1.08 + 0.25); scene.add(stampPlate);
  // work deck (planks on steel) between the legs + rail
  const deck = new THREE.Group();
  for (let k = 0; k < 22; k++) mesh(boxM(0.22, 0.05, 4.2, 0.6), plankM, { pos: [-2.3 + k * 0.215, 0.025, -1.5], rot: [0, (R() - 0.5) * 0.01, 0], parent: deck });
  for (const z of [-3.55, 0.55]) mesh(boxM(4.8, 0.3, 0.25), stM, { pos: [0, -0.17, z], parent: deck });
  for (let x = -2.3; x <= 2.3; x += 0.9) mesh(boxM(0.05, 1.05, 0.05), plankM, { pos: [x, 0.55, 0.6], parent: deck });
  mesh(boxM(4.7, 0.06, 0.06), plankM, { pos: [0, 1.05, 0.6], parent: deck });
  mesh(boxM(4.7, 0.05, 0.05), plankM, { pos: [0, 0.55, 0.6], parent: deck });
  scene.add(deck);
  // an upper beam (iron2 works up here) spanning the legs
  const beam = mesh(boxM(5.4, 0.5, 0.42, 1), stM2, { pos: [0, 2.6, -1.2], parent: scene });
  // derrick: mast + boom + guy lines
  const der = new THREE.Group();
  mesh(boxM(0.28, 9, 0.28, 1), stM, { pos: [0, 4.5, 0], parent: der });
  const boom = mesh(boxM(0.22, 11, 0.22, 1), stM, { pos: [0, 5.5, 0], parent: der });
  boom.geometry.translate(0, 0, 0); boom.position.set(0, 0.8, 0); boom.rotation.set(0, 0, 0);
  const bg = new THREE.Group(); bg.add(boom); boom.position.set(0, 5.5, 0); bg.position.set(0, 0.6, 0); bg.rotation.set(0.95, 0.4, 0); der.add(bg);
  der.position.set(-3.6, 0, -3.2); scene.add(der);
  const lineM = new THREE.LineBasicMaterial({ color: 0x3a3430 });
  const line = (a, b) => scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(...a), new THREE.Vector3(...b)]), lineM));
  line([-3.6, 9, -3.2], [6, 0, -14]); line([-3.6, 9, -3.2], [-12, 0, 6]); line([-3.6, 9, -3.2], [4, 0, 8]);
  // catwalk cables sweeping down to the north (toward -Z, far)
  for (const dx of [-1.2, 1.2]) {
    const pts = []; for (let k = 0; k <= 60; k++) { const u = k / 60, z = -2 - u * 1280; const y = -1 - 220 * (1 - (2 * u - 1) ** 2) * 0 - 600 * u * (1 - u) * 0.35 + (u > 0.97 ? 0 : 0); pts.push(new THREE.Vector3(dx, y - 140 * Math.sin(u * Math.PI) , z)); }
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lineM));
  }
  // the bay: waves far below, fog banks, Marin hills, the north tower
  const water = new THREE.Mesh(new THREE.PlaneGeometry(8000, 8000, 1, 1), new THREE.MeshPhysicalMaterial({ color: 0x3e5a66, roughness: 0.12, metalness: 0.0, clearcoat: 0.6, envMapIntensity: 1.2 }));
  water.rotation.x = -Math.PI / 2; water.position.y = -227; water.receiveShadow = false; scene.add(water);
  const hills = new THREE.PlaneGeometry(4000, 600, 200, 30), hp = hills.attributes.position, hn = noise2(9);
  for (let i = 0; i < hp.count; i++) { const x = hp.getX(i), y = hp.getY(i) + 300; const ridge = 260 * hn.fbm(x * 0.0012, 0.3, 5); hp.setXYZ(i, x, Math.min(y, ridge) - 227, -y * 0.4); }
  hills.computeVertexNormals();
  mesh(hills, new THREE.MeshStandardMaterial({ color: 0x7a7a52, roughness: 1 }), { pos: [0, 0, -1500], parent: scene, cast: false });
  const north = new THREE.Group(), nM = new THREE.MeshStandardMaterial({ color: 0x7a4a36, roughness: 0.8 });
  for (const sx of [-1, 1]) mesh(boxM(10, 230, 16), nM, { pos: [sx * 14, -112, 0], parent: north, cast: false });
  for (const y of [-20, -90, -160]) mesh(boxM(28, 8, 6), nM, { pos: [0, y, 0], parent: north, cast: false });
  north.position.set(10, 0, -1280); scene.add(north);
  // fog banks: soft billboards layered over the water
  const fogTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'); const n = noise2(4); const img = x.createImageData(256, 256);
    for (let j = 0; j < 256; j++) for (let i = 0; i < 256; i++) { const dx = (i - 128) / 128, dy = (j - 128) / 128, d = Math.hypot(dx, dy * 1.6); const a = Math.max(0, 1 - d) ** 1.5 * (0.55 + 0.45 * n.fbm(i / 40, j / 40, 4)); const o = (j * 256 + i) * 4; img.data[o] = img.data[o + 1] = img.data[o + 2] = 255; img.data[o + 3] = a * 255; }
    x.putImageData(img, 0, 0); const t = new THREE.CanvasTexture(c); return t; })();
  const fogM = new THREE.MeshBasicMaterial({ map: fogTex, transparent: true, depthWrite: false, color: 0xffe2c8, opacity: 0.8, fog: false });
  for (let k = 0; k < 40; k++) { const f = mesh(new THREE.PlaneGeometry(1, 1), fogM, { parent: scene, cast: false, recv: false }); f.position.set((R() - 0.5) * 2400, -200 + R() * 40, -300 - R() * 1600); f.scale.set(400 + R() * 600, 60 + R() * 60, 1); f.renderOrder = -1; }
  // the sign, its post, nails and a hammer
  const post = mesh(boxM(0.12, 1.6, 0.12, 0.6), plankM, { pos: [-1.55, 0.8, -0.05], parent: scene });
  const sign = new THREE.Group();
  mesh(boxM(0.82, 0.38, 0.03, 0.5), pbr(timber(84, { boards: 2, base: 0xe5dfd0, grey: 0.1 }), { repeat: [1, 1], ns: 0.6 }), { parent: sign });
  const signTxt = decal(0.78, 0.34, (c) => {
    printText(c, ['HARD HAT'], { size: 250, y: 0.32, color: '#4b4845', seed: 91, wear: 0.2 });
    printText(c, ['AREA'], { size: 230, y: 0.77, color: '#4b4845', seed: 92, wear: 0.2 });
  }, { res: 1024, rough: 0.8 });
  signTxt.position.z = 0.016; sign.add(signTxt);
  scene.add(sign);
  const hammer = new THREE.Group();
  mesh(new THREE.CylinderGeometry(0.013, 0.016, 0.33, 10), plankM, { pos: [0, 0.165, 0], parent: hammer });
  mesh(boxM(0.035, 0.035, 0.13), new THREE.MeshStandardMaterial({ color: 0x5a524a, metalness: 0.9, roughness: 0.35 }), { pos: [0, 0.33, 0.02], parent: hammer });
  scene.add(hammer);
  // rivet gun / bucking bar + rivets
  const rivetM = new THREE.MeshStandardMaterial({ color: 0x5a524a, metalness: 0.9, roughness: 0.4 });
  const rivet = new THREE.Group(); mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.07, 10), rivetM, { pos: [0, -0.035, 0], parent: rivet }); mesh(new THREE.SphereGeometry(0.018, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), rivetM, { parent: rivet }); scene.add(rivet);
  const gun = new THREE.Group(); mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.32, 14), rivetM, { pos: [0, 0.16, 0], parent: gun }); mesh(boxM(0.05, 0.12, 0.05), rivetM, { pos: [0, 0.3, 0.05], parent: gun }); scene.add(gun);
  const gusset = mesh(boxM(0.03, 1.4, 1.1, 1), stM, { pos: [1.55, 0.7, -0.9], parent: scene });
  void gusset;
  const bucket = mesh(new THREE.CylinderGeometry(0.13, 0.11, 0.24, 16), rivetM, { pos: [1.0, 0.12, -0.3], parent: scene });
  void bucket; void scatter; void beam;
  // workers + their hats
  const i1 = cast.iron1, i2 = cast.iron2, i3 = cast.iron3;
  for (const h of [i1, i2, i3]) scene.add(h.group);
  const hats = { i1: makeHat('boiled'), i2: makeHat('boiled'), i3: makeHat('boiled') };
  return {
    name: 'bridge', scene, sky, i1, i2, i3, hats, sign, post, hammer, rivet, gun, beam, stampPlate,
    reset() { for (const h of [i1, i2, i3]) h.reset(); },
  };
}
