# Stickman — "What if…?" acted by stick people (16:9 + 9:16 from one build, ~1 min)

The narrator tells **you** a what-if, and black stick people act it out in flat illustrated rooms, with a new picture on
every clause. It's simple enough to read on a phone and rich enough to feel like a film: flat cards at real depth,
soft depth of field, an amber rim on every character, grain, vignette and black cinema bars. It's the format of the
big "What If…" stick-figure channels, done 100 % in code: canvas-2D engine, Kokoro voices, numpy sound.
Look reference: `style-sheet.jpg` (next to this file: hero turnaround, 6 faces, hands by shot size, the infected,
sets, props, graphics, palette). Working example: `example/` = **WHAT IF ZOMBIES HIT YOUR APARTMENT?** (section 7).

## 1 · Script (`script.txt`, the stickman format)
- Second person, calm, short sentences. **The wish, then the price**: the premise lands in the first 10 s, then it
  escalates, the big hit comes about halfway, a twist arrives right before the end, then a question + "PART 2" card.
- **One line = one clause block = one picture group.** `[beat 1.5]` = real silence (a picture with no words; about
  one shot in three has none). `[Name] text` = spoken by that character in their own voice (`VOICES` in
  `tools/voice.py`); the name is never read. The narrator's mouth never moves; characters' mouths do.
- Real numbers, checked (water 4 L/person/day, fridge ~4 h without power, a tub ~150 L …). Spell numbers as words for
  Kokoro ("a hundred and fifty liters"); show digits on screen.
- List videos: "One." "Two." … each on its own line → a step card (gold number + label) sits on it.
- ~1 min ≈ 150 words ≈ 35–40 shots. Narrator default Kokoro `am_michael` (ask; `voice.py --list` for others).

## 2 · Build
```bash
bash SKILL/scripts/new_video.sh stickman <name>           # → ~/faceless-videos/<name>/ (the zombie example, renders as-is)
cd ~/faceless-videos/<name>
SKILL/scripts/py tools/voice.py .                          # Kokoro → data/narration.wav + data/lines.json
SKILL/scripts/py SKILL/scripts/words.py .                  # Whisper → data/words.json [{i, w, line, s, e}]
python3 -m http.server 8170   # http://127.0.0.1:8170/?shot=S10  (&ar=9x16 for vertical; space plays with sound)
node tools/capture.mjs check                               # every shot renders, no errors
node tools/capture.mjs scenes review/a.jpg all 1 0.25      # contact sheet 16:9 …
AR=9x16 node tools/capture.mjs scenes review/v.jpg all 1 0.25   # … and 9:16 — LOOK at both
node tools/capture.mjs cues data/cues.json && SKILL/scripts/py tools/mix.py . "$(node tools/capture.mjs eval 'OP.duration()' | head -1)"
node tools/capture.mjs video renders/<name>_16x9.mp4 0 -1 5 --audio           # ~2 min for 73 s
AR=9x16 node tools/capture.mjs video renders/<name>_9x16.mp4 0 -1 5 --audio
for a in 16x9 9x16; do ffmpeg -v error -y -i renders/<name>_$a.mp4 -c:v libx264 -crf 22 -tune grain -preset slow -pix_fmt yuv420p -c:a copy -movflags +faststart renders/<name>_${a}_share.mp4; done
```
Write `src/shots.js` (start from the example's). Each shot: `{ id, at: cut(line, word), cam, draw, over, cues, hud }`.
Shots are keyed to **words**, never seconds: `wd(line, k)` = k-th word of that line `{s, e}` (negative k counts from
the end); `cut(line, k)` = 3 frames before it. Timings come from Whisper (words.py, starts nudged +0.06 s; median
error ~50 ms against a forced aligner); the example's words.json was made with a wav2vec2 forced aligner.

**Engine map**: `src/core/fig.js` `figure()` (rig: IK legs/arms, `walk()` with planted feet, faces calm · neutral ·
worried · shocked · determined · scared · relieved, blink every 3.5–4 s for 3 frames, hands `nub`/`mitten`, `glove()`
close-ups, kinds `hero` / `zombie` / `plain`; give it `o.y` even when feet are given) · `src/core/view.js`
(`cam {x,y,w, px,py,pw for 9:16, push, pan}`, `V.layer(depth, blur, fn)` for parallax + depth of field,
`V.chars(depth, blur, rim, fn)` for the rim light) · `src/sets/rooms.js` (living room with door / switch / window /
couch, hallway in one-point perspective, bathroom + tub, kitchen + fridge; `dark` 0→1 = lamp-lit → moonlight) ·
`src/sets/more.js` (facade, skyline blackout, building cutaway, stove, top-down desk, phone in a glove, water-days
grid, cans) · `src/core/gfx.js` (`pill`, `stamp`, `counter`, `goldText`, `navyBg`, `rubber`, `pop`) ·
`src/core/look.js` (grade, vignette, grain, bars) · `src/core/lib.js` (`W, H, FPS = 24, BAR, PORTRAIT`).
A new topic means new sets/props in the same flat style; keep the hero, faces and palette from `style-sheet.jpg`.

## 3 · The rules (what makes it look right)
| | |
|---|---|
| **Pictures** | One per clause, ~25–32 a minute. Mix: ~⅓ hand close-ups / props / phone screens, ~¼ faces, the rest wides/mediums. Every cut is a hard cut, 3 frames before the words. |
| **Depth** | Everything is a flat card at a real depth: back wall `layer(1.4–1.5)`, furniture `1.1`, people `1`. Close-ups blur the room (`dof` 5–9). |
| **Camera** | Barely moves. Close-ups never move. ~1 wide in 3 gets a 3 % push over < 2 s, then stops. No shake, ever. |
| **People** | Solid ink, round head (0.28 h), thin limbs, coloured clothes (hero = rust-orange hoodie), amber rim toward the light (`LAMP`) or cold rim (`MOON`). Hero ≤ ~40 % of a wide frame. |
| **Faces act** | The face changes ON the word that matters (`t > wd(l,k).s`). Blinks are automatic. Shock = big round eyes + small "o". |
| **Motion** | 24 fps on ones, no motion blur. Brisk walk = 5 frames a step, planted feet never slide (`walk()`), gestures stop hard (`eback`). |
| **Hands** | Wide = nub, medium = mitten, close-up = five-finger glove filling > half the frame; grips land exactly on the object. |
| **Graphics** | Dark pills (`WATER · HOUR 1`), top-left place/time stamp, top-right round counter, gold glowing type on navy for title/step/number cards. Labels pop over 3 frames; numbers count up and land on the END of their word. |
| **Sound** | Quiet mellow bed from frame 1 (A-minor pad + e-piano, −17 dB, ducked), a blip per graphic, a whoosh per card, soft air on cuts, footsteps on walks, the story's own sounds, all soft (no ticks/hats/glitch). Voice on top, ≈ −16 LUFS. Character lines get their own voice (+ a phone filter if it's a message). |
| **9:16** | Same build: every `cam` gets `px/py/pw` (default = same centre, half the width). Labels sit in the top 30 %, nothing important in the bottom 20 % (app UI). |

