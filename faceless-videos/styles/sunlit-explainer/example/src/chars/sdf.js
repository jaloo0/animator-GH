// Signed-distance sculpting kit (pure JS, runs in node and the browser): primitives in their own frames,
// smooth union / carve, per-primitive bone + material tags, narrow-band surface nets with Newton projection,
// and per-vertex skin weights / masks / baked SDF ambient occlusion.

// ---------- tiny math (arrays) ----------
export const v3 = (x = 0, y = 0, z = 0) => [x, y, z];
export const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
export const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const len = (a) => Math.hypot(a[0], a[1], a[2]);
export const norm = (a) => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
export const lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);

// quaternions [x,y,z,w]
export const qid = () => [0, 0, 0, 1];
export function qaxis(ax, ang) { const s = Math.sin(ang / 2), n = norm(ax); return [n[0] * s, n[1] * s, n[2] * s, Math.cos(ang / 2)]; }
export function qmul(a, b) {
  return [a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1], a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
    a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3], a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]];
}
export const qconj = (q) => [-q[0], -q[1], -q[2], q[3]];
export function qrot(q, v) { const p = qmul(qmul(q, [v[0], v[1], v[2], 0]), qconj(q)); return [p[0], p[1], p[2]]; }
export function qeuler(x, y, z) { return qmul(qaxis([0, 0, 1], z), qmul(qaxis([0, 1, 0], y), qaxis([1, 0, 0], x))); } // XYZ intrinsic ~ three 'XYZ'
export function qfromTo(a, b) {
  a = norm(a); b = norm(b); const d = dot(a, b);
  if (d < -0.99999) { let ax = cross([1, 0, 0], a); if (len(ax) < 1e-4) ax = cross([0, 1, 0], a); return qaxis(ax, Math.PI); }
  const c = cross(a, b); const q = [c[0], c[1], c[2], 1 + d]; const l = Math.hypot(...q); return q.map((x) => x / l);
}
/** frame: position + quaternion (local→world) → 3x4 world→local: rows are the local axes in world, then the origin */
export function frame(pos, q = qid()) {
  const ex = qrot(q, [1, 0, 0]), ey = qrot(q, [0, 1, 0]), ez = qrot(q, [0, 0, 1]);
  return Float64Array.from([...ex, ...ey, ...ez, pos[0], pos[1], pos[2]]);
}

// ---------- primitive distances (local frame) ----------
function dEll(x, y, z, a, b, c) {
  const k0 = Math.sqrt((x / a) ** 2 + (y / b) ** 2 + (z / c) ** 2);
  const k1 = Math.sqrt((x / (a * a)) ** 2 + (y / (b * b)) ** 2 + (z / (c * c)) ** 2);
  return k1 < 1e-9 ? -Math.min(a, b, c) : (k0 * (k0 - 1)) / k1;
}
// round cone from (0,0,0) r1 to (0,-L,0) r2 (iq)
function dRCone(x, y, z, L, r1, r2) {
  const qx = Math.hypot(x, z), qy = -y; // along +qy
  const b = (r1 - r2) / L, a = Math.sqrt(Math.max(0, 1 - b * b));
  const k = -qx * b + qy * a; // dot(q, vec2(-b,a))
  if (k < 0) return Math.hypot(qx, qy) - r1;
  if (k > a * L) return Math.hypot(qx, qy - L) - r2;
  return qx * a + qy * b - r1;
}
function dRBox(x, y, z, bx, by, bz, r) {
  const qx = Math.abs(x) - bx + r, qy = Math.abs(y) - by + r, qz = Math.abs(z) - bz + r;
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qy, qz), 0) - r;
}
function dTorus(x, y, z, R, r) { const q = Math.hypot(x, z) - R; return Math.hypot(q, y) - r; }
function dCyl(x, y, z, r, h, rr) { // capped cylinder along y, half height h, edge round rr
  const dx = Math.hypot(x, z) - r + rr, dy = Math.abs(y) - h + rr;
  return Math.min(Math.max(dx, dy), 0) + Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) - rr;
}

