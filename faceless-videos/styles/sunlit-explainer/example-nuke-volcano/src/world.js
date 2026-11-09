// The film's world: four sets, each its own scene (outside the volcano, the crater, the bomb's core, the cross-section).
import { buildOutside } from './sets/outside.js';
import { buildCrater } from './sets/crater.js';
import { buildCore } from './sets/core.js';
import { buildSection } from './sets/section.js';

const q = new URLSearchParams(location.search);
export async function buildWorld(renderer) {
  const only = q.get('sets') ? q.get('sets').split(',') : null;
  const need = (s) => !only || only.includes(s);
  const sets = {};
  if (need('outside')) sets.outside = buildOutside(renderer);
  if (need('crater')) sets.crater = buildCrater(renderer);
  if (need('core')) sets.core = buildCore(renderer);
  if (need('section')) sets.section = buildSection(renderer);
  return { sets };
}
