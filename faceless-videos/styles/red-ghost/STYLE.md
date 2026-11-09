# Red Ghost — crime-reconstruction horror short (9:16 + 16:9)

A ~30 s narrated reconstruction: glowing ember-red people with no faces move through a dim, real-looking room,
one yellow caption line at a time, a calm male narrator, a twist, a cut to black. True crime, a creepy encounter,
a historical mystery. 100 % code: three.js set, ray-marched figures, procedural sound. No image/video/music AI.
Look reference: `style-sheet.jpg` (next to this file). Working examples: `example/` (THE 2 A.M. CALL, ~30 s, 9:16 + 16:9) and `example-too-tall/` (TOO TALL, a 1-minute true-crime case, 9:16, section 8).

## 1 · The look
**Do**
- Every person is a glowing ember-red silhouette: no skin, no clothing colour, no readable face (the head is a
  smooth shape). Only ONE glowing figure is the hero of a frame; others are dim (`gain` ~0.1–0.3) or off-frame.
- The figure lights the room: red point lights + a red floor pool + a mirrored copy in the glossy floor. It is
  never pasted on. The room is never brighter than the figure.
- The room is dim and photoreal (walnut, wallpaper, planks, brass, lamps), lit by 1–2 warm practicals.
- Captions: ONE line, centred, lower third (`CAP_Y`), yellow bold Arial with a black stroke. Never at the top,
  never two caption styles on screen at once. The opening hook is white condensed caps with one boxed word.
- Dates and numbers glow (cream `stamp()`); sentences never do. Sound words ("Ring!", "Knock.") are small white
  italics pinned next to the thing that makes the sound.
- Mood: ominous, cinematic, clinical, nocturnal, uncanny. Slow dolly moves with a tiny handheld drift.

**Don't**: gore, visible weapons, victims shown, blood, injuries. Tension comes from light, pose and sound.
Don't use real victims' names unless the user gives a documented case and wants it. No red on walls or props
(ember red belongs only to figures and the light they spill); yellow is only caption text; cream is only
lamplight and date stamps. No shiny props near a figure's head (they read as eyes).

**Palette** (style sheet → code)
| role | sheet | in code |
|---|---|---|
| ember figure | `#FF3D17` | `Figure` core `[1.0, 0.042, 0.008]`×0.78, rim `[1.0, 0.17, 0.045]`×1.7, lights `0xff2a0e` (figure.js) |
| oxblood dark | `#2E0D0A` | grade lifts the deepest blacks toward oxblood (engine.js `GradeShader`) |
| subtitle yellow | `#F4EC1C` | `YEL` (text.js) |
| lampshade cream | `#F2E2BE` | `CREAM` (text.js), shade emissive `0xf2e2be`, lamp `0xffcf95`, table lamp `0xffc68c` (hall.js) |
| walnut panel | `#5A3122` | `walnut()` texture (tex.js) |
| arcade blush | `#E6767C` | not used in the example (keep it for small accents, never on figures) |

Tone mapping is **Neutral** (`THREE.NeutralToneMapping`, engine.js): ACES turns the ember red salmon/white.
Post: bloom 0.6 (threshold 0.36), vignette 0.55, soft grain 0.022, tiny chroma at the edges.

## 2 · The format
- 1080×1920 (9:16) by default; 1920×1080 with `?land` in the URL (`LAND` in engine.js: overlay scale `UI` 0.72,
  camera fov ×0.88, smaller caption/hook/stamp sizes). Same shots, both aspects. 30 fps.
- ~30 s, ~70 words, 10–13 short sentences. Structure: **hook** (date + who + where, white caps, one boxed word)
  → **normal** (alone, night) → **wrong** (phone, breathing, a knock, a voice) → **twist** (it's not where she
  thinks: "behind her.") → last image holds 1–2 s, a final sound, cut to black.
- Narrator: Kokoro `am_michael`, speed ~1.03. Optional second voice: lines with `"v": "p"` in script.json become a
  whispered 1990-handset phone voice (`am_onyx`, speed 0.82, gain 0.75). Gaps per line set the rhythm: 0.25 s
  inside a beat, 0.5–0.6 s between beats, 1.5–2 s before the twist / at the end.
