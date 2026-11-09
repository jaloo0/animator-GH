// Load a sculpted character (data/chars/<id>.bin) as four SkinnedMeshes on one skeleton, with a game-style
// skin/cloth shader (per-vertex material ids, wrap-lit skin, procedural pores / weave / strands, baked AO),
// eyes that aim, two-bone IK arms + legs, finger grips and a head look-at.
import * as THREE from 'three';
import { EYE } from './anatomy.js';

const D = Math.PI / 180;
// material slots (anatomy.M): albedo (sRGB hex), roughness, sheen, clearcoat, sss, detail kind
// detail: 0 none 1 skin 2 wool 3 cotton 4 canvas 5 leather 6 hair 7 metal 8 rubber 9 mesh 10 reflective
const SLOTS = 16;
export const OUTFITS = {
  base: {
    0: { c: 0xc58a68, r: 0.52, sh: 0.0, cc: 0.0, sss: 1, det: 1 },
    1: { c: 0xe0d8c8, r: 0.85, sh: 0.6, det: 3 },
    2: { c: 0x8d6a2f, r: 0.92, sh: 0.9, det: 2 },
    3: { c: 0x6f5a3e, r: 0.9, sh: 0.7, det: 2 },
    4: { c: 0x6a4630, r: 0.5, sh: 0.1, cc: 0.35, det: 5 },
    5: { c: 0x3a2c22, r: 0.55, sh: 0.4, det: 6 },
    6: { c: 0x9a8152, r: 0.85, sh: 0.4, det: 4 },
    7: { c: 0x5a4a3e, r: 0.88, sh: 0.7, det: 2 },
    8: { c: 0x8a6a48, r: 0.75, sh: 0.3, det: 4 },
    9: { c: 0xe5784a, r: 0.7, sh: 0.6, det: 9 },
    10: { c: 0xa48a5a, r: 0.35, met: 1, det: 7 },
    11: { c: 0x86663a, r: 0.92, sh: 0.9, det: 2 },
    12: { c: 0xbdbab2, r: 0.3, met: 0.4, det: 10 },
    13: { c: 0x3f3631, r: 0.8, det: 8 },
    14: { c: 0xa86a5c, r: 0.45, sss: 1, det: 1 },
    15: { c: 0x5a4430, r: 0.6, cc: 0.2, det: 5 },
  },
};

