# faceless-videos v2: a free Claude Code skill

Narrated faceless videos in five ready styles, built in code on your own computer:

1. **Lamplit Ink**: a hand-inked cartoon survival story in 9:16, run as a "Part 1" series with real numbers on cream cards and a cliffhanger.
2. **Red Ghost**: a horror / true-crime reconstruction. Glowing ember-red faceless people move through a dim 3D room, with yellow captions. Two examples: a 30 s scary story (9:16 + 16:9) and a 1-minute true case (9:16).
3. **Sunlit Explainer**: a Zack D. Films–style 3D explainer. Two examples: a 16:9 history story with stylized 3D people in low warm sun, and a 9:16 "what would happen if" science short with lava and particles.
4. **Stickman** (new): a "What if…?" story acted by stick figures in flat illustrated rooms, with one picture per clause and gold step cards. 16:9 + 9:16 from one build.
5. **Clay Atlas** (new): a documentary explainer with faceless clay figures, aerial dioramas, parchment maps and dates. You make ~12 stills in your own image tool from prompts Claude writes; a depth camera and code graphics do all the motion.

Cost: $0 in this skill. It uses a local Kokoro voice, local Whisper for word timings, three.js/canvas for the pictures,
numpy for the sound, and headless Chrome + ffmpeg for the render. There's no AI video, no API keys and no credits.
Optional, all local: original music with ACE-Step (~15 GB) and depth maps for new Clay Atlas stills (~0.1 GB).
Clay Atlas stills come from whatever image tool you already use.

Install: unzip into `~/.claude/skills/faceless-videos/`, run `bash scripts/setup.sh` (prints "All set", ~1 GB), then
`bash scripts/selftest.sh` (three short clips, prints "SELFTEST PASSED"). After that, ask Claude Code for a faceless
video in any new session.

Layout: `SKILL.md` (what Claude follows) · `scripts/` (setup, selftest, new_video, voice, words, depth, music) ·
`styles/<style>/STYLE.md` + `style-sheet.jpg` + `example*/` (complete projects that render as-is).

What's new in v2: Stickman and Clay Atlas styles; TOO TALL (1-min true crime) for Red Ghost; WHAT IF YOU NUKED A
VOLCANO? (9:16, with its particle fix and music-impact sync) for Sunlit Explainer; `new_video.sh --from <example>`;
`selftest.sh --all`; `setup.sh --depth`; words.py handles the stickman line format.
