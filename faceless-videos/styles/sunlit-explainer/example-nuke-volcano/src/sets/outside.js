// The volcano from outside (1 unit = 1 m): a 1 km stratovolcano with ridged gullies and a lava pool in the summit
// crater, lava channels that run down the flanks when it erupts, the ash column + glowing ejecta, a cloud layer
// for the fall from altitude, and the falling bomb.
import * as THREE from 'three';
import { makeSky } from '../core/sky.js';
import { rock, noise2 } from '../core/tex.js';
import { pbr, mesh } from '../props/kit.js';
import { lavaMaterial, particles, GLSL_NOISE, GLSL_LAVA } from './fx.js';
import { makeBomb } from '../props/bomb.js';

export const RIM = 150, PEAK = 1000;
const n = noise2(5), n2 = noise2(9);
const sst = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
export function heightAt(x, z) {
  const r = Math.hypot(x, z), th = Math.atan2(z, x);
  const top = (rr) => PEAK * Math.max(0, 1 - rr / 2700) ** 1.75 + 18 * Math.exp(-((rr / 2000) ** 2));
  const hr = top(RIM), floor = hr - 150;
  let h = r > RIM ? top(r) : floor + (hr - floor) * sst(0.3, 1, r / RIM) ** 1.4;
  h += 14 * Math.exp(-(((r - RIM) / 28) ** 2));
  const g = Math.abs(Math.sin(th * 13 + n.fbm(r * 0.003, th * 2, 3) * 4 + n2(r * 0.002, 3) * 2));
  h -= 30 * (1 - g) ** 2 * sst(RIM + 30, 420, r) * sst(3200, 900, r);
  h += (n.fbm(x * 0.004 + 50, z * 0.004 + 50, 5) - 0.5) * 60 * sst(200, 1500, r) + (n2.fbm(x * 0.012, z * 0.012, 3) - 0.5) * 7;
  return h;
}
export const CRATER_FLOOR = (() => PEAK * Math.max(0, 1 - RIM / 2700) ** 1.75 + 18 * Math.exp(-((RIM / 2000) ** 2)) - 150)();

