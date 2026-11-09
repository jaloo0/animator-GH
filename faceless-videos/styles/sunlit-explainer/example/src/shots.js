// The film, shot by shot, keyed to the narration's word times. Each shot: set, start, setup(W, lt, t) → { cam, look, mb }.
import * as THREE from 'three';
import { wt } from './core/timing.js';
import { E, seg, kf, clamp, lerp, V, sstep } from './core/util.js';
import { Human, GRIPS } from './chars/human.js';

const D = Math.PI / 180;
const BLUE = new THREE.Color(0x6aa6db), OLIVE = new THREE.Color(0x5c5a3e);

/** wrist target so that the palm/fingers land on a grip point */
function wristFor(grip, fingers, palm, reach = 0.078, off = 0.018) {
  return grip.clone().addScaledVector(fingers.clone().normalize(), -reach).addScaledVector(palm.clone().normalize(), -off);
}
function put(obj, parent) { if (obj.parent !== parent) parent.add(obj); }
function blendGrip(a, b, t) {
  const o = {};
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const va = a[k] ?? a.all ?? (k === 'opp' || k === 'spread' ? 0 : [0, 0, 0]), vb = b[k] ?? b.all ?? (k === 'opp' || k === 'spread' ? 0 : [0, 0, 0]);
    o[k] = Array.isArray(va) ? va.map((x, i) => lerp(x, vb[i], t)) : lerp(va, vb, t);
  }
  return o;
}

// ---------- A: today, the job site ----------
const HAT_REST = V(0, 1.212, 0.0);
function heroHatA(W, t) {
  // t: film time 0 … 2.75 — rest on pipe → lift → toss, spin, morph
  const hat = W.hats.hero, g = hat.group;
  const lift = seg(t, 0.85, 1.75, E.io);
  let p = HAT_REST.clone().add(V(0, 0.34 * lift, -0.3 * lift)), q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.25 * lift, -0.55 + 0.2 * lift, 0.06 * lift));
  if (t > 1.75) {
    const u = t - 1.75;
    p = HAT_REST.clone().add(V(0, 0.34, -0.3)).add(V(0.05 * u, 5.0 * u - 4.9 * u * u, 0.25 * u));
    q.multiply(new THREE.Quaternion().setFromAxisAngle(V(0.35, 0.25, 1).normalize(), 7.5 * u + 2.2 * u * u));
  }
  g.position.copy(p); g.quaternion.copy(q); g.scale.setScalar(1);
  const m = seg(t, 2.05, 2.45, E.io);
  hat.setShape('hardhat', 'brodie', m);
  const mat = hat.material();
  mat.color.copy(BLUE).lerp(OLIVE, m); mat.roughness = lerp(0.38, 0.78, m); mat.clearcoat = lerp(0.7, 0.0, m); mat.metalness = lerp(0, 0.15, m);
  return { p, q };
}
function workerA(W, t, hatP, hatQ) {
  const w = W.sets.modern.worker;
  const lean = kf(t, [[0, 8], [0.6, 20], [1.2, 14], [1.75, 2], [2.2, -6]]);
  w.rot('spine', lean * 0.6, 0, 0); w.rot('chest', lean * 0.4, 0, 0);
  w.root.position.y = 0.955 - 0.03 * seg(t, 0.2, 0.7) + 0.02 * seg(t, 1.2, 1.8);
  // grip points on the brim (hat-local → world)
  const gp = (x) => V(x, -0.004, 0.0).applyQuaternion(hatQ).add(hatP);
  const fingersL = V(-0.25, -0.7, 0.55).applyQuaternion(hatQ), palmL = V(-1, 0, 0).applyQuaternion(hatQ);
  const fingersR = V(0.25, -0.7, 0.55).applyQuaternion(hatQ), palmR = V(1, 0, 0).applyQuaternion(hatQ);
  const reach = seg(t, 0.05, 0.6, E.out);
  const restL = w.group.localToWorld(V(0.26, 0.9, 0.25)), restR = w.group.localToWorld(V(-0.26, 0.9, 0.25));
  const release = seg(t, 1.74, 1.86);
  const up = V(0, 0.32 * release, 0.1 * release);
  const tL = restL.clone().lerp(wristFor(gp(0.104), fingersL, palmL), reach).add(up);
  const tR = restR.clone().lerp(wristFor(gp(-0.104), fingersR, palmR), reach).add(up);
  const hqL = Human.handQ('L', fingersL, palmL), hqR = Human.handQ('R', fingersR, palmR);
  w.armIK('L', tL, w.group.localToWorld(V(0.7, 0.8, -0.6)), hqL);
  w.armIK('R', tR, w.group.localToWorld(V(-0.7, 0.8, -0.6)), hqR);
  const grip = blendGrip(GRIPS.relax, GRIPS.rim, seg(t, 0.45, 0.75));
  const fin = blendGrip(grip, GRIPS.open, release);
  w.fingers('L', fin); w.fingers('R', fin);
  w.look(hatP.clone().add(V(0, 0.02, 0)), 0.9);
}


// ---------- B: 1918, the trench ----------
const HELMET_ON = { pos: V(0, 0.158, -0.006), rot: new THREE.Euler(-0.07, 0, 0) };
function onHeadMatrix(h) { h.update(); const m = new THREE.Matrix4().compose(HELMET_ON.pos, new THREE.Quaternion().setFromEuler(HELMET_ON.rot), V(1, 1, 1)); return h.bone('head').matrixWorld.clone().multiply(m); }
function wear(h, hat) { const head = h.bone('head'); if (hat.group.parent !== head) head.add(hat.group); hat.group.position.copy(HELMET_ON.pos); hat.group.rotation.copy(HELMET_ON.rot); hat.group.scale.setScalar(1); }
function setWorld(obj, m) { const p = new THREE.Vector3(), q = new THREE.Quaternion(), sc = new THREE.Vector3(); m.decompose(p, q, sc); obj.position.copy(p); obj.quaternion.copy(q); }
function stand(h, x, z, yaw, { y = 0.09, drop = 0.0, lean = 0, twist = 0, side = 0 } = {}) {
  h.group.position.set(x, y, z); h.group.rotation.set(0, yaw, 0);
  h.root.position.y = 0.955 - drop; h.root.position.x = side;
  h.rot('spine', lean * 0.55, twist * 0.5, 0); h.rot('chest', lean * 0.45, twist * 0.5, 0);
  if (drop > 0.005) for (const sd of ['L', 'R']) { const g = sd === 'L' ? 1 : -1; h.legIK(sd, h.group.localToWorld(V(0.1 * g, 0.09, -0.012)), h.group.localToWorld(V(0.1 * g, 0.5, 1))); }
}
/** shovel stroke for soldier s, phase-locked to time; returns nothing (poses the soldier and the shovel) */
function shovelWork(h, shovel, t, rate = 0.62, ph = 0) {
  const u = ((t * rate + ph) % 1 + 1) % 1;
  const B = kf(u, [[0, [0.05, 0.13, 0.62]], [0.32, [0.05, 0.12, 0.72]], [0.62, [0.08, 1.05, 0.5]], [0.78, [0.12, 1.75, 0.62], E.out], [1, [0.05, 0.13, 0.62]]]);
  const ang = kf(u, [[0, 55], [0.32, 62], [0.62, 28], [0.78, -20, E.out], [1, 55]]);
  const lean = kf(u, [[0, 34], [0.32, 38], [0.62, 18], [0.78, 6], [1, 34]]);
  h.rot('spine', lean * 0.55, -8, 0); h.rot('chest', lean * 0.45, -6, 0);
  h.root.position.y = 0.955 - 0.06 * kf(u, [[0, 1], [0.32, 1], [0.62, 0.3], [0.78, 0], [1, 1]]);
  const Bw = h.group.localToWorld(V(...B));
  const dir = V(0, Math.cos(ang * D), -Math.sin(ang * D)).applyQuaternion(h.group.quaternion).normalize();
  shovel.position.copy(Bw); shovel.quaternion.setFromUnitVectors(V(0, 1, 0), dir);
  const top = Bw.clone().addScaledVector(dir, 0.9), mid = Bw.clone().addScaledVector(dir, 0.42);
  const side = V(1, 0, 0).applyQuaternion(h.group.quaternion);
  h.armIK('R', top.clone().addScaledVector(dir, -0.05), h.group.localToWorld(V(-0.8, 0.9, -0.5)), Human.handQ('R', side.clone().negate().add(dir.clone().multiplyScalar(-0.2)), dir.clone().negate()));
  h.armIK('L', mid.clone().addScaledVector(dir, -0.04).addScaledVector(side, 0.02), h.group.localToWorld(V(0.8, 0.6, -0.4)), Human.handQ('L', side.clone().negate(), V(0, -1, 0).applyQuaternion(h.group.quaternion)));
  h.fingers('L', GRIPS.hold); h.fingers('R', GRIPS.holdThin);
  return u;
}
function malletWork(h, mallet, stakeObj, t, rate = 1.25) {
  const u = ((t * rate) % 1 + 1) % 1;
  const stakeTop = h.group.localToWorld(V(-0.02, 0.86, 0.42));
  stakeObj.position.copy(stakeTop).add(V(0, -0.4, 0)); stakeObj.quaternion.copy(h.group.quaternion);
  h.rot('spine', 26, 0, 0); h.rot('chest', 14, 0, 0); h.root.position.y = 0.955 - 0.07;
  // left hand steadies the stake
  h.armIK('L', stakeTop.clone().add(V(0, -0.2, 0)).add(V(0.06, 0, -0.03).applyQuaternion(h.group.quaternion)), h.group.localToWorld(V(0.8, 0.7, -0.3)), Human.handQ('L', V(-1, -0.2, 0).applyQuaternion(h.group.quaternion), V(0, 0, 1).applyQuaternion(h.group.quaternion)));
  h.fingers('L', GRIPS.hold);
  // right hand swings the mallet: raise, strike, rebound
  const hand = h.group.localToWorld(V(...kf(u, [[0, [-0.12, 0.98, 0.33]], [0.55, [-0.16, 1.5, 0.12], E.io], [0.7, [-0.1, 0.98, 0.3], E.in], [1, [-0.12, 0.98, 0.33], E.out]])));
  const headTarget = kf(u, [[0, 0], [0.55, 1], [0.7, 0], [1, 0]]);
  const strikeDir = stakeTop.clone().sub(hand).normalize();
  const upDir = V(0, 0.4, -1).applyQuaternion(h.group.quaternion).normalize();
  const md = strikeDir.clone().lerp(upDir, headTarget).normalize();
  mallet.position.copy(hand).addScaledVector(md, -0.05); mallet.quaternion.setFromUnitVectors(V(0, 1, 0), md);
  h.armIK('R', hand, h.group.localToWorld(V(-0.8, 0.5, -0.6)), Human.handQ('R', V(1, 0, 0).applyQuaternion(h.group.quaternion), md.clone().negate()));
  h.fingers('R', GRIPS.holdThin);
  return u;
}


