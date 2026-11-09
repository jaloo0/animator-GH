// WHAT IF YOU NUKED A VOLCANO? — 15 shots on the narration's word times (9:16). Every setup is a pure function of t.
import * as THREE from 'three';
import { wt } from './core/timing.js';
import { E, seg, kf, clamp, lerp } from './core/util.js';
import { ISLAND } from './sets/crater.js';
import { heightAt, CRATER_FLOOR } from './sets/outside.js';
import { SX, SURF, SHAFT_BOTTOM } from './sets/section.js';

const D2R = Math.PI / 180;
const BRIGHT = { exposure: 1.05, warm: 0.15, sat: 1.22, vignette: 0.26, grain: 0.012, bloom: 0.16, bloomRadius: 0.3, bloomThreshold: 1.4 };
const L = (o = {}) => ({ ...BRIGHT, ...o });
const damp = (t, f = 2.2, k = 3.2) => (t < 0 ? 0 : Math.exp(-k * t) * Math.cos(t * f * Math.PI * 2));

export function buildShots(T, W) {
  const shots = [];
  const add = (s) => shots.push(s);

  // ---- cut times (picture changes just before its word)
  const tA2 = wt('it', wt('volcano')) - 0.1, tB1 = wt('lava') - 0.12, tB2 = wt('so', wt('water')) - 0.1, tC1 = wt('at', wt('float')) - 0.1, tC2 = wt('its', wt('degrees')) - 0.1;
  const tC3 = wt('its', wt('fries')) - 0.06, tD1 = wt('and', wt('unevenly')) - 0.1, tE1 = wt('so', wt('once')) - 0.12, tE2 = wt('just') - 0.1, tF1 = wt('but') - 0.1;
  const tF2 = wt('the', wt('and', wt('chamber'))) - 0.06, tG1 = wt('if', wt('above')) - 0.1, tG2 = wt("it's", wt('power')) - 0.12;
  const tImpact = wt('even') - 0.05, tFire = wt('fire'), tBlast = wt('blast'), tErupt = wt('erupts') - 0.19, tPop = wt('mushroom') + 0.02;
  // effects were authored on the first narration's clock — slide each to its word on this one
  const shift = (fx, base, now) => { if (fx) fx.userData.shift = now - base; };
  const CR = W.sets.crater?.fx, CO = W.sets.core, OU = W.sets.outside?.fx, SE = W.sets.section;
  if (CR) { shift(CR.splash, 2.95, tImpact); shift(CR.splashSmoke, 2.95, tImpact); for (const k of ['puff', 'pop', 'dust', 'haze']) shift(CR[k], 17.12, tPop); }
  if (CO) { shift(CO.sparks, 10.72, wt('fries')); shift(CO.flames, 11.40, tC3); shift(CO.smoke, 11.40, tC3); shift(CO.burst, 15.30, tFire); CO.burnShift = tC3 - 11.40; }
  if (OU) for (const k of ['ash', 'ash2', 'ejecta', 'fountain', 'flash']) shift(OU[k], 26.05, tErupt);
  if (SE) shift(SE.dust, 20.32, tF1);

  // ===== A1 — the drop: riding above the falling bomb, the crater far below
  add({ id: 'A1', set: 'outside', start: 0, note: 'falling bomb above the crater (top-down chase)',
    setup(W, lt, t) {
      const S = W.sets.outside, b = S.bomb; b.group.visible = true; S.fx.clouds.visible = S.fx.nearC.visible = true;
      const by = 2620 - 290 * t - 25 * t * t, bx = 0, bz = 0;
      b.group.position.set(bx + Math.sin(t * 2.1) * 0.12, by, bz + Math.cos(t * 1.7) * 0.12);
      const nose = new THREE.Vector3(0.08 * Math.sin(t * 2.3), -1, 0.62 + 0.05 * Math.sin(t * 3.1)).normalize();
      b.group.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), nose).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), t * 0.6));
      const back = 1 + 7 * seg(t, 1.55, 2.5, E.in);
      const cam = [bx + 0.6, by + 6.5 * back, bz + 4.2 * back];
      const look = [bx, by - 40, bz - 14];
      return { cam: { pos: cam, look, fov: 56, far: 12000, near: 0.3, shake: 0.35 }, look: L({ focus: 7.5 * back, aper: 0.0 }), mb: 3, shutter: 0.5, shadowAt: [bx, by, bz], shadowSize: 4 };
    } });

  // ===== A2 — it hits the lava lake and pops back up
  add({ id: 'A2', set: 'crater', start: tA2, note: 'splash — it does not sink',
    setup(W, lt, t) {
      const S = W.sets.crater, b = S.bomb;
      S.lava.uniforms.uImpact.value.set(0.9, 0, tImpact, 0.22);
      let y, rz;
      if (t < tImpact) { const u = clamp((t - tA2) / (tImpact - tA2)); y = 1.8 + 13 * (1 - u) ** 1.4; rz = -80 * D2R; }
      else {
        const u = t - tImpact;
        const dip = 1.8 - 1.25 * Math.sin(clamp(u / 0.5) * Math.PI * 0.5) * (1 - seg(u, 0.35, 0.9, E.io));
        y = lerp(dip, -0.07, seg(u, 0.35, 0.95, E.io)) + 0.08 * damp(u - 0.95, 1.1, 2.6) * (u > 0.95 ? 1 : 0);
        rz = lerp(-80 * D2R, 0, seg(u, 0.18, 0.95, E.out)) + 5 * D2R * damp(u - 0.95, 0.9, 2.8) * (u > 0.95 ? 1 : 0);
      }
      b.group.position.set(0.9, y, 0); b.group.rotation.set(0.3, 0.25, rz);
      const shake = 0.15 + 1.4 * Math.exp(-Math.max(0, t - tImpact) * 5) * (t > tImpact ? 1 : 0);
      const pz = lerp(5.6, 4.6, seg(t, tA2, tB1, E.io));
      return { cam: { pos: [3.4, 0.75, pz], look: [0.6, 0.9 - 0.4 * seg(t, tImpact, tImpact + 0.8), 0], fov: 44, shake }, look: L({ focus: Math.hypot(3.4, pz), aper: 0.012 }), shadowAt: [0.9, 0, 0], shadowSize: 3 };
    } });

  // ===== B1 — density: one lava cube balances three water cubes
  add({ id: 'B1', set: 'crater', start: tB1, note: 'balance: 1 lava cube = 3 water cubes',
    setup(W, lt, t) {
      const S = W.sets.crater, bal = S.balance; bal.lavaCubeMat.uniforms.uTime.value = t;
      S.bomb.group.visible = false;
      const lands = [wt('almost') + 0.06, wt('three') + 0.04, wt('times') + 0.02];
      let ang = 0.3, prev = 0.3;
      lands.forEach((tl, k) => {
        const w = bal.waters[k]; w.visible = t > tl - 0.28;
        const fall = clamp((t - (tl - 0.28)) / 0.28);
        w.position.y = -1.3 + 0.025 + 0.21 + k * 0.425 + (1 - fall * fall) * 1.6;
        w.rotation.y = k * 0.3;
      });
      // beam: tipped to the lava side, settles a step with each landing
      const targets = [0.3, 0.2, 0.1, 0.0];
      let tilt = targets[0];
      lands.forEach((tl, k) => { if (t >= tl) tilt = targets[k + 1] + (targets[k] - targets[k + 1]) * damp(t - tl, 1.6, 3.4); });
      bal.tilt(tilt);
      const I = ISLAND, push = seg(t, tB1, tB2, E.io);
      return { cam: { pos: [I.x + 0.7 - 0.3 * push, I.y + 2.2, I.z + 7.6 - 1.0 * push], look: [I.x + 0.1, I.y + 1.45, I.z], fov: 47, shake: 0.12 }, look: L({ focus: 7.2, aper: 0.004, exposure: 0.95 }), shadowAt: [I.x, 2, I.z], shadowSize: 4 };
    } });

  // ===== B2 — so it floats
  add({ id: 'B2', set: 'crater', start: tB2, note: 'floating, a third above the surface',
    setup(W, lt, t) {
      const S = W.sets.crater, b = S.bomb;
      b.group.position.set(0, -0.06 + 0.03 * Math.sin(t * 1.7), 0); b.group.rotation.set(0.05 * Math.sin(t * 1.2), 0.2, 0.025 * Math.sin(t * 1.4));
      const u = seg(t, tB2, tC1, E.io);
      return { cam: { pos: [lerp(-1.6, 0.4, u), 0.42, lerp(3.4, 2.9, u)], look: [lerp(-0.4, 0.3, u), 0.02, 0], fov: 38, shake: 0.1 }, look: L({ focus: 3.2, aper: 0.024 }), shadowAt: [0, 0, 0], shadowSize: 2.5 };
    } });

  // ===== C1 — the heat gauge swings into the red; paint starts to scorch
  add({ id: 'C1', set: 'crater', start: tC1, note: 'pyrometer → 1,100 °C, casing scorching',
    setup(W, lt, t) {
      const S = W.sets.crater, b = S.bomb; S.gauge.visible = true;
      b.group.position.set(0, -0.06 + 0.03 * Math.sin(t * 1.7), 0); b.group.rotation.set(0, 0.2, 0);
      b.setChar(0.15 + 0.4 * seg(t, tC1, tC2));
      const v = kf(t, [[tC1, 280], [wt('degrees') + 0.1, 1100, E.out], [tC2, 1100]]) + 14 * Math.sin(t * 31) * seg(t, wt('degrees'), tC2);
      S.needle.rotation.z = -(-135 + v / 1200 * 270) * D2R;
      const g = S.gauge; g.updateMatrixWorld();
      const dial = new THREE.Vector3(0, 0.55, 0.03).applyMatrix4(g.matrixWorld);
      const camL = new THREE.Vector3(0.1 - 0.06 * seg(t, tC1, tC2), 0.62, 0.62 - 0.12 * seg(t, tC1, tC2, E.io)).applyMatrix4(g.matrixWorld);
      return { cam: { pos: camL.toArray(), look: [dial.x - 0.02, dial.y - 0.02, dial.z], fov: 36, shake: 0.1 }, look: L({ focus: camL.distanceTo(dial), aper: 0.03, maxBlur: 30 }), shadowAt: dial.toArray(), shadowSize: 1.5 };
    } });

  // ===== C2 — X-ray: the wiring fries
  add({ id: 'C2', set: 'core', start: tC2, note: 'X-ray: the wiring fries',
    setup(W, lt, t) {
      const S = W.sets.core, b = S.bomb; S.group.visible = false; b.group.visible = true; S.sparks.visible = true;
      b.setChar(0.5); b.setXray(seg(t, tC2 + 0.05, tC2 + 0.35, E.io));
      const fry = seg(t, wt('fries') - 0.12, wt('fries') + 0.08);
      const fl = 0.6 + 0.4 * Math.sin(t * 47) * Math.sin(t * 13.3);
      b.wires.forEach((w, k) => w.material.emissive.setRGB(2.4 * fry * fl * (0.5 + 0.5 * Math.sin(t * 20 + k)), 0.55 * fry * fl, 0.05 * fry));
      b.pcbMat.emissive.setRGB(0.9 * fry * fl, 0.32 * fry * fl, 0.05 * fry);
      b.group.updateMatrixWorld();
      const bay = b.inside.localToWorld(new THREE.Vector3(-0.62, 0.08, 0));
      S.sparks.userData.U.uOrigin.value.copy(bay);
      S.hot.position.copy(bay).add(new THREE.Vector3(0.3, 0.1, 0.5)); S.hot.intensity = 6 * fry * fl;
      const u = seg(t, tC2, wt('fries') + 0.1, E.io);
      const look = [lerp(0, bay.x, u), lerp(-0.45, bay.y + 0.05, u), 0];
      const d = lerp(4.6, 1.5, u);
      return { cam: { pos: [look[0] + d * 0.42, look[1] + 0.25 + 0.2 * d, d], look, fov: 40, shake: 0.12 + 0.3 * fry }, look: L({ focus: Math.hypot(d, 0.42 * d), aper: 0.008, exposure: 1.05, warm: 0.0, vignette: 0.42 }) };
    } });

  // ===== C3 — the explosives catch fire one by one (uneven)
  add({ id: 'C3', set: 'core', start: tC3, note: 'explosive blocks ignite unevenly',
    setup(W, lt, t) {
      const S = W.sets.core; S.burn(t);
      const th = lerp(0.62, 0.98, seg(t, tC3, tD1, E.io)), d = lerp(6.6, 5.6, seg(t, tC3, tD1, E.io));
      S.group.rotation.y = 0;
      return { cam: { pos: [Math.cos(th) * d, 1.3, Math.sin(th) * d], look: [0, -0.05, 0], fov: 40, shake: 0.15 }, look: L({ focus: d, aper: 0.006, exposure: 1.05, warm: 0.3, vignette: 0.4 }) };
    } });

  // ===== D1 — what it needs: every block at the same instant (implosion)
  add({ id: 'D1', set: 'core', start: tD1, note: 'all fire at once → implosion',
    setup(W, lt, t) {
      const S = W.sets.core; S.implode(t, tFire);
      S.key.color.setHex(0xd6e4ff);
      const u = seg(t, tD1, tE1, E.io), th = lerp(0.95, 0.62, u), d = lerp(6.4, 4.6, u);
      const shake = 0.1 + 2.0 * Math.exp(-Math.max(0, t - tFire) * 6) * (t > tFire ? 1 : 0);
      return { cam: { pos: [Math.cos(th) * d, 0.6, Math.sin(th) * d], look: [0, 0, 0], fov: 40, shake }, look: L({ focus: d, aper: 0.006, exposure: 1.05, warm: 0.0, vignette: 0.42 }) };
    } });

  // ===== E1 — so: no mushroom cloud (a sad pop and a puff)
  add({ id: 'E1', set: 'crater', start: tE1, note: 'no mushroom cloud — a pop and a puff',
    setup(W, lt, t) {
      const S = W.sets.crater, b = S.bomb; b.setChar(0.8);
      b.group.position.set(0, -0.06 + 0.03 * Math.sin(t * 1.7), 0); b.group.rotation.set(0, 0.2, 0);
      const pop = seg(t, tPop, tPop + 0.18, E.outExpo);
      b.nose.position.x = 0.06 * pop; b.nose.rotation.z = -4 * D2R * pop; b.nose.rotation.y = 3 * D2R * pop;
      const up = seg(t, tE1, wt('cloud') + 0.2, E.io);
      return { cam: { pos: [2.3, 0.38, 3.3], look: [0.4, lerp(0.9, 2.0, up), 0], fov: 56, shake: 0.12 + 0.6 * Math.exp(-Math.max(0, t - tPop) * 7) * (t > tPop ? 1 : 0) }, look: L({ focus: 4.0, aper: 0.006 }), shadowAt: [0, 0, 0], shadowSize: 3 };
    } });

  // ===== E2 — just a radioactive mess
  add({ id: 'E2', set: 'crater', start: tE2, note: 'cracked open, fallout dust drifting',
    setup(W, lt, t) {
      const S = W.sets.crater, b = S.bomb; b.setChar(0.85);
      b.group.position.set(0, -0.06 + 0.03 * Math.sin(t * 1.7), 0); b.group.rotation.set(0, 0.2, 0);
      b.nose.position.set(0.32, 0.02, 0.06); b.nose.rotation.set(0.1, 0.12, -0.14);
      const u = seg(t, tE2, tF1, E.io);
      return { cam: { pos: [lerp(1.75, 1.45, u), lerp(0.62, 0.5, u), lerp(1.9, 1.55, u)], look: [0.62, 0.22, 0.05], fov: 40, shake: 0.12 }, look: L({ focus: 1.6, aper: 0.01, exposure: 0.9 }), shadowAt: [0.5, 0, 0], shadowSize: 1.6 };
    } });

  // ===== F1 — lower it miles down (cross-section, mile marks)
  add({ id: 'F1', set: 'section', start: tF1, note: 'cross-section: lowered down the shaft',
    setup(W, lt, t) {
      const S = W.sets.section;
      const by = kf(t, [[tF1, SURF + 0.05], [tF1 + 0.4, SURF + 0.05], [tF2 - 0.3, SHAFT_BOTTOM - 0.38, E.io]]);
      S.lower(by);
      const wide = { pos: [1.4, -0.6, 31], look: [1.2, -1.2, 0] };
      const fol = { pos: [SX + 1.0, by + 0.8, 5.0], look: [SX + 0.6, by - 0.45, 0] };
      const k = seg(t, tF1 + 0.55, tF1 + 1.7, E.io);
      const pos = wide.pos.map((v, i) => lerp(v, fol.pos[i], k)), look = wide.look.map((v, i) => lerp(v, fol.look[i], k));
      return { cam: { pos, look, fov: 42, shake: 0.12 }, look: L({ focus: lerp(31, 5.1, k), aper: 0.004 }), shadowAt: [SX, by, 0], shadowSize: 6 };
    } });

  // ===== F2 — the blast cracks the rock above
  add({ id: 'F2', set: 'section', start: tF2, note: 'blast in the chamber, cracks climb to the summit',
    setup(W, lt, t) {
      const S = W.sets.section;
      S.lower(SHAFT_BOTTOM - 0.38);
      const on = t >= tBlast;
      S.bomb.group.visible = !on; S.cable.visible = !on;
      const r = seg(t, tBlast, tBlast + 0.22, E.outExpo);
      S.FU.uBlastR.value = 1.5 * r; S.FU.uBlast.value = on ? lerp(1, 0.32, seg(t, tBlast + 0.25, tBlast + 1.2)) : 0;
      S.FU.uCrack.value = seg(t, wt('crack', 23) - 0.05, wt('above', 24) + 0.45, E.out);
      S.flashL.intensity = on ? 900 * Math.exp(-(t - tBlast) * 3.5) : 0;
      const shake = 0.12 + 2.2 * Math.exp(-Math.max(0, t - tBlast) * 4) * (on ? 1 : 0);
      const u = seg(t, tF2, tG1, E.io);
      const flash = on ? 1 + 1.4 * Math.exp(-(t - tBlast) * 7) : 1;
      return { cam: { pos: [lerp(1.6, 1.2, u), lerp(-1.6, -0.8, u), lerp(26.5, 29.5, u)], look: [1.0, lerp(-1.4, -0.6, u), 0], fov: 42, shake }, look: L({ focus: 27, aper: 0.003, exposure: 1.15 * flash }), shadowAt: [0, 0, 0], shadowSize: 14 };
    } });

  // ===== G1 — if it erupts: from the flank, the summit blows
  add({ id: 'G1', set: 'outside', start: tG1, note: 'eruption from the flank',
    setup(W, lt, t) {
      const S = W.sets.outside; S.fx.clouds.visible = S.fx.nearC.visible = false;
      S.TU.uHeat.value = seg(t, tErupt - 0.3, tErupt + 0.6); S.TU.uFlow.value = 0.42 * seg(t, tErupt, tErupt + 4.5, E.out);
      S.glowL.intensity = 4e5 * seg(t, tErupt - 0.2, tErupt + 0.3);
      const cx = 1500, cz = 640, cy = heightAt(cx, cz) + 120;
      const u = seg(t, tG1, tG2, E.io);
      const shake = 0.2 + 1.8 * Math.exp(-Math.max(0, t - tErupt) * 2.2) * (t > tErupt ? 1 : 0);
      const flash = t > tErupt ? 1 + 0.5 * Math.exp(-(t - tErupt) * 4) : 1;
      return { cam: { pos: [cx - 60 * u, cy + 10 * u, cz - 20 * u], look: [0, lerp(980, 1150, u), 0], fov: 46, far: 12000, near: 1, shake }, look: L({ focus: 900, aper: 0.0, exposure: 1.12 * flash }), shadowAt: [200, 700, 100], shadowSize: 700 };
    } });

  // ===== G2 — it's the volcano's: wide, the column towers over the land
  add({ id: 'G2', set: 'outside', start: tG2, note: 'wide: the ash column, lava running down',
    setup(W, lt, t) {
      const S = W.sets.outside; S.fx.clouds.visible = S.fx.nearC.visible = false;
      S.TU.uHeat.value = 1; S.TU.uFlow.value = 0.42 + 0.35 * seg(t, tG2, T.dur, E.out); S.glowL.intensity = 4e5;
      const u = seg(t, tG2, T.dur, E.io);
      const fade = 1 - seg(t, T.dur - 0.55, T.dur);
      return { cam: { pos: [lerp(2500, 3300, u), lerp(620, 760, u), lerp(2000, 2700, u)], look: [0, lerp(1150, 1250, u), 0], fov: 44, far: 14000, near: 2, shake: 0.18 }, look: L({ focus: 3000, aper: 0.0, fade }), shadowAt: [0, 600, 0], shadowSize: 1400 };
    } });

  // ---- sound cues (tools/mix.py)
  const C = (t, type, o = {}) => cues.push({ t, type, ...o });
  const cues = [];
  C(0, 'wind', { dur: tA2 + 0.1, g: 0.9 });
  C(1.6, 'whoosh', { dur: 1.0, f0: 300, f1: 1400, g: 0.5 });
  C(tA2, 'lava', { dur: tC3 - tA2, g: 0.55 });
  C(tImpact, 'splash', { g: 0.9 });
  wt('almost') && [wt('almost') + 0.06, wt('three') + 0.04, wt('times') + 0.02].forEach((x, k) => C(x, 'clunk', { g: 0.55 + 0.1 * k }));
  C(tC1 + 0.1, 'creak', { dur: 0.9, g: 0.45 });
  C(wt('fries') - 0.1, 'crackle', { dur: 0.95, g: 0.7 });
  C(tC3, 'fire', { dur: tD1 - tC3, g: 0.6 });
  C(tFire + 0.3, 'boom', { g: 0.8, size: 0.5 });
  C(tE1, 'lava', { dur: tF1 - tE1, g: 0.5 });
  C(tPop, 'pop', { g: 0.8 });
  C(tPop + 0.18, 'fizz', { dur: 3.2, g: 0.35 });
  C(tErupt, 'music_sync', {});
  C(tF1, 'winch', { dur: tF2 - tF1, g: 0.4 });
  C(tBlast, 'boom', { g: 1.0, size: 1.0 });
  C(wt('crack', 23), 'rumble', { dur: 2.2, g: 0.7 });
  C(tErupt - 0.05, 'boom', { g: 1.0, size: 1.4 });
  C(tErupt, 'rumble', { dur: T.dur - tErupt + 0.2, g: 0.9 });
  C(tG2, 'wind', { dur: T.dur - tG2 + 0.2, g: 0.35 });
  shots.cues = cues;
  return shots;
}
