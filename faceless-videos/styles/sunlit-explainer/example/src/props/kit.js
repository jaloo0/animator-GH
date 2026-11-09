// Building blocks for sets: PBR materials from painted textures, boxes/cylinders/lathes, plank walls,
// instanced scatter, decals with printed type.
import * as THREE from 'three';
import { canvas, printText, toTex, rng } from '../core/tex.js';

export function pbr(tex, { repeat = [1, 1], color = 0xffffff, rough = 1, metal = 0, ns = 1, side = THREE.FrontSide, env = 1, sheen = 0 } = {}) {
  const m = new (sheen ? THREE.MeshPhysicalMaterial : THREE.MeshStandardMaterial)({ color, roughness: rough, metalness: metal, side, envMapIntensity: env });
  if (tex) {
    for (const k of ['map', 'roughnessMap', 'normalMap']) if (tex[k]) { m[k] = tex[k].clone(); m[k].needsUpdate = true; m[k].repeat.set(...repeat); m[k].wrapS = m[k].wrapT = THREE.RepeatWrapping; }
    m.normalScale = new THREE.Vector2(ns, ns);
  }
  if (sheen) { m.sheen = sheen; m.sheenRoughness = 0.7; m.sheenColor = new THREE.Color(0xffffff).multiplyScalar(0.5); }
  return m;
}
export function mesh(geo, mat, { pos = [0, 0, 0], rot = [0, 0, 0], scale = null, cast = true, recv = true, parent = null, name = '' } = {}) {
  const m = new THREE.Mesh(geo, mat); m.position.set(...pos); m.rotation.set(...rot); if (scale) m.scale.set(...(Array.isArray(scale) ? scale : [scale, scale, scale]));
  m.castShadow = cast; m.receiveShadow = recv; m.name = name; if (parent) parent.add(m); return m;
}
/** box with UVs in metres (so textures tile at a physical scale) */
export function boxM(w, h, d, texScale = 1) {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv, p = g.attributes.position, n = g.attributes.normal;
  for (let i = 0; i < uv.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i));
    const [u, v] = ax > 0.5 ? [p.getZ(i), p.getY(i)] : ay > 0.5 ? [p.getX(i), p.getZ(i)] : [p.getX(i), p.getY(i)];
    uv.setXY(i, u / texScale, v / texScale);
  }
  return g;
}
/** lathe of a ring (thick tube) along +Y */
export function ringLathe(rIn, rOut, len, seg = 64) {
  const pts = [new THREE.Vector2(rIn, -len / 2), new THREE.Vector2(rOut, -len / 2), new THREE.Vector2(rOut, len / 2), new THREE.Vector2(rIn, len / 2), new THREE.Vector2(rIn, -len / 2)];
  return new THREE.LatheGeometry(pts, seg);
}
/** printed-type decal: a plane with transparent canvas; draw(canvas) prints on it */
export function decal(w, h, draw, { res = 1024, rough = 0.8, color = 0xffffff, curved = 0, curvedV = 0, opacity = 1 } = {}) {
  const c = canvas(res, Math.round(res * h / w)); draw(c);
  const t = toTex(c, { wrap: false }); t.anisotropy = 8;
  const m = new THREE.MeshStandardMaterial({ map: t, transparent: true, roughness: rough, color, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, opacity });
  let g = new THREE.PlaneGeometry(w, h, curved ? 48 : 1, 1);
  if (curved) { // wrap around a cylinder of radius `curved` (axis = Y of the plane)
    const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), a = x / curved; p.setX(i, Math.sin(a) * curved); p.setZ(i, Math.cos(a) * curved - curved); } g.computeVertexNormals();
  }
  if (curvedV) { // wrap around a cylinder whose axis is the plane's X
    g = new THREE.PlaneGeometry(w, h, 1, 48);
    const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i), a = y / curvedV; p.setY(i, Math.sin(a) * curvedV); p.setZ(i, Math.cos(a) * curvedV - curvedV); } g.computeVertexNormals();
  }
  const msh = new THREE.Mesh(g, m); msh.receiveShadow = true; msh.renderOrder = 2;
  return msh;
}
export { printText };

/** instanced scatter helper */
export function scatter(geo, mat, n, place, { cast = true } = {}) {
  const im = new THREE.InstancedMesh(geo, mat, n); const o = new THREE.Object3D(); const R = rng(n * 7 + 3);
  for (let i = 0; i < n; i++) { place(o, i, R); o.updateMatrix(); im.setMatrixAt(i, o.matrix); }
  im.castShadow = cast; im.receiveShadow = true; im.instanceMatrix.needsUpdate = true; return im;
}
/** sandbag geometry: squashed rounded box with sag + tied ears */
export function sandbagGeo(seed = 1) {
  const g = new THREE.SphereGeometry(1, 28, 16); const p = g.attributes.position; const R = rng(seed);
  const ph = R() * 10;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    // superellipsoid-ish: push toward box
    const s = (v) => Math.sign(v) * Math.pow(Math.abs(v), 0.55);
    x = s(x) * 0.3; y = s(y) * 0.085; z = s(z) * 0.18;
    y -= 0.03 * (x / 0.3) ** 2 * (y > 0 ? 1 : 0.4); // sag
    y += 0.008 * Math.sin(x * 30 + ph) * Math.cos(z * 20) + 0.012 * Math.sin(x * 9 + ph * 2) * Math.sin(z * 11 + ph);
    if (Math.abs(x) > 0.24) { const k = (Math.abs(x) - 0.24) / 0.06; y *= 1 - 0.45 * k; z *= 1 - 0.35 * k; }
    if (y < -0.06) y = -0.06 - (y + 0.06) * 0.2; // flat bottom
    p.setXYZ(i, x, y, z);
  }
  g.computeVertexNormals();
  return g;
}
