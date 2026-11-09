// The video store, Dallas, April 1994 — built entirely in code: parking lot + storefront with the lit VIDEO sign,
// the sales floor (VHS gondolas, wall racks, counter + registers, the CCTV camera), and the back office with the safe.
// Axes: x ∈ [-5, 5] across the store, z from the front glass (-7) to the back wall (5); office behind it (z 5…9, x 0.6…5).
import * as THREE from 'three';
import { walnut, glow } from '../core/tex.js';
import { vct, ceilingTiles, paintWall, vhsAtlas, boardText, signTex, asphalt, brick, keypadTex, timelockTex, corkboard, monitorTex } from '../core/tex2.js';

const X0 = -5, X1 = 5, Z0 = -7, Z1 = 5, CEIL = 3.0;
const OF = { x0: 0.6, x1: 5, z0: 5, z1: 9, ceil: 2.7 };
export const STORE = {
  X0, X1, Z0, Z1, CEIL, OF,
  door: { x: 3.1, w: 1.0, h: 2.2, hinge: 2.6 },          // glass front door (hinge on its left, swings out)
  odoor: { x: 2.55, w: 0.9, h: 2.08, hinge: 2.1 },       // office door in the back wall (swings into the office)
  counter: { x0: 0.9, x1: 4.3, z: -4.2, d: 0.7, h: 1.02 },
  register: new THREE.Vector3(2.0, 1.02, -3.85),
  safe: { x: 4.55, z: 7.35, w: 0.72, h: 1.38, d: 0.7 },  // front face at x = 4.2, facing -x
  cam: new THREE.Vector3(4.72, 2.82, -2.5),               // CCTV camera on the ceiling corner, looking at the door
  sign: new THREE.Vector3(-0.4, 3.72, -7.42),
};

function scaleUV(g, su, sv) { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv); return g; }
function boxGeo(w, h, d, tile = 0.6) {
  const g = new THREE.BoxGeometry(w, h, d), uv = g.attributes.uv;
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) { const i = f * 4 + k; uv.setXY(i, uv.getX(i) * dims[f][0] / tile, uv.getY(i) * dims[f][1] / tile); }
  return g;
}