- **One script line = one sentence = index `i`** in the shots: `s(i)` start, `e(i)` end, `w(i, 'word')` the
  time that word is spoken inside sentence i. Cuts sit just before a sentence; beats land on words.

## 3 · Engine map (`example/`)
| file | what it gives you |
|---|---|
| `index.html` | player page: canvas `#out` (2D composite), hidden `#gl` (WebGL), `<audio src=data/mix.wav>`, three.js import map |
| `src/main.js` | boot (fonts → timing → world → shots), `makeWorld()` (scene, `buildHall`, two `Figure`s: `girl` kind 0, `man` kind 1 dim), `resetWorld()` (resets every animated thing each frame), `placeHandset()` + coiled cord, `render(t)` (shot.setup → camera → `engine.render` → `shot.over` → `drawCaptions` → `look.black`), the `window.OP` capture API |
| `src/core/engine.js` | `makeEngine(glCanvas)` → `{ render(scene, camera, t, look) }`; exports `W, H, FPS, LAND, UI` |
| `src/core/figure.js` | the red ghost: `new Figure(scene, { kind, core, rim, coreGain, rimGain, light })`; `fig.pose(P)`, `fig.at(bone, localV3)`, `fig.gain = g`, `fig.eyes = g` (glowing eyes, kind 1 only), `fig.visible`, `fig.hide(v)`; pose helpers `stand(pos, yaw, t, o)`, `local(pos, yaw, x, y, z)`, `ldir(yaw, x, y, z)`, `V(x, y, z)`; bones `BN` |
| `src/core/text.js` | `caption(ctx, text, { y, alpha, italic, size, color })`, `hook(ctx, words, boxedIndex, { y, alpha, size })`, `stamp(ctx, text, { x, y, size, alpha, track })`, `sfxWord(ctx, text, x, y, k, { size, rot, alpha })`, `toScreen(camera, v3)` → `{ x, y, behind }`, `YEL`, `CREAM`, `CAP_Y` |
| `src/core/tex.js` | textures painted in code: `floorPlanks(seed)` → `{ map, rough }`, `walnut(seed, { dark, w, h, stretch })` → `{ map, rough }`, `wallpaper(seed)`, `rug(seed)`, `portrait(seed)` (blank pale face), `photo(seed)` (blurred family photo), `glow(size, power)` (radial sprite); helpers `rng(seed)`, `noise2(seed)` (+ `.fbm`); the internal `paint(w, h, fn)` per-pixel painter for new textures |
| `src/core/timing.js` | `loadTiming()`, `T` (`T.S` sentences, `T.words`, `T.dur`), `s(i)`, `e(i)`, `w(i, word)` (word inside sentence i; falls back to the sentence start if not found) |
| `src/sets/hall.js` | `buildHall(scene, renderer)` → `{ root, lamp, lampShade, tlamp, frontDoor, closetPivot, under, spill, phoneBase, handset, cord, M }`; `HALL` (room bounds + door/closet/phone/lamp positions), `updateCord(mesh, A, B, t)` |
| `src/shots.js` | `buildShots()` (shots + sound cues), `frozen()` / `manPose()` / `onPhone()` / `phonePose()` poses, `buildCaptions()`, `drawCaptions(ctx, t)` |
| `tools/capture.mjs` | headless Chrome: `check`, `scenes`, `sheet`, `frames`, `eval`, `cues`, `video` (see header) |
| `tools/mix.py` | the whole soundtrack from `data/cues.json` + `data/narration.wav` → `data/mix.wav` (+ `data/stems/`) |