const VERT_PRE = /* glsl */`
attribute float aMat; attribute vec4 aMask; attribute float aAO;
flat varying float vMat; varying vec3 vRest; varying vec4 vMask; varying float vAO;
varying vec3 vAlb; varying vec4 vPBR; varying float vSSS;
uniform vec3 uAlb[${SLOTS}]; uniform float uRgh[${SLOTS}]; uniform float uShn[${SLOTS}]; uniform float uCC[${SLOTS}]; uniform float uMet[${SLOTS}]; uniform float uSSS[${SLOTS}];
`;
const FRAG_PRE = /* glsl */`
flat varying float vMat; varying vec3 vRest; varying vec4 vMask; varying float vAO;
varying vec3 vAlb; varying vec4 vPBR; varying float vSSS;
uniform vec3 uAlb[${SLOTS}]; uniform float uRgh[${SLOTS}]; uniform float uShn[${SLOTS}]; uniform float uCC[${SLOTS}]; uniform float uMet[${SLOTS}]; uniform float uSSS[${SLOTS}]; uniform float uDet[${SLOTS}];
uniform float uPart; uniform vec3 uHairCol; uniform float uDirt; uniform float uSeed;
float gSSS = 0.0; float gRgh = 0.8; float gMet = 0.0; float gCC = 0.0; float gShn = 0.0; float gAO = 1.0; float gDetail = 0.0;
float h31(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float vn(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(h31(i), h31(i + vec3(1,0,0)), f.x), mix(h31(i + vec3(0,1,0)), h31(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(h31(i + vec3(0,0,1)), h31(i + vec3(1,0,1)), f.x), mix(h31(i + vec3(0,1,1)), h31(i + vec3(1,1,1)), f.x), f.y), f.z); }
float fbm(vec3 p){ return 0.5 * vn(p) + 0.25 * vn(p * 2.03) + 0.125 * vn(p * 4.1) + 0.0625 * vn(p * 8.3); }
float detailH(int kind, vec3 p, float fw){
  float h = 0.0;
  if (kind == 1) { h = 0.00004 * (vn(p * 2200.0) - 0.5) + 0.00012 * (vn(p * 420.0) - 0.5); h *= 1.0 - smoothstep(0.0002, 0.0008, fw); }
  else if (kind == 2) { h = 0.00022 * (fbm(p * 900.0) - 0.5) + 0.00007 * sin((p.x + p.y * 1.3 + p.z) * 5200.0); h *= 1.0 - smoothstep(0.0004, 0.0018, fw); h += 0.0015 * (fbm(p * 30.0) - 0.5); }
  else if (kind == 3) { h = 0.00005 * (sin(p.x * 4200.0) + sin(p.y * 4200.0) + sin(p.z * 4200.0)); h *= 1.0 - smoothstep(0.0002, 0.0007, fw); h += 0.0012 * (fbm(p * 28.0) - 0.5); }
  else if (kind == 4) { h = 0.00012 * (sin(p.x * 2600.0) * sin(p.y * 2600.0) + sin(p.z * 2600.0) * sin(p.y * 2600.0)); h *= 1.0 - smoothstep(0.0003, 0.0012, fw); h += 0.001 * (fbm(p * 24.0) - 0.5); }
  else if (kind == 5) { h = 0.00006 * (vn(p * 1800.0) - 0.5) + 0.00045 * (fbm(p * 90.0) - 0.5); h *= 1.0 - smoothstep(0.0003, 0.0012, fw); }
  else if (kind == 6) { h = 0.00009 * (vn(p * vec3(2600.0, 900.0, 900.0)) - 0.5) + 0.00012 * (vn(p * vec3(500.0, 220.0, 220.0)) - 0.5); h *= 1.0 - smoothstep(0.0002, 0.0009, fw); }
  else if (kind == 9) { h = 0.00006 * (sin(p.x * 6000.0) * sin(p.y * 6000.0)) ; h *= 1.0 - smoothstep(0.00015, 0.0006, fw); h += 0.0008 * (fbm(p * 26.0) - 0.5); }
  return h;
}
vec3 perturbH(vec3 surf_pos, vec3 surf_norm, float h, float faceDirection){
  vec3 dpx = dFdx(surf_pos), dpy = dFdy(surf_pos);
  float lx = max(length(dpx), 1e-7), ly = max(length(dpy), 1e-7);
  vec2 dH = vec2(dFdx(h) / lx, dFdy(h) / ly);
  vec3 sx = dpx / lx, sy = dpy / ly;
  vec3 R1 = cross(sy, surf_norm), R2 = cross(surf_norm, sx);
  float det = dot(sx, R1) * faceDirection;
  vec3 g = sign(det) * (dH.x * R1 + dH.y * R2);
  return normalize(abs(det) * surf_norm - g);
}
`;

