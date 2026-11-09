// Boot: fonts → timing → shots → player UI or capture API (window.OP, same contract as tools/capture.mjs).
import { W, H, PW, PH, FPS, scratch } from './core/lib.js';
import { setBoil, finish } from './core/ink.js';
import { compose } from './core/frame.js';
import { loadTiming, T } from './core/timing.js';
import { buildShots } from './shots.js';

const q = new URLSearchParams(location.search);
const CAPTURE = q.has('capture');
if (CAPTURE) document.body.classList.add('capture');
const FONTS = [['Permanent Marker', 'PermanentMarker.woff2', {}], ['Patrick Hand', 'PatrickHand.woff2', {}], ['Patrick Hand SC', 'PatrickHandSC.woff2', {}],
  ['Gochi Hand', 'GochiHand.woff2', {}], ['Kalam', 'Kalam-400.woff2', { weight: '400' }], ['Kalam', 'Kalam-700.woff2', { weight: '700' }], ['Caveat', 'Caveat-normal.woff2', { weight: '400 700' }]];

let SHOTS = [], DURATION = 0;
const errors = [];
const out = document.getElementById('out');

function shotAt(t) { for (let i = SHOTS.length - 1; i >= 0; i--) if (t >= SHOTS[i].start - 1e-6) return i; return 0; }
function render(t) {
  const i = shotAt(t), sh = SHOTS[i];
  const [pc, p] = scratch('panel', PW, PH);
  p.fillStyle = '#000'; p.fillRect(0, 0, PW, PH);
  setBoil(t, sh.boil ?? 0.45);
  const lt = t - sh.start;
  try { p.save(); sh.draw(p, lt, sh, t); p.restore(); if (sh.finish !== false) finish(p, PW, PH, sh.finish || {}); }
  catch (err) {
    p.restore(); p.setTransform(1, 0, 0, 1, 0, 0); p.fillStyle = '#400'; p.fillRect(0, 0, PW, PH); p.fillStyle = '#f88'; p.font = '26px monospace'; p.fillText(`${sh.id}: ${err.message}`.slice(0, 80), 30, PH / 2);
    if (!errors.find((x) => x.id === sh.id)) { errors.push({ id: sh.id, msg: err.message, stack: err.stack }); console.error(sh.id, err); }
  }
  const tag = typeof sh.tag === 'function' ? sh.tag(lt) : sh.tag;
  compose(out, pc, t, { tag, tagK: sh.tagIn ? Math.min(1, lt / 0.45) : 1, header: sh.header });
  if (sh.over) { const x = out.getContext('2d'); x.save(); sh.over(x, lt, sh, t); x.restore(); }
}

async function boot() {
  await Promise.all(FONTS.map(async ([fam, file, d]) => { const f = new FontFace(fam, `url(fonts/${file})`, d); await f.load(); document.fonts.add(f); }));
  await loadTiming();
  SHOTS = buildShots(T);
  for (let i = 0; i < SHOTS.length; i++) SHOTS[i].end = SHOTS[i + 1] ? SHOTS[i + 1].start : SHOTS[i].end ?? SHOTS[i].start + 3;
  DURATION = SHOTS[SHOTS.length - 1].end;
  window.OP.ready = true;
  if (!CAPTURE) player(); else render(0);
}

