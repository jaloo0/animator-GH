// Inside the crater: a molten lava lake (fine mesh near the bomb for ripples), glowing basalt walls, drifting crust
// rafts, rising fumes; the floating bomb + heat gauge; the density balance on a basalt island.
import * as THREE from 'three';
import { makeSky } from '../core/sky.js';
import { rock, canvas, printText, toTex } from '../core/tex.js';
import { pbr, mesh, decal, boxM } from '../props/kit.js';
import { lavaMaterial, addLavaGlow, particles, craggy, GLSL_NOISE, GLSL_LAVA } from './fx.js';
import { makeBomb } from '../props/bomb.js';

export const ISLAND = new THREE.Vector3(26, 0, 18);

export function buildCrater(renderer) {
  const scene = new THREE.Scene();
  const sky = makeSky(renderer, { az: 35, el: 38, top: 0x0b2f9a, mid: 0x2a63d6, haze: 0xbfd6f2, ground: 0x3a2a22, sunCol: 0xfff1dc, sunI: 3.4, cloud: 0.35, glow: 0.6, groundBounce: 0.25 });
  scene.add(sky.dome, sky.sun, sky.sun.target); scene.environment = sky.env;
  scene.fog = new THREE.Fog(0x6a4a40, 140, 700);
  scene.add(new THREE.HemisphereLight(0x6f8fd0, 0x5a1c08, 0.5));
  const under = new THREE.DirectionalLight(0xff5a14, 2.2); under.position.set(0.3, -1, 0.2); scene.add(under, under.target);

  // lava lake — dense in the middle (≈8 cm) for ripples, coarse at the edge
  const lg = new THREE.PlaneGeometry(2, 2, 300, 300); lg.rotateX(-Math.PI / 2);
  const p = lg.attributes.position; const f = (u) => Math.sign(u) * (12 * Math.abs(u) + 118 * Math.abs(u) ** 3);
  for (let i = 0; i < p.count; i++) p.setXYZ(i, f(p.getX(i)), 0, f(p.getZ(i)));
  const lava = lavaMaterial({ scale: 0.55, crust: 0.5, swell: 0.05 });
  const lake = mesh(lg, lava, { cast: false, recv: false }); scene.add(lake);

  // crater walls
  const wallPts = [[58, -4], [60, 2], [63, 9], [66, 18], [70, 30], [74, 40], [79, 46], [95, 47], [140, 44]].map(([r, y]) => new THREE.Vector2(r, y));
  const wg = craggy(new THREE.LatheGeometry(wallPts, 160), 5, 0.06, 3);
  const rt = rock(13, { base: 0x4b4542 });
  const wallMat = addLavaGlow(pbr(rt, { repeat: [24, 3], color: 0xffffff, rough: 0.95, side: THREE.DoubleSide }), { col: 0xff3a06, strength: 0.9, fall: 0.22, base: 0 });
  const walls = mesh(wg, wallMat, { cast: false }); scene.add(walls);

  // crust rafts
  const raftMat = addLavaGlow(pbr(rock(21, { base: 0x2c2826 }), { repeat: [2, 2], rough: 0.95 }), { col: 0xff5010, strength: 2.4, fall: 3.5, base: -0.1 });
  const rafts = [];
  const RR = [[7, -9, 2.2], [-9, -14, 3.4], [-13, 4, 2.6], [12, 9, 1.8], [-4, 16, 2.8], [18, -20, 4.2], [-24, -6, 3.6], [6, 26, 3.0], [-20, 22, 4.4], [30, -2, 3.2], [-34, -26, 5.0], [24, 34, 4.0]];
  RR.forEach(([x, z, s], k) => {
    const g = craggy(new THREE.DodecahedronGeometry(1, 2), 0.25, 1.4, k + 5); g.scale(s, s * 0.22, s * 0.8);
    const m = mesh(g, raftMat, { pos: [x, 0.05, z], rot: [0, k * 1.7, 0] }); m.userData.base = [x, z, k]; rafts.push(m); scene.add(m);
  });

  // fumes rising off the lake
  const fumes = particles({ count: 60, origin: [0, 0.5, 0], spread: [55, 0.3, 55], dir: [0, 1, 0], cone: 0.3, speed: [0.3, 0.8], rise: 1.4, turb: 0.4, life: [7, 11],
    birthFn: (u, R) => -11 + u * 45, size: [4, 10], colA: 0x8a7a72, colB: 0x7a7270, alpha: 0.07, lit: 0.6, glow: 0xff5a1a, glowK: 0.3, seed: 3, spreadRate: 0.02 });
  { // keep the fumes away from the hero area (bomb at the origin, island at ISLAND)
    const off = fumes.geometry.attributes.aOff;
    for (let i = 0; i < off.count; i++) { let x = off.getX(i), z = off.getZ(i); for (const [cx, cz] of [[0, 0], [ISLAND.x, ISLAND.z]]) { const d = Math.hypot(x - cx, z - cz); if (d < 16) { const s = 16 / Math.max(d, 0.5); x = cx + (x - cx) * s; z = cz + (z - cz) * s; } } off.setXYZ(i, x, off.getY(i), z); }
  }
  scene.add(fumes);

  // ---- the bomb + its effects
  const bomb = makeBomb(); scene.add(bomb.group);
  const splash = particles({ count: 160, origin: [0, 0.1, 0], spread: [0.3, 0, 0.3], dir: [0, 1, 0], cone: 0.75, speed: [3, 9], gravity: -9.8, drag: 0.4, life: [0.6, 1.3],
    birth: [2.93, 3.02], size: [0.11, 0.05], colA: 0xffa040, colB: 0xff3a08, intA: 9, intB: 2.5, additive: true, soft: 0, seed: 11, stretch: 0.06, ground: -0.05 });
  const splashSmoke = particles({ count: 26, origin: [0, 0.4, 0], spread: [0.4, 0.1, 0.4], dir: [0, 1, 0], cone: 1.0, speed: [0.5, 1.6], drag: 1.6, rise: 0.9, life: [1.6, 2.6],
    birth: [2.95, 3.1], size: [0.6, 2.2], colA: 0x8c8480, colB: 0x6d6a68, alpha: 0.55, glow: 0xff6a20, glowK: 1.5, seed: 12 });
  const sparks = particles({ count: 220, origin: [-0.62, 0.1, 0], spread: [0.15, 0.04, 0.1], dir: [0, 1, 0], cone: 1.2, speed: [0.4, 1.4], gravity: -2.5, life: [0.15, 0.45],
    birth: [10.66, 11.6], size: [0.014, 0.004], colA: 0xfff0b0, colB: 0xff8a20, intA: 14, intB: 4, additive: true, soft: 0, seed: 21, stretch: 0.08, order: 9 });
  const puff = particles({ count: 40, origin: [0.4, 0.25, 0], spread: [0.25, 0.05, 0.15], dir: [0, 1, 0], cone: 0.9, speed: [0.4, 1.4], drag: 1.8, rise: 0.55, turb: 0.08, life: [2.2, 3.8],
    birth: [17.12, 17.45], size: [0.25, 1.3], colA: 0x9d9894, colB: 0x7c7876, alpha: 0.75, glow: 0xff7a30, glowK: 1.2, seed: 31 });
  const dust = particles({ count: 650, origin: [0.62, 0.2, 0], spread: [0.15, 0.08, 0.15], dir: [0.2, 1, 0.1], cone: 1.1, speed: [0.1, 0.55], drag: 0.6, rise: 0.22, turb: 0.2, life: [2.4, 4.2],
    birth: [17.35, 21.5], size: [0.011, 0.03], colA: 0xe6ff70, colB: 0xa8e040, intA: 3.2, intB: 1.4, alpha: 0.9, soft: 0, additive: true, seed: 41, lit: 0.0 });
  const haze = particles({ count: 50, origin: [0.62, 0.25, 0], spread: [0.2, 0.1, 0.2], dir: [0.2, 1, 0.1], cone: 1.0, speed: [0.1, 0.3], drag: 0.8, rise: 0.15, turb: 0.15, life: [2.5, 4],
    birth: [17.35, 21.5], size: [0.2, 0.9], colA: 0xb8d060, colB: 0x8a9a50, intA: 0.6, alpha: 0.18, seed: 43, lit: 0.0 });
  const pop = particles({ count: 60, origin: [0.55, 0.15, 0], spread: [0.05, 0.02, 0.05], dir: [0, 1, 0], cone: 1.3, speed: [1, 3], gravity: -4, life: [0.2, 0.55],
    birth: [17.12, 17.2], size: [0.02, 0.006], colA: 0xfff0c0, colB: 0xff9030, intA: 12, intB: 3, additive: true, soft: 0, seed: 51, stretch: 0.06 });
  scene.add(splash, splashSmoke, sparks, puff, dust, haze, pop);
  // the sparks/pop/dust live in the bomb's frame (it floats in place at the origin while they play)

  // ---- heat gauge on a probe stuck in the lava next to the bomb
  const gauge = new THREE.Group(); scene.add(gauge);
  const steelM = new THREE.MeshStandardMaterial({ color: 0x9a9c9a, metalness: 0.85, roughness: 0.32 });
  mesh(new THREE.CylinderGeometry(0.018, 0.018, 1.4, 12), steelM, { parent: gauge, pos: [0, -0.2, 0] });
  const bez = mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.06, 48), steelM, { parent: gauge, pos: [0, 0.55, 0], rot: [Math.PI / 2, 0, 0] });
  const faceC = canvas(512, 512); paintDial(faceC);
  const face = mesh(new THREE.CircleGeometry(0.145, 64), new THREE.MeshStandardMaterial({ map: toTex(faceC, { wrap: false }), roughness: 0.5 }), { parent: gauge, pos: [0, 0.55, 0.031] });
  const needle = new THREE.Group(); needle.position.set(0, 0.55, 0.036); gauge.add(needle);
  mesh(new THREE.BoxGeometry(0.008, 0.115, 0.004).translate(0, 0.045, 0), new THREE.MeshStandardMaterial({ color: 0xc8261c, roughness: 0.4 }), { parent: needle });
  mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.01, 16), steelM, { parent: needle, rot: [Math.PI / 2, 0, 0] });
  const glass = mesh(new THREE.CircleGeometry(0.15, 48), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.12, roughness: 0.05, metalness: 0 }), { parent: gauge, pos: [0, 0.55, 0.045], cast: false });
  gauge.position.set(0.9, 0, 0.75); gauge.rotation.set(0, -0.35, -0.12);

  // ---- density balance on a basalt island
  const island = new THREE.Group(); island.position.copy(ISLAND); scene.add(island);
  const isl = craggy(new THREE.CylinderGeometry(3.2, 3.8, 1.4, 48, 4), 0.25, 1.1, 9); isl.translate(0, 0.1, 0);
  mesh(isl, addLavaGlow(pbr(rock(31, { base: 0x3a3532 }), { repeat: [3, 1] }), { col: 0xff4a10, strength: 2.2, fall: 2.2, base: 0 }), { parent: island });
  const bal = buildBalance(); bal.group.position.set(0, 0.8, 0); island.add(bal.group);

  function paintDial(c) {
    const x = c.getContext('2d'), W = c.width, cx = W / 2;
    x.fillStyle = '#eee9dc'; x.fillRect(0, 0, W, W);
    x.strokeStyle = '#1f2122'; x.fillStyle = '#1f2122'; x.lineCap = 'round';
    for (let v = 0; v <= 1200; v += 50) {
      const a = (-135 + v / 1200 * 270) * Math.PI / 180, big = v % 200 === 0;
      x.lineWidth = big ? 7 : 3;
      x.beginPath(); x.moveTo(cx + Math.sin(a) * W * 0.42, cx - Math.cos(a) * W * 0.42); x.lineTo(cx + Math.sin(a) * W * (big ? 0.34 : 0.38), cx - Math.cos(a) * W * (big ? 0.34 : 0.38)); x.stroke();
      if (big) { x.font = 'bold 34px Rockwell'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(String(v), cx + Math.sin(a) * W * 0.27, cx - Math.cos(a) * W * 0.27); }
    }
    // red zone 1000–1200
    x.strokeStyle = '#c8261c'; x.lineWidth = 14; x.beginPath(); x.arc(cx, cx, W * 0.45, (-90 - 135 + 1000 / 1200 * 270) * Math.PI / 180, (-90 + 135) * Math.PI / 180); x.stroke();
    x.fillStyle = '#1f2122'; x.font = 'bold 40px Rockwell'; x.textAlign = 'center'; x.fillText('°C', cx, cx + W * 0.2);
    x.font = 'bold 22px Rockwell'; x.fillText('PYROMETER', cx, cx + W * 0.3);
  }

  const set = {
    name: 'crater', scene, sky, lava, lake, rafts, bomb, gauge, needle, balance: bal, island, under,
    fx: { splash, splashSmoke, sparks, puff, dust, haze, pop, fumes },
    reset(t) {
      bomb.reset();
      bomb.group.position.set(0, -0.07, 0); bomb.group.rotation.set(0, 0, 0);
      lava.uniforms.uImpact.value.set(0, 0, -99, 0);
      for (const k of Object.values(set.fx)) k.userData.U.uMaster.value = 1;
      bal.reset(); gauge.visible = false; bomb.group.visible = true;
    },
    update(t) {
      lava.uniforms.uTime.value = t;
      for (const k of Object.values(set.fx)) k.update(t);
      rafts.forEach((m) => { const [x, z, k] = m.userData.base; m.position.set(x + Math.sin(t * 0.05 + k) * 0.8 + t * 0.06, 0.05 + 0.04 * Math.sin(t * 0.8 + k), z + Math.cos(t * 0.04 + k) * 0.6); m.rotation.y = k * 1.7 + t * 0.01 * ((k % 3) - 1); });
    },
  };
  return set;
}

