// The Hale house front hall, 1990 — built entirely in code.
// Axes: x ∈ [-2, 2] (stairs on the left wall), z ∈ [-4, 2.6] (front door at z=-4, closet at the far end z=+2.6), ceiling 2.7 m.
import * as THREE from 'three';
import { floorPlanks, walnut, wallpaper, rug, portrait, photo, glow } from '../core/tex.js';

const X0 = -2, X1 = 2, Z0 = -4, Z1 = 2.6, CEIL = 2.7, WAIN = 0.95;
export const HALL = { X0, X1, Z0, Z1, CEIL, door: { x: 0.35, w: 0.92, h: 2.08 }, closet: { x: -0.35, w: 0.78, h: 2.0, hinge: -0.74 }, phone: new THREE.Vector3(1.985, 1.42, -0.62), lamp: new THREE.Vector3(-0.55, 1.5, -3.42) };
const STEPS = 15, RISE = 0.19, RUN = 0.24, SZ = 1.45, SX0 = -2, SX1 = -1.05;

function scaleUV(g, su, sv) { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv); return g; }
function boxGeo(w, h, d, tile = 0.6) {
  const g = new THREE.BoxGeometry(w, h, d), uv = g.attributes.uv;
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) { const i = f * 4 + k; uv.setXY(i, uv.getX(i) * dims[f][0] / tile, uv.getY(i) * dims[f][1] / tile); }
  return g;
}

