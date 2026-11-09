// 1919: the E.D. Bullard Co. shop, San Francisco. Low sun through a multi-pane window (lettering on the glass),
// shafts of light with dust, a long bench: wooden hat form, steam pot, glue, paint, canvas bolt, stamp + hat box;
// shelves of carbide miners' lamps; a coat hook for the helmet; a 1918/1919 calendar.
import * as THREE from 'three';
import { makeSky } from '../core/sky.js';
import { timber, paper, canvasCloth, noise2, rng, canvas, printText } from '../core/tex.js';
import { pbr, mesh, boxM, decal } from '../props/kit.js';
import { makeHat, HATS, hatGeometry } from '../props/hats.js';
import { makeMotes } from './trench.js';

export const SHOP = { win: -3.0, bench: { x: -2.25, z: -0.6, top: 0.92, len: 2.6, depth: 0.78 }, back: -3.0 };

function plaster(seed = 61) {
  const n = noise2(seed);
  const c = canvas(512, 512), x = c.getContext('2d'), img = x.createImageData(512, 512);
  for (let j = 0; j < 512; j++) for (let i = 0; i < 512; i++) {
    const f = n.tfbm(i / 64, j / 64, 8, 8, 5), o = (j * 512 + i) * 4, t = 0.9 + 0.12 * f - 0.05 * (n(i * 0.3, j * 0.3));
    img.data[o] = 214 * t; img.data[o + 1] = 202 * t; img.data[o + 2] = 182 * t; img.data[o + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = tex.wrapT = THREE.RepeatWrapping; return tex;
}

export function buildShop(renderer, cast) {
  const scene = new THREE.Scene();
  const sky = makeSky(renderer, { az: -90, el: 17, top: 0x4b8fd0, mid: 0x9ac6ea, haze: 0xf6e0c0, ground: 0xa08060, sunI: 6.0, cloud: 0.3 });
  scene.add(sky.dome, sky.sun, sky.sun.target); scene.environment = sky.env; scene.environmentIntensity = 0.3;
  const R = rng(12), B = SHOP.bench;
  const floorT = timber(62, { boards: 8, base: 0x7a5236, grey: 0.1 });
  const woodM = pbr(timber(63, { boards: 4, base: 0x8b5b3b, grey: 0.12 }), { repeat: [0.5, 0.5], ns: 0.8 });
  const darkWoodM = pbr(timber(64, { boards: 2, base: 0x7a5034, grey: 0.05 }), { repeat: [0.4, 0.4], ns: 0.6, rough: 0.7 });
  const wallM = new THREE.MeshStandardMaterial({ map: plaster(), roughness: 0.95 }); wallM.map.repeat.set(3, 2);
  const W = 6, Dp = 6, Hh = 3.3;
  // floor, ceiling, walls (the window wall is built from pieces around the opening)
  mesh(boxM(W, 0.1, Dp, 1), pbr(floorT, { repeat: [3, 1.5], ns: 1.5, rough: 0.8 }), { pos: [0, -0.05, 0], parent: scene });
  mesh(boxM(W, 0.1, Dp, 1), wallM, { pos: [0, Hh + 0.05, 0], parent: scene });
  for (let x = -2.5; x <= 2.5; x += 1.25) mesh(boxM(0.16, 0.22, Dp, 0.5), darkWoodM, { pos: [x, Hh - 0.11, 0], parent: scene });
  mesh(boxM(W, Hh, 0.12, 1), wallM, { pos: [0, Hh / 2, SHOP.back - 0.06], parent: scene });
  mesh(boxM(W, Hh, 0.12, 1), wallM, { pos: [0, Hh / 2, 3.06], parent: scene });
  mesh(boxM(0.12, Hh, Dp, 1), wallM, { pos: [3.06, Hh / 2, 0], parent: scene });
  // window wall at x = -3 with an opening 2.2 wide × 1.8 high (sill at 1.0)
  const wx = SHOP.win - 0.06, o = { z0: -1.85, z1: 0.65, y0: 1.0, y1: 2.85 };
  mesh(boxM(0.12, Hh, o.z0 + 3), wallM, { pos: [wx, Hh / 2, (-3 + o.z0) / 2], parent: scene });
  mesh(boxM(0.12, Hh, 3 - o.z1), wallM, { pos: [wx, Hh / 2, (o.z1 + 3) / 2], parent: scene });
  mesh(boxM(0.12, o.y0, o.z1 - o.z0), wallM, { pos: [wx, o.y0 / 2, (o.z0 + o.z1) / 2], parent: scene });
  mesh(boxM(0.12, Hh - o.y1, o.z1 - o.z0), wallM, { pos: [wx, (Hh + o.y1) / 2, (o.z0 + o.z1) / 2], parent: scene });
  // wainscot
  for (const [p, s] of [[[0, 0.5, SHOP.back + 0.01], [W, 1.0, 0.03]], [[2.98, 0.5, 0], [0.03, 1.0, Dp]]]) mesh(boxM(...s, 0.6), woodM, { pos: p, parent: scene });
  // window frame + muntins + glass
  const frameM = new THREE.MeshStandardMaterial({ color: 0x5a4636, roughness: 0.6 });
  const win = new THREE.Group();
  const zs = [o.z0, (o.z0 * 2 + o.z1) / 3, (o.z0 + o.z1 * 2) / 3, o.z1], ys = [o.y0, (o.y0 + o.y1) / 2, o.y1];
  for (const z of zs) mesh(boxM(0.08, o.y1 - o.y0, 0.05), frameM, { pos: [wx, (o.y0 + o.y1) / 2, z], parent: win });
  for (const y of ys) mesh(boxM(0.08, 0.05, o.z1 - o.z0), frameM, { pos: [wx, y, (o.z0 + o.z1) / 2], parent: win });
  for (let i = 0; i < 6; i++) for (let j = 1; j < 3; j++) { const z = o.z0 + (o.z1 - o.z0) * i / 6; if (i) mesh(boxM(0.04, o.y1 - o.y0, 0.025), frameM, { pos: [wx, (o.y0 + o.y1) / 2, z], parent: win }); void j; }
  mesh(boxM(0.22, 0.05, o.z1 - o.z0 + 0.2), darkWoodM, { pos: [wx + 0.06, o.y0 - 0.02, (o.z0 + o.z1) / 2], parent: win });
  scene.add(win);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(o.z1 - o.z0, o.y1 - o.y0), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.05, transparent: true, opacity: 0.06, envMapIntensity: 2 }));
  glass.rotation.y = Math.PI / 2; glass.position.set(wx, (o.y0 + o.y1) / 2, (o.z0 + o.z1) / 2); glass.castShadow = false; scene.add(glass);
  // lettering painted on the glass (seen from inside → mirrored)
  const lett = decal(2.0, 0.7, (c) => {
    const x = c.getContext('2d'); x.translate(c.width, 0); x.scale(-1, 1);
    printText(c, ['E.D. BULLARD CO.'], { size: 150, y: 0.32, color: '#4b4845', seed: 21, wear: 0.15 });
    printText(c, ["MINERS' & CONTRACTORS' SUPPLIES"], { size: 62, y: 0.68, color: '#4b4845', seed: 22, wear: 0.15, font: 'Rockwell', weight: 'normal' });
  }, { res: 1400, rough: 0.4 });
  lett.material.side = THREE.DoubleSide; lett.castShadow = true;
  lett.rotation.y = Math.PI / 2; lett.position.set(wx + 0.005, 2.18, (o.z0 + o.z1) / 2); scene.add(lett);
  // outside: a low brick wall across the street, then sky
  mesh(boxM(0.3, 3.2, 40, 1), new THREE.MeshStandardMaterial({ color: 0xb48e6c, roughness: 0.9 }), { pos: [-22, 1.6, 0], parent: scene, cast: false });

  // the bench
  const bench = new THREE.Group();
  mesh(boxM(B.depth, 0.07, B.len, 0.8), pbr(timber(65, { boards: 3, base: 0xa07050, grey: 0.08 }), { repeat: [1, 0.5], rough: 0.7, ns: 0.6 }), { pos: [0, B.top - 0.035, 0], parent: bench });
  for (const dz of [-1.2, 1.2]) for (const dx of [-0.32, 0.32]) mesh(boxM(0.08, B.top - 0.07, 0.08), darkWoodM, { pos: [dx, (B.top - 0.07) / 2, dz], parent: bench });
  mesh(boxM(B.depth - 0.1, 0.03, B.len - 0.2), darkWoodM, { pos: [0, 0.18, 0], parent: bench });
  bench.position.set(B.x, 0, B.z); scene.add(bench);
  const T = (x, z) => [B.x + x, B.top, B.z + z]; // bench-top coords

  // wooden hat form (block) on a turned pedestal
  const form = new THREE.Group();
  const dome = HATS.boiled.pts.slice(0, 8).map(([r, y]) => new THREE.Vector2(r * 0.965, y - 0.005)).reverse();
  const formM = pbr(timber(66, { boards: 1, base: 0xa77a50, grey: 0.0 }), { rough: 0.55, repeat: [1, 1] });
  const fm = mesh(new THREE.LatheGeometry([new THREE.Vector2(0, -0.004), new THREE.Vector2(dome[0].x, -0.004), ...dome], 64), formM, { parent: form }); fm.scale.set(HATS.boiled.sx, 1, 1);
  mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.03, 32), formM, { pos: [0, -0.019, 0], parent: form });
  mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.12, 24), formM, { pos: [0, -0.094, 0], parent: form });
  mesh(new THREE.CylinderGeometry(0.11, 0.12, 0.025, 32), formM, { pos: [0, -0.146, 0], parent: form });
  form.position.set(...T(0.05, 0.25)); form.position.y += 0.155; scene.add(form);

  // steam pot on a small burner
  const pot = new THREE.Group();
  const potM = new THREE.MeshStandardMaterial({ color: 0x8a5a3a, roughness: 0.35, metalness: 0.85 });
  mesh(new THREE.LatheGeometry([new THREE.Vector2(0, 0), new THREE.Vector2(0.14, 0), new THREE.Vector2(0.15, 0.02), new THREE.Vector2(0.15, 0.2), new THREE.Vector2(0.16, 0.21), new THREE.Vector2(0.145, 0.21), new THREE.Vector2(0.14, 0.03)], 48), potM, { pos: [0, 0.07, 0], parent: pot });
  mesh(new THREE.CylinderGeometry(0.12, 0.13, 0.07, 24), new THREE.MeshStandardMaterial({ color: 0x4b4845, roughness: 0.5, metalness: 0.6 }), { pos: [0, 0.035, 0], parent: pot });
  const wSurf = mesh(new THREE.CircleGeometry(0.14, 32), new THREE.MeshPhysicalMaterial({ color: 0x3a3430, roughness: 0.1, clearcoat: 1 }), { pos: [0, 0.24, 0], rot: [-Math.PI / 2, 0, 0], parent: pot });
  // canvas soaking in the pot
  mesh(new THREE.TorusGeometry(0.1, 0.02, 8, 24), new THREE.MeshStandardMaterial({ color: 0xc4ae86, roughness: 0.9 }), { pos: [0, 0.245, 0], rot: [Math.PI / 2, 0, 0], scale: [1, 1, 0.4], parent: pot });
  pot.position.set(...T(0.0, 0.95)); scene.add(pot);
  void wSurf;

  // glue pot + brush, paint can + brush
  const tinM = new THREE.MeshStandardMaterial({ color: 0x8a8274, roughness: 0.45, metalness: 0.7 });
  const gluePot = mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.1, 32), tinM, { pos: [B.x + 0.22, B.top + 0.05, B.z + 0.62], parent: scene });
  mesh(new THREE.CircleGeometry(0.056, 24), new THREE.MeshPhysicalMaterial({ color: 0xb08a4a, roughness: 0.15, clearcoat: 1 }), { pos: [0, 0.046, 0], rot: [-Math.PI / 2, 0, 0], parent: gluePot });
  const paintCan = mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.12, 32), tinM, { pos: [B.x + 0.24, B.top + 0.06, B.z - 0.2], parent: scene });
  mesh(new THREE.CircleGeometry(0.07, 24), new THREE.MeshPhysicalMaterial({ color: 0x2c2826, roughness: 0.1, clearcoat: 1 }), { pos: [0, 0.056, 0], rot: [-Math.PI / 2, 0, 0], parent: paintCan });
  const glueBrush = makeBrush(0xb08a4a), paintBrush = makeBrush(0x2c2826);
  scene.add(glueBrush, paintBrush);
  // canvas bolt + cut sheets
  const canvasTex = canvasCloth(67, { base: 0xc9b48c });
  const canvasM = pbr(canvasTex, { repeat: [2, 2], ns: 1.2, sheen: 0.5 });
  mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.9, 32), canvasM, { pos: [B.x - 0.15, B.top + 0.09, B.z - 1.0], rot: [Math.PI / 2, 0, 0], parent: scene });
  for (let k = 0; k < 4; k++) mesh(boxM(0.36, 0.004, 0.36), canvasM, { pos: [B.x + 0.12, B.top + 0.002 + k * 0.004, B.z + 0.25 + (R() - 0.5) * 0.02], rot: [0, (R() - 0.5) * 0.4, 0], parent: scene });

  // hat box (E1) + rubber stamp + ink pad
  const boxM_ = new THREE.MeshStandardMaterial({ color: 0xb08a5e, roughness: 0.85 });
  const hatBox = new THREE.Group();
  mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.16, 48), boxM_, { pos: [0, 0.08, 0], parent: hatBox });
  const lid = mesh(new THREE.CylinderGeometry(0.197, 0.197, 0.035, 48), boxM_, { pos: [0, 0.175, 0], parent: hatBox });
  const stampPrint = decal(0.3, 0.3, (c) => {
    const x = c.getContext('2d'); x.strokeStyle = 'rgba(75,72,69,0.9)'; x.lineWidth = 16; x.beginPath(); x.arc(c.width / 2, c.height / 2, c.width * 0.46, 0, Math.PI * 2); x.stroke();
    x.lineWidth = 5; x.beginPath(); x.arc(c.width / 2, c.height / 2, c.width * 0.41, 0, Math.PI * 2); x.stroke();
    printText(c, ['HARD'], { size: 190, y: 0.32, style: 'stamp', color: '#4b4845', seed: 31 });
    printText(c, ['BOILED'], { size: 160, y: 0.52, style: 'stamp', color: '#4b4845', seed: 32 });
    printText(c, ['HAT'], { size: 150, y: 0.71, style: 'stamp', color: '#4b4845', seed: 33 });
    printText(c, ['E.D. BULLARD CO. · S.F. · PAT. 1919'], { size: 40, y: 0.87, style: 'stamp', color: '#4b4845', seed: 34, font: 'Rockwell', weight: 'normal' });
  }, { res: 1024, rough: 0.9 });
  stampPrint.rotation.x = -Math.PI / 2; stampPrint.position.y = 0.0185; lid.add(stampPrint);
  hatBox.position.set(...T(0.08, -0.62)); hatBox.rotation.y = 0.5; scene.add(hatBox);
  const stamp = new THREE.Group();
  mesh(new THREE.BoxGeometry(0.11, 0.025, 0.11), darkWoodM, { pos: [0, 0.03, 0], parent: stamp });
  mesh(new THREE.BoxGeometry(0.105, 0.012, 0.105), new THREE.MeshStandardMaterial({ color: 0x4b4845, roughness: 0.9 }), { pos: [0, 0.012, 0], parent: stamp });
  mesh(new THREE.CylinderGeometry(0.012, 0.016, 0.07, 12), darkWoodM, { pos: [0, 0.075, 0], parent: stamp });
  mesh(new THREE.SphereGeometry(0.026, 16, 12), darkWoodM, { pos: [0, 0.12, 0], parent: stamp });
  scene.add(stamp);
  mesh(boxM(0.14, 0.015, 0.1), new THREE.MeshStandardMaterial({ color: 0x4b4845, roughness: 0.6 }), { pos: [B.x + 0.25, B.top + 0.008, B.z - 0.95], parent: scene });

  // shelves on the back wall: carbide lamps, tins, folded canvas
  const shelfX = [-1.35, 1.4];
  const brassM = new THREE.MeshStandardMaterial({ color: 0xa48a5a, roughness: 0.35, metalness: 0.9 });
  for (let k = 0; k < 4; k++) {
    const y = 1.0 + k * 0.45;
    mesh(boxM(shelfX[1] - shelfX[0], 0.035, 0.32), darkWoodM, { pos: [(shelfX[0] + shelfX[1]) / 2, y, SHOP.back + 0.17], parent: scene });
    for (let x = shelfX[0] + 0.12; x < shelfX[1] - 0.1; x += 0.14 + R() * 0.12) {
      const r = R();
      if (r < 0.45) { const lamp = makeCarbideLamp(brassM); lamp.position.set(x, y + 0.018, SHOP.back + 0.16 + (R() - 0.5) * 0.06); lamp.rotation.y = R() * 6; scene.add(lamp); }
      else if (r < 0.75) mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.1 + R() * 0.06, 20), tinM, { pos: [x, y + 0.07, SHOP.back + 0.16], parent: scene });
      else mesh(boxM(0.12, 0.06 + R() * 0.08, 0.22), canvasM, { pos: [x, y + 0.06, SHOP.back + 0.17], parent: scene });
    }
  }
  for (const x of shelfX) mesh(boxM(0.04, 1.6, 0.3), darkWoodM, { pos: [x, 1.6, SHOP.back + 0.17], parent: scene });
  // coat hooks + a coat, on the back wall left of the shelves
  const hookBoard = mesh(boxM(0.75, 0.12, 0.03), darkWoodM, { pos: [-2.45, 1.78, SHOP.back + 0.015], parent: scene });
  const hooks = [];
  for (let k = 0; k < 3; k++) { const h = mesh(new THREE.TorusGeometry(0.03, 0.006, 6, 12, Math.PI * 1.2), brassM, { pos: [-2.7 + k * 0.25, 1.75, SHOP.back + 0.05], rot: [0, Math.PI / 2, Math.PI * 0.9], parent: scene }); hooks.push(h); }
  void hookBoard;
  const coat = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.24, 1.0, 20, 6, true), new THREE.MeshPhysicalMaterial({ color: 0x4b4845, roughness: 0.95, sheen: 0.8, sheenColor: 0x7a7470, side: THREE.DoubleSide }));
  { const p = coat.geometry.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setZ(i, p.getZ(i) * 0.45 + 0.02 * Math.sin(p.getX(i) * 40 + y * 6)); } coat.geometry.computeVertexNormals(); }
  coat.visible = false;
  // calendar on the back wall by the bench
  const cal = makeCalendar(); cal.group.position.set(-1.78, 1.55, SHOP.back + 0.012); scene.add(cal.group);

  // light shafts through the window + dust in them
  const shafts = makeShafts(sky.sunDir, o, wx); scene.add(shafts);
  const motes = makeMotes(420, [-2.9, 0.6, -2.0], [-0.6, 2.8, 0.8]); motes.material.uniforms.uSize.value = 0.0012; scene.add(motes);
  // warm bounce from the sun patch + cool skylight from the window
  const bounce = new THREE.PointLight(0xffc89a, 3.2, 7, 1.4); bounce.position.set(-1.6, 0.5, -0.5); scene.add(bounce);
  const skyFill = new THREE.PointLight(0xa8c8ec, 1.6, 7, 1.5); skyFill.position.set(-2.6, 2.2, -0.5); scene.add(skyFill);
  scene.add(new THREE.HemisphereLight(0xe8eef4, 0x9a7a5a, 0.45));

  // steam
  const steam = makeSteam(160); scene.add(steam);

  // the hero hat in progress: form-fitted shell (canvas → painted), layers for the exploded view, the drape sheet
  const shellDef = { ...HATS.boiled };
  const layers = [];
  const layerMat = new THREE.MeshPhysicalMaterial({ color: 0xf0dcb4, roughness: 0.9, sheen: 0.4, sheenColor: 0xfff0d8, side: THREE.DoubleSide, map: canvasTex.map, normalMap: canvasTex.normalMap });
  for (let k = 0; k < 5; k++) { const m = new THREE.Mesh(hatGeometry(shellDef), layerMat.clone()); m.castShadow = true; m.receiveShadow = true; m.visible = false; scene.add(m); layers.push(m); }
  const drape = makeDrape(canvasTex); scene.add(drape.mesh);
  const paintHat = makeHat('boiled'); scene.add(paintHat.group);
  addPaintMask(paintHat.material(), canvasTex);

  const bullard = cast.bullard; scene.add(bullard.group);
  const helmet = makeHat('brodie'); scene.add(helmet.group);

  return {
    name: 'shop', scene, sky, bullard, helmet, form, pot, gluePot, paintCan, glueBrush, paintBrush, hatBox, lid, stampPrint, stamp, cal, hooks, coat, steam, motes, shafts, layers, drape, paintHat, T, win: o,
    reset() { bullard.reset(); for (const l of layers) l.visible = false; drape.mesh.visible = false; paintHat.group.visible = false; },
    update(t) { motes.material.uniforms.uTime.value = t; steam.material.uniforms.uTime.value = t; shafts.material.uniforms.uTime.value = t; },
  };
}