function patch(mat, slots, extra = {}) {
  const U = {
    uAlb: { value: [] }, uRgh: { value: [] }, uShn: { value: [] }, uCC: { value: [] }, uMet: { value: [] }, uSSS: { value: [] }, uDet: { value: [] },
    uPart: { value: extra.part ?? 0 }, uHairCol: { value: new THREE.Color(extra.hairCol ?? 0x3a2c22) }, uDirt: { value: extra.dirt ?? 0.3 }, uSeed: { value: extra.seed ?? 0 },
  };
  for (let i = 0; i < SLOTS; i++) {
    const s = slots[i] || { c: 0xff00ff, r: 0.5 };
    U.uAlb.value.push(new THREE.Color(s.c)); U.uRgh.value.push(s.r ?? 0.8); U.uShn.value.push(s.sh ?? 0); U.uCC.value.push(s.cc ?? 0);
    U.uMet.value.push(s.met ?? 0); U.uSSS.value.push(s.sss ?? 0); U.uDet.value.push(s.det ?? 0);
  }
  mat.userData.U = U;
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\n' + VERT_PRE)
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n vRest = position; vMat = aMat; vMask = aMask; vAO = aAO; int mi = int(aMat + 0.5); vAlb = uAlb[mi]; vPBR = vec4(uRgh[mi], uShn[mi], uCC[mi], uMet[mi]); vSSS = uSSS[mi];');
    let f = sh.fragmentShader;
    f = f.replace('#include <common>', '#include <common>\n' + FRAG_PRE);
    f = f.replace('#include <color_fragment>', /* glsl */`#include <color_fragment>
      int id = int(vMat + 0.5);
      vec3 alb = vAlb; gRgh = vPBR.x; gShn = vPBR.y; gCC = vPBR.z; gMet = vPBR.w; gSSS = vSSS; int kind = int(uDet[id] + 0.5);
      float fwr = length(fwidth(vRest));
      float lo = fbm(vRest * 9.0 + uSeed);
      if (kind == 1) {
        // skin: mottling, warmer at ears/nose (by AO + noise), lips, brows, stubble, lid line, nails
        alb *= 0.92 + 0.14 * lo;
        alb = mix(alb, alb * vec3(1.06, 0.92, 0.9), 0.5 * smoothstep(0.5, 0.75, fbm(vRest * 40.0 + 3.0)));
        if (uPart > 0.5 && uPart < 1.5) {
          vec3 hp = vRest - vec3(0.0, 1.565, -0.012);
          vec3 ha = vec3(abs(hp.x), hp.yz);
          float cheek = 1.0 - smoothstep(0.4, 1.0, length((ha - vec3(0.043, 0.07, 0.07)) / vec3(0.022, 0.02, 0.03)));
          float noseR = 1.0 - smoothstep(0.3, 1.0, length((hp - vec3(0.0, 0.058, 0.115)) / vec3(0.016, 0.014, 0.02)));
          float earR = 1.0 - smoothstep(0.5, 1.0, length((ha - vec3(0.078, 0.08, -0.008)) / vec3(0.02, 0.04, 0.03)));
          float under = 1.0 - smoothstep(0.4, 1.0, length((ha - vec3(0.032, 0.085, 0.082)) / vec3(0.016, 0.008, 0.02)));
          alb = mix(alb, alb * vec3(1.08, 0.86, 0.82), clamp(cheek * 0.55 + noseR * 0.5 + earR * 0.55, 0.0, 1.0));
          alb = mix(alb, alb * vec3(0.8, 0.74, 0.76), under * 0.5);
          gRgh = mix(gRgh, 0.36, noseR * 0.6 + smoothstep(0.1, 0.16, hp.y) * smoothstep(0.08, 0.095, hp.z) * 0.3);
          alb = mix(alb, alb * vec3(0.82, 0.58, 0.55) * (0.9 + 0.2 * lo), vMask.x * 0.85); gRgh = mix(gRgh, 0.38, vMask.x);
          float bs = 0.6 + 0.4 * vn(vRest * vec3(260.0, 1700.0, 500.0));
          alb = mix(alb, uHairCol * 0.9, clamp(vMask.y * 1.25 * bs, 0.0, 1.0));
          float stub = vMask.z * smoothstep(0.35, 0.8, vn(vRest * 2600.0));
          alb = mix(alb, alb * vec3(0.62, 0.6, 0.62), vMask.z * 0.55); alb = mix(alb, uHairCol, stub * 0.5);
          alb = mix(alb, alb * 0.55, vMask.w * 0.45);
        }
        if (uPart > 1.5) { alb = mix(alb, vec3(0.86, 0.68, 0.6), vMask.x * 0.7); gRgh = mix(gRgh, 0.28, vMask.x); gSSS *= 1.0 - 0.6 * vMask.x; }
      } else if (kind == 6) {
        alb = uHairCol * (0.8 + 0.35 * vn(vRest * vec3(1800.0, 600.0, 600.0))) * (0.85 + 0.3 * vn(vRest * 60.0)); gRgh = 0.5 + 0.15 * vn(vRest * 300.0);
      } else if (kind == 10) {
        alb *= 0.9 + 0.1 * lo;
      } else {
        // fabric / leather: mottling + dirt toward the hem, knees and cuffs
        alb *= 0.88 + 0.22 * lo;
        float dirt = uDirt * (smoothstep(0.55, 0.0, vRest.y) * 0.7 + 0.3 * smoothstep(0.55, 0.8, fbm(vRest * 14.0 + 7.0)));
        alb = mix(alb, alb * vec3(0.72, 0.64, 0.55), clamp(dirt, 0.0, 0.8));
      }
      gAO = vAO;
      alb *= mix(1.0, gAO, 0.45);
      diffuseColor.rgb = alb;
      gDetail = detailH(kind, vRest, fwr);`);
    f = f.replace('#include <roughnessmap_fragment>', 'float roughnessFactor = gRgh;');
    f = f.replace('#include <metalnessmap_fragment>', 'float metalnessFactor = gMet;');
    f = f.replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\n normal = perturbH(-vViewPosition, normal, gDetail, faceDirection);');
    f = f.replace('#include <lights_physical_fragment>', `#include <lights_physical_fragment>
      #ifdef USE_SHEEN
        material.sheenColor = vec3(gShn) * mix(vec3(1.0), diffuseColor.rgb * 1.6, 0.6); material.sheenRoughness = 0.65;
      #endif
      #ifdef USE_CLEARCOAT
        material.clearcoat = gCC; material.clearcoatRoughness = 0.35;
      #endif`);
    f = f.replace('#include <aomap_fragment>', '#include <aomap_fragment>\n reflectedLight.indirectDiffuse *= gAO; reflectedLight.indirectSpecular *= mix(1.0, gAO, 0.85);');
    sh.fragmentShader = f;
  };
  mat.customProgramCacheKey = () => 'char-v1';
  return mat;
}