// --- the balance: base + post + pivoting beam + two hanging pans; lava cube left, water cubes right
function buildBalance() {
  const group = new THREE.Group();
  const brass = new THREE.MeshStandardMaterial({ color: 0xc9a25a, metalness: 0.9, roughness: 0.3 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2b2d2e, metalness: 0.5, roughness: 0.45 });
  mesh(boxM(1.8, 0.14, 0.8), dark, { parent: group, pos: [0, 0.07, 0] });
  mesh(new THREE.CylinderGeometry(0.05, 0.07, 2.0, 24), brass, { parent: group, pos: [0, 1.1, 0] });
  const beam = new THREE.Group(); beam.position.set(0, 2.12, 0); group.add(beam);
  mesh(new THREE.BoxGeometry(2.6, 0.07, 0.07), brass, { parent: beam });
  mesh(new THREE.ConeGeometry(0.07, 0.16, 4), brass, { parent: beam, pos: [0, -0.09, 0], rot: [Math.PI, 0, 0] });
  const pans = [];
  for (const sx of [-1, 1]) {
    const hang = new THREE.Group(); hang.position.set(sx * 1.25, 0, 0); beam.add(hang);
    const pan = new THREE.Group(); hang.add(pan);
    for (let k = 0; k < 3; k++) {
      const a = k * Math.PI * 2 / 3 + 0.5, top = new THREE.Vector3(0, 0, 0), bot = new THREE.Vector3(Math.cos(a) * 0.36, -1.3, Math.sin(a) * 0.36);
      const rod = mesh(new THREE.CylinderGeometry(0.006, 0.006, top.distanceTo(bot), 6), brass, { parent: pan });
      rod.position.copy(top).lerp(bot, 0.5); rod.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), bot.clone().sub(top).normalize());
    }
    mesh(new THREE.CylinderGeometry(0.42, 0.36, 0.05, 48), brass, { parent: pan, pos: [0, -1.3, 0] });
    pans.push({ hang, pan });
  }
  // lava cube (left): lava shader on the box, sampling world xyz
  const lavaCubeMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: /* glsl */`varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */`uniform float uTime; varying vec3 vP; ${GLSL_NOISE} ${GLSL_LAVA}
      void main(){ vec2 p = vP.xz * 3.0 + vP.yy * 2.4 + vP.xy * 1.5; gl_FragColor = vec4(lavaColor(p, uTime, 0.75, 0.75), 1.0); }`,
  });
  const S = 0.42;
  const lavaCube = mesh(new THREE.BoxGeometry(S, S, S, 8, 8, 8), lavaCubeMat, { parent: pans[0].pan, pos: [0, -1.3 + 0.025 + S / 2, 0] });
  const waterMat = new THREE.MeshPhysicalMaterial({ color: 0x3f9fff, roughness: 0.04, metalness: 0, transparent: true, opacity: 0.62, clearcoat: 1, envMapIntensity: 1.6 });
  const waters = [0, 1, 2].map((k) => mesh(new THREE.BoxGeometry(S, S, S), waterMat, { parent: pans[1].pan, pos: [0, -1.3 + 0.025 + S / 2, 0] }));
  // plaques
  const plaque = (lines) => decal(0.62, 0.24, (c) => { const x = c.getContext('2d'); x.fillStyle = '#efeadf'; x.fillRect(0, 0, c.width, c.height); x.strokeStyle = '#1f2122'; x.lineWidth = 10; x.strokeRect(8, 8, c.width - 16, c.height - 16);
    printText(c, [lines[0]], { size: 150, y: 0.36, color: '#1f2122', wear: 0.1 }); printText(c, [lines[1]], { size: 96, y: 0.74, color: '#1f2122', wear: 0.1 }); }, { res: 1024 });
  const pl = plaque(['LAVA', '2.7 g/cm³']); pl.position.set(-0.55, 0.08, 0.42); pl.rotation.x = -0.25; group.add(pl);
  const pr = plaque(['WATER', '1.0 g/cm³']); pr.position.set(0.55, 0.08, 0.42); pr.rotation.x = -0.25; group.add(pr);
  return {
    group, beam, pans, lavaCube, waters, lavaCubeMat,
    reset() { beam.rotation.z = 0; waters.forEach((w) => (w.visible = false)); },
    /** a = beam tilt (rad, + = left pan down); keeps the pans hanging level */
    tilt(a) { beam.rotation.z = a; pans.forEach((p) => (p.hang.rotation.z = -a)); },
  };
}
