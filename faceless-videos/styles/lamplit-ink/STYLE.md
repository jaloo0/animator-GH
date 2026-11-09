# Lamplit Ink — narrated story cartoon (9:16)

A faceless, second-person story for TikTok / Reels / Shorts: "PART 1" header on top, a hand-inked cartoon panel in
the middle on a blurred copy of itself, cream data cards for the real numbers, a calm narrator, and a creepy thread
that escalates to a cliffhanger. Everything is drawn in code on a 2D canvas (with a tiny 3D→ink projector for rooms),
voiced by Kokoro, scored by ACE-Step or any royalty-free track, mixed in numpy. `SKILL` = the skill folder,
`P` = your project folder (`~/faceless-videos/<name>`). The style sheet is `style-sheet.jpg` next to this file.

## 1. The look

Do
- Ink every edge with the ink kit (`stroke`, `shape`, `fill`, `hatch`): wobbly, variable-width, fills slightly
  off the line. The whole drawing "boils" (re-wobbles) at 8 fps; per shot `boil` (default 0.45, 0 = still).
- Hero = blank white circle head with two dot eyes, mustard beanie, concrete scarf, ink stick body (`drawHero`).
  The face is the ONLY pure white in the frame (`relightFace` re-whitens it after lighting).
- Keep the hero ≤ 40 % of the panel height (panel = 1080 × 740, so ≤ ~300 px tall). The room always wins.
  In the room sets a 1.62 m hero at z 4.4–5.0 lands at ~34 %. Close-ups (phone, hands) are rare exceptions.
- Exactly ONE warm practical light per scene: lamp, candle, phone screen or a window. Amber comes only from a
  source you can see in frame.
- Camera at eye level or slightly low, mild wide angle. Mood: cozy, quiet, wistful, lamplit, humble.
- Lettering by hand (`hand`): Permanent Marker for headlines, Patrick Hand / Patrick Hand SC for body, labels and the
  night tag. Words written into the world (on a card, a window, the phone) rather than floating digital type.
- Finish each panel with gouache wash + paper grain + vignette (`finish`, automatic; per-shot `finish` options).

Don't
- No clean vector lines (`ctx.stroke()`/plain rects for world objects), no glossy 3D, no photoreal texture, no neon.
- No nose, mouth or shading on the face. No pure black, no pure white except the face.
- Amber is never a fill or a background. Midnight Glass is only outside the window, never on a wall or object.
  Mustard belongs to the beanie and nothing else.
