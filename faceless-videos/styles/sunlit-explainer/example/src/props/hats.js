// Parametric hats (head-bone frame, y = 0 at the headband): the modern hard hat, the M1917 doughboy helmet,
// Bullard's 1919 Hard Boiled Hat and a soft cloth cap. Same topology → any two morph point-for-point.
import * as THREE from 'three';
import { noise2, paintPBR, sstep, clamp } from '../core/tex.js';

const SEG_U = 120;
// profile: [r, y] from the crown outward; brim(θ) adds radius to the last `brimN` points (θ=0 is the front, +Z)
export const HATS = {
  hardhat: { pts: [[0, 0.13], [0.03, 0.128], [0.058, 0.12], [0.081, 0.103], [0.097, 0.079], [0.106, 0.05], [0.11, 0.024], [0.112, 0.008], [0.114, 0.0], [0.119, -0.003], [0.122, -0.005], [0.123, -0.007]],
    sx: 0.86, sz: 1.0, brimN: 4, brim: (a) => 0.052 * Math.pow(Math.max(0, Math.cos(a)), 3), brimDrop: (a) => 0.012 * Math.pow(Math.max(0, Math.cos(a)), 3), ridge: 0.008 },
  brodie: { pts: [[0, 0.096], [0.03, 0.094], [0.055, 0.087], [0.074, 0.074], [0.089, 0.055], [0.098, 0.034], [0.103, 0.017], [0.107, 0.006], [0.124, 0.0], [0.147, -0.005], [0.166, -0.011], [0.171, -0.014]],
    sx: 0.9, sz: 1.0, brimN: 4, brim: () => 0, brimDrop: () => 0, ridge: 0 },
  boiled: { pts: [[0, 0.122], [0.03, 0.12], [0.057, 0.112], [0.079, 0.096], [0.094, 0.073], [0.103, 0.046], [0.107, 0.022], [0.109, 0.007], [0.122, 0.001], [0.137, -0.006], [0.148, -0.013], [0.151, -0.016]],
    sx: 0.88, sz: 1.0, brimN: 4, brim: (a) => 0.018 * Math.pow(Math.abs(Math.cos(a)), 2), brimDrop: (a) => 0.006 * Math.pow(Math.abs(Math.cos(a)), 2), ridge: 0.006 },
  cap: { pts: [[0, 0.084], [0.03, 0.083], [0.058, 0.079], [0.08, 0.07], [0.096, 0.055], [0.105, 0.037], [0.109, 0.02], [0.11, 0.008], [0.111, 0.0], [0.112, -0.002], [0.113, -0.003], [0.113, -0.004]],
    sx: 0.92, sz: 1.04, brimN: 4, brim: (a) => 0.06 * Math.pow(Math.max(0, Math.cos(a)), 2.5), brimDrop: (a) => 0.02 * Math.pow(Math.max(0, Math.cos(a)), 2.5), ridge: 0, slump: 0.01 },
};

