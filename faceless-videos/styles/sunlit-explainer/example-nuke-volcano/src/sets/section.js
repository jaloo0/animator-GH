// The volcano cut in half like a geology model (diorama units): strata, the magma chamber, the conduit, a drill
// shaft with mile marks and a rig on the flank, the bomb lowered on a cable; then the blast and the cracks.
import * as THREE from 'three';
import { makeSky } from '../core/sky.js';
import { noise2, printText, rock } from '../core/tex.js';
import { mesh, decal, pbr } from '../props/kit.js';
import { GLSL_NOISE, GLSL_LAVA, particles } from './fx.js';
import { makeBomb } from '../props/bomb.js';

export const SX = 2.6;                      // shaft x
export const CH = { x: 0, y: -8.5, rx: 4.2, ry: 1.7 }; // chamber
const n = noise2(3);
export function mountain(x, z) {
  const r = Math.hypot(x, z);
  let h = 9 * Math.exp(-((r / 6) ** 1.6));
  h -= 1.3 * Math.exp(-((r / 1.0) ** 2));
  h += (n.fbm(x * 0.4 + 9, z * 0.4 + 9, 3) - 0.5) * 0.35 * Math.min(1, r / 3);
  return h;
}
export const SURF = mountain(SX, 0);               // shaft top
export const MILE = (SURF - (CH.y + CH.ry * Math.sqrt(1 - (SX / CH.rx) ** 2))) / 4; // 4 miles from rig to chamber roof
export const SHAFT_BOTTOM = CH.y + CH.ry * Math.sqrt(1 - (SX / CH.rx) ** 2);

