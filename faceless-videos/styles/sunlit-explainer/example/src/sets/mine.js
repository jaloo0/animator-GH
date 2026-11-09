// A mine portal in the hills: timber-framed adit in a sunlit rock face, rails on sleepers, an ore cart,
// loose rock — and the miner in a soft cloth cap. Pebbles + dust trickle from the header (C3).
import * as THREE from 'three';
import { makeSky } from '../core/sky.js';
import { dirt, rock, timber, noise2, rng } from '../core/tex.js';
import { pbr, mesh, boxM, scatter } from '../props/kit.js';
import { makeHat } from '../props/hats.js';
import { makeMotes } from './trench.js';

export const MINE = { portalZ: -1.0, w: 1.7, h: 2.15 };

export function buildMine(renderer, cast) {
  const scene = new THREE.Scene();
  const sky = makeSky(renderer, { az: 58, el: 11, top: 0x4b8fd0, mid: 0x93c2ea, haze: 0xf4dcb8, ground: 0x9a7a58, sunI: 4.6, cloud: 0.5, groundBounce: 0.7 });
  scene.add(sky.dome, sky.sun, sky.sun.target); scene.environment = sky.env; scene.environmentIntensity = 0.55;
  scene.fog = new THREE.Fog(0xead6b8, 40, 300);
  const R = rng(33), Z = MINE.portalZ;
  const rockT = rock(71, { base: 0x9a8268 }), rockM = pbr(rockT, { repeat: [10, 2], ns: 1.6 });
  const woodM = pbr(timber(72, { boards: 2, base: 0x8b5b3b, grey: 0.35 }), { repeat: [0.6, 0.6], ns: 1.5 });
  // ground
  const gg = new THREE.PlaneGeometry(200, 200, 100, 100); gg.rotateX(-Math.PI / 2);
  const n = noise2(3), gp = gg.attributes.position;
  for (let i = 0; i < gp.count; i++) { const x = gp.getX(i), z = gp.getZ(i); gp.setY(i, (n.fbm(x * 0.06, z * 0.06, 4) - 0.5) * 1.2 * Math.min(1, Math.hypot(x, z - 5) / 12) + (n(x * 0.8, z * 0.8) - 0.5) * 0.06); }
  gg.computeVertexNormals();
  mesh(gg, pbr(dirt(73, { base: 0x9a7a58, pebbles: 0.8 }), { repeat: [70, 70], ns: 2 }), { parent: scene, cast: false });
  // hillside: a displaced slab rising behind the portal, with a cut face
  const hg = new THREE.PlaneGeometry(60, 9, 200, 60);
  const hp = hg.attributes.position, hn = noise2(5);
  for (let i = 0; i < hp.count; i++) {
    const x = hp.getX(i), y = hp.getY(i) + 4.5; // 0..9 up the slope
    const face = Math.exp(-(x * x) / 40) * Math.exp(-y / 4);
    let zz = -y * 1.1 * (1 - 0.75 * face) - (hn.fbm(x * 0.15, y * 0.15, 5) - 0.5) * 1.8 - (hn(x * 1.3, y * 1.3) - 0.5) * 0.2;
    // the mouth of the adit: push the face back where the tunnel opens
    const mx = Math.max(0, Math.abs(x) - (MINE.w / 2 + 0.05)), my = Math.max(0, y - 0.3 - MINE.h);
    if (mx === 0 && my === 0) zz -= 3.0;
    hp.setXYZ(i, x, y, zz);
  }
  hg.computeVertexNormals();
  mesh(hg, rockM, { pos: [0, -0.3, Z - 0.05], parent: scene });
  // the adit: dark tunnel box + timber set (posts, cap, lagging)
  const W = MINE.w, H = MINE.h;
  mesh(boxM(W + 0.1, H + 0.3, 7.6, 1), new THREE.MeshStandardMaterial({ color: 0x2e2824, roughness: 1, side: THREE.BackSide }), { pos: [0, H / 2, Z - 4.0], parent: scene, cast: false });
  // cut the hillside visually with a dark opening plane
  mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshBasicMaterial({ color: 0x0e0c0b }), { pos: [0, H / 2, Z - 2.5], parent: scene, cast: false });
  for (const x of [-W / 2 - 0.08, W / 2 + 0.08]) mesh(new THREE.CylinderGeometry(0.12, 0.13, H + 0.2, 12), woodM, { pos: [x, (H + 0.2) / 2 - 0.1, Z + 0.05], rot: [0, 0, x > 0 ? -0.06 : 0.06], parent: scene });
  const header = mesh(new THREE.CylinderGeometry(0.14, 0.14, W + 0.7, 12), woodM, { pos: [0, H + 0.1, Z + 0.05], rot: [0, 0, Math.PI / 2], parent: scene });
  for (let k = 0; k < 7; k++) mesh(boxM(W + 0.5, 0.06, 0.18, 0.6), woodM, { pos: [0, H + 0.26, Z + 0.15 - k * 0.22], rot: [(R() - 0.5) * 0.06, 0, 0], parent: scene });
  // rock rim around the opening
  scene.add(scatter(new THREE.DodecahedronGeometry(0.3, 2), pbr(rock(74, { base: 0x8e7a62 }), { repeat: [1, 1], ns: 1 }), 26, (o, i, Rr) => { const a = Rr() * Math.PI; const r = 1.4 + Rr() * 0.5; o.position.set(Math.cos(a) * r * 0.9, H * 0.5 + Math.sin(a) * r * 1.1, Z - 0.1 - Rr() * 0.3); o.scale.set(0.6 + Rr(), 0.5 + Rr() * 0.8, 0.5 + Rr()); o.rotation.set(Rr() * 3, Rr() * 3, Rr() * 3); }));
  // rails + sleepers out of the adit
  const railM = new THREE.MeshStandardMaterial({ color: 0x5a4a3e, roughness: 0.5, metalness: 0.8 });
  for (const x of [-0.3, 0.3]) mesh(boxM(0.05, 0.08, 16), railM, { pos: [x, 0.13, Z + 4], parent: scene });
  for (let z = Z - 4; z < Z + 12; z += 0.55) mesh(boxM(0.95, 0.09, 0.16, 0.6), woodM, { pos: [(R() - 0.5) * 0.03, 0.045, z], rot: [0, (R() - 0.5) * 0.06, 0], parent: scene });
  // ore cart
  const cart = new THREE.Group(), steelM = new THREE.MeshStandardMaterial({ color: 0x6a5446, roughness: 0.6, metalness: 0.6 });
  const tub = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.5, 0.55, 4, 1, true), steelM); tub.rotation.y = Math.PI / 4; tub.scale.set(1, 1, 1.35); tub.position.y = 0.6; tub.castShadow = true; tub.material.side = THREE.DoubleSide; cart.add(tub);
  mesh(boxM(0.72, 0.04, 0.95), steelM, { pos: [0, 0.34, 0], parent: cart });
  for (const x of [-0.3, 0.3]) for (const z of [-0.32, 0.32]) mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.05, 20), railM, { pos: [x, 0.2, z], rot: [0, 0, Math.PI / 2], parent: cart });
  const ore = mesh(new THREE.SphereGeometry(0.45, 16, 10), rockM, { pos: [0, 0.78, 0], scale: [1, 0.35, 1.2], parent: cart });
  void ore;
  scene.add(cart);
  // loose rocks + scrub
  scene.add(scatter(new THREE.DodecahedronGeometry(0.12, 0), rockM, 90, (o, i, Rr) => { o.position.set((Rr() - 0.5) * 9, 0.02, Z + Rr() * 9); if (Math.abs(o.position.x) < 0.7) o.position.x += 1.4 * Math.sign(o.position.x || 1); o.scale.setScalar(0.4 + Rr() * 1.4); o.rotation.set(Rr() * 3, Rr() * 3, 0); }));
  scene.add(scatter(new THREE.IcosahedronGeometry(0.35, 1), new THREE.MeshStandardMaterial({ color: 0x7a7448, roughness: 1 }), 30, (o, i, Rr) => { o.position.set((Rr() > 0.5 ? 1 : -1) * (2 + Rr() * 6), 0.15, Z + Rr() * 10); o.scale.set(0.8 + Rr(), 0.5 + Rr() * 0.5, 0.8 + Rr()); }));
  // pebbles that fall from the header
  const pebGeo = new THREE.DodecahedronGeometry(0.012, 0), pebbles = [];
  for (let k = 0; k < 14; k++) { const p = mesh(pebGeo, rockM, { parent: scene }); p.scale.setScalar(0.6 + R() * 1.4); pebbles.push(p); }
  const dust = makeMotes(160, [-0.6, 1.4, Z - 0.4], [0.6, 2.3, Z + 0.6]); dust.material.uniforms.uCol.value.set(0xd8b890); scene.add(dust);
  const miner = cast.miner; scene.add(miner.group);
  const cap = makeHat('cap'); scene.add(cap.group);
  return {
    name: 'mine', scene, sky, cart, miner, cap, pebbles, header, dust,
    reset() { miner.reset(); },
    update(t) { dust.material.uniforms.uTime.value = t; },
  };
}
