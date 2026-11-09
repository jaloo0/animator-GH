// The human: a 51-bone skeleton (A-pose rest) and the sculpt of every part — head (face, ears, hair, mustache),
// both hands (15 finger bones each), and the clothed body for each outfit. All coordinates are world metres at rest.
import { Shape, add, sub, mul, len, norm, lerp3, qaxis, qmul, qrot, qid, qfromTo, vnoise } from './sdf.js';

const D = Math.PI / 180;
export const FINGERS = ['thumb', 'index', 'middle', 'ring', 'pinky'];
export const BONES = ['pelvis', 'spine', 'chest', 'neck', 'head', 'clavL', 'uarmL', 'farmL', 'handL', 'clavR', 'uarmR', 'farmR', 'handR',
  'thighL', 'shinL', 'footL', 'toeL', 'thighR', 'shinR', 'footR', 'toeR'];
for (const s of ['L', 'R']) for (const f of FINGERS) for (let k = 0; k < 3; k++) BONES.push(`${f}${k}${s}`);
export const BI = Object.fromEntries(BONES.map((n, i) => [n, i]));
export const PARENT = BONES.map((n) => {
  const m = n.match(/^(thumb|index|middle|ring|pinky)(\d)([LR])$/);
  if (m) return m[2] === '0' ? BI['hand' + m[3]] : BI[m[1] + (m[2] - 1) + m[3]];
  return { pelvis: -1, spine: 0, chest: 1, neck: 2, head: 3, clavL: 2, uarmL: 5, farmL: 6, handL: 7, clavR: 2, uarmR: 9, farmR: 10, handR: 11,
    thighL: 0, shinL: 13, footL: 14, toeL: 15, thighR: 0, shinR: 17, footR: 18, toeR: 19 }[n];
});

// mirror a point / rotation across the YZ plane (left → right)
const mx = (p) => [-p[0], p[1], p[2]];
const mq = (q) => [q[0], -q[1], -q[2], q[3]];

// ---------- skeleton ----------
export const ARM_A = 47 * D; // A-pose: arms 47° out from vertical
export const SEG = { uarm: 0.29, farm: 0.255, thigh: 0.42, shin: 0.415 };
const FDEF = { // hand-local (left): MCP joint, segment lengths, radii base→tip, spread (about X), rest curl per joint
  index: { m: [0.0, -0.094, 0.029], L: [0.041, 0.025, 0.021], r: [0.0092, 0.0085, 0.0079, 0.0072], s: 4, c: [6, 9, 6] },
  middle: { m: [0.0, -0.098, 0.0085], L: [0.046, 0.029, 0.022], r: [0.0095, 0.0088, 0.0081, 0.0074], s: 0, c: [7, 10, 6] },
  ring: { m: [-0.0012, -0.094, -0.0115], L: [0.043, 0.027, 0.021], r: [0.0089, 0.0082, 0.0076, 0.0069], s: -4, c: [8, 11, 7] },
  pinky: { m: [-0.003, -0.084, -0.0295], L: [0.033, 0.0195, 0.019], r: [0.0077, 0.0071, 0.0066, 0.006], s: -9, c: [9, 12, 8] },
  thumb: { m: [-0.011, -0.021, 0.019], L: [0.046, 0.033, 0.027], r: [0.0142, 0.0118, 0.0106, 0.0094], s: 0, c: [0, 8, 6] },
};
export const THUMB_DIR = norm([-0.42, -0.58, 0.70]);

function handFrame(side) {
  const sh = [0.178, 1.435, -0.02], dir = [Math.sin(ARM_A), -Math.cos(ARM_A), 0];
  const elbow = add(sh, mul(dir, SEG.uarm)), wrist = add(elbow, mul(dir, SEG.farm));
  const q = qaxis([0, 0, 1], ARM_A);
  return side === 'L' ? { sh, elbow, wrist, q } : { sh: mx(sh), elbow: mx(elbow), wrist: mx(wrist), q: mq(q) };
}
/** finger joint chain in hand-local (left) coords: points p0..p3 and per-segment local rotations */
function fingerChain(name) {
  const f = FDEF[name];
  let q = name === 'thumb' ? qmul(qfromTo([0, -1, 0], THUMB_DIR), qaxis([0, 1, 0], -55 * D)) : qaxis([1, 0, 0], f.s * D);
  const pts = [f.m], qs = [];
  for (let k = 0; k < 3; k++) {
    q = qmul(q, qaxis([0, 0, 1], -f.c[k] * D)); // curl toward the palm (-X)
    qs.push(q);
    pts.push(add(pts[k], qrot(q, [0, -f.L[k], 0])));
  }
  return { pts, qs, f };
}

