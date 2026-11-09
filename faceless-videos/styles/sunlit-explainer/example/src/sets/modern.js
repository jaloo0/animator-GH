// Today: a sunlit job site at golden hour — concrete pipes, a coffee cup, a work light, stakes and string,
// a building frame and a tower crane in the haze. The worker in the orange vest, and the blue hard hat.
import * as THREE from 'three';
import { makeSky } from '../core/sky.js';
import { dirt, concrete, timber, noise2, rgb } from '../core/tex.js';
import { pbr, mesh, boxM, ringLathe, decal, printText, scatter } from '../props/kit.js';

export function buildModern(renderer, cast) {
  const scene = new THREE.Scene();
  const sky = makeSky(renderer, { az: -74, el: 12, top: 0x4a8fd2, mid: 0x8fc0ea, haze: 0xf4dcb8, ground: 0xa88a66, sunI: 4.2, cloud: 0.5, groundBounce: 0.8 });
  scene.add(sky.dome, sky.sun, sky.sun.target); scene.environment = sky.env; scene.environmentIntensity = 0.6;
  scene.fog = new THREE.Fog(0xe8d2b4, 40, 260);

  // ground (slight undulation)
  const gTex = dirt(31, { base: 0x9a7c5c, pebbles: 0.9 });
  const gg = new THREE.PlaneGeometry(240, 240, 120, 120); gg.rotateX(-Math.PI / 2);
  const n = noise2(5), gp = gg.attributes.position;
  for (let i = 0; i < gp.count; i++) { const x = gp.getX(i), z = gp.getZ(i), r = Math.hypot(x, z); gp.setY(i, (n.fbm(x * 0.08, z * 0.08, 4) - 0.5) * 0.5 * Math.min(1, r / 8)); }
  gg.computeVertexNormals();
  const ground = mesh(gg, pbr(gTex, { repeat: [80, 80], ns: 1.5 }), { parent: scene, cast: false });

  // concrete pipes (48" RCP): the hero pipe along X at the origin + a stack behind
  const cTex = concrete(12, { base: 0xcfcac0 });
  const cMat = pbr(cTex, { repeat: [2, 1], ns: 1.2 });
  const pipeGeo = ringLathe(0.5, 0.6, 2.44, 72); pipeGeo.rotateZ(Math.PI / 2);
  const pipes = [[0, 0.6, 0], [-2.7, 0.6, -0.4], [-1.35, 0.6, -2.0], [1.4, 0.6, -2.1], [0.0, 1.62, -2.05]];
  for (const p of pipes) mesh(pipeGeo, cMat, { pos: p, parent: scene });
  // stencil on the hero pipe's face (curved decal)
  const st = decal(1.1, 0.42, (c) => {
    printText(c, ['48" RCP  CL III'], { size: 150, y: 0.32, style: 'stencil', color: '#4b4845', seed: 3 });
    printText(c, ['ASTM C76 · 2026 · 8 FT'], { size: 92, y: 0.75, style: 'stencil', color: '#4b4845', seed: 4 });
  }, { curvedV: 0.606, res: 1024 });
  const stHold = new THREE.Group(); stHold.add(st); st.position.set(0, 0, 0.606); stHold.position.set(0.42, 0.6, 0); stHold.rotation.set(-0.42, 0, 0); scene.add(stHold);
  // wooden blocks chocking the pipes
  const wTex = timber(41, { boards: 3, base: 0x8b5b3b });
  const wMat = pbr(wTex, { repeat: [1, 1] });
  for (const [x, z] of [[-0.9, 0.55], [0.9, 0.55], [-0.9, -0.55], [0.9, -0.55]]) mesh(boxM(0.14, 0.1, 0.16), wMat, { pos: [x, 0.05, z], parent: scene });

  // coffee cup (paper, kraft sleeve, lid) on the pipe top — the soft foreground
  const cup = new THREE.Group();
  const cupBody = new THREE.LatheGeometry([new THREE.Vector2(0, 0), new THREE.Vector2(0.026, 0), new THREE.Vector2(0.0285, 0.004), new THREE.Vector2(0.0405, 0.13), new THREE.Vector2(0.0405, 0.133), new THREE.Vector2(0, 0.133)], 48);
  mesh(cupBody, new THREE.MeshStandardMaterial({ color: 0xe5dfd0, roughness: 0.55 }), { parent: cup });
  mesh(new THREE.CylinderGeometry(0.0385, 0.0345, 0.055, 48, 1, true), new THREE.MeshStandardMaterial({ color: 0xa47e56, roughness: 0.9, side: THREE.DoubleSide }), { pos: [0, 0.07, 0], scale: [1.03, 1, 1.03], parent: cup });
  mesh(new THREE.CylinderGeometry(0.043, 0.042, 0.012, 48), new THREE.MeshStandardMaterial({ color: 0xe9e4d8, roughness: 0.4 }), { pos: [0, 0.139, 0], parent: cup });
  mesh(new THREE.CylinderGeometry(0.036, 0.04, 0.008, 48), new THREE.MeshStandardMaterial({ color: 0xe9e4d8, roughness: 0.4 }), { pos: [0, 0.148, 0], parent: cup });
  cup.position.set(-0.3, 1.16, 0.43); cup.rotation.z = 0.04; scene.add(cup);

  // work light tower (tripod, mast, two lamp heads)
  const wl = new THREE.Group(), steelM = new THREE.MeshStandardMaterial({ color: 0x8d6a2f, roughness: 0.55, metalness: 0.4 }), darkM = new THREE.MeshStandardMaterial({ color: 0x4b4845, roughness: 0.5, metalness: 0.3 });
  for (let k = 0; k < 3; k++) { const a = (k / 3) * Math.PI * 2; const leg = mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.0), steelM, { parent: wl }); leg.position.set(Math.sin(a) * 0.32, 0.45, Math.cos(a) * 0.32); leg.lookAt(0, 0.95, 0); leg.rotateX(Math.PI / 2); }
  mesh(new THREE.CylinderGeometry(0.016, 0.016, 2.0), steelM, { pos: [0, 1.4, 0], parent: wl });
  mesh(new THREE.BoxGeometry(0.62, 0.03, 0.03), steelM, { pos: [0, 2.35, 0], parent: wl });
  for (const x of [-0.24, 0.24]) {
    const head = mesh(new THREE.BoxGeometry(0.2, 0.17, 0.09), darkM, { pos: [x, 2.47, 0.02], rot: [0.25, 0, 0], parent: wl });
    mesh(new THREE.PlaneGeometry(0.17, 0.14), new THREE.MeshStandardMaterial({ color: 0xe5dfd0, roughness: 0.2, emissive: 0xffe9c4, emissiveIntensity: 0.15 }), { pos: [0, 0, 0.046], parent: head });
  }
  wl.position.set(2.1, 0, -3.2); wl.rotation.y = -0.4; scene.add(wl);

  // stakes + string lines
  const stakeGeo = boxM(0.04, 0.6, 0.04), stakeM = pbr(wTex, { repeat: [0.3, 1] });
  const stakes = [[-3.6, -1.2], [-3.6, 1.8], [3.8, 1.8], [3.8, -4.5], [-6.5, -4.5]];
  stakes.forEach(([x, z]) => mesh(stakeGeo, stakeM, { pos: [x, 0.28, z], rot: [0.03 * x, 0, 0.04 * z], parent: scene }));
  const strM = new THREE.LineBasicMaterial({ color: 0xe5dfd0 });
  for (let i = 0; i < stakes.length - 1; i++) {
    const a = stakes[i], b = stakes[i + 1];
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(a[0], 0.5, a[1]), new THREE.Vector3(b[0], 0.5, b[1])]), strM));
  }
  // lumber stack
  for (let k = 0; k < 6; k++) mesh(boxM(3.0, 0.045, 0.14), wMat, { pos: [-4.8, 0.03 + Math.floor(k / 3) * 0.05, -2.4 + (k % 3) * 0.16], rot: [0, 0.05, 0], parent: scene });

  // background: a concrete building frame + a tower crane, softened by fog
  const frameM = pbr(cTex, { repeat: [1, 1], color: 0xd8d2c4 });
  const fb = new THREE.Group();
  for (let lv = 0; lv < 5; lv++) {
    mesh(boxM(26, 0.3, 14), frameM, { pos: [0, 3.6 * lv + 0.15, 0], parent: fb });
    if (lv < 4) for (let cx = -12; cx <= 12; cx += 6) for (const cz of [-6.5, 0, 6.5]) mesh(boxM(0.5, 3.3, 0.5), frameM, { pos: [cx, 3.6 * lv + 1.95, cz], parent: fb });
  }
  fb.position.set(-14, 0, -48); fb.rotation.y = 0.3; scene.add(fb);
  const crane = new THREE.Group(), cM = new THREE.MeshStandardMaterial({ color: 0x8d6a2f, roughness: 0.6, metalness: 0.3 });
  for (let y = 0; y < 52; y += 2) for (const [dx, dz] of [[-0.8, -0.8], [0.8, -0.8], [0.8, 0.8], [-0.8, 0.8]]) mesh(new THREE.BoxGeometry(0.12, 2.0, 0.12), cM, { pos: [dx, y + 1, dz], parent: crane, cast: false });
  for (let y = 0; y < 52; y += 2) { mesh(new THREE.BoxGeometry(1.7, 0.08, 0.08), cM, { pos: [0, y, 0.8], rot: [0, 0, 0.8], parent: crane, cast: false }); mesh(new THREE.BoxGeometry(0.08, 0.08, 1.7), cM, { pos: [0.8, y, 0], rot: [0.8, 0, 0], parent: crane, cast: false }); }
  mesh(new THREE.BoxGeometry(48, 1.2, 1.2), cM, { pos: [10, 53, 0], parent: crane, cast: false });
  mesh(new THREE.BoxGeometry(3, 2.5, 2.5), new THREE.MeshStandardMaterial({ color: 0xe5dfd0, roughness: 0.6 }), { pos: [0, 51.5, 0], parent: crane, cast: false });
  mesh(new THREE.CylinderGeometry(0.03, 0.03, 30), darkM, { pos: [24, 38, 0], parent: crane, cast: false });
  crane.position.set(30, 0, -95); crane.rotation.y = 0.6; scene.add(crane);
  // far tree line
  const treeGeo = new THREE.IcosahedronGeometry(1, 1), treeM = new THREE.MeshStandardMaterial({ color: 0x6b6a45, roughness: 1 });
  scene.add(scatter(treeGeo, treeM, 160, (o, i, R) => { const a = -1.2 + R() * 2.6, r = 120 + R() * 50; o.position.set(Math.sin(a) * r, 2 + R() * 2, -Math.cos(a) * r); o.scale.set(4 + R() * 5, 5 + R() * 6, 4 + R() * 5); }, { cast: false }));

  // the worker
  const worker = cast.worker; scene.add(worker.group);
  worker.group.position.set(0.04, 0, -0.84);

  return {
    name: 'modern', scene, sky, cup, worker, pipes,
    reset() { worker.reset(); },
  };
}
export { rgb };
