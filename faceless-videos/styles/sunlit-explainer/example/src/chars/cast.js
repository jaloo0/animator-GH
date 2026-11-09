// Everyone in the film. Outfit flags → anatomy.bodyShape; face params → anatomy.headShape; LOOKS → human.js colours.
export const CAST = [
  { id: 'bullard', hair: 'short', part: true, mustache: true, stubble: 0.2, face: { nose: 1.05, jaw: 0.98, brow: 1.0 },
    outfit: { top: 'shirt', sleeves: 'rolled', vest: 'waist', legs: 'trousers' } },
  { id: 'worker', hair: 'short', stubble: 0.55, face: { nose: 0.95, jaw: 1.04, brow: 1.05, chin: 1.08, lips: 1.05 },
    outfit: { top: 'tee', sleeves: 'rolled', vest: 'hivis', legs: 'trousers' } },
  { id: 'soldier1', hair: 'buzz', stubble: 0.7, face: { nose: 1.0, jaw: 1.06, brow: 1.1, cheek: 1.04 },
    outfit: { top: 'tunic', sleeves: 'long', legs: 'breeches', puttees: true, belt: 'webbing' } },
  { id: 'soldier2', hair: 'buzz', stubble: 0.3, face: { nose: 1.1, jaw: 0.95, brow: 0.95, lips: 0.95, ear: 1.08 },
    outfit: { top: 'tunic', sleeves: 'long', legs: 'breeches', puttees: true, belt: 'webbing' } },
  { id: 'miner', hair: 'short', stubble: 0.9, mustache: true, face: { nose: 1.08, jaw: 1.08, brow: 1.12, cheek: 1.05 },
    outfit: { top: 'workshirt', sleeves: 'rolled', legs: 'trousers', suspenders: true } },
  { id: 'iron1', hair: 'short', stubble: 0.6, face: { nose: 1.0, jaw: 1.05, brow: 1.05 },
    outfit: { top: 'workshirt', sleeves: 'rolled', legs: 'trousers', overalls: true } },
  { id: 'iron2', hair: 'short', stubble: 0.4, mustache: true, face: { nose: 1.06, jaw: 1.0, brow: 1.0, chin: 1.05 },
    outfit: { top: 'workshirt', sleeves: 'rolled', legs: 'trousers', overalls: true } },
];

// colours per character (material slot → props), applied by Human.load(id, LOOKS[id])
export const LOOKS = {
  bullard: { skin: 0xc68d6c, hair: 0x3b2a1f, iris: '#7a5c3c', dirt: 0.15, seed: 1,
    slots: { 1: { c: 0xe2dbcc }, 7: { c: 0x5a4a3e }, 3: { c: 0x6a5e50 }, 4: { c: 0x5e3f2b } } },
  worker: { skin: 0xb27a58, hair: 0x2e2620, iris: '#5d4a36', dirt: 0.35, seed: 2,
    slots: { 1: { c: 0x5a5753, r: 0.9, det: 3 }, 3: { c: 0x8a7552, det: 4 }, 4: { c: 0x6a4630 } } },
  soldier1: { skin: 0xc08866, hair: 0x4a3626, iris: '#6b5a44', dirt: 0.55, seed: 3,
    slots: { 2: { c: 0x8d6a2f }, 3: { c: 0x86672f }, 11: { c: 0x806236 }, 6: { c: 0x9a8152 } } },
  soldier2: { skin: 0xd09a78, hair: 0x3a2a1c, iris: '#5a6a72', dirt: 0.5, seed: 4,
    slots: { 2: { c: 0x8a682f }, 3: { c: 0x84652e }, 11: { c: 0x7e6034 }, 6: { c: 0x968050 } } },
  miner: { skin: 0xb98060, hair: 0x2c2420, iris: '#5d4a36', dirt: 0.8, seed: 5,
    slots: { 1: { c: 0x9b8b6c, det: 3 }, 3: { c: 0x5c4c3c }, 15: { c: 0x4a3a2c }, 4: { c: 0x4e3626 } } },
  iron1: { skin: 0xc28a68, hair: 0x3a2a20, iris: '#6b5a44', dirt: 0.45, seed: 6,
    slots: { 1: { c: 0xc9bea6, det: 3 }, 3: { c: 0x7a5c3c, det: 4 }, 15: { c: 0x6e5236, det: 4 }, 4: { c: 0x4e3626 } } },
  iron2: { skin: 0xa8704f, hair: 0x2a221e, iris: '#4d3d2e', dirt: 0.45, seed: 7,
    slots: { 1: { c: 0xb6aa92, det: 3 }, 3: { c: 0x75583a, det: 4 }, 15: { c: 0x6a4e34, det: 4 }, 4: { c: 0x4a3424 } } },
};
