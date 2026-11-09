// Boot: fonts → timing → shots → player UI or capture API (window.OP — same contract as tools/capture.mjs).
import { W, H, FPS, BAR, PORTRAIT } from './core/lib.js';
import { initGrain, finish } from './core/look.js';
import { makeView } from './core/view.js';
import { loadTiming, T } from './core/timing.js';
import { buildShots } from './shots.js';
import { counter, pop } from './core/gfx.js';

const q = new URLSearchParams(location.search);
const CAPTURE = q.has('capture');
if (CAPTURE) document.body.classList.add('capture');
const out = document.getElementById('out'); out.width = W; out.height = H;
const ctx = out.getContext('2d');
let SHOTS = [], DURATION = 0; const errors = [];

function shotAt(t) { for (let i = SHOTS.length - 1; i >= 0; i--) if (t >= SHOTS[i].start - 1e-6) return i; return 0; }
function render(t) {
  const i = shotAt(t), sh = SHOTS[i], lt = t - sh.start, frame = Math.round(t * FPS);
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.filter = 'none'; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  try {
    const V = makeView(ctx, sh.cam || { x: 960, y: 480, w: 1920 }, lt);
    ctx.save(); sh.draw(ctx, V, lt, t); ctx.restore(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.filter = 'none'; ctx.globalAlpha = 1;
    const lk = typeof sh.look === 'function' ? sh.look(t) : (sh.look || {});
    finish(ctx, frame, { ...lk, bars: false, grain: sh.card ? 0.05 : lk.grain });
    if (sh.over) { ctx.save(); sh.over(ctx, lt, t); ctx.restore(); }
    if (sh.hud != null) counter(ctx, sh.hud, sh.hudIn ? pop(lt, 0.1) : 1);
    if (BAR) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, BAR); ctx.fillRect(0, H - BAR, W, BAR); }
  } catch (err) {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#400'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = '#f88'; ctx.font = '28px monospace'; ctx.fillText(`${sh.id}: ${err.message}`.slice(0, 90), 30, H / 2);
    if (!errors.find((x) => x.id === sh.id)) { errors.push({ id: sh.id, msg: err.message, stack: err.stack }); console.error(sh.id, err); }
  }
}

async function boot() {
  await Promise.all([['Fredoka', 'Fredoka.woff2', { weight: '300 700' }], ['Nunito', 'Nunito.woff2', { weight: '200 1000' }]].map(async ([fam, file, d]) => { const f = new FontFace(fam, `url(fonts/${file})`, d); await f.load(); document.fonts.add(f); }));
  await loadTiming(); initGrain();
  SHOTS = buildShots().map((s) => ({ ...s, start: s.at })).sort((a, b) => a.start - b.start);
  SHOTS[0].start = 0;
  for (let k = 0; k < SHOTS.length; k++) SHOTS[k].end = SHOTS[k + 1] ? SHOTS[k + 1].start : (SHOTS[k].end ?? SHOTS[k].start + 3);
  const last = SHOTS[SHOTS.length - 1]; last.end = last.end ?? last.start + 3; DURATION = SHOTS.find((s) => s.id === 'END')?.end ?? last.end;
  last.end = DURATION;
  // HUD counter pops in on the first shot that has it
  let had = false; for (const s of SHOTS) { if (s.hud != null && !had) { s.hudIn = true; had = true; } }
  window.OP.ready = true;
  if (!CAPTURE) player(); else render(0);
}

window.OP = {
  ready: false, duration: () => DURATION, errors: () => errors,
  scenes: () => SHOTS.map((s, i) => ({ i, id: s.id, start: s.start, end: s.end, tech: s.note || '' })),
  cues: () => {
    const cs = [];
    for (const s of SHOTS) {
      if (!s.card && s !== SHOTS[0]) cs.push({ t: s.start, type: 'cut', gain: 1 });
      for (const [t, type, x] of (s.cues || [])) cs.push({ t, type, gain: 1, ...(x || {}) });
      if (s.steps) for (let t = s.steps.from; t < s.steps.to; t += s.steps.every) cs.push({ t, type: 'step', gain: 0.8 });
    }
    return cs.sort((a, b) => a.t - b.t);
  },
  frame(i, qq = 0.92) { render(i / FPS); return out.toDataURL('image/jpeg', qq); },
  bench(i) { const t0 = performance.now(); render(i / FPS); return performance.now() - t0; },
  sheet(times, cols = 4, scale = 0.25, qq = 0.85) {
    const w = Math.round(W * scale), h = Math.round(H * scale), rows = Math.ceil(times.length / cols);
    const c = document.createElement('canvas'); c.width = w * cols; c.height = (h + 22) * rows;
    const x = c.getContext('2d'); x.fillStyle = '#111'; x.fillRect(0, 0, c.width, c.height);
    times.forEach((t, k) => {
      render(t); const cx = (k % cols) * w, cy = Math.floor(k / cols) * (h + 22);
      x.drawImage(out, cx, cy, w, h); const s = SHOTS[shotAt(t)];
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
  if (q.get('shot')) { const s = SHOTS.find((x) => x.id === q.get('shot')); if (s) t = s.start + 0.01; }
  let playing = false, last = -1;
  const show = () => { const f = Math.round(t * FPS); if (f !== last) { render(f / FPS); last = f; } const s = SHOTS[shotAt(t)]; scrub.value = t; info.textContent = `${t.toFixed(2)}s · f${f} · ${s.id} ${s.note || ''}`; };
  const loop = () => { if (playing) { t = song.currentTime; show(); requestAnimationFrame(loop); } };
  const toggle = () => { playing = !playing; play.textContent = playing ? '❚❚ pause' : '▶ play'; if (playing) { song.currentTime = t; song.play(); loop(); } else song.pause(); };
  const seek = (v) => { t = Math.max(0, Math.min(DURATION - 1 / FPS, v)); if (playing) song.currentTime = t; show(); };
  play.onclick = toggle; scrub.oninput = () => seek(parseFloat(scrub.value)); jump.onchange = () => seek(parseFloat(jump.value) + 0.01);
  addEventListener('keydown', (e) => {
    if (e.code === 'Space') { e.preventDefault(); toggle(); }
    if (e.code === 'ArrowRight') seek(t + (e.shiftKey ? 1 : 1 / FPS));
    if (e.code === 'ArrowLeft') seek(t - (e.shiftKey ? 1 : 1 / FPS));
    if (e.key === ']') { const i = shotAt(t); if (SHOTS[i + 1]) seek(SHOTS[i + 1].start + 0.01); }
    if (e.key === '[') { const i = shotAt(t); seek(SHOTS[Math.max(0, t - SHOTS[i].start < 0.3 ? i - 1 : i)].start + 0.01); }
  });
  show();
}
boot().catch((e) => { console.error(e); document.getElementById('info').textContent = 'BOOT ERROR ' + e.message; window.OP.bootError = e.message; });
