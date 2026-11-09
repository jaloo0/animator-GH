---
name: faceless-videos
description: Make narrated faceless videos for YouTube, TikTok, Reels and Shorts in five styles, built in code on the user's computer with a local AI voice, $0. (1) Lamplit Ink: inked cartoon survival story, 9:16 Part 1 series. (2) Red Ghost: horror / true-crime reconstruction, glowing red faceless people in a dim 3D room, yellow captions. (3) Sunlit Explainer: Zack D. Films-style 3D explainer, 16:9 history or 9:16 what-would-happen-if science. (4) Stickman: a What if...? story acted by stick figures, one picture per clause, 16:9 + 9:16. (5) Clay Atlas: documentary explainer (heist, event) with clay figures, maps and dates; stills from the user's own image tool, all motion in code. Use whenever someone wants a faceless video or channel, a narrated story, survival cartoon, horror or true-crime short, 3D or what-if explainer, stick-figure video or documentary explainer, or a video like beaniesurvives, enthyme, Zack D. Films, Ifverse or Fern, even from just a topic.
---

# Faceless Videos (v2: five styles)

Five faceless styles, each a working film engine with an example you can study and re-render. **You do the work:
the user picks a style and a topic, approves one plan, and gets a finished MP4 with voice, music and sound.**
`SKILL` = the folder this file is in. Projects live in `~/faceless-videos/<short-name>/`.

| style | what it makes | length · aspect | examples (`new_video.sh … --from`) |
|---|---|---|---|
| **Lamplit Ink** `lamplit-ink` | hand-inked cartoon story: stick hero in a mustard beanie, amber lamplight, "PART 1" header, cream data cards with real numbers, a creepy thread, a cliffhanger | 1–3 min · 9:16 | BLACKOUT · 40TH FLOOR |
| **Red Ghost** `red-ghost` | crime / horror reconstruction: faceless people of glowing ember-red light in a dim, real-looking 3D room; yellow one-line captions, cream date stamps, a twist | 30 s – 1 min · 9:16 (+16:9) | THE 2 A.M. CALL (30 s, both aspects) · `too-tall` (1-min true case, 9:16) |
| **Sunlit Explainer** `sunlit-explainer` | fast 3D explainer: stylized humans mid-task in low warm sun, type only printed on objects, the music drop on the reveal | ≤ 30 s · 16:9 or 9:16 | HARD BOILED (16:9, people) · `nuke-volcano` (9:16, objects, lava, particles) |
| **Stickman** `stickman` | "What if…?" acted by black stick people in flat illustrated rooms: eyes that act, one picture per clause, hand close-ups, gold step cards, cinema bars | ~1 min · 16:9 + 9:16 | WHAT IF ZOMBIES HIT YOUR APARTMENT? |
| **Clay Atlas** `clay-atlas` | investigative documentary: faceless clay figures, amber light, aerial dioramas, parchment maps, lower-left dates, label boxes, red targets; **stills from the user's image tool, all motion in code** | ~1 min · 16:9 | THE LOUVRE HEIST |

Local and free: Kokoro voice, Whisper word timings, three.js / canvas drawing, numpy sound, headless Chrome capture,
ffmpeg. No API keys. Optional: original music with ACE-Step (local, ~15 GB), depth maps for new Clay Atlas stills
(local, ~0.1 GB). Four styles are 100 % code; Clay Atlas needs ~10–15 still images the user makes in their own image
tool (Higgsfield, Nano Banana, GPT Image, Midjourney, Flux…) from the prompts you write. You never generate them yourself.

## 0. First use on a machine
`bash SKILL/scripts/setup.sh` until it prints **All set** (checks Node 22+, ffmpeg, Chrome, uv; builds the private
Python env in `~/.faceless-videos`; downloads the Kokoro voice ~340 MB and Whisper small.en ~0.5 GB; ~1 GB in all).
Install what's missing the free, official way; ask before anything that needs a password. Then
`bash SKILL/scripts/selftest.sh` must print **SELFTEST PASSED** (three short clips, ~5–8 min): open the contact sheets
and clips it names and look at them. `selftest.sh --all` checks every style and example (~15–25 min).
Clay Atlas with NEW stills also needs `bash SKILL/scripts/setup.sh --depth` once.

## 1. The method: a format that works, one style sheet, Claude builds it
1. **Start from a format that already works.** Ask for a link to a video they like (a channel, a short that did
   numbers) or a topic. Take the *format*: length, structure, pacing, hook shape, how captions and numbers land.
   **Never copy another creator's story, script or shots.** Write a new story (or a true one), in your own words.
