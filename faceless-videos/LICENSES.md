# Third-party components

Bundled:
- three.js + addons (MIT): `styles/red-ghost/example*/vendor`, `styles/sunlit-explainer/example*/vendor`.
- Fonts, all from Google Fonts: Permanent Marker, Arimo (Apache License 2.0); Patrick Hand, Patrick Hand SC,
  Gochi Hand, Kalam, Caveat, Barlow Condensed, Anton, Arvo, Fredoka, Nunito, Inter, Playfair Display, JetBrains Mono
  (SIL Open Font License 1.1).
  Red Ghost and the volcano captions use the computer's own Arial Bold when it has one (Mac, Windows), else Arimo;
  Sunlit printed type uses the computer's own Rockwell when it has one (Mac), else Arvo. Neither Arial nor Rockwell
  is bundled.
- Example music: `styles/lamplit-ink/example/audio/music.mp3`, `styles/sunlit-explainer/example/audio/music.mp3` and
  `styles/sunlit-explainer/example-nuke-volcano/audio/music.mp3` were made locally with ACE-Step 1.5 (MIT) by the
  skill's author; free to use in your own videos. The other examples' scores are procedural (numpy) code.
- Example narrations were made with Kokoro-82M (Apache-2.0).
- Style sheets (`styles/*/style-sheet.jpg`) and the Clay Atlas example's stills and map
  (`styles/clay-atlas/example/stills`, `data/map_*`) were made by the skill's author with AI image tools. They're
  shipped so the examples render and to show the look; free to use for learning and in your own videos.
- The stories, drawings, 3D sets, characters, sound design and code are original and free to use, remix and share.

Installed on first use (not bundled):
- Kokoro-82M (Apache-2.0) via kokoro-onnx (MIT): local text-to-speech voices.
- faster-whisper (MIT) + Whisper small.en (MIT): word timestamps.
- numpy, scipy, soundfile: audio processing.
- Optional `setup.sh --depth`: Depth Anything V2 Small (Apache-2.0; ONNX export by onnx-community), onnxruntime (MIT), Pillow (MIT-CMU).
- Optional: ACE-Step 1.5 (MIT), local music.