export function skeleton() {
  const B = {};
  const set = (n, pos, q = qid()) => (B[n] = { pos, q });
  set('pelvis', [0, 0.955, 0]); set('spine', [0, 1.06, 0.0]); set('chest', [0, 1.21, -0.01]);
  set('neck', [0, 1.455, -0.03]); set('head', [0, 1.565, -0.012]);
  for (const s of ['L', 'R']) {
    const hf = handFrame(s), sg = s === 'L' ? 1 : -1;
    set('clav' + s, [0.03 * sg, 1.425, 0.02]);
    set('uarm' + s, hf.sh, hf.q); set('farm' + s, hf.elbow, hf.q); set('hand' + s, hf.wrist, hf.q);
    const hip = [0.092 * sg, 0.925, 0], knee = [0.097 * sg, 0.505, 0.012], ank = [0.1 * sg, 0.09, -0.012];
    set('thigh' + s, hip, qfromTo([0, -1, 0], sub(knee, hip))); set('shin' + s, knee, qfromTo([0, -1, 0], sub(ank, knee)));
    set('foot' + s, ank); set('toe' + s, [0.1 * sg, 0.022, 0.125]);
    for (const fn of FINGERS) {
      const ch = fingerChain(fn);
      for (let k = 0; k < 3; k++) {
        let p = ch.pts[k], q = ch.qs[k];
        if (s === 'R') { p = mx(p); q = mq(q); }
        set(`${fn}${k}${s}`, add(hf.wrist, qrot(hf.q, p)), qmul(hf.q, q));
      }
    }
  }
  return BONES.map((n, i) => ({ name: n, parent: PARENT[i], pos: B[n].pos, q: B[n].q }));
}

// ---------- materials ----------
export const M = { skin: 0, shirt: 1, coat: 2, pants: 3, boot: 4, hair: 5, belt: 6, vest: 7, apron: 8, hivis: 9, metal: 10, puttee: 11, reflect: 12, sole: 13, lip: 14, strap: 15 };

