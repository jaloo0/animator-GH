# TOO TALL · the second Red Ghost example (9:16, 65 s)

A one-minute true-crime reconstruction of the 1994 Dallas video-store murders, built entirely in code: three.js sets,
ray-marched SDF figures, Kokoro voice, procedural numpy sound. It's the faceless-videos skill's `red-ghost` style, in
the format of enthyme's true-crime reconstructions, with its own fact-checked script and its own shots.
Full guide: `SKILL/styles/red-ghost/STYLE.md` §8 (SKILL = the skill folder, usually ~/.claude/skills/faceless-videos).

**Angle:** the store camera photographed the killer, but police let their suspect go because the man on the tape
"looked too tall". In 1998 the FBI re-measured the tapes and he was the same height. The film opens and closes on that camera.

**Sources:** TDCJ death-row record (Apr 4 1994, 9 mm, back office, $392, age 18) · Wikipedia "Leon Dorsey" (time lock,
James ran, 1998 FBI height estimate, the Chon murder Sept 1994, executed Aug 12 2008 at the Huntsville Unit, both
victims' parents watched) · executedtoday.com (girlfriend's tip; police first ruled him out as too tall; cold-case unit).

**Style rules kept:** no gun or bodies on screen. The shootings are sound, two flashes in a doorway, a red light going
out and a cut to black. The store sign says VIDEO (no real logo); dates and numbers are cream stamps; one yellow caption line.

Run inside this folder:
- Preview: `python3 -m http.server 8160` → http://127.0.0.1:8160/?shot=S20
- Check: `node tools/capture.mjs check` · sheet: `node tools/capture.mjs scenes review/all.jpg all 2 0.2`
- Sound: `node tools/capture.mjs cues data/cues.json && SKILL/scripts/py tools/mix.py .`
- Video (~6–7 min, 5 workers; it's the heaviest example): `node tools/capture.mjs video renders/too-tall_9x16.mp4 0 -1 5 --audio`
- Debug a frame: `node tools/capture.mjs eval "OP.dbg(40.5)"` → camera + bone positions of every visible figure
- New narration: edit `script.json` → `SKILL/scripts/py SKILL/scripts/voice.py .` → `SKILL/scripts/py SKILL/scripts/words.py .`

**9:16 only.** `?land` exists in the engine, but the 16:9 cut is not framed yet: every camera was checked in 9:16 only.
