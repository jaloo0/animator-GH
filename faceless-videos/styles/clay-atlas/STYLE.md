# Clay Atlas — investigative documentary explainer (16:9, ~1 min)

A calm, cinematic documentary explainer: faceless matte clay figures in soft amber-lit 3D worlds, aerial clay
dioramas, aged parchment maps, a lower-left date stamp, charcoal label boxes and red target marks. It's for a real
event explained step by step: a heist, an operation, a disaster, a scandal, "how X happened".
Look reference: `style-sheet.jpg` (next to this file). Working example: `example/` = **THE LOUVRE HEIST** (section 7).

**How this style differs from the other four:** the *pictures* are still images that **the user makes with their own
image tool** (Higgsfield, Nano Banana, GPT Image, Midjourney, Flux, or anything else that takes a reference image). It's
roughly one still per shot, 10–15 for a minute. You write the prompts; the user generates the stills and drops them in `stills/`.
**Everything that moves is code.** A local depth model gives every still a depth map, a WebGL camera dollies, trucks
and pans through it with real parallax, and every word, map label, date, chart, counter, page, spark, shard and
dust mote is drawn on top in canvas. Kokoro voice, procedural score. Never generate video for this style. If the user
has no image tool, it's the wrong style; suggest Red Ghost or Sunlit Explainer (100 % code).

## 1 · The look (from the style sheet)
- **People are faceless matte clay figures**: smooth heads, no features, sculpted clay clothing. Colour lives only on
  clothing (hi-vis vests, navy police, green uniforms). Never a real face or a likeness, even of real people in the story.
- **Worlds are soft cinematic 3D renders**: warm amber key or low golden-hour sun, haze, shallow focus, a slightly
  desaturated warm palette; aerial cities read as tilt-shift clay dioramas.
- **Target red marks only the thing that matters** (a glowing building, a pin, a route, an X).
- **Maps are aged parchment**: slate water, hairline streets, the subject area filled map-orange with a red outline,
  white spaced caps for place names (drawn in code), a dark time chip at top centre.
- **Dates sit lower-left**: bold white date + a small "time | place" line in a dark translucent box (`dateStamp`).
- **Label boxes**: charcoal, white bold caps, centred on the subject, optional leader line + dot (`labelBox`).
- **Charts / boards**: cream paper, red connector lines, round badges with red name tags (`redTag`).
- **Documents / headlines**: off-white page, serif title, yellow highlighter only over real text.
- **Dark diagram cards** (timers, counters, logins): umber-black with an amber glow.
- Camera is slow: drone push-ins, dollies, 3–5 s shots. Graphics land on the narrator's words. Cuts are hard, with the
  odd short dissolve. Mood: measured, investigative, cinematic, calm. No gore, no weapons in use, no injuries.

| role | hex | | role | hex |
|---|---|---|---|---|
| clay white | `#E6DFD3` | | map orange | `#E08A3C` |
| amber backlight | `#C8662A` | | target red | `#D2382C` |
| umber shadow | `#2A1A10` | | highlight yellow | `#F2E15B` |
| parchment | `#D6C39A` | | sea slate | `#8E9A94` |

Type (bundled, free): Inter 900 (dates, big numbers), Inter 700 caps with tracking (labels), Playfair Display
(document titles), JetBrains Mono (screens, passwords). Colours live in `C` in `src/main.js`.

## 2 · Making the stills (the user's image tool, YOUR prompts)
Write one prompt per still and hand the user the list (save it as `stills/PROMPTS.md` in their project). Tell them
to **attach `SKILL/styles/clay-atlas/style-sheet.jpg` as the image reference**, generate at **16:9, 2K or more**,
and save each result as `stills/<name>.jpg` (or .png) with the names you gave. The example's exact prompts are in
`example/stills/PROMPTS.md`: copy their shape.
- Prompt = **subject + camera + light**, then this fixed line, word for word:
  > STYLE: soft cinematic 3D CGI documentary render matching the reference images - smooth matte faceless
  > clay-white human figures with no facial features, sculpted clay clothing, warm amber light, haze, shallow depth
  > of field, slightly desaturated warm palette. A single full-frame 16:9 cinematic shot - NOT a board, no panels,
  > no text, no labels, no logos, no watermark.
- One idea per still. Leave calm space where a date or label will sit (lower-left, top centre).
- Aerials: "golden-hour aerial drone view of <place> as a miniature clay-render diorama … <the target> glows
  translucent red-pink like a highlighted target; everything else stays matte clay".
- Close-ups of hands/tools/objects are great for parallax (strong depth). Avoid shots that need the model to draw
  readable text: screens, papers and signs are drawn in code over a dark or blank area.
- **Maps: generate ONE parchment map with no text, then erase whatever text the model adds anyway.** Image models
  add labels to maps even when told "no text", and they invent or misplace names (the example's raw map put the two
  courtyard names on the wrong courtyards: `example/data/map_raw_with_ai_labels.jpg`). Run
  `SKILL/scripts/py tools/clean_map.py data/map.png data/map_clean.jpg` (paints dark neutral lettering out; check the
  `_mask.png` it writes), then draw every label in code with `mapLabel()`, so you control every word.
- A "fill" that animates (the Louvre turning orange) needs `data/map_base` (the map with that area in plain
  parchment) and `data/map_mask.png` (white = the area). Paint them in any editor, or generate the map twice
  (with and without the fill) and threshold the difference.