// 3D value noise (deterministic)
function hash3(i, j, k) { let h = (i * 374761393 + j * 668265263 + k * 2147483647) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; }
export function vnoise(x, y, z) {
  const i = Math.floor(x), j = Math.floor(y), k = Math.floor(z), fx = x - i, fy = y - j, fz = z - k;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), w = fz * fz * (3 - 2 * fz);
  const l = (a, b, t) => a + (b - a) * t;
  return l(l(l(hash3(i, j, k), hash3(i + 1, j, k), u), l(hash3(i, j + 1, k), hash3(i + 1, j + 1, k), u), v),
    l(l(hash3(i, j, k + 1), hash3(i + 1, j, k + 1), u), l(hash3(i, j + 1, k + 1), hash3(i + 1, j + 1, k + 1), u), v), w);
}

/**
 * Shape = ordered list of ops. op: { t:'ell'|'cone'|'box'|'tor'|'cyl', f: frame (inverse), p: params,
 *   op:'add'|'sub'|'int', k: blend, bone, mat, wr: weight radius, bs: [cx,cy,cz,r] bounding sphere (world),
 *   fold: (lx,ly,lz) => displacement (m), maskId }
 */
export class Shape {
  constructor() { this.ops = []; }
  push(o) {
    o.op = o.op || 'add'; o.k = o.k ?? 0; o.wr = o.wr ?? 0.03; o.mat = o.mat ?? 0; o.bone = o.bone ?? 0;
    this.ops.push(o); return o;
  }
  /** ellipsoid at world pos with rotation q */
  ell(pos, r, opt = {}) { const R = Math.max(...r); return this.push({ t: 'ell', f: frame(pos, opt.q), p: r, bs: [...pos, R], ...opt }); }
  /** round cone from world a (r1) to world b (r2) */
  cone(a, b, r1, r2, opt = {}) {
    const d = sub(b, a), L = len(d) || 1e-6, q = qmul(qfromTo([0, -1, 0], d), opt.twist ? qaxis([0, 1, 0], opt.twist) : qid());
    const c = lerp3(a, b, 0.5);
    return this.push({ t: 'cone', f: frame(a, q), p: [L, r1, r2], bs: [...c, L / 2 + Math.max(r1, r2)], ...opt });
  }
  box(pos, half, r, opt = {}) { return this.push({ t: 'box', f: frame(pos, opt.q), p: [...half, r], bs: [...pos, Math.hypot(...half)], ...opt }); }
  tor(pos, R, r, opt = {}) { return this.push({ t: 'tor', f: frame(pos, opt.q), p: [R, r], bs: [...pos, R + r], ...opt }); }
  /** garment shell: union of a sub-shape offset outward by `off`, then cut / within */
  shell(inner, off, opt = {}) {
    let c = [0, 0, 0], R = 0; const n = inner.ops.length;
    for (const o of inner.ops) c = add(c, mul(o.bs.slice(0, 3), 1 / n));
    for (const o of inner.ops) R = Math.max(R, len(sub(o.bs.slice(0, 3), c)) + o.bs[3]);
    return this.push({ t: 'shape', f: frame([0, 0, 0]), p: [inner, off], bs: [...c, R + off], ...opt });
  }
  cyl(pos, r, h, rr, opt = {}) { return this.push({ t: 'cyl', f: frame(pos, opt.q), p: [r, h, rr], bs: [...pos, Math.hypot(r, h)], ...opt }); }

