// The institution — one building far from the store (x offset 60), built in code: a police interview room,
// a cell-block corridor with barred cells and strip lights, and the witness room looking through glass into a lit chamber.
// Local axes (group at x = 60): interview room z ∈ [-2, 2]; corridor x ∈ [-1.1, 1.1], z ∈ [4, 18]; witness room z ∈ [21, 24.5].
import * as THREE from 'three';
import { glow } from '../core/tex.js';
import { cinder, concrete, paintWall, boardText } from '../core/tex2.js';

export const OX = 60;
export const INST = {
  OX,
  room: { x0: -2, x1: 2, z0: -2, z1: 2, ceil: 2.6, door: { x: 1.1, w: 0.9, h: 2.05 } },
  table: { x: 0, z: 0.2, w: 1.2, d: 0.8, h: 0.74 },
  hall: { x0: -1.1, x1: 1.1, z0: 4, z1: 18, ceil: 2.7 },
  cells: [[5.5, 7.9], [9.0, 11.4], [12.5, 14.9]],      // z spans of the barred cell fronts on the corridor's left wall
  wit: { x0: -2, x1: 2, z0: 21, z1: 24.5, ceil: 2.5, win: { x0: -1.45, x1: 1.45, y0: 0.85, y1: 2.0 } },
};
/** institution-local → world */
export const IW = (x, y, z) => new THREE.Vector3(x + OX, y, z);

function scaleUV(g, su, sv) { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv); return g; }
function boxGeo(w, h, d, tile = 0.6) {
  const g = new THREE.BoxGeometry(w, h, d), uv = g.attributes.uv;
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) { const i = f * 4 + k; uv.setXY(i, uv.getX(i) * dims[f][0] / tile, uv.getY(i) * dims[f][1] / tile); }
  return g;
}