**Figures.** A body is ~40 signed-distance shapes (GLSL `map()` in figure.js) on a 17-bone skeleton
(`pelvis spine chest neck head uarmL farmL handL uarmR farmR handR thighL shinL footL thighR shinR footR`),
ray-marched inside its bounding box (writes real depth, so it sits in the room). Pose object:
`{ pos: [x, z], yaw: deg, root: { pos: [x, y, z], rot: [x, y, z] }, b: { bone: [x, y, z] deg },
ik: { handL|handR: { target: V3, pole: V3, rot }, footL|footR: { target: V3 (ankle), pole } }, look: V3 }`.
Start from `stand(pos, yaw, t, { knee, contra, lean, hunch, nod })` (breathing idle, feet planted by IK), then
override bones, add hand IK targets (`local()` for figure-space points, `ldir()` for poles), and `look` to turn the
head toward a world point. `fig.at('head', V(...))` gives world points on the body (used to put the handset at
her ear). `kind: 0` = slim, bob haircut; `kind: 1` = broader chest, no hair, `eyes` glow. A new body type (a cap,
a hood, a coat) = a new `uKind` branch in `map()` built from `sdEll` / `sdRC` / `sdRBox` / `smin` in the head
bone's space (`Lb(4, p)`). There is **no walk cycle** yet: for a walk, move `pos` along a path with time and swing
the `footL`/`footR` IK targets on alternating sine arcs (and a small root bob); keep it slow.
Visibility: `fig.visible = true` then `fig.pose(P)` shows it; `fig.hide(false)` hides it (the argument is the new
visibility). `resetWorld()` hides `man` and resets gains every frame, so each shot turns on what it needs.

**Sets.** Every frame is rendered from scratch at time t (`resetWorld()` → `setup()`), so the set must be fully
re-posable: anything a shot moves (doors, lamps, the handset) is reset in `resetWorld()`. The hall is 4 m wide
(x −2…2), 6.6 m deep (z −4 front door … 2.6 closet), ceiling 2.7 m, built with `box()` / `wall()` / `wains()` /
`LatheGeometry` props and MeshStandardMaterials on code-painted textures. Light = one shadow-casting floor lamp
(PointLight `castShadow`), a table lamp, a weak `HemisphereLight` (0.18), and a PMREM environment from a dark box
with one hot sphere at the lamp (`environmentIntensity` 0.35). The floor is semi-transparent (opacity 0.84,
`renderOrder` 2) so each figure's mirror copy shows through as a reflection — keep the floor at y = 0.
**A different room**: copy hall.js to `src/sets/<room>.js`, keep the helpers + the lighting/env block + the floor
setup, replace the architecture and props, export `build<Room>()` + a `ROOM` constants object, then in main.js
swap the import, rewrite `resetWorld()` for the new handles, and drop `placeHandset()` / `HANDSET_CRADLE` /
`CORD_ANCHOR` if there is no wall phone. New surface → a new exported function in tex.js using `paint()`.

**Shots** (`buildShots()` in shots.js): `add(id, start, note, setup, over)`.
- `setup(w, lt, t)` poses the world (`w = { scene, hall, girl, man, camera, THREE, HALL, handset }`, `lt` = time in
  shot) and returns the look: `{ cam: { pos, look, fov, near, shake (deg, default 0.12), roll }, exposure, bloom,
  bloomRadius, bloomThreshold, vignette, grain, fade, black (0–1 fade to black) }`. `dolly(a, b, k, [fov0, fov1], o)`
  eases between two framings `[[camPos], [lookAt]]`.
- `over(ctx, w, lt, t)` draws 2D on top (stamps, sound words via `toScreen`). Captions are separate:
  `buildCaptions()` lists `yel(text, from, to, { italic })` and `hk(words, boxedIndex, from, to)` on sentence/word
  times; `drawCaptions()` fades each in/out over 0.08 s.
- Timeline anchors at the top of `buildShots()` (`tRing1 = s(1) + 0.05`, `knocks = [e(8) + 0.18, …]`) keep every
  beat tied to the narration, so a re-voiced script re-times itself. The last shot ends at `tEnd = T.dur + 0.9`.
- Sound cues: `cue(t, type, { dur, gain })` → `OP.cues()` → `data/cues.json`. Types mix.py knows: `ring` (bell, dur),
  `pickup`, `hangup` (clunk + bell ting), `line` (handset hiss, dur; the FIRST line also gets slow breathing),
  `knock` (heavy door knock, gain), `swell` (low noise swell, dur), `closetknock` (muffled), `creak` (hinge, dur),
  `sting` (riser into a sub boom + dissonant cluster), `lastknock` (muffled, the final hit). `breath` is exported but
  mix.py ignores it. A new cue type needs its own `for c in C.get('<type>', [])` block in mix.py.
- Score (mix.py): sub drone + low pad + wind on an intensity arc keyed to the first `knock` and the `sting`, a
  detuned music-box lullaby from 0.55 s and a wrong-note echo after the sting, room tone, voice ducking.

