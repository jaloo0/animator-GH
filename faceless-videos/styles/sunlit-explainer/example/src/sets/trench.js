// 1918: a sunlit trench — timber revetment on posts, duckboards, a fire step, sandbag parapet, a supply crate,
// a ladder, shovels; three soldiers at work, each in an M1917 helmet. Low sun from +X lights the west wall.
import * as THREE from 'three';
import { makeSky } from '../core/sky.js';
import { dirt, timber, burlap, noise2, rng } from '../core/tex.js';
import { pbr, mesh, boxM, decal, printText, scatter, sandbagGeo } from '../props/kit.js';
import { makeHat } from '../props/hats.js';

export const TR = { half: 0.62, top: 1.8, z0: -9, z1: 7 };

export function buildTrench(renderer, cast) {
  const scene = new THREE.Scene();
  const sky = makeSky(renderer, { az: 62, el: 13, top: 0x4b8fd0, mid: 0x92c1e8, haze: 0xf3dcba, ground: 0x9a7a58, sunI: 4.4, cloud: 0.45, groundBounce: 0.7 });
  scene.add(sky.dome, sky.sun, sky.sun.target); scene.environment = sky.env; scene.environmentIntensity = 0.55;
  scene.fog = new THREE.Fog(0xe9d4b6, 60, 320);
  const R = rng(4);

  const earth = dirt(51, { base: 0x8a6a4a, pebbles: 0.6 });
  const earthM = pbr(earth, { repeat: [1, 1], ns: 2 });
  const wood = timber(52, { boards: 5, base: 0x8b5b3b, grey: 0.3 });
  const woodM = pbr(wood, { repeat: [1, 1], ns: 1.5 });
  const sackM = pbr(burlap(53, { base: 0xb09a72 }), { repeat: [3, 3], ns: 2.2 });
  const { half, top, z0, z1 } = TR, L = z1 - z0, zc = (z0 + z1) / 2;

  // ground outside the trench (two slabs either side) with gentle swells
  for (const side of [1, -1]) {
    const g = new THREE.PlaneGeometry(200, L + 120, 100, 60); g.rotateX(-Math.PI / 2);
    const p = g.attributes.position, n = noise2(side > 0 ? 8 : 9);
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), d = Math.abs(x); p.setY(i, (n.fbm(x * 0.05, z * 0.05, 4) - 0.5) * 1.6 * Math.min(1, d / 30) + (n(x * 0.6, z * 0.6) - 0.5) * 0.12); }
    g.computeVertexNormals();
    mesh(g, pbr(earth, { repeat: [60, 50], ns: 2 }), { pos: [side * (100 + half + 0.05), top, zc], parent: scene });
  }
  // trench floor (mud) + duckboards
  mesh(boxM(half * 2 + 0.2, 0.1, L, 1), pbr(dirt(54, { base: 0x6e5238, wet: 0.5 }), { repeat: [1, 1], ns: 2 }), { pos: [0, -0.05, zc], parent: scene });
  const slatGeo = boxM(0.62, 0.025, 0.09, 0.5), railGeo = boxM(0.06, 0.06, 1.95, 0.5);
  for (let z = z0 + 0.2; z < z1 - 1; z += 2.0) {
    mesh(railGeo, woodM, { pos: [-0.24, 0.035, z + 1], parent: scene }); mesh(railGeo, woodM, { pos: [0.24, 0.035, z + 1], parent: scene });
    for (let k = 0; k < 12; k++) mesh(slatGeo, woodM, { pos: [(R() - 0.5) * 0.02, 0.078, z + 0.1 + k * 0.165], rot: [0, (R() - 0.5) * 0.04, 0], parent: scene });
  }
  // revetment walls: horizontal boards + posts, fire step on the +X side
  const boardGeo = boxM(0.04, 0.2, 2.4, 0.6);
  for (const side of [1, -1]) {
    const x = side * half;
    for (let z = z0; z < z1; z += 2.4) for (let y = 0.1; y < top; y += 0.205) {
      mesh(boardGeo, woodM, { pos: [x + side * (0.02 + (R() - 0.5) * 0.012), y + 0.1, z + 1.2], rot: [0, 0, (R() - 0.5) * 0.03], parent: scene });
    }
    for (let z = z0 + 0.1; z < z1; z += 1.2) mesh(new THREE.CylinderGeometry(0.06, 0.065, top + 0.4, 10), woodM, { pos: [x - side * 0.03, (top + 0.4) / 2 - 0.15, z], parent: scene });
    // earth behind the boards (so the lip reads as soil)
    mesh(boxM(1.2, top + 0.02, L, 1), earthM, { pos: [x + side * 0.64, top / 2, zc], parent: scene, cast: false });
  }
  // fire step
  mesh(boxM(0.36, 0.42, L - 0.5, 0.6), woodM, { pos: [half - 0.2, 0.21, zc], parent: scene });
  // sandbag parapet (front, +X) and parados (back, -X)
  const bagGeo = sandbagGeo(3);
  const bags = [];
  for (const side of [1, -1]) {
    const rows = side > 0 ? 3 : 2;
    for (let r = 0; r < rows; r++) for (let z = z0; z < z1; z += 0.56) {
      bags.push({ x: side * (half + 0.22 + r * 0.04 * side), y: top + 0.07 + r * 0.155, z: z + (r % 2) * 0.28 + (R() - 0.5) * 0.05, ry: Math.PI / 2 + (R() - 0.5) * 0.16, rz: (R() - 0.5) * 0.08 });
    }
  }
  const bagGeos = [sandbagGeo(3), sandbagGeo(17), sandbagGeo(29)];
  for (let k = 0; k < 3; k++) {
    const mine = bags.filter((_, i) => i % 3 === k);
    scene.add(scatter(bagGeos[k], sackM, mine.length, (o, i, Rr) => { const b = mine[i]; o.position.set(b.x, b.y, b.z); o.rotation.set((Rr() - 0.5) * 0.08, b.ry + (Rr() - 0.5) * 0.25, b.rz); o.scale.set(0.92 + Rr() * 0.16, 0.9 + Rr() * 0.25, 0.92 + Rr() * 0.14); }));
  }
  // supply crate with a stencil (the only type here)
  const crate = new THREE.Group();
  mesh(boxM(0.62, 0.42, 0.42, 0.5), pbr(timber(55, { boards: 3, base: 0x9a6a44, grey: 0.15 }), { repeat: [1, 1] }), { pos: [0, 0.21, 0], parent: crate });
  const st = decal(0.56, 0.3, (c) => {
    printText(c, ['U.S.'], { size: 230, y: 0.33, style: 'stencil', color: '#4b4845', seed: 6 });
    printText(c, ['RATIONS · 1918'], { size: 120, y: 0.78, style: 'stencil', color: '#4b4845', seed: 7 });
  }, { res: 1024 });
  st.position.set(0, 0.22, 0.212); crate.add(st);
  crate.position.set(-0.3, 0.08, -3.6); crate.rotation.y = 0.2; scene.add(crate);
  const crate2 = crate.clone(); crate2.position.set(0.25, 0.08, 3.4); crate2.rotation.y = -0.4; scene.add(crate2);
  // ladder
  const lad = new THREE.Group();
  for (const x of [-0.2, 0.2]) mesh(boxM(0.05, 2.6, 0.05, 0.6), woodM, { pos: [x, 1.3, 0], parent: lad });
  for (let y = 0.25; y < 2.5; y += 0.3) mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.42, 8), woodM, { pos: [0, y, 0], rot: [0, 0, Math.PI / 2], parent: lad });
  lad.position.set(half - 0.12, 0.08, 1.6); lad.rotation.set(0, 0, 0.22); scene.add(lad);
  // shovel props (one leaning, one used)
  const shovel = makeShovel(woodM); shovel.position.set(-half + 0.12, 0.08, -1.2); shovel.rotation.set(0.0, 0.3, -0.2); scene.add(shovel);
  const workShovel = makeShovel(woodM); scene.add(workShovel);
  const mallet = makeMallet(woodM); scene.add(mallet);
  const stake = mesh(boxM(0.07, 0.8, 0.07, 0.5), woodM, { parent: scene });
  // distant broken tree line (silhouettes in haze)
  const tg = new THREE.CylinderGeometry(0.12, 0.2, 1, 6), tm = new THREE.MeshStandardMaterial({ color: 0x5e5244, roughness: 1 });
  scene.add(scatter(tg, tm, 70, (o, i, Rr) => { const zz = -60 + Rr() * 120, x = (Rr() > 0.5 ? 1 : -1) * (45 + Rr() * 60); o.position.set(x, top + 2, zz); o.scale.set(1 + Rr(), 3 + Rr() * 6, 1 + Rr()); o.rotation.z = (Rr() - 0.5) * 0.3; }, { cast: false }));
  // dust motes in the sun
  const motes = makeMotes(260, [-half, 0.2, z0 + 4], [half, top + 0.4, z1 - 2]); scene.add(motes);

  // soldiers + their helmets
  const s1 = cast.soldier1, s2 = cast.soldier2, s3 = cast.soldier3;
  for (const s of [s1, s2, s3]) scene.add(s.group);
  const helmets = { s2: makeHat('brodie'), s3: makeHat('brodie') };
  // water in the upturned helmet (B3)
  const water = new THREE.Mesh(new THREE.RingGeometry(0.001, 1, 64, 20), new THREE.MeshPhysicalMaterial({ color: 0x3e4a44, roughness: 0.04, transparent: true, opacity: 0.8, clearcoat: 1, envMapIntensity: 0.9, side: THREE.DoubleSide }));
  water.userData.base = water.geometry.attributes.position.array.slice();
  water.rotation.x = -Math.PI / 2; water.visible = false;
  const canteen = makeCanteen(); scene.add(canteen);
  const stream = new THREE.Mesh(new THREE.CylinderGeometry(0.0035, 0.0045, 1, 10, 1, true), new THREE.MeshPhysicalMaterial({ color: 0xd8e4e0, roughness: 0.05, transparent: true, opacity: 0.55, clearcoat: 1 }));
  stream.visible = false; scene.add(stream);

  return {
    name: 'trench', scene, sky, s1, s2, s3, helmets, workShovel, mallet, stake, crate, water, canteen, motes, stream,
    reset() { for (const s of [s1, s2, s3]) s.reset(); water.visible = false; stream.visible = false; },
    update(t) { motes.material.uniforms.uTime.value = t; },
  };
}