  static primDist(o, x, y, z) {
    const f = o.f; const px = x - f[9], py = y - f[10], pz = z - f[11];
    const lx = f[0] * px + f[1] * py + f[2] * pz, ly = f[3] * px + f[4] * py + f[5] * pz, lz = f[6] * px + f[7] * py + f[8] * pz;
    const p = o.p; let d;
    switch (o.t) {
      case 'ell': d = dEll(lx, ly, lz, p[0], p[1], p[2]); break;
      case 'cone': d = dRCone(lx, ly, lz, p[0], p[1], p[2]); break;
      case 'box': d = dRBox(lx, ly, lz, p[0], p[1], p[2], p[3]); break;
      case 'tor': d = dTorus(lx, ly, lz, p[0], p[1]); break;
      case 'cyl': d = dCyl(lx, ly, lz, p[0], p[1], p[2]); break;
      case 'shape': d = p[0].eval(x, y, z) - p[1]; break;
    }
    if (o.within) for (const c of o.within) d = Math.max(d, Shape.primDist(c, x, y, z));
    if (o.fold) d += o.fold(lx, ly, lz, x, y, z);
    if (o.cut) for (const c of o.cut) {
      const d2 = -Shape.primDist(c, x, y, z);
      if (o.cutK) { const k = o.cutK, hh = Math.max(k - Math.abs(d - d2), 0) / k; d = Math.max(d, d2) + hh * hh * k * 0.25; } else d = Math.max(d, d2);
    }
    return d;
  }
  /** distance + material id of the closest contributing primitive */
  eval(x, y, z, out) {
    let d = 1e9, mat = 0, bone = 0;
    for (const o of this.ops) {
      const bs = o.bs, sd = Math.hypot(x - bs[0], y - bs[1], z - bs[2]) - bs[3] - (o.foldAmp || 0);
      if (o.op === 'add') {
        if (sd > d + o.k) continue;
        const d2 = Shape.primDist(o, x, y, z);
        if (o.k > 0) {
          const h = Math.max(o.k - Math.abs(d - d2), 0) / o.k;
          if (d2 < d) { mat = o.mat; bone = o.bone; }
          d = Math.min(d, d2) - h * h * o.k * 0.25;
        } else if (d2 < d) { d = d2; mat = o.mat; bone = o.bone; }
      } else if (o.op === 'sub') {
        if (sd > o.k + 1e-4) continue;
        const d2 = -Shape.primDist(o, x, y, z);
        if (o.k > 0) { const h = Math.max(o.k - Math.abs(d - d2), 0) / o.k; if (d2 > d && o.cutMat != null) mat = o.cutMat; d = Math.max(d, d2) + h * h * o.k * 0.25; }
        else { if (d2 > d && o.cutMat != null) mat = o.cutMat; d = Math.max(d, d2); }
      } else if (o.op === 'paint') { // no geometry: recolour where inside
        if (sd > 0) continue;
        const d2 = Shape.primDist(o, x, y, z); if (d2 < 0 && d < 0.004) mat = o.mat;
      }
    }
    if (out) { out.mat = mat; out.bone = bone; }
    return d;
  }
}

/**
 * Surface nets over [bmin,bmax] with cell size h. xf(p) optional: maps grid-space point → world (for rotated part frames).
 * Returns { pos: Float32Array, nrm, idx: Uint32Array }
 */
