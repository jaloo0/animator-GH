// The hero bomb (our own design — fictional "XB-30 test article"): a long steel-grey casing with an ogive nose,
// a yellow warning band, ring-braced tail fins and stencilled markings. Built along +X (nose at +X), 3.6 m long.
// Two shell halves (rear / nose) so it can crack open; an X-ray shell and the insides (wiring, circuit board,
// the explosive sphere) for the cutaway shots.
import * as THREE from 'three';
import { canvas, printText, toTex, noise2, sstep } from '../core/tex.js';
import { mesh, ringLathe } from './kit.js';

const L = 3.6, R0 = 0.23, SPLIT = 0.55; // length, body radius, x of the crack between rear and nose

// profile (x along the bomb, r) — tail cone → body → ogive nose
function profile() {
  const pts = [];
  pts.push([-1.8, 0.0], [-1.8, 0.13], [-1.62, 0.15], [-1.25, 0.2], [-1.1, R0]);
  for (let i = 0; i <= 6; i++) pts.push([-1.1 + i * (2.0 / 6), R0]);
  for (let i = 1; i <= 14; i++) { const u = i / 14; pts.push([0.9 + u * 0.9, R0 * Math.sqrt(Math.max(0, 1 - u * u)) * (1 - 0.06 * u) + 0.0001]); }
  return pts;
}
const radiusAt = (x) => { const P = profile(); for (let i = 1; i < P.length; i++) if (x <= P[i][0]) { const [x0, r0] = P[i - 1], [x1, r1] = P[i]; return r0 + (r1 - r0) * (x - x0) / Math.max(1e-6, x1 - x0); } return 0; };

function paintShell() {
  const W = 2048, H = 512, c = canvas(W, H), x = c.getContext('2d');
  const n = noise2(41);
  // u = along the bomb (tail → nose), v = around
  const img = x.createImageData(W, H), d = img.data;
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const u = i / W, o = (j * W + i) * 4;
    const xb = -1.8 + u * L;
    let col = [178, 182, 178];                                    // steel grey paint
    if (xb > 0.98 && xb < 1.2) col = [226, 178, 58];             // yellow warning band
    if (xb < -1.1) col = [96, 100, 98];                          // darker tail cone
    if (xb > 1.62) col = [70, 72, 72];                           // dark nose tip
    const g = 0.9 + 0.12 * n.fbm(i * 0.01, j * 0.03, 4) - 0.05 * n(i * 0.4, j * 0.4);
    const seam = Math.abs(xb - SPLIT) < 0.006 || Math.abs(xb + 0.4) < 0.004 ? 0.55 : 1;
    d[o] = col[0] * g * seam; d[o + 1] = col[1] * g * seam; d[o + 2] = col[2] * g * seam; d[o + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  // panel rivet rows
  x.fillStyle = 'rgba(40,42,42,0.55)';
  for (const xb of [-1.0, -0.4, 0.2, SPLIT + 0.06]) for (let k = 0; k < 24; k++) { x.beginPath(); x.arc((xb + 1.8) / L * W, (k + 0.5) / 24 * H, 2.6, 0, 7); x.fill(); }
  // stencilled markings, two sides
  for (const vy of [0.25, 0.75]) {
    printText(c, ['XB-30'], { font: 'Rockwell', size: 92, x: (0.05 + 1.8) / L, y: vy, color: '#202322', style: 'stencil', seed: 3, track: 6 });
    printText(c, ['TEST ARTICLE  ·  HANDLE WITH CARE'], { font: 'Rockwell', size: 30, x: (0.05 + 1.8) / L, y: vy + 0.09, color: '#202322', style: 'slab', seed: 5, wear: 0.5 });
  }
  // trefoil on the band side
  for (const vy of [0.0, 0.5]) trefoil(x, (1.09 + 1.8) / L * W, (vy + 0.25) * H, 34);
  return c;
}
export function trefoil(x, cx, cy, r, ink = '#1d1f1f') {
  x.save(); x.translate(cx, cy); x.fillStyle = ink;
  x.beginPath(); x.arc(0, 0, r * 0.18, 0, 7); x.fill();
  for (let k = 0; k < 3; k++) { const a = -Math.PI / 2 + k * (2 * Math.PI / 3); x.beginPath(); x.moveTo(Math.cos(a - 0.52) * r * 0.3, Math.sin(a - 0.52) * r * 0.3); x.arc(0, 0, r, a - 0.52, a + 0.52); x.arc(0, 0, r * 0.3, a + 0.52, a - 0.52, true); x.fill(); }
  x.restore();
}

function latheX(pts, seg = 72) {
  const g = new THREE.LatheGeometry(pts.map(([x, r]) => new THREE.Vector2(r, x)), seg);
  // lathe spins around Y with u = angle; remap uv: u = along, v = around, then turn Y → X
  const uv = g.attributes.uv, p = g.attributes.position;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (p.getY(i) + 1.8) / L, uv.getX(i));
  g.rotateZ(-Math.PI / 2);
  return g;
}