- Budget: the example used 13 images. Ask the user to generate them all, check them (faceless? on-style? no text?),
  and redo only the ones that fail.

## 3 · Depth maps (local, optional install)
`bash SKILL/scripts/setup.sh --depth` installs the depth model once: **Depth Anything V2 Small** (Apache-2.0), run
with onnxruntime, ~0.1 GB (99 MB model + Pillow). Then:
`SKILL/scripts/py SKILL/scripts/depth.py stills` → `stills/<name>_depth.png` for every still (8-bit, near = white,
~2 s each). The example ships its depth maps, so it renders without the model; only new stills need it.

## 4 · Engine map (`example/`)
| file | what it gives you |
|---|---|
| `src/main.js` | boot (fonts → timing → stills + depth → shots), `STILLS` (the file names to load; a missing still is skipped, so shots can test `has(name)`), the WebGL 2.5D still renderer, post (vignette, grain, fade in/out), `window.OP` capture API |
| `still(name, cam)` | draws a still full-frame through the depth camera. `cam = { s scale, x/y pan, d dolly (depth-weighted zoom), px/py parallax shift, cx/cy zoom centre, f focus depth 0–1, glow (red target glow), bright, warm, sat }` (defaults `CAM0`) |
| `project(name, cam, u, v)` | where image point (u, v) lands on screen under that camera, using the depth, so labels/pins stick to things while the camera moves |
| `mixCam(A, B, k)` / `cam(A, B, p)` | ease between two framings over the shot (`p` = 0→1 progress) |
| `s(i)`, `e(i)`, `w(i, word)`, `we(i, word)` | sentence start/end, a word's start/end inside sentence i (from data/words.json) |
| `src/gfx.js` | `dateStamp`, `labelBox`, `redTag`, `mapLabel`, `pin`, `timeChip`, `truck` (map glyph), `sparks`, `shards`, `dust`, `glint`, `streaks`, `rr` (rounded rect), `font(weight, px)` |
| `src/shots.js` | `buildShots()`: the `cut` list (one start per shot, keyed to sentences/words), `add(id, note, draw(x, t, p))`, and `S.cues = [{ t, type, … }]` at the bottom for mix.py; the map, jewel board, timer, audit page and password login are drawn here |
| `tools/capture.mjs` | headless Chrome: `check`, `scenes`, `sheet`, `frames`, `eval`, `cues`, `video` |
| `tools/mix.py` | D-minor drone/pad, a felt pulse through the action, sparse piano at open/close, SFX on cues, voice on top (≈ −19 dBFS RMS) |
| `tools/clean_map.py` | erase AI lettering from a generated map |

## 5 · Make a new video
```bash
bash SKILL/scripts/new_video.sh clay-atlas <name>        # → ~/faceless-videos/<name>/ (the Louvre example, renders as-is)
cd ~/faceless-videos/<name>
```
1. **Research + script** (`script.json`, one sentence per line, ~150–170 words for a minute, Kokoro `am_michael`
   ~1.04). Every date, number and name checked against reliable sources; say which. Then
   `SKILL/scripts/py SKILL/scripts/voice.py .` and `SKILL/scripts/py SKILL/scripts/words.py .`.
2. **Shot list + prompts**: one still per shot (some shots are pure graphics: map, board, page, timer). Write
   `stills/PROMPTS.md` and give it to the user with the instructions in §2. While they generate, build the shots:
   missing stills are skipped, so graphics-only shots can be checked first.
3. Stills in → `SKILL/scripts/py SKILL/scripts/depth.py stills` → update `STILLS` in main.js and the shots.
4. Check, sound, render:
```bash
node tools/capture.mjs check                                  # every shot renders, no errors
node tools/capture.mjs scenes review/all.jpg all 3 0.2        # LOOK at it
node tools/capture.mjs cues data/cues.json && SKILL/scripts/py tools/mix.py .
node tools/capture.mjs video renders/<name>_16x9.mp4 0 -1 4 --audio
ffmpeg -i renders/<name>_16x9.mp4 -c:v libx264 -crf 20 -preset slow -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart renders/<name>_share.mp4
```

## 6 · Check before showing
- Every still: faceless figures (no eyes/mouths), no AI text/logos/watermarks, on-palette, nothing gory.
- Parallax: big `d`/`px` on a still with a thin foreground object tears its edges; keep `d` ≤ ~0.15 and `px` ≤ ~0.02,
  and push into the subject rather than sliding across it.
- Every on-screen word is spelled right and true; map labels sit on the right place; dates match the script.
- Cuts land just before their sentence; labels land on their word.
- Sound soft, voice clear, ≈ −16 to −19 LUFS. No ticks, clicks, hats or glitches.

## 7 · The example: THE LOUVRE HEIST (`example/`, 65 s, 15 shots, 12 stills + 1 map)
19 Oct 2025, ~9:30 a.m.: a truck with a furniture lift on the riverside, two men in hi-vis vests, a window cut with
disc cutters, the Apollo Gallery, two cases smashed, eight pieces (~€88M) in about four minutes, an escape on
motorbikes, Empress Eugénie's crown dropped outside; a 2014 audit (reported Nov 2025) found the video-surveillance
password was "LOUVRE"; first arrests within a week; a year later the jewels are still missing. Narration Kokoro
`am_michael` @ 1.04, 18 lines. Stills: Nano Banana Pro with the style sheet as reference (prompts in
`stills/PROMPTS.md`); depth: Depth Anything V2 Small. Everything else is code.
