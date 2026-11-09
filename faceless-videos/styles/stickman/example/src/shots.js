// WHAT IF ZOMBIES HIT YOUR APARTMENT? — the shot list. One picture per clause; every cut lands 3 frames before its word
// (cut(line, word)); faces change on the word that matters; labels pop over 3 frames; numbers land on the end of their word.
// Each shot: { id, at, cam, look, draw(c, V, lt, t), over(c, lt, t), cues: [[time, type, extra]] , card, hud }.
import { W, H, PIC, PORTRAIT, PAL, clamp, lerp, inv, eo, eio, eback, rr, circ, rgrad, vgrad, poly, hash, TAU, mixc } from './core/lib.js';
import { wd, ln, cut, T } from './core/timing.js';
import { makeView } from './core/view.js';
import { figure, walk, glove, HOOD } from './core/fig.js';
import { FLOOR, LIV, living, couch, door, hallway, HALL, bathroom, tub, kitchen } from './sets/rooms.js';
import { facade, facadeOurs, skyline, section, stove, desk, phone, MSG, waterDays, cans } from './sets/more.js';
import { U, pop, pill, stamp, counter, goldText, navyBg, rubber } from './core/gfx.js';

const HH = 400;                                                    // hero height in the rooms (wide)
const LAMP = { col: '#f2b266', w: 5, dx: 1, dy: -0.4 };            // warm rim from the floor lamp (right)
const MOON = { col: '#8fb0e8', w: 4.5, dx: 1, dy: -0.5 };          // cold rim from the window (right)
const fit = (c, text, size, maxW) => { c.font = `700 ${size}px Fredoka`; const w = c.measureText(text).width * 1.06; return w > maxW ? size * maxW / w : size; };

function hero(c, o) { return figure(c, { kind: 'hero', h: HH, y: FLOOR, ...o }); }
function zombie(c, o) { return figure(c, { kind: 'zombie', ...o }); }
/** sitting on the couch, 3/4 side view facing dir; u 0 = seated … 1 = standing (stand-up in between) */
function sitting(x, h = HH, o = {}) {
  const d = o.dir ?? -1, u = o.u || 0;
  const hipY = lerp(FLOOR - 136, FLOOR - h * 0.45, u), hipX = x + d * lerp(0, h * 0.2, u);
  const feet = [[x + d * lerp(h * 0.2, h * 0.17, u), FLOOR], [x + d * lerp(h * 0.27, h * 0.24, u), FLOOR]];
  const kx = x + d * h * 0.2 * (1 - u);
  return { x: hipX, dir: d, hipY, feet, hands: o.hands || [[kx + d * 4, hipY - 6 + u * 120], [kx + d * 14, hipY - 2 + u * 120]], h, lean: (o.lean || 0) + 0.05 };
}
/** close-up head: a huge figure whose head sits at (hx, hy) */
function bigHead(c, hx, hy, h, o = {}) { const Y = hy + 0.86 * h; return figure(c, { kind: 'hero', h, x: hx, y: Y, view: 'front', feet: [[hx - 40, Y], [hx + 40, Y]], ...o }); }
const shamble = (t, seed) => Math.sin(t * 3.2 + seed * 2) * 0.06;