## 4 · Make a new video
```bash
bash SKILL/scripts/new_video.sh red-ghost <name>          # → ~/faceless-videos/<name>/ (renders as-is)
cd ~/faceless-videos/<name>
# 1. write script.json (narrator + optional phone voice, one sentence per line, gaps)
SKILL/scripts/py SKILL/scripts/voice.py .                 # data/narration.wav + data/narration.sentences.json
SKILL/scripts/py SKILL/scripts/words.py .                 # data/words.json (+ words.txt to eyeball)
# 2. rewrite src/shots.js: anchors, shots, poses, captions (buildCaptions), cues; a new src/sets/<room>.js if the
#    story isn't in a front hall (+ main.js makeWorld/resetWorld). Keep cue types mix.py knows, or add sounds.
node tools/capture.mjs check                              # every shot renders, no errors (exit 2 on errors)
node tools/capture.mjs scenes review/shots.jpg all 4 0.25 # 4 frames per shot — LOOK at it
QS=_land node tools/capture.mjs scenes review/land.jpg all 4 0.2
python3 -m http.server 8160                               # http://127.0.0.1:8160/?shot=S08  (&land for 16:9; space = play)
# 3. sound
node tools/capture.mjs cues data/cues.json
SKILL/scripts/py tools/mix.py .                           # procedural score + sound design, no music file
# 4. render (~1 min each) + share copies
node tools/capture.mjs video renders/<name>_9x16.mp4 0 -1 5 --audio
QS=_land node tools/capture.mjs video renders/<name>_16x9.mp4 0 -1 5 --audio
for a in 9x16 16x9; do ffmpeg -v error -y -i renders/<name>_$a.mp4 -c:v libx264 -preset slow -crf 20 -pix_fmt yuv420p -c:a copy -movflags +faststart renders/<name>_${a}_share.mp4; done
```
Masters are CRF 15 (~150 MB for 33 s); the CRF 20 share copies are ~25 MB. If a share copy is over ~30 MB, raise
the CRF by 2. `node tools/capture.mjs frames review/full "7,10.5,22.4"` gives full-size stills to inspect.

## 5 · Check before showing
- Contact sheets of every shot in BOTH aspects. In 9:16, subjects are lined up along the camera axis (the threat
  right behind her, not beside her), nothing important outside the centre column.
- Red stays saturated ember (not salmon, not white-hot): if it blows out, lower `coreGain`/`rimGain` or `exposure`.
- One hero figure per frame; the room never brighter than the figure; no glossy knob/brass near a head.
- Captions: one line, readable at phone size, never covering the figure's head, never over a stamp.
- Sound: soft. No ticks, clicks, hats or harsh highs (mix.py rolls everything off above ~5–6 kHz). Loudness
  ≈ −17 LUFS: `ffmpeg -i data/mix.wav -af ebur128 -f null - 2>&1 | grep -A3 Summary`.
- Video length = mix length (`tEnd = T.dur + 0.9` in shots.js, `DUR = duration + TAIL (0.9)` in mix.py).

## 6 · Gotchas
- Neutral tone mapping, not ACES (ACES desaturates the ember to salmon/white).
- `QS` for capture must be `_land`, not `&land`: this capture.mjs passes the page URL through DevTools'
  `/json/new?<url>`, where a `&` would cut the page's query.
- `node tools/capture.mjs video … --draft` renders at half size, faster — for timing checks, not for the look.
- mix.py shapes the score's arc on the FIRST `knock` (tension rises) and the `sting` (the reveal); a story without
  them gets a sting 3 s before the end and the rise 6 s earlier. It adds a floor creak after a SECOND `ring` if there
  is one. Place your own `knock`/`sting` cues where your story turns.
- Rendering is stateless per frame: never accumulate state in a shot; derive everything from `t` / `lt`.
- `w(i, word)` matches the word inside sentence i after punctuation is stripped (`"wasn't"` → `'wasnt'`); a miss
  silently returns the sentence start, so check `data/words.txt` when a beat lands early.
- Whisper word times drift early; timing.js re-anchors each sentence's words to its exact TTS start.
- Shiny brass knobs reflect the red figure and read as fake eyes: keep them rough/dim or away from heads.
- The figures are ray-marched: many large figures close to camera cost frame time (`check` prints ms/frame).
- Never rewrite `data/mix.wav` while a render is muxing (the render reads it at the end).

