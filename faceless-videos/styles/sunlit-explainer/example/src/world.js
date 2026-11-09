// The whole film's world: load the cast once, build every set (each its own scene, sky and sun).
import { Human } from './chars/human.js';
import { LOOKS } from './chars/cast.js';
import { makeHat } from './props/hats.js';
import { buildModern } from './sets/modern.js';
import { buildTrench } from './sets/trench.js';
import { buildShop } from './sets/shop.js';
import { buildMine } from './sets/mine.js';
import { buildBridge } from './sets/bridge.js';

const q = new URLSearchParams(location.search);
export async function buildWorld(renderer) {
  const only = q.get('sets') ? q.get('sets').split(',') : null;
  const need = (s) => !only || only.includes(s);
  const ids = new Set();
  if (need('modern')) ids.add('worker');
  if (need('trench')) { ids.add('soldier1'); ids.add('soldier2'); }
  if (need('shop')) ids.add('bullard');
  if (need('mine')) ids.add('miner');
  if (need('bridge')) { ids.add('iron1'); ids.add('iron2'); }
  const cast = {};
  await Promise.all([...ids].map(async (id) => { cast[id] = await Human.load(id, LOOKS[id]); }));
  if (need('trench')) cast.soldier3 = await Human.load('soldier1', { ...LOOKS.soldier1, skin: 0x8e5c40, hair: 0x221c18, seed: 9, iris: '#4a3a2c' });
  const hats = { hero: makeHat('hardhat') };
  const sets = {};
  if (need('modern')) sets.modern = buildModern(renderer, cast);
  if (need('trench')) sets.trench = buildTrench(renderer, cast);
  if (need('shop')) sets.shop = buildShop(renderer, cast);
  if (need('bridge')) cast.iron3 = await Human.load('iron1', { ...LOOKS.iron1, skin: 0x9a6648, hair: 0x241e1a, seed: 11 });
  if (need('mine')) sets.mine = buildMine(renderer, cast);
  if (need('bridge')) sets.bridge = buildBridge(renderer, cast);
  return { sets, cast, hats };
}
