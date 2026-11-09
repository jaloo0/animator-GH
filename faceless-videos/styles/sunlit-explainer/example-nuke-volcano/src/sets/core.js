// The bomb's heart as a diagram: a sphere of explosive blocks (wedge cut away) around a metal core, each block
// with a detonator cap. Two behaviours: blocks catching fire one by one (uneven), and all firing at once (implosion).
import * as THREE from 'three';
import { mesh } from '../props/kit.js';
import { wedge, makeBomb } from '../props/bomb.js';
import { particles, mulberry } from './fx.js';

export function buildCore(renderer) {
  const scene = new THREE.Scene();
  // backdrop: deep blue-grey above → warm ember glow below (never black)
  const bgMat = new THREE.ShaderMaterial({
    uniforms: { uHot: { value: 0 } }, side: THREE.BackSide, depthWrite: false,
    vertexShader: /* glsl */`varying vec3 vD; void main(){ vD = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }`,
    fragmentShader: /* glsl */`uniform float uHot; varying vec3 vD;
      void main(){ float y = vD.y; vec3 top = vec3(0.012, 0.02, 0.05), mid = vec3(0.03, 0.03, 0.045), bot = vec3(0.32, 0.06, 0.012);
        vec3 c = mix(mid, top, smoothstep(0.0, 0.8, y)); c = mix(c, bot, smoothstep(0.05, -0.8, y));
        c += vec3(0.9, 0.35, 0.08) * uHot * smoothstep(0.4, -0.6, y);
        gl_FragColor = vec4(c, 1.0); }`,
  });
  const bg = new THREE.Mesh(new THREE.SphereGeometry(50, 48, 24), bgMat); bg.renderOrder = -10; scene.add(bg);
  const pm = new THREE.PMREMGenerator(renderer); const envScene = new THREE.Scene();
  const eb = new THREE.Mesh(new THREE.SphereGeometry(20, 32, 16), bgMat.clone()); envScene.add(eb);
  const strip = new THREE.Mesh(new THREE.PlaneGeometry(14, 3), new THREE.MeshBasicMaterial({ color: 0x8aa0c8, side: THREE.DoubleSide })); strip.position.set(-6, 8, 4); strip.lookAt(0, 0, 0); envScene.add(strip);
  scene.environment = pm.fromScene(envScene, 0.04).texture; pm.dispose();

  const key = new THREE.DirectionalLight(0xdfe8ff, 2.6); key.position.set(-3, 5, 4); key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -2, right: 2, top: 2, bottom: -2, near: 0.5, far: 20 }); key.shadow.bias = -0.0004; key.shadow.normalBias = 0.01;
  const rim = new THREE.DirectionalLight(0xff7a30, 2.4); rim.position.set(2, -2, -4);
  const fill = new THREE.HemisphereLight(0x5a6a90, 0x5a1a08, 0.6);
  const hot = new THREE.PointLight(0xffa050, 0, 12, 1.5); hot.position.set(0.4, 0.3, 0.6);
  scene.add(key, rim, fill, hot);
  // a fake “light” for the dummy sky API main.js expects
  const sky = { frame() {}, dome: bg };

  const group = new THREE.Group(); scene.add(group);
  const ico = new THREE.IcosahedronGeometry(1, 1); const pos = ico.attributes.position;
  const blocks = []; const R = mulberry(5);
  const capMat = new THREE.MeshStandardMaterial({ color: 0x2a2c2e, metalness: 0.7, roughness: 0.35, emissive: 0x000000 });
  for (let f = 0; f < pos.count; f += 3) {
    const a = new THREE.Vector3().fromBufferAttribute(pos, f), b = new THREE.Vector3().fromBufferAttribute(pos, f + 1), c = new THREE.Vector3().fromBufferAttribute(pos, f + 2);
    const cen = a.clone().add(b).add(c).divideScalar(3);
    if (cen.x > 0.12 && cen.z > 0.12) continue; // cut-away wedge facing the camera
    const mat = new THREE.MeshStandardMaterial({ color: 0xc89a58, roughness: 0.62, metalness: 0.0, emissive: 0x000000 });
    const m = mesh(wedge(a, b, c, 0.5, 0.93), mat, { parent: group });
    const dir = cen.clone().normalize();
    const cap = mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.07, 12), capMat.clone(), { parent: group });
    cap.position.copy(dir.clone().multiplyScalar(cen.length() * 0.995 + 0.03)); cap.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    m.userData = { dir, cen, ign: R() < 0.55 ? 11.55 + R() * 2.0 : 99, ph: R() * 10 };
    cap.userData.base = cap.position.clone();
    blocks.push({ m, cap });
  }
  // cut faces of the wedge opening: show the inner layer as a ring + the core
  const core = mesh(new THREE.SphereGeometry(0.44, 48, 32), new THREE.MeshStandardMaterial({ color: 0x8f9396, metalness: 0.92, roughness: 0.3, emissive: 0x000000 }), { parent: group });
  const tamper = mesh(new THREE.SphereGeometry(0.485, 48, 32, 0, Math.PI * 1.5), new THREE.MeshStandardMaterial({ color: 0x5c4a3a, metalness: 0.3, roughness: 0.55, side: THREE.DoubleSide }), { parent: group, rot: [0, Math.PI / 2 + Math.PI / 4 - Math.PI / 4, 0] });
  tamper.rotation.y = 0; // gap faces +x+z (theta 0..1.5π leaves the last quarter open)

  // flames over the blocks that burn (uneven): particles born at random burning blocks after they ignite
  const burning = blocks.filter((b) => b.m.userData.ign < 50);
  const flames = particles({ count: 520, origin: [0, 0, 0], spread: [0, 0, 0], dir: [0, 1, 0], cone: 0.5, speed: [0.15, 0.5], rise: 0.6, turb: 0.06, drag: 1.5, life: [0.35, 0.8],
    birth: [0, 0], size: [0.08, 0.02], colA: 0xffd080, colB: 0xff4a10, intA: 7, intB: 2, additive: true, soft: 1, seed: 91, order: 9 });
  {
    const a0 = flames.geometry.attributes.a0, off = flames.geometry.attributes.aOff; const RR = mulberry(17);
    for (let i = 0; i < a0.count; i++) {
      const b = burning[Math.floor(RR() * burning.length)], ign = b.m.userData.ign;
      a0.setX(i, ign + RR() * (13.9 - ign)); const p = b.m.userData.cen.clone().multiplyScalar(1.02);
      off.setXYZ(i, p.x + (RR() - 0.5) * 0.12, p.y + (RR() - 0.5) * 0.12, p.z + (RR() - 0.5) * 0.12);
    }
    a0.needsUpdate = true; off.needsUpdate = true;
  }
  const smoke = particles({ count: 120, origin: [0, 0.3, 0], spread: [0.7, 0.4, 0.7], dir: [0, 1, 0], cone: 0.4, speed: [0.1, 0.3], rise: 0.35, turb: 0.1, life: [1.5, 2.5],
    birth: [11.9, 13.9], size: [0.15, 0.6], colA: 0x5a5250, colB: 0x3c3836, alpha: 0.4, seed: 93, glow: 0xff6a20, glowK: 0.6 });
  // the implosion flash
  const burst = particles({ count: 10, origin: [0, 0, 0], spread: [0.05, 0.05, 0.05], dir: [0, 1, 0], cone: 1, speed: [0, 0.01], life: [0.4, 0.55],
    birth: [15.62, 15.66], size: [0.4, 3.2], colA: 0xffffff, colB: 0xffc080, intA: 14, intB: 3, additive: true, soft: 1, seed: 95, fadeIn: 0.04, order: 10 });
  scene.add(flames, smoke, burst);

  // the whole bomb, upright, for the X-ray beat (wiring fries) — sparks follow the electronics bay
  const bomb = makeBomb(); bomb.group.rotation.z = Math.PI / 2; scene.add(bomb.group);
  const sparks = particles({ count: 260, origin: [0, 0, 0], spread: [0.1, 0.12, 0.1], dir: [0, 1, 0], cone: 1.3, speed: [0.4, 1.5], gravity: -2.5, life: [0.15, 0.45],
    birth: [10.62, 11.6], size: [0.016, 0.005], colA: 0xfff0b0, colB: 0xff8a20, intA: 14, intB: 4, additive: true, soft: 0, seed: 21, stretch: 0.08, order: 9 });
  scene.add(sparks);

  const set = {
    name: 'core', scene, sky, group, blocks, core, bgMat, hot, key, rim, bomb, sparks, flames, smoke, burst,
    reset() {
      for (const { m, cap } of blocks) { m.material.emissive.setRGB(0, 0, 0); m.material.color.setHex(0xc89a58); m.position.set(0, 0, 0); cap.position.copy(cap.userData.base); cap.material.emissive.setRGB(0, 0, 0); }
      core.scale.setScalar(1); core.material.emissive.setRGB(0, 0, 0); bgMat.uniforms.uHot.value = 0; hot.intensity = 0;
      flames.userData.U.uMaster.value = 1; smoke.userData.U.uMaster.value = 1; burst.userData.U.uMaster.value = 1;
      bomb.reset(); bomb.group.visible = false; group.visible = true; sparks.visible = false;
    },
    /** uneven burn: blocks ignite at their own times (film time t) */
    burn(t) {
      t -= set.burnShift || 0;
      let lit = 0;
      for (const { m } of blocks) {
        const k = Math.max(0, Math.min(1, (t - m.userData.ign) / 0.35)); if (k <= 0) continue;
        const fl = 0.75 + 0.25 * Math.sin(t * 23 + m.userData.ph) * Math.sin(t * 9.1 + m.userData.ph * 2);
        m.material.emissive.setRGB(2.4 * k * fl, 0.55 * k * fl, 0.06 * k * fl); m.material.color.setRGB(0.25 + 0.4 * (1 - k), 0.17 + 0.25 * (1 - k), 0.1 + 0.2 * (1 - k)); lit += k;
      }
      hot.intensity = lit * 0.35; bgMat.uniforms.uHot.value = Math.min(1, lit / 25) * 0.6;
    },
    /** perfect implosion: caps blink in sync, all blocks fire at tf, squeeze inward, core compresses and flashes */
    implode(t, tf) {
      const blink = t < tf ? (Math.sin((t - tf) * Math.PI * 2 * 2.2) > 0.6 ? 1 : 0) * Math.min(1, Math.max(0, (t - (tf - 1.2)) / 0.3)) : 0;
      const k = Math.max(0, Math.min(1, (t - tf) / 0.12)), sq = Math.max(0, Math.min(1, (t - tf) / 0.3));
      const fade = 1 - Math.max(0, Math.min(1, (t - tf - 0.4) / 0.5));
      for (const { m, cap } of blocks) {
        cap.material.emissive.setRGB(blink * 2.5 + k * 6, blink * 0.4 + k * 5, blink * 0.1 + k * 4);
        m.material.emissive.setRGB(k * 9 * fade + k * 0.6, k * 7 * fade + k * 0.25, k * 5 * fade + k * 0.06);
        m.position.copy(m.userData.dir).multiplyScalar(-0.12 * sq);
        cap.position.copy(cap.userData.base).addScaledVector(m.userData.dir, -0.12 * sq);
      }
      core.scale.setScalar(1 - 0.28 * sq);
      const ch = Math.max(0, Math.min(1, (t - tf - 0.15) / 0.2));
      core.material.emissive.setRGB(12 * ch, 9 * ch, 6 * ch);
      hot.intensity = k * 40 * fade + ch * 30;
    },
    update(t) { flames.update(t); smoke.update(t); burst.update(t); sparks.update(t); },
  };
  return set;
}