export function buildInst(scene, renderer) {
  const root = new THREE.Group(); root.position.x = OX; scene.add(root);
  const add = (m, cast = true, recv = true, parent = root) => { m.castShadow = cast; m.receiveShadow = recv; parent.add(m); return m; };
  const box = (w, h, d, mat, x, y, z, o = {}) => { const m = add(new THREE.Mesh(boxGeo(w, h, d, o.tile ?? 0.6), mat), o.cast ?? true, o.recv ?? true, o.parent ?? root); m.position.set(x, y, z); if (o.ry) m.rotation.y = o.ry; if (o.rx) m.rotation.x = o.rx; return m; };
  const plane = (w, h, mat, x, y, z, o = {}) => { const m = add(new THREE.Mesh(scaleUV(new THREE.PlaneGeometry(w, h), o.su ?? 1, o.sv ?? 1), mat), false, o.recv ?? true, o.parent ?? root); m.position.set(x, y, z); m.rotation.set(o.rx ?? 0, o.ry ?? 0, o.rz ?? 0); if (o.order != null) m.renderOrder = o.order; return m; };
  const light = (col, I, x, y, z, shadow = false) => {
    const l = new THREE.PointLight(col, I, 0, 2); l.position.set(x, y, z);
    if (shadow) { l.castShadow = true; l.shadow.mapSize.set(1024, 1024); l.shadow.bias = -0.003; l.shadow.radius = 4; l.shadow.camera.near = 0.05; l.shadow.camera.far = 14; }
    root.add(l); return l;
  };

  const cf = concrete(61);
  const M = {
    block: new THREE.MeshStandardMaterial({ map: cinder(51, [132, 136, 122]), roughness: 0.92 }),
    block2: new THREE.MeshStandardMaterial({ map: cinder(52, [126, 120, 104]), roughness: 0.92 }),
    floor: new THREE.MeshStandardMaterial({ map: cf.map, roughnessMap: cf.rough, roughness: 1, transparent: true, opacity: 0.84 }),
    ceil: new THREE.MeshStandardMaterial({ map: paintWall(63, '#6e6a60', { scuff: false }), roughness: 0.95 }),
    steel: new THREE.MeshStandardMaterial({ color: 0x3a3c3a, roughness: 0.45, metalness: 0.6 }),
    bar: new THREE.MeshStandardMaterial({ color: 0x2c2e2c, roughness: 0.38, metalness: 0.7 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x141312, roughness: 0.8 }),
    tube: new THREE.MeshStandardMaterial({ color: 0x2a2620, emissive: 0xf2e2be, emissiveIntensity: 1.1, roughness: 1 }),
    glass: new THREE.MeshStandardMaterial({ color: 0x0a0c0e, roughness: 0.03, metalness: 0.3, transparent: true, opacity: 0.22, depthWrite: false }),
    mirror: new THREE.MeshStandardMaterial({ color: 0x07080a, roughness: 0.06, metalness: 0.9 }),
    chamber: new THREE.MeshStandardMaterial({ map: paintWall(64, '#b3aa96', { scuff: false }), roughness: 0.9 }),
    curtain: new THREE.MeshStandardMaterial({ color: 0x3e3226, roughness: 1, side: THREE.DoubleSide }),
    bunk: new THREE.MeshStandardMaterial({ color: 0x4a4a44, roughness: 0.7, metalness: 0.3 }),
  };
  const R = INST.room, H = INST.hall, Wt = INST.wit, T = 0.2;
  const room = (x0, x1, z0, z1, ceil, mat, holes = {}) => {
    // floor + ceiling + 4 walls (boxes, so the outside is closed too); holes: { zMinus: [x0, x1, h], ... } door openings
    plane(x1 - x0, z1 - z0, M.floor, (x0 + x1) / 2, 0, (z0 + z1) / 2, { rx: -Math.PI / 2, su: (x1 - x0) / 3, sv: (z1 - z0) / 3, order: 2 }).receiveShadow = true;
    plane(x1 - x0, z1 - z0, M.ceil, (x0 + x1) / 2, ceil, (z0 + z1) / 2, { rx: Math.PI / 2, su: (x1 - x0) / 2, sv: (z1 - z0) / 2 });
    const wallX = (x, a, b) => box(T, ceil, b - a, mat, x, ceil / 2, (a + b) / 2, { tile: 1.6 });
    const wallZ = (z, a, b) => box(b - a, ceil, T, mat, (a + b) / 2, ceil / 2, z, { tile: 1.6 });
    const cut = (fn, at, a, b, hole) => { if (!hole) return fn(at, a, b); const [h0, h1, hh] = hole; fn(at, a, h0); fn(at, h1, b); const isX = fn === wallX; const w = h1 - h0; if (isX) box(T, ceil - hh, w, mat, at, (ceil + hh) / 2, (h0 + h1) / 2, { tile: 1.6 }); else box(w, ceil - hh, T, mat, (h0 + h1) / 2, (ceil + hh) / 2, at, { tile: 1.6 }); };
    cut(wallX, x0 - T / 2, z0 - T, z1 + T, holes.xMinus); cut(wallX, x1 + T / 2, z0 - T, z1 + T, holes.xPlus);
    cut(wallZ, z0 - T / 2, x0, x1, holes.zMinus); cut(wallZ, z1 + T / 2, x0, x1, holes.zPlus);
  };

  // ================= A · interview room =================
  const D = R.door;
  room(R.x0, R.x1, R.z0, R.z1, R.ceil, M.block, { zMinus: [D.x - D.w / 2, D.x + D.w / 2, D.h] });
  const door = new THREE.Group(); door.position.set(D.x - D.w / 2, 0, R.z0 - 0.06); root.add(door);
  box(D.w - 0.02, D.h - 0.01, 0.05, M.steel, (D.w - 0.02) / 2, D.h / 2, 0, { parent: door });
  box(0.12, 0.03, 0.05, M.dark, D.w - 0.14, 1.0, 0.04, { parent: door });
  plane(0.22, 0.3, M.glass, (D.w - 0.02) / 2, 1.55, 0.03, { parent: door, order: 8 });
  // beyond the door: a lit hallway sliver
  box(2.4, R.ceil, 0.1, M.block2, D.x, R.ceil / 2, R.z0 - 1.4, { tile: 1.6 }); plane(2.4, 1.4, M.floor, D.x, 0, R.z0 - 0.7, { rx: -Math.PI / 2, order: 2 });
  box(0.1, R.ceil, 1.4, M.block2, D.x - 1.2, R.ceil / 2, R.z0 - 0.7); box(0.1, R.ceil, 1.4, M.block2, D.x + 1.2, R.ceil / 2, R.z0 - 0.7);
  plane(2.4, 1.4, M.ceil, D.x, R.ceil, R.z0 - 0.7, { rx: Math.PI / 2 }); box(0.9, 0.03, 0.14, M.tube, D.x, R.ceil - 0.02, R.z0 - 0.8, { cast: false });
  const hallLight = light(0xffe4bc, 0.7, D.x, R.ceil - 0.3, R.z0 - 0.8);
  // one-way mirror on the left wall
  plane(1.9, 1.0, M.mirror, R.x0 + 0.005, 1.5, 0.0, { ry: Math.PI / 2 }); box(0.06, 1.1, 2.0, M.steel, R.x0 + 0.02, 1.5, 0.0);
  // table + chairs
  const tb = INST.table;
  box(tb.w, 0.04, tb.d, M.steel, tb.x, tb.h, tb.z); for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box(0.05, tb.h, 0.05, M.steel, tb.x + dx * (tb.w / 2 - 0.05), tb.h / 2, tb.z + dz * (tb.d / 2 - 0.05));
  const ring = add(new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.008, 8, 16), M.steel)); ring.position.set(0, tb.h + 0.03, tb.z + 0.15); ring.rotation.x = Math.PI / 2;
  const chairs = [];
  const chair = (x, z, ry) => {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; root.add(g);
    box(0.44, 0.04, 0.42, M.steel, 0, 0.46, 0, { parent: g }); box(0.42, 0.42, 0.04, M.steel, 0, 0.72, -0.2, { parent: g });
    for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box(0.03, 0.46, 0.03, M.steel, dx * 0.2, 0.23, dz * 0.19, { parent: g });
    chairs.push(g); return g;
  };
  const sChair = chair(0, 0.95, Math.PI);      // suspect's chair (faces -z, back toward +z)
  chair(0.25, -0.55, 0);                        // detective's chair (pushed out)
  // hanging cone lamp over the table
  const shadeMat = new THREE.MeshStandardMaterial({ color: 0x2a2620, emissive: 0xf2e2be, emissiveIntensity: 0.35, side: THREE.DoubleSide, roughness: 0.9 });
  const cone = add(new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.2, 32, 1, true), shadeMat), false, false); cone.position.set(0, 1.92, 0.2);
  box(0.01, R.ceil - 2.0, 0.01, M.dark, 0, (R.ceil + 2.02) / 2, 0.2, { cast: false });
  const bulb = add(new THREE.Mesh(new THREE.SphereGeometry(0.04, 16, 10), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.88, 0.66).multiplyScalar(1.8) })), false, false); bulb.position.set(0, 1.86, 0.2);
  const lampI = light(0xffd6a0, 2.0, 0, 1.8, 0.2, true);
  // a manila folder + a few photos on the table
  box(0.32, 0.01, 0.24, new THREE.MeshStandardMaterial({ color: 0xb89a62, roughness: 0.9 }), -0.2, tb.h + 0.025, tb.z - 0.05, { ry: 0.2 });
  for (let k = 0; k < 3; k++) box(0.15, 0.004, 0.1, new THREE.MeshStandardMaterial({ color: [0x8a8a86, 0x6c6c68, 0x9a9a94][k], roughness: 0.4 }), 0.12 + k * 0.17, tb.h + 0.025, tb.z + 0.05 - k * 0.03, { ry: -0.1 + k * 0.12 });

  // ================= B · cell-block corridor =================
  // left wall with barred cell fronts; right wall solid; end door at z1
  plane(H.x1 - H.x0, H.z1 - H.z0, M.floor, 0, 0, (H.z0 + H.z1) / 2, { rx: -Math.PI / 2, su: 0.8, sv: (H.z1 - H.z0) / 3, order: 2 }).receiveShadow = true;
  plane(H.x1 - H.x0, H.z1 - H.z0, M.ceil, 0, H.ceil, (H.z0 + H.z1) / 2, { rx: Math.PI / 2, su: 1, sv: 6 });
  box(T, H.ceil, H.z1 - H.z0 + 2 * T, M.block, H.x1 + T / 2, H.ceil / 2, (H.z0 + H.z1) / 2, { tile: 1.6 });
  box(H.x1 - H.x0 + 2 * T, H.ceil, T, M.block, 0, H.ceil / 2, H.z0 - T / 2, { tile: 1.6 });
  let zc = H.z0;
  const cellDoors = [];
  for (const [a, b] of INST.cells) {
    box(T, H.ceil, a - zc, M.block, H.x0 - T / 2, H.ceil / 2, (zc + a) / 2, { tile: 1.6 });
    // bars + bands
    const n = Math.round((b - a) / 0.13);
    for (let k = 0; k <= n; k++) { const z = a + (b - a) * k / n; if (z > a + 0.55 && z < a + 1.45) continue; const m = add(new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, H.ceil - 0.1, 8), M.bar)); m.position.set(H.x0, (H.ceil - 0.1) / 2, z); }
    for (const y of [0.08, 1.05, 2.1]) box(0.05, 0.05, b - a, M.bar, H.x0, y, (a + b) / 2);
    box(T, H.ceil, 0.04, M.block, H.x0 - T / 2, H.ceil / 2, a); box(T, H.ceil, 0.04, M.block, H.x0 - T / 2, H.ceil / 2, b);
    // sliding door (bars), slides toward -z when open
    const sd = new THREE.Group(); sd.position.set(H.x0 + 0.06, 0, a + 0.55); root.add(sd);
    for (let k = 0; k <= 7; k++) { const m = add(new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 2.25, 8), M.bar), true, true, sd); m.position.set(0, 1.15, k * 0.13); }
    for (const y of [0.1, 1.05, 2.2]) box(0.05, 0.05, 0.95, M.bar, 0, y, 0.45, { parent: sd });
    cellDoors.push(sd);
    // cell interior: walls, bunk, toilet
    const cx0 = H.x0 - 2.3;
    plane(2.3, b - a, M.floor, (cx0 + H.x0) / 2, 0, (a + b) / 2, { rx: -Math.PI / 2, order: 2 }).receiveShadow = true;
    plane(2.3, b - a, M.ceil, (cx0 + H.x0) / 2, H.ceil, (a + b) / 2, { rx: Math.PI / 2 });
    box(T, H.ceil, b - a + 2 * T, M.block2, cx0 - T / 2, H.ceil / 2, (a + b) / 2, { tile: 1.6 });
    box(2.3, H.ceil, T, M.block2, (cx0 + H.x0) / 2, H.ceil / 2, a - T / 2 + 0.02, { tile: 1.6 }); box(2.3, H.ceil, T, M.block2, (cx0 + H.x0) / 2, H.ceil / 2, b + T / 2 - 0.02, { tile: 1.6 });
    box(0.8, 0.06, 1.95, M.bunk, cx0 + 0.42, 0.46, (a + b) / 2 + 0.1); box(0.78, 0.08, 1.9, new THREE.MeshStandardMaterial({ color: 0x3a3a36, roughness: 1 }), cx0 + 0.42, 0.52, (a + b) / 2 + 0.1);
    for (const dz of [-0.9, 0.9]) box(0.05, 0.46, 0.05, M.bunk, cx0 + 0.78, 0.23, (a + b) / 2 + 0.1 + dz);
    box(0.36, 0.42, 0.5, M.steel, cx0 + 1.9, 0.21, b - 0.4);
    zc = b;
  }
  box(T, H.ceil, H.z1 - zc, M.block, H.x0 - T / 2, H.ceil / 2, (zc + H.z1) / 2, { tile: 1.6 });
  // end wall + steel door with a small lit window
  box(H.x1 - H.x0 + 2 * T, H.ceil, T, M.block, 0, H.ceil / 2, H.z1 + T / 2, { tile: 1.6 });
  box(1.0, 2.1, 0.06, M.steel, 0, 1.05, H.z1 - 0.03);
  const endWin = plane(0.24, 0.32, new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.88, 0.68).multiplyScalar(1.1) }), 0, 1.55, H.z1 - 0.065, { ry: Math.PI });
  // strip lights every 2 m; a few real lights, one shadow light so the bars throw shadows into the first cell
  for (let z = H.z0 + 1; z < H.z1; z += 2) box(0.14, 0.04, 1.2, M.tube, 0, H.ceil - 0.02, z, { cast: false });
  const hl = [light(0xffe4bc, 1.3, 0.2, H.ceil - 0.25, 6.6, true), light(0xffe4bc, 1.0, 0, H.ceil - 0.25, 11), light(0xffe4bc, 1.0, 0, H.ceil - 0.25, 15), light(0xffe0b0, 0.8, 0, 1.6, H.z1 - 0.4)];
  const cellLight = light(0xffd6a0, 0.25, -2.6, 2.2, 6.7);

  // ================= C · witness room + chamber =================
  const WN = Wt.win;
  plane(Wt.x1 - Wt.x0, Wt.z1 - Wt.z0, M.floor, 0, 0, (Wt.z0 + Wt.z1) / 2, { rx: -Math.PI / 2, order: 2 }).receiveShadow = true;
  plane(Wt.x1 - Wt.x0, Wt.z1 - Wt.z0, M.ceil, 0, Wt.ceil, (Wt.z0 + Wt.z1) / 2, { rx: Math.PI / 2 });
  box(T, Wt.ceil, Wt.z1 - Wt.z0, M.block2, Wt.x0 - T / 2, Wt.ceil / 2, (Wt.z0 + Wt.z1) / 2, { tile: 1.6 }); box(T, Wt.ceil, Wt.z1 - Wt.z0, M.block2, Wt.x1 + T / 2, Wt.ceil / 2, (Wt.z0 + Wt.z1) / 2, { tile: 1.6 });
  box(Wt.x1 - Wt.x0 + 2 * T, Wt.ceil, T, M.block2, 0, Wt.ceil / 2, Wt.z0 - T / 2, { tile: 1.6 });
  // window wall (z1) with the opening
  box(WN.x0 - Wt.x0 + T, Wt.ceil, T, M.block2, (Wt.x0 - T + WN.x0) / 2, Wt.ceil / 2, Wt.z1 + T / 2, { tile: 1.6 });
  box(Wt.x1 + T - WN.x1, Wt.ceil, T, M.block2, (WN.x1 + Wt.x1 + T) / 2, Wt.ceil / 2, Wt.z1 + T / 2, { tile: 1.6 });
  box(WN.x1 - WN.x0, WN.y0, T, M.block2, 0, WN.y0 / 2, Wt.z1 + T / 2, { tile: 1.6 }); box(WN.x1 - WN.x0, Wt.ceil - WN.y1, T, M.block2, 0, (Wt.ceil + WN.y1) / 2, Wt.z1 + T / 2, { tile: 1.6 });
  plane(WN.x1 - WN.x0, WN.y1 - WN.y0, M.glass, 0, (WN.y0 + WN.y1) / 2, Wt.z1 + 0.02, { order: 8, recv: false });
  box(WN.x1 - WN.x0 + 0.1, 0.05, 0.3, M.steel, 0, WN.y0 - 0.02, Wt.z1 - 0.04);   // sill
  box(0.04, WN.y1 - WN.y0, 0.06, M.steel, 0, (WN.y0 + WN.y1) / 2, Wt.z1 + 0.02);  // centre mullion
  // the chamber beyond: pale, evenly lit, empty (nothing is shown), a curtain half-drawn
  const cz0 = Wt.z1 + T, cz1 = cz0 + 3.6;
  plane(4.4, 3.6, M.chamber, 0, 0, (cz0 + cz1) / 2, { rx: -Math.PI / 2 });
  plane(4.4, 3.6, M.chamber, 0, 2.6, (cz0 + cz1) / 2, { rx: Math.PI / 2 });
  box(4.4, 2.6, 0.1, M.chamber, 0, 1.3, cz1 + 0.05); box(0.1, 2.6, 3.6, M.chamber, -2.2, 1.3, (cz0 + cz1) / 2); box(0.1, 2.6, 3.6, M.chamber, 2.2, 1.3, (cz0 + cz1) / 2);
  const curtain = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.25, 24, 1), M.curtain);
  { const p = curtain.geometry.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, 0.035 * Math.sin(p.getX(i) * 26)); curtain.geometry.computeVertexNormals(); }
  curtain.position.set(WN.x0 + 0.62, (WN.y0 + WN.y1) / 2, cz0 + 0.12); root.add(curtain);
  box(0.6, 0.03, 1.2, M.tube, 0, 2.58, (cz0 + cz1) / 2, { cast: false });
  const chamberL = light(0xfff0d8, 3.2, 0, 2.2, (cz0 + cz1) / 2);
  const witL = light(0xffd6a0, 0.08, 0, 2.2, Wt.z0 + 0.8);
  // chairs in a row facing the glass
  for (const x of [-1.2, -0.4, 0.4, 1.2]) chair(x, 23.45, 0);

  // ---------- environment ----------
  const pm = new THREE.PMREMGenerator(renderer), env = new THREE.Scene();
  env.add(new THREE.Mesh(new THREE.BoxGeometry(6, 3, 10), new THREE.MeshBasicMaterial({ color: 0x0b0b0a, side: THREE.BackSide })));
  for (const z of [-3, 0, 3]) { const h = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.05, 1.2), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.9, 0.75).multiplyScalar(3) })); h.position.set(0, 1.4, z); env.add(h); }
  const envTex = pm.fromScene(env, 0.04).texture;

  return { root, door, cellDoors, sChair, chairs, lampI, hallLight, hl, cellLight, chamberL, witL, curtain, envTex, M, shadeMat };
}
