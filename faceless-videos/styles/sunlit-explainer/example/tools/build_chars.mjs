// Sculpt → mesh → skin every character in src/chars/cast.js into data/chars/<id>.bin (+ .json header).
//   node tools/build_chars.mjs [id ...]
import fs from 'node:fs';
import path from 'node:path';
import { polygonize, attributes } from '../src/chars/sdf.js';
import { headShape, headMasks, handShape, handMasks, bodyShape, skeleton, BONES } from '../src/chars/anatomy.js';
import { CAST } from '../src/chars/cast.js';

const OUT = path.resolve('data/chars');
fs.mkdirSync(OUT, { recursive: true });
const want = process.argv.slice(2);

function buildPart(name, def, masksFn) {
  const t0 = Date.now();
  const mesh = polygonize(def.shape, def.bmin, def.bmax, def.h, def.xf || null);
  const at = attributes(def.shape, mesh, { aoStep: name === 'body' ? 0.02 : 0.006 });
  const mk = masksFn ? masksFn(mesh.pos) : new Uint8Array(mesh.pos.length / 3 * 4);
  const n = mesh.pos.length / 3;
  const nrm8 = new Int8Array(n * 3); for (let i = 0; i < n * 3; i++) nrm8[i] = Math.round(Math.max(-1, Math.min(1, mesh.nrm[i])) * 127);
  console.log(`  ${name.padEnd(6)} ${String(n).padStart(7)} verts ${String(mesh.idx.length / 3).padStart(7)} tris  ${Date.now() - t0} ms`);
  return { name, n, pos: mesh.pos, nrm: nrm8, idx: mesh.idx, mat: at.mat, si: at.si, sw: at.sw, ao: at.ao, mask: mk };
}

for (const spec of CAST) {
  if (want.length && !want.includes(spec.id)) continue;
  console.log(spec.id);
  const parts = [];
  parts.push(buildPart('body', bodyShape(spec)));
  parts.push(buildPart('head', headShape(spec), (pos) => headMasks(spec, pos)));
  parts.push(buildPart('handL', handShape('L', { bareForearm: spec.outfit?.sleeves === 'rolled' || spec.outfit?.top === 'tee' }), (pos) => handMasks('L', pos)));
  parts.push(buildPart('handR', handShape('R', { bareForearm: spec.outfit?.sleeves === 'rolled' || spec.outfit?.top === 'tee' }), (pos) => handMasks('R', pos)));
  // pack
  const chunks = [], header = { id: spec.id, bones: skeleton().map((b) => ({ name: b.name, parent: b.parent, pos: b.pos, q: b.q })), parts: [] };
  let off = 0;
  const pushArr = (a) => { const pad = (4 - (off % 4)) % 4; if (pad) { chunks.push(Buffer.alloc(pad)); off += pad; } const b = Buffer.from(a.buffer, a.byteOffset, a.byteLength); chunks.push(b); const o = off; off += b.length; return o; };
  for (const p of parts) {
    header.parts.push({ name: p.name, n: p.n, ni: p.idx.length,
      pos: pushArr(p.pos), nrm: pushArr(p.nrm), idx: pushArr(p.idx), mat: pushArr(p.mat), si: pushArr(p.si), sw: pushArr(p.sw), ao: pushArr(p.ao), mask: pushArr(p.mask) });
  }
  fs.writeFileSync(path.join(OUT, spec.id + '.bin'), Buffer.concat(chunks));
  fs.writeFileSync(path.join(OUT, spec.id + '.json'), JSON.stringify(header));
  console.log(`  → ${(off / 1e6).toFixed(1)} MB`);
}
void BONES;
