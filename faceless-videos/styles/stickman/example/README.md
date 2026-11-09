# WHAT IF ZOMBIES HIT YOUR APARTMENT? · the Stickman example

A 73 s "what if" story acted by stick people, 16:9 and 9:16 from one build, made entirely in code (canvas-2D engine,
Kokoro voices, numpy sound). It's the faceless-videos skill's `stickman` style. The full guide is
`SKILL/styles/stickman/STYLE.md` (SKILL = the skill folder, usually ~/.claude/skills/faceless-videos).

Run inside this folder:
- Preview: `python3 -m http.server 8170` → http://127.0.0.1:8170/?shot=S10 (add `&ar=9x16` for vertical)
- Check: `node tools/capture.mjs check` · sheets: `node tools/capture.mjs scenes review/a.jpg all 1 0.25` and `AR=9x16 node tools/capture.mjs scenes review/v.jpg all 1 0.25`
- Sound: `node tools/capture.mjs cues data/cues.json && SKILL/scripts/py tools/mix.py .`
- Video (~2 min each): `node tools/capture.mjs video renders/zombie-apartment_16x9.mp4 0 -1 5 --audio` and `AR=9x16 node tools/capture.mjs video renders/zombie-apartment_9x16.mp4 0 -1 5 --audio`
- New narration: edit `script.txt` → `SKILL/scripts/py tools/voice.py .` → `SKILL/scripts/py SKILL/scripts/words.py .`