window.OP = {
  ready: false, duration: () => DURATION,
  scenes: () => SHOTS.map((s, i) => ({ i, id: s.id, start: s.start, end: s.end, tech: s.note || '', title: s.note || '' })),
  errors: () => errors,
  cues: () => (SHOTS.cues || []).map((c) => ({ gain: 1, ...c })).sort((a, b) => a.t - b.t),
  shotList: () => SHOTS.map((s) => ({ id: s.id, start: s.start, end: s.end, note: s.note || '' })),
  frame(i, qq = 0.92) { render(i / FPS); return out.toDataURL('image/jpeg', qq); },
  bench(i) { const t0 = performance.now(); render(i / FPS); return performance.now() - t0; },
  sheet(times, cols = 4, scale = 0.25, qq = 0.85) {
    const w = Math.round(W * scale), h = Math.round(H * scale), rows = Math.ceil(times.length / cols);
    const c = document.createElement('canvas'); c.width = w * cols; c.height = (h + 22) * rows;
    const x = c.getContext('2d'); x.fillStyle = '#111'; x.fillRect(0, 0, c.width, c.height);
    times.forEach((t, k) => {
      render(t); const cx = (k % cols) * w, cy = Math.floor(k / cols) * (h + 22);
      x.drawImage(out, cx, cy, w, h); const s = SHOTS[shotAt(t)];
      x.fillStyle = '#fff'; x.font = '14px monospace'; x.fillText(`${t.toFixed(2)}s ${s.id}`.slice(0, Math.floor(w / 8.5)), cx + 4, cy + h + 16);
    });
    return c.toDataURL('image/jpeg', qq);
  },
  /** panel-only sheet (for checking the illustration at full panel res) */
  panels(times, cols = 2, scale = 0.5, qq = 0.88) {
    const w = Math.round(PW * scale), h = Math.round(PH * scale), rows = Math.ceil(times.length / cols);
    const c = document.createElement('canvas'); c.width = w * cols; c.height = (h + 22) * rows;
    const x = c.getContext('2d'); x.fillStyle = '#111'; x.fillRect(0, 0, c.width, c.height);
    times.forEach((t, k) => {
      render(t); const cx = (k % cols) * w, cy = Math.floor(k / cols) * (h + 22);
      x.drawImage(scratch('panel', PW, PH)[0], cx, cy, w, h); const s = SHOTS[shotAt(t)];
      x.fillStyle = '#fff'; x.font = '14px monospace'; x.fillText(`${t.toFixed(2)}s ${s.id} ${s.note || ''}`.slice(0, Math.floor(w / 8.5)), cx + 4, cy + h + 16);
    });
    return c.toDataURL('image/jpeg', qq);
  },
};

function player() {
  const song = document.getElementById('song'), scrub = document.getElementById('scrub'), info = document.getElementById('info');
  const play = document.getElementById('play'), jump = document.getElementById('jump');
  scrub.max = DURATION;
  SHOTS.forEach((s) => { const o = document.createElement('option'); o.value = s.start; o.textContent = `${s.id} ${s.start.toFixed(2)} ${s.note || ''}`; jump.appendChild(o); });
  let t = parseFloat(q.get('t') || '0');
  if (q.get('shot')) { const s = SHOTS.find((x) => x.id === q.get('shot')); if (s) t = s.start; }
  let playing = false, last = -1;
  const show = () => { const f = Math.round(t * FPS); if (f !== last) { render(t); last = f; } const s = SHOTS[shotAt(t)]; scrub.value = t; info.textContent = `${t.toFixed(2)}s · f${f} · ${s.id} ${s.note || ''}`; };
  const loop = () => { if (playing) { t = song.currentTime; show(); requestAnimationFrame(loop); } };
  const toggle = () => { playing = !playing; play.textContent = playing ? '❚❚ pause' : '▶ play'; if (playing) { song.currentTime = t; song.play(); loop(); } else song.pause(); };
  const seek = (v) => { t = Math.max(0, Math.min(DURATION - 1 / FPS, v)); if (playing) song.currentTime = t; show(); };
  play.onclick = toggle; scrub.oninput = () => seek(parseFloat(scrub.value)); jump.onchange = () => seek(parseFloat(jump.value) + 0.001);
  addEventListener('keydown', (e) => {
    if (e.code === 'Space') { e.preventDefault(); toggle(); }
    if (e.code === 'ArrowRight') seek(t + (e.shiftKey ? 1 : 1 / FPS));
    if (e.code === 'ArrowLeft') seek(t - (e.shiftKey ? 1 : 1 / FPS));
    if (e.key === ']') { const i = shotAt(t); if (SHOTS[i + 1]) seek(SHOTS[i + 1].start + 0.001); }
    if (e.key === '[') { const i = shotAt(t); seek(SHOTS[Math.max(0, t - SHOTS[i].start < 0.3 ? i - 1 : i)].start + 0.001); }
  });
  show();
}
boot().catch((e) => { console.error(e); document.getElementById('info').textContent = 'BOOT ERROR ' + e.message; window.OP.bootError = e.message; });