// ---------- head ----------
const HEAD0 = [0, 1.565, -0.012];
export const EYE = { x: 0.032, y: 0.0975, z: 0.0752, r: 0.0118 }; // head-local
export function headShape(spec) {
  const F = { nose: 1, jaw: 1, brow: 1, cheek: 1, chin: 1, lips: 1, ear: 1, skull: 1, ...(spec.face || {}) };
  const s = new Shape(), hb = BI.head, nb = BI.neck;
  const P = (x, y, z) => add(HEAD0, [x, y, z]);
  const both = (fn) => { fn(1); fn(-1); };
  const wr = 0.05, ex = EYE.x, ey = EYE.y, ez = EYE.z;
  // skull + face masses
  s.ell(P(0, 0.112, -0.01), [0.0765 * F.skull, 0.1, 0.1], { bone: hb, wr });
  s.ell(P(0, 0.134, 0.038), [0.066, 0.058, 0.06], { bone: hb, k: 0.03, wr });
  s.ell(P(0, 0.068, 0.046), [0.062 * F.jaw, 0.058, 0.054], { bone: hb, k: 0.03, wr });
  both((g) => s.ell(P(0.05 * g * F.jaw, 0.045, 0.026), [0.0145, 0.03, 0.028], { bone: hb, k: 0.025, wr })); // masseter
  both((g) => s.ell(P(0.058 * g, 0.118, 0.035), [0.016, 0.03, 0.035], { bone: hb, k: 0.03, wr })); // temples
  both((g) => s.ell(P(0.041 * g, 0.068, 0.064), [0.02, 0.022, 0.02], { bone: hb, k: 0.025, wr })); // cheeks
  both((g) => s.ell(P(0.049 * g * F.cheek, 0.084, 0.058), [0.022, 0.016, 0.024], { bone: hb, k: 0.02, wr }));
  both((g) => s.cone(P(0.057 * g * F.jaw, 0.04, -0.008), P(0.03 * g, -0.004, 0.07), 0.019, 0.0165, { bone: hb, k: 0.024, wr }));
  s.ell(P(0, -0.003, 0.083), [0.026 * F.chin, 0.0185, 0.0175], { bone: hb, k: 0.02, wr });
  s.ell(P(0, 0.037, 0.082), [0.033, 0.029, 0.029], { bone: hb, k: 0.02, wr });
  // brow ridge
  both((g) => s.cone(P(0.052 * g, 0.114, 0.071), P(0.011 * g, 0.119, 0.091), 0.0102 * F.brow, 0.0112 * F.brow, { bone: hb, k: 0.016, wr }));
  // eye sockets + lids (eyeballs are separate meshes at EYE)
  both((g) => s.ell(P(ex * g, ey + 0.004, 0.086), [0.017, 0.0115, 0.0085], { op: 'sub', k: 0.01, bone: hb }));
  both((g) => s.ell(P(ex * g, ey, ez), [0.0131, 0.0131, 0.0131], { bone: hb, k: 0.0045, wr }));
  both((g) => s.ell(P(ex * g, ey + 0.0006, ez + 0.0128), [0.0128, 0.0049, 0.0122], { op: 'sub', k: 0.0012, bone: hb, q: qaxis([0, 0, 1], 6 * D * g) }));
  // upper lid crease
  both((g) => s.cone(P(ex * g - 0.012 * g, ey + 0.0105, ez + 0.0085), P(ex * g + 0.012 * g, ey + 0.011, ez + 0.0065), 0.0016, 0.0016, { op: 'sub', k: 0.0025, bone: hb }));
  // nose
  const n = F.nose;
  s.cone(P(0, 0.101, 0.09), P(0, 0.064, 0.09 + 0.026 * n), 0.008, 0.0098, { bone: hb, k: 0.012, wr });
  s.ell(P(0, 0.058, 0.089 + 0.026 * n), [0.012, 0.0106, 0.0115], { bone: hb, k: 0.008, wr });
  both((g) => s.ell(P(0.0132 * g, 0.0535, 0.1), [0.0084, 0.0074, 0.0086], { bone: hb, k: 0.006, wr }));
  both((g) => s.ell(P(0.0068 * g, 0.0482, 0.086 + 0.025 * n), [0.0034, 0.0022, 0.0042], { op: 'sub', k: 0.0022, bone: hb }));
  // lips
  s.ell(P(0, 0.0302, 0.1015), [0.0232 * F.lips, 0.0066, 0.0084], { bone: hb, k: 0.006, wr });
  s.ell(P(0, 0.0182, 0.0985), [0.0205 * F.lips, 0.0074, 0.0088], { bone: hb, k: 0.0055, wr });
  // ears
  both((g) => {
    const q = qmul(qaxis([0, 1, 0], -16 * D * g), qaxis([1, 0, 0], -8 * D));
    s.ell(P(0.076 * g, 0.08, -0.008), [0.0092, 0.031 * F.ear, 0.0185 * F.ear], { bone: hb, k: 0.006, wr, q });
    s.ell(P(0.0825 * g, 0.077, -0.004), [0.0056, 0.0155, 0.0095], { op: 'sub', k: 0.004, bone: hb, q });
  });
  // neck (upper half follows the head, base follows the chest)
  s.cone(P(0, 0.035, -0.02), P(0, -0.06, -0.02), 0.05, 0.053, { bone: hb, k: 0.03, wr: 0.035 });
  s.cone(P(0, -0.05, -0.02), P(0, -0.13, -0.022), 0.053, 0.058, { bone: nb, k: 0.03, wr: 0.06 });
  s.ell(P(0, -0.135, -0.02), [0.07, 0.03, 0.058], { bone: BI.chest, k: 0.03, wr: 0.03 });
  if (spec.adam !== false) s.ell(P(0, -0.03, 0.033), [0.0105, 0.016, 0.0095], { bone: nb, k: 0.012, wr });
  // hair: a smooth cap (strands are a shader bump)
  if (spec.hair && spec.hair !== 'none') {
    const top = spec.hair === 'short' ? 0.012 : 0.0035;
    const lump = (lx, ly, lz) => 0.0015 * (vnoise(lx * 26, ly * 26, lz * 26) - 0.5);
    const o = s.ell(P(0, 0.12, -0.01), [0.0795 * F.skull + top * 0.45, 0.1 + top, 0.103 + top * 0.6], { bone: hb, k: 0.004, wr, mat: M.hair, fold: lump, foldAmp: 0.001, cutK: 0.008 });
    o.cut = [
      mkPrim('box', P(0, -0.008, 0.07), [0.12, 0.163, 0.1], 0.04, qaxis([1, 0, 0], 24 * D)),
      mkPrim('ell', P(0.071, 0.06, 0.004), [0.03, 0.05, 0.04]), mkPrim('ell', P(-0.071, 0.06, 0.004), [0.03, 0.05, 0.04]),
      mkPrim('box', P(0, -0.02, -0.06), [0.12, 0.07, 0.1], 0.03, qaxis([1, 0, 0], -18 * D)),
    ];
    if (spec.part) s.cone(P(0.03, 0.21, 0.07), P(0.033, 0.222, -0.03), 0.0022, 0.0014, { op: 'sub', k: 0.003, bone: hb });
  }
  if (spec.mustache) {
    both((g) => s.ell(P(0.011 * g, 0.0385, 0.1065), [0.0135, 0.0052, 0.0068], { bone: hb, k: 0.003, wr, mat: M.hair, q: qmul(qaxis([0, 0, 1], -12 * D * g), qaxis([0, 1, 0], 16 * D * g)) }));
  }
  return { shape: s, bmin: add(HEAD0, [-0.105, -0.17, -0.13]), bmax: add(HEAD0, [0.105, 0.24, 0.145]), h: 0.0017 };
}
function mkPrim(t, pos, p, r, q) {
  const tmp = new Shape();
  if (t === 'box') return tmp.box(pos, p, r, { q });
  return tmp.ell(pos, p, { q: r });
}