function background(S, t) {
  stand(S.s2, -0.12, -2.6, Math.PI / 2, { lean: 10 }); wear(S.s2, S.helmets.s2); shovelWork(S.s2, S.workShovel, t);
  S.s2.look(S.s2.group.localToWorld(V(0, 0.4, 0.8)), 0.6);
  stand(S.s3, -0.05, -5.1, Math.PI / 2 - 0.15, { lean: 10 }); wear(S.s3, S.helmets.s3); malletWork(S.s3, S.mallet, S.stake, t);
  S.s3.look(S.s3.group.localToWorld(V(0, 0.8, 0.45)), 0.8);
}

export function buildShots(T, W) {
  const shots = [];
  const add = (s) => shots.push(s);
  const cues = (shots.cues = []);

  add({ id: 'A1', set: 'modern', start: 0, note: 'hands lift the blue hard hat off the pipe',
    setup(W, lt, t) {
      const S = W.sets.modern; put(W.hats.hero.group, S.scene);
      const { p, q } = heroHatA(W, t); workerA(W, t, p, q);
      const u = seg(lt, 0, 1.45, E.lin);
      const pos = [lerp(0.56, 0.4, u), lerp(1.31, 1.36, u), lerp(1.12, 0.92, u)];
      const look = [lerp(-0.02, 0.0, u), 1.27 + 0.12 * seg(t, 0.85, 1.6), -0.05];
      return { cam: { pos, look, fov: 34, shake: 0.08 }, look: { focus: Math.hypot(pos[0] - p.x, pos[1] - p.y, pos[2] - p.z), aper: 0.034, warm: 0.6 }, shadowAt: [0, 1.2, -0.3], shadowSize: 1.6 };
    } });
  add({ id: 'A2', set: 'modern', start: 1.45, note: 'toss into the sky — the hard hat morphs into a doughboy helmet, whip down',
    setup(W, lt, t) {
      const S = W.sets.modern; put(W.hats.hero.group, S.scene);
      const { p, q } = heroHatA(W, t); workerA(W, t, p, q);
      // camera rises and tilts to follow the hat, then whips down
      const whip = seg(t, 2.52, 2.75, E.in);
      const pos = [kf(t, [[1.45, 0.62], [2.2, 0.75]]), kf(t, [[1.45, 1.25], [2.2, 1.55]]), kf(t, [[1.45, 1.35], [2.2, 1.05]])];
      const follow = p.clone().add(V(0, -0.05, 0));
      const look = [follow.x, follow.y - whip * 6.0, follow.z - whip * 1.0];
      return { cam: { pos, look, fov: kf(t, [[1.45, 36], [2.2, 30], [2.75, 34]]), shake: 0.1, roll: -6 * whip }, look: { focus: Math.hypot(pos[0] - p.x, pos[1] - p.y, pos[2] - p.z), aper: 0.02, warm: 0.6 },
        shadowAt: [p.x, Math.min(p.y, 1.6), p.z], shadowSize: 2, mb: t > 2.5 ? 7 : t > 1.8 ? 3 : 1, shutter: 0.6 };
    } });
  // B1 — the helmet falls into a soldier's hands; he puts it on; crane back over the parapet
  const tB1 = 2.75, tB2 = wt('soldiers', 3.5) + 0.5, tB3 = wt('shaped', 5) - 0.02;
  add({ id: 'B1', set: 'trench', start: tB1, note: 'the helmet lands in a soldier\'s hands — In World War One',
    setup(W, lt, t) {
      const S = W.sets.trench, s1 = S.s1, hat = W.hats.hero;
      hat.setShape('hardhat', 'brodie', 1); const mat = hat.material(); mat.color.copy(OLIVE); mat.roughness = 0.78; mat.clearcoat = 0; mat.metalness = 0.15;
      stand(S.s1, 0.0, 0.0, 0.25, { lean: -4 });
      background(S, t);
      const catchT = tB1 + 0.26, onT = tB1 + 0.85;
      const C = s1.group.localToWorld(V(0.0, 1.95, 0.26));
      if (t < onT) {
        put(hat.group, S.scene);
        let p, q;
        if (t < catchT) { const u = (t - tB1) / (catchT - tB1); p = C.clone().add(V(0.05 * (1 - u), 1.4 * (1 - u) * (1 - u) + 0.0, 0.05 * (1 - u))); q = new THREE.Quaternion().setFromAxisAngle(V(0.35, 0.25, 1).normalize(), 3.2 * (1 - u) * (1 - u)); }
        else {
          const u = seg(t, catchT + 0.06, onT, E.io);
          const M0 = new THREE.Matrix4().compose(C, new THREE.Quaternion(), V(1, 1, 1)), M1 = onHeadMatrix(s1);
          const p0 = new THREE.Vector3(), q0 = new THREE.Quaternion(), p1 = new THREE.Vector3(), q1 = new THREE.Quaternion(), sc = new THREE.Vector3();
          M0.decompose(p0, q0, sc); M1.decompose(p1, q1, sc);
          p = p0.lerp(p1, u).add(V(0, 0.08 * Math.sin(u * Math.PI), 0)); q = q0.slerp(q1, u);
        }
        hat.group.position.copy(p); hat.group.quaternion.copy(q);
        // hands: reach up, catch on the brim, carry it down
        const hq = hat.group.quaternion;
        const gL = V(0.104, -0.006, 0).applyQuaternion(hq).add(hat.group.position), gR = V(-0.104, -0.006, 0).applyQuaternion(hq).add(hat.group.position);
        const fL = V(-0.2, 0.75, 0.3).applyQuaternion(hq), fR = V(0.2, 0.75, 0.3).applyQuaternion(hq);
        const k = seg(t, tB1, catchT, E.out);
        const upL = s1.group.localToWorld(V(0.2, 1.9, 0.3)), upR = s1.group.localToWorld(V(-0.2, 1.9, 0.3));
        s1.armIK('L', upL.lerp(wristFor(gL, fL, V(-1, 0, 0).applyQuaternion(hq)), k), s1.group.localToWorld(V(0.8, 1.2, -0.4)), Human.handQ('L', fL, V(-1, 0, 0).applyQuaternion(hq)));
        s1.armIK('R', upR.lerp(wristFor(gR, fR, V(1, 0, 0).applyQuaternion(hq)), k), s1.group.localToWorld(V(-0.8, 1.2, -0.4)), Human.handQ('R', fR, V(1, 0, 0).applyQuaternion(hq)));
        const gp = blendGrip(GRIPS.open, GRIPS.rim, seg(t, catchT - 0.06, catchT + 0.05));
        s1.fingers('L', gp); s1.fingers('R', gp);
        s1.look(hat.group.position, 0.8);
      } else {
        wear(s1, hat);
        // settle: hands slide down to the chin strap, then drop to the webbing
        const u = seg(t, onT, onT + 0.7, E.io);
        const jawL = s1.at('head', [0.07, 0.03, 0.04]), jawR = s1.at('head', [-0.07, 0.03, 0.04]);
        const beltL = s1.group.localToWorld(V(0.17, 1.02, 0.17)), beltR = s1.group.localToWorld(V(-0.17, 1.02, 0.17));
        s1.armIK('L', jawL.clone().add(V(0.0, -0.09, 0.0)).lerp(beltL, u), s1.group.localToWorld(V(0.8, 0.9, -0.5)), Human.handQ('L', V(-0.3, 1 - 2 * u, 0.3).applyQuaternion(s1.group.quaternion), V(-1, 0, 0.3).applyQuaternion(s1.group.quaternion)));
        s1.armIK('R', jawR.clone().add(V(0.0, -0.09, 0.0)).lerp(beltR, u), s1.group.localToWorld(V(-0.8, 0.9, -0.5)), Human.handQ('R', V(0.3, 1 - 2 * u, 0.3).applyQuaternion(s1.group.quaternion), V(1, 0, 0.3).applyQuaternion(s1.group.quaternion)));
        s1.fingers('L', GRIPS.relax); s1.fingers('R', GRIPS.relax);
        s1.look(s1.group.localToWorld(V(0.6, 1.4, 2.0)), 0.6);
      }
      // camera: whip lands (looking up), then cranes back + up over the parapet
      const land = seg(t, tB1, tB1 + 0.22, E.out);
      const crane = seg(t, tB1 + 0.55, tB2, E.io);
      const pos = [lerp(0.2, 0.0, crane), lerp(1.3, 2.95, crane), lerp(1.45, 3.6, crane)];
      const lookY = lerp(3.4, 1.85, land) - 0.25 * crane;
      const look = [lerp(0.0, -0.1, crane), lookY, lerp(0.2, -1.2, crane)];
      return { cam: { pos, look, fov: lerp(38, 42, crane), shake: 0.12 }, look: { focus: lerp(1.4, 3.6, crane), aper: lerp(0.026, 0.02, crane), warm: 0.7 },
        shadowAt: [0, 1.0, -1.0], shadowSize: lerp(1.8, 4.5, crane), mb: t < tB1 + 0.2 ? 7 : 1, shutter: 0.7 };
    } });
  // B2 — sweep along the trench above the helmets
  add({ id: 'B2', set: 'trench', start: tB2, note: 'soldiers wore steel helmets — sweep over the helmets',
    setup(W, lt, t) {
      const S = W.sets.trench; put(W.hats.hero.group, S.scene);
      stand(S.s1, 0.0, 0.0, 0.25, { lean: 4 }); wear(S.s1, W.hats.hero);
      S.s1.armIK('L', S.s1.group.localToWorld(V(0.17, 1.02, 0.17)), S.s1.group.localToWorld(V(0.8, 0.9, -0.5)), null);
      S.s1.armIK('R', S.s1.group.localToWorld(V(-0.17, 1.02, 0.17)), S.s1.group.localToWorld(V(-0.8, 0.9, -0.5)), null);
      background(S, t);
      const u = seg(t, tB2, tB3, E.io2);
      const pos = [-1.15, lerp(3.75, 3.6, u), lerp(0.9, -3.9, u)];
      const look = [0.12, 1.0, lerp(-0.9, -5.7, u)];
      const fz = lerp(-0.3, -5.0, sstep(0.15, 0.9, u));
      return { cam: { pos, look, fov: 40, shake: 0.08, roll: -4 }, look: { focus: Math.hypot(1.2, 2.6, pos[2] - fz - 0.8), aper: 0.016, warm: 0.7 },
        shadowAt: [0, 1.0, pos[2] - 1.5], shadowSize: 3.5, mb: 3, shutter: 0.5 };
    } });
  // B3 — the helmet as a bowl: water poured from a canteen, seen from above
  add({ id: 'B3', set: 'trench', start: tB3, note: 'shaped like bowls — water poured into an upturned helmet',
    setup(W, lt, t) {
      const S = W.sets.trench, s2 = S.s2, h = S.helmets.s2;
      put(W.hats.hero.group, S.scene); stand(S.s1, 0.0, 0.0, 0.25); wear(S.s1, W.hats.hero);
      // s2 sits on the crate, helmet upturned in the left hand, pouring from the canteen
      const cr = S.crate.position;
      s2.group.position.set(cr.x + 0.02, 0.09, cr.z + 0.04); s2.group.rotation.set(0, 0.2 + Math.PI / 2 - 0.5, 0);
      s2.root.position.set(0, 0.6 - 0.09 + 0.02, -0.05);
      s2.rot('pelvis', -6, 0, 0); s2.rot('spine', 22, 0, 0); s2.rot('chest', 14, 0, 0);
      for (const sd of ['L', 'R']) { const g = sd === 'L' ? 1 : -1; s2.legIK(sd, s2.group.localToWorld(V(0.14 * g, 0.09, 0.42)), s2.group.localToWorld(V(0.14 * g, 0.6, 1.2))); }
      const hp = s2.group.localToWorld(V(0.02, 0.86, 0.36));
      put(h.group, S.scene); h.group.position.copy(hp); h.group.quaternion.copy(s2.group.quaternion).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI, 0.3, 0.06)));
      s2.armIK('L', hp.clone().add(V(0.0, -0.07, -0.03)).add(V(0.05, 0, 0).applyQuaternion(s2.group.quaternion)), s2.group.localToWorld(V(0.8, 0.6, -0.4)), Human.handQ('L', V(0, 0.1, 1).applyQuaternion(s2.group.quaternion), V(0, 1, 0)));
      s2.fingers('L', GRIPS.rim);
      // canteen pours, then he dips his fingers
      const pour = seg(t, tB3 + 0.05, tB3 + 0.35, E.io) * (1 - seg(t, tB3 + 1.05, tB3 + 1.3, E.io));
      const cp = hp.clone().add(V(-0.13, 0.2 - 0.03 * pour, 0.02).applyQuaternion(s2.group.quaternion));
      S.canteen.scale.setScalar(0.85);
      // the stream: spout → water surface
      const spout = V(0, 0.125 * 0.72, 0).applyQuaternion(S.canteen.quaternion.clone().copy(s2.group.quaternion).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, -(0.3 + 1.9 * pour)))));
      const sp = cp.clone().add(spout), wp = hp.clone().add(V(0, -0.02, 0));
      S.stream.visible = pour > 0.6; S.stream.position.copy(sp).lerp(wp, 0.5); S.stream.quaternion.setFromUnitVectors(V(0, 1, 0), sp.clone().sub(wp).normalize()); S.stream.scale.set(1, sp.distanceTo(wp), 1);
      S.canteen.position.copy(cp); S.canteen.quaternion.copy(s2.group.quaternion).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, -(0.3 + 1.9 * pour))));
      s2.armIK('R', cp.clone().add(V(-0.05, -0.03, -0.06).applyQuaternion(s2.group.quaternion)), s2.group.localToWorld(V(-0.8, 0.8, -0.3)), Human.handQ('R', V(0.2, -1, 0.3).applyQuaternion(S.canteen.quaternion), V(1, 0, 0).applyQuaternion(S.canteen.quaternion)));
      s2.fingers('R', GRIPS.hold);
      s2.look(hp, 1, 0.5);
      // water level + ripples
      const fill = seg(t, tB3 + 0.25, tB3 + 1.2, E.out);
      if (fill > 0.01) {
        S.water.visible = true; if (S.water.parent !== h.group) h.group.add(S.water);
        const d = 0.006 + 0.05 * fill, y = 0.096 - d;
        const prof = [[0.096, 0], [0.094, 0.03], [0.087, 0.055], [0.074, 0.074], [0.055, 0.089], [0.034, 0.098]];
        let r = 0; for (let i = 0; i < prof.length - 1; i++) if (y <= prof[i][0] && y >= prof[i + 1][0]) r = lerp(prof[i][1], prof[i + 1][1], (prof[i][0] - y) / (prof[i][0] - prof[i + 1][0]));
        S.water.position.set(0, y - 0.003, 0); S.water.rotation.set(Math.PI / 2, 0, 0); S.water.scale.set(r * 0.9 * 0.97, r * 0.97, 1);
        // ripples from the pour point
        const P = S.water.geometry.attributes.position, B = S.water.userData.base, tt = t - tB3;
        for (let i = 0; i < P.count; i++) { const x = B[i * 3] + 0.25, yy = B[i * 3 + 1] - 0.1, rr = Math.hypot(x, yy); P.setZ(i, (0.0016 * Math.sin(rr * 26 - tt * 16) * Math.exp(-rr * 2.2) * (0.3 + pour)) * (1 - Math.hypot(B[i * 3], B[i * 3 + 1]) ** 8)); }
        P.needsUpdate = true; S.water.geometry.computeVertexNormals();
      }
      // camera: low 3/4 from the front, slow arc + push toward the bowl
      const u = seg(t, tB3, tB3 + 1.6, E.lin);
      const fwd = V(0, 0, 1).applyQuaternion(s2.group.quaternion), rt = V(1, 0, 0).applyQuaternion(s2.group.quaternion);
      const ang = lerp(1.32, 1.08, u), rad = lerp(0.6, 0.5, u);
      const c = hp.clone().addScaledVector(fwd, Math.cos(ang) * rad).addScaledVector(rt, Math.sin(ang) * rad).add(V(0, lerp(0.26, 0.22, u), 0));
      const pos = c.toArray();
      return { cam: { pos, look: [hp.x, hp.y + 0.16, hp.z], fov: 38, shake: 0.08 }, look: { focus: c.distanceTo(hp), aper: 0.024, warm: 0.7 },
        shadowAt: [hp.x, hp.y - 0.2, hp.z], shadowSize: 1.4 };
    } });
  // ---------- C/D/E: 1919, the Bullard shop ----------
  const tC1 = wt('when', 6.8) - 0.06, tC2 = wt('noticed', 9) - 0.12, tC3 = wt('nothing', 10) - 0.14;
  const tD1 = wt('so', 12.3) - 0.1, tD2 = wt('in', 13.5) - 0.1, tD3 = wt('steamed', 15) - 0.14, tD4 = wt('glued', 17) - 0.1;
  const tD5 = wt('and', 18.5) - 0.06, tE1 = wt('he', 19.9) - 0.08, tF1 = wt('and', 22) - 0.06;
  const SH = () => W.sets.shop;
  /** Bullard at the bench, facing the window (-X) */
  const atBench = (b, z, { lean = 18, twist = 0, x = -1.47 } = {}) => { stand(b, x, z, -Math.PI / 2, { y: 0, lean, twist }); };
  const hand = (b, side, target, fingers, palm, pole) => b.armIK(side, target, pole || b.group.localToWorld(V(side === 'L' ? 0.8 : -0.8, 0.8, -0.6)), Human.handQ(side, fingers, palm));

  add({ id: 'C1', set: 'shop', start: tC1, note: 'When Edward Bullard came home — the helmet goes on the hook',
    setup(W, lt, t) {
      const S = SH(), b = S.bullard, hk = S.hooks[1].position, hel = S.helmet;
      stand(b, -2.05, -2.42, Math.PI, { y: 0, lean: 2 });
      const hang = tC1 + 0.7;
      // helmet: carried up to the hook, then hangs (crown toward the room) with a damped swing
      const hangPos = hk.clone().add(V(0, -0.135, 0.045));
      if (t < hang) {
        const u = seg(t, tC1, hang, E.io);
        const p0 = b.group.localToWorld(V(0.2, 1.15, 0.3));
        hel.group.position.copy(p0.lerp(hangPos, u)); hel.group.quaternion.setFromEuler(new THREE.Euler(lerp(0.6, Math.PI / 2 - 0.12, u), lerp(0.4, 0, u), 0));
      } else {
        const tt = t - hang, sw = 0.22 * Math.exp(-tt * 2.2) * Math.sin(tt * 9);
        hel.group.position.copy(hk).add(V(Math.sin(sw) * 0.135, -Math.cos(sw) * 0.135, 0.045));
        hel.group.quaternion.setFromEuler(new THREE.Euler(Math.PI / 2 - 0.12, 0, sw));
      }
      const hq = hel.group.quaternion;
      const grip = V(0.0, -0.004, 0.12).applyQuaternion(hq).add(hel.group.position);
      const away = seg(t, hang + 0.05, hang + 0.6, E.io);
      const handT = grip.clone().lerp(b.group.localToWorld(V(0.25, 0.95, 0.15)), away);
      hand(b, 'L', handT.add(V(0, -0.06, 0.05)), V(0, 0.4, -1).applyQuaternion(b.group.quaternion), V(-0.2, 0, 1).applyQuaternion(b.group.quaternion).negate());
      b.fingers('L', blendGrip(GRIPS.rim, GRIPS.relax, away));
      // then he turns toward the bench and rolls his left sleeve
      const turn = seg(t, hang + 0.3, hang + 1.3, E.io);
      b.group.rotation.y = lerp(Math.PI, Math.PI * 1.32, turn);
      b.rot('spine', 4, -14 * turn, 0); b.rot('chest', 3, -12 * turn, 0);
      const fl = b.group.localToWorld(V(-0.05, 1.08, 0.28));
      hand(b, 'R', fl.clone(), V(1, 0.1, 0.2).applyQuaternion(b.group.quaternion), V(0, -1, 0));
      b.fingers('R', GRIPS.relax);
      b.look(t < hang + 0.2 ? hel.group.position : V(...S.T(0.25, -0.9)).add(V(0, -0.3, 0)), 0.85);
      // camera: close on the hook, then pull back + pan to Bullard
      const u = seg(t, tC1, tC2, E.io);
      const pull = seg(t, hang + 0.15, tC2, E.io);
      const pos = [lerp(-2.72, -2.85, pull), lerp(1.62, 1.6, pull), lerp(-2.15, -1.05, pull)];
      const look = V(...[lerp(hk.x, -1.95, pull), lerp(1.6, 1.42, pull), lerp(hk.z, -2.45, pull)]);
      const fp = V(...pos), fc = pull < 0.55 ? hel.group.position : b.at('head', [0, 0.1, 0.05]);
      void u;
      return { cam: { pos, look: look.toArray(), fov: lerp(34, 40, pull), shake: 0.1 }, look: { focus: fp.distanceTo(fc), aper: 0.028, warm: 0.75, exposure: 1.5 },
        shadowAt: [-2.2, 1.3, -2.4], shadowSize: 2.0 };
    } });
  // ---------- C2/C3: the miners ----------
  const MN = () => W.sets.mine;
  const minerPose = (S, t, cartZ) => {
    const m = S.miner, cart = S.cart;
    cart.position.set(0, 0, cartZ); 
    // he leans into the cart from behind (cart toward +Z, he faces +Z)
    stand(m, 0.0, cartZ - 0.95, 0, { y: 0.09, lean: 30 });
    const stride = Math.sin((cartZ) / 0.32 * Math.PI);
    m.root.position.y = 0.955 - 0.07 + 0.012 * Math.abs(stride);
    m.legIK('L', m.group.localToWorld(V(0.11, 0.09, 0.18 + 0.2 * stride)), m.group.localToWorld(V(0.1, 0.5, 1.2)));
    m.legIK('R', m.group.localToWorld(V(-0.11, 0.09, 0.18 - 0.2 * stride - 0.15)), m.group.localToWorld(V(-0.1, 0.5, 1.2)));
    const rim = (x) => cart.localToWorld(V(x, 0.86, -0.62));
    hand(m, 'L', rim(0.22).add(V(0, 0.02, -0.06)), V(0, -0.6, 1), V(0, -0.2, 1));
    hand(m, 'R', rim(-0.22).add(V(0, 0.02, -0.06)), V(0, -0.6, 1), V(0, -0.2, 1));
    m.fingers('L', GRIPS.rim); m.fingers('R', GRIPS.rim);
    m.update();
    wearCap(m, S.cap);
  };
  const wearCap = (h, cap) => { const head = h.bone('head'); if (cap.group.parent !== head) head.add(cap.group); cap.group.position.set(0, 0.163, 0.004); cap.group.rotation.set(-0.12, 0, 0); };
  add({ id: 'C2', set: 'mine', start: tC2, note: 'he noticed miners — a miner pushes an ore cart out into the sun',
    setup(W, lt, t) {
      const S = MN();
      const cz = lerp(-1.6, -0.55, seg(t, tC2 - 0.3, tC3 + 0.6, E.lin));
      minerPose(S, t, cz);
      S.miner.look(S.miner.group.localToWorld(V(0, 0.9, 2.2)), 0.7);
      const u = seg(t, tC2, tC3, E.io);
      const pos = [lerp(1.05, 0.85, u), lerp(0.62, 0.7, u), lerp(2.5, 2.1, u)];
      return { cam: { pos, look: [lerp(0.1, 0.0, u), 1.25, -1.0], fov: 42, shake: 0.1 }, look: { focus: Math.hypot(pos[0], pos[1] - 1.2, pos[2] - cz + 0.9), aper: 0.016, warm: 0.7 }, shadowAt: [0, 1.0, -0.8], shadowSize: 3.0 };
    } });
  add({ id: 'C3', set: 'mine', start: tC3, note: 'had nothing protecting their heads — pebbles fall on a soft cloth cap',
    setup(W, lt, t) {
      const S = MN(), m = S.miner;
      const cz = lerp(-1.6, -0.55, seg(t, tC2 - 0.3, tC3 + 0.6, E.lin));
      minerPose(S, t, cz);
      const head = m.at('head', [0, 0.24, 0.02]);
      // he glances up at the header when the grit starts
      const glance = seg(t, tC3 + 0.35, tC3 + 0.9, E.io);
      m.look(V(0, 2.4, -0.9).lerp(m.group.localToWorld(V(0, 0.9, 2)), 1 - glance), 0.8);
      // pebbles: released from the header, fall (slow-mo), hit the cap and bounce off
      const slow = 0.55;
      S.pebbles.forEach((p, k) => {
        const t0 = tC3 + 0.15 + k * 0.09 + (k % 3) * 0.05, tt = (t - t0) * slow;
        const x0 = (Math.sin(k * 7.7) * 0.08), z0 = -0.92 + Math.cos(k * 3.1) * 0.06;
        if (tt < 0) { p.position.set(x0, 2.26, z0); return; }
        const yTop = head.y + 0.005, fallT = Math.sqrt(2 * (2.26 - yTop) / 9.8);
        if (k % 2 === 0 && tt > fallT) { // bounced off the cap
          const u = tt - fallT, vx = (x0 > 0 ? 1 : -1) * 0.6, vz = 0.4;
          p.position.set(head.x + x0 + vx * u, yTop + 1.2 * u - 4.9 * u * u, head.z + vz * u);
        } else p.position.set(x0 + (k % 2) * 0.12 * Math.sign(x0 || 1), 2.26 - 4.9 * tt * tt, z0 + (k % 2 ? 0.05 : 0) + (k % 2 === 0 ? head.z - z0 : 0) * Math.min(1, tt / fallT));
        p.rotation.set(tt * 8 + k, tt * 5, 0);
      });
      // the soft cap gives a little under each hit
      let dent = 0; S.pebbles.forEach((p, k) => { if (k % 2) return; const t0 = tC3 + 0.15 + k * 0.09 + (k % 3) * 0.05, fallT = Math.sqrt(2 * (2.26 - head.y) / 9.8) / slow; const d = t - t0 - fallT; if (d > 0 && d < 0.25) dent = Math.max(dent, Math.sin(d / 0.25 * Math.PI)); });
      S.cap.group.scale.set(1 + 0.04 * dent, 1 - 0.12 * dent, 1 + 0.04 * dent);
      const u = seg(t, tC3, tD1, E.io);
      const pos = [lerp(0.62, 0.48, u), lerp(1.7, 1.66, u), lerp(-0.25, -0.5, u)];
      const fc = V(...pos).distanceTo(head);
      return { cam: { pos, look: [head.x, head.y + 0.02 + 0.12 * (1 - u), head.z], fov: 34, shake: 0.08 }, look: { focus: fc, aper: 0.028, warm: 0.7 }, shadowAt: head.toArray(), shadowSize: 1.4 };
    } });
  add({ id: 'D1', set: 'shop', start: tD1, note: 'So in 1919 — the 1918 sheet is torn off the calendar',
    setup(W, lt, t) {
      const S = SH(), b = S.bullard, cal = S.cal;
      stand(b, -1.5, -2.45, Math.PI - 0.25, { y: 0, lean: 3 });
      const grabT = tD1 + 0.15, tearT = tD1 + 0.62;
      const sh = cal.sheet, base = sh.userData.base, P = sh.geometry.attributes.position;
      const tear = seg(t, grabT, tearT, E.in);
      const fly = seg(t, tearT, tD2, E.out);
      // curl the sheet up from its bottom-right corner, then it leaves the pad and tumbles
      for (let i = 0; i < P.count; i++) {
        const x = base[i * 3], y = base[i * 3 + 1];
        const d = Math.max(0, (-y / 0.38) * 0.75 + ((x + 0.18) / 0.36) * 0.35);
        const ang = tear * 2.6 * d * d;
        P.setXYZ(i, x, y * Math.cos(ang), -y * Math.sin(ang) * 0.9 + 0.01 * tear);
      }
      P.needsUpdate = true; sh.geometry.computeVertexNormals();
      sh.position.set(0.0 + 0.25 * fly, 0.11 - 0.55 * fly * fly, 0.009 + 0.28 * fly); sh.rotation.set(-1.2 * fly, 0.6 * fly, -0.9 * fly);
      // hand pinches the corner and pulls
      const corner = V(0.17, -0.37, 0.0);
      corner.set(corner.x, corner.y * Math.cos(2.6 * tear * 0.95), -corner.y * Math.sin(2.6 * tear * 0.95) * 0.9).applyEuler(sh.rotation).add(sh.position);
      const cw = cal.group.localToWorld(corner.clone());
      const reach = seg(t, tD1 - 0.2, grabT, E.out);
      const rest = b.group.localToWorld(V(-0.25, 1.0, 0.25));
      const wT = rest.lerp(cw.clone().add(V(0.02, -0.05, 0.07)), reach);
      if (fly > 0.12) wT.lerp(b.group.localToWorld(V(-0.3, 1.25, 0.45)), seg(t, tearT + 0.1, tD2, E.io));
      hand(b, 'R', wT, V(-0.3, 0.7, -0.6), V(0.3, 0.2, -1));
      b.fingers('R', GRIPS.pinch); b.fingers('L', GRIPS.relax);
      b.look(V(-1.78, 1.55, -2.98), 0.9);
      const u = seg(t, tD1, tD2, E.lin);
      const pos = [lerp(-2.3, -2.25, u), lerp(1.5, 1.53, u), lerp(-2.35, -2.3, u)];
      return { cam: { pos, look: [-1.8, 1.52, -2.98], fov: 32, shake: 0.08 }, look: { focus: 0.68, aper: 0.03, warm: 0.75, exposure: 1.5 }, shadowAt: [-1.25, 1.5, -2.8], shadowSize: 1.3 };
    } });
  add({ id: 'D2', set: 'shop', start: tD2, note: "in his father's shop — crane down through the light shafts",
    setup(W, lt, t) {
      const S = SH(), b = S.bullard;
      atBench(b, -0.25, { lean: 22 });
      const k = Math.sin((t - tD2) * 5.0);
      hand(b, 'L', V(-2.1, 0.96, -0.12 + 0.03 * k), V(-1, -0.1, 0), V(0, -1, 0));
      hand(b, 'R', V(-2.05, 0.96, -0.5 - 0.03 * k), V(-1, -0.1, 0.1), V(0, -1, 0));
      b.fingers('L', GRIPS.open); b.fingers('R', GRIPS.open);
      b.look(V(-2.1, 0.95, -0.3), 0.9);
      S.form.visible = true;
      const u = seg(t, tD2, tD3, E.io);
      const pos = [lerp(2.1, 0.75, u), lerp(2.85, 1.85, u), lerp(2.55, 1.35, u)];
      const look = [lerp(-1.8, -2.0, u), lerp(1.2, 1.15, u), lerp(-0.9, -0.5, u)];
      return { cam: { pos, look, fov: 44, shake: 0.06 }, look: { focus: Math.hypot(pos[0] + 1.5, pos[1] - 1.5, pos[2] + 0.25), aper: 0.012, warm: 0.75, exposure: 1.5 }, shadowAt: [-1.6, 1.0, -0.6], shadowSize: 3.2 };
    } });
  add({ id: 'D3', set: 'shop', start: tD3, note: 'he steamed layers of canvas — sheet lifted from the steam, draped on the form',
    setup(W, lt, t) {
      const S = SH(), b = S.bullard, dr = S.drape;
      atBench(b, 0.0, { lean: 20 });
      const potTop = S.pot.position.clone().add(V(0, 0.25, 0));
      const steam = S.steam.material.uniforms; steam.uOrigin.value.copy(potTop); steam.uAlpha.value = 0.38;
      const lift = seg(t, tD3 + 0.05, tD3 + 0.6, E.out), carry = seg(t, tD3 + 0.6, tD3 + 1.15, E.io), drape = seg(t, tD3 + 1.05, tD4 - 0.05, E.io);
      dr.mesh.visible = true;
      const formP = S.form.position;
      const above = potTop.clone().add(V(0, 0.12 + 0.12 * lift, 0));
      const pos = above.lerp(formP.clone().add(V(0, 0.0, 0)), carry);
      dr.mesh.position.copy(pos); dr.set(drape, 0.06 + 0.1 * (1 - carry), t);
      if (carry < 1) dr.mesh.position.y += -0.15 * carry + 0.0;
      // hands hold two corners until the drape, then press the crown
      const cL = dr.mesh.localToWorld(V(-0.2, 0.16 + 0.04, 0.2)), cR = dr.mesh.localToWorld(V(-0.2, 0.16 + 0.04, -0.2));
      const press = seg(t, tD3 + 1.3, tD4, E.io);
      const crown = formP.clone().add(V(0, 0.13, 0));
      hand(b, 'L', cL.lerp(crown.clone().add(V(0.02, 0.03, 0.07)), press), V(-0.6, -0.4, -0.3), V(0, -1, 0));
      hand(b, 'R', cR.lerp(crown.clone().add(V(0.02, 0.03, -0.07)), press), V(-0.6, -0.4, 0.3), V(0, -1, 0));
      const g = blendGrip(GRIPS.pinch, GRIPS.open, press); b.fingers('L', g); b.fingers('R', g);
      b.look(pos, 0.9);
      const u = seg(t, tD3, tD4, E.lin);
      const cpos = [lerp(-1.25, -1.35, u), lerp(1.38, 1.32, u), lerp(1.45, 1.05, u)];
      const look = [lerp(-2.2, -2.2, u), lerp(1.08, 1.05, u), lerp(0.25, -0.05, u)];
      return { cam: { pos: cpos, look, fov: 34, shake: 0.08 }, look: { focus: Math.hypot(cpos[0] + 2.2, cpos[1] - 1.1, cpos[2] - lerp(0.35, -0.35, carry)), aper: 0.026, warm: 0.75, exposure: 1.5 }, shadowAt: [-2.2, 1.0, 0.0], shadowSize: 1.6 };
    } });
  add({ id: 'D4', set: 'shop', start: tD4, note: 'glued them together — exploded view of the canvas layers',
    setup(W, lt, t) {
      const S = SH(), b = S.bullard, f = S.form.position;
      atBench(b, -0.05, { lean: 20 });
      const ex = seg(t, tD4, tD4 + 0.35, E.out) * (1 - seg(t, tD5 - 0.42, tD5 - 0.12, E.back));
      S.layers.forEach((m, k) => {
        m.visible = true; m.position.copy(f).add(V(0, 0.005 + k * 0.0018 + ex * (k * 0.055), 0)); m.rotation.set(0, ex * (k - 2) * 0.12, 0); m.scale.setScalar(1.01 + k * 0.004);
        m.material.color.setHex(k === 4 ? 0xf6e4c0 : 0xf0dcb4); m.material.roughness = 0.9;
      });
      // glue brush sweeps the top layer
      const top = S.layers[4];
      const sw = seg(t, tD4 + 0.32, tD5 - 0.45, E.io);
      const a = lerp(-1.3, 1.3, sw);
      const bp = top.position.clone().add(V(Math.sin(a) * 0.06, 0.122 - 0.01 * Math.abs(Math.sin(a)) + 0.03, Math.cos(a) * 0.07 * 0.0 + Math.cos(a) * 0.05));
      S.glueBrush.position.copy(bp); S.glueBrush.quaternion.setFromEuler(new THREE.Euler(0.3, a * 0.6, -0.5));
      hand(b, 'R', bp.clone().add(V(0.05, 0.13, -0.01)), V(-0.6, -0.8, 0.1), V(0.1, -0.2, 1));
      b.fingers('R', GRIPS.holdThin);
      hand(b, 'L', V(-2.0, 0.95, -0.42), V(-1, -0.15, 0), V(0, -1, 0)); b.fingers('L', GRIPS.open);
      top.material.roughness = lerp(0.9, 0.35, sw); top.material.color.setHex(sw > 0.05 ? 0xd8c094 : 0xf6e4c0);
      b.look(f.clone().add(V(0, 0.15, 0)), 0.9);
      const u = seg(t, tD4, tD5, E.io);
      const ang = lerp(0.35, -0.55, u), rad = 0.62;
      const pos = [f.x + Math.sin(ang) * rad * 0.6 + 0.35, f.y + lerp(0.34, 0.24, u), f.z + Math.cos(ang) * rad];
      return { cam: { pos, look: [f.x, f.y + 0.12, f.z], fov: 34, shake: 0.08 }, look: { focus: Math.hypot(pos[0] - f.x, pos[1] - f.y - 0.12, pos[2] - f.z), aper: 0.03, warm: 0.75, exposure: 1.5 }, shadowAt: [f.x, f.y, f.z], shadowSize: 1.0, mb: ex > 0.05 && ex < 0.95 ? 3 : 1 };
    } });
  add({ id: 'D5', set: 'shop', start: tD5, note: 'and painted them black — the paint sweeps around the shell',
    setup(W, lt, t) {
      const S = SH(), b = S.bullard, f = S.form.position, ph = S.paintHat;
      atBench(b, -0.05, { lean: 20 });
      ph.group.visible = true; ph.group.position.copy(f).add(V(0, 0.006, 0)); ph.group.scale.setScalar(1.035); ph.group.rotation.set(0, 0, 0);
      const mat = ph.material(); const pnt = seg(t, tD5 + 0.05, tE1 - 0.15, E.io2);
      mat.userData.uPaint.value = pnt; mat.userData.uWet.value = 1;
      const a = (pnt * 1.15 - 0.075 + 0.11 - 0.5) * Math.PI * 2;
      const bp = f.clone().add(V(Math.sin(a) * 0.1, 0.07 + 0.03 * Math.sin(t * 9), Math.cos(a) * 0.11));
      S.paintBrush.position.copy(bp.clone().add(V(Math.sin(a) * 0.04, 0.03, Math.cos(a) * 0.04))); S.paintBrush.quaternion.setFromUnitVectors(V(0, -1, 0), bp.clone().sub(f.clone().add(V(0, 0.1, 0))).normalize().negate().add(V(0, -0.6, 0)).normalize());
      hand(b, 'R', S.paintBrush.position.clone().add(V(0.04, 0.16, 0.0)), V(-0.5, -0.8, 0.0), V(0.1, -0.2, 1));
      b.fingers('R', GRIPS.holdThin);
      hand(b, 'L', f.clone().add(V(0.12, 0.0, 0.17)), V(-0.6, -0.3, -0.4), V(0.2, -0.3, -1)); b.fingers('L', GRIPS.rim);
      b.look(f.clone().add(V(0, 0.1, 0)), 0.9);
      const u = seg(t, tD5, tE1, E.io);
      const ang = lerp(1.1, 0.25, u);
      const pos = [f.x + Math.sin(ang) * 0.42, f.y + lerp(0.06, 0.16, u), f.z + Math.cos(ang) * 0.48];
      return { cam: { pos, look: [f.x, f.y + 0.07, f.z], fov: 32, shake: 0.08 }, look: { focus: Math.hypot(pos[0] - f.x, pos[1] - f.y - 0.07, pos[2] - f.z), aper: 0.032, warm: 0.75, exposure: 1.5 }, shadowAt: [f.x, f.y, f.z], shadowSize: 0.9 };
    } });
  add({ id: 'E1', set: 'shop', start: tE1, note: 'He called it the Hard Boiled Hat — the stamp on the hat box',
    setup(W, lt, t) {
      const S = SH(), b = S.bullard, ph = S.paintHat, box = S.hatBox;
      atBench(b, -0.85, { lean: 16 });
      ph.group.visible = true; ph.group.position.set(...S.T(-0.1, -0.12)); ph.group.position.y += 0.012; ph.group.rotation.set(0, 0.6, 0); ph.group.scale.setScalar(1);
      ph.material().userData.uPaint.value = 1; ph.material().userData.uWet.value = 0.3;
      S.form.visible = false;
      const steam = S.steam.material.uniforms; steam.uOrigin.value.copy(ph.group.position).add(V(0, 0.11, 0)); steam.uAlpha.value = 0.16; steam.uSpread.value = 0.05; steam.uSize.value = 0.06;
      const lidTop = box.localToWorld(V(0, 0.193, 0));
      const press = kf(t, [[tE1, 0], [tE1 + 0.3, 1, E.in], [tE1 + 0.45, 1], [tE1 + 0.85, 0, E.out]]);
      const sp = lidTop.clone().add(V(0.0, 0.003 + 0.2 * (1 - press), 0));
      S.stamp.position.copy(sp); S.stamp.rotation.set(0, 0.5, 0);
      S.stampPrint.material.opacity = t > tE1 + 0.42 ? 1 : 0; S.stampPrint.visible = t > tE1 + 0.42;
      const knob = sp.clone().add(V(0, 0.12, 0)), toB = b.group.localToWorld(V(0, 1.1, 0)).sub(knob).setY(0).normalize();
      hand(b, 'R', knob.clone().addScaledVector(toB, 0.075).add(V(0, 0.035, 0)), toB.clone().negate().add(V(0, -0.35, 0)), V(0, -1, 0));
      b.fingers('R', GRIPS.hold);
      hand(b, 'L', lidTop.clone().add(V(0.22, 0.0, 0.08)), V(-1, -0.1, 0.2), V(0, -1, 0)); b.fingers('L', GRIPS.open);
      b.look(lidTop, 0.9);
      // camera: angled on the lid (print cropped), then pushes onto the hat for the match cut
      const u = seg(t, tE1, tF1, E.lin), push = seg(t, tF1 - 0.85, tF1, E.in);
      const hp = ph.group.position.clone().add(V(0, 0.06, 0));
      const p0 = lidTop.clone().add(V(0.42, 0.42, 0.22)), l0 = lidTop.clone().add(V(-0.03, 0, 0.0));
      const p1 = hp.clone().add(V(0.32, 0.06, 0.12));
      const pos = p0.clone().add(V(0, -0.05 * u, 0.04 * u)).lerp(p1, push), look = l0.clone().lerp(hp, push);
      return { cam: { pos: pos.toArray(), look: look.toArray(), fov: lerp(36, 30, push), shake: 0.08 }, look: { focus: pos.distanceTo(look), aper: 0.03, warm: 0.75, exposure: 1.5 }, shadowAt: lidTop.toArray(), shadowSize: 1.2, mb: push > 0.3 ? 4 : 1 };
    } });
  // ---------- F: 1933, the Golden Gate's south tower ----------
  const tF2 = 24.311 /* the music's drop */, tF3 = wt('america', 25.6) - 0.1, tF4 = wt('hard', 27.4) - 0.12;
  const BRS = () => W.sets.bridge;
  const wearBoiled = (h, hat) => { const head = h.bone('head'); if (hat.group.parent !== head) head.add(hat.group); hat.group.position.set(0, 0.152, -0.004); hat.group.rotation.set(-0.06, 0, 0); hat.group.scale.setScalar(1); };
  /** the crew at work, every bridge shot */
  const crew = (S, t, { gunOn = true } = {}) => {
    const a = S.i1, b = S.i2, c = S.i3;
    // iron1 rivets the gusset plate at chest height
    stand(a, 0.92, -0.95, Math.PI / 2, { y: 0.05, lean: 10 }); wearBoiled(a, S.hats.i1);
    const buzz = gunOn ? 0.004 * Math.sin(t * 190) : 0;
    const gp = V(1.53, 1.22 + buzz, -0.88);
    S.gun.position.copy(gp).add(V(-0.32, 0, 0)); S.gun.quaternion.setFromUnitVectors(V(0, 1, 0), V(1, 0, 0));
    hand(a, 'R', gp.clone().add(V(-0.36, -0.06, 0.02)), V(0.2, -0.2, 1), V(0, 0, -1).add(V(1, 0, 0)));
    hand(a, 'L', gp.clone().add(V(-0.2, 0.03, -0.05)), V(0.3, -0.5, -0.8), V(0, -1, 0));
    a.fingers('R', GRIPS.hold); a.fingers('L', GRIPS.hold);
    a.look(gp, 0.9);
    // iron2 up on the beam with tongs
    stand(b, 0.55, -1.22, Math.PI / 2 + 0.4, { y: 2.85, lean: 24 }); wearBoiled(b, S.hats.i2);
    hand(b, 'R', b.group.localToWorld(V(-0.15, 1.05, 0.38)), V(0.1, -0.5, 1).applyQuaternion(b.group.quaternion), V(1, 0, 0).applyQuaternion(b.group.quaternion));
    hand(b, 'L', b.group.localToWorld(V(0.18, 1.0, 0.3)), V(-0.1, -0.5, 1).applyQuaternion(b.group.quaternion), V(-1, 0, 0).applyQuaternion(b.group.quaternion));
    b.fingers('R', GRIPS.pinch); b.fingers('L', GRIPS.relax);
    b.look(V(1.0, 1.3, -0.9), 0.8);
    // iron3 hauls a line by the derrick
    stand(c, -1.9, -2.6, 0.6, { y: 0.05, lean: 16 }); wearBoiled(c, S.hats.i3);
    const pull = Math.sin(t * 2.4) * 0.08;
    hand(c, 'L', c.group.localToWorld(V(0.08, 1.25 + pull, 0.42)), V(0, 1, 0.3).applyQuaternion(c.group.quaternion), V(-1, 0, 0).applyQuaternion(c.group.quaternion));
    hand(c, 'R', c.group.localToWorld(V(-0.04, 1.0 + pull, 0.42)), V(0, 1, 0.3).applyQuaternion(c.group.quaternion), V(1, 0, 0).applyQuaternion(c.group.quaternion));
    c.fingers('L', GRIPS.fist); c.fingers('R', GRIPS.fist);
    c.look(c.group.localToWorld(V(0, 2.5, 2)), 0.6);
    // the sign is already up unless F4 animates it
    S.sign.position.set(-1.55, 1.25, 0.03); S.sign.rotation.set(0, 0, 0.0);
    S.hammer.position.set(-1.2, 0.02, 0.2); S.hammer.rotation.set(Math.PI / 2, 0, 0.5);
    S.rivet.position.set(0, -500, 0);
  };
  add({ id: 'F1', set: 'bridge', start: tF1, note: 'And in 1933 — match cut onto a Hard Boiled hat, pull back over the tower',
    setup(W, lt, t) {
      const S = BRS(); crew(S, t);
      const hp = S.i1.at('head', [0, 0.2, 0]);
      const u = seg(t, tF1, tF2, E.io);
      const p0 = hp.clone().add(V(-0.3, 0.06, 0.15)), p1 = V(-0.2, 2.3, 1.6);
      const pos = p0.lerp(p1, u), look = hp.clone().lerp(V(1.2, 0.2, -2.0), sstep(0.25, 1, u));
      return { cam: { pos: pos.toArray(), look: look.toArray(), fov: lerp(30, 42, u), shake: 0.12 }, look: { focus: pos.distanceTo(look), aper: lerp(0.03, 0.012, u), warm: 0.8 },
        shadowAt: [0.8, 0.8, -1.2], shadowSize: lerp(1.2, 3.5, u), mb: t < tF1 + 0.25 ? 4 : 1 };
    } });
  add({ id: 'F2', set: 'bridge', start: tF2, note: 'the Golden Gate Bridge became — orbit around the tower top at sunset',
    setup(W, lt, t) {
      const S = BRS(); crew(S, t);
      const u = seg(t, tF2, tF3, E.io);
      const a = lerp(1.0, 0.4, u), r = lerp(17, 14, u);
      const pos = [Math.sin(a) * r, lerp(4.0, 6.5, u), -1.5 + Math.cos(a) * r];
      return { cam: { pos, look: [lerp(-1.5, 0, u), lerp(-3, -1.5, u), -1.5], fov: 50, shake: 0.12 }, look: { focus: r, aper: 0.004, warm: 0.85 }, shadowAt: [0, 0, -1.5], shadowSize: 6 };
    } });
  add({ id: 'F3', set: 'bridge', start: tF3, note: "America's first official — a rivet drops and bounces off a hard hat",
    setup(W, lt, t) {
      const S = BRS(); crew(S, t);
      const hatTop = S.i1.at('head', [0, 0.28, 0.0]);
      const drop = tF3 + 0.35, hit = drop + 0.75;
      const slow = 0.42;
      if (t > drop) {
        const tt = Math.min(t, hit) - drop, start = S.i2.group.localToWorld(V(-0.15, 0.95, 0.42));
        if (t < hit) { const k = tt / (hit - drop); S.rivet.position.copy(start.clone().lerp(hatTop, k * k)); S.rivet.rotation.set(tt * 9, tt * 4, 0); }
        else { const u = (t - hit) * slow * 2.2; S.rivet.position.copy(hatTop).add(V(0.5 * u, 1.6 * u - 4.9 * u * u * 0.6, 0.35 * u)); S.rivet.rotation.set(u * 20, u * 12, 0); }
      } else S.rivet.position.copy(S.i2.group.localToWorld(V(-0.15, 0.95, 0.42)));
      // the hat takes the knock; he barely flinches and keeps working
      const k = t > hit ? Math.exp(-(t - hit) * 9) * Math.sin((t - hit) * 40) : 0;
      S.hats.i1.group.rotation.x = -0.06 + 0.05 * k; S.hats.i1.group.position.y = 0.152 - 0.004 * Math.abs(k);
      const u = seg(t, tF3, tF4, E.io);
      const pos = [lerp(-0.85, -0.75, u), lerp(2.15, 2.2, u), lerp(0.85, 0.7, u)];
      const look = [0.82, lerp(2.85, 2.65, u), -1.1];
      return { cam: { pos, look, fov: 52, shake: 0.1 + 0.4 * k * k }, look: { focus: V(...pos).distanceTo(hatTop), aper: 0.022, warm: 0.8 }, shadowAt: [0.9, 1.4, -1.0], shadowSize: 2.2 };
    } });
  add({ id: 'F4', set: 'bridge', start: tF4, note: 'Hard Hat Area — the sign is nailed up; pull back to the whole crew at sunset',
    setup(W, lt, t) {
      const S = BRS(); crew(S, t);
      // iron3 nails the sign instead of hauling
      const c = S.i3; c.reset();
      stand(c, -0.98, 0.42, -2.09, { y: 0.05, lean: 8 }); wearBoiled(c, S.hats.i3);
      S.sign.position.set(-1.55, 1.25, 0.03);
      const nail = S.sign.localToWorld(V(-0.33, 0.12, 0.03));
      const ph = ((t - tF4) * 2.6) % 1, strike = t < tF4 + 1.15;
      const up = strike ? kf(ph, [[0, 0], [0.6, 1, E.io], [0.75, 0, E.in], [1, 0]]) : 0.3;
      const hw = nail.clone().add(V(0.05 + 0.03 * up, 0.04 + 0.25 * up, 0.16 + 0.05 * up));
      const hd = nail.clone().sub(hw).normalize().lerp(V(0, 1, 0), up * 0.8).normalize();
      S.hammer.position.copy(hw); S.hammer.quaternion.setFromUnitVectors(V(0, 1, 0), hd);
      hand(c, 'R', hw.clone().add(V(0.03, -0.02, 0.05)), V(-1, 0, 0), hd.clone().negate()); c.fingers('R', GRIPS.holdThin);
      hand(c, 'L', S.sign.localToWorld(V(0.3, 0.0, 0.05)).add(V(0, 0, 0.06)), V(0, 0.2, -1), V(0, 0, -1)); c.fingers('L', GRIPS.open);
      c.look(nail, 0.9);
      const u = seg(t, tF4 + 0.5, T.dur, E.io);
      const p0 = V(-2.05, 1.38, 1.05), p1 = V(-3.4, 3.4, 6.2);
      const pos = p0.clone().lerp(p1, u), look = V(-1.5, 1.25, 0.03).lerp(V(2.0, 0.6, -6.0), u);
      const fade = seg(t, T.dur - 0.28, T.dur, E.in);
      return { cam: { pos: pos.toArray(), look: look.toArray(), fov: lerp(34, 44, u), shake: 0.1 }, look: { focus: pos.distanceTo(look), aper: lerp(0.03, 0.01, u), warm: 0.85, fade: 1 - fade },
        shadowAt: [-0.6, 0.8, -0.8], shadowSize: lerp(1.5, 4, u) };
    } });
  // ---------- sound cues (read by tools/mix.py via capture.mjs cues) ----------
  const C = (t, type, o = {}) => cues.push({ t: +t.toFixed(3), type, ...o });
  C(0, 'amb', { set: 'site', dur: 2.8 }); C(0.82, 'lift');
  C(1.7, 'whoosh', { dur: 0.6, f0: 350, f1: 1500, g: 0.7 }); C(2.02, 'shimmer', { dur: 0.6 }); C(2.47, 'whoosh', { dur: 0.42, f0: 1600, f1: 250, g: 1.0 });
  C(tB1, 'amb', { set: 'wind', dur: tC1 - tB1 + 0.2 }); C(tB1 + 0.26, 'catch'); C(tB1 + 0.85, 'clunk');
  for (let k = 0; k < 6; k++) { const t = (k + 0.05) / 0.62; if (t > tB1 && t < tC1) C(t, 'scrape', { g: 0.5 }); }
  for (let k = 0; k < 10; k++) { const t = (k + 0.7) / 1.25; if (t > tB1 && t < tB3) C(t, 'knock', { g: 0.28, pan: -0.4 }); }
  C(tB2 - 0.05, 'whoosh', { dur: 1.1, f0: 500, f1: 900, g: 0.45 }); C(tB3 + 0.32, 'pour', { dur: 0.9 });
  C(tC1, 'amb', { set: 'room', dur: tC2 - tC1 }); C(tC1 + 0.7, 'tink');
  C(tC2, 'amb', { set: 'wind', dur: tD1 - tC2, g: 0.7 }); C(tC2, 'cart', { dur: tD1 - tC2 });
  for (let k = 0; k < 14; k += 2) { const t0 = tC3 + 0.15 + k * 0.09 + (k % 3) * 0.05, fall = Math.sqrt(2 * (2.26 - 1.55) / 9.8) / 0.55; C(t0 + fall, 'pebble', { g: 0.5 + 0.08 * (k % 3) }); }
  C(tC3 + 0.1, 'grit', { dur: 1.6 });
  C(tD1, 'amb', { set: 'room', dur: tF1 - tD1 }); C(tD1 + 0.32, 'tear', { dur: 0.42 });
  C(tD2 - 0.05, 'whoosh', { dur: 1.5, f0: 300, f1: 700, g: 0.35 });
  C(tD3, 'steam', { dur: tD4 - tD3 + 0.3 }); C(tD3 + 0.15, 'cloth'); C(tD3 + 1.15, 'cloth', { g: 0.7 });
  C(tD4 - 0.03, 'whoosh', { dur: 0.4, f0: 900, f1: 400, g: 0.55 }); C(tD4 + 0.4, 'brush', { dur: 0.75, wet: 1 }); C(tD5 - 0.35, 'snap');
  C(tD5 + 0.12, 'brush', { dur: 1.1, wet: 0.6 });
  C(tE1 + 0.29, 'stamp'); C(tE1 + 0.9, 'steam', { dur: 1.3, g: 0.35 });
  C(tF1 - 0.18, 'whoosh', { dur: 0.42, f0: 1200, f1: 300, g: 0.7 });
  C(tF1, 'amb', { set: 'high', dur: T.dur - tF1 }); C(tF1 + 0.4, 'rivetgun', { dur: 1.1, g: 0.5 }); C(tF3 + 0.1, 'rivetgun', { dur: 0.5, g: 0.35 });
  C(tF3 + 0.35 + 0.75, 'tok');
  for (let k = 0; k < 3; k++) C(tF4 + (0.7 + k) / 2.6, 'knock', { g: 0.75, pan: -0.2 });
  return shots;
}
export { wt, clamp, sstep, D };