function makeBrush(col) {
  const g = new THREE.Group();
  mesh(new THREE.CylinderGeometry(0.008, 0.01, 0.2, 10), new THREE.MeshStandardMaterial({ color: 0x8b5b3b, roughness: 0.6 }), { pos: [0, 0.1, 0], parent: g });
  mesh(new THREE.BoxGeometry(0.04, 0.03, 0.012), new THREE.MeshStandardMaterial({ color: 0x9a9080, roughness: 0.3, metalness: 0.9 }), { pos: [0, -0.01, 0], parent: g });
  mesh(new THREE.BoxGeometry(0.038, 0.045, 0.011), new THREE.MeshStandardMaterial({ color: col, roughness: 0.5 }), { pos: [0, -0.045, 0], parent: g });
  return g; // origin at the ferrule; bristles toward -Y
}
function makeCarbideLamp(m) {
  const g = new THREE.Group();
  mesh(new THREE.LatheGeometry([new THREE.Vector2(0, 0), new THREE.Vector2(0.03, 0), new THREE.Vector2(0.032, 0.05), new THREE.Vector2(0.026, 0.06), new THREE.Vector2(0.03, 0.065), new THREE.Vector2(0.03, 0.11), new THREE.Vector2(0.01, 0.12), new THREE.Vector2(0, 0.12)], 24), m, { parent: g });
  mesh(new THREE.CylinderGeometry(0.035, 0.012, 0.02, 20), m, { pos: [0, 0.09, 0.04], rot: [Math.PI / 2, 0, 0], parent: g });
  return g;
}
function makeCalendar() {
  const g = new THREE.Group();
  const backing = mesh(boxM(0.4, 0.58, 0.008), new THREE.MeshStandardMaterial({ color: 0x8b5b3b, roughness: 0.8 }), { pos: [0, 0, 0], parent: g });
  void backing;
  const head = decal(0.38, 0.14, (c) => {
    const x = c.getContext('2d'); x.fillStyle = '#e5dfd0'; x.fillRect(0, 0, c.width, c.height);
    printText(c, ['E.D. BULLARD CO.'], { size: 110, y: 0.38, color: '#4b4845', seed: 41 });
    printText(c, ['SAN FRANCISCO'], { size: 54, y: 0.78, color: '#4b4845', seed: 42, font: 'Rockwell', weight: 'normal', track: 8 });
  }, { res: 1024, rough: 0.9 });
  head.position.set(0, 0.2, 0.006); g.add(head);
  const page = (month, year, seed) => decal(0.36, 0.38, (c) => {
    const x = c.getContext('2d'); x.fillStyle = '#e8e2d3'; x.fillRect(0, 0, c.width, c.height);
    printText(c, [month], { size: 92, y: 0.1, color: '#4b4845', seed, track: 6 });
    printText(c, [year], { size: 330, y: 0.38, color: '#4b4845', seed: seed + 1 });
    x.strokeStyle = 'rgba(75,72,69,0.55)'; x.lineWidth = 3;
    for (let r = 0; r < 5; r++) for (let d = 0; d < 7; d++) { const n = r * 7 + d - 2; if (n < 1 || n > 31) continue; x.font = 'bold 34px Rockwell'; x.fillStyle = 'rgba(75,72,69,0.85)'; x.fillText(String(n), 70 + d * 132, 690 + r * 66); }
  }, { res: 1024, rough: 0.9 });
  const p19 = page('JANUARY', '1919', 51); p19.position.set(0, -0.08, 0.007); g.add(p19);
  // the 1918 sheet is a bendable plane (torn off in D1)
  const c = canvas(1024, 1080), x = c.getContext('2d'); x.fillStyle = '#e8e2d3'; x.fillRect(0, 0, 1024, 1080);
  printText(c, ['DECEMBER'], { size: 92, y: 0.1, color: '#4b4845', seed: 61, track: 6 });
  printText(c, ['1918'], { size: 330, y: 0.38, color: '#4b4845', seed: 62 });
  x.font = 'bold 34px Rockwell'; x.fillStyle = 'rgba(75,72,69,0.85)';
  for (let r = 0; r < 5; r++) for (let d = 0; d < 7; d++) { const n = r * 7 + d; if (n < 1 || n > 31) continue; x.fillText(String(n), 70 + d * 132, 690 + r * 66); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  const sg = new THREE.PlaneGeometry(0.36, 0.38, 24, 24); sg.translate(0, -0.19, 0); // pivot at the top edge
  const sheet = new THREE.Mesh(sg, new THREE.MeshStandardMaterial({ map: t, roughness: 0.85, side: THREE.DoubleSide }));
  sheet.castShadow = true; sheet.receiveShadow = true; sheet.position.set(0, 0.11, 0.009); g.add(sheet);
  sheet.userData.base = sg.attributes.position.array.slice();
  return { group: g, sheet };
}
/** additive light shafts: a prism from the window opening along the sun direction */
function makeShafts(sunDir, o, wx) {
  const L = 7, dir = sunDir.clone().negate();
  const corners = [[o.z0, o.y0], [o.z1, o.y0], [o.z1, o.y1], [o.z0, o.y1]].map(([z, y]) => new THREE.Vector3(wx, y, z));
  const pos = [], uv = [];
  const quad = (a, b, c, d, ua, ub) => { for (const [p, u] of [[a, ua], [b, ub], [c, ub], [a, ua], [c, ub], [d, ua]]) { pos.push(p.x, p.y, p.z); uv.push(...u); } };
  for (let i = 0; i < 4; i++) {
    const a = corners[i], b = corners[(i + 1) % 4], c = b.clone().addScaledVector(dir, L), d = a.clone().addScaledVector(dir, L);
    quad(a, b, c, d, [i / 4, 0], [(i + 1) / 4, 0]);
    // fix uv.y along length
    const n = uv.length; uv[n - 10] = (i + 1) / 4; uv[n - 9] = 1; uv[n - 6] = (i + 1) / 4; uv[n - 5] = 1; uv[n - 3] = 1; uv[n - 1] = 1;
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  const m = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uWx: { value: wx }, uDir: { value: dir }, uZ: { value: new THREE.Vector2(o.z0, o.z1) }, uY: { value: new THREE.Vector2(o.y0, o.y1) } },
    vertexShader: /* glsl */`varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */`uniform float uTime, uWx; uniform vec3 uDir; uniform vec2 uZ, uY; varying vec3 vW;
      float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h(i), h(i + vec2(1,0)), f.x), mix(h(i + vec2(0,1)), h(i + vec2(1,1)), f.x), f.y); }
      void main(){
        // trace back along the beam to the window plane → which pane (muntin shadows)
        float k = (vW.x - uWx) / uDir.x; vec3 o = vW - uDir * k;
        vec2 wp = vec2((o.z - uZ.x) / (uZ.y - uZ.x), (o.y - uY.x) / (uY.y - uY.x));
        float pane = step(0.0, wp.x) * step(wp.x, 1.0) * step(0.0, wp.y) * step(wp.y, 1.0);
        vec2 g = fract(wp * vec2(6.0, 2.0)); float mull = smoothstep(0.0, 0.03, g.x) * smoothstep(1.0, 0.97, g.x) * smoothstep(0.0, 0.03, g.y) * smoothstep(1.0, 0.97, g.y);
        float along = clamp(k / 7.0, 0.0, 1.0);
        float dust = 0.6 + 0.4 * n(vec2(o.z * 3.0 + uTime * 0.1, o.y * 3.0 + k * 0.5));
        float a = pane * mull * (1.0 - along) * smoothstep(0.0, 0.08, along) * dust * 0.085;
        gl_FragColor = vec4(vec3(1.0, 0.84, 0.62) * a, 1.0);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
  const mm = new THREE.Mesh(g, m); mm.frustumCulled = false; mm.renderOrder = 5; return mm;
}
/** steam: soft billboards rising and curling from an emitter (uniform uOrigin), backlit warm */
function makeSteam(n) {
  const R = rng(5), seed = new Float32Array(n), pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) seed[i] = R();
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  const m = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uOrigin: { value: new THREE.Vector3() }, uRate: { value: 1 }, uSpread: { value: 0.1 }, uRise: { value: 0.35 }, uLife: { value: 2.2 }, uSize: { value: 0.09 }, uAlpha: { value: 0.32 }, uSun: { value: new THREE.Vector3(1, 0.3, 0) } },
    vertexShader: /* glsl */`attribute float aSeed; uniform float uTime, uSpread, uRise, uLife, uSize, uRate; uniform vec3 uOrigin; varying float vA; varying float vR;
      void main(){
        float life = uLife * (0.7 + 0.6 * fract(aSeed * 7.3));
        float t = mod(uTime * uRate + aSeed * life, life) / life;
        float a = aSeed * 40.0;
        vec3 p = uOrigin + vec3(cos(a) * uSpread * (0.3 + t), t * uRise * life, sin(a) * uSpread * (0.3 + t));
        p.x += sin(t * 5.0 + a) * 0.04 * t; p.z += cos(t * 4.0 + a * 1.3) * 0.04 * t;
        vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv;
        gl_PointSize = uSize * (0.4 + 1.6 * t) * projectionMatrix[1][1] * 540.0 / -mv.z;
        vA = smoothstep(0.0, 0.12, t) * (1.0 - smoothstep(0.45, 1.0, t)); vR = aSeed * 6.28;
      }`,
    fragmentShader: /* glsl */`uniform float uAlpha; varying float vA; varying float vR;
      float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h(i), h(i + vec2(1,0)), f.x), mix(h(i + vec2(0,1)), h(i + vec2(1,1)), f.x), f.y); }
      void main(){
        vec2 c = gl_PointCoord - 0.5; float cs = cos(vR), sn = sin(vR); c = mat2(cs, -sn, sn, cs) * c;
        float d = length(c); float puff = (n(c * 5.0 + vR) * 0.6 + n(c * 11.0 - vR) * 0.4);
        float a = smoothstep(0.5, 0.05, d) * puff * vA * uAlpha;
        gl_FragColor = vec4(vec3(1.0, 0.95, 0.88) * 1.4, a);
      }`,
    transparent: true, depthWrite: false,
  });
  const p = new THREE.Points(g, m); p.frustumCulled = false; p.renderOrder = 6; return p;
}
/** a square of steamed canvas that drapes from flat onto the hat form (t: 0 flat … 1 on the form) */
function makeDrape(canvasTex) {
  const N = 40, S = 0.44, def = HATS.boiled;
  const g = new THREE.PlaneGeometry(S, S, N, N); g.rotateX(-Math.PI / 2);
  const flat = g.attributes.position.array.slice();
  const m = new THREE.Mesh(g, new THREE.MeshPhysicalMaterial({ color: 0xcdb892, roughness: 0.85, sheen: 0.6, sheenColor: 0xeadcc0, side: THREE.DoubleSide, map: canvasTex.map, normalMap: canvasTex.normalMap }));
  m.castShadow = true; m.receiveShadow = true; m.visible = false;
  // target on the form: polar map of the square onto the profile arc
  const P = def.pts, arc = [0]; for (let i = 1; i < P.length; i++) arc.push(arc[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
  const total = arc[arc.length - 1];
  const onForm = new Float32Array(flat.length);
  for (let i = 0; i < flat.length / 3; i++) {
    const x = flat[i * 3], z = flat[i * 3 + 2], rho = Math.hypot(x, z) / (S / 2) * total * 0.98, a = Math.atan2(x, z);
    let k = 0; while (k < arc.length - 2 && arc[k + 1] < rho) k++;
    const f = Math.min(1, (rho - arc[k]) / (arc[k + 1] - arc[k]));
    let r = P[k][0] + (P[k + 1][0] - P[k][0]) * f, y = P[k][1] + (P[k + 1][1] - P[k][1]) * f;
    if (rho > total) { r = P[P.length - 1][0] + 0.002; y = P[P.length - 1][1] - (rho - total); }
    onForm[i * 3] = Math.sin(a) * r * def.sx * 1.03; onForm[i * 3 + 1] = y + 0.003; onForm[i * 3 + 2] = Math.cos(a) * r * def.sz * 1.03;
  }
  return {
    mesh: m,
    set(t, lift = 0.25, time = 0) {
      const p = g.attributes.position.array;
      for (let i = 0; i < p.length / 3; i++) {
        const fx = flat[i * 3], fz = flat[i * 3 + 2], d = Math.hypot(fx, fz) / (S / 2);
        // drape: centre lands first, edges follow
        const u = Math.max(0, Math.min(1, t * 1.6 - d * 0.6));
        const e = u * u * (3 - 2 * u);
        const sag = (1 - e) * (lift - 0.09 * d * d) + (1 - e) * 0.012 * Math.sin(fx * 30 + time * 6) * d;
        p[i * 3] = fx + (onForm[i * 3] - fx) * e;
        p[i * 3 + 1] = (0.15 + sag) * (1 - e) + onForm[i * 3 + 1] * e;
        p[i * 3 + 2] = fz + (onForm[i * 3 + 2] - fz) * e;
      }
      g.attributes.position.needsUpdate = true; g.computeVertexNormals();
    },
  };
}
/** paint reveal on the Hard Boiled shell: uPaint sweeps an angle around the crown (0 → 1 = all painted) */
function addPaintMask(mat, canvasTex) {
  mat.userData.uPaint = { value: 1 }; mat.userData.uWet = { value: 0 };
  mat.map = canvasTex.map;
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uPaint = mat.userData.uPaint; sh.uniforms.uWet = mat.userData.uWet;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vLocal;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvLocal = position;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vLocal; uniform float uPaint, uWet;')
      .replace('#include <map_fragment>', `#include <map_fragment>
        float ang = fract(atan(vLocal.x, vLocal.z) / 6.2831853 + 0.5 - 0.11);
        float edge = uPaint * 1.15 - 0.075;
        float wob = 0.02 * sin(vLocal.y * 160.0) + 0.015 * sin(ang * 90.0);
        float painted = smoothstep(edge + 0.012, edge - 0.012, ang + wob);
        vec3 canvasCol = vec3(0.58, 0.46, 0.27) * (0.75 + 0.35 * texture2D(map, vMapUv).g);
        diffuseColor.rgb = mix(canvasCol, vec3(0.032, 0.027, 0.024), painted);
        float gPainted = painted;`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n roughnessFactor = mix(0.92, mix(0.5, 0.32, uWet), gPainted);')
      .replace('#include <lights_physical_fragment>', '#include <lights_physical_fragment>\n #ifdef USE_CLEARCOAT\n material.clearcoat = mix(0.0, 0.55, gPainted);\n #endif');
  };
  mat.color.set(0xffffff); mat.envMapIntensity = 0.45; mat.normalMap = canvasTex.normalMap; mat.normalScale.set(0.5, 0.5); mat.needsUpdate = true;
}
