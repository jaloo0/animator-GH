# HARD BOILED · the Sunlit Explainer example

A 29.8 s 3D history explainer in 16:9 (the true story of the hard hat), built entirely in code: the faceless-videos
skill's `sunlit-explainer` style. The full guide is `SKILL/styles/sunlit-explainer/STYLE.md` (SKILL = the skill
folder, usually ~/.claude/skills/faceless-videos).

Run inside this folder:
- Characters (once, ~15 s each): `node tools/build_chars.mjs` → `data/chars/*.bin`
- Preview: `python3 -m http.server 8170` → http://127.0.0.1:8170/?shot=D4 (`&sets=shop` loads one set; `?lab&char=bullard` = character lab)
- Sound: `node tools/capture.mjs cues data/cues.json && SKILL/scripts/py tools/mix.py .`
- Contact sheet: `node tools/capture.mjs scenes review/all.jpg all 2 0.25`
- Video: `node tools/capture.mjs video renders/hard-boiled_16x9.mp4 0 -1 5 --audio` (~1 min)
- New narration: edit `script.json` → `SKILL/scripts/py SKILL/scripts/voice.py .` → `SKILL/scripts/py SKILL/scripts/words.py .`