export function buildShots() {
  const S = [];
  const add = (o) => { S.push(o); return o; };
  const L = (i) => ln(i);

  // ── COLD OPEN ───────────────────────────────────────────────────────────────────────────────
  const bang0 = wd(0, 4).s, stopT = wd(2, 3).s;
  add({ id: 'S01', at: 0, note: 'hallway, 4B pounding', cam: { x: 960, y: 470, w: 1920, push: 0.03, pushDur: 1.8, pw: 1000 },
    draw(c, V, lt, t) { hallway(V, { flicker: hash(Math.floor(t * 12)) > 0.12 ? 1 : 0, shake4B: t > bang0 ? 1 : 0 }); },
    over(c, lt) { stamp(c, '4TH FLOOR · 9:12 P.M.', pop(lt, 0.3, 4)); },
    cues: [[bang0, 'pound', { n: Math.round((stopT - bang0) / 0.62), every: 0.62, gain: 0.9 }], [0, 'hum', { dur: 2.85 }]] });
  add({ id: 'S02', at: cut(1), note: 'couch, head turns to the door', cam: { x: 820, y: 470, w: 1150, px: 900, pw: 640 },
    draw(c, V, lt, t) {
      living(V, { dof: 4.5 });
      const turn = t > wd(1, 2).s;
      V.chars(1, 0, LAMP, (k) => hero(k, { ...sitting(1000), face: { expr: turn ? 'worried' : 'calm', t, seed: 1, look: turn ? -1 : 0.2, turn: turn ? 0.34 : -0.1 } }));
    } });
  add({ id: 'S03', at: cut(2), note: 'peephole: the pounding stops', peep: true,
    draw(c, V, lt, t) {
      const [pc, px] = scratchPeep(); const V2 = makeView(px, { x: 960, y: 560, w: 2400, pw: 2400 }, lt);
      across(V2, t < stopT ? 1 : 0, t);
      c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = '#060608'; c.fillRect(0, 0, W, H);
      const r = Math.min(W, H) * 0.42, cx = W / 2, cy = H / 2, z = 1.0;
      c.beginPath(); c.arc(cx, cy, r, 0, TAU); c.clip();
      c.save(); c.translate(cx, cy); c.scale(z, z); c.drawImage(pc, -W / 2, -H / 2); c.restore();
      for (const [rk, zk] of [[0.8, 1.06], [0.6, 1.13], [0.4, 1.2]]) { c.save(); c.beginPath(); c.arc(cx, cy, r * rk, 0, TAU); c.clip(); c.translate(cx, cy); c.scale(zk, zk); c.drawImage(pc, -W / 2, -H / 2); c.restore(); }
      c.fillStyle = rgrad(c, cx, cy, r * 0.45, r, [[0, 'rgba(0,0,0,0)'], [0.8, 'rgba(0,0,0,0.45)'], [1, 'rgba(0,0,0,0.95)']]); c.fillRect(0, 0, W, H);
      c.strokeStyle = 'rgba(255,255,255,0.12)'; c.lineWidth = r * 0.04; c.beginPath(); c.arc(cx, cy, r * 0.86, Math.PI * 1.1, Math.PI * 1.45); c.stroke();
      c.restore();
    } });
  add({ id: 'S04', at: cut(3), note: 'close: the screaming starts', cam: { x: 960, y: 480, w: 1920, pw: 1080 },
    draw(c, V, lt, t) {
      const B = makeView(c, { x: 820, y: 430, w: 760, pw: 520 }, lt); living(B, { dof: 9 });
      const sc = t > wd(3, 2).s + 0.05;
      V.chars(1, 0, { ...LAMP, w: 3 }, (k) => bigHead(k, 980, 500, 1900, { face: { expr: sc ? 'shocked' : 'worried', t, seed: 1, look: -0.6, turn: -0.15, noBlink: sc } }));
    }, cues: [[wd(3, 3).e + 0.05, 'scream']] });
  add({ id: 'TITLE', at: L(4).start - 0.05, card: true, note: 'title card',
    draw(c, V, lt) {
      navyBg(c, lt);
      const k = eo(lt / 0.5), y = H / 2;
      c.save(); c.globalAlpha = k;
      const s1 = fit(c, 'WHAT IF ZOMBIES HIT', 64 * U, W * 0.8), s2 = fit(c, 'YOUR APARTMENT?', 132 * U, W * 0.88);
      goldText(c, 'WHAT IF ZOMBIES HIT', W / 2, y - 92 * U, s1, { col: '#efd3a6', ls: 0.08 });
      goldText(c, 'YOUR APARTMENT?', W / 2, y + 30 * U, s2 * (0.96 + 0.04 * k));
      c.restore();
    }, cues: [[L(4).start - 0.05, 'whoosh'], [L(4).start + 0.1, 'swell', { dur: 2.2 }]] });

  // ── THE HOUR ────────────────────────────────────────────────────────────────────────────────
  const hourE = wd(5, 3).e;
  add({ id: 'S06', at: cut(5, 0), card: true, note: 'one hour countdown',
    draw(c, V, lt, t) {
      navyBg(c, lt, { hot: '#2a2433' });
      pill(c, 'THE FIRST HOUR', W / 2, H / 2 - 150 * U, pop(lt, 0.05));
      const land = clamp((t - wd(5, 2).s) / (hourE - wd(5, 2).s));
      const secs = 3600 - Math.max(0, Math.floor((t - hourE) * 1));
      const mm = Math.floor(secs / 60), ss = secs % 60;
      const txt = land < 1 ? `${String(Math.round(lerp(0, 60, eo(land)))).padStart(2, '0')}:00` : `${mm}:${String(ss).padStart(2, '0')}`;
      goldText(c, txt, W / 2, H / 2 + 40 * U, 220 * U, { ls: 0.02 });
    }, cues: [[cut(5, 0) + 0.05, 'blip'], [hourE, 'land']] });
  const upAt = wd(5, 5).s;
  add({ id: 'S07', at: cut(5, 4), note: 'wide: you stand up', hud: 60, cam: { x: 960, y: 480, w: 1920, push: 0.03, pushDur: 1.6, px: 1000, pw: 900 },
    draw(c, V, lt, t) {
      living(V, {});
      const u = eio((t - upAt) / 0.45);
      V.chars(1, 0, LAMP, (k) => hero(k, { ...sitting(1000, HH, { u, lean: Math.sin(u * Math.PI) * 0.35 }), face: { expr: u > 0.5 ? 'determined' : 'worried', t, seed: 1, look: -0.4 } }));
    }, cues: [[upAt, 'cloth', { dur: 0.45, gain: 0.6 }], [upAt + 0.45, 'step', { gain: 0.7 }], [cut(5, 4) + 0.1, 'blip', { gain: 0.6 }]] });

  // ── 1 · THE DOOR ────────────────────────────────────────────────────────────────────────────
  stepCard(S, 6, '1', 'THE DOOR');
  const lockT = wd(7, 2).s;
  add({ id: 'S09', at: cut(7, 0), note: 'glove turns the deadbolt', hud: 57, cam: { x: 960, y: 480, w: 1920, pw: 1080 },
    draw(c, V, lt, t) {
      V.layer(1.2, 0, (k) => { k.fillStyle = '#5b3d2d'; k.fillRect(-1400, -1200, 4720, 3400); k.strokeStyle = '#4a3125'; k.lineWidth = 10; k.strokeRect(300, -300, 1320, 600); k.strokeRect(300, 520, 1320, 900); k.fillStyle = 'rgba(255,200,120,0.12)'; k.fillRect(-1400, -1200, 4720, 3400); });
      V.layer(1, 0, (k) => {
        k.fillStyle = '#c9a35c'; rr(k, 860, 220, 200, 420, 40); k.fill(); k.fillStyle = '#b08b4a'; rr(k, 880, 240, 160, 380, 30); k.fill();
        const a = eback(clamp((t - lockT + 0.08) / 0.18)) * Math.PI / 2;
        k.save(); k.translate(960, 430); k.rotate(a); k.fillStyle = '#d9b56a'; rr(k, -36, -120, 72, 240, 30); k.fill(); k.fillStyle = '#c29a50'; rr(k, -14, -100, 28, 200, 12); k.fill(); k.restore();
        const ga = -2.5 + a * 0.35; glove(k, 960 - Math.cos(ga) * 270, 430 - Math.sin(ga) * 270, 2.0, ga, 0.55);
      });
    }, cues: [[lockT + 0.04, 'click']] });
  const pushA = wd(7, 4).s, pushB = pushA + 1.35, cx0 = 980, cx1 = 570, pv = (cx0 - cx1) / (pushB - pushA);
  add({ id: 'S10', at: cut(7, 3), note: 'push the couch against the door', hud: 56, cam: { x: 820, y: 480, w: 1800, px: 700, pw: 1000 },
    draw(c, V, lt, t) {
      const pt = clamp(t - pushA, 0, pushB - pushA), cx = cx0 - pv * pt;
      living(V, { couchX: cx });
      const st = 8 / 24, wk = walk(pt, cx + 206 + 150, pv, -1, HH, FLOOR, st, t < pushB ? Infinity : pushB - pushA);
      const hx = cx + 206 + 150 - (pt > 0 ? 0 : 0);
      V.chars(1, 0, LAMP, (k) => hero(k, { x: wk.x, feet: wk.feet, bob: wk.bob, dir: -1, lean: 0.38, hand: 'nub',
        hands: [[cx + 214, FLOOR - 168], [cx + 204, FLOOR - 150]], face: { expr: 'determined', t, seed: 1 } }));
    }, cues: [[pushA, 'scrape', { dur: pushB - pushA }], [pushB, 'thud']], steps: { from: pushA, to: pushB, every: 8 / 24 } });
  add({ id: 'S11', at: cut(8, 0), note: 'outside: one of them hits the lock', hud: 55, cam: { x: 1100, y: 520, w: 1700, px: 1350, pw: 950 },
    draw(c, V, lt, t) {
      const hit = wd(8, 1).s;
      hallway(V, { flicker: 1, dark: 0.25, zombies: [{ z: 1.75, X: 1880 }], drawZ: (k, z, sx, sy) => {
        const bump = Math.max(0, Math.sin(clamp((t - hit) / 0.3) * Math.PI)) * 14, h = 1000 / z.z, x = sx(z.X, z.z), y = sy(1360, z.z);
        const hl = hit - cut(8, 0), v = 110, wk = walk(lt, x - h * 0.3 - v * hl, v, 1, h, y, 7 / 24, hl);
        zombie(k, { x: wk.x, y, feet: wk.feet, bob: wk.bob, h, dir: 1, lean: 0.3 + shamble(t, 1), hands: [[wk.x + h * 0.28 - bump, y - h * 0.62], [wk.x + h * 0.3 - bump, y - h * 0.58]], face: { jaw: 0.5 + 0.5 * Math.sin(t * 5) }, seed: 3 });
      } });
    },
    over(c, lt, t) { const [x, y] = [W * (PORTRAIT ? 0.58 : 0.72), PIC.y + PIC.h * 0.2]; pill(c, 'LOCKED', x, y, pop(t, wd(8, 1).e), { ring: '#7fd17a' }); },
    cues: [[wd(8, 1).s, 'knock', { gain: 0.8 }], [wd(8, 0).s - 0.1, 'groan', { gain: 0.6 }]] });
  const crowdT = wd(8, 3).s;
  add({ id: 'S12', at: cut(8, 3), note: 'the crowd hits the door, the couch holds', hud: 55, cam: { x: 520, y: 520, w: 1250, px: 440, pw: 820 },
    draw(c, V, lt, t) {
      const hitk = (t - crowdT) > 0 ? Math.max(0, Math.sin((t - crowdT) * 9)) * Math.exp(-((t - crowdT) % 0.7) * 3) : 0;
      living(V, { couchX: cx1 + hitk * 6, doorShake: hitk, gap: 'rgba(255,214,150,0.9)' });
      V.layer(1.12, 0, (k) => { for (let i = 0; i < 4; i++) { const fx = 330 + i * 46 + Math.sin(t * 4 + i) * 10; k.fillStyle = '#0d0e12'; k.fillRect(fx, FLOOR - 8, 26, 8); } });
    },
    over(c, lt, t) { pill(c, 'LOCK + COUCH', W * (PORTRAIT ? 0.5 : 0.62), PIC.y + PIC.h * 0.18, pop(t, wd(8, 5).s)); },
    cues: [[crowdT + 0.05, 'pound', { n: 4, every: 0.7 }], [crowdT, 'groan', { gain: 0.8 }]] });

  // ── 2 · WATER ───────────────────────────────────────────────────────────────────────────────
  stepCard(S, 9, '2', 'WATER');
  const flowT = wd(10, 2).s;
  add({ id: 'S14', at: cut(10), note: 'fill the bathtub', hud: 49, cam: { x: 1180, y: 470, w: 1500, px: 1340, pw: 900 },
    draw(c, V, lt, t) {
      const f = clamp((t - flowT) / 0.2);
      bathroom(V, { level: 0.02 + 0.1 * clamp((t - flowT) / 3), flow: f });
      V.chars(1, 0, { col: '#f6e3c0', w: 4.5, dx: -1, dy: -0.5 }, (k) => hero(k, { x: 1560, dir: -1, lean: 0.32, hand: 'mitten', hands: [[1440, 430], [1385 - (f > 0 ? 10 : 0), 430 + (f > 0 ? 6 : 0)]], face: { expr: 'determined', t, seed: 2 } }));
    },
    over(c, lt, t) { pill(c, 'WATER · HOUR 1', PIC.x + PIC.w * (PORTRAIT ? 0.5 : 0.3), PIC.y + PIC.h * 0.16, pop(t, flowT + 0.1)); },
    cues: [[flowT - 0.05, 'squeak'], [flowT, 'water', { dur: 4.2 }]] });
  const diesT = wd(11, 3).s, pumpT = wd(11, 6).s, drainT = wd(11, 7).s;
  add({ id: 'S15', at: cut(11), note: 'cutaway: power dies, pumps die', hud: 48, cam: { x: 960, y: 520, w: 1700, pw: 1100, py: 560 },
    draw(c, V, lt, t) { section(V, { lights: 1 - clamp((t - diesT) / 0.5), pump: t < pumpT ? 1 : 0, water: 1 - eio((t - drainT) / 1.0), tubs: 0.4 }); },
    over(c, lt, t) { pill(c, 'POWER OFF', W / 2 - (PORTRAIT ? 0 : 420 * U), PIC.y + PIC.h * (PORTRAIT ? 0.18 : 0.14), pop(t, diesT), { bg: PAL.red }); pill(c, 'NO PRESSURE', W / 2 + (PORTRAIT ? 0 : 420 * U), PIC.y + PIC.h * (PORTRAIT ? 0.82 : 0.14), pop(t, drainT + 0.2)); },
    cues: [[diesT, 'powerdown'], [pumpT, 'pumpstop'], [drainT, 'drain']] });
  const litersE = wd(12, -1).e;
  add({ id: 'S16', at: cut(12), note: 'a full tub: 150 L', hud: 47, cam: { x: 1000, y: 560, w: 1250, pw: 820 },
    draw(c, V, lt, t) { bathroom(V, { level: lerp(0.3, 0.92, eio((t - L(12).start) / (litersE - L(12).start))), flow: 1, dof: 5 }); },
    over(c, lt, t) {
      const k = clamp((t - wd(12, 6).s) / (litersE - wd(12, 6).s)); if (t < wd(12, 6).s - 0.12) return;
      c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = 'rgba(18,24,40,0.86)'; const bw = 420 * U, bh = 170 * U, bx = W / 2 - bw / 2, by = PIC.y + PIC.h * (PORTRAIT ? 0.2 : 0.1);
      rr(c, bx, by, bw, bh, 30 * U); c.globalAlpha = pop(t, wd(12, 6).s - 0.12); c.fill(); goldText(c, `${Math.round(150 * eo(k))} L`, W / 2, by + bh / 2 + 4 * U, 110 * U); c.restore();
    }, cues: [[L(12).start, 'water', { dur: 3.4, gain: 0.8 }], [wd(12, 6).s - 0.12, 'blip'], [litersE, 'land']] });
  add({ id: 'S17', at: cut(13, 0), note: 'boil it', hud: 46, cam: { x: 960, y: 430, w: 1600, pw: 1000 },
    draw(c, V, lt, t) { stove(V, { boil: 0.4 + lt * 1.2 }); }, cues: [[cut(13, 0), 'boil', { dur: 0.9 }]] });
  const monthT = wd(13, 5).s, waterE = wd(13, -1).e;
  add({ id: 'S18', at: cut(13, 2), card: true, note: '37 days of water', hud: 46,
    draw(c, V, lt, t) {
      navyBg(c, lt);
      const f = clamp((t - monthT) / (waterE - monthT));
      c.save(); waterDays(c, W / 2, H / 2 + (PORTRAIT ? 120 : 70) * U, (PORTRAIT ? 1.0 : 0.62) * U, f); c.restore();
      goldText(c, `${Math.round(37 * eo(f))} DAYS`, W / 2, PIC.y + PIC.h * (PORTRAIT ? 0.22 : 0.14), 92 * U);
      c.save(); c.font = `800 ${30 * U}px Nunito`; c.fillStyle = '#c9c2b4'; c.textAlign = 'center'; c.letterSpacing = `${2 * U}px`; c.fillText('150 L ÷ 4 L A DAY', W / 2, PIC.y + PIC.h * (PORTRAIT ? 0.27 : 0.22)); c.restore();
    }, cues: [[monthT, 'drops', { dur: waterE - monthT }], [waterE, 'land']] });

  // ── 3 · LIGHTS ──────────────────────────────────────────────────────────────────────────────
  stepCard(S, 14, '3', 'LIGHTS');
  const offT = wd(15, 2).s;
  add({ id: 'S20', at: cut(15, 0), note: 'kill the lights', hud: 38, cam: { x: 760, y: 470, w: 1300, px: 660, pw: 760 },
    draw(c, V, lt, t) {
      const off = t > offT; living(V, { dark: off ? 1 : 0, switchDown: off, dof: 2 });
      V.chars(1, 0, off ? MOON : LAMP, (k) => hero(k, { x: 740, dir: -1, hand: 'mitten', hands: [[700, 640], [612, 528 + (off ? 8 : 0)]], face: { expr: 'determined', t, seed: 3 } }));
    }, look: (t) => ({ tint: t > offT ? '#203050' : null }), cues: [[offT, 'switch']] });
  const coverT = wd(15, 4).s;
  add({ id: 'S21', at: cut(15, 3), note: 'blanket over the window', hud: 37, cam: { x: 1200, y: 470, w: 1500, px: 1370, pw: 900 },
    draw(c, V, lt, t) {
      const b = lerp(0.45, 0.97, eio((t - coverT) / 1.0)); const hem = 210 + 420 * b;
      living(V, { dark: 1, blanket: b });
      V.chars(1, 0, MOON, (k) => hero(k, { x: 1370, view: 'front', noFace: true, hand: 'mitten', hands: [[1250, hem + 6], [1490, hem + 6]] }));
    }, look: () => ({ tint: '#203050' }), cues: [[coverT, 'cloth', { dur: 1.0 }]] });
  const streetT = wd(16, -1).s;
  add({ id: 'S22', at: cut(16, 0), note: 'one glowing window, the street looks up', hud: 36, cam: { x: 960, y: 420, w: 1920, push: 0.03, pushDur: 1.9, pw: 1000, px: 1000, py: 520 },
    draw(c, V, lt, t) {
      facade(V, { lit: 1 });
      const up = eio((t - streetT + 0.1) / 0.35), [ox] = facadeOurs();
      V.chars(1.3, 0, { col: '#ffcf8a', w: 2.5, dx: 0, dy: -1 }, (k) => {
        [[560, 1, 1], [800, -1, 2], [1120, 1, 3], [1340, -1, 4], [1560, -1, 5], [420, 1, 6]].forEach(([x, d, s]) => {
          const xx = x + Math.sin(t * 0.8 + s) * 12, h = 200;
          zombie(k, { x: xx, y: 950, h, dir: Math.sign(ox - xx) || d, lean: lerp(0.35, -0.15, up) + shamble(t, s), headDx: lerp(h * 0.14 * 0.55, h * 0.02, up), face: { eyeY: lerp(0.06, -0.3, up), jaw: 0.4 }, hands: [[xx + d * 40, 950 - 110], [xx + d * 46, 950 - 100]], seed: s });
        });
      });
    }, cues: [[streetT, 'groan', { gain: 1 }], [L(16).start, 'night', { dur: 5.4 }]] });
  add({ id: 'S23', at: cut(17), note: 'food here', hud: 35, cam: { x: 960, y: 520, w: 1920, pw: 1080 },
    draw(c, V, lt, t) {
      const B = makeView(c, { x: 1060, y: -40, w: 900, pw: 560 }, lt); facade(B, { lit: 1, dof: 7, skyDof: 7 });
      V.chars(1, 0, { col: '#ffcf8a', w: 4, dx: 0, dy: -1 }, (k) => {
        [[560, 1500, 1], [1040, 1700, 2], [1460, 1560, 3]].forEach(([x, h, s]) => zombie(k, { x, y: 470 + 0.86 * h, h, view: 'front', headDx: 0, lean: -0.05, feet: [[x - 60, 470 + 0.86 * h], [x + 60, 470 + 0.86 * h]], face: { eyeY: -0.32, jaw: 0.6 + 0.3 * Math.sin(t * 4 + s) }, seed: s + 4 }));
      });
    },
    over(c, lt, t) { pill(c, 'FOOD HERE', W / 2, PIC.y + PIC.h * (PORTRAIT ? 0.2 : 0.14), pop(t, wd(17, 0).s), { bg: PAL.red, size: 40 }); },
    cues: [[wd(17, 0).s, 'blip'], [cut(17) + 0.1, 'groan', { gain: 1.1 }]] });

  // ── 4 · POWER ───────────────────────────────────────────────────────────────────────────────
  stepCard(S, 18, '4', 'POWER');
  const plugT = wd(19, 1).s;
  add({ id: 'S25', at: cut(19, 0), note: 'glove plugs in the strip', hud: 24, cam: { x: 960, y: 480, w: 1920, pw: 1080 },
    draw(c, V, lt, t) {
      V.layer(1.3, 0, (k) => { k.fillStyle = '#39435a'; k.fillRect(-1400, -1200, 4720, 3400); k.fillStyle = 'rgba(150,175,230,0.10)'; poly(k, [1300, -400, 2200, -400, 1600, 1500, 700, 1500]); k.fill(); });
      const p = eio((t - plugT + 0.25) / 0.3);
      V.layer(1, 0, (k) => {
        k.fillStyle = '#d9d4c8'; rr(k, 760, 230, 300, 480, 30); k.fill(); k.fillStyle = '#c6c0b2'; for (const yy of [300, 520]) { rr(k, 830, yy, 160, 120, 40); k.fill(); k.fillStyle = '#262a33'; k.fillRect(870, yy + 30, 14, 40); k.fillRect(936, yy + 30, 14, 40); circ(k, 910, yy + 92, 10); k.fill(); k.fillStyle = '#c6c0b2'; }
        const px = lerp(1320, 1000, p);
        k.strokeStyle = '#efefea'; k.lineWidth = 26; k.lineCap = 'round'; k.beginPath(); k.moveTo(px + 120, 360); k.bezierCurveTo(px + 500, 360, 1700, 700, 2400, 900); k.stroke();
        k.fillStyle = '#efefea'; rr(k, px, 300, 150, 120, 26); k.fill(); k.fillStyle = '#9b978d'; k.fillRect(px - 26, 330, 30, 14); k.fillRect(px - 26, 376, 30, 14);
        glove(k, px + 230, 480, 2.0, Math.PI + 0.5, 0.75);
        if (p >= 1) { k.fillStyle = '#7fd17a'; k.shadowColor = '#7fd17a'; k.shadowBlur = 30; circ(k, px + 120, 330, 10); k.fill(); k.shadowBlur = 0; }
      });
    }, look: () => ({ tint: '#203050', tintA: 0.25 }), cues: [[plugT, 'plug']] });
  const items = [wd(19, 2).s, wd(19, 3).s, wd(19, 5).s];
  add({ id: 'S26', at: cut(19, 2), note: 'phone, power bank, flashlight', hud: 23, cam: { x: 960, y: 520, w: 1700, pw: 1100, px: 960, py: 560 },
    draw(c, V, lt, t) { desk(V, { pop: items.map((a) => (t - a + 0.06) / 0.25), charge: items.map((a) => eio((t - a - 0.15) / 1.2)) }); },
    look: () => ({ tint: '#203050', tintA: 0.2 }), cues: items.map((a) => [a - 0.04, 'blip']) });
  const nextT = wd(20, -1).s;
  add({ id: 'S27', at: cut(20), note: 'the grid goes', hud: 22, cam: { x: 960, y: 560, w: 1920, push: 0.03, pushDur: 1.8, pw: 1100 },
    draw(c, V, lt, t) { skyline(V, { blackout: eio((t - nextT) / 1.1) }); },
    over(c, lt, t) { pill(c, 'GRID · DOWN', W / 2, PIC.y + PIC.h * (PORTRAIT ? 0.2 : 0.12), pop(t, nextT + 0.5), { bg: PAL.red }); },
    cues: [[nextT, 'blackout', { dur: 1.2 }]] });

  // ── 5 · FOOD ────────────────────────────────────────────────────────────────────────────────
  stepCard(S, 21, '5', 'FOOD');
  const fridgeT = wd(22, 2).s;
  add({ id: 'S29', at: cut(22), note: 'eat the fridge first', hud: 11, cam: { x: 1300, y: 470, w: 1500, px: 1430, pw: 900 },
    draw(c, V, lt, t) {
      const op = eio((t - fridgeT + 0.1) / 0.35); kitchen(V, { dark: 1, fridge: op, fridgeLight: 1 });
      V.chars(1, 0, op > 0.3 ? { col: '#fff1cf', w: 6, dx: 1, dy: -0.3 } : MOON, (k) => hero(k, { x: 1240, dir: 1, hand: 'mitten', hands: [[1210, 640], [lerp(1395, 1240, op), lerp(400, 420, op)]], face: { expr: op > 0.5 ? 'relieved' : 'neutral', t, seed: 4, look: 1 } }));
    }, look: () => ({ tint: '#203050', tintA: 0.2 }), cues: [[fridgeT - 0.05, 'fridge']] });
  const powT = wd(23, 1).s, hoursE = wd(23, -1).e, fourT = wd(23, 7).s;
  add({ id: 'S30', at: cut(23), note: 'four hours of cold', hud: 10, cam: { x: 1530, y: 470, w: 900, pw: 560 },
    draw(c, V, lt, t) { const fl = t < powT ? 1 : (t < powT + 0.25 ? (hash(Math.floor(t * 24)) > 0.5 ? 1 : 0.2) : 0); kitchen(V, { dark: 1, fridge: 1, fridgeLight: fl }); },
    over(c, lt, t) {
      if (t < fourT - 0.6) return; const k = clamp((t - fourT) / (hoursE - fourT)), a = pop(t, fourT - 0.6);
      c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = a; const cx = W / 2, cy = PIC.y + PIC.h * (PORTRAIT ? 0.3 : 0.5), r = 150 * U;
      c.fillStyle = 'rgba(18,24,40,0.88)'; circ(c, cx, cy, r + 30 * U); c.fill();
      c.strokeStyle = 'rgba(242,178,102,0.25)'; c.lineWidth = 16 * U; circ(c, cx, cy, r); c.stroke();
      c.strokeStyle = '#f2b266'; c.beginPath(); c.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + TAU * (4 / 12) * eo(k)); c.stroke();
      goldText(c, `${Math.round(4 * eo(k))} HRS`, cx, cy + 4 * U, 84 * U); c.restore();
    }, look: () => ({ tint: '#203050', tintA: 0.2 }), cues: [[powT, 'powerdown', { gain: 0.6 }], [fourT - 0.6, 'blip'], [hoursE, 'land']] });
  add({ id: 'S31', at: cut(24), note: 'the cans can wait', hud: 9, cam: { x: 960, y: 520, w: 1600, pw: 1000 },
    draw(c, V, lt, t) {
      kitchen(V, { dark: 1, dof: 7 });
      V.layer(1, 0, (k) => { k.fillStyle = '#4a4f63'; k.fillRect(-1400, 860, 4720, 1600); k.fillStyle = '#5b6178'; k.fillRect(-1400, 840, 4720, 30); cans(k, 960, 860, 0.95, (t - L(24).start + 0.1) / 0.16); });
    },
    over(c, lt, t) { pill(c, 'CANS · LATER', W / 2, PIC.y + PIC.h * (PORTRAIT ? 0.2 : 0.12), pop(t, wd(24, -1).s)); },
    look: () => ({ tint: '#203050', tintA: 0.2 }), cues: [0, 1, 2, 3, 4, 5].map((i) => [L(24).start - 0.1 + i * 0.16, 'can']) });

  // ── MIDNIGHT ────────────────────────────────────────────────────────────────────────────────
  add({ id: 'S32', at: cut(25), note: 'midnight hallway', cam: { x: 960, y: 470, w: 1920, push: 0.03, pushDur: 1.9, pw: 1000 },
    draw(c, V, lt, t) { hallway(V, { dark: 0.55, flicker: hash(Math.floor(t * 8)) > 0.2 ? 1 : 0 }); },
    over(c, lt) { stamp(c, '4TH FLOOR · 11:58 P.M.', pop(lt, 0.15, 4)); }, cues: [[cut(25), 'whoosh', { gain: 0.6 }], [cut(25), 'hum', { dur: 2.2 }]] });
  const lightUp = wd(26, 3).s;
  add({ id: 'S33', at: cut(26, 0), note: 'the phone lights your face', cam: { x: 980, y: 520, w: 1050, pw: 640 },
    draw(c, V, lt, t) {
      living(V, { dark: 1, blanket: 0.97, dof: 5 });
      const g = t > lightUp ? 1 : 0;
      V.chars(1, 0, g ? { col: '#9fc3ff', w: 6, dx: 0.4, dy: -1 } : MOON, (k) => {
        hero(k, { ...sitting(1000, HH, { hands: [[905, 560], [925, 552]] }), hand: 'mitten', face: { expr: g ? 'worried' : 'calm', t, seed: 5, look: -0.3, eyeY: 0.25, turn: 0.3 } });
        k.fillStyle = g ? '#cfe0ff' : '#0b0c10'; rr(k, 885, 510, 46, 76, 8); k.fill();
      });
      if (g) V.layer(1, 0, (k) => { k.fillStyle = rgrad(k, 910, 470, 10, 380, [[0, 'rgba(140,180,255,0.32)'], [1, 'rgba(140,180,255,0)']]); k.fillRect(500, 0, 1000, 1000); });
    }, look: () => ({ tint: '#203050' }), cues: [[lightUp, 'buzz']] });
  const nbT = wd(26, -1).s;
  add({ id: 'S34', at: cut(26, 5), note: "it's your neighbor", cam: { x: 960, y: 470, w: 1700, pw: 1000 },
    draw(c, V, lt, t) { phone(V, { glow: 1, notif: (t - nbT) / 0.25, typed: 0 }); }, cues: [[nbT, 'blip']] });
  const msgW = T.words.filter((w) => w.line === 27);
  add({ id: 'S35', at: cut(27, 0), note: 'let me in', cam: { x: 960, y: 470, w: 900, pw: 640, py: 480 },
    draw(c, V, lt, t) {
      let n = 0; const parts = MSG.split(' '); let acc = 0;
      msgW.forEach((w, i) => { acc += (parts[i] || '').length + 1; if (t >= w.s) n = Math.min(MSG.length, Math.round(acc - 1 - (1 - clamp((t - w.s) / Math.max(0.05, w.e - w.s))) * (parts[i] || '').length)); });
      phone(V, { glow: 1, notif: 1, typed: n });
    }, cues: msgW.map((w) => [w.s, 'type']) });
  add({ id: 'S36', at: cut(27, 3), note: 'feet under the door', cam: { x: 470, y: 600, w: 1000, px: 420, pw: 640 },
    draw(c, V, lt, t) {
      living(V, { dark: 1, couchX: cx1, gap: 'rgba(255,224,170,0.95)', blanket: 0.97 });
      V.layer(1.5, 0, (k) => { k.fillStyle = 'rgba(255,224,170,0.25)'; poly(k, [306, FLOOR, 514, FLOOR, 600, FLOOR + 160, 220, FLOOR + 160]); k.fill(); const sh = Math.sin(t * 2.2) * 6; k.fillStyle = '#08090c'; k.fillRect(352 + sh, FLOOR - 14, 56, 14); k.fillRect(424 + sh * 0.7, FLOOR - 14, 56, 14); k.fillStyle = 'rgba(8,9,12,0.7)'; poly(k, [352 + sh, FLOOR, 408 + sh, FLOOR, 440 + sh, FLOOR + 150, 330 + sh, FLOOR + 150]); k.fill(); poly(k, [424, FLOOR, 480, FLOOR, 540, FLOOR + 150, 420, FLOOR + 150]); k.fill(); });
    }, look: () => ({ tint: '#203050' }), cues: [[cut(27, 3) + 0.3, 'shuffle']] });
  const beatT = L(28).start;
  add({ id: 'S37', at: beatT - 0.05, note: 'beat: your face', cam: { x: 960, y: 480, w: 1920, pw: 1080 },
    draw(c, V, lt, t) {
      const B = makeView(c, { x: 600, y: 470, w: 760, pw: 520 }, lt); living(B, { dark: 1, couchX: cx1, gap: 'rgba(255,224,170,0.95)', blanket: 0.97, dof: 9 });
      const look = eio((lt - 0.3) / 0.25) * -1;
      V.chars(1, 0, { ...MOON, w: 3 }, (k) => bigHead(k, 1020, 500, 1900, { face: { expr: lt > 0.45 ? 'scared' : 'worried', t, seed: 6, look, turn: look * 0.2 } }));
    }, look: () => ({ tint: '#203050' }), cues: [[beatT + 0.2, 'heart', { n: 2 }]] });
  const doorQ = wd(29, -1).s;
  add({ id: 'S38', at: cut(29), note: 'would you open the door?', cam: { x: 600, y: 520, w: 1500, push: 0.035, pushDur: 2.0, px: 470, pw: 820 },
    draw(c, V, lt, t) { const jig = t > doorQ ? Math.max(0, Math.sin((t - doorQ) * 30)) * Math.exp(-(t - doorQ) * 4) : 0; living(V, { dark: 1, couchX: cx1, gap: 'rgba(255,224,170,0.95)', blanket: 0.97, doorShake: jig * 0.5 }); },
    look: () => ({ tint: '#203050' }), cues: [[doorQ + 0.02, 'knob']] });
  const endT = L(29).end + 0.3;
  add({ id: 'END', at: endT, card: true, note: 'end card', end: endT + 3.4,
    draw(c, V, lt) {
      navyBg(c, lt, { cy: 0.62 });
      const k = eo(lt / 0.4); c.save(); c.globalAlpha = k;
      const s1 = fit(c, 'WOULD YOU OPEN THE DOOR?', 66 * U, W * 0.86);
      goldText(c, 'WOULD YOU OPEN THE DOOR?', W / 2, H * (PORTRAIT ? 0.36 : 0.3), s1, { col: '#f3ecdf', glow: 'rgba(255,255,255,0.25)', ls: 0.05 });
      goldText(c, 'PART 2', W / 2, H * (PORTRAIT ? 0.44 : 0.46), 110 * U * (0.9 + 0.1 * eback(clamp((lt - 0.4) / 0.3))));
      c.restore();
      // a tiny door with light under it, and you
      const V2 = makeView(c, { x: 560, y: 150, w: 2600, pw: 1500, py: 66 }, lt);
      V2.layer(1, 0, (q) => { q.globalAlpha = k; door(q, 300, 330, 220, 450, { dark: 0.6, gap: 'rgba(255,224,170,0.95)' }); q.fillStyle = 'rgba(255,224,170,0.18)'; poly(q, [306, 780, 514, 780, 640, 900, 180, 900]); q.fill(); });
      V2.chars(1, 0, { col: '#ffe0aa', w: 4, dx: -1, dy: 0 }, (q) => { q.globalAlpha = k; hero(q, { x: 760, dir: -1, face: { expr: 'worried', t: lt, seed: 7, look: -1 } }); });
    }, cues: [[endT, 'whoosh'], [endT + 0.4, 'land']] });
  return S;
}

