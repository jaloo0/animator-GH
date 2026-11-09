# THE LOUVRE HEIST · the Clay Atlas example

A 65 s documentary explainer in 16:9 (the 19 October 2025 Louvre crown-jewel theft). It's the faceless-videos skill's
`clay-atlas` style. The 12 stills and the map are AI images the author made in an image tool (prompts in
`stills/PROMPTS.md`, with the style sheet as the reference). Every movement, graphic, voice and sound is local code.
The full guide is `SKILL/styles/clay-atlas/STYLE.md` (SKILL = the skill folder, usually ~/.claude/skills/faceless-videos).

Run inside this folder:
- Preview: `python3 -m http.server 8170` → http://127.0.0.1:8170/?shot=S08
- Check: `node tools/capture.mjs check` · contact sheet: `node tools/capture.mjs scenes review/all.jpg all 3 0.2`
- Sound: `node tools/capture.mjs cues data/cues.json && SKILL/scripts/py tools/mix.py .`
- Video (~3–5 min): `node tools/capture.mjs video renders/louvre-heist_16x9.mp4 0 -1 4 --audio`
- New stills' depth maps (optional install `setup.sh --depth`): `SKILL/scripts/py SKILL/scripts/depth.py stills`
- Erase AI text from a generated map: `SKILL/scripts/py tools/clean_map.py data/map.png data/map_clean.jpg`
- New narration: edit `script.json` → `SKILL/scripts/py SKILL/scripts/voice.py .` → `SKILL/scripts/py SKILL/scripts/words.py .`

Facts (status checked Oct 2026): ~9:30 a.m., 30 min after opening; truck-mounted furniture lift on the riverside; two
men in hi-vis vests; window cut with disc cutters; Apollo Gallery; two cases; eight pieces; est. €88M; ~4 min inside;
escape on motorbikes; Eugénie's crown dropped and found damaged; the 2014 ANSSI audit reported by Libération (Nov 2025):
video-surveillance server password "LOUVRE"; first arrests 25 Oct 2025; jewels still missing at the one-year mark.
