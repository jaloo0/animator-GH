// The shot list. Every cut sits just before a narration sentence; every beat inside a shot is keyed to the
// word it illustrates (w('word', after)). Sentences: data/narration.sentences.json.
import { PAL, clamp, lerp, key, ease, inv, noise1, mix } from './core/lib.js';
import { s as S, e as E, w } from './core/timing.js';
import { drawRoom, roomCam } from './sets/room.js';
import { drawPOV, ACROSS, acrossWindowRect, midWindowPos } from './sets/pov.js';
import { drawTower, drawAerial, ourWindowCenter } from './sets/outside.js';
import { drawBath, bathCam, drawSmallRoom, smallCam, drawHall, hallCam, drawPhone } from './sets/interiors.js';
import { signalWindowPos, HOR } from './sets/city.js';
import { hand, stroke } from './core/ink.js';
import * as C from './cards/cards.js';

const PRE = 0.15;
const cut = (i) => S(i) - PRE;
const DARK = { wave: 1.2, snowRoofs: true };
const BLANKET = '#557A5E';

export function buildShots() {
  const shots = [];
  const add = (o) => shots.push(o);
  const sig = signalWindowPos(), mid = midWindowPos();
  const acw = acrossWindowRect(), acc = { x: acw.x + acw.w / 2, y: acw.y + acw.h / 2 };

  // ---------------------------------------------------------------- NIGHT 1
  add({ id: 'S01', start: 0, note: 'tower, push to our window', tag: 'NIGHT 1', tagIn: true, draw(c, lt) {
    const u = ease.inOut(clamp(lt / 2.9)), [wx, wy] = ourWindowCenter();
    drawTower(c, { t: lt, cx: lerp(-60, wx, u), cy: lerp(-760, wy, u), zoom: lerp(0.55, 4.4, u * u), lit: 0.72, ours: 1, oursKind: 'lamp' });
  } });
  const tOff = w('off', S(1));
  add({ id: 'S02', start: cut(1), note: 'flat, 9:10, the city switches off', tag: 'NIGHT 1', draw(c, lt, sh, t) {
    const wave = clamp((t - tOff + 0.2) / 3) * 0.3;
    const look = t > tOff - 0.3 ? [0.55, -0.25] : [0.15, 0];
    drawRoom(c, roomCam({ z: -0.3 + lt * 0.08, x: 0.1 + lt * 0.02 }), { t, lamp: 1, hero: { x: 0.05, z: 4.6, pose: 'standMug', props: { R: 'mug' }, look }, city: { wave }, clock: [9, 10] });
  } });
  add({ id: 'S03', start: cut(2), note: 'POV: blackout rolls in from the horizon', tag: 'NIGHT 1', draw(c, lt, sh, t) {
    const wave = lerp(0.04, 0.5, ease.inOut(clamp(lt / 3.0)));
    drawPOV(c, { t, zoom: 1 + lt * 0.02, cx: 760, city: { wave, snow: 0.6 } });
  } });
  add({ id: 'S04', start: cut(4), note: 'aerial: block by block', tag: 'NIGHT 1', draw(c, lt, sh, t) {
    const wave = lerp(0.0, 1.0, clamp((lt - 0.2) / 4.6));
    drawAerial(c, { t, wave, zoom: 0.9 + lt * 0.025, rot: -0.12 + lt * 0.006, cx: 650, cy: 420, origin: [-800, -700], mark: [1250, 1080], markK: 1, snow: 0.5 });
  } });
  const tYours = w('yours', S(5)) + 0.15;
  add({ id: 'S05', start: cut(5), note: 'then yours: the lamp dies', tag: 'NIGHT 1', draw(c, lt, sh, t) {
    const d = t - tYours;
    const lamp = d < 0 ? 1 : d < 0.08 ? 0.3 : d < 0.16 ? 0.85 : d < 0.24 ? 0.1 : 0;
    drawRoom(c, roomCam({ z: -0.1 }), { t, lamp, hero: { x: 0.05, z: 4.6, pose: 'standMug', props: { R: 'mug' }, look: d > 0.1 ? [-0.7, -0.4] : [0.2, 0], eyeSize: d > 0.1 ? 1.25 : 1 }, city: DARK, faceGlow: d > 0 ? 0.75 : 0.35, clock: [9, 11] });
  } });
  add({ id: 'S06', start: cut(6), note: 'sofa, phone lights the face', tag: 'NIGHT 1', draw(c, lt, sh, t) {
    drawRoom(c, roomCam({ x: 1.0, y: 1.1, z: 1.9 + lt * 0.06, f: 900 }), { t, lamp: 0, phone: 1, hero: { x: 1.0, z: 4.62, pose: 'sitPhone', props: { R: 'phone' }, look: [0.1, 0.9], front: 1 }, city: DARK, faceGlow: 0.9, ambient: '#353D60' });
  } });
  const tl = [S(7), S(8), S(9), S(10)];
  add({ id: 'S07', start: cut(7), note: 'the alert', tag: 'NIGHT 1', draw(c, lt, sh, t) {
    const lines = [['Grid failure.', tl[0]], ['Expect days,', tl[1]], ['not hours.', tl[1] + 0.8], ['Stay home.', tl[2]], ['Stay warm.', tl[3]]].map(([text, t0], i) => ({ text, k: clamp((t - t0) / 0.7), big: i === 0 }));
    const bars = 1 - clamp((t - (E(10) - 0.6)) / 0.8);
    drawPhone(c, { t, lines, bars, noService: clamp((t - E(10)) / 0.3) });
  } });

  // ---------------------------------------------------------------- PROBLEM 1: WATER
  add({ id: 'S08', start: cut(11), note: 'problem 1: water', tag: 'NIGHT 1', draw(c, lt, sh) { C.problemCard(c, lt, { n: 1, word: 'WATER', icon: 'drop', wordAt: S(12) - sh.start - 0.05 }); } });
  add({ id: 'S09', start: cut(13), note: 'why the taps stop', tag: 'NIGHT 1', draw(c, lt, sh) { C.pressureCard(c, lt, { pumpAt: S(14) - sh.start, youAt: 1e9 }); } });
  add({ id: 'S09b', start: cut(15), note: 'you are on floor forty', tag: 'NIGHT 1', draw(c, lt, sh, t) {
    const [wx, wy] = ourWindowCenter(), u = ease.out(clamp(lt / 2.0));
    drawTower(c, { t, cx: wx, cy: lerp(wy + 300, wy, u), zoom: lerp(1.1, 2.2, u), lit: 0, ours: 1, oursKind: 'candle' });
    const k = clamp((lt - 0.3) / 0.6);
    c.save(); c.shadowColor = 'rgba(0,0,0,0.6)'; c.shadowBlur = 10;
    hand(c, 'FLOOR 40', 540, 130, { font: 'Permanent Marker', size: 76, color: PAL.cream, align: 'center', reveal: k, seed: 77 });
    c.restore();
  } });
  const tTap = S(16) + 0.35;
  add({ id: 'S10', start: cut(16), note: 'bath: what is left in the pipes', tag: 'NIGHT 1', draw(c, lt, sh, t) {
    const flow = clamp((t - tTap) / 0.4);
    drawBath(c, bathCam({ z: -0.7 + lt * 0.05 }), { t, water: 0.02 + clamp((t - tTap) / 8) * 0.25, stream: flow, candle: 1, hero: { x: -0.95, z: 1.55, pose: t > tTap - 0.4 ? 'kneel' : 'kneelPour', look: [0.8, -0.3] } });
  } });
  add({ id: 'S11', start: cut(17), note: 'fill the bath', tag: 'NIGHT 1', draw(c, lt, sh, t) {
    drawBath(c, bathCam({ x: -0.25, y: 1.15, z: 0.35 + lt * 0.05, f: 820, pitch: -0.18 }), { t, water: lerp(0.3, 0.72, ease.inOut(clamp(lt / 1.7))), stream: 1, candle: 1 });
  } });
  const tPot = S(18), tBot = S(19);
  add({ id: 'S11b', start: cut(18), note: 'every pot, every bottle', tag: 'NIGHT 1', draw(c, lt, sh, t) {
    const pots = [0, 1, 2, 3].map((i) => clamp((t - tPot - i * 0.13) / 0.35));
    const bottles = [0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => clamp((t - tBot - i * 0.07) / 0.3));
    drawBath(c, bathCam({ x: -0.25, y: 1.35, z: -0.55, f: 760, pitch: -0.36 }), { t, water: 0.78, stream: 1, candle: 1, pots, bottles });
  } });
  const tCough = w('coughs', S(20)), tStop = w('stops', S(20));
  add({ id: 'S12', start: cut(20), note: 'the tap coughs and stops', tag: 'NIGHT 1', draw(c, lt, sh, t) {
    const cough = t < tCough ? 0 : t < tStop ? 0.35 + 0.5 * Math.abs(Math.sin((t - tCough) * 9)) : 1;
    const stream = t < tStop ? 1 - (t > tCough ? 0.3 : 0) : 0;
    const drip = t > tStop + 0.1 ? (t - tStop - 0.1) / 0.9 : null;
    drawBath(c, bathCam({ x: 0.38 - lt * 0.02, y: 0.9, z: 1.6, f: 820, yaw: -0.62, pitch: -0.22 }), { t, water: 0.8, stream, cough, drip, candle: 1 });
  } });
  add({ id: 'S13', start: cut(21), note: 'water math', tag: 'NIGHT 1', draw(c, lt, sh) {
    C.waterCard(c, lt, { galAt: w('gallons', S(21)) - sh.start - 0.4, dayAt: S(22) - sh.start, monthAt: w('month', S(23)) - sh.start - 0.1 });
  } });

  // ---------------------------------------------------------------- PROBLEM 2: COLD
  add({ id: 'S14', start: cut(24), note: 'problem 2: cold', tag: 'DAY 2', tagIn: true, draw(c, lt, sh) { C.problemCard(c, lt, { n: 2, word: 'COLD', icon: 'thermo', wordAt: S(25) - sh.start - 0.05 }); } });
  add({ id: 'S15', start: cut(26), note: 'January, frost, breath', tag: 'DAY 2', draw(c, lt, sh, t) {
    drawRoom(c, roomCam({ z: 0.4 + lt * 0.08, x: -0.1 }), { t, lamp: 0, hero: { x: -0.35, z: 4.5, pose: 'hug', look: [0.5, -0.1] }, city: { ...DARK, dawn: true, snow: 1.6 }, breath: 1, frost: 1, windowLight: 0.85, ambient: '#4A5274', clock: [7, 40], candle: null });
  } });
  add({ id: 'S16', start: cut(27), note: 'temperature chart', tag: 'DAY 2', draw(c, lt, sh) { C.tempCard(c, lt, { eightAt: w('eight', S(27)) - sh.start - 0.1, fallAt: w('falling', S(27)) - sh.start }); } });
  add({ id: 'S17', start: cut(28), note: 'shrink your world (plan)', tag: 'DAY 2', draw(c, lt, sh) { C.planCard(c, lt, { outAt: w('shrink', S(28)) - sh.start }); } });
  const tBl = w('blankets', S(29)) - 0.1, tLive = w('live', S(29));
  add({ id: 'S18', start: cut(29), note: 'blankets over the door', tag: 'DAY 2', draw(c, lt, sh, t) {
    drawSmallRoom(c, smallCam({ x: 0.15, z: -0.4 + lt * 0.04 }), { t, blanket: clamp((t - tBl) / 0.8), candle: 1, hero: { x: 0.75, z: 2.45, pose: t < tBl + 0.5 ? 'reachHigh' : 'stand', facing: 'back' }, frost: 1 });
  } });
  add({ id: 'S19', start: tLive - 0.2, note: 'and live in there', tag: 'DAY 2', draw(c, lt, sh, t) {
    drawSmallRoom(c, smallCam({ x: -0.1, y: 1.1, z: -0.4 + lt * 0.06, f: 720 }), { t, blanket: 1, candle: 1, hero: { x: -0.7, z: 2.35, wrap: BLANKET, look: [0.5, 0.3], height: 1.3 }, breath: 0.8 });
  } });
  add({ id: 'S20', start: cut(30), note: 'candle ≈ bulb', tag: 'DAY 2', draw(c, lt, sh) { C.heatCard(c, lt, { bulbAt: w('bulb', S(30)) - sh.start - 0.2 }); } });
  const tHands = S(32);
  add({ id: 'S21', start: cut(31), note: 'warm your hands', tag: 'DAY 2', draw(c, lt, sh, t) {
    const u = ease.inOut(clamp((t - tHands + 0.3) / 1.6));
    drawSmallRoom(c, smallCam({ x: lerp(-0.1, 0.0, u), y: lerp(1.15, 0.95, u), z: lerp(-0.4, 0.55, u), f: lerp(720, 820, u), pitch: lerp(0, -0.1, u) }), { t, blanket: 1, candle: 1, candleR: lerp(1.3, 2.1, u), hero: { x: -0.25, z: 2.3, wrap: BLANKET, mitts: true, look: [0.6, 0.6], height: 1.3 }, breath: 1, ambient: '#353B5E' });
  } });
  add({ id: 'S22', start: cut(33), note: 'never: stove, barbecue', tag: 'DAY 2', draw(c, lt, sh) { C.noCard(c, lt, { x1At: w('heat', S(33)) - sh.start, bbqAt: S(34) - sh.start, x2At: w('inside', S(34)) - sh.start }); } });
  add({ id: 'S23', start: cut(35), note: 'carbon monoxide', tag: 'DAY 2', draw(c, lt, sh) {
    C.coCard(c, lt, { smellAt: w('smell', S(35)) - sh.start, colourAt: w('colour', S(35), w('color', S(35))) - sh.start, sleepAt: w('while', S(35)) - sh.start - 0.5 });
  } });

  // ---------------------------------------------------------------- NIGHT 3: THE LIGHT
  add({ id: 'S24', start: cut(36), note: 'you can see the whole city', tag: 'NIGHT 2', tagIn: true, draw(c, lt, sh, t) {
    drawRoom(c, roomCam({ z: -0.2 + lt * 0.25, y: 1.32 }), { t, lamp: 0, candle: { k: 1 }, hero: { x: 0.35, z: 4.95, pose: 'stand', facing: 'back' }, city: DARK, mug: false });
  } });
  add({ id: 'S24b', start: cut(37), note: 'none of it is lit', tag: 'NIGHT 2', draw(c, lt, sh, t) { drawPOV(c, { t, zoom: 1 + lt * 0.03, cx: 760, city: { ...DARK, snow: 0.8 } }); } });
  const tOn = w('on', S(39)) - 0.05;
  add({ id: 'S25', start: cut(38), note: 'night 3: one window comes on', tag: 'NIGHT 3', tagIn: true, draw(c, lt, sh, t) {
    const on = t < tOn ? 0 : clamp((t - tOn) / 0.12) * (t - tOn < 0.25 ? 0.6 + 0.4 * Math.abs(Math.sin((t - tOn) * 60)) : 1);
    drawPOV(c, { t, zoom: lerp(1.15, 2.3, ease.inOut(clamp(lt / 4.4))), cx: lerp(820, sig.x, ease.inOut(clamp(lt / 3.5))), cy: lerp(HOR + 40, sig.y + 10, ease.inOut(clamp(lt / 4))), city: { ...DARK, signal: { on, glow: 1.4 } } });
  } });
  add({ id: 'S26', start: cut(40), note: 'fortieth floor, same as you', tag: 'NIGHT 3', draw(c, lt, sh, t) {
    const u = ease.inOut(clamp(lt / 3));
    drawPOV(c, { t, zoom: lerp(2.6, 4.2, u), cx: sig.x, cy: sig.y, screenY: 380, frame: 0.0, city: { ...DARK, signal: { on: 1, glow: 0.8 }, snow: 0.5 }, after(cc) {
      const k = clamp((t - S(40)) / 0.6), k2 = clamp((t - S(41)) / 0.5);
      hand(cc, '40th floor', 640, 330, { font: 'Permanent Marker', size: 58, color: PAL.cream, reveal: k, seed: 61 });
      stroke(cc, [[630, 316], [575, 368]], { w: 4, seed: 62, color: PAL.cream, reveal: k });
      hand(cc, 'same as you', 650, 400, { font: 'Patrick Hand', size: 44, color: PAL.amber, reveal: k2, seed: 63 });
    } });
  } });
  add({ id: 'S27', start: cut(42), note: 'candle to the glass', tag: 'NIGHT 3', draw(c, lt, sh, t) {
    const lift = ease.inOut(clamp(lt / 1.4));
    drawRoom(c, roomCam({ x: 0.55, z: 1.2 + lt * 0.12, y: 1.4, f: 800 }), { t, lamp: 0, candle: null, hero: { x: 0.45, z: 4.95, pose: lift > 0.5 ? 'candleUp' : 'holdCandle', props: { R: 'candle' }, facing: 'back' }, city: { ...DARK, signal: { on: 1 } }, heroCandle: 1 });
  } });
  const beats = [w('once', S(43)), w('twice', S(44)), w('three', S(45))];
  const covered = (t) => beats.some((b) => t > b - 0.05 && t < b + 0.42);
  add({ id: 'S28', start: cut(43), note: 'once, twice, three times', tag: 'NIGHT 3', draw(c, lt, sh, t) {
    const cv = covered(t);
    drawRoom(c, roomCam({ x: 0.6, z: 2.2 + lt * 0.05, y: 1.45, f: 820 }), { t, lamp: 0, candle: null, hero: { x: 0.45, z: 4.95, pose: cv ? 'candleCover' : 'candleUp', props: { R: 'candle' }, facing: 'back' }, city: { ...DARK, signal: { on: 1 } }, heroCandle: cv ? 0.12 : 1 });
  } });
  const bb = [S(47) + 0.05, S(47) + 0.55, S(47) + 1.05];
  add({ id: 'S29', start: cut(46), note: 'it blinks back three times', tag: 'NIGHT 3', draw(c, lt, sh, t) {
    const off = bb.some((b) => t > b && t < b + 0.28);
    drawPOV(c, { t, zoom: 1.6 + lt * 0.05, cx: sig.x - 60, city: { ...DARK, signal: { on: off ? 0.03 : 1 } } });
  } });
  add({ id: 'S30', start: cut(48), note: 'problem 3: light', tag: 'NIGHT 3', draw(c, lt, sh) { C.problemCard(c, lt, { n: 3, word: 'LIGHT', icon: 'candle', wordAt: 0.55 }); } });
  add({ id: 'S31', start: cut(49), note: 'a candle seen a mile away', tag: 'NIGHT 3', draw(c, lt, sh) { C.seeCard(c, lt, { lineAt: 0.7, mileAt: w('mile', S(49)) - sh.start - 0.6 }); } });
  add({ id: 'S32', start: cut(50), note: 'everyone knows which window is yours', tag: 'NIGHT 3', draw(c, lt, sh, t) {
    const [wx, wy] = ourWindowCenter(), u = ease.inOut(clamp(lt / 4.2));
    drawTower(c, { t, cx: lerp(wx, 0, u), cy: lerp(wy, -620, u), zoom: lerp(2.4, 0.42, u), lit: 0, ours: 1, oursKind: 'candle' });
  } });

  // ---------------------------------------------------------------- NIGHT 5 → 9
  add({ id: 'S33', start: cut(51), note: 'supplies, night 5', tag: 'NIGHT 5', tagIn: true, draw(c, lt, sh) {
    C.suppliesCard(c, lt, { waterAt: S(52) - sh.start, candlesAt: S(53) - sh.start, phoneAt: S(54) - sh.start, pocketAt: w('pocket', S(54)) - sh.start - 0.4 });
  } });
  add({ id: 'S34', start: cut(55), note: 'map: two streets away', tag: 'NIGHT 5', draw(c, lt, sh) { C.mapCard(c, lt, { fiveAt: S(56) - sh.start }); } });
  add({ id: 'S35', start: cut(57), note: 'POV: the nearer tower', tag: 'NIGHT 5', draw(c, lt, sh, t) {
    drawPOV(c, { t, zoom: lerp(1.5, 1.8, clamp(lt / 2)), cx: mid.x + 80, city: DARK, mid: { on: 1 } });
  } });
  add({ id: 'S36', start: cut(58), note: 'night 7: across the street', tag: 'NIGHT 7', tagIn: true, draw(c, lt, sh, t) {
    const u = ease.inOut(clamp(lt / 3.6));
    drawPOV(c, { t, zoom: lerp(1.0, 1.25, u), cx: lerp(900, acc.x, u), cy: HOR + 40, city: DARK, across: { on: 1 } });
  } });
  const tLamp = S(61), tSofa = S(62);
  add({ id: 'S37', start: cut(60), note: 'you can see the room', tag: 'NIGHT 7', draw(c, lt, sh, t) {
    const u = ease.inOut(clamp(lt / 1.2));
    const fx = t < tLamp ? acc.x : t < tSofa ? lerp(acc.x, acw.x + acw.w * 0.25, ease.inOut(clamp((t - tLamp) / 0.5))) : lerp(acw.x + acw.w * 0.25, acw.x + acw.w * 0.72, ease.inOut(clamp((t - tSofa) / 0.5)));
    drawPOV(c, { t, zoom: lerp(2.2, 6.4, u), cx: fx, cy: acc.y + 4, screenY: 370, frame: 1 - u, city: DARK, across: { on: 1, room: true, figure: 0 } });
  } });
  const tYellow = w('yellow', S(64)) - 0.1;
  add({ id: 'S38', start: cut(63), note: 'someone at the window — your beanie', tag: 'NIGHT 7', draw(c, lt, sh, t) {
    const u = ease.inOut(clamp(lt / 4.5)), rev = clamp((t - tYellow) / 0.5);
    drawPOV(c, { t, zoom: lerp(6.4, 10.5, u), cx: acw.x + acw.w * lerp(0.5, 0.57, u), cy: acw.y + acw.h * lerp(0.5, 0.56, u), screenY: 370, frame: 0, city: DARK, across: { on: 1, room: true, figure: clamp(lt / 0.6), beanieCol: mix('#4A4A52', PAL.mustard, rev) } });
  } });
  add({ id: 'S39', start: cut(65), note: 'like yours', tag: 'NIGHT 7', draw(c, lt, sh, t) {
    drawRoom(c, roomCam({ x: 0.3, y: 1.38, z: 1.7 + lt * 0.18, f: 900 }), { t, lamp: 0, candle: null, mug: false, hero: { x: 0.3, z: 4.4, pose: 'holdCandle', props: { R: 'candle' }, look: [0, 0], eyeSize: 0.62 }, city: DARK, faceGlow: 0.85 });
  } });
  add({ id: 'S40', start: cut(66), note: 'night 9: the building is dark', tag: 'NIGHT 9', tagIn: true, draw(c, lt, sh, t) {
    drawPOV(c, { t, zoom: 1.4 + lt * 0.04, cx: acc.x - 80, city: { ...DARK, snow: 1.2 }, across: { on: 0 } });
  } });
  const tLine = w('thin', S(68)) - 0.2;
  add({ id: 'S41', start: cut(68), note: 'a line of warm light under the door', tag: 'NIGHT 9', draw(c, lt, sh, t) {
    drawHall(c, hallCam({ z: -0.5 + lt * 0.16 }), { t, line: clamp((t - tLine) / 0.9), hero: { x: 0.05, z: 2.5, pose: 'holdCandle', props: { R: 'candle' }, facing: 'back' }, heroCandle: 1 });
  } });
  const tBlow = w('blow', S(69)) + 0.45;
  add({ id: 'S42', start: cut(69), note: 'you blow out your candle', tag: 'NIGHT 9', draw(c, lt, sh, t) {
    const k = 1 - clamp((t - tBlow) / 0.35);
    drawHall(c, hallCam({ x: 0.3, y: 1.45, z: 0.6, f: 820 }), { t, line: 1, hero: { x: 0.0, z: 2.6, pose: 'candleUp', props: { R: 'candle' }, facing: 'back' }, heroCandle: k, smoke: t > tBlow ? clamp((t - tBlow) / 1.6) : 0, ambient: mix('#30364F', '#232740', 1 - k) });
  } });
  const tFeet = E(70) + 0.7;
  add({ id: 'S43', start: cut(70), note: 'the line stays on', tag: 'NIGHT 9', draw(c, lt, sh, t) {
    drawHall(c, hallCam({ z: -0.2 + lt * 0.06 }), { t, line: 1, feet: clamp((t - tFeet) / 0.25), hero: { x: 0.05, z: 2.7, pose: 'holdCandle', props: { R: 'candle' }, facing: 'back' }, heroCandle: 0, ambient: '#1F2338' });
  } });
  add({ id: 'S44', start: E(70) + 1.9, end: E(70) + 6.4, note: 'part 2 tomorrow', finish: { grain: 0.12, wash: 0.1, vignette: 0.2 }, draw(c, lt) { C.endCard(c, lt); } });
  // ---------------------------------------------------------------- sound cues (rendered by tools/mix.py)
  const cues = [];
  const q = (t, type, o = {}) => cues.push({ t: +t.toFixed(3), type, ...o });
  q(0, 'hum', { end: tYours, fadeFrom: tOff, fadeTo: S(4) + 3.5 });
  q(tOff - 0.05, 'thump', { gain: 0.8 });
  for (let i = 0; i < 7; i++) q(S(4) + 0.25 + i * 0.62, 'knock', { gain: 0.35 + i * 0.08, pitch: 1 - i * 0.03 });
  q(tYours, 'lampoff', { gain: 0.9 });
  q(tYours, 'wind', { end: E(70) + 1.6 });
  q(S(6) + 0.25, 'buzz'); q(S(6) + 0.85, 'buzz');
  q(S(7) - 0.25, 'chime', { gain: 0.55 });
  q(E(10) - 0.1, 'lost', { gain: 0.5 });
  for (const i of [12, 25]) q(S(i) - 0.02, 'felt', { gain: 0.7 });
  q(S(48) + 0.5, 'felt', { gain: 0.7 });
  q(tTap - 0.05, 'water', { end: tStop, coughFrom: tCough, fill: [tTap, S(18) + 0.2] });
  for (let i = 0; i < 4; i++) q(tPot + i * 0.13 + 0.05, 'clay', { gain: 0.55, pitch: 1 + i * 0.06 });
  for (let i = 0; i < 9; i++) q(tBot + i * 0.07 + 0.04, 'clay', { gain: 0.32, pitch: 1.9 + (i % 3) * 0.12 });
  for (let n = 1; n < 3; n++) q(tStop + 0.1 + 0.9 * n - 0.02, 'drip', { gain: 0.5 });
  q(tBl, 'cloth', { gain: 0.8 });
  for (let i = 0; i < 3; i++) q(tBl + 0.55 + i * 0.3, 'knock', { gain: 0.42, pitch: 1.5 });
  q(tOn, 'swell', { gain: 0.6 });
  for (const b of bb) q(b + 0.28, 'answer', { gain: 0.5 });
  q(tBlow - 0.3, 'blow', { gain: 0.8 });
  q(tFeet - 0.15, 'creak', { gain: 0.6 });
  shots.cues = cues;
  return shots;
}