// step cards: big gold number + label; "One." "Two." … sit on these
function stepCard(S, li, num, label) {
  S.push({ id: 'C' + num, at: ln(li).start - 0.1, card: true, note: `step ${num} card`,
    draw(c, V, lt) {
      navyBg(c, lt);
      const k = clamp(lt / (3 / 24));
      goldText(c, num, W / 2, H / 2 - 30 * U, 300 * U * lerp(0.86, 1, eback(k)));
      pill(c, label, W / 2, H / 2 + 150 * U, pop(lt, 0.12), { size: 40 });
    }, cues: [[ln(li).start - 0.1, 'whoosh'], [ln(li).start + 0.02, 'blip']] });
}
let _peep;
function scratchPeep() { if (!_peep) { _peep = document.createElement('canvas'); _peep.width = W; _peep.height = H; } const x = _peep.getContext('2d'); x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, W, H); return [_peep, x]; }

/** the opposite wall seen through our peephole: door 4B square-on */
function across(V, shake, t) {
  V.layer(1, 0, (c) => {
    c.fillStyle = '#8f8c7c'; c.fillRect(-1400, -1200, 4720, 3400);
    c.fillStyle = '#6f6c62'; c.fillRect(-1400, -1200, 4720, 1260);
    c.fillStyle = '#5d7a77'; c.fillRect(-1400, 600, 4720, 30);
    c.fillStyle = '#4e4840'; c.fillRect(-1400, 900, 4720, 1600); c.fillStyle = '#6b3b32'; c.fillRect(-1400, 960, 4720, 1600);
    const j = shake ? (hash(Math.floor(t * 24)) - 0.5) * 10 : 0;
    c.save(); c.translate(j, 0); door(c, 850, 330, 230, 570, { col: '#4c5e73', num: '4B' }); c.restore();
    c.fillStyle = '#fff3d6'; c.beginPath(); c.ellipse(960, 70, 110, 22, 0, 0, TAU); c.fill();
    c.fillStyle = rgrad(c, 960, 160, 0, 900, [[0, 'rgba(255,236,190,0.25)'], [1, 'rgba(255,236,190,0)']]); c.fillRect(-500, -600, 2900, 2200);
    c.fillStyle = '#3b3530'; rr(c, 860, 905, 210, 40, 8); c.fill();
  });
}