2. **One style sheet.** Every style has `styles/<style>/style-sheet.jpg` + `STYLE.md`: the palette, the people, the type,
   the do's and don'ts. Every frame obeys it. (A user's own style sheet image can replace it; then write its rules down.)
3. **Claude builds it**: script → voice → word timings → shots → sound → check every frame → render.

## 2. Pick the style (at most ONE question)
If the request doesn't make it obvious, ask once (AskUserQuestion, the five styles with one-line descriptions) and
recommend:
- survival scenario, "what would you do", a "Part 1" story series, cosy-creepy → **Lamplit Ink**
- creepy encounter, true crime, unsolved case, scary story, "this happened in 1994" → **Red Ghost** (30 s story →
  default example; 1-minute documented case with several places and evidence → `--from too-tall`, 9:16)
- invention, origin, "why does X exist", history fact with people at work → **Sunlit Explainer** (16:9); "what would
  happen if…" science short, vertical, objects / nature / explosions → **Sunlit Explainer** `--from nuke-volcano` (9:16)
- "What if you…?", a list of steps ("here's what you do"), life hacks as a story, kid-friendly → **Stickman**
- a real event explained like a documentary (heist, operation, crash, scandal, "how X happened"), maps and timelines →
  **Clay Atlas** (only if the user can make ~12 images in an image tool; otherwise Red Ghost or Sunlit)
Then read that style's STYLE.md in full before planning.

## 3. Intake + plan
Ask what's still unknown in ONE message with defaults filled in: topic or story (or "you pick 3 ideas"), a link to
a video whose format they like (optional), true story or fiction, length, aspect, narrator voice
(`SKILL/scripts/py SKILL/scripts/voice.py --list`; default Kokoro `am_michael`, but ask; people switch voices), music
(the style's own score, an original one with ACE-Step, or their own royalty-free track), end card / handle.
"Just go" = defaults. Then show ONE screen: title, the full narration script, the shot list in one line per shot,
the sets/characters you will build or reuse (Clay Atlas: the list of stills they will generate), music, and the
render time. Ask **"Build it?"** and wait.

**Script rules.** Write for the ear: short sentences, one idea each; numbers spelled the way they are said
("nineteen nineteen"); every sentence is a cut point. Original writing only; never copy another creator's script
or shot list. True stories and numbers are checked against primary or reliable sources (say which, in the script
file). No gore or injury on screen; real people only when the story is documented, treated with respect, never
shown with a face (all five styles are faceless). Fiction is labelled as a story.

## 4. Build
`bash SKILL/scripts/new_video.sh <style> <short-name> [--from <example>]` copies the style's example (engine, sets,
characters, shots, its narration) into `~/faceless-videos/<short-name>/` so it renders straight away
(`new_video.sh --list` shows every example). Then follow STYLE.md: write the script → voice → words → rewrite the
shots (and sets/characters/cards where the story needs new ones) → export cues → mix → check → render. Reuse the
engine; change the story. Keep the style's rules: they are the look.

## 5. Check before you show anything
Contact sheet of every shot (`node tools/capture.mjs scenes review/all.jpg all 2 0.25`; both aspects when the style
has two), then the key frames at full size. Ask of each frame: does it obey the style sheet, does it say what the
narration says at that moment, is every word on screen spelled right, true and readable on a phone? Captions and cards
land on their words, cuts land on sentences. Audio: voice clear over the music, soft sounds only (no ticks, clicks,
hats, glitches or beeps; they hurt on phone speakers), the levels STYLE.md gives. Fix and re-check; never ship a frame
you haven't looked at.

## 6. Deliver
The master MP4 (`renders/<name>.mp4`), a share copy under ~35 MB (`ffmpeg -i master.mp4 -c:v libx264 -crf 20
-preset slow -c:a aac -b:a 160k -movflags +faststart share.mp4`; grainy Stickman masters need `-crf 22 -tune grain`),
the best cover frame, and a title + caption + 5–8 hashtags (for a series: a "Part 2" teaser line). Open the video
for the user. Offer one round of precise changes ("slower on the twist", "different voice") and re-render only what changed.

## Never
Generate video with AI, or generate images yourself (Clay Atlas stills are made by the user in their own tool, from
your prompts); spend the user's money or credits; copy another creator's script, shots or frames; overwrite a user's
project without asking; re-run `mix.py` while a render is muxing (it reads `data/mix.wav` at the end); run ACE-Step
music with less than 10 GB of free disk (`make_music.sh` refuses: a 16 GB machine can restart); run two heavy
renders at once on a 16 GB machine.