## 4 · Check before showing
`check` has no errors · contact sheets for BOTH aspects read at thumbnail size · scrub every walk frame by frame
(`ffmpeg … -vf tile` strip) · transcribe the final mix (`SKILL/scripts/py SKILL/scripts/words.py` on a copy, or
just listen): every line must come back, and effects are never louder than the voice they sit under (compare
`data/stems/fx.wav` with `data/narration.wav` per window) · masters stay in `renders/` (CRF 15, ~450 MB with grain);
share copies `-crf 22 -tune grain` (~120 MB for 73 s).

## 5 · Known limits
- **9:16 wide shots show a lot of floor and ceiling.** The rooms are drawn for 16:9, and a vertical crop of a wide
  shows the extra height. Tighten `pw` on wides (or add a ceiling lamp / rug to fill it) when the vertical cut matters most.
- One body type (adult); kids, animals and vehicles need new drawing code in `fig.js` / `more.js`.

## 6 · Gotchas
- Chrome's `/json/new` needs the page URL `encodeURIComponent`'d or extra `&params` are lost (that's why capture.mjs
  takes `AR=9x16` as an env var); `QS='&x=1'` adds your own params.
- `figure()` needs `o.y` even when feet are given.
- First-mix lesson: buzz / scream / pump SFX came out up to 10 dB over the voice and the phone-filtered character line
  too quiet. Compare stems per window and listen to the whole mix before you deliver.
- Grain makes CRF 15 masters huge (~450 MB / 73 s); never send those, send the `-crf 22 -tune grain` copies.
- `tools/voice.py` stops on a `[Name]` with no voice: add `'Name': ('af_nicole', 0.92)` to `VOICES` first.

## 7 · The example: WHAT IF ZOMBIES HIT YOUR APARTMENT? (`example/`)
73 s · 39 shots · 24 fps · 16:9 (2:1 bars) + 9:16 · Kokoro `am_michael` (narrator) + `af_nicole` (the neighbour,
phone filter) · −16.2 LUFS. A sound in the hallway, pounding, screaming, "you have one hour", then five steps (lock +
couch, fill the tub, kill the lights, charge everything, eat the fridge first), then midnight: the neighbour texts
"Let me in. I'm not bitten." → "Would you open the door?" Facts: 4 L/person/day (Ready.gov: 1 gallon), a tub ≈ 150 L →
about a month boiled, a fridge stays cold ≈ 4 h without power (USDA), building water pumps need power.