/** X-ray shell: additive fresnel rim (cool cyan-white) */
function xrayMat() {
  return new THREE.ShaderMaterial({
    uniforms: { uK: { value: 0 }, uCol: { value: new THREE.Color(0x9fe8ff) } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: /* glsl */`varying vec3 vN, vV; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: /* glsl */`uniform float uK; uniform vec3 uCol; varying vec3 vN, vV;
      void main(){ float f = 1.0 - abs(dot(normalize(vN), normalize(vV))); float a = (pow(f, 2.2) * 1.6 + 0.06) * uK; gl_FragColor = vec4(uCol * a * 2.2, a); }`,
  });
}

export function makeBomb() {
  const group = new THREE.Group(); group.name = 'bomb';
  const tex = toTex(paintShell(), { wrap: false });
  const shellMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.42, metalness: 0.55, transparent: true, opacity: 1, envMapIntensity: 1.1 });
  shellMat.userData.char = { value: 0 }; // 0..1 heat scorch
  shellMat.onBeforeCompile = (sh) => {
    sh.uniforms.uChar = shellMat.userData.char;
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uChar;')
      .replace('#include <map_fragment>', `#include <map_fragment>
        { float k = uChar * smoothstep(0.75, 0.0, vMapUv.x * 0.0 + 0.5 + 0.5 * sin(vMapUv.y * 31.0 + vMapUv.x * 40.0) * 0.3 - uChar * 0.6);
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.05, 0.035, 0.03), clamp(uChar * 0.85, 0.0, 0.85)); }`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        totalEmissiveRadiance += vec3(1.6, 0.25, 0.03) * uChar * uChar * 0.9 * (0.6 + 0.4 * sin(vMapUv.x * 90.0 + vMapUv.y * 20.0));`);
  };
  shellMat.customProgramCacheKey = () => 'bombshell';

  const P = profile();
  const rearPts = P.filter(([x]) => x <= SPLIT); rearPts.push([SPLIT, radiusAt(SPLIT)], [SPLIT, 0.0]);
  const nosePts = [[SPLIT, 0.0], [SPLIT, radiusAt(SPLIT)], ...P.filter(([x]) => x > SPLIT)];
  const rear = new THREE.Group(), nose = new THREE.Group(); group.add(rear, nose);
  const rearM = mesh(latheX(rearPts), shellMat, { parent: rear });
  const noseM = mesh(latheX(nosePts), shellMat, { parent: nose });
  // jagged crack rim on the nose piece (visible when it splits)
  const finMat = new THREE.MeshStandardMaterial({ color: 0x5d6260, roughness: 0.5, metalness: 0.6, transparent: true, opacity: 1 });
  for (let k = 0; k < 4; k++) {
    const fin = mesh(new THREE.BoxGeometry(0.62, 0.012, 0.36), finMat, { parent: rear });
    fin.geometry.translate(0, 0, 0.18 + 0.12);
    fin.position.set(-1.5, 0, 0); fin.rotation.x = k * Math.PI / 2 + Math.PI / 4;
  }
  const ring = mesh(ringLathe(0.43, 0.445, 0.2, 64), finMat, { parent: rear }); ring.rotation.z = Math.PI / 2; ring.position.x = -1.6;
  // lugs
  for (const xb of [-0.35, 0.35]) mesh(new THREE.BoxGeometry(0.08, 0.06, 0.05), finMat, { parent: rear, pos: [xb, R0 + 0.02, 0] });

  // X-ray shell (whole bomb)
  const xm = xrayMat();
  const xray = mesh(latheX(P, 64), xm, { parent: group, cast: false }); xray.renderOrder = 8;
  const xfin = [];
  for (let k = 0; k < 4; k++) { const f = mesh(new THREE.BoxGeometry(0.62, 0.012, 0.36).translate(0, 0, 0.3), xm, { parent: group, pos: [-1.5, 0, 0], rot: [k * Math.PI / 2 + Math.PI / 4, 0, 0], cast: false }); f.renderOrder = 8; xfin.push(f); }

  // insides: explosive sphere (centre), electronics bay (behind it), wiring harness
  const inside = new THREE.Group(); rear.add(inside);
  const hePieces = [];
  const ico = new THREE.IcosahedronGeometry(0.2, 1); const pos = ico.attributes.position;
  const heMat = new THREE.MeshStandardMaterial({ color: 0xc79a5b, roughness: 0.7, emissive: 0x000000 });
  for (let f = 0; f < pos.count; f += 3) {
    const a = new THREE.Vector3().fromBufferAttribute(pos, f), b = new THREE.Vector3().fromBufferAttribute(pos, f + 1), c = new THREE.Vector3().fromBufferAttribute(pos, f + 2);
    const cen = a.clone().add(b).add(c).divideScalar(3);
    const g = wedge(a, b, c, 0.55, 0.92);
    const m = mesh(g, heMat.clone(), { parent: inside, pos: [0.15, 0, 0] }); m.userData.dir = cen.normalize(); hePieces.push(m);
  }
  mesh(new THREE.SphereGeometry(0.1, 24, 16), new THREE.MeshStandardMaterial({ color: 0x8a8d90, metalness: 0.9, roughness: 0.35 }), { parent: inside, pos: [0.15, 0, 0] });
  const pcbMat = new THREE.MeshStandardMaterial({ map: toTex(paintPCB(), { wrap: false }), roughness: 0.5, metalness: 0.1, emissive: 0x000000 });
  const pcb = mesh(new THREE.BoxGeometry(0.42, 0.012, 0.3), pcbMat, { parent: inside, pos: [-0.62, 0.02, 0] });
  const bay = mesh(new THREE.BoxGeometry(0.46, 0.16, 0.32), new THREE.MeshStandardMaterial({ color: 0x3a3e3c, roughness: 0.6, metalness: 0.4 }), { parent: inside, pos: [-0.62, -0.08, 0] });
  const wires = [];
  const wcol = [0xc23a2a, 0xe0b33a, 0x2a2c2c, 0x3a78c2];
  for (let k = 0; k < 7; k++) {
    const z = (k - 3) * 0.035, y0 = 0.05 + (k % 2) * 0.02;
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(-0.45, y0, z), new THREE.Vector3(-0.32, y0 + 0.07, z * 1.4), new THREE.Vector3(-0.16, 0.13 - k * 0.012, z * 2.6), new THREE.Vector3(-0.04, 0.12 - k * 0.02, z * 3.3)]);
    wires.push(mesh(new THREE.TubeGeometry(curve, 24, 0.008, 6), new THREE.MeshStandardMaterial({ color: wcol[k % 4], roughness: 0.5, emissive: 0x000000 }), { parent: inside }));
  }
  inside.visible = false;

  const api = {
    group, rear, nose, rearM, noseM, xray, xfin, inside, hePieces, pcb, wires, shellMat, finMat, length: L, radius: R0,
    /** 0 = painted shell, 1 = full X-ray (shell fades, rim glows, insides show) */
    setXray(k) {
      const op = 1 - 0.94 * k;
      shellMat.opacity = finMat.opacity = op; shellMat.depthWrite = finMat.depthWrite = k < 0.5;
      xm.uniforms.uK.value = k; xray.visible = k > 0.001; xfin.forEach((f) => (f.visible = k > 0.001));
      inside.visible = k > 0.001;
    },
    setChar(k) { shellMat.userData.char.value = k; },
    reset() {
      api.setXray(0); api.setChar(0);
      rear.position.set(0, 0, 0); rear.rotation.set(0, 0, 0); nose.position.set(0, 0, 0); nose.rotation.set(0, 0, 0);
      hePieces.forEach((m) => { m.material.emissive.setRGB(0, 0, 0); m.position.set(0.15, 0, 0); });
      pcbMat.emissive.setRGB(0, 0, 0); wires.forEach((w) => w.material.emissive.setRGB(0, 0, 0));
    },
    pcbMat,
  };
  api.reset();
  return api;
}