export function buildHall(scene, renderer) {
  const root = new THREE.Group(); scene.add(root);
  const add = (m, cast = true, recv = true, parent = root) => { m.castShadow = cast; m.receiveShadow = recv; parent.add(m); return m; };
  const box = (w, h, d, mat, x, y, z, o = {}) => { const m = add(new THREE.Mesh(boxGeo(w, h, d, o.tile ?? 0.6), mat), o.cast ?? true, o.recv ?? true, o.parent ?? root); m.position.set(x, y, z); if (o.ry) m.rotation.y = o.ry; if (o.rx) m.rotation.x = o.rx; return m; };

  // ---------- materials ----------
  const fl = floorPlanks(3);
  const M = {
    floor: new THREE.MeshStandardMaterial({ map: fl.map, roughnessMap: fl.rough, roughness: 1, metalness: 0, transparent: true, opacity: 0.84, bumpMap: fl.rough, bumpScale: 0.6 }),
    paper: new THREE.MeshStandardMaterial({ map: wallpaper(7), roughness: 0.88 }),
    ceil: new THREE.MeshStandardMaterial({ color: 0x8c7a62, roughness: 0.95, side: THREE.DoubleSide }),
    rug: new THREE.MeshStandardMaterial({ map: rug(11), roughness: 0.97 }),
  };
  const w1 = walnut(5), w2 = walnut(21, { dark: 0.75 }), w3 = walnut(33, { dark: 0.62, stretch: 30 });
  M.panel = new THREE.MeshStandardMaterial({ map: w1.map, roughnessMap: w1.rough, roughness: 0.9 });
  M.trim = new THREE.MeshStandardMaterial({ map: w2.map, roughnessMap: w2.rough, roughness: 0.8 });
  M.stair = new THREE.MeshStandardMaterial({ map: w3.map, roughnessMap: w3.rough, roughness: 0.75 });
  M.door = new THREE.MeshStandardMaterial({ map: w2.map, roughnessMap: w2.rough, roughness: 0.7, color: 0xb08878 });
  M.brass = new THREE.MeshStandardMaterial({ color: 0xc09a58, metalness: 1, roughness: 0.32 });
  M.ivory = new THREE.MeshStandardMaterial({ color: 0xd8cbb0, roughness: 0.42 });
  M.iron = new THREE.MeshStandardMaterial({ color: 0xc9bea8, roughness: 0.55 });
  M.dark = new THREE.MeshStandardMaterial({ color: 0x1a1210, roughness: 0.8 });
  M.cloth = new THREE.MeshStandardMaterial({ color: 0x2a221c, roughness: 1 });

  // ---------- floor, ceiling, walls ----------
  const FW = X1 - X0, FD = Z1 - Z0;
  const floor = add(new THREE.Mesh(scaleUV(new THREE.PlaneGeometry(FW, FD), FW / 2, FD / 2), M.floor), false, true);
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, (Z0 + Z1) / 2); floor.renderOrder = 2;
  const runner = add(new THREE.Mesh(new THREE.PlaneGeometry(1.1, 5.3), M.rug), false, true);
  runner.rotation.x = -Math.PI / 2; runner.position.set(0.48, 0.006, -0.7); runner.renderOrder = 3;
  // ceiling with the stairwell opening over x<-1, z∈[-2.15, 1.45]
  const ceil = (x0, x1, z0, z1) => { const m = add(new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), M.ceil), false, true); m.rotation.x = Math.PI / 2; m.position.set((x0 + x1) / 2, CEIL, (z0 + z1) / 2); };
  ceil(-1.0, X1, Z0, Z1); ceil(X0, -1.0, Z0, -2.15); ceil(X0, -1.0, 1.45, Z1);

  const UPH = 5.4;
  const wall = (len, h, x, y, z, ry) => { const m = add(new THREE.Mesh(scaleUV(new THREE.PlaneGeometry(len, h), len / 0.5, h / 0.5), M.paper), false, true); m.position.set(x, y, z); m.rotation.y = ry; return m; };
  const wains = (len, x, z, ry, from = 0) => {
    // panelled walnut dado: backing + raised panels + cap rail + baseboard
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; root.add(g);
    box(len, WAIN, 0.02, M.panel, 0, WAIN / 2, 0.01, { parent: g, cast: false });
    const n = Math.max(1, Math.round(len / 0.55)), pw = len / n;
    for (let k = 0; k < n; k++) box(pw - 0.1, WAIN - 0.36, 0.018, M.panel, -len / 2 + pw * (k + 0.5), 0.2 + (WAIN - 0.36) / 2 + 0.03, 0.028, { parent: g, cast: false, tile: 0.4 });
    box(len, 0.05, 0.05, M.trim, 0, WAIN, 0.035, { parent: g });
    box(len, 0.16, 0.03, M.trim, 0, 0.08, 0.03, { parent: g });
    return g;
  };
  // right wall x=+2 (faces -x)
  wall(FD, UPH, X1, UPH / 2, (Z0 + Z1) / 2, -Math.PI / 2); wains(FD, X1, (Z0 + Z1) / 2, -Math.PI / 2);
  // left wall x=-2 (faces +x): papered all the way up (stairs climb in front of it)
  wall(FD, UPH, X0, UPH / 2, (Z0 + Z1) / 2, Math.PI / 2);
  wains(Z0 + 1.9 - Z0, X0, Z0 + 0.95, Math.PI / 2); wains(Z1 - SZ - 0.05, X0, (SZ + 0.05 + Z1) / 2, Math.PI / 2);
  // back wall z=-4 with the front door opening
  const D = HALL.door, dl = D.x - D.w / 2 - 0.02, dr = D.x + D.w / 2 + 0.02;
  wall(dl - X0, UPH, (X0 + dl) / 2, UPH / 2, Z0, 0); wall(X1 - dr, UPH, (X1 + dr) / 2, UPH / 2, Z0, 0); wall(dr - dl, UPH - D.h, D.x, (UPH + D.h) / 2, Z0, 0);
  wains(dl - X0, (X0 + dl) / 2, Z0, 0); wains(X1 - dr, (X1 + dr) / 2, Z0, 0);
  // end wall z=+2.6 with the closet opening
  const C = HALL.closet, cl = C.x - C.w / 2 - 0.02, cr = C.x + C.w / 2 + 0.02;
  wall(cl - X0, UPH, (X0 + cl) / 2, UPH / 2, Z1, Math.PI); wall(X1 - cr, UPH, (X1 + cr) / 2, UPH / 2, Z1, Math.PI); wall(cr - cl, UPH - C.h, C.x, (UPH + C.h) / 2, Z1, Math.PI);
  wains(cl - X0 - 0.0, (X0 + cl) / 2, Z1, Math.PI); wains(X1 - cr, (X1 + cr) / 2, Z1, Math.PI);
  // crown moulding
  for (const [l, x, z, ry] of [[FD, X1 - 0.04, (Z0 + Z1) / 2, Math.PI / 2], [FW, 0, Z0 + 0.04, 0], [FW, 0, Z1 - 0.04, 0]]) box(l, 0.1, 0.08, M.trim, x, CEIL - 0.05, z, { ry });

  // ---------- front door (back wall) ----------
  const frontDoor = new THREE.Group(); frontDoor.position.set(D.x, 0, Z0 + 0.02); root.add(frontDoor);
  box(D.w, D.h, 0.045, M.door, 0, D.h / 2, 0, { parent: frontDoor, tile: 0.9 });
  for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) {
    const ph = [0.42, 0.62, 0.62][r], py = [1.68, 1.08, 0.42][r];
    box(0.3, ph, 0.02, M.door, (c - 0.5) * 0.4, py, 0.03, { parent: frontDoor, tile: 0.9 });
    box(0.26, ph - 0.04, 0.012, M.trim, (c - 0.5) * 0.4, py, 0.045, { parent: frontDoor, tile: 0.9 });
  }
  const knob = add(new THREE.Mesh(new THREE.SphereGeometry(0.032, 24, 16), M.brass), true, true, frontDoor); knob.position.set(0.36, 0.98, 0.07);
  const rose = add(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.02, 24), M.brass), true, true, frontDoor); rose.rotation.x = Math.PI / 2; rose.position.set(0.36, 0.98, 0.035);
  const lock = add(new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.02, 20), M.brass), true, true, frontDoor); lock.rotation.x = Math.PI / 2; lock.position.set(0.36, 1.22, 0.035);
  // casing
  box(0.09, D.h + 0.09, 0.03, M.trim, dl - 0.025, (D.h + 0.09) / 2, Z0 + 0.02); box(0.09, D.h + 0.09, 0.03, M.trim, dr + 0.025, (D.h + 0.09) / 2, Z0 + 0.02);
  box(dr - dl + 0.14, 0.1, 0.035, M.trim, D.x, D.h + 0.07, Z0 + 0.02);
  // porch light leaking under the door; `uShadow` slides two dark feet through it
  const underMat = new THREE.ShaderMaterial({
    uniforms: { uI: { value: 1.0 }, uFeet: { value: -9 }, uFeetW: { value: 0.0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform float uI, uFeet, uFeetW; varying vec2 vUv;
      void main(){ float x = (vUv.x - 0.5) * 0.9; float f1 = smoothstep(0.07, 0.04, abs(x - uFeet + 0.09)), f2 = smoothstep(0.07, 0.04, abs(x - uFeet - 0.09));
        float sh = 1.0 - uFeetW * max(f1, f2); float edge = smoothstep(0.0, 0.08, vUv.x) * smoothstep(1.0, 0.92, vUv.x);
        gl_FragColor = vec4(vec3(1.0, 0.78, 0.5) * 3.2 * uI * sh * edge * (0.6 + 0.4 * vUv.y), 1.0); }`,
  });
  const under = new THREE.Mesh(new THREE.PlaneGeometry(D.w - 0.02, 0.012), underMat); under.position.set(D.x, 0.006, Z0 + 0.003); root.add(under);
  const spill = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.5), new THREE.MeshBasicMaterial({ map: glow(256, 2.2), color: new THREE.Color(1.0, 0.72, 0.42).multiplyScalar(0.55), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  spill.rotation.x = -Math.PI / 2; spill.position.set(D.x, 0.008, Z0 + 0.05); spill.scale.set(1, 0.6, 1); spill.renderOrder = 6; root.add(spill);

  // ---------- staircase (left wall, climbing toward the door) ----------
  for (let i = 0; i < STEPS; i++) {
    const z0 = SZ - i * RUN, y = (i + 1) * RISE;
    box(SX1 - SX0, y, RUN, M.stair, (SX0 + SX1) / 2, y / 2, z0 - RUN / 2, { tile: 0.8 });
    box(SX1 - SX0 + 0.04, 0.03, RUN + 0.035, M.trim, (SX0 + SX1) / 2 + 0.02, y + 0.012, z0 - RUN / 2 + 0.017, { tile: 0.8 });
  }
  const slope = Math.atan2(RISE, RUN), nose = (z) => (SZ - z) / RUN * RISE + 0.02;
  // stringer + spandrel trim on the open side
  const strLen = Math.hypot(STEPS * RUN, STEPS * RISE);
  const str = box(0.04, 0.26, strLen, M.trim, SX1 + 0.02, 0, 0); str.position.set(SX1 + 0.02, STEPS * RISE / 2 - 0.06, SZ - STEPS * RUN / 2); str.rotation.x = slope;
  // turned balusters
  const balProf = [[0.0, 0], [0.026, 0], [0.026, 0.12], [0.02, 0.13], [0.022, 0.16], [0.013, 0.2], [0.012, 0.3], [0.02, 0.42], [0.024, 0.5], [0.014, 0.6], [0.011, 0.75], [0.016, 0.86], [0.02, 0.9], [0.02, 1], [0, 1]].map(([r, y]) => new THREE.Vector2(r, y));
  const balGeo = new THREE.LatheGeometry(balProf, 14);
  for (let i = 0; i < STEPS; i++) for (const f of [0.28, 0.75]) {
    const z = SZ - i * RUN - f * RUN, y0 = (i + 1) * RISE + 0.025, y1 = nose(z) + 0.84;
    const m = add(new THREE.Mesh(balGeo, M.trim)); m.position.set(SX1 - 0.05, y0, z); m.scale.set(1, y1 - y0, 1);
  }
  const rail = box(0.06, 0.07, strLen + 0.3, M.trim, 0, 0, 0); rail.position.set(SX1 - 0.05, nose(SZ - STEPS * RUN / 2) + 0.88, SZ - STEPS * RUN / 2); rail.rotation.x = slope;
  // newel post
  const NZ = SZ + 0.08;
  box(0.12, 1.0, 0.12, M.trim, SX1 - 0.05, 0.5, NZ); box(0.15, 0.06, 0.15, M.trim, SX1 - 0.05, 1.02, NZ);
  const capProf = [[0, 0], [0.06, 0], [0.065, 0.03], [0.04, 0.06], [0.045, 0.1], [0.068, 0.14], [0.06, 0.2], [0.03, 0.22], [0, 0.23]].map(([r, y]) => new THREE.Vector2(r, y));
  const cap = add(new THREE.Mesh(new THREE.LatheGeometry(capProf, 20), M.trim)); cap.position.set(SX1 - 0.05, 1.05, NZ);
  box(0.12, 0.42, 0.12, M.trim, SX1 - 0.05, 0.75 - 0.3, NZ);
  // upstairs: dark landing with a railing, a sliver of hallway
  const upCeil = add(new THREE.Mesh(new THREE.PlaneGeometry(4, 7), M.ceil), false, true); upCeil.rotation.x = Math.PI / 2; upCeil.position.set(0, 5.3, -0.7);
  for (let k = 0; k <= 8; k++) box(0.03, 0.85, 0.03, M.trim, -1.0, CEIL + 0.15 + 0.425, -2.15 + k * (3.6 / 8));
  box(0.05, 0.05, 3.7, M.trim, -1.0, CEIL + 1.02, -0.35);
  box(0.06, 0.2, 3.6, M.trim, -1.0, CEIL + 0.05, -0.35); // stairwell edge fascia

  // teddy bear left on the third step
  const fur = new THREE.MeshStandardMaterial({ color: 0x6a4630, roughness: 1 });
  const ted = new THREE.Group(); ted.position.set(-1.62, 3 * RISE, SZ - 2.5 * RUN); ted.rotation.y = 0.9; root.add(ted);
  const sph = (r, x, y, z, sx = 1, sy = 1, sz = 1, mat = fur) => { const m = add(new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), mat), true, true, ted); m.position.set(x, y, z); m.scale.set(sx, sy, sz); return m; };
  sph(0.07, 0, 0.08, 0, 1, 1.15, 0.9); sph(0.055, 0, 0.2, 0.01); sph(0.02, -0.04, 0.245, 0); sph(0.02, 0.04, 0.245, 0); sph(0.022, 0, 0.19, 0.05, 1, 0.8, 0.8);
  sph(0.03, -0.065, 0.1, 0.03, 0.8, 1.4, 0.8); sph(0.03, 0.065, 0.1, 0.03, 0.8, 1.4, 0.8); sph(0.032, -0.04, 0.03, 0.06, 0.9, 0.7, 1.4); sph(0.032, 0.04, 0.03, 0.06, 0.9, 0.7, 1.4);

  // ---------- floor lamp by the door ----------
  const lampG = new THREE.Group(); lampG.position.set(HALL.lamp.x, 0, HALL.lamp.z); root.add(lampG);
  for (let k = 0; k < 3; k++) {
    const a = k * Math.PI * 2 / 3 + 0.3, leg = add(new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.016, 1.36, 10), M.trim), true, true, lampG);
    leg.position.set(Math.cos(a) * 0.14, 0.66, Math.sin(a) * 0.14); leg.rotation.set(Math.sin(a) * 0.2, 0, -Math.cos(a) * 0.2);
  }
  const shadeMat = new THREE.MeshStandardMaterial({ color: 0x2a2018, emissive: 0xf2e2be, emissiveIntensity: 0.45, side: THREE.DoubleSide, roughness: 1 });
  const shade = add(new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.28, 40, 1, true), shadeMat), false, false, lampG); shade.position.y = 1.52;
  const bulb = add(new THREE.Mesh(new THREE.SphereGeometry(0.035, 16, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.85, 0.6).multiplyScalar(1.6) })), false, false, lampG); bulb.position.y = 1.45;
  const lamp = new THREE.PointLight(0xffcf95, 1.9, 0, 2); lamp.position.set(HALL.lamp.x, 1.47, HALL.lamp.z);
  lamp.castShadow = true; lamp.shadow.mapSize.set(1024, 1024); lamp.shadow.bias = -0.003; lamp.shadow.radius = 6; lamp.shadow.camera.near = 0.08; lamp.shadow.camera.far = 12;
  root.add(lamp);

  // ---------- portrait + coat rack (back-left corner) ----------
  const pg = new THREE.Group(); pg.position.set(-1.28, 1.66, Z0 + 0.03); root.add(pg);
  box(0.58, 0.72, 0.04, new THREE.MeshStandardMaterial({ color: 0x4a3418, metalness: 0.6, roughness: 0.45 }), 0, 0, 0, { parent: pg });
  const pc = add(new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.6), new THREE.MeshStandardMaterial({ map: portrait(13), roughness: 0.5 })), false, true, pg); pc.position.z = 0.022;
  const rack = new THREE.Group(); rack.position.set(-1.62, 0, -3.55); root.add(rack);
  const pole = add(new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 1.8, 12), M.trim), true, true, rack); pole.position.y = 0.9;
  for (let k = 0; k < 3; k++) { const a = k * 2.1, l = add(new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.4, 8), M.trim), true, true, rack); l.position.set(Math.cos(a) * 0.13, 0.15, Math.sin(a) * 0.13); l.rotation.set(Math.sin(a) * 0.6, 0, -Math.cos(a) * 0.6); }
  const coatProf = [[0, 0], [0.2, 0], [0.19, 0.3], [0.16, 0.7], [0.13, 0.95], [0.07, 1.05], [0, 1.08]].map(([r, y]) => new THREE.Vector2(r, y));
  const coat = add(new THREE.Mesh(new THREE.LatheGeometry(coatProf, 18), M.cloth), true, true, rack); coat.position.set(0.12, 0.66, 0.06); coat.scale.set(1, 1, 0.55); coat.rotation.y = -0.4;
  const hat = add(new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, 0.1, 18), M.cloth), true, true, rack); hat.position.set(-0.05, 1.83, 0); hat.rotation.z = 0.3;

  // ---------- right wall: wall phone, radiator, picture ----------
  const P = HALL.phone;
  const phoneBase = new THREE.Group(); phoneBase.position.copy(P); root.add(phoneBase);
  const pb = box(0.07, 0.23, 0.1, M.ivory, -0.035, 0, 0, { parent: phoneBase }); pb.material = M.ivory;
  for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) box(0.006, 0.014, 0.018, M.dark, -0.072, 0.02 - r * 0.022, (c - 1) * 0.025, { parent: phoneBase, cast: false });
  const handset = makeHandset(M); root.add(handset);
  const cordMat = new THREE.MeshStandardMaterial({ color: 0xcfc2a6, roughness: 0.5 });
  const cord = new THREE.Mesh(new THREE.BufferGeometry(), cordMat); cord.castShadow = true; root.add(cord);
  const radiator = new THREE.Group(); radiator.position.set(X1 - 0.12, 0.08, -2.55); root.add(radiator);
  for (let k = 0; k < 13; k++) { const col = add(new THREE.Mesh(new THREE.CapsuleGeometry(0.028, 0.58, 4, 10), M.iron), true, true, radiator); col.position.set(0, 0.36, (k - 6) * 0.065); col.scale.set(1.6, 1, 1); }
  box(0.08, 0.04, 0.88, M.iron, 0, 0.06, 0, { parent: radiator }); box(0.08, 0.04, 0.88, M.iron, 0, 0.68, 0, { parent: radiator });
  const pic = new THREE.Group(); pic.position.set(X1 - 0.025, 1.62, 1.25); pic.rotation.y = -Math.PI / 2; root.add(pic);
  box(0.44, 0.34, 0.03, M.trim, 0, 0, 0, { parent: pic });
  const pp = add(new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.26), new THREE.MeshStandardMaterial({ map: photo(17), roughness: 0.4 })), false, true, pic); pp.position.z = 0.017;
  // two frames climbing the stair wall
  for (const [z, y] of [[0.2, 2.15], [-1.1, 3.0]]) {
    const f = new THREE.Group(); f.position.set(X0 + 0.025, y, z); f.rotation.y = Math.PI / 2; root.add(f);
    box(0.36, 0.46, 0.03, M.trim, 0, 0, 0, { parent: f });
    const fp = add(new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.38), new THREE.MeshStandardMaterial({ map: photo(40 + z * 10), roughness: 0.45 })), false, true, f); fp.position.z = 0.017;
  }
  // ceiling fixture (off)
  const dome = add(new THREE.Mesh(new THREE.SphereGeometry(0.17, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x5a4c3a, roughness: 0.25, metalness: 0.1 })), false, false);
  dome.position.set(0.5, CEIL - 0.005, -1.0);

  // ---------- far end: closet + console table with a small lamp ----------
  const closetPivot = new THREE.Group(); closetPivot.position.set(C.hinge, 0, Z1 - 0.025); root.add(closetPivot);
  box(C.w - 0.01, C.h - 0.01, 0.04, M.door, (C.w - 0.01) / 2, C.h / 2, 0, { parent: closetPivot, tile: 0.9 });
  for (let r = 0; r < 2; r++) box(0.56, [0.62, 0.9][r], 0.012, M.trim, C.w / 2, [1.5, 0.6][r], -0.026, { parent: closetPivot, tile: 0.9 });
  const ck = add(new THREE.Mesh(new THREE.SphereGeometry(0.028, 20, 14), new THREE.MeshStandardMaterial({ color: 0x5a4628, metalness: 0.5, roughness: 0.75 })), true, true, closetPivot); ck.position.set(C.w - 0.08, 0.98, -0.05);
  box(0.08, C.h + 0.08, 0.03, M.trim, cl - 0.025, (C.h + 0.08) / 2, Z1 - 0.02); box(0.08, C.h + 0.08, 0.03, M.trim, cr + 0.025, (C.h + 0.08) / 2, Z1 - 0.02);
  box(cr - cl + 0.13, 0.09, 0.035, M.trim, C.x, C.h + 0.06, Z1 - 0.02);
  // closet interior (pitch dark, a few coats)
  const ci = new THREE.Group(); ci.position.set(C.x, 0, Z1 + 0.4); root.add(ci);
  box(C.w + 0.1, 0.02, 0.8, M.dark, 0, 0.0, 0, { parent: ci }); box(C.w + 0.1, 0.02, 0.8, M.dark, 0, 2.05, 0, { parent: ci });
  box(0.02, 2.05, 0.8, M.dark, -C.w / 2 - 0.05, 1.02, 0, { parent: ci }); box(0.02, 2.05, 0.8, M.dark, C.w / 2 + 0.05, 1.02, 0, { parent: ci }); box(C.w + 0.1, 2.05, 0.02, M.dark, 0, 1.02, 0.4, { parent: ci });
  for (const [x, r] of [[-0.25, 0], [0.28, 0.3]]) { const c2 = add(new THREE.Mesh(new THREE.LatheGeometry(coatProf, 16), M.cloth), true, true, ci); c2.position.set(x, 0.55, 0.15); c2.scale.set(1, 1.1, 0.5); c2.rotation.y = r; }
  const table = new THREE.Group(); table.position.set(1.2, 0, Z1 - 0.22); root.add(table);
  box(0.9, 0.035, 0.36, M.trim, 0, 0.78, 0, { parent: table });
  for (const [x, z] of [[-0.41, -0.15], [0.41, -0.15], [-0.41, 0.15], [0.41, 0.15]]) box(0.035, 0.78, 0.035, M.trim, x, 0.39, z, { parent: table });
  const tshade = add(new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.13, 0.17, 32, 1, true), shadeMat), false, false, table); tshade.position.set(-0.24, 1.12, 0);
  const tbase = add(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.07, 0.26, 16), M.brass), true, true, table); tbase.position.set(-0.24, 0.93, 0);
  const tlamp = new THREE.PointLight(0xffc68c, 1.1, 0, 2); tlamp.position.set(1.2 - 0.24, 1.08, Z1 - 0.22); root.add(tlamp);
  const fr = new THREE.Group(); fr.position.set(1.55, 0.89, Z1 - 0.12); fr.rotation.set(-0.15, Math.PI + 0.25, 0); root.add(fr);
  box(0.18, 0.22, 0.015, M.brass, 0, 0, 0, { parent: fr });

  // ---------- light + environment ----------
  scene.add(new THREE.HemisphereLight(0x5a4030, 0x100806, 0.18));
  const pm = new THREE.PMREMGenerator(renderer);
  const env = new THREE.Scene();
  env.add(new THREE.Mesh(new THREE.BoxGeometry(8, 6, 10), new THREE.MeshBasicMaterial({ color: 0x0c0806, side: THREE.BackSide })));
  const hot = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.8, 0.55).multiplyScalar(3) })); hot.position.set(-0.55, 1.5, -3.42); env.add(hot);
  scene.environment = pm.fromScene(env, 0.04).texture; scene.environmentIntensity = 0.35;

  return { root, lamp, lampShade: shadeMat, tlamp, frontDoor, closetPivot, under: underMat, spill, phoneBase, handset, cord, M };
}

/** 1990 wall-phone handset; local y = long axis (earpiece at +y), cups face local +z */
function makeHandset(M) {
  const g = new THREE.Group();
  const grip = new THREE.Mesh(new THREE.CapsuleGeometry(0.016, 0.14, 4, 12), M.ivory); grip.scale.set(1.25, 1, 0.9); g.add(grip);
  for (const s of [1, -1]) {
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.024, 0.04, 20), M.ivory); cup.rotation.x = Math.PI / 2; cup.position.set(0, s * 0.085, 0.018); g.add(cup);
    const face = new THREE.Mesh(new THREE.CircleGeometry(0.02, 16), M.dark); face.position.set(0, s * 0.085, 0.039); g.add(face);
  }
  g.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  return g;
}

/** coiled phone cord between two world points (re-tessellated each frame) */
export function updateCord(mesh, A, B, t = 0) {
  const L = A.distanceTo(B), sag = Math.max(0.12, 0.55 - L * 0.35);
  const mid = A.clone().add(B).multiplyScalar(0.5); mid.y -= sag;
  const spine = new THREE.QuadraticBezierCurve3(A, mid, B), n = 420, pts = [];
  const len = spine.getLength(), turns = len / 0.0085;
  for (let i = 0; i <= n; i++) {
    const u = i / n, p = spine.getPointAt(u), tg = spine.getTangentAt(u);
    const side = new THREE.Vector3(0, 1, 0).cross(tg); if (side.lengthSq() < 1e-6) side.set(1, 0, 0); side.normalize();
    const up = new THREE.Vector3().crossVectors(tg, side).normalize();
    const a = u * turns * Math.PI * 2, r = 0.0072 * Math.min(1, u * 12, (1 - u) * 12);
    pts.push(p.addScaledVector(side, Math.cos(a) * r).addScaledVector(up, Math.sin(a) * r));
  }
  mesh.geometry.dispose();
  mesh.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), n * 2, 0.0024, 6, false);
}