export function hatPositions(def, out) {
  const P = def.pts, n = P.length;
  let k = 0;
  for (let i = 0; i <= SEG_U; i++) {
    const a = (i / SEG_U) * Math.PI * 2, s = Math.sin(a), c = Math.cos(a);
    for (let j = 0; j < n; j++) {
      let [r, y] = P[j];
      const bj = j - (n - def.brimN);
      if (bj >= 0) { const f = (bj + 1) / def.brimN; r += def.brim(a) * f; y -= def.brimDrop(a) * f; }
      if (def.slump) y -= def.slump * (0.5 + 0.5 * Math.sin(a * 3 + 1)) * (r / 0.11) ** 2 * (j < n - def.brimN ? 1 : 0);
      let x = r * s * def.sx, z = r * c * def.sz;
      if (def.ridge) y += def.ridge * Math.exp(-((x / 0.013) ** 2)) * sstep(0.03, 0.08, y);
      out[k++] = x; out[k++] = y; out[k++] = z;
    }
  }
  return out;
}
export function hatGeometry(def) {
  const n = def.pts.length, pos = new Float32Array((SEG_U + 1) * n * 3), uv = new Float32Array((SEG_U + 1) * n * 2), idx = [];
  hatPositions(def, pos);
  for (let i = 0; i <= SEG_U; i++) for (let j = 0; j < n; j++) { const v = i * n + j; uv[v * 2] = i / SEG_U * 4; uv[v * 2 + 1] = j / (n - 1); }
  for (let i = 0; i < SEG_U; i++) for (let j = 0; j < n - 1; j++) { const a = i * n + j, b = (i + 1) * n + j; idx.push(a, a + 1, b, b, a + 1, b + 1); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
/** rim tube along the outer edge (gives the shell visible thickness) */
function rimPoints(def, pos) {
  const n = def.pts.length, pts = [];
  for (let i = 0; i < SEG_U; i++) { const v = (i * n + n - 1) * 3; pts.push(new THREE.Vector3(pos[v], pos[v + 1], pos[v + 2])); }
  return pts;
}

let MATS = null;
function mats() {
  if (MATS) return MATS;
  const n = noise2(77);
  const paintTex = paintPBR(256, 256, (u, v) => { const f = n.tfbm(u * 8, v * 8, 8, 8, 4), g = n(u * 200, v * 200); return [255 * (0.92 + 0.1 * f), 255 * (0.92 + 0.1 * f), 255 * (0.92 + 0.1 * f), 0.6 + 0.3 * g, f * 0.8 + g * 0.6]; }, { normalScale: 1.2 });
  MATS = {
    hardhat: new THREE.MeshPhysicalMaterial({ color: 0x6aa6db, roughness: 0.38, clearcoat: 0.7, clearcoatRoughness: 0.25, side: THREE.DoubleSide, roughnessMap: paintTex.roughnessMap }),
    brodie: new THREE.MeshPhysicalMaterial({ color: 0x5c5a3e, roughness: 0.78, metalness: 0.15, side: THREE.DoubleSide, normalMap: paintTex.normalMap, normalScale: new THREE.Vector2(0.6, 0.6), map: paintTex.map }),
    boiled: new THREE.MeshPhysicalMaterial({ color: 0x302b28, roughness: 0.42, clearcoat: 0.85, clearcoatRoughness: 0.18, side: THREE.DoubleSide, normalMap: paintTex.normalMap, normalScale: new THREE.Vector2(0.35, 0.35) }),
    cap: new THREE.MeshPhysicalMaterial({ color: 0x564a40, roughness: 0.95, sheen: 1, sheenColor: 0x8a7a6a, sheenRoughness: 0.6, side: THREE.DoubleSide, normalMap: paintTex.normalMap, normalScale: new THREE.Vector2(1, 1) }),
    canvas: new THREE.MeshPhysicalMaterial({ color: 0xc9b48c, roughness: 0.9, sheen: 0.6, sheenColor: 0xe0d0b0, side: THREE.DoubleSide, normalMap: paintTex.normalMap }),
    strap: new THREE.MeshStandardMaterial({ color: 0x4e3a2a, roughness: 0.6 }),
  };
  return MATS;
}

/** a hat object: { group, setShape(defA, defB, t), setColor } */
export function makeHat(kind) {
  const def = HATS[kind], M = mats();
  const geo = hatGeometry(def);
  const mesh = new THREE.Mesh(geo, M[kind].clone()); mesh.castShadow = true; mesh.receiveShadow = true;
  const group = new THREE.Group(); group.add(mesh);
  let rimMesh = null;
  const buildRim = () => {
    if (rimMesh) { group.remove(rimMesh); rimMesh.geometry.dispose(); }
    const curve = new THREE.CatmullRomCurve3(rimPoints(cur, geo.attributes.position.array), true);
    rimMesh = new THREE.Mesh(new THREE.TubeGeometry(curve, SEG_U, kind === 'cap' ? 0.0035 : 0.0028, 6, true), mesh.material);
    rimMesh.castShadow = true; group.add(rimMesh);
  };
  let cur = def; buildRim();
  // inner straps (liner) for the doughboy helmet
  if (kind === 'brodie' || kind === 'boiled') {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.094, 0.004, 6, 48), M.strap); ring.rotation.x = Math.PI / 2; ring.scale.set(def.sx, 1, 1); ring.position.y = 0.012; group.add(ring);
  }
  return {
    group, mesh, kind,
    /** morph between two hat definitions (t: 0..1) */
    setShape(a, b, t) {
      const A = hatPositions(HATS[a], new Float32Array(geo.attributes.position.array.length)), B = hatPositions(HATS[b], new Float32Array(A.length));
      const P = geo.attributes.position.array;
      for (let i = 0; i < P.length; i++) P[i] = A[i] + (B[i] - A[i]) * t;
      geo.attributes.position.needsUpdate = true; geo.computeVertexNormals();
      cur = t < 0.5 ? HATS[a] : HATS[b]; buildRim();
    },
    setMaterial(kindM) { mesh.material = M[kindM].clone(); if (rimMesh) rimMesh.material = mesh.material; },
    material: () => mesh.material,
  };
}
export function hatMaterials() { return mats(); }
export { clamp };