/** a wedge block between triangle (a,b,c) on a sphere and an inner sphere (radius ratio rin), shrunk toward its centre */
export function wedge(a, b, c, rin = 0.55, shrink = 0.92) {
  const cen = a.clone().add(b).add(c).divideScalar(3);
  const s = (v) => cen.clone().lerp(v, shrink);
  const A = s(a), B = s(b), C = s(c);
  const Ai = A.clone().multiplyScalar(rin), Bi = B.clone().multiplyScalar(rin), Ci = C.clone().multiplyScalar(rin);
  const v = [A, B, C, Ai, Ci, Bi, A, Ai, B, B, Ai, Bi, B, Bi, C, C, Bi, Ci, C, Ci, A, A, Ci, Ai];
  const g = new THREE.BufferGeometry().setFromPoints(v);
  g.computeVertexNormals();
  return g;
}

function paintPCB() {
  const W = 512, H = 384, c = canvas(W, H), x = c.getContext('2d');
  x.fillStyle = '#1f6b3a'; x.fillRect(0, 0, W, H);
  x.strokeStyle = '#d9b45a'; x.lineWidth = 3;
  const n = noise2(77);
  for (let k = 0; k < 40; k++) { const y = 10 + k * 9; x.beginPath(); x.moveTo(0, y); let xx = 0; while (xx < W) { xx += 30 + n(k, xx) * 60; x.lineTo(xx, y + (n(xx, k) > 0.6 ? 9 : 0)); } x.stroke(); }
  x.fillStyle = '#16181a';
  for (const [cx, cy, w, h] of [[90, 120, 110, 80], [300, 90, 80, 80], [380, 250, 90, 60], [150, 270, 70, 50]]) x.fillRect(cx, cy, w, h);
  x.fillStyle = '#c8cacb'; for (let k = 0; k < 30; k++) x.fillRect(20 + (k * 53) % 470, 20 + (k * 97) % 340, 10, 6);
  return c;
}
