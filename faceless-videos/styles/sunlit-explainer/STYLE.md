# Sunlit Explainer — stylized 3D explainers, 16:9 (people) or 9:16 (objects), ≤ 30 s

A fast-cut 3D history / how-it-works short in the style of Zack D. Films: game-engine humans at work in sunlit
sets, one object carried through time, a narrator telling a surprising true story, the music drop on the reveal.
Everything is code (three.js + numpy): people are sculpted as signed-distance fields, meshed and skinned in Node;
sets, textures, type, sound and grade are generated. No image/video models, no paid API.

Examples to study and copy: `example/` = **HARD BOILED** (16:9, people, section 7) and `example-nuke-volcano/` = **WHAT IF YOU NUKED A VOLCANO?** (9:16, objects + particles, section 8). Style sheet: `style-sheet.jpg`.

## 1. The look

Rules from the style sheet (do not break them):
- **Sun low and warm from one side** (elevation 6–17°), never overhead, never night. Each set has its own sun (`makeSky({ az, el })`).
- **Blue belongs to the sky and the helmet only** — never a background panel, never type. Hardhat blue `#6AA6DB`.
- **Orange is only safety gear** (hi-vis vest `#E5784A`, material slot 9) or skin in sunlight — never a graphic accent.
- **Graphite `#4B4845` is the only ink.** Type is never white, never coloured, never floating over the image:
  it exists only **printed on objects** (stencils, stamps, signs, calendars, labels), shot **at an angle and
  cropped or occluded** — never flat, never whole.
- **Every character is mid-task with hands visible** — gripping, lifting, hammering, pouring. Never posing,
  **never looking at the camera** (aim `look()` at the work).