export function makeShovel(woodM) {
  const g = new THREE.Group();
  mesh(new THREE.CylinderGeometry(0.017, 0.019, 0.9, 10), woodM, { pos: [0, 0.45, 0], parent: g });
  mesh(new THREE.TorusGeometry(0.05, 0.011, 6, 16, Math.PI), woodM, { pos: [0, 0.92, 0], parent: g }); // D-grip
  const blade = new THREE.Shape(); blade.moveTo(-0.11, 0); blade.lineTo(0.11, 0); blade.quadraticCurveTo(0.12, -0.2, 0, -0.3); blade.quadraticCurveTo(-0.12, -0.2, -0.11, 0);
  const bg = new THREE.ExtrudeGeometry(blade, { depth: 0.004, bevelEnabled: false }); bg.translate(0, 0, -0.002);
  const bm = new THREE.MeshStandardMaterial({ color: 0x5f5546, roughness: 0.45, metalness: 0.7 });
  const b = mesh(bg, bm, { pos: [0, 0.02, 0], rot: [0.25, 0, 0], parent: g });
  b.scale.set(1, 1, 1);
  return g; // origin at the blade top; handle along +Y
}
export function makeMallet(woodM) {
  const g = new THREE.Group();
  mesh(new THREE.CylinderGeometry(0.014, 0.016, 0.42, 8), woodM, { pos: [0, 0.21, 0], parent: g });
  mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.18, 14), woodM, { pos: [0, 0.44, 0], rot: [0, 0, Math.PI / 2], parent: g });
  return g; // origin at the handle end; head along +Y
}
export function makeCanteen() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.068, 0.07, 8, 20), new THREE.MeshPhysicalMaterial({ color: 0x6b6440, roughness: 0.95, sheen: 0.6, sheenColor: 0x8a845e }));
  body.scale.set(1, 1, 0.5); body.castShadow = true; g.add(body);
  mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.03, 12), new THREE.MeshStandardMaterial({ color: 0x8a8070, metalness: 0.8, roughness: 0.4 }), { pos: [0, 0.125, 0], parent: g });
  return g; // spout at +Y
}
/** sunlit dust motes (points, additive, drift in time) */
export function makeMotes(n, a, b) {
  const pos = new Float32Array(n * 3), seed = new Float32Array(n), R = rng(91);
  for (let i = 0; i < n; i++) { pos[i * 3] = a[0] + R() * (b[0] - a[0]); pos[i * 3 + 1] = a[1] + R() * (b[1] - a[1]); pos[i * 3 + 2] = a[2] + R() * (b[2] - a[2]); seed[i] = R(); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  const m = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uSize: { value: 0.0016 }, uCol: { value: new THREE.Color(0xffe2b8) } },
    vertexShader: /* glsl */`attribute float aSeed; uniform float uTime, uSize; varying float vA;
      void main(){ vec3 p = position; float t = uTime * (0.15 + aSeed * 0.2);
        p += vec3(sin(t + aSeed * 30.0) * 0.12, sin(t * 0.7 + aSeed * 11.0) * 0.08 + t * 0.03 * (aSeed - 0.3), cos(t * 0.8 + aSeed * 21.0) * 0.12);
        vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv;
        gl_PointSize = max(1.5, uSize * (0.6 + aSeed) * projectionMatrix[1][1] * 540.0 / -mv.z); vA = 0.5 + 0.5 * sin(uTime * (1.0 + aSeed) + aSeed * 40.0); }`,
    fragmentShader: /* glsl */`uniform vec3 uCol; varying float vA; void main(){ vec2 c = gl_PointCoord - 0.5; float d = length(c); if (d > 0.5) discard; gl_FragColor = vec4(uCol * 1.6, (1.0 - d * 2.0) * 0.35 * vA); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const p = new THREE.Points(g, m); p.frustumCulled = false; return p;
}
