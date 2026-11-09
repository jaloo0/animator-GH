# WHAT IF YOU NUKED A VOLCANO? · the second Sunlit Explainer example (9:16, 30.8 s)

A vertical Zack D.-style 3D explainer, built entirely in code: four three.js sets (volcano, crater lava lake, bomb
X-ray, cut-away cross-section), a lava shader, GPU particles, Kokoro voice, an ACE-Step score (made locally) shifted
so its impact hits the eruption, and numpy sound design. Same question as a famous short, but with its own
fact-checked script, its own shots and a fictional bomb (XB-30). Full guide: `SKILL/styles/sunlit-explainer/STYLE.md` §8.

Script sources are in `script.json` (lava ≈ 2.7 g/cm³ so a bomb floats · basalt lava ≈ 1,100–1,200 °C · implosion
weapons need every block to fire together · magma chambers sit miles down · St. Helens ≈ 24 Mt ≫ any bomb).

Run inside this folder:
- Preview: `python3 -m http.server 8170` → http://127.0.0.1:8170/?shot=C2 (`&nocap` hides captions; `&land` = 16:9, not framed)
- Check: `node tools/capture.mjs check` · sheet: `node tools/capture.mjs scenes review/all.jpg all 2 0.2`
- Sound: `node tools/capture.mjs cues data/cues.json && SKILL/scripts/py tools/mix.py .` (the `music_sync` cue + `impact` in `audio/song.json` line up the music's hit)
- Video (~2 min): `node tools/capture.mjs video renders/nuke-volcano_9x16.mp4 0 -1 4 --audio`
- New narration: edit `script.json` → `SKILL/scripts/py SKILL/scripts/voice.py .` → `SKILL/scripts/py SKILL/scripts/words.py .`