- **One soft blurred foreground element per frame** (a cup, sandbag, pipe edge, a hand, steam) — via depth of field.
- Stylized-real game-engine humans, never photographic, never cartoon. **No gore, no combat, no injury**:
  history is shown through work and objects (soldiers dig and carry, they don't fight).
- No pure black (the grade lifts shadows to RGB 0.05/0.044/0.04), no neon, no saturated red.
- Mood: earnest, warm, tactile, curious, sunlit.

Palette (the sheet's swatches, all used in the code): trench timber `#8B5B3B` · khaki wool `#8D6A2F` ·
scorecard cream `#E5DFD0` · print graphite `#4B4845` · hardhat blue `#6AA6DB` · vest orange `#E5784A`.
Skies: top `0x4a8fd2…0x4b8fd0`, haze `0xf0d9b8…0xf7d2a6`, sun `0xffc48a` (sunset `0xffb87a`); warm fog per set.

Grade defaults (`src/core/engine.js`, override per shot in `look`): exposure 1.25, AgX tone curve, warm 0.7,
sat 1.14, bloom 0.22 (threshold 0.9), vignette 0.3, grain 0.016, slight chromatic fringe at the edges.

## 2. The format

- **1920×1080, 30 fps, 25–30 s.** (`?port` / `QS='&port'` gives 1080×1920 with fov ×1.55, but no shot is framed for
  it — every camera would need re-checking.)
- **Fast cuts**: HARD BOILED has 18 shots in 29.8 s (≈ 1.7 s each, shortest ≈ 1 s). Camera always moving (push,
  crane, orbit, whip), slight hand-held drift (`cam.shake`, degrees).
- **Story shape**: hook on a familiar object today ("This hard hat exists because of a war.") → match-cut/morph into
  the past → the problem → the person and the making (process shots: steam, glue, paint, stamp) → the payoff place
  and date, **with the music drop on the reveal shot** → a small gag → pull back and fade.
- **Narration**: Kokoro `am_michael`, speed 1.06, 5–7 sentences (≈ 80 words), gaps 0.3–0.4 s; the **last line's
  gap is the outro** (1.1 s in the example) — it sets the film length (`T.dur`). Numbers spelled as said.
- **Cuts land on words**: a shot starts `wt('word', after) - 0.06…0.14` so the picture changes just before the word.

## 3. Engine map (`example/`)

| file | gives you |
|---|---|
| `index.html` | player (`?shot=D4`, `?t=12.3`, `&sets=shop`, `&port`), or the character lab with `?lab&char=<id>` |
| `src/main.js` | boot (fonts → timing → world → shots), per-frame `pose(t)` → `render(t)`, motion-blur sub-frames, `window.OP` (the API `tools/capture.mjs` drives). Fonts: system Rockwell if present, else the free Arvo (same family name `Rockwell`) |
| `src/core/timing.js` | `wt(word, after = 0, which = 's')` start (or `'e'` end) of the first word at/after `after` (normalised, prefix match; **throws if not found**), `S(i)` / `Se(i)` sentence start/end, `T.dur` |
| `src/core/engine.js` | `makeEngine(canvas)` → `{ renderer, render(scene, camera, t, look, sub) }`: MSAA HDR → DOF gather → bloom → AgX grade. `W, H, FPS, PORT` |
| `src/core/sky.js` | `makeSky(renderer, { az, el, top, mid, haze, ground, sunCol, sunI, cloud, glow, groundBounce })` → `{ dome, env, sun, sunDir, U, frame(center, half) }` gradient sky + cirrus, PMREM env, shadow-casting sun |
| `src/core/util.js` | `E` easings (`io, out, in, expo, outExpo, back, outBounce…`), `seg(t, a, b, ease)`, `kf(t, [[t, v, ease?]…])`, `spline(points, u)`, `drift`, `clamp, lerp, sstep, V(x,y,z), hash` |
| `src/core/tex.js` | painted PBR textures → `{ map, roughnessMap, normalMap }`: `timber, burlap, dirt, concrete, rock, steel, canvasCloth, paper`, `paintPBR(w, h, fn)`; `printText(canvas, lines, { font, weight, size, x, y, align, color, rot, track, style: 'slab'│'stencil'│'pencil'│'stamp', wear, seed })`; `noise2, rng, canvas, toTex` |
| `src/props/kit.js` | `pbr(tex, { repeat, color, rough, metal, ns, sheen })`, `mesh(geo, mat, { pos, rot, scale, parent, cast })`, `boxM(w,h,d)` (UVs in metres), `ringLathe`, `decal(w, h, draw, { curved, curvedV })` (printed-type plane, can wrap a cylinder), `scatter(geo, mat, n, place)`, `sandbagGeo` |
| `src/props/hats.js` | `makeHat('hardhat'│'brodie'│'boiled'│'cap')` → `{ group, setShape(a, b, t), setMaterial(kind), material() }`. All `HATS` profiles have 12 points, so any two **morph point-for-point** (the hard hat → doughboy helmet toss) |
| `src/chars/cast.js` | `CAST` (shape) + `LOOKS` (colour) per character — see below |
| `src/chars/anatomy.js` + `sdf.js` | the sculpt: 51 bones (`BONES`), `headShape(spec)`, `handShape`, `bodyShape(spec)`, SDF `Shape` (ell/cone/box/tor/cyl/shell), `polygonize` (narrow-band surface nets), `attributes` (materials, skin weights, AO) |
| `tools/build_chars.mjs` | `node tools/build_chars.mjs [id …]` (from the project root) → `data/chars/<id>.bin + .json`, ~15 s and 16–20 MB each |
| `src/chars/human.js` | `Human.load(id, look)` and the posing API (below); `GRIPS` finger poses; `OUTFITS.base` material slots |
| `src/sets/*.js` | `buildModern / buildTrench / buildShop / buildMine / buildBridge(renderer, cast)` → `{ name, scene, sky, reset(), update?(t), …named parts }` |
| `src/world.js` | `buildWorld(renderer)`: which characters each set needs, extra recoloured clones, the hero hat, every set |
| `src/shots.js` | `buildShots(T, W)`: the shot list + the sound cues |
| `src/lab.js` | one character under film light, 10 views (face, hands, grips, back) for checking a sculpt |
| `tools/capture.mjs` | headless Chrome: `check`, `scenes`, `sheet`, `frames`, `panels`, `eval`, `cues`, `video` |
| `tools/mix.py` | narration + `audio/music.*` (ducked) + procedural foley/ambience from `data/cues.json` → `data/mix.wav` |

**Characters.** One adult-male body/skeleton; variety comes from the face, hair, outfit and colours.
```js
// cast.js — CAST
{ id: 'miner', hair: 'short'│'buzz'│'none', part: true, mustache: true, stubble: 0.9,
  face: { nose, jaw, brow, cheek, chin, lips, ear, skull },            // multipliers around 1.0
  outfit: { top: 'shirt'│'tee'│'workshirt'│'tunic', sleeves: 'rolled'│'long', vest: 'waist'│'hivis',
            legs: 'trousers'│'breeches', puttees: true, belt: true│'webbing', suspenders: true, overalls: true } }
// cast.js — LOOKS: skin/hair hex, iris css colour, dirt 0–1, seed, slots: { <material id>: { c: hex, r, det } }
```
Material ids (`anatomy.M`): 0 skin, 1 shirt, 2 coat, 3 pants, 4 boot, 5 hair, 6 belt, 7 vest, 8 apron, 9 hivis,
10 metal, 11 puttee, 12 reflective, 13 sole, 14 lip, 15 strap. Cheap extras: load an existing build with other
colours, e.g. `Human.load('soldier1', { ...LOOKS.soldier1, skin: 0x8e5c40, seed: 9 })` (world.js does this for soldier3/iron3).
Women, children or other body types need new sculpt code in `anatomy.js` — budget for it or avoid them.

**Posing a `Human` (call every frame; `set.reset()` restores the rest pose first):**
- place: `h.group.position/rotation` (feet), `h.root.position.y` = pelvis height (rest 0.955; lower to crouch);
  the `stand(h, x, z, yaw, { y, drop, lean, twist })` helper at the top of `shots.js` does this + leg IK.
- `h.rot(bone, x, y, z)` degrees on top of rest (`'spine'`, `'chest'`, `'neck'`, `'head'`, …).
- `h.armIK('L'│'R', wristTarget, elbowPole, Human.handQ(side, fingersDir, palmNormal), twistShare)`;
  `h.legIK(side, ankle, kneePole)`. `wristFor(grip, fingers, palm)` (shots.js) puts the palm on a grip point.
- `h.fingers(side, GRIPS.hold│holdThin│pinch│rim│fist│open│relax│point)` (or a custom `{ index: [mcp, pip, dip], thumb, opp, spread }`).
- `h.look(worldPoint, amt, neckShare)` turns neck+head+eyes; `h.aimEyes(p)`. Point it at the task, never the lens.
- `h.attach(obj, bone, pos, q)`, `h.at(bone, offset)` world point, `h.worldQ(bone)`. Hats ride the head bone (`wear()`).
- A three.js object lives in one scene: the hero prop travels between sets with `put(obj, set.scene)`.

**A set** builds one `THREE.Scene` with its sky (`scene.add(sky.dome, sky.sun, sky.sun.target); scene.environment = sky.env`),
warm `THREE.Fog`, painted-texture geometry, printed type as `decal()`s or `printText` on a texture canvas, and
its people (`scene.add(cast.x.group)`). Return `{ name, scene, sky, reset() { people.reset() }, update(t) {…}, parts… }`.
Register it in `world.js` (import, `need('name')`, add its cast ids before building, `sets.name = buildX(renderer, cast)`).
Reusable bits: trench.js exports `makeShovel, makeMallet, makeCanteen, makeMotes`; shop.js has (unexported)
`makeCalendar` (tear-off sheet), `makeShafts` (light shafts), `makeSteam`, `makeDrape` (cloth sheet onto a form),
`addPaintMask` (paint sweep via `uPaint`), the exploded `layers`.

**A shot** (`shots.js`):
```js
add({ id: 'D4', set: 'shop', start: tD4, note: 'glued them together — exploded view',
  setup(W, lt, t) {                       // W = { sets, cast, hats }; lt = time in shot; t = film time
    const S = W.sets.shop;                // pose people/props as a pure function of t
    return { cam: { pos: [x,y,z], look: [x,y,z], fov: 34, shake: 0.08, roll: 0 },
             look: { focus: distanceToSubject, aper: 0.03, warm: 0.75, exposure: 1.5, fade: 1 },
             mb: 4, shutter: 0.5,          // motion-blur sub-frames (1 = off); use on whips/fast moves only
             shadowAt: [x,y,z], shadowSize: 1.5 };   // sun shadow box centre + half-size (m): keep it tight
  } });
```
A shot runs until the next one starts; the last ends at `T.dur`. `aper` ≈ 0.004 (wide, all sharp) … 0.034 (macro);
the foreground blur needs something between the lens and the focus distance.

**Sound cues** (bottom of `buildShots`): `C(t, type, { g, pan, dur, … })`. Types `tools/mix.py` knows:
`amb` (`set: 'site'│'wind'│'room'│` anything else = high wind, `dur`), `whoosh` (`dur, f0, f1`), `shimmer` (`dur`),
`lift, catch, clunk, scrape, knock, tink, pebble, cloth, snap, stamp, tok`, `pour, cart, grit, tear, steam, rivetgun` (`dur`),
`brush` (`dur, wet`). An unknown type prints `mix.py: no sound for cue type …` — add a branch in mix.py for it. Keep everything soft:
low thunks, filtered noise, no clicks/ticks/hats.

## 4. Make a new video

`SKILL` = this skill's folder. Run from the project folder.
```bash
bash SKILL/scripts/new_video.sh sunlit-explainer <name>      # → ~/faceless-videos/<name>/ (full example; builds the cast, ~2 min)
cd ~/faceless-videos/<name>
```
1. **Research + script.** A true, checkable story; every date/name from a primary source. Rewrite `script.json`
   (`narrator`, `lines: [{ text, gap }]`; spell numbers as spoken; last gap ≈ 1.1 s). Then:
   `SKILL/scripts/py SKILL/scripts/voice.py .` → `data/narration.wav` + `data/narration.sentences.json`;
   `SKILL/scripts/py SKILL/scripts/words.py .` → `data/words.json` (read `data/words.txt` to plan cuts).
2. **Shot plan** (write it before coding): one shot per beat, 15–20 shots, each with set, action (hands on a task),
   camera move, the printed-type object if any, the foreground blur element, and the cue word.
3. **Cast.** Edit `src/chars/cast.js` (CAST + LOOKS), `node tools/build_chars.mjs <id>`, check it:
   `QS='&lab&char=<id>' node tools/capture.mjs panels review/lab.jpg "0,1,2,3,4,5,6,7,8,9" 2 0.5`
   (the lab shows skin/hair only, not the LOOKS outfit colours). Delete unused ids from CAST/world.js.
4. **Sets + props.** Reuse a set when the place fits (modern job site, 1918 trench, workshop, mine portal,
   bridge-tower top); otherwise copy the closest set file and rebuild it. Register in `world.js`. Preview one set fast
   with `&sets=<name>` (other sets' shots then error — preview only).
5. **Shots.** Rewrite `buildShots`: times from `wt()`; replace the example's fixed times — `tB1 = 2.75` and
   `tF2 = 24.311` (the example's music drop). The last shot's fade and the high-wind bed already end at `T.dur`.
   Rewrite the cue list.
6. **Music.** Either keep a royalty-free track as `audio/music.mp3`, or make one: edit `audio/song.json` (caption:
   warm documentary underscore, ~90 BPM, pizzicato/felt piano/marimba, soft highs, no heavy drums/cymbals, a gentle
   swell and a resolve; `duration` ≈ film + 6–10 s) and `bash SKILL/scripts/music/make_music.sh .`
   (needs ACE-Step: `bash SKILL/scripts/music/install_acestep.sh`, ~15 GB, 10 GB free to run) → `audio/takes/seed<N>.wav`;
   listen, copy the best to `audio/music.wav` (it wins over `music.mp3`).
   In `tools/mix.py` the splice `cut_a, cut_b = 26.977, 32.309` belongs to the example's take: set new downbeats
   or replace from `cut_a, cut_b, xf = …` through `music = np.concatenate(…)` with `music = mus`.
   Find the take's drop by ear plus a waveform picture
   (`ffmpeg -i audio/music.wav -filter_complex "aformat=channel_layouts=mono,showwavespic=s=1920x240" -frames:v 1 review/wave.png`;
   x / 1920 × duration = seconds), then make the reveal shot start on it (move the shot, or shift the music in mix.py:
   `mus = mus[int(d * SR):]` advances it by d s).
7. **Sound + check + render.**
```bash
node tools/capture.mjs cues data/cues.json && SKILL/scripts/py tools/mix.py .     # prints rms ≈ -18.5 dBFS, peak ≤ -1
python3 -m http.server 8170          # http://127.0.0.1:8170/?shot=D4   (space = play with sound, [ ] = prev/next shot)
node tools/capture.mjs check                                 # every shot renders, ms/frame, errors → exit 2
node tools/capture.mjs scenes review/sheet.jpg all 2 0.25    # 2 frames per shot — LOOK at it
node tools/capture.mjs frames review/f "12.3,18.4"           # full-size stills of key moments
node tools/capture.mjs video renders/<name>_16x9.mp4 0 -1 5 --audio      # ≈ 1 min on an M-series Mac (CRF 15 master)
ffmpeg -i renders/<name>_16x9.mp4 -c:v libx264 -crf 20 -preset slow -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart renders/<name>_16x9_share.mp4
```
Keep the share file ≤ ~35 MB (raise CRF to 22–23 if bigger). Draft renders: add `--draft` (half size, faster).

## 5. Check before showing

On the sheet and full-size frames, every shot:
- sun low from one side, long soft shadows; blue only in sky/helmets, orange only on safety gear; no pure black, no neon/red;
- people mid-task: **hands actually on the tool/object** (no floating palms, no fingers through props), nobody facing
  the lens, no T-pose limbs, no candy-wrapped wrists (raise `twistShare`), feet on the ground;
- type only printed on objects, graphite, angled + cropped, still readable for the half-second it's on screen; spelling;
- one soft foreground element; focus on the subject (`look.focus` = camera→subject distance);
- the cut lands just before its word; the music drop lands on the reveal shot; the last shot fades out by `T.dur`;
- sound: soft foley (no ticks, clicks, hats), voice clear over music;
  `ffmpeg -i renders/<name>_16x9.mp4 -af loudnorm=print_format=summary -f null -` → integrated ≈ −16 LUFS;
- facts: every date, name and claim checked; no combat, no injury on screen.

## 6. Gotchas

- `setup()` must be a **pure function of `t`**: frames render out of order in 5 parallel workers and motion blur
  re-poses at sub-frame times. Never keep state between frames; let `set.reset()` restore people.
- `wt()` throws on a missing word — words keep the **script's** spelling (`wt('nineteen', 12)`), prefix match
  (`'hard'` also matches `hardhat`), and use `after` to pick the right occurrence.
- Colours: JS hex values (`new THREE.Color(0x…)`, material colours, `makeSky` options) are converted to linear for you;
  **raw colour `vec3` literals inside material/sky shader patches** (`human.js` skin patch, `sky.js`, shop.js
  `addPaintMask`, e.g. the black paint `vec3(0.032, 0.027, 0.024)`) must be written **linear** (sRGB 0.5 ≈ linear 0.214)
  or they come out washed and pale. The renderer outputs linear; only the grade shader (engine.js) works in sRGB after
  its own conversion.
- Motion blur accumulates sub-frames with `renderer.autoClear = false` (engine.js); `mb: 7` makes those frames 7×
  slower — only on whips and fast moves.
- `capture.mjs` navigates over CDP, so `QS='&port'`, `QS='&sets=shop'`, `QS='&lab&char=x'` keep their `&` params.
- Skinning: weights are quantised to bytes with the rounding remainder put on the largest weight (`sdf.js attributes`);
  keep that if you touch the builder, or skin shimmers/tears at joints.
- `build_chars.mjs` writes to `data/chars` of the **current folder** — run it from the project root. The `.bin` files
  are not in the skill zip; `new_video.sh` builds them.
- Keep `shadowAt`/`shadowSize` tight on the subject (the sun's shadow map covers ±`shadowSize` m) or shadows go soft and blocky.

## 7. The example: HARD BOILED (29.8 s, 5 sets, 18 shots)

True story: Edward W. Bullard came home from WWI, saw miners with nothing protecting their heads, and in 1919, in his
father's San Francisco shop, steamed layers of canvas, glued them and painted them black, after the doughboy
helmet: the "Hard Boiled Hat". In 1933 the Golden Gate Bridge became America's first official Hard Hat Area.
- A1–A2 modern site: hands lift the blue hard hat off a concrete pipe, toss — it **morphs** into a doughboy helmet, whip down.
- B1–B3 1918 trench: it lands in a soldier's hands; sweep over helmets; water poured into an upturned helmet ("shaped like bowls").
- C1 shop (helmet on the hook) · C2–C3 mine portal: ore cart; pebbles fall on a soft cloth cap.
- D1–D5 shop: 1918 calendar sheet torn off; crane down through light shafts; canvas steamed and draped; exploded layers; paint sweep.
- E1 the stamp on the hat box: HARD BOILED HAT.
- F1–F4 Golden Gate south tower, sunset: match cut onto a Hard Boiled hat; orbit at the **drop (24.31 s)**; a rivet bounces off a hat; the HARD HAT AREA sign is nailed up; pull back, fade.
Sound: Kokoro `am_michael`, ACE-Step take seed89 (spliced to resolve at 29.8 s), soft foley, ≈ −16 LUFS.
Study `src/shots.js` for every technique; `review/` sheets are not shipped — make your own with `scenes`.

## 8. The second example: WHAT IF YOU NUKED A VOLCANO? (`example-nuke-volcano/`, 9:16, 30.8 s, 15 shots)
A **vertical** explainer about a what-if, not a history story, and it has no humans: the hero is an object (a fictional
bomb, the XB-30) in four sets. Start from it with `bash SKILL/scripts/new_video.sh sunlit-explainer <name> --from nuke-volcano`
for a 9:16 science / "what would happen if" short. Use `example/` for 16:9 stories with people at work.
The look rules still hold (low warm sun, graphite printed type on objects, one foreground blur, no gore); lava
and fire are the only hot colours. The engine is the same family (`engine.js`, `sky.js`, `tex.js`, `kit.js`,
`timing.js` with `wt()`), and adds:
| file | adds |
|---|---|
| `src/sets/outside.js` | a 1 km cone volcano (`heightAt`), crater pool, flank lava channels, ash column / ejecta, clouds |
| `src/sets/crater.js` | the lava lake (ripples, crust rafts), a balance (1 lava cube = 3 water cubes), a pyrometer dial, splash / puff / dust |
| `src/sets/core.js` | an explosive-sphere diagram + the upright X-ray bomb |
| `src/sets/section.js` | a cut-away volcano: strata, magma chamber, shaft, rig, blast, cracks, mile marks |
| `src/sets/fx.js` | `lavaMaterial()`, `addLavaGlow()`, `particles(o)` (GPU particles, a pure function of t), `craggy()` |
| `src/props/bomb.js` | the XB-30 with an X-ray shell and insides, `trefoil()`, `wedge()` |
| captions (`main.js`) | short-form word captions: 1–3 words at a time from `data/words.json`, white bold with a soft black stroke, a small pop, at 70 % height (`CapSans` = the computer's Arial Bold, else the free Arimo); `&nocap` hides them. HARD BOILED has none (type only on objects); vertical shorts need them |

Fixes this example ships with (keep them in anything you build from it):
- **Particle back-face fix.** Stretched (velocity-aligned) particle quads built from a mirrored basis were back-face
  culled, so the splash, sparks and ejecta were invisible. `fx.js` keeps every quad front-facing (see the comment in
  `particles()`). If particles vanish in a new effect, check the winding first.
- **Effects slide to the words.** Each particle system has `userData.shift` (seconds), set at the top of
  `buildShots()` from `wt()` times, so a re-voiced script re-times the splash, sparks and eruption by itself.
- **Music impact sync.** `audio/song.json` has `"impact"`: the second of the ACE-Step take where its big hit lands.
  The shot list emits a `music_sync` cue at the eruption, and `tools/mix.py` shifts the take so the hit lands there. For a new
  take, find its hit by ear + a waveform picture and update `impact`.
- **Voice: Kokoro `am_michael` @ 1.1** (`script.json`). A female voice was tried on this video and the author went
  back to Kokoro. Ask the user which voice before narrating.
- **Tone:** the Khronos PBR Neutral tone curve (`look.tone`, default 1) keeps lava orange; AgX washed it salmon. Keep
  lava HDR peaks ≲ 4 or it goes pastel. A young ash column needs the under-glow fading with height (`glowH`) or it glows orange.
- Don't render in Chrome while ACE-Step is generating music on a 16 GB machine.