/** Wrap-lit skin: patch the physical lighting chunk once (global) so gSSS softens + warms the terminator. */
let LIGHT_PATCHED = false;
export function patchLighting() {
  if (LIGHT_PATCHED) return; LIGHT_PATCHED = true;
  const C = THREE.ShaderChunk;
  let s = C.lights_physical_pars_fragment;
  s = s.replace('vec3 irradiance = dotNL * directLight.color;', `vec3 irradiance = dotNL * directLight.color;
    #ifdef CHAR_SSS
      float ndl0 = dot( geometryNormal, directLight.direction );
      vec3 irrDiffuse = irradiance + gSSS * directLight.color * max( saturate( ( ndl0 + 0.55 ) / 1.55 ) - dotNL, 0.0 ) * vec3( 1.0, 0.36, 0.22 ) * 1.25;
    #else
      vec3 irrDiffuse = irradiance;
    #endif`);
  s = s.replace('reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );', 'reflectedLight.directDiffuse += irrDiffuse * BRDF_Lambert( material.diffuseColor );');
  C.lights_physical_pars_fragment = s;
}

function eyeTexture(iris = '#8a6a45') {
  const c = document.createElement('canvas'); c.width = 512; c.height = 256; const x = c.getContext('2d');
  // equirect: v=0 top pole (we rotate the pole to face forward)
  const g = x.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, '#e9e2d6'); g.addColorStop(1, '#b9ab9c'); x.fillStyle = g; x.fillRect(0, 0, 512, 256);
  const irisEnd = 0.172 * 256, pupil = 0.05 * 256;
  for (let i = 0; i < 512; i += 2) { // radial fibres
    const k = 0.75 + 0.5 * Math.random();
    x.fillStyle = shade(iris, k); x.fillRect(i, pupil, 2, irisEnd - pupil);
  }
  const lg = x.createLinearGradient(0, irisEnd - 10, 0, irisEnd + 4); lg.addColorStop(0, 'rgba(40,30,24,0)'); lg.addColorStop(0.6, 'rgba(40,30,24,0.85)'); lg.addColorStop(1, 'rgba(233,226,214,0)');
  x.fillStyle = lg; x.fillRect(0, irisEnd - 10, 512, 14);
  const pg = x.createLinearGradient(0, 0, 0, pupil + 3); pg.addColorStop(0, '#24201e'); pg.addColorStop(0.85, '#2a2420'); pg.addColorStop(1, shade(iris, 0.6));
  x.fillStyle = pg; x.fillRect(0, 0, 512, pupil + 3);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