export function polygonize(shape, bmin, bmax, h, xf = null) {
  const nx = Math.ceil((bmax[0] - bmin[0]) / h) + 1, ny = Math.ceil((bmax[1] - bmin[1]) / h) + 1, nz = Math.ceil((bmax[2] - bmin[2]) / h) + 1;
  const N = nx * ny * nz, F = new Float32Array(N);
  const W = (i, j, k) => { const p = [bmin[0] + i * h, bmin[1] + j * h, bmin[2] + k * h]; return xf ? xf(p) : p; };
  const sdf = (p) => shape.eval(p[0], p[1], p[2]);
  // narrow band: coarse step C
  const C = 4, band = C * h * 1.75 + 0.002;
  for (let K = 0; K < nz; K += C) for (let J = 0; J < ny; J += C) for (let I = 0; I < nx; I += C) {
    const ci = Math.min(I + C / 2, nx - 1), cj = Math.min(J + C / 2, ny - 1), ck = Math.min(K + C / 2, nz - 1);
    const dc = sdf(W(ci, cj, ck));
    const i1 = Math.min(I + C, nx), j1 = Math.min(J + C, ny), k1 = Math.min(K + C, nz);
    if (Math.abs(dc) > band) {
      for (let k = K; k < k1; k++) for (let j = J; j < j1; j++) for (let i = I; i < i1; i++) F[i + nx * (j + ny * k)] = dc;
    } else {
      for (let k = K; k < k1; k++) for (let j = J; j < j1; j++) for (let i = I; i < i1; i++) F[i + nx * (j + ny * k)] = sdf(W(i, j, k));
    }
  }
  // one vertex per sign-changing cell
  const vid = new Int32Array((nx - 1) * (ny - 1) * (nz - 1)).fill(-1);
  const P = [];
  const E = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  const cv = new Float64Array(8);
  const CO = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]];
  const cidx = (i, j, k) => i + (nx - 1) * (j + (ny - 1) * k);
  for (let k = 0; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    let mask = 0;
    for (let c = 0; c < 8; c++) { const o = CO[c]; cv[c] = F[(i + o[0]) + nx * ((j + o[1]) + ny * (k + o[2]))]; if (cv[c] < 0) mask |= 1 << c; }
    if (mask === 0 || mask === 255) continue;
    let sx = 0, sy = 0, sz = 0, n = 0;
    for (const [a, b] of E) {
      const da = cv[a], db = cv[b]; if ((da < 0) === (db < 0)) continue;
      const t = da / (da - db), A = CO[a], B = CO[b];
      sx += A[0] + (B[0] - A[0]) * t; sy += A[1] + (B[1] - A[1]) * t; sz += A[2] + (B[2] - A[2]) * t; n++;
    }
    vid[cidx(i, j, k)] = P.length / 3;
    P.push(bmin[0] + (i + sx / n) * h, bmin[1] + (j + sy / n) * h, bmin[2] + (k + sz / n) * h);
  }
  // faces: for each grid edge with sign change, quad of the 4 cells around it
  const I = [];
  const q = (a, b, c, d, flip) => {
    if (a < 0 || b < 0 || c < 0 || d < 0) return;
    if (flip) I.push(a, d, c, a, c, b); else I.push(a, b, c, a, c, d);
  };
  for (let k = 1; k < nz - 1; k++) for (let j = 1; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) {
    const f0 = F[i + nx * (j + ny * k)] < 0;
    if (i < nx - 1) { const f1 = F[i + 1 + nx * (j + ny * k)] < 0; if (f0 !== f1) q(vid[cidx(i, j - 1, k - 1)], vid[cidx(i, j, k - 1)], vid[cidx(i, j, k)], vid[cidx(i, j - 1, k)], f0); }
    if (j < ny - 1) { const f1 = F[i + nx * (j + 1 + ny * k)] < 0; if (f0 !== f1) q(vid[cidx(i - 1, j, k - 1)], vid[cidx(i - 1, j, k)], vid[cidx(i, j, k)], vid[cidx(i, j, k - 1)], f0); }
    if (k < nz - 1) { const f1 = F[i + nx * (j + ny * (k + 1))] < 0; if (f0 !== f1) q(vid[cidx(i - 1, j - 1, k)], vid[cidx(i, j - 1, k)], vid[cidx(i, j, k)], vid[cidx(i - 1, j, k)], f0); }
  }
  // map to world, Newton-project onto the surface, normals from the gradient
  const nv = P.length / 3, pos = new Float32Array(nv * 3), nrm = new Float32Array(nv * 3);
  const e = h * 0.35;
  for (let v = 0; v < nv; v++) {
    let p = [P[v * 3], P[v * 3 + 1], P[v * 3 + 2]];
    if (xf) p = xf(p);
    let g = [0, 1, 0];
    for (let it = 0; it < 3; it++) {
      const d = sdf(p);
      g = [sdf([p[0] + e, p[1], p[2]]) - sdf([p[0] - e, p[1], p[2]]), sdf([p[0], p[1] + e, p[2]]) - sdf([p[0], p[1] - e, p[2]]), sdf([p[0], p[1], p[2] + e]) - sdf([p[0], p[1], p[2] - e])];
      const gl = len(g); if (gl < 1e-9) break; g = mul(g, 1 / gl);
      const step = clamp(d, -h * 0.6, h * 0.6);
      p = sub(p, mul(g, step * 0.9));
      if (Math.abs(d) < 1e-5) break;
    }
    pos.set(p, v * 3); nrm.set(g, v * 3);
  }
  // orient every triangle with the gradient normals
  for (let t = 0; t < I.length; t += 3) {
    const a = I[t] * 3, b = I[t + 1] * 3, c = I[t + 2] * 3;
    const ux = pos[b] - pos[a], uy = pos[b + 1] - pos[a + 1], uz = pos[b + 2] - pos[a + 2];
    const wx = pos[c] - pos[a], wy = pos[c + 1] - pos[a + 1], wz = pos[c + 2] - pos[a + 2];
    const fx = uy * wz - uz * wy, fy = uz * wx - ux * wz, fz = ux * wy - uy * wx;
    const s = fx * (nrm[a] + nrm[b] + nrm[c]) + fy * (nrm[a + 1] + nrm[b + 1] + nrm[c + 1]) + fz * (nrm[a + 2] + nrm[b + 2] + nrm[c + 2]);
    if (s < 0) { const tmp = I[t + 1]; I[t + 1] = I[t + 2]; I[t + 2] = tmp; }
  }
  return { pos, nrm, idx: Uint32Array.from(I) };
}