/** per-vertex masks for the head: [lip, brow, stubble, lid line] */
export function headMasks(spec, pos) {
  const n = pos.length / 3, out = new Uint8Array(n * 4);
  const L = (p) => sub(p, HEAD0);
  const segD = (p, a, b) => { const ab = sub(b, a), t = Math.max(0, Math.min(1, ((p[0] - a[0]) * ab[0] + (p[1] - a[1]) * ab[1] + (p[2] - a[2]) * ab[2]) / (ab[0] ** 2 + ab[1] ** 2 + ab[2] ** 2))); return len(sub(p, add(a, mul(ab, t)))); };
  const ell = (p, c, r) => Math.hypot((p[0] - c[0]) / r[0], (p[1] - c[1]) / r[1], (p[2] - c[2]) / r[2]);
  const sm = (e0, e1, x) => { const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };
  const F = { lips: 1, ...(spec.face || {}) };
  for (let v = 0; v < n; v++) {
    const p = L([pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2]]);
    const lu = ell(p, [0, 0.0302, 0.1015], [0.0232 * F.lips, 0.0072, 0.0094]), ll = ell(p, [0, 0.0185, 0.0985], [0.0202 * F.lips, 0.0072, 0.0094]);
    const lip = (1 - sm(0.82, 1.1, Math.min(lu, ll))) * sm(0.092, 0.098, p[2]);
    const q = [Math.abs(p[0]), p[1], p[2]];
    const q2 = [q[0], q[1], 0];
    const bd = (p[2] > 0.06 ? 0 : 1) + Math.min(segD(q2, [0.012, 0.1185, 0], [0.032, 0.1245, 0]), segD(q2, [0.032, 0.1245, 0], [0.054, 0.1185, 0]));
    const taper = 1 - 0.45 * sm(0.03, 0.055, q[0]);
    const brow = (1 - sm(0.0026 * taper, 0.0052 * taper, bd)) * (spec.brow ?? 1);
    const beardZone = (1 - sm(0.92, 1.08, ell(p, [0, 0.017, 0.05], [0.07, 0.057, 0.075]))) * sm(-0.026, -0.006, p[1]) * (1 - lip);
    const cheekCut = sm(0.06, 0.075, p[1]) * sm(0.02, 0.04, q[0]);
    const stub = Math.max(0, beardZone * (1 - cheekCut)) * (spec.stubble ?? 0.5);
    const ap = ell(q, [EYE.x, EYE.y + 0.0006, EYE.z + 0.0128], [0.0128, 0.005, 0.0122]);
    const lid0 = (1 - sm(1.0, 1.22, ap)) * sm(EYE.z + 0.005, EYE.z + 0.01, p[2]);
    const mouth = (1 - sm(0.0006, 0.0018, Math.abs(p[1] - 0.0244 + 0.02 * p[0] * p[0] / 0.0004 * 0.0))) * (1 - sm(0.017, 0.021, q[0])) * sm(0.095, 0.1, p[2]);
    const lid = Math.max(lid0, mouth * 0.9);
    out[v * 4] = lip * 255; out[v * 4 + 1] = brow * 255; out[v * 4 + 2] = stub * 255; out[v * 4 + 3] = lid * 255;
  }
  return out;
}