export function buildStore(scene, renderer) {
  const root = new THREE.Group(); scene.add(root);
  const add = (m, cast = true, recv = true, parent = root) => { m.castShadow = cast; m.receiveShadow = recv; parent.add(m); return m; };
  const box = (w, h, d, mat, x, y, z, o = {}) => { const m = add(new THREE.Mesh(boxGeo(w, h, d, o.tile ?? 0.6), mat), o.cast ?? true, o.recv ?? true, o.parent ?? root); m.position.set(x, y, z); if (o.ry) m.rotation.y = o.ry; if (o.rx) m.rotation.x = o.rx; if (o.rz) m.rotation.z = o.rz; return m; };
  const plane = (w, h, mat, x, y, z, o = {}) => { const m = add(new THREE.Mesh(scaleUV(new THREE.PlaneGeometry(w, h), o.su ?? 1, o.sv ?? 1), mat), false, o.recv ?? true, o.parent ?? root); m.position.set(x, y, z); m.rotation.set(o.rx ?? 0, o.ry ?? 0, o.rz ?? 0); if (o.order != null) m.renderOrder = o.order; return m; };

  // ---------- materials ----------
  const fl = vct(4), ofl = vct(14, { a: '#7d7466', b: '#6c6456' }), asp = asphalt(31);
  const w1 = walnut(5, { dark: 0.85 }), w2 = walnut(21, { dark: 0.6 });
  const M = {
    floor: new THREE.MeshStandardMaterial({ map: fl.map, roughnessMap: fl.rough, roughness: 1, metalness: 0, transparent: true, opacity: 0.82 }),
    ofloor: new THREE.MeshStandardMaterial({ map: ofl.map, roughnessMap: ofl.rough, roughness: 1, metalness: 0, transparent: true, opacity: 0.84 }),
    ceil: new THREE.MeshStandardMaterial({ map: ceilingTiles(9), roughness: 0.95 }),
    wall: new THREE.MeshStandardMaterial({ map: paintWall(2, '#7c7262'), roughness: 0.92 }),
    owall: new THREE.MeshStandardMaterial({ map: paintWall(12, '#857a66'), roughness: 0.92 }),
    shelf: new THREE.MeshStandardMaterial({ map: w1.map, roughnessMap: w1.rough, roughness: 0.75 }),
    trim: new THREE.MeshStandardMaterial({ map: w2.map, roughnessMap: w2.rough, roughness: 0.7 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x15120f, roughness: 0.8 }),
    alu: new THREE.MeshStandardMaterial({ color: 0x2a2724, roughness: 0.45, metalness: 0.6 }),
    beige: new THREE.MeshStandardMaterial({ color: 0x9c9280, roughness: 0.6 }),
    steel: new THREE.MeshStandardMaterial({ color: 0x1c1e1d, roughness: 0.42, metalness: 0.55 }),
    glass: new THREE.MeshStandardMaterial({ color: 0x0c1016, roughness: 0.04, metalness: 0.2, transparent: true, opacity: 0.16, depthWrite: false }),
    asphalt: new THREE.MeshStandardMaterial({ map: asp.map, roughnessMap: asp.rough, roughness: 1 }),
    brick: new THREE.MeshStandardMaterial({ map: brick(41), roughness: 0.95 }),
    stucco: new THREE.MeshStandardMaterial({ map: paintWall(44, '#4f473c', { scuff: false }), roughness: 0.97 }),
    curb: new THREE.MeshStandardMaterial({ map: paintWall(45, '#6a645a', { scuff: false }), roughness: 0.95 }),
    stripe: new THREE.MeshStandardMaterial({ color: 0x8f8a7c, roughness: 0.9 }),
    tube: new THREE.MeshStandardMaterial({ color: 0x2a2620, emissive: 0xf2e2be, emissiveIntensity: 1.0, roughness: 1 }),
    tubeOff: new THREE.MeshStandardMaterial({ color: 0x55504a, roughness: 0.6 }),
  };
  M.floor.map.repeat.set(1, 1);

  // ---------- floors / ceiling ----------
  const floor = plane(X1 - X0, Z1 - Z0, M.floor, 0, 0, (Z0 + Z1) / 2, { rx: -Math.PI / 2, su: (X1 - X0) / 2.4, sv: (Z1 - Z0) / 2.4, order: 2 });
  floor.receiveShadow = true;
  plane(OF.x1 - OF.x0, OF.z1 - OF.z0, M.ofloor, (OF.x0 + OF.x1) / 2, 0, (OF.z0 + OF.z1) / 2, { rx: -Math.PI / 2, su: (OF.x1 - OF.x0) / 2.4, sv: (OF.z1 - OF.z0) / 2.4, order: 2 });
  plane(X1 - X0, Z1 - Z0, M.ceil, 0, CEIL, (Z0 + Z1) / 2, { rx: Math.PI / 2, su: (X1 - X0) / 2.4, sv: (Z1 - Z0) / 2.4 });
  plane(OF.x1 - OF.x0, OF.z1 - OF.z0, M.ceil, (OF.x0 + OF.x1) / 2, OF.ceil, (OF.z0 + OF.z1) / 2, { rx: Math.PI / 2, su: 1.8, sv: 1.6 });
  box(X1 - X0 + 0.4, 0.3, Z1 - Z0 + 4.3, M.stucco, 0, CEIL + 0.16, (Z0 + Z1 + 4) / 2, { cast: false }); // roof slab

  // ---------- walls ----------
  const T = 0.16;
  box(T, CEIL, Z1 - Z0, M.wall, X0 - T / 2, CEIL / 2, (Z0 + Z1) / 2, { tile: 2.4 });            // left
  box(T, CEIL, Z1 - Z0, M.wall, X1 + T / 2, CEIL / 2, (Z0 + Z1) / 2, { tile: 2.4 });            // right
  // back wall with the office door opening
  const OD = STORE.odoor, odl = OD.x - OD.w / 2, odr = OD.x + OD.w / 2;
  box(odl - X0, CEIL, T, M.wall, (X0 + odl) / 2, CEIL / 2, Z1 + T / 2, { tile: 2.4 });
  box(X1 - odr, CEIL, T, M.wall, (X1 + odr) / 2, CEIL / 2, Z1 + T / 2, { tile: 2.4 });
  box(odr - odl, CEIL - OD.h, T, M.wall, OD.x, (CEIL + OD.h) / 2, Z1 + T / 2, { tile: 2.4 });
  for (const s of [-1, 1]) box(0.07, OD.h + 0.05, T + 0.04, M.trim, OD.x + s * (OD.w / 2 + 0.03), (OD.h + 0.05) / 2, Z1 + T / 2);
  box(OD.w + 0.14, 0.07, T + 0.04, M.trim, OD.x, OD.h + 0.04, Z1 + T / 2);
  // office walls
  box(T, OF.ceil, OF.z1 - OF.z0, M.owall, OF.x0 - T / 2, OF.ceil / 2, (OF.z0 + OF.z1) / 2, { tile: 2.4 });
  box(T, OF.ceil, OF.z1 - OF.z0, M.owall, OF.x1 + T / 2, OF.ceil / 2, (OF.z0 + OF.z1) / 2, { tile: 2.4 });
  box(OF.x1 - OF.x0 + 2 * T, OF.ceil, T, M.owall, (OF.x0 + OF.x1) / 2, OF.ceil / 2, OF.z1 + T / 2, { tile: 2.4 });
  // baseboards
  for (const [l, x, z, ry] of [[Z1 - Z0, X0 + 0.01, (Z0 + Z1) / 2, Math.PI / 2], [Z1 - Z0, X1 - 0.01, (Z0 + Z1) / 2, Math.PI / 2], [odl - X0, (X0 + odl) / 2, Z1 - 0.01, 0], [X1 - odr, (X1 + odr) / 2, Z1 - 0.01, 0]]) box(l, 0.1, 0.02, M.dark, x, 0.05, z, { ry, cast: false });

  // ---------- storefront: piers, header, glass, door, sign ----------
  const D = STORE.door, GX0 = -4.3, GX1 = 4.3, GTOP = 2.6, KICK = 0.32;
  box(0.75, 4.6, 0.36, M.brick, X0 + 0.32, 2.3, Z0 - 0.02, { tile: 1.2 }); box(0.75, 4.6, 0.36, M.brick, X1 - 0.32, 2.3, Z0 - 0.02, { tile: 1.2 });
  box(10.9, 2.0, 0.3, M.stucco, 0, GTOP + 1.0, Z0 - 0.04, { tile: 2 });                         // header / sign band
  box(16, 4.8, 0.3, M.stucco, -13.2, 2.4, Z0 - 0.04, { tile: 2 }); box(6, 4.8, 0.3, M.brick, 8.2, 2.4, Z0 - 0.04, { tile: 1.2 }); // neighbouring units
  box(17.5, 0.32, 0.5, M.alu, 0, 4.85, Z0 - 0.05);                                               // coping
  const dl = D.x - D.w / 2, dr = D.x + D.w / 2;
  for (const [a, b] of [[GX0, dl - 0.04], [dr + 0.04, GX1]]) {
    const w = b - a, n = Math.max(1, Math.round(w / 1.6));
    for (let k = 0; k < n; k++) {
      const x0 = a + (w / n) * k, x1 = x0 + w / n;
      plane(x1 - x0 - 0.06, GTOP - KICK, M.glass, (x0 + x1) / 2, (GTOP + KICK) / 2, Z0, { order: 8, recv: false });
      box(0.06, GTOP, 0.1, M.alu, x1, GTOP / 2, Z0);
    }
    box(w, KICK, 0.1, M.alu, (a + b) / 2, KICK / 2, Z0); box(w, 0.07, 0.12, M.alu, (a + b) / 2, GTOP, Z0);
    box(0.06, GTOP, 0.1, M.alu, a, GTOP / 2, Z0);
  }
  // door frame + transom
  box(D.w + 0.16, 0.08, 0.12, M.alu, D.x, D.h + 0.04, Z0); for (const s of [-1, 1]) box(0.06, D.h, 0.12, M.alu, D.x + s * (D.w / 2 + 0.05), D.h / 2, Z0);
  plane(D.w, GTOP - D.h - 0.12, M.glass, D.x, (GTOP + D.h + 0.08) / 2, Z0, { order: 8, recv: false });
  const frontDoor = new THREE.Group(); frontDoor.position.set(D.hinge, 0, Z0 - 0.02); root.add(frontDoor);
  box(D.w - 0.02, 0.12, 0.05, M.alu, D.w / 2, 0.06, 0, { parent: frontDoor }); box(D.w - 0.02, 0.1, 0.05, M.alu, D.w / 2, D.h - 0.05, 0, { parent: frontDoor });
  box(0.07, D.h, 0.05, M.alu, 0.035, D.h / 2, 0, { parent: frontDoor }); box(0.07, D.h, 0.05, M.alu, D.w - 0.05, D.h / 2, 0, { parent: frontDoor });
  box(D.w - 0.14, 0.2, 0.05, M.alu, D.w / 2, 0.22, 0, { parent: frontDoor });
  const dg = plane(D.w - 0.14, D.h - 0.42, M.glass, D.w / 2, D.h / 2 + 0.1, 0, { parent: frontDoor, order: 8, recv: false });
  box(0.03, 0.6, 0.04, M.alu, D.w - 0.16, 1.05, -0.06, { parent: frontDoor }); box(0.03, 0.6, 0.04, M.alu, D.w - 0.16, 1.05, 0.06, { parent: frontDoor }); // pull handles
  // OPEN/hours decal strip on the door glass (cream, printed, unlit)
  const hours = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.12), new THREE.MeshStandardMaterial({ map: boardText('OPEN 10 AM – MIDNIGHT', { w: 512, h: 96, bg: '#000000', fg: '#bfb08c', font: '600 46px "Barlow Condensed"', track: 2 }), transparent: true, opacity: 0.75, roughness: 0.8 }));
  hours.position.set(D.w / 2, 1.45, -0.03); hours.rotation.y = Math.PI; frontDoor.add(hours);
  // the sign: ticket lightbox
  const st = signTex();
  const signMat = new THREE.MeshStandardMaterial({ map: st.map, emissive: 0xf2e2be, emissiveMap: st.emissive, emissiveIntensity: 1.25, roughness: 0.6, transparent: true, alphaTest: 0.02 });
  st.map.format = THREE.RGBAFormat;
  const sign = plane(3.4, 1.33, signMat, STORE.sign.x, STORE.sign.y, STORE.sign.z, { ry: Math.PI });
  const signBack = box(3.0, 1.0, 0.16, M.dark, STORE.sign.x, STORE.sign.y, STORE.sign.z + 0.11, { cast: false });
  const signLight = new THREE.PointLight(0xffe0b0, 1.6, 0, 2); signLight.position.set(STORE.sign.x, STORE.sign.y - 0.4, Z0 - 1.6); root.add(signLight);
  // canopy soffit lights over the sidewalk
  box(16.5, 0.1, 1.2, M.stucco, 0, 2.78, Z0 - 0.62, { cast: false });
  const soffit = [];
  for (const x of [-3.2, 0.2, 3.2]) { const m = box(0.22, 0.02, 0.22, M.tube, x, 2.72, Z0 - 0.75, { cast: false }); soffit.push(m); const l = new THREE.PointLight(0xffdcae, 0.9, 0, 2); l.position.set(x, 2.55, Z0 - 0.8); root.add(l); }

  // ---------- outside: sidewalk, curb, parking lot, poles, trees, cars ----------
  box(18, 0.14, 2.3, M.curb, 0, 0.07, Z0 - 1.15, { tile: 1.2 });
  const lot = plane(60, 40, M.asphalt, 0, 0, Z0 - 2.3 - 20, { rx: -Math.PI / 2, su: 15, sv: 10 }); lot.receiveShadow = true;
  for (let k = -6; k <= 6; k++) { const s = plane(0.12, 5.0, M.stripe, k * 2.7 + 0.6, 0.004, Z0 - 5.4, { rx: -Math.PI / 2 }); s.rotation.z = 0.0; }
  const pole = (x, z, h = 7.2) => {
    box(0.16, h, 0.16, M.alu, x, h / 2, z);
    box(0.9, 0.16, 0.36, M.alu, x + 0.35, h, z);
    box(0.7, 0.03, 0.26, M.tube, x + 0.42, h - 0.09, z, { cast: false });
    const l = new THREE.PointLight(0xffc98a, 26, 0, 2); l.position.set(x + 0.42, h - 0.25, z); root.add(l); return l;
  };
  const poleL = pole(-7.5, -15.5), poleR = pole(9, -24);
  const tree = (x, z, s) => {
    const m = new THREE.MeshStandardMaterial({ color: 0x0b0d0a, roughness: 1 });
    for (let k = 0; k < 4; k++) { const b = add(new THREE.Mesh(new THREE.IcosahedronGeometry(1.6 * s, 1), m), false, false); b.position.set(x + (k - 1.5) * 1.1 * s, (4.2 + (k % 2) * 0.8) * s, z + (k % 3) * 0.5); }
    box(0.3 * s, 3.4 * s, 0.3 * s, m, x, 1.7 * s, z, { cast: false });
  };
  for (const [x, z, s] of [[-14, -34, 1.3], [-8, -36, 1.1], [-2, -35, 1.4], [5, -37, 1.2], [12, -35, 1.5], [18, -33, 1.1], [-19, -30, 1.2]]) tree(x, z, s);
  const car = (x, z, ry, col) => {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; root.add(g);
    const paint = new THREE.MeshStandardMaterial({ color: col, roughness: 0.35, metalness: 0.5 });
    const gl = new THREE.MeshStandardMaterial({ color: 0x07090b, roughness: 0.1, metalness: 0.4 });
    box(1.76, 0.6, 4.6, paint, 0, 0.62, 0, { parent: g }); box(1.62, 0.5, 2.3, gl, 0, 1.15, -0.15, { parent: g });
    box(1.66, 0.06, 2.0, paint, 0, 1.42, -0.15, { parent: g });
    box(1.8, 0.16, 0.12, M.alu, 0, 0.45, 2.33, { parent: g }); box(1.8, 0.16, 0.12, M.alu, 0, 0.45, -2.33, { parent: g });
    for (const [wx, wz] of [[-0.82, 1.45], [0.82, 1.45], [-0.82, -1.45], [0.82, -1.45]]) { const w = add(new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.22, 20), M.dark), true, true, g); w.rotation.z = Math.PI / 2; w.position.set(wx, 0.33, wz); }
    return g;
  };
  car(-2.6, -12.0, 0.04, 0x2c3138); car(6.4, -12.3, -0.06, 0x3a3428); car(-11.5, -19.5, 1.5, 0x1e2428);

  // ---------- sales floor: gondolas + wall racks of VHS boxes ----------
  const atlas = vhsAtlas(21), covers = [];
  for (let i = 0; i < 32; i++) { const t = atlas.clone(); t.repeat.set(1 / 8, 1 / 4); t.offset.set((i % 8) / 8, 1 - (Math.floor(i / 8) + 1) / 4); t.needsUpdate = true; covers.push(new THREE.MeshStandardMaterial({ map: t, roughness: 0.42 })); }
  const vhsGeo = new THREE.BoxGeometry(0.105, 0.19, 0.03);
  const slots = Array.from({ length: 32 }, () => []);
  const R = (() => { let s = 99; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); })();
  const rack = (x0, z0, len, ry, levels, h, depth) => {
    // a run of shelving along local +x, boxes facing local +z. (x0, z0) = start, ry = rotation
    const g = new THREE.Group(); g.position.set(x0, 0, z0); g.rotation.y = ry; root.add(g);
    box(len, 0.14, depth, M.dark, len / 2, 0.07, 0, { parent: g });
    box(len, h, 0.03, M.shelf, len / 2, h / 2, -depth / 2 + 0.015, { parent: g, tile: 1.2 });
    for (const ex of [0, len]) box(0.04, h, depth, M.shelf, ex, h / 2, 0, { parent: g });
    for (let l = 0; l < levels; l++) {
      const y = 0.28 + l * ((h - 0.4) / (levels - 1 || 1));
      box(len, 0.025, depth, M.shelf, len / 2, y - 0.012, 0, { parent: g, tile: 1.2 });
      let x = 0.06;
      while (x < len - 0.08) {
        if (R() < 0.06) { x += 0.12; continue; } // gaps where tapes are rented
        const ci = Math.floor(R() * 32), m = new THREE.Matrix4();
        const p = new THREE.Vector3(x + 0.052, y + 0.095, depth / 2 - 0.05), q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.1, (R() - 0.5) * 0.06, 0));
        m.compose(p, q, new THREE.Vector3(1, 1, 1)); m.premultiply(new THREE.Matrix4().makeRotationY(ry).setPosition(x0, 0, z0));
        slots[ci].push(m); x += 0.118 + R() * 0.012;
      }
    }
    return g;
  };
  // two double-sided gondolas running front→back
  for (const gx of [-3.4, -1.4]) { rack(gx - 0.17, -3.2, 6.4, -Math.PI / 2, 5, 1.75, 0.34); rack(gx + 0.17, 3.2, 6.4, Math.PI / 2, 5, 1.75, 0.34); box(0.7, 0.06, 6.4, M.shelf, gx, 1.78, 0); }
  // wall racks: left wall, back wall (left of the office door)
  rack(X0 + 0.18, 4.6, 10.8, Math.PI / 2, 6, 2.15, 0.36);
  rack(1.9, Z1 - 0.19, 6.3, Math.PI, 6, 2.15, 0.36);          // rotated π: runs toward -x, faces -z
  for (let i = 0; i < 32; i++) {
    if (!slots[i].length) continue;
    const im = new THREE.InstancedMesh(vhsGeo, covers[i], slots[i].length); slots[i].forEach((m, k) => im.setMatrixAt(k, m));
    im.castShadow = false; im.receiveShadow = true; root.add(im);
  }
  // aisle header boards
  const hdr = (text, x, y, z, ry, w = 2.6) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w / 8), new THREE.MeshStandardMaterial({ map: boardText(text), roughness: 0.8 })); m.position.set(x, y, z); m.rotation.y = ry; root.add(m); return m; };
  hdr('NEW RELEASES', X0 + 0.02, 2.5, -2.5, Math.PI / 2, 3.2); hdr('DRAMA', X0 + 0.02, 2.5, 2.2, Math.PI / 2); hdr('ACTION', -1.6, 2.5, Z1 - 0.02, Math.PI, 2.4);
  hdr('COMEDY', -3.4, 2.15, -3.27, Math.PI, 1.0); hdr('FAMILY', -1.4, 2.15, -3.27, Math.PI, 1.0);
  for (const gx of [-3.4, -1.4]) box(0.03, 0.35, 0.03, M.alu, gx, 1.97, -3.27, { cast: false });

  // ---------- the counter ----------
  const C = STORE.counter;
  box(C.x1 - C.x0, C.h - 0.04, 0.06, M.trim, (C.x0 + C.x1) / 2, (C.h - 0.04) / 2, C.z, { tile: 1.2 });            // front panel
  box(C.x1 - C.x0 + 0.1, 0.05, C.d + 0.08, M.dark, (C.x0 + C.x1) / 2, C.h, C.z + C.d / 2 - 0.02);                    // top
  box(0.06, C.h - 0.04, 1.2, M.trim, C.x0, (C.h - 0.04) / 2, C.z + 0.6, { tile: 1.2 });                               // return end
  box(C.x1 - C.x0 - 0.1, 0.8, 0.5, M.dark, (C.x0 + C.x1) / 2, 0.4, C.z + 0.35);                                       // under-counter body
  const reg = new THREE.Group(); reg.position.copy(STORE.register); root.add(reg);
  box(0.42, 0.12, 0.42, M.beige, 0, 0.06, 0, { parent: reg });
  const drawer = box(0.38, 0.08, 0.36, M.beige, 0, 0.04, -0.02, { parent: reg });                                    // cash drawer, slides out toward the clerk (+z)
  box(0.36, 0.14, 0.2, M.beige, 0, 0.19, 0.06, { parent: reg, rx: -0.5 });
  box(0.16, 0.12, 0.04, M.dark, 0, 0.36, 0.1, { parent: reg });
  // second terminal: a small CRT
  const crt = new THREE.Group(); crt.position.set(3.3, C.h + 0.02, -3.85); crt.rotation.y = Math.PI + 0.2; root.add(crt);
  box(0.36, 0.32, 0.36, M.beige, 0, 0.18, 0, { parent: crt });
  plane(0.28, 0.22, new THREE.MeshStandardMaterial({ color: 0x101410, emissive: 0x3a4a3c, emissiveIntensity: 0.25, roughness: 0.2 }), 0, 0.19, 0.181, { parent: crt });
  // tape returns stack + a rack of candy on the counter
  for (let k = 0; k < 6; k++) { const m = new THREE.Mesh(vhsGeo, covers[(k * 7) % 32]); m.position.set(1.25 + (k % 2) * 0.02, C.h + 0.04 + k * 0.032, -3.85); m.rotation.set(Math.PI / 2, 0, 0.3 + k * 0.2); add(m); }
  // back counter behind the clerks
  box(3.0, 0.9, 0.5, M.trim, 2.6, 0.45, -2.35, { tile: 1.2 }); box(3.1, 0.04, 0.56, M.dark, 2.6, 0.92, -2.35);
  // the CCTV camera: wall bracket + housing, aimed at the door
  const camG = new THREE.Group(); camG.position.copy(STORE.cam); root.add(camG);
  camG.lookAt(D.x, 1.2, Z0); box(0.12, 0.12, 0.32, M.beige, 0, 0, 0, { parent: camG }); box(0.14, 0.02, 0.36, M.beige, 0, 0.075, 0.02, { parent: camG });
  box(0.04, 0.2, 0.04, M.alu, 0.0, 0.14, -0.1, { parent: camG });

  // ---------- ceiling troffers (half are off: closing time) ----------
  const troffers = [];
  const troffer = (x, z, on) => {
    const m = box(0.58, 0.03, 1.18, on ? M.tube : M.tubeOff, x, CEIL - 0.016, z, { cast: false });
    troffers.push(m); return m;
  };
  const LIGHTS = [];
  for (const [x, z, on] of [[-3.6, -4.8, 0], [-0.6, -4.8, 1], [2.6, -5.4, 0], [2.6, -3.0, 1], [-3.6, -1.2, 1], [-0.6, -1.2, 0], [-3.6, 2.4, 0], [-0.6, 2.4, 1], [2.6, 1.2, 0], [2.6, 3.6, 1]]) {
    troffer(x, z, on);
    if (on) { const l = new THREE.PointLight(0xffe4bc, 1.6, 0, 2); l.position.set(x, CEIL - 0.35, z); root.add(l); LIGHTS.push(l); }
  }
  const key = new THREE.PointLight(0xffd9a8, 2.2, 0, 2); key.position.set(2.4, 2.6, -3.2);
  key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.bias = -0.003; key.shadow.radius = 5; key.shadow.camera.near = 0.1; key.shadow.camera.far = 16; root.add(key);

  // ---------- back office ----------
  const odoor = new THREE.Group(); odoor.position.set(OD.hinge, 0, Z1 + 0.12); root.add(odoor);
  box(OD.w - 0.02, OD.h - 0.01, 0.045, M.trim, (OD.w - 0.02) / 2, OD.h / 2, 0, { parent: odoor, tile: 0.9 });
  const ob = add(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.06, 16), new THREE.MeshStandardMaterial({ color: 0x3a3428, metalness: 0.4, roughness: 0.8 })), true, true, odoor); ob.rotation.x = Math.PI / 2; ob.position.set(OD.w - 0.1, 0.98, 0);
  const staff = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.12), new THREE.MeshStandardMaterial({ map: boardText('EMPLOYEES ONLY', { w: 512, h: 160, bg: '#d8ccb0', fg: '#1a1410', font: '700 70px "Barlow Condensed"', track: 3 }), roughness: 0.6 }));
  staff.position.set((OD.w - 0.02) / 2, 1.6, -0.03); staff.rotation.y = Math.PI; odoor.add(staff);
  // the safe
  const S = STORE.safe, safe = new THREE.Group(); safe.position.set(S.x, 0, S.z); root.add(safe);
  box(S.d, S.h, S.w, M.steel, 0, S.h / 2, 0, { parent: safe });
  box(0.03, S.h - 0.12, S.w - 0.1, M.steel, -S.d / 2 - 0.012, S.h / 2, 0, { parent: safe });                     // door slab
  for (const zz of [-S.w / 2 + 0.06]) for (const yy of [0.3, S.h - 0.3]) { const hg = add(new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.14, 12), M.steel), true, true, safe); hg.position.set(-S.d / 2 - 0.02, yy, zz); }
  const kp = plane(0.13, 0.16, new THREE.MeshStandardMaterial({ map: keypadTex(), roughness: 0.5 }), -S.d / 2 - 0.03, 1.08, 0.13, { parent: safe, ry: -Math.PI / 2 });
  const tl = plane(0.15, 0.15, new THREE.MeshStandardMaterial({ map: timelockTex(), roughness: 0.4, metalness: 0.3 }), -S.d / 2 - 0.03, 1.08, -0.1, { parent: safe, ry: -Math.PI / 2 });
  const tlHand = box(0.004, 0.05, 0.006, M.dark, -S.d / 2 - 0.036, 1.08 - 0.0075, -0.1, { parent: safe, cast: false }); tlHand.geometry.translate(0, 0.022, 0);
  const handle = new THREE.Group(); handle.position.set(-S.d / 2 - 0.05, 0.8, 0.0); safe.add(handle);
  const hub = add(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.045, 0.05, 20), M.alu), true, true, handle); hub.rotation.z = Math.PI / 2;
  for (let k = 0; k < 3; k++) { const sp = new THREE.Group(); sp.rotation.x = k * Math.PI * 2 / 3; handle.add(sp); const arm = add(new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.16, 10), M.alu), true, true, sp); arm.position.y = 0.08; const kn = add(new THREE.Mesh(new THREE.SphereGeometry(0.02, 12, 10), M.alu), true, true, sp); kn.position.y = 0.16; }
  // desk, lamp, monitor, chair, filing cabinet, cork board
  box(1.7, 0.04, 0.7, M.trim, 2.05, 0.75, OF.z1 - 0.38, { tile: 1.2 }); box(0.5, 0.71, 0.66, M.trim, 1.45, 0.36, OF.z1 - 0.38); box(0.04, 0.71, 0.66, M.trim, 2.88, 0.36, OF.z1 - 0.38);
  const mon = new THREE.Group(); mon.position.set(1.6, 0.77, OF.z1 - 0.45); mon.rotation.y = Math.PI + 0.25; root.add(mon);
  box(0.38, 0.33, 0.36, M.beige, 0, 0.17, 0, { parent: mon }); box(0.4, 0.09, 0.32, M.dark, 0, -0.0, 0.02, { parent: mon });
  plane(0.3, 0.23, new THREE.MeshStandardMaterial({ map: monitorTex(), emissive: 0xffffff, emissiveMap: monitorTex(), emissiveIntensity: 0.35, roughness: 0.25 }), 0, 0.18, 0.181, { parent: mon });
  const lampG = new THREE.Group(); lampG.position.set(2.55, 0.77, OF.z1 - 0.5); root.add(lampG);
  box(0.16, 0.03, 0.16, M.dark, 0, 0.015, 0, { parent: lampG }); box(0.02, 0.42, 0.02, M.dark, 0, 0.22, 0, { parent: lampG, rz: 0.2 });
  const shadeMat = new THREE.MeshStandardMaterial({ color: 0x2a2018, emissive: 0xf2e2be, emissiveIntensity: 0.5, side: THREE.DoubleSide, roughness: 1 });
  const lshade = add(new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.16, 24, 1, true), shadeMat), false, false, lampG); lshade.position.set(-0.07, 0.45, -0.02); lshade.rotation.z = 0.5;
  const dlamp = new THREE.PointLight(0xffcf95, 1.5, 0, 2); dlamp.position.set(2.45, 1.12, OF.z1 - 0.6);
  dlamp.castShadow = true; dlamp.shadow.mapSize.set(1024, 1024); dlamp.shadow.bias = -0.003; dlamp.shadow.radius = 5; dlamp.shadow.camera.near = 0.05; dlamp.shadow.camera.far = 10; root.add(dlamp);
  const chair = new THREE.Group(); chair.position.set(2.0, 0, OF.z1 - 1.05); chair.rotation.y = 0.5; root.add(chair);
  box(0.46, 0.08, 0.46, M.dark, 0, 0.48, 0, { parent: chair }); box(0.44, 0.5, 0.06, M.dark, 0, 0.8, 0.22, { parent: chair, rx: 0.08 }); box(0.05, 0.42, 0.05, M.alu, 0, 0.22, 0, { parent: chair });
  for (let k = 0; k < 5; k++) { const a = k * Math.PI * 2 / 5; box(0.3, 0.03, 0.04, M.alu, Math.cos(a) * 0.15, 0.03, Math.sin(a) * 0.15, { parent: chair, ry: -a }); }
  box(0.48, 1.32, 0.62, new THREE.MeshStandardMaterial({ color: 0x4e5048, roughness: 0.5, metalness: 0.4 }), OF.x0 + 0.3, 0.66, OF.z1 - 0.85);
  for (let k = 0; k < 4; k++) box(0.02, 0.24, 0.42, M.dark, OF.x0 + 0.55, 0.22 + k * 0.32, OF.z1 - 0.85);
  plane(1.0, 0.75, new THREE.MeshStandardMaterial({ map: corkboard(71), roughness: 0.95 }), OF.x0 + 0.01, 1.55, 6.6, { ry: Math.PI / 2 });
  box(0.58, 0.03, 1.18, M.tubeOff, 2.8, OF.ceil - 0.016, 7.0, { cast: false });
  const oceil = new THREE.PointLight(0xffe4bc, 0.5, 0, 2); oceil.position.set(2.8, OF.ceil - 0.3, 7.0); root.add(oceil);
  // boxes of tapes against the office's left wall
  for (let k = 0; k < 3; k++) box(0.5, 0.36, 0.4, new THREE.MeshStandardMaterial({ color: 0x5a4a34, roughness: 0.95 }), OF.x0 + 0.35, 0.18 + k * 0.36, 5.6 + (k % 2) * 0.04, { ry: k * 0.1 });

  // ---------- light + environment ----------
  const hemi = new THREE.HemisphereLight(0x4a4a52, 0x0e0b08, 0.16); root.add(hemi);
  const pm = new THREE.PMREMGenerator(renderer), env = new THREE.Scene();
  env.add(new THREE.Mesh(new THREE.BoxGeometry(12, 4, 14), new THREE.MeshBasicMaterial({ color: 0x0a0908, side: THREE.BackSide })));
  for (const [x, z] of [[-0.6, -4.8], [2.6, -3.0], [-3.6, -1.2], [-0.6, 2.4]]) { const h = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.05, 1.2), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.9, 0.75).multiplyScalar(2.5) })); h.position.set(x, 1.9, z * 0.6); env.add(h); }
  const envTex = pm.fromScene(env, 0.04).texture;

  return { root, frontDoor, odoor, drawer, handle, tlHand, sign: signMat, signLight, troffers, LIGHTS, key, dlamp, oceil, poleL, poleR, envTex, M, safe };
}