/** per-vertex: material, skin (top-4 bones), baked AO */
export function attributes(shape, mesh, opt = {}) {
  const nv = mesh.pos.length / 3;
  const mat = new Uint8Array(nv), si = new Uint8Array(nv * 4), sw = new Uint8Array(nv * 4), ao = new Uint8Array(nv);
  const out = {};
  const aoStep = opt.aoStep ?? 0.012;
  for (let v = 0; v < nv; v++) {
    const x = mesh.pos[v * 3], y = mesh.pos[v * 3 + 1], z = mesh.pos[v * 3 + 2];
    shape.eval(x, y, z, out); mat[v] = out.mat;
    // weights: each primitive pulls its bone with falloff on its own distance
    const wb = new Map();
    for (const o of shape.ops) {
      if (o.op !== 'add' || o.noWeight) continue;
      const bs = o.bs; if (Math.hypot(x - bs[0], y - bs[1], z - bs[2]) - bs[3] > o.wr) continue;
      const d = Shape.primDist(o, x, y, z);
      const f = clamp(1 - Math.max(d, 0) / o.wr, 0, 1); if (f <= 0) continue;
      const w = f * f * (3 - 2 * f) * (o.wgain ?? 1);
      if (w > (wb.get(o.bone) || 0)) wb.set(o.bone, w);
    }
    if (!wb.size) wb.set(out.bone, 1);
    let top = [...wb.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
    const t0 = top.reduce((s, e2) => s + e2[1], 0);
    top = top.filter((e2) => e2[1] / t0 >= 0.03);
    const tot = top.reduce((s, e2) => s + e2[1], 0);
    const qv = top.map((e2) => Math.round((e2[1] / tot) * 255));
    qv[0] += 255 - qv.reduce((s, x2) => s + x2, 0);
    top.forEach(([b], k) => { si[v * 4 + k] = b; sw[v * 4 + k] = qv[k]; });
    // AO: march along the normal
    const nx = mesh.nrm[v * 3], ny = mesh.nrm[v * 3 + 1], nz = mesh.nrm[v * 3 + 2];
    let o2 = 0, s = 1;
    for (let i = 1; i <= 5; i++) { const hh = aoStep * i; o2 += (hh - shape.eval(x + nx * hh, y + ny * hh, z + nz * hh)) * s / hh; s *= 0.6; }
    ao[v] = Math.round(clamp(1 - 0.42 * o2, 0, 1) * 255);
  }
  return { mat, si, sw, ao };
}