// ---------- hands ----------
export function handShape(side, spec) {
  const hf = handFrame(side), sg = side === 'L' ? 1 : -1;
  const H = (p) => add(hf.wrist, qrot(hf.q, side === 'L' ? p : mx(p)));
  const HQ = (q) => qmul(hf.q, side === 'L' ? q : mq(q));
  const s = new Shape(), hb = BI['hand' + side], fb = BI['farm' + side];
  const wr = 0.025;
  // palm
  s.box(H([0.0005, -0.056, 0.0005]), [0.0125, 0.042, 0.039], 0.0115, { bone: hb, wr: 0.03, q: HQ(qid()) });
  s.ell(H([0.0, -0.014, 0.0]), [0.0158, 0.03, 0.0295], { bone: hb, k: 0.02, wr: 0.02, q: HQ(qid()) });
  s.ell(H([-0.0105, -0.043, 0.02]), [0.0125, 0.031, 0.0175], { bone: BI['thumb0' + side], k: 0.016, wr: 0.012, q: HQ(qaxis([1, 0, 0], -20 * D)), wgain: 0.6 });
  s.ell(H([-0.0085, -0.052, -0.027]), [0.0095, 0.036, 0.0135], { bone: hb, k: 0.012, wr, q: HQ(qid()) });
  s.ell(H([-0.009, -0.086, 0.0]), [0.0085, 0.012, 0.038], { bone: hb, k: 0.012, wr, q: HQ(qid()) }); // pads under the knuckles
  // fingers
  for (const fn of FINGERS) {
    const ch = fingerChain(fn), f = ch.f;
    if (fn !== 'thumb') s.ell(H(add(f.m, [0.0055, 0.002, 0])), [0.0088, 0.0085, f.r[0] * 0.95], { bone: hb, k: 0.008, wr: 0.012, q: HQ(qid()) });
    for (let k = 0; k < 3; k++) {
      const a = H(ch.pts[k]), b = H(ch.pts[k + 1]);
      s.cone(a, b, f.r[k], f.r[k + 1], { bone: BI[`${fn}${k}${side}`], k: k === 0 ? 0.008 : 0.0035, wr: 0.011, tag: `${fn}${k}` });
      if (k > 0) s.ell(a, [f.r[k] * 1.07, f.r[k] * 0.95, f.r[k] * 1.07], { bone: BI[`${fn}${k}${side}`], k: 0.004, wr: 0.008, q: HQ(ch.qs[k]) }); // knuckle
    }
  }
  // wrist / forearm
  if (spec.bareForearm) {
    s.cone(H([0, 0.0, 0]), H([0, 0.13, 0]), 0.0262, 0.034, { bone: fb, k: 0.02, wr: 0.04 });
    s.ell(H([0.004, 0.17, 0.0]), [0.04, 0.085, 0.037], { bone: fb, k: 0.03, wr: 0.04, q: HQ(qid()) });
    s.cone(H([0, 0.2, 0]), H([0, 0.272, 0.0]), 0.038, 0.036, { bone: BI['uarm' + side], k: 0.02, wr: 0.035 });
  } else {
    s.cone(H([0, 0.0, 0]), H([0, 0.075, 0]), 0.0258, 0.029, { bone: fb, k: 0.02, wr: 0.04 });
  }
  // grid in hand-local space
  const ext = spec.bareForearm ? 0.3 : 0.1;
  const xf = (p) => H(p);
  return { shape: s, bmin: [-0.045, -0.235, -0.07], bmax: [0.045, ext, 0.095], h: 0.0012, xf, frame: hf, sg };
}
/** hand masks: [nail, knuckle crease, 0, 0] */
export function handMasks(side, pos) {
  const hf = handFrame(side), n = pos.length / 3, out = new Uint8Array(n * 4);
  const invq = [-hf.q[0], -hf.q[1], -hf.q[2], hf.q[3]];
  const sm = (e0, e1, x) => { const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };
  const chains = Object.fromEntries(FINGERS.map((f) => [f, fingerChain(f)]));
  for (let v = 0; v < n; v++) {
    let p = qrot(invq, sub([pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2]], hf.wrist));
    if (side === 'R') p = mx(p);
    let nail = 0;
    for (const fn of FINGERS) {
      const ch = chains[fn], a = ch.pts[2], b = ch.pts[3], q = ch.qs[2];
      const lp = qrot([-q[0], -q[1], -q[2], q[3]], sub(p, a)); // distal-phalanx local: -Y along, +X dorsal
      const L = ch.f.L[2], t = -lp[1] / L;
      const r = ch.f.r[3];
      const dorsal = fn === 'thumb' ? lp[0] : lp[0];
      const m = sm(0.3, 0.42, t) * (1 - sm(1.02, 1.12, t)) * sm(r * 0.25, r * 0.6, dorsal) * (1 - sm(r * 0.62, r * 0.82, Math.abs(lp[2])));
      nail = Math.max(nail, m);
    }
    out[v * 4] = nail * 255;
  }
  return out;
}

// ---------- body + clothes ----------
/** outfit flags: top: 'tunic'|'shirt'|'tee'|'workshirt'; sleeves: 'long'|'rolled'; vest: null|'waist'|'hivis'; legs: 'breeches'|'trousers';
 *  puttees, apron, overalls, suspenders, belt: 'webbing'|'leather'|null */