## 7 · The example: THE 2 A.M. CALL (`example/`)
1990: the Hale family leaves their daughter home alone. At 2 A.M. the hallway phone rings — no voice, just
breathing. It rings again; a man whispers "Don't open the door." Three slow knocks on the front door; she freezes at
the foot of the stairs. "But the knocking wasn't coming from the front door. It was coming from the closet, behind
her." Two eyes glow in the closet gap; last muffled knock; black. Original story, 72 words, 13 lines (one whispered
phone line), narration 32.3 s, film ≈ 33.2 s, 11 shots (S01 establishing + "1990" stamp → S02 low front → S03 phone
rings + "2:00 A.M." → S04 on the phone → S05 hang up / rings again → S06 over-the-shoulder whisper → S07 three
knocks → S08 frozen, wide from behind → S09 close, head turn → S10 closet creak → S11 eyes behind her, fade to
black). One hallway set; both aspects render from the same shots.

## 8 · The second example: TOO TALL (`example-too-tall/`, 9:16, 65 s)
A one-minute true-crime case (the 1994 Dallas video-store murders), told through the store camera that first cleared
the killer. Start a new video from it with `bash SKILL/scripts/new_video.sh red-ghost <name> --from too-tall` when the
story is **~1 minute, true crime, several places, evidence on screen**. Use `example/` for a ~30 s single-room scary story
that needs both aspects. Same rules as above; what this engine adds:
| file | adds |
|---|---|
| `src/sets/store.js` | a whole store: parking lot, storefront + lit VIDEO sign, sales floor with ~1,900 instanced VHS boxes, counter, CCTV camera, back office + safe (keypad, handle, time-lock dial); `STORE` positions |
| `src/sets/inst.js` | a second set at x + 60 (`OX`, `IW()`): interview room, cell-block corridor, witness room + lit chamber. Several sets live in ONE scene, side by side, and the camera just goes there |
| `src/core/tex2.js` | VCT floor tiles, drop ceiling, VHS cover atlas, sign, asphalt, brick, cinder block, concrete, keypad, time-lock plate, cork board, monitors |
| `src/core/figure.js` | body kinds `0` woman (bob), `1` broad, **`2` man in a cap**, **`3` man with short hair**; men have narrower hips |
| `src/poses.js` | `walk(pts, d, t, { run, stride, amp, lean, look })` along a path of [x, z] points with IK-planted feet, `travel(t, t0, v, L)` (distance with ease-in), `pathAt`, `sit`, `handsUp`, `handsHidden`, a pose blend for standing up |
| `src/core/engine.js` | CCTV look: `look.mono` (grey tape, the red figure keeps its red), `scan` (lines), `tear` (tape roll), `flash`; `step: 3` on a shot = a new still every 1/3 s (security-camera stutter) |
| `src/shots.js` | `dolly([pos, look], [pos, look], k)` **and** `move([posA, posB], [lookA, lookB], k)`: same move, two argument orders; `measure()` overlay (ruler, height lines, the match) |
| `tools/mix.py` | tape hum + transport clunks (`vcr`, `vcrstop`), `night`/`buzz` ambience, door `chime`, `key`, `handle`, run `step`s, `bang` (muffled through a wall), `thud`, cell `clang`, `sting`; drone + sparse piano shaped by `arc` cues (`{ t, v }` intensity points) |

Lessons from building it:
- `dolly(a, b)` takes `[pos, look]` START and `[pos, look]` END. Passing a pos pair and a look pair flies the camera
  into the figures; use `move()` for that order.
- Portrait frames need the subjects on the camera axis. Check every camera against figure paths with
  `node tools/capture.mjs eval "OP.dbg(t)"` (camera + bone positions of every visible figure).
- A door that opens into a room can block a camera; bright ceiling strips behind a centred stamp kill it (`stamp`'s `shade` option).
- A sting with a sub boom came out +10 dB over the median; keep hits ≤ ~6 dB over the bed.
- The heaviest example: ~6.5 min to render 65 s with 5 workers (many lit figures + 1,900 instanced boxes).
- **16:9 is not framed yet.** `?land` exists in the engine, but every shot was only checked in 9:16. Re-frame and
  re-check every camera before you promise a landscape cut.
