"""Local narration with Kokoro-82M — narrator + character voices, real beats (the stickman script format).
  SKILL/scripts/py tools/voice.py <project> [--speed 1.0]          then:  SKILL/scripts/py SKILL/scripts/words.py <project>
script.txt: one line = one clause block (its own picture group). Blank line = paragraph pause.
'[beat 1.5]' = silence. '[Name] text' = spoken by that character (VOICES), the name is never read.
Writes data/narration.wav (48 kHz stereo) + data/lines.json [{i, who, text, start, end}].
A new character = a new entry in VOICES (name → (Kokoro voice, speed factor)); list voices: SKILL/scripts/py SKILL/scripts/voice.py --list.
The Kokoro model files come from setup.sh (~/.faceless-videos/kokoro)."""
import argparse, json, os, re, subprocess
from pathlib import Path
import numpy as np
KDIR = Path(os.environ.get('FACELESS_HOME', Path.home() / '.faceless-videos')) / 'kokoro'
VOICES = {'narrator': ('am_michael', 1.0), 'Neighbor': ('af_nicole', 0.92)}

ap = argparse.ArgumentParser()
ap.add_argument('project'); ap.add_argument('--speed', type=float, default=1.0)
ap.add_argument('--gap', type=float, default=0.32); ap.add_argument('--para', type=float, default=0.75)
ap.add_argument('--short', type=float, default=0.5)
a = ap.parse_args()
from kokoro_onnx import Kokoro
k = Kokoro(str(KDIR / 'kokoro-v1.0.onnx'), str(KDIR / 'voices-v1.0.bin'))
proj = Path(a.project)
raw = [l.rstrip() for l in (proj / 'script.txt').read_text().splitlines() if not l.lstrip().startswith('#')]
sr = 24000; out = [np.zeros(int(0.45 * sr), np.float32)]; pos = len(out[0]); meta = []
def sil(sec):
    global pos
    z = np.zeros(int(sec * sr), np.float32); out.append(z); pos += len(z)
for li, line in enumerate(raw):
    if not line.strip():
        if out: sil(max(0, a.para - a.gap))
        continue
    m = re.match(r'\[beat\s+([\d.]+)\]', line.strip())
    if m:
        meta.append({'i': len(meta), 'who': 'beat', 'text': '', 'start': round(pos / sr, 3), 'end': round(pos / sr + float(m.group(1)), 3)})
        sil(float(m.group(1))); continue
    who = 'narrator'
    m = re.match(r'\[(\w+)\]\s*(.*)', line.strip())
    if m: who, line = m.group(1), m.group(2)
    if who not in VOICES: raise SystemExit(f'line {li + 1}: no voice for [{who}] — add it to VOICES in tools/voice.py')
    voice, vs = VOICES[who]
    t0 = pos / sr
    sents = [s for s in re.split(r'(?<=[.!?])\s+', line.strip()) if s]
    for si, s in enumerate(sents):
        audio, _ = k.create(s, voice=voice, speed=a.speed * vs, lang='en-us')
        audio = np.asarray(audio, np.float32)
        nz = np.where(np.abs(audio) > 0.01)[0]
        if len(nz): audio = audio[max(0, nz[0] - int(0.03 * sr)): nz[-1] + int(0.09 * sr)]
        if who != 'narrator': audio *= 0.8
        out.append(audio); pos += len(audio)
        if si < len(sents) - 1: sil(a.gap * 0.8)
    meta.append({'i': len(meta), 'who': who, 'text': line.strip(), 'start': round(t0, 3), 'end': round(pos / sr, 3)})
    sil(max(a.gap, a.short) if len(line.split()) <= 2 else a.gap)
    print(f"{t0:7.2f}  {who:9s} {line[:70]}", flush=True)
y = np.concatenate(out + [np.zeros(int(1.6 * sr), np.float32)])
y = y / max(1e-6, np.abs(y).max()) * 0.89
wav = proj / 'data/narration.wav'
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 's16le', '-ar', str(sr), '-ac', '1', '-i', '-', '-ar', '48000', '-ac', '2', str(wav)],
               input=(y * 32767).astype('<i2').tobytes(), check=True)
(proj / 'data/lines.json').write_text(json.dumps({'duration': round(len(y) / sr, 3), 'lines': meta}, indent=1))
print(f'{wav}  {len(y) / sr:.1f}s')