export function buildOutside(renderer) {
  const scene = new THREE.Scene();
  const sky = makeSky(renderer, { az: 30, el: 36, top: 0x0a2c96, mid: 0x2e6ad8, haze: 0xc4dbf4, ground: 0x4a4038, sunCol: 0xfff0d8, sunI: 3.6, cloud: 0.5, glow: 0.7, groundBounce: 0.35 });
  scene.add(sky.dome, sky.sun, sky.sun.target); scene.environment = sky.env;
  scene.fog = new THREE.Fog(0xa8c2e6, 2600, 9500);
  scene.add(new THREE.HemisphereLight(0x8fb0e8, 0x4a3a30, 0.45));

  // terrain — dense around the summit, sparse to the horizon
  const tg = new THREE.PlaneGeometry(2, 2, 420, 420); tg.rotateX(-Math.PI / 2);
  const P = tg.attributes.position; const f = (u) => Math.sign(u) * (1700 * Math.abs(u) + 6300 * Math.abs(u) ** 3);
  const col = new Float32Array(P.count * 3), uv = tg.attributes.uv;
  for (let i = 0; i < P.count; i++) {
    const x = f(P.getX(i)), z = f(P.getZ(i)), h = heightAt(x, z);
    P.setXYZ(i, x, h, z); uv.setXY(i, x / 60, z / 60);
  }
  tg.computeVertexNormals();
  const N = tg.attributes.normal;
  for (let i = 0; i < P.count; i++) {
    const x = P.getX(i), y = P.getY(i), z = P.getZ(i), r = Math.hypot(x, z), slope = 1 - N.getY(i);
    const v = n.fbm(x * 0.002, z * 0.002, 3);
    let c = [0.12, 0.105, 0.1];                                                  // dark basalt / ash
    const mid = [0.2, 0.165, 0.135], low = [0.28, 0.27, 0.16], far = [0.24, 0.27, 0.15];
    const k1 = sst(500, 1300, r), k2 = sst(1500, 2600, r);
    c = c.map((a, j) => a + (mid[j] - a) * k1); c = c.map((a, j) => a + (low[j] - a) * k2 * (1 - slope * 1.5)); c = c.map((a, j) => a + (far[j] - a) * sst(3500, 6000, r));
    c = c.map((a) => a * (0.8 + 0.45 * v));
    col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2];
  }
  tg.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const rt = rock(17, { base: 0x9a9088 });
  const terrMat = pbr(rt, { repeat: [1, 1], rough: 0.97, ns: 1.5 }); terrMat.vertexColors = true;
  const TU = { uTime: { value: 0 }, uFlow: { value: 0 }, uHeat: { value: 0 } };
  terrMat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, TU);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWT;').replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWT = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
      varying vec3 vWT; uniform float uTime, uFlow, uHeat; ${GLSL_NOISE} ${GLSL_LAVA}`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      { float r = length(vWT.xz), th = atan(vWT.z, vWT.x);
        float ch = abs(sin(th * 7.0 + fbm(vec2(r * 0.004, th)) * 5.0 + 1.3));
        float chan = smoothstep(0.86, 0.985, ch) * smoothstep(${RIM.toFixed(1)} - 20.0, ${RIM.toFixed(1)} + 10.0, r);
        float front = ${RIM.toFixed(1)} - 60.0 + uFlow * 1160.0;
        float flow = chan * smoothstep(front + 40.0, front - 40.0, r);
        vec3 lv = lavaColor(vWT.xz * 0.03, uTime, 0.5, 1.0);
        totalEmissiveRadiance += lv * flow * 0.9;
        totalEmissiveRadiance += vec3(2.4, 0.5, 0.06) * uHeat * smoothstep(${(RIM + 90).toFixed(1)}, ${(RIM - 30).toFixed(1)}, r) * 0.6;
        diffuseColor.rgb *= 1.0 - flow * 0.9; }`);
  };
  terrMat.customProgramCacheKey = () => 'terrain';
  const terrain = mesh(tg, terrMat, { cast: true }); scene.add(terrain);

  // lava pool in the summit crater
  const pool = mesh(new THREE.CircleGeometry(RIM * 0.62, 96).rotateX(-Math.PI / 2), lavaMaterial({ scale: 0.05, crust: 0.6, bright: 1.1, swell: 0 }), { pos: [0, CRATER_FLOOR + 3, 0], cast: false, recv: false });
  scene.add(pool);
  const glowL = new THREE.PointLight(0xff5a14, 0, 900, 1.2); glowL.position.set(0, CRATER_FLOOR + 60, 0); scene.add(glowL);

  // cloud layer (for the fall from altitude) — static soft puffs around 1.9–2.2 km
  const clouds = particles({ count: 70, origin: [0, 2330, 0], spread: [1400, 60, 1400], dir: [1, 0, 0], cone: 0.1, speed: [0, 0.01], life: [999, 999], birth: [-500, -500],
    size: [340, 340], colA: 0xffffff, intA: 1.1, alpha: 0.6, lit: 0.5, seed: 61, order: 6, fadeIn: 0.0001 });
  // keep a clear hole straight below the fall line so the crater stays visible; a few puffs drift right past the lens
  const off = clouds.geometry.attributes.aOff;
  for (let i = 0; i < off.count; i++) { const x = off.getX(i), z = off.getZ(i), d = Math.hypot(x, z); if (d < 260) { const s = 260 / Math.max(d, 1); off.setXYZ(i, x * s + 40, off.getY(i), z * s); } }
  const nearC = particles({ count: 9, origin: [0, 2340, 0], spread: [40, 70, 40], dir: [1, 0, 0], cone: 0.1, speed: [0, 0.01], life: [999, 999], birth: [-500, -500],
    size: [55, 55], colA: 0xffffff, intA: 1.15, alpha: 0.8, lit: 0.4, seed: 63, order: 7, fadeIn: 0.0001 });
  const noff = nearC.geometry.attributes.aOff;
  for (let i = 0; i < noff.count; i++) { const a = i * 2.4; noff.setXYZ(i, Math.cos(a) * (34 + i * 4), (i - 4) * 14, Math.sin(a) * (34 + i * 4)); }
  scene.add(clouds); nearC.visible = false;

  // eruption: ash column, glowing ejecta, vent fountain
  const vent = [0, CRATER_FLOOR + 20, 0];
  const T0 = 26.05;
  const ash = particles({ count: 2200, origin: vent, spread: [45, 10, 45], dir: [0, 1, 0], cone: 0.2, speed: [150, 320], drag: 0.3, rise: 55, turb: 20, life: [7, 11],
    birth: [T0, T0 + 6.5], size: [45, 230], colA: 0x3a3532, colB: 0x6f6862, alpha: 0.96, lit: 0.9, glow: 0xff4a10, glowK: 2.2, glowH: 160, seed: 71, spreadRate: 0.45, order: 6 });
  const ash2 = particles({ count: 600, origin: vent, spread: [70, 5, 70], dir: [0, 1, 0], cone: 1.3, speed: [60, 140], drag: 0.6, rise: 8, gravity: -2, turb: 10, life: [5, 8],
    birth: [T0 + 0.1, T0 + 6.5], size: [55, 200], colA: 0x35302d, colB: 0x5e5853, alpha: 0.92, lit: 0.85, glow: 0xff4a10, glowK: 1.6, glowH: 120, seed: 73, spreadRate: 0.4, order: 6 });
  const ejecta = particles({ count: 520, origin: vent, spread: [30, 5, 30], dir: [0, 1, 0], cone: 0.75, speed: [90, 230], gravity: -70, drag: 0.05, life: [3.5, 6],
    birth: [T0, T0 + 6], size: [5, 3], colA: 0xffc060, colB: 0xff3a08, intA: 16, intB: 5, additive: true, soft: 0, seed: 77, stretch: 0.012, order: 8 });
  const fountain = particles({ count: 140, origin: vent, spread: [40, 4, 40], dir: [0, 1, 0], cone: 0.35, speed: [40, 120], gravity: -50, life: [0.8, 1.6],
    birth: [T0, T0 + 6.5], size: [40, 70], colA: 0xffb050, colB: 0xff4010, intA: 6, intB: 2, additive: true, soft: 1, seed: 79, order: 8 });
  const flash = particles({ count: 6, origin: [0, CRATER_FLOOR + 60, 0], spread: [10, 10, 10], dir: [0, 1, 0], cone: 0.2, speed: [0, 1], life: [0.9, 1.3],
    birth: [T0 - 0.05, T0 + 0.05], size: [260, 520], colA: 0xffe6b0, colB: 0xff8030, intA: 10, intB: 2, additive: true, soft: 1, seed: 81, fadeIn: 0.05, order: 9 });
  scene.add(ash, ash2, ejecta, fountain, flash);

  const bomb = makeBomb(); scene.add(bomb.group);

  const fx = { clouds, nearC, ash, ash2, ejecta, fountain, flash };
  const set = {
    name: 'outside', scene, sky, terrain, pool, bomb, fx, TU, glowL, T0, vent,
    reset() { bomb.reset(); bomb.group.visible = false; TU.uFlow.value = 0; TU.uHeat.value = 0; glowL.intensity = 0; for (const k of Object.values(fx)) k.userData.U.uMaster.value = 1; },
    update(t, lt, r) {
      TU.uTime.value = t; pool.material.uniforms.uTime.value = t;
      for (const k of Object.values(fx)) k.update(t);
      if (r?.cam) sky.dome.position.set(...r.cam.pos);
    },
  };
  return set;
}