- No fisheye or top-down camera. (The example breaks this once on purpose: the S04 aerial "city goes dark block by
  block" establishing shot.)

Palette (`src/core/lib.js` → `PAL`):

| name | hex | use |
|---|---|---|
| ink | `#2B2724` | every line |
| glass | `#1F2B52` | Midnight Glass, outside the window only |
| amber | `#F0B15A` | light from a visible source only |
| mustard | `#C8952F` | the beanie only |
| moss | `#3E6A4C` | sofa |
| concrete | `#B3A996` | scarf, chalk concrete |
| cream / paper | `#EFE6D3` / `#E7DCC4` | cards, tags, type on dark |
| face | `#FFFFFF` | the hero's face only |
| room neutrals | wall `#7C8496`, wallWarm `#8E8A86`, floor `#7A5A40`, wood `#80603F`, woodDark `#5E4430`, rug `#B9AC93`, tile `#A9B3A8`, water `#7F98A6` | |

## 2. The format

- 1080 × 1920, 30 fps. `src/core/frame.js` `compose()` builds every frame: a blurred, darkened copy of the panel fills
  the background; header at the top (`HEADER.part` "PART 1" in Permanent Marker at y 470, `HEADER.sub` in amber
  Patrick Hand SC at y 540); the panel (PW 1080 × PH 740) at PY 588 with inked rules above and below; a cream
  paper-strip tag under the panel (the night/day counter: "NIGHT 1", "DAY 2"…); whole-frame overlay grain.
- Length: 2–3.5 min for a part (the example is 3:04). Shorter works with the same engine.
- Story shape (second person, present tense): a one-line hook that puts "you" somewhere specific → the event →
  "First problem. Water." blocks, each = why + a real number + what you do, each with a problem title card and 1–3
  data cards → between blocks a creepy thread on the night counter that gets closer every time → end on an
  unresolved image → "Part 2 tomorrow" end card. Every number is real and checked against a primary source.
- Narration: Kokoro `bm_george` (UK male, documentary), speed 1.0, short deadpan sentences ("Once. Twice. Three
  times."). Write numbers as spoken. Pauses: 0.24 s between sentences, 0.6 s between paragraphs, ≥ 0.42 s after a
  sentence of ≤ 2 words.
- Cuts: a new shot starts 0.15 s before its sentence (`cut(i) = S(i) - 0.15`); beats inside a shot land on the
  word they illustrate (`w('coughs', S(20))`). A shot every ~2–6 s; the example has 47 shots in 184 s.

## 3. Engine map (`P/src/…`)

Every frame is a pure function of time t (seek-safe, deterministic): never `Math.random()` or `Date`; use `hash`,
`rng(seed)`, `noise1`, `noise2` with fixed seeds, and give each stroke its own `seed` so lines don't wobble in sync.

- `main.js` — loads fonts (`FONTS`), timing, `buildShots()`; renders the panel per shot, `finish`, `compose`, `over`.
  Exposes `window.OP` (`duration`, `scenes`, `cues`, `frame`, `sheet`, `panels`, `errors`) for `tools/capture.mjs`.
- `core/lib.js` — `W H FPS PW PH PY`, `PAL`, `clamp lerp inv smooth`, `ease.{lin,inOut,out,in,outBack,sine,outElastic}`,
  `key(t, [[t0,v0],[t1,v1]…], easeFn)` keyframes, `hash rng noise1 noise2`, colour `mix(a, b, t)`, `shade`, `rgba`,
  `scratch(key, w, h)` reusable offscreen canvases.
- `core/timing.js` — `s(i)` / `e(i)` start / end of sentence i (0-based, from `data/narration.sentences.json`);
  `w(word, t0 = 0, fallback)` start of the first word matching at or after t0 (case/punctuation-insensitive; keeps
  letters, digits, `%`, `-`). shots.js imports them as `S`, `E`, `w`.
- `core/ink.js` — `stroke(ctx, pts, {w, closed, color, alpha, amp, seed, reveal, taper, press, freq, boil})` (reveal
  0..1 = write-on), `line(ctx, a, b, o)`, `fill(ctx, pts, color, {seed, alpha, amp})`, `shape(ctx, pts, {fill, w, seed,
  amp, round, ink, alpha, inkColor, inkAlpha, reveal})` (fill + outline, the workhorse), `hatch(ctx, pts, {angle, gap,
  w, alpha, seed, cross})`, `glow(ctx, x, y, r, color, a)`, `hand(ctx, str, x, y, {font, size, color, align, reveal,
  jitter, seed, weight, ls, alpha, pop})` (returns width), `textWidth`, point builders `rectPts ellipsePts bez quad
  roundPts`, `wobble`, `paperTexture`, `washTexture`, `finish(ctx, w, h, {grain, wash, vignette})`, `setBoil(t, amt)`.
- `core/scene3d.js` — rooms in metres, drawn by the ink kit (true parallax on camera moves): `new Cam({x, y, z, yaw,
  pitch, f, cx, cy})`, `cam.p(P)` → [x, y, depth], `cam.k(P)` px per metre, `cam.depth(P)`, `P2(cam, pts3)`,
  `box(ctx, cam, a, b, colours|{front, side, top…}, {round, w, seed, skip})`, `poly3`, `line3`, `circle3`,
  `cylinder(ctx, cam, base, r, h, {fill, top, rTop})`. Sort items far → near yourself (see `drawRoom`'s `items`).
- `core/hero.js` — `drawHero(ctx, x, y, s, o)`: x, y = feet in px, s = px per head radius (standing figure ≈ 7.1 s
  tall). o: `pose` (name or object), `t`, `look [-1..1, -1..1]`, `facing 'front'|'back'`, `props {L, R: 'mug'|'candle'|
  'phone'}`, `wrap` (blanket colour), `eyeSize`, `blink`, `beanieCol`, `scarf`, `flip`, `tilt`, `alpha`, `seed`.
  Returns `{flames, screens, face, hands}` for the lighting pass. `POSES`: stand, standMug, standMugSip, holdCandle,
  candleUp, candleCover, arms, shrug, sit, sitPhone, kneel, kneelPour, reachHigh, hug; `mixPose(a, b, u)` blends
  two; new poses = joint positions in head-radius units (y up is negative, feet on 0). Also `relightFace(ctx, info,
  amt)`, `flame(ctx, x, y, s, t, seed, k)`.
- `core/light.js` — `lightPass(ctx, w, h, {ambient, lights: [{x, y, r, color, a, sx, sy, falloff}], exposure,
  keepAlpha})` multiplies a cool ambient with additive light pools; `bloom(ctx, x, y, r, color, a)` for emissives.
  Pipeline of every lit set: draw the layer → `lightPass` → composite → emissives (flame, screen, bloom) →
  `relightFace`. `interiors.js`'s internal `lit()` helper is the pattern to copy for a new set.
- `core/frame.js` — `compose(out, panel, t, {tag, tagK, header})` and `HEADER` (edit it for every new story).
- `sets/room.js` — the hero's flat (back window onto the city, lamp, sofa, coffee table, bookcase, clock):
  `roomCam(o)`, `drawRoom(ctx, cam, st)`; st: `t, lamp 0..1, city {drawCity opts}, hero {x, z, pose, facing, look,
  props, wrap, height (m), hide}, candle {x, z, k}, phone k, heroCandle, ambient, faceGlow, windowLight, clock [h, m],
  breath, frost, mug, lights(cam), extra [{d(cam), draw(a, cam, st)}], after(ctx, cam, st)`. `breathPuff`.
- `sets/city.js` — the night city in a virtual 1600 × 900 space (`CW CH HOR`): `drawCity(ctx, {t, wave (blackout
  sweep 0..1), lit, snow, signal {on}, moon, river, dawn})`, `snow(ctx, t, amt, px, region, n)`, `signalWindowPos()`.
- `sets/pov.js` — looking out of the window: `drawPOV(ctx, {t, zoom, cx, cy, screenY, frame 0..1, city, mid {on},
  across {on, room, figure, beanieCol}, after(ctx, s)})`; `ACROSS`, `acrossWindowRect()`, `MID`, `midWindowPos()`.
- `sets/outside.js` — `drawTower(ctx, {t, cx, cy, zoom, lit, ours, oursKind 'lamp'|'candle', snow})` with
  `ourWindowCenter()`; `drawAerial(ctx, {t, wave, cx, cy, zoom, rot, origin, mark, markK, snow})`.
- `sets/interiors.js` — `bathCam`/`drawBath` (water, stream, cough, drip, pots, bottles), `smallCam`/`drawSmallRoom`
  (blanket over the door, frost), `hallCam`/`drawHall` (line of light under the door, feet), `drawPhone(ctx, {t,
  lines [{text, k, big}], bars, noService})` (phone close-up with an alert), `smoke`.
- `cards/cards.js` — cream data cards drawn into the panel: `cardBase(ctx, {bg, title, titleK, sub, subK})`,
  `problemCard(ctx, lt, {n, word, icon 'drop'|'thermo'|'candle', wordAt})`, icons `icoDrop icoThermo icoCandle icoBulb`
  (k = write-on 0..1), `endCard(ctx, lt)`. The rest are the example's story cards (pressure, water math, temperature
  chart, floor plan, candle ≈ bulb, never-for-heat, CO, 1 mile, supplies, map) — copy their structure: ink drawn on
  stroke by stroke, numbers lettered by hand, amber underline, each element timed with a `…At` option in shot time.
- `shots.js` — `buildShots()` returns the shot list in time order, plus `shots.cues` for the sound. A shot:
  `{ id, start, end (last shot only; others end at the next start), note (shown in sheets + player), tag (string
  or fn(lt)), tagIn (animate the tag in), header (false hides it), boil, finish (false | {grain, wash, vignette}),
  draw(c, lt, sh, t) (c = the 1080 × 740 panel; lt = time since shot start, t = film time), over(x, lt, sh, t)
  (draws on the full 1080 × 1920 frame after compose) }`. Card times are shot-relative: `wordAt: S(12) - sh.start`.
  Cues: `q(t, type, opts)` pushes `{t, type, gain, …}`.
- `tools/mix.py` — the soundtrack. Cue types it knows: `hum` (needs end, fadeFrom, fadeTo), `wind` (end), `water`
  (end, fill [t0, t1], coughFrom), `thump`, `knock` (pitch), `lampoff`, `buzz`, `chime`, `lost`, `felt`, `clay`
  (pitch), `drip`, `cloth`, `swell`, `answer`, `blow`, `creak`. Unknown types print `skip <type>`: a new cue type needs
  a new sound function in mix.py (keep it soft: low thumps, felt, filtered noise, sine swells). Voice ≈ −17 dB RMS,
  music −27 dB ducked under the voice, master −17.5 dB RMS (≈ −15/−16 LUFS), highs shelved above 7 kHz.

## 4. Make a new video

```bash
bash SKILL/scripts/new_video.sh lamplit-ink <name>        # → ~/faceless-videos/<name> (renders the example as-is)
cd ~/faceless-videos/<name>
# 1 · story: rewrite script.txt (paragraphs = blank-line separated; # lines ignored). Facts checked.
SKILL/scripts/py SKILL/scripts/voice.py . --voice bm_george --speed 1.0 --gap 0.24 --para 0.6 --short 0.42
SKILL/scripts/py SKILL/scripts/words.py .                 # → data/words.json + data/words.txt
python3 -c "import json; [print(s['i'], round(s['start'],2), s['text']) for s in json.load(open('data/narration.sentences.json'))['sentences']]"
```
2 · Pictures. Edit `src/core/frame.js` `HEADER` and the `<title>` in `index.html`. Rewrite `src/shots.js` against the
sentence list above (one shot per sentence or two, beats on words). Reuse `drawRoom` / `drawPOV` / `drawTower` /
the interiors when the story lives in a flat; otherwise write a new set in `src/sets/` with the same
draw → light → emissive pipeline. Write new cards from `cardBase` + `hand` + `stroke`/`shape`; change `endCard`'s
text if the ending isn't "Part 2 tomorrow". Put sound cues at the bottom of `buildShots()`.

3 · Music (pick one):
- keep the example's `audio/music.mp3` (a quiet, wistful 68 BPM piano/cello/music-box take, 190 s);
- an original score for $0: rewrite the caption in `audio/song.json` (instrumental, no drums, soft, "sits under a
  narrator"; `duration` = film length + ~8 s), then `bash SKILL/scripts/music/make_music.sh .` (needs ACE-Step:
  `bash SKILL/scripts/music/install_acestep.sh`, ~15 GB, Apple Silicon 16 GB+ or NVIDIA; refuses under 10 GB free
  disk), listen to `audio/takes/seed*.wav`, copy the steadiest, softest one to `audio/music.wav`;
- a royalty-free track the user owns, as `audio/music.wav` or `.mp3`.
Then fix the two music moves in `tools/mix.py`: the music bows out at the `blow` cue (`blowT`) and the end card
replays the take's last 9 s from `tail0 = 172.0` — point both at your own climax cue and your take's ending.

4 · Sound, check, render:
```bash
node tools/capture.mjs cues data/cues.json
DUR=$(node tools/capture.mjs eval 'OP.duration()' | head -1)
SKILL/scripts/py tools/mix.py . "$DUR"                    # → data/mix.wav
python3 -m http.server 8150                               # → http://127.0.0.1:8150/?shot=S25  (space = play, [ ] = shots)
node tools/capture.mjs check                              # every shot: errors + ms/frame (exit 2 on errors)
node tools/capture.mjs scenes review/all.jpg all 2 0.25   # whole-film contact sheet, 2 frames per shot
node tools/capture.mjs panels review/p.jpg "12.3,45.6" 2 0.5   # the illustration only, bigger
node tools/capture.mjs frames review/f "103.3"            # full-res JPEGs
node tools/capture.mjs video renders/<name>.mp4 0 -1 5 --audio  # master, CRF 15 (~2–3 min for 3 min of film)
ffmpeg -i renders/<name>.mp4 -c:v libx264 -preset slow -crf 20 -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart renders/<name>_share.mp4
```
The line boil and grain change every frame, so a 3-minute film is ~100 MB even at CRF 20. If it must be ≤ 30 MB,
encode two-pass at a bitrate instead: video kbps ≈ 30 × 8000 / seconds − 192 (`-b:v <n>k -pass 1`, then `-pass 2`).

## 5. Check before showing

- Contact sheet of every shot + full-size frames of the big moments. Per frame: is the hero ≤ 40 % of the panel?
  Exactly one warm light, and is it visible? Face white, beanie the only mustard, no amber fills, glass only
  outside? Lines wobbly everywhere (no straight vector edges)?
- Readability on a phone: card numbers ≥ ~40 px, headlines ≥ ~54 px, nothing hidden under the header or the tag.
- Every beat lands on its word: scrub the preview with sound; check `data/words.txt` for any word a shot looks up.
- Audio: `ffmpeg -nostats -i data/mix.wav -af ebur128 -f null - 2>&1 | grep 'I:' | tail -1` ≈ −15 to −17 LUFS; the
  voice always on top; soft sounds only — no ticks, clicks, hi-hats, glitches or beeps (painful on phone speakers).

## 6. Gotchas

- Never re-run `mix.py` while a render is muxing: the render reads `data/mix.wav` at the end (a run that did this
  came out 39 s long).
- `w()` never fails: a misspelled or missing word silently returns the fallback (or t0), so the beat lands on the
  sentence start. Check `data/words.txt`; for a word said twice, pass a t0 after the first.
- Editing the script shifts every sentence index: re-check every `S(i)` / `E(i)` in shots.js after `voice.py`.
- Shots must be pushed in time order; only the last one needs `end`.
- `mix.py`: without a `blow` cue the music bows out at the end of the narration; `hum` and `water` cues need their
  extra keys. `--levels` prints levels at the example's own timestamps (30–34 s, 98.5 s).
- `mix.py` reads `audio/music.wav` before `.mp3`: an old music.wav wins over a new music.mp3.
- `video … --draft` renders at half size (540 × 960) and faster — for timing checks, not for judging the look.
- Story leftovers to change: the phone close-up's clock "21:12" and "EMERGENCY ALERT" (`sets/interiors.js`), the
  tower's 46 floors with "our" window on floor 40 (`sets/outside.js`), the room's clock (`clock: [h, m]`).

## 7. The example — BLACKOUT, Part 1 (40th floor)

A city-wide blackout seen from a 40th-floor flat over nine nights. 395 words, 71 sentences, 183.8 s, 47 shots
(S01 tower push-in → S44 "Part 2 tomorrow"). Problems: WATER (city pressure lifts water only ~6 floors; a full bath
≈ 40 gallons; 1 gallon per person per day), COLD (8 °C inside on day 2; shrink to one room; a candle ≈ an old
light bulb of heat, warms hands not rooms; never a gas stove or barbecue indoors; carbon monoxide has no smell or
colour), LIGHT (a candle is visible more than a mile away). The creepy thread: on night 3 one window lights up across
the river on the 40th floor and blinks back at your candle; each night it is closer (two streets, then the building
across the street, where someone stands in a yellow beanie like yours); night 9 that building is dark and a thin
line of warm light appears under your own front door. You blow out your candle; the line stays on. Study
`src/shots.js` top to bottom with the preview open — it is the best reference for pacing and word-timed beats.