export function bodyShape(spec) {
  const o = spec.outfit || {};
  const s = new Shape();
  const B = BI;
  const top = o.top || 'shirt', topMat = top === 'tunic' ? M.coat : M.shirt;
  const wr = 0.06;
  const fab = (amp, f1, f2) => (lx, ly, lz) => amp * (Math.sin(ly * f1 + 1.7 * Math.sin(lx * f2 + lz * 13)) * 0.6 + (vnoise(lx * 18, ly * 18, lz * 18) - 0.5) * 1.2);
  const torsoFold = fab(0.0035, 60, 22);
  // pelvis + torso
  s.ell([0, 0.955, -0.006], [0.165, 0.112, 0.112], { bone: B.pelvis, mat: M.pants, wr: 0.08 });
  for (const g of [1, -1]) s.ell([0.062 * g, 0.9, -0.048], [0.085, 0.1, 0.08], { bone: B.pelvis, mat: M.pants, k: 0.04, wr: 0.05 });
  s.ell([0, 1.085, 0.002], [0.148, 0.125, 0.108], { bone: B.spine, mat: topMat, k: 0.06, wr: 0.09, fold: torsoFold, foldAmp: 0.005 });
  s.ell([0, 1.275, -0.008], [0.165, 0.172, 0.116], { bone: B.chest, mat: topMat, k: 0.06, wr: 0.1, fold: torsoFold, foldAmp: 0.005 });
  for (const g of [1, -1]) s.ell([0.064 * g, 1.31, 0.058], [0.074, 0.06, 0.05], { bone: B.chest, mat: topMat, k: 0.04, wr: 0.05 });
  for (const g of [1, -1]) s.cone([0.045 * g, 1.462, -0.032], [0.16 * g, 1.43, -0.025], 0.046, 0.045, { bone: B['clav' + (g > 0 ? 'L' : 'R')], mat: topMat, k: 0.05, wr: 0.05 });
  s.ell([0, 1.38, -0.06], [0.13, 0.09, 0.06], { bone: B.chest, mat: topMat, k: 0.05, wr: 0.06 }); // upper back
  // arms (sleeves)
  for (const side of ['L', 'R']) {
    const g = side === 'L' ? 1 : -1, hf = handFrame(side), dir = norm(sub(hf.wrist, hf.elbow));
    const ub = B['uarm' + side], fb = B['farm' + side];
    const sleeveFold = fab(0.003, 70, 30);
    s.ell(add(hf.sh, [0.006 * g, -0.012, 0.0]), [0.05, 0.056, 0.054], { bone: ub, mat: topMat, k: 0.045, wr: 0.05, wgain: 0.8 }); // deltoid
    s.cone(hf.sh, hf.elbow, 0.047, 0.04, { bone: ub, mat: topMat, k: 0.03, wr: 0.06, fold: sleeveFold, foldAmp: 0.004 });
    s.ell(add(lerp3(hf.sh, hf.elbow, 0.45), [0, 0, 0.01]), [0.04, 0.07, 0.041], { bone: ub, mat: topMat, k: 0.03, wr: 0.04, q: qfromTo([0, 1, 0], dir) });
    if (o.sleeves === 'rolled') {
      s.tor(add(hf.elbow, mul(dir, 0.012)), 0.039, 0.0135, { bone: ub, mat: topMat, k: 0.008, wr: 0.03, q: qfromTo([0, 1, 0], dir), fold: fab(0.002, 120, 60), foldAmp: 0.003 });
    } else {
      s.cone(hf.elbow, sub(hf.wrist, mul(dir, -0.012)), 0.042, 0.035, { bone: fb, mat: topMat, k: 0.025, wr: 0.07, fold: sleeveFold, foldAmp: 0.004 });
      s.tor(sub(hf.wrist, mul(dir, 0.012)), 0.031, 0.006, { bone: fb, mat: topMat, k: 0.006, wr: 0.03, q: qfromTo([0, 1, 0], dir) }); // cuff
      // open the cuff so the hand mesh shows through
      s.cone(sub(hf.wrist, mul(dir, -0.03)), sub(hf.wrist, mul(dir, 0.03)), 0.0265, 0.0265, { op: 'sub', k: 0.004, bone: fb });
    }
  }
  // legs
  for (const side of ['L', 'R']) {
    const g = side === 'L' ? 1 : -1;
    const hip = [0.092 * g, 0.925, 0], knee = [0.097 * g, 0.505, 0.012], ank = [0.1 * g, 0.09, -0.012];
    const tb = B['thigh' + side], sb = B['shin' + side], fb = B['foot' + side];
    const legFold = fab(0.003, 55, 25);
    const breeches = o.legs === 'breeches';
    s.cone(hip, knee, 0.086, 0.058, { bone: tb, mat: M.pants, k: 0.04, wr: 0.08, fold: legFold, foldAmp: 0.004 });
    if (breeches) s.ell(add(lerp3(hip, knee, 0.42), [0.022 * g, 0, -0.005]), [0.075, 0.13, 0.072], { bone: tb, mat: M.pants, k: 0.04, wr: 0.05 });
    if (o.puttees) {
      s.cone(knee, ank, 0.058, 0.042, { bone: sb, mat: M.pants, k: 0.02, wr: 0.07 });
      const spiral = (lx, ly, lz) => 0.0016 * Math.abs(Math.sin(ly * 95 + Math.atan2(lz, lx) * 0.5)) - 0.0008;
      s.cone(sub(knee, [0, 0.07, 0]), sub(ank, [0, 0.0, 0]), 0.053, 0.044, { bone: sb, mat: M.puttee, k: 0.004, wr: 0.07, fold: spiral, foldAmp: 0.002 });
    } else {
      s.cone(knee, add(ank, [0, 0.03, 0]), 0.058, 0.05, { bone: sb, mat: M.pants, k: 0.02, wr: 0.07, fold: legFold, foldAmp: 0.004 });
    }
    // boot
    s.cone(add(ank, [0, 0.07, 0]), add(ank, [0, -0.03, -0.005]), 0.045, 0.048, { bone: fb, mat: M.boot, k: 0.02, wr: 0.05 });
    s.box([0.1 * g, 0.045, 0.045], [0.046, 0.045, 0.128], 0.04, { bone: fb, mat: M.boot, k: 0.025, wr: 0.05 });
    s.box([0.1 * g, 0.075, 0.13], [0.04, 0.03, 0.05], 0.03, { bone: B['toe' + side], mat: M.boot, k: 0.03, wr: 0.04 });
    s.box([0.1 * g, 0.012, 0.05], [0.05, 0.012, 0.135], 0.01, { bone: fb, mat: M.sole, k: 0.004, wr: 0.04, noWeight: false });
  }
  // ---- outfit layers ----
  if (top === 'tunic') {
    // skirt of the service coat
    s.cone([0, 1.02, 0.0], [0, 0.78, -0.004], 0.16, 0.19, { bone: B.pelvis, mat: M.coat, k: 0.05, wr: 0.05, fold: fab(0.004, 40, 18), foldAmp: 0.005 });
    s.tor([0, 1.455, -0.022], 0.056, 0.0145, { bone: B.neck, mat: M.coat, k: 0.012, wr: 0.04, q: qaxis([1, 0, 0], 12 * D) }); // stand collar
    // pockets + flaps
    for (const g of [1, -1]) {
      s.box([0.075 * g, 1.3, 0.112], [0.042, 0.05, 0.012], 0.01, { bone: B.chest, mat: M.coat, k: 0.008, wr: 0.04, q: qaxis([0, 1, 0], 20 * D * g) });
      s.box([0.077 * g, 1.345, 0.118], [0.045, 0.013, 0.012], 0.008, { bone: B.chest, mat: M.coat, k: 0.004, wr: 0.04, q: qaxis([0, 1, 0], 20 * D * g) });
      s.box([0.1 * g, 0.92, 0.12], [0.06, 0.07, 0.014], 0.012, { bone: B.pelvis, mat: M.coat, k: 0.01, wr: 0.04, q: qaxis([0, 1, 0], 24 * D * g) });
    }
    for (let i = 0; i < 5; i++) s.cyl([0, 1.4 - i * 0.085, 0.125 - (i > 2 ? 0.005 : 0)], 0.008, 0.003, 0.002, { bone: i < 3 ? B.chest : B.spine, mat: M.metal, k: 0.002, wr: 0.03, q: qaxis([1, 0, 0], 90 * D) });
  }
  if (top === 'tee' || top === 'workshirt' || top === 'shirt') {
    s.cone([0, 1.445, -0.024], [0, 1.488, -0.018], 0.064, 0.059, { bone: B.neck, mat: M.shirt, k: 0.012, wr: 0.04 }); // collar band
    s.cone([0, 1.43, -0.024], [0, 1.5, -0.016], 0.053, 0.053, { op: 'sub', k: 0.004, bone: B.neck });
    if (top !== 'tee') for (let i = 0; i < 4; i++) s.cyl([0, 1.4 - i * 0.09, 0.118 - (i > 1 ? 0.008 : 0)], 0.0055, 0.002, 0.0015, { bone: i < 2 ? B.chest : B.spine, mat: M.metal, k: 0.002, wr: 0.03, q: qaxis([1, 0, 0], 90 * D) });
  }
  // garment shells: offsets of the torso, trimmed by armholes / neckline / hem
  const torso = new Shape();
  torso.ell([0, 1.085, 0.002], [0.148, 0.125, 0.108]); torso.ell([0, 1.275, -0.008], [0.165, 0.172, 0.116], { k: 0.06 });
  for (const g of [1, -1]) torso.ell([0.064 * g, 1.31, 0.058], [0.074, 0.06, 0.05], { k: 0.04 });
  torso.ell([0, 1.38, -0.06], [0.13, 0.09, 0.06], { k: 0.05 }); torso.ell([0, 0.98, -0.004], [0.158, 0.08, 0.11], { k: 0.05 });
  const armholes = (r) => [mkPrim('ell', [0.178, 1.37, -0.012], [0.07, r, 0.09]), mkPrim('ell', [-0.178, 1.37, -0.012], [0.07, r, 0.09])];
  if (o.vest === 'waist') {
    s.shell(torso, 0.007, { bone: B.chest, mat: M.vest, k: 0.0, wr: 0.09, fold: fab(0.0015, 50, 20), foldAmp: 0.002,
      cut: [mkPrim('box', [0, 1.44, 0.14], [0.05, 0.16, 0.1], 0.03, qaxis([1, 0, 0], -8 * D)), ...armholes(0.1), mkPrim('box', [0, 1.5, 0], [0.3, 0.04, 0.3], 0.0)],
      within: [mkPrim('box', [0, 1.225, 0], [0.4, 0.26, 0.4], 0.0)] });
    for (let i = 0; i < 5; i++) s.cyl([0, 1.255 - i * 0.048, 0.126 + (i > 2 ? -0.003 : 0)], 0.0055, 0.0025, 0.0015, { bone: i < 2 ? B.chest : B.spine, mat: M.metal, k: 0.002, wr: 0.03, q: qaxis([1, 0, 0], 90 * D) });
  }
  if (o.vest === 'hivis') {
    s.shell(torso, 0.012, { bone: B.chest, mat: M.hivis, k: 0.0, wr: 0.09, fold: fab(0.0025, 40, 16), foldAmp: 0.003,
      cut: [mkPrim('box', [0, 1.5, 0.15], [0.055, 0.13, 0.1], 0.04, qaxis([1, 0, 0], -8 * D)), mkPrim('ell', [0, 1.47, 0.0], [0.085, 0.06, 0.09]), ...armholes(0.11), mkPrim('box', [0, 1.53, 0], [0.3, 0.04, 0.3], 0.0)],
      within: [mkPrim('box', [0, 1.21, 0], [0.4, 0.26, 0.4], 0.0)] });
    for (const yb of [1.15, 1.06]) s.push({ t: 'box', f: mkPrim('box', [0, yb, 0], [0.3, 0.0135, 0.3], 0).f, p: [0.3, 0.0135, 0.3, 0], bs: [0, yb, 0, 0.45], op: 'paint', mat: M.reflect });
  }
  if (o.overalls) {
    s.box([0, 1.2, 0.085], [0.11, 0.1, 0.04], 0.03, { bone: B.chest, mat: M.pants, k: 0.004, wr: 0.06, fold: fab(0.0015, 50, 20), foldAmp: 0.002 }); // bib
    for (const g of [1, -1]) s.cone([0.085 * g, 1.29, 0.11], [0.09 * g, 1.46, -0.03], 0.012, 0.012, { bone: B.chest, mat: M.strap, k: 0.003, wr: 0.05 });
    for (const g of [1, -1]) s.cone([0.09 * g, 1.46, -0.03], [0.04 * g, 1.06, -0.1], 0.011, 0.011, { bone: B.chest, mat: M.strap, k: 0.006, wr: 0.05 });
    s.ell([0, 1.0, 0.0], [0.152, 0.075, 0.113], { bone: B.pelvis, mat: M.pants, k: 0.03, wr: 0.06 });
  }
  if (o.suspenders) for (const g of [1, -1]) {
    s.cone([0.075 * g, 1.02, 0.11], [0.09 * g, 1.46, -0.025], 0.01, 0.01, { bone: B.chest, mat: M.strap, k: 0.002, wr: 0.05 });
    s.cone([0.09 * g, 1.46, -0.025], [0.03 * g, 1.02, -0.12], 0.01, 0.01, { bone: B.chest, mat: M.strap, k: 0.002, wr: 0.05 });
  }
  if (o.apron) {
    s.box([0, 0.86, 0.125], [0.17, 0.28, 0.012], 0.01, { bone: B.pelvis, mat: M.apron, k: 0.03, wr: 0.07, q: qaxis([1, 0, 0], -5 * D), fold: fab(0.003, 30, 12), foldAmp: 0.004 });
    s.box([0, 1.25, 0.122], [0.12, 0.13, 0.01], 0.01, { bone: B.chest, mat: M.apron, k: 0.03, wr: 0.07 });
  }
  if (o.belt) {
    s.cone([0, 1.03, 0.004], [0, 0.985, 0.004], 0.152, 0.158, { bone: B.pelvis, mat: M.belt, k: 0.004, wr: 0.06, q: qid() });
    if (o.belt === 'webbing') for (let i = -3; i <= 3; i++) {
      const a = (i * 22) * D;
      s.box([Math.sin(a) * 0.162, 0.99, Math.cos(a) * 0.125 + 0.008], [0.022, 0.03, 0.014], 0.008, { bone: B.pelvis, mat: M.belt, k: 0.004, wr: 0.05, q: qaxis([0, 1, 0], a) });
    }
    s.box([0, 1.008, 0.165], [0.025, 0.02, 0.006], 0.003, { bone: B.pelvis, mat: M.metal, k: 0.002, wr: 0.04 });
  }
  return { shape: s, bmin: [-0.64, -0.01, -0.22], bmax: [0.64, 1.56, 0.26], h: 0.0052 };
}
