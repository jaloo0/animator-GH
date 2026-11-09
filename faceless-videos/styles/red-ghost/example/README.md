# THE 2 A.M. CALL · the Red Ghost example

A 33 s crime-reconstruction horror short, 9:16 and 16:9, built entirely in code: the faceless-videos skill's
`red-ghost` style. The full guide is `SKILL/styles/red-ghost/STYLE.md` (SKILL = the skill folder, usually
~/.claude/skills/faceless-videos).

Run inside this folder:
- Preview: `python3 -m http.server 8160` → http://127.0.0.1:8160/?shot=S08 (add `&land` for 16:9)
- Sound: `node tools/capture.mjs cues data/cues.json && SKILL/scripts/py tools/mix.py .`
- Contact sheet: `node tools/capture.mjs scenes review/all.jpg all 2 0.3` (prefix `QS=_land` for 16:9)
- Video: `node tools/capture.mjs video renders/the-2am-call_9x16.mp4 0 -1 5 --audio` · `QS=_land node tools/capture.mjs video renders/the-2am-call_16x9.mp4 0 -1 5 --audio`
- New narration: edit `script.json` → `SKILL/scripts/py SKILL/scripts/voice.py .` → `SKILL/scripts/py SKILL/scripts/words.py .`
