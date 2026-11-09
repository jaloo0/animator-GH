# BLACKOUT — Part 1 (40th floor) · the Lamplit Ink example

A 3-minute narrated survival story in 9:16, drawn entirely in code: the faceless-videos skill's `lamplit-ink` style.
The full guide is `SKILL/styles/lamplit-ink/STYLE.md` (SKILL = the skill folder, usually ~/.claude/skills/faceless-videos).

Run inside this folder:
- Preview: `python3 -m http.server 8150` → http://127.0.0.1:8150/?shot=S25 (space = play, [ ] = shots)
- Sound: `node tools/capture.mjs cues data/cues.json && SKILL/scripts/py tools/mix.py . $(node tools/capture.mjs eval 'OP.duration()' | head -1)`
- Contact sheet: `node tools/capture.mjs scenes review/all.jpg all 2 0.25`
- Video: `node tools/capture.mjs video renders/blackout_part1.mp4 0 -1 5 --audio` (~2–3 min)
- New narration: edit `script.txt` → `SKILL/scripts/py SKILL/scripts/voice.py . --voice bm_george --speed 1.0 --gap 0.24 --para 0.6 --short 0.42` → `SKILL/scripts/py SKILL/scripts/words.py .`