export function buildSection(renderer) {
  const scene = new THREE.Scene();
  const sky = makeSky(renderer, { az: -35, el: 40, top: 0x0b2f9a, mid: 0x2e6ad8, haze: 0xc4dbf4, ground: 0x4a4038, sunCol: 0xfff0d8, sunI: 3.4, cloud: 0.45, glow: 0.6 });
  scene.add(sky.dome, sky.sun, sky.sun.target); scene.environment = sky.env;
  scene.fog = new THREE.Fog(0xb0c8ea, 60, 220);
  scene.add(new THREE.HemisphereLight(0x8fb0e8, 0x4a3a30, 0.5));

  // the cut face: a shape following the mountain profile at z = 0
  const XW = 70, BOT = -16;
  const shape = new THREE.Shape(); shape.moveTo(-XW, BOT); shape.lineTo(XW, BOT);
  for (let i = 0; i <= 700; i++) { const x = XW - i * (2 * XW / 700); shape.lineTo(x, mountain(x, 0)); }
  shape.closePath();
  const faceGeo = new THREE.ShapeGeometry(shape, 1);
  const FU = { uTime: { value: 0 }, uShaft: { value: SHAFT_BOTTOM }, uCrack: { value: 0 }, uBlast: { value: 0 }, uBlastR: { value: 0 }, uBX: { value: SX }, uBY: { value: SHAFT_BOTTOM - 0.4 }, uMile: { value: MILE }, uSurf: { value: SURF } };
  const face = new THREE.Mesh(faceGeo, new THREE.ShaderMaterial({
    uniforms: FU,
    vertexShader: /* glsl */`varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */`
      uniform float uTime, uShaft, uCrack, uBlast, uBlastR, uBX, uBY, uMile, uSurf; varying vec2 vP;
      ${GLSL_NOISE} ${GLSL_LAVA}
      float prof(float x){ float r = abs(x); return 9.0 * exp(-pow(r / 6.0, 1.6)) - 1.3 * exp(-(r * r)); }
      void main(){
        vec2 p = vP; float x = p.x, y = p.y;
        float depth = prof(x) - y;                                     // below the surface
        // strata: upper layers follow the slope, deeper ones flatten out
        float L = y - prof(x) * mix(0.85, 0.2, smoothstep(0.0, 9.0, depth)) + (fbm(p * 0.35) - 0.5) * 1.6;
        float band = floor(L * 0.9);
        float hv = fract(sin(band * 91.7) * 4375.85);
        vec3 c = mix(vec3(0.30, 0.255, 0.215), vec3(0.42, 0.355, 0.285), hv);
        c = mix(c, vec3(0.2, 0.18, 0.17), step(0.72, hv));
        c *= 0.82 + 0.3 * fbm(p * 2.5) - 0.12 * smoothstep(0.45, 0.5, fract(L * 0.9));
        c = mix(vec3(0.14, 0.11, 0.09), c, smoothstep(0.15, 0.6, depth));  // dark ash skin at the surface
        c *= 0.72;
        vec3 em = vec3(0.0);
        // magma chamber (blobby ellipse) + conduit to the crater
        vec2 q = (p - vec2(${CH.x.toFixed(2)}, ${CH.y.toFixed(2)})) / vec2(${CH.rx.toFixed(2)}, ${CH.ry.toFixed(2)});
        float ch = length(q) - 1.0 + (fbm(p * 1.1 + 4.0) - 0.5) * 0.35;
        float cond = abs(x + sin(y * 0.8) * 0.18) - (0.28 + 0.1 * fbm(vec2(y * 0.9, 1.0)));
        cond = max(cond, step(prof(0.0) - 0.15, y) - 0.5 + (y < ${CH.y.toFixed(2)} ? 1.0 : 0.0));
        float magma = min(ch, cond * 1.4);
        vec3 lv = lavaColor(p * 1.4, uTime, 0.93, 0.8);
        float inM = smoothstep(0.02, -0.02, magma);
        c = mix(c, vec3(0.0), inM); em += lv * inM;
        em += vec3(1.2, 0.18, 0.02) * exp(-max(magma, 0.0) * 5.0) * (1.0 - inM) * 0.9;   // heated rock around it
        // drill shaft with lit edges
        float sh = abs(x - ${SX.toFixed(2)}) - 0.11;
        float inS = step(sh, 0.0) * step(uShaft, y);
        c = mix(c, vec3(0.05, 0.05, 0.055), inS);
        c = mix(c, vec3(0.62, 0.6, 0.56), step(abs(sh), 0.018) * step(uShaft, y));
        // mile ticks along the right of the shaft
        for (int k = 1; k <= 4; k++){ float yy = uSurf - float(k) * uMile; float tick = step(abs(y - yy), 0.03) * step(${(SX + 0.15).toFixed(2)}, x) * step(x, ${(SX + 0.6).toFixed(2)});
          c = mix(c, vec3(0.92, 0.9, 0.85), tick); }
        // cracks growing upward from the chamber roof
        float top = ${CH.y.toFixed(2)} + ${CH.ry.toFixed(2)} * 0.6 + uCrack * (prof(x) + 8.5);
        float zone = smoothstep(6.5, 2.0, abs(x - 0.8)) * step(y, top) * step(${(CH.y).toFixed(2)}, y) * step(0.001, uCrack);
        float cr1 = abs(fbm(vec2(x * 1.6, y * 0.32) + 2.0) - 0.5);
        float cr2 = abs(fbm(vec2(x * 3.1 + 7.0, y * 0.55) + 5.0) - 0.5);
        float crack = max(smoothstep(0.022, 0.004, cr1), 0.7 * smoothstep(0.014, 0.003, cr2)) * zone;
        float tipGlow = smoothstep(1.2, 0.0, top - y);
        c = mix(c, vec3(0.02), crack); em += vec3(6.0, 1.6, 0.15) * crack * (0.55 + 0.6 * tipGlow);
        // the blast: white-hot ball + a shock ring in the rock
        float d = length(p - vec2(uBX, uBY));
        float ball = smoothstep(uBlastR, uBlastR * 0.7, d) * uBlast;
        em += mix(vec3(9.0, 3.2, 0.6), vec3(30.0, 26.0, 20.0), smoothstep(uBlastR, 0.0, d)) * ball;
        float ring = exp(-pow((d - uBlastR * 1.9) * 5.0, 2.0)) * uBlast * step(0.01, uBlastR);
        em += vec3(3.0, 1.0, 0.2) * ring;
        gl_FragColor = vec4(c + em, 1.0);
      }`,
  }));
  scene.add(face);

  // the half mountain behind the cut (z < 0), and wide ground
  const mg = new THREE.PlaneGeometry(140, 90, 280, 180); mg.rotateX(-Math.PI / 2); mg.translate(0, 0, -45);
  const P = mg.attributes.position; for (let i = 0; i < P.count; i++) { const x = P.getX(i), z = Math.min(P.getZ(i), 0); P.setXYZ(i, x, mountain(x, z), z); }
  mg.computeVertexNormals();
  const col = new Float32Array(P.count * 3);
  for (let i = 0; i < P.count; i++) { const x = P.getX(i), y = P.getY(i), z = P.getZ(i), r = Math.hypot(x, z), v = n.fbm(x * 0.2, z * 0.2, 3);
    const k = Math.min(1, Math.max(0, (r - 4) / 8)); const a = [0.12, 0.105, 0.1], b = [0.27, 0.27, 0.16];
    for (let j = 0; j < 3; j++) col[i * 3 + j] = (a[j] + (b[j] - a[j]) * k) * (0.8 + 0.4 * v); }
  mg.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const mm = pbr(rock(17, { base: 0x9a9088 }), { repeat: [40, 30], rough: 0.96 }); mm.vertexColors = true;
  scene.add(mesh(mg, mm, { cast: true }));
  // crater glow
  const glow = new THREE.PointLight(0xff5a14, 6, 8, 1.5); glow.position.set(0, mountain(0, 0) + 0.6, -0.6); scene.add(glow);

  // labels beside the shaft
  const labels = [];
  ['1 MILE', '2 MILES', '3 MILES', '4 MILES'].forEach((s, k) => {
    const d = decal(1.3, 0.34, (c) => printText(c, [s], { font: 'Rockwell', size: 190, color: '#f0ebe0', wear: 0.05, x: 0.0, align: 'left' }), { res: 1024 });
    d.position.set(SX + 0.68 + 0.65, SURF - (k + 1) * MILE, 0.01); scene.add(d); labels.push(d);
  });

  // drill rig on the flank: four legs + braces + crown block, winch
  const rig = new THREE.Group(); rig.position.set(SX, SURF, -0.0); scene.add(rig);
  const steel = new THREE.MeshStandardMaterial({ color: 0xd0a22e, metalness: 0.55, roughness: 0.45 });
  const Hh = 1.7, b0 = 0.38, b1 = 0.07;
  for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
    const a = new THREE.Vector3(sx * b0, 0, sz * b0 * 0.7 - 0.3), b = new THREE.Vector3(sx * b1, Hh, sz * b1 - 0.3);
    const len = a.distanceTo(b); const leg = mesh(new THREE.CylinderGeometry(0.018, 0.022, len, 8), steel, { parent: rig });
    leg.position.copy(a).lerp(b, 0.5); leg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  }
  for (let k = 1; k < 5; k++) { const y = k * Hh / 5, w = b0 + (b1 - b0) * (y / Hh); mesh(new THREE.BoxGeometry(w * 2, 0.02, 0.02), steel, { parent: rig, pos: [0, y, w * 0.7 - 0.3] }); mesh(new THREE.BoxGeometry(w * 2, 0.02, 0.02), steel, { parent: rig, pos: [0, y, -w * 0.7 - 0.3] }); }
  mesh(new THREE.BoxGeometry(0.22, 0.1, 0.22), steel, { parent: rig, pos: [0, Hh, -0.3] });
  mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.3, 16), new THREE.MeshStandardMaterial({ color: 0x4a4d50, metalness: 0.6, roughness: 0.4 }), { parent: rig, pos: [0.55, 0.12, -0.3], rot: [Math.PI / 2, 0, 0] });

  // the bomb (scaled) on its cable
  const bomb = makeBomb(); const BS = 0.16; bomb.group.scale.setScalar(BS); bomb.group.rotation.z = -Math.PI / 2; scene.add(bomb.group);
  const cable = mesh(new THREE.CylinderGeometry(0.006, 0.006, 1, 6).translate(0, -0.5, 0), new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.6 }), { parent: scene, cast: false });
  const flashL = new THREE.PointLight(0xffd8a0, 0, 40, 1.4); flashL.position.set(SX, SHAFT_BOTTOM, 2.5); scene.add(flashL);
  const dust = particles({ count: 120, origin: [SX, SURF + 0.05, 0.1], spread: [0.4, 0.02, 0.25], dir: [0, 1, 0], cone: 0.8, speed: [0.05, 0.25], rise: 0.12, turb: 0.05, life: [1.5, 3],
    birth: [20.2, 23.5], size: [0.05, 0.25], colA: 0x8a7a6a, colB: 0x6a6058, alpha: 0.4, seed: 101 });
  scene.add(dust);

  const set = {
    name: 'section', scene, sky, face, FU, bomb, cable, flashL, rig, labels,
    reset() { bomb.reset(); FU.uCrack.value = 0; FU.uBlast.value = 0; FU.uBlastR.value = 0; flashL.intensity = 0; bomb.group.visible = true; cable.visible = true; },
    /** bomb nose-down, centre at y */
    lower(y) { bomb.group.position.set(SX, y, 0.07); cable.position.set(SX, SURF + 1.7, -0.0); cable.scale.set(1, SURF + 1.7 - (y + bomb.length * BS / 2), 1); },
    update(t, lt, r) { FU.uTime.value = t; dust.update(t); if (r?.cam) sky.dome.position.set(...r.cam.pos); },
  };
  return set;
}