function shade(hex, k) { const c = new THREE.Color(hex); return `rgb(${Math.min(255, c.r * 255 * k) | 0},${Math.min(255, c.g * 255 * k) | 0},${Math.min(255, c.b * 255 * k) | 0})`; }

const CACHE = new Map();
async function fetchChar(id) {
  if (!CACHE.has(id)) CACHE.set(id, Promise.all([fetch(`data/chars/${id}.json`).then((r) => r.json()), fetch(`data/chars/${id}.bin`).then((r) => r.arrayBuffer())]));
  return CACHE.get(id);
}

export class Human {
  /** look: { skin, hair, iris, slots: {id: {...}}, dirt, seed } */
  static async load(id, look = {}) { const [hdr, buf] = await fetchChar(id); return new Human(hdr, buf, look); }
  constructor(hdr, buf, look) {
    patchLighting();
    this.id = hdr.id; this.group = new THREE.Group(); this.group.name = 'human:' + hdr.id;
    // bones
    this.bones = []; this.byName = {}; this.restQ = []; this.restWorld = [];
    const worldM = hdr.bones.map((b) => new THREE.Matrix4().compose(new THREE.Vector3(...b.pos), new THREE.Quaternion(...b.q), new THREE.Vector3(1, 1, 1)));
    hdr.bones.forEach((b, i) => {
      const bone = new THREE.Bone(); bone.name = b.name;
      const local = b.parent < 0 ? worldM[i].clone() : worldM[b.parent].clone().invert().multiply(worldM[i]);
      local.decompose(bone.position, bone.quaternion, bone.scale);
      this.bones.push(bone); this.byName[b.name] = bone; this.restQ.push(bone.quaternion.clone());
      this.restWorld.push({ pos: new THREE.Vector3(...b.pos), q: new THREE.Quaternion(...b.q) });
      if (b.parent >= 0) this.bones[b.parent].add(bone);
    });
    this.root = this.bones[0]; this.group.add(this.root);
    this.group.updateMatrixWorld(true);
    this.skeleton = new THREE.Skeleton(this.bones);
    // meshes
    const slots = { ...OUTFITS.base };
    if (look.skin) slots[0] = { ...slots[0], c: look.skin }, slots[14] = { ...slots[14], c: new THREE.Color(look.skin).multiply(new THREE.Color(0xe8c0b8)).getHex() };
    for (const [k, v] of Object.entries(look.slots || {})) slots[k] = { ...(slots[k] || {}), ...v };
    this.meshes = {};
    const partIdx = { body: 0, head: 1, handL: 2, handR: 2 };
    for (const p of hdr.parts) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(buf, p.pos, p.n * 3), 3));
      g.setAttribute('normal', new THREE.BufferAttribute(new Int8Array(buf, p.nrm, p.n * 3), 3, true));
      g.setAttribute('aMat', new THREE.BufferAttribute(new Uint8Array(buf, p.mat, p.n), 1));
      g.setAttribute('skinIndex', new THREE.BufferAttribute(new Uint8Array(buf, p.si, p.n * 4), 4));
      g.setAttribute('skinWeight', new THREE.BufferAttribute(new Uint8Array(buf, p.sw, p.n * 4), 4, true));
      g.setAttribute('aAO', new THREE.BufferAttribute(new Uint8Array(buf, p.ao, p.n), 1, true));
      g.setAttribute('aMask', new THREE.BufferAttribute(new Uint8Array(buf, p.mask, p.n * 4), 4, true));
      g.setIndex(new THREE.BufferAttribute(new Uint32Array(buf, p.idx, p.ni), 1));
      g.computeBoundingSphere(); g.boundingSphere.radius += 1.2; // poses move vertices far from rest
      const m = patch(new THREE.MeshPhysicalMaterial({ roughness: 0.8, sheen: 1, sheenRoughness: 0.7, clearcoat: 0.01, clearcoatRoughness: 0.4 }), slots,
        { part: partIdx[p.name], hairCol: look.hair ?? 0x3a2c22, dirt: look.dirt ?? 0.3, seed: look.seed ?? 0 });
      m.defines = { CHAR_SSS: '' };
      const mesh = new THREE.SkinnedMesh(g, m); mesh.name = p.name;
      mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false;
      this.group.add(mesh); mesh.bind(this.skeleton, new THREE.Matrix4());
      this.meshes[p.name] = mesh;
    }
    // eyes
    const eyeGeo = new THREE.SphereGeometry(EYE.r, 32, 20); eyeGeo.rotateX(Math.PI / 2);
    const eyeMat = new THREE.MeshPhysicalMaterial({ map: eyeTexture(look.iris), roughness: 0.4, clearcoat: 0.6, clearcoatRoughness: 0.05, envMapIntensity: 0.35 });
    this.eyes = [];
    const head = this.byName.head, hw = this.restWorld[4].pos;
    for (const g of [1, -1]) {
      const e = new THREE.Mesh(eyeGeo, eyeMat); e.castShadow = false; e.receiveShadow = true;
      e.position.set(EYE.x * g, EYE.y, EYE.z); head.add(e); this.eyes.push(e);
    }
    this.props = [];
    this.reset();
  }
  reset() {
    this.bones.forEach((b, i) => b.quaternion.copy(this.restQ[i]));
    this.root.position.copy(this.restWorld[0].pos);
    this.eyes.forEach((e) => e.quaternion.identity());
  }
  get visible() { return this.group.visible; } set visible(v) { this.group.visible = v; }
  bone(n) { return this.byName[n]; }
  /** local rotation on top of rest (degrees, XYZ) */
  rot(n, x = 0, y = 0, z = 0) { const i = this.bones.indexOf(this.byName[n]); this.byName[n].quaternion.copy(this.restQ[i]).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(x * D, y * D, z * D))); return this; }
  update() { this.group.updateMatrixWorld(true); }
  /** world position of a point in a bone's rest-aligned frame */
  at(n, off = [0, 0, 0]) { this.update(); return new THREE.Vector3(...off).applyMatrix4(this.byName[n].matrixWorld); }
  worldQ(n) { this.update(); return this.byName[n].getWorldQuaternion(new THREE.Quaternion()); }
  /** set a bone's world orientation */
  setWorldQ(n, qw) {
    const b = this.byName[n]; b.parent.updateMatrixWorld(true);
    const pq = b.parent.getWorldQuaternion(new THREE.Quaternion());
    b.quaternion.copy(pq.invert().multiply(qw)); b.updateMatrixWorld(true);
  }
  /** hand frame quaternion from finger direction + palm normal (world) */
  static handQ(side, fingers, palm) {
    const y = fingers.clone().normalize().negate();
    let x = palm.clone().normalize().multiplyScalar(side === 'L' ? -1 : 1);
    x.sub(y.clone().multiplyScalar(x.dot(y))).normalize();
    const z = new THREE.Vector3().crossVectors(x, y);
    return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
  }
  /** two-bone arm IK: wrist → target (world), elbow toward pole (world point), hand orientation (world quat) */
  armIK(side, target, pole, handQ, twistShare = 0.5) {
    this.update();
    const ua = this.byName['uarm' + side], fa = this.byName['farm' + side];
    const S = ua.getWorldPosition(new THREE.Vector3());
    const sc = this.group.scale.x, L1 = 0.29 * sc, L2 = 0.255 * sc;
    this._twoBone(S, target, pole, L1, L2, (E, W, x) => {
      const yU = S.clone().sub(E).normalize();
      const zU = new THREE.Vector3().crossVectors(x, yU).normalize();
      this.setWorldQ('uarm' + side, new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3().crossVectors(yU, zU), yU, zU)));
      const yF = E.clone().sub(W).normalize();
      let zF = new THREE.Vector3().crossVectors(x, yF).normalize();
      let xF = new THREE.Vector3().crossVectors(yF, zF);
      let qF = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(xF, yF, zF));
      if (handQ) { // share the wrist twist with the forearm so the skin doesn't candy-wrap
        const rel = qF.clone().invert().multiply(handQ);
        const tw = new THREE.Quaternion(0, rel.y, 0, rel.w).normalize();
        qF.multiply(new THREE.Quaternion().slerpQuaternions(new THREE.Quaternion(), tw, twistShare));
      }
      this.setWorldQ('farm' + side, qF);
      if (handQ) this.setWorldQ('hand' + side, handQ);
    });
    void fa;
  }
  legIK(side, ankle, pole) {
    this.update();
    const th = this.byName['thigh' + side];
    const S = th.getWorldPosition(new THREE.Vector3());
    const sc = this.group.scale.x;
    const footQ = this.byName['foot' + side].getWorldQuaternion(new THREE.Quaternion());
    this._twoBone(S, ankle, pole, 0.4202 * sc, 0.4156 * sc, (E, W, x) => {
      const yU = S.clone().sub(E).normalize(), zU = new THREE.Vector3().crossVectors(x, yU).normalize();
      this.setWorldQ('thigh' + side, new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3().crossVectors(yU, zU), yU, zU)));
      const yF = E.clone().sub(W).normalize(), zF = new THREE.Vector3().crossVectors(x, yF).normalize();
      this.setWorldQ('shin' + side, new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3().crossVectors(yF, zF), yF, zF)));
      this.setWorldQ('foot' + side, footQ);
    }, true);
  }
  _twoBone(S, T, pole, L1, L2, apply, knee = false) {
    const d = T.clone().sub(S); let dl = d.length();
    dl = Math.min(dl, (L1 + L2) * 0.9995); dl = Math.max(dl, Math.abs(L1 - L2) + 1e-3);
    const dir = d.clone().normalize();
    const cosA = (L1 * L1 + dl * dl - L2 * L2) / (2 * L1 * dl);
    const a = Math.acos(Math.max(-1, Math.min(1, cosA)));
    let pv = pole.clone().sub(S); pv.sub(dir.clone().multiplyScalar(pv.dot(dir)));
    if (pv.lengthSq() < 1e-8) pv.set(0, 0, knee ? 1 : -1);
    pv.normalize();
    const E = S.clone().addScaledVector(dir, Math.cos(a) * L1).addScaledVector(pv, Math.sin(a) * L1);
    const W = S.clone().addScaledVector(dir, dl);
    // hinge axis: perpendicular to the bend plane, oriented so the far segment bends toward local +Z (arms) / -Z (knees)
    let x = new THREE.Vector3().crossVectors(pv, dir).normalize();
    if (knee) x.negate();
    apply(E, W, x);
  }
  /** fingers: per-finger curl [mcp, pip, dip] degrees, spread degrees; thumb uses curl + opp (opposition) */
  fingers(side, pose) {
    const sg = side === 'L' ? -1 : 1;
    for (const f of ['index', 'middle', 'ring', 'pinky']) {
      const c = pose[f] || pose.all || [0, 0, 0], sp = (pose.spread || 0) * ({ index: 1, middle: 0.2, ring: -0.6, pinky: -1.2 })[f];
      for (let k = 0; k < 3; k++) {
        const n = `${f}${k}${side}`, i = this.bones.indexOf(this.byName[n]);
        const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(k === 0 ? sp * D : 0, 0, sg * c[k] * D));
        this.byName[n].quaternion.copy(this.restQ[i]).multiply(q);
      }
    }
    const t = pose.thumb || [0, 0, 0], opp = pose.opp || 0;
    for (let k = 0; k < 3; k++) {
      const n = `thumb${k}${side}`, i = this.bones.indexOf(this.byName[n]);
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(k === 0 ? opp * D * -1 : 0, 0, sg * t[k] * D));
      this.byName[n].quaternion.copy(this.restQ[i]).multiply(q);
    }
  }
  /** aim head (+neck share) and eyes at a world point — yaw/pitch only (no roll) */
  look(target, amt = 1, neckShare = 0.35) {
    this.update();
    const chest = this.byName.chest, neck = this.byName.neck, head = this.byName.head;
    const hp = head.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.08, 0).applyQuaternion(chest.getWorldQuaternion(new THREE.Quaternion())));
    const cq = chest.getWorldQuaternion(new THREE.Quaternion());
    const d = target.clone().sub(hp).applyQuaternion(cq.clone().invert()).normalize(); // in the chest frame (rest-aligned)
    let yaw = Math.atan2(d.x, d.z), pitch = -Math.asin(Math.max(-1, Math.min(1, d.y)));
    yaw = Math.max(-1.25, Math.min(1.25, yaw)) * amt; pitch = Math.max(-0.75, Math.min(0.85, pitch)) * amt;
    const ni = this.bones.indexOf(neck), hi = this.bones.indexOf(head);
    neck.quaternion.copy(this.restQ[ni]).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch * neckShare, yaw * neckShare, 0, 'YXZ')));
    head.quaternion.copy(this.restQ[hi]).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch * (1 - neckShare), yaw * (1 - neckShare), 0, 'YXZ')));
    this.aimEyes(target);
  }
  aimEyes(target) {
    this.update();
    for (const e of this.eyes) {
      const p = e.getWorldPosition(new THREE.Vector3());
      const pq = e.parent.getWorldQuaternion(new THREE.Quaternion());
      const dirL = target.clone().sub(p).normalize().applyQuaternion(pq.clone().invert());
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), dirL);
      // clamp
      const a = 2 * Math.acos(Math.min(1, Math.abs(q.w))); if (a > 0.6) q.slerp(new THREE.Quaternion(), 1 - 0.6 / a);
      e.quaternion.copy(q);
    }
  }
  /** attach an object to a bone with an offset in the bone's rest-aligned frame */
  attach(obj, boneName, pos = [0, 0, 0], q = null) {
    const b = this.byName[boneName]; b.add(obj); obj.position.set(...pos); if (q) obj.quaternion.copy(q); return obj;
  }
}

export const GRIPS = {
  relax: { all: [8, 12, 8], thumb: [0, 8, 6], spread: 0 },
  open: { all: [0, 2, 2], thumb: [-10, 0, 0], spread: 6 },
  fist: { all: [85, 95, 60], thumb: [20, 40, 30], opp: 30 },
  hold: { index: [55, 62, 35], middle: [62, 66, 38], ring: [66, 66, 38], pinky: [70, 66, 38], thumb: [10, 30, 25], opp: 40 },
  holdThin: { index: [62, 85, 45], middle: [68, 88, 48], ring: [72, 86, 48], pinky: [76, 82, 45], thumb: [15, 35, 30], opp: 45 },
  pinch: { index: [35, 45, 20], middle: [45, 60, 35], ring: [55, 70, 40], pinky: [62, 72, 40], thumb: [5, 25, 20], opp: 35 },
  rim: { index: [25, 30, 15], middle: [28, 32, 16], ring: [32, 34, 18], pinky: [36, 36, 18], thumb: [0, 10, 8], opp: 15, spread: 4 },
  point: { index: [0, 4, 2], middle: [70, 90, 50], ring: [75, 90, 50], pinky: [80, 90, 50], thumb: [20, 35, 25], opp: 30 },
};
