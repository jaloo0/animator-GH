"""Narration for $0 on this computer: Kokoro-82M (Apache-2.0) text-to-speech, no account, no API.

  scripts/py scripts/voice.py <project>          → data/narration.wav (48 kHz stereo) + data/narration.sentences.json
  scripts/py scripts/voice.py --list             the voices that narrate well
  scripts/py scripts/voice.py --download         only fetch the model files (~350 MB, once)

Two script formats (the project has one of them):

  script.json  (red-ghost, sunlit-explainer; works for every style)
    {"narrator": {"voice": "am_michael", "speed": 1.03},
     "phone":    {"voice": "am_onyx", "speed": 0.82, "gain": 0.75},        ← optional second voice
     "lines": [{"text": "At 2 A.M., the hallway phone rang.", "gap": 0.6},
               {"v": "p", "text": "Don't open the door.", "gap": 0.1}]}  ← "v": "p" = phone voice
    One line = one sentence = one cut point. "gap" = the silence after it (s). The phone voice is turned into a
    real whisper on a 1990 handset (noise-excited envelope, 300–3400 Hz band, line hiss).

  script.txt   (lamplit-ink; long stories)
    Paragraphs separated by a blank line; sentences split on . ! ? …; lines starting with # are ignored.
    --gap between sentences, --para between paragraphs, --short = minimum pause after a sentence of ≤ 2 words
    (the deadpan "Once. Twice." rhythm).
    The example used: --voice bm_george --speed 1.0 --gap 0.24 --para 0.6 --short 0.42

Write numbers the way they should be SAID ("nineteen nineteen", "forty gallons"); the screen text is separate.
The shots read data/narration.sentences.json (start/end of every sentence, exact) and data/words.json (words.py).
"""
import argparse, json, os, re, subprocess, sys, urllib.request
from pathlib import Path
import numpy as np

HOME = Path(os.environ.get('FACELESS_HOME', Path.home() / '.faceless-videos'))
KDIR = HOME / 'kokoro'
FILES = {
    'kokoro-v1.0.onnx': 'https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx',
    'voices-v1.0.bin': 'https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin',
}
GOOD = {
    'bm_george': 'UK male, documentary — the Lamplit Ink storyteller', 'bm_fable': 'UK male, storyteller',
    'am_michael': 'US male, steady — Red Ghost + Sunlit narrator', 'am_onyx': 'US male, low — good whispered phone voice',
    'am_fenrir': 'US male, deeper', 'am_puck': 'US male, lively', 'af_heart': 'US female, warm, the best overall',
    'af_bella': 'US female, bright', 'af_nicole': 'US female, soft/close', 'bf_emma': 'UK female, calm',
}
SR = 24000


def ensure_models():
    KDIR.mkdir(parents=True, exist_ok=True)
    for name, url in FILES.items():
        p = KDIR / name
        if p.exists() and p.stat().st_size > 1_000_000:
            continue
        for other in (Path.home() / '.vox-style-video/kokoro' / name,):  # a sibling skill already has it
            if other.exists() and other.stat().st_size > 1_000_000:
                try: p.symlink_to(other); break
                except OSError: pass
        if p.exists():
            continue
        print(f'downloading {name} (once)…', flush=True)
        tmp = p.with_suffix('.part')
        urllib.request.urlretrieve(url, tmp)
        tmp.rename(p)


def trim(a):
    nz = np.where(np.abs(a) > 0.01)[0]
    return a[max(0, nz[0] - int(0.03 * SR)): nz[-1] + int(0.09 * SR)] if len(nz) else a


def stft(x, n=1024, h=256):
    w = np.hanning(n); x = np.pad(x, (n, n))
    return np.array([np.fft.rfft(x[i:i + n] * w) for i in range(0, len(x) - n, h)])


def istft(F, length, n=1024, h=256):
    w = np.hanning(n)
    out = np.zeros(len(F) * h + n); norm = np.zeros_like(out)
    for i, f in enumerate(F):
        out[i * h:i * h + n] += np.fft.irfft(f, n) * w; norm[i * h:i * h + n] += w * w
    return (out / np.maximum(norm, 1e-6))[n:n + length]


def whisper(x, keep=0.18, seed=7):
    """noise-excited copy of the voice's spectral envelope (harmonics smoothed away) + a little of the original"""
    F = stft(x); mag = np.abs(F)
    ker = np.ones(15) / 15
    env = np.array([np.convolve(m, ker, mode='same') for m in mag])
    rng = np.random.default_rng(seed)
    noise = env * np.exp(1j * rng.uniform(0, 2 * np.pi, env.shape))
    y = istft(noise * np.linspace(0.6, 1.5, env.shape[1]), len(x))
    y = y / (np.abs(y).max() + 1e-9) * np.abs(x).max()
    return (1 - keep) * y + keep * x


def phone_band(x):
    """300–3400 Hz, mild saturation, faint line hiss"""
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    g = 1 / (1 + (300 / np.maximum(f, 1)) ** 4) / (1 + (f / 3400) ** 6)
    y = np.fft.irfft(X * g, len(x))
    y = np.tanh(y / (np.abs(y).max() + 1e-9) * 1.8) / np.tanh(1.8)
    hiss = np.random.default_rng(3).normal(0, 0.012, len(y))
    return y + np.fft.irfft(np.fft.rfft(hiss) * g, len(y))


def lang_for(voice, explicit=None):
    return explicit or ('en-gb' if voice[:1] == 'b' else 'en-us')


def write(proj, y, meta, extra):
    y = y / max(1e-6, np.abs(y).max()) * 0.89
    wav = proj / 'data/narration.wav'; wav.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 's16le', '-ar', str(SR), '-ac', '1', '-i', '-', '-ar', '48000', '-ac', '2', str(wav)],
                   input=(y * 32767).astype('<i2').tobytes(), check=True)
    (proj / 'data/narration.sentences.json').write_text(json.dumps({**extra, 'duration': round(len(y) / SR, 3), 'sentences': meta}, indent=1))
    print(f'{wav}  {len(y) / SR:.2f}s  {len(meta)} sentences')


def from_json(k, proj, cfg):
    out = [np.zeros(int(0.30 * SR), np.float32)]; pos = len(out[0]); meta = []
    for i, ln in enumerate(cfg['lines']):
        vc = cfg['narrator'] if ln.get('v', 'n') == 'n' else cfg['phone']
        a, _ = k.create(ln['text'], voice=vc['voice'], speed=vc.get('speed', 1.0), lang=lang_for(vc['voice'], vc.get('lang')))
        a = trim(np.asarray(a, np.float32))
        if ln.get('v') == 'p':
            a = phone_band(whisper(a)).astype(np.float32) * vc.get('gain', 0.8)
        meta.append({'i': i, 'v': ln.get('v', 'n'), 'text': ln['text'], 'start': round(pos / SR, 3), 'end': round((pos + len(a)) / SR, 3)})
        out.append(a); pos += len(a)
        z = np.zeros(int(ln.get('gap', 0.3) * SR), np.float32); out.append(z); pos += len(z)
        print(f"{meta[-1]['start']:7.2f} {meta[-1]['end']:7.2f}  [{meta[-1]['v']}] {ln['text']}", flush=True)
    write(proj, np.concatenate(out), meta, {})


def sentences(par):
    return [s for s in (p.strip() for p in re.split(r'(?<=[.!?…])\s+', par.strip())) if s]


def from_txt(k, proj, a):
    text = re.sub(r'^\s*#.*$', '', (proj / 'script.txt').read_text(), flags=re.M)
    paras = [p for p in re.split(r'\n\s*\n', text) if p.strip()]
    out = [np.zeros(int(0.35 * SR), np.float32)]; pos = len(out[0]); meta = []
    for pi, par in enumerate(paras):
        ss = sentences(' '.join(par.split()))
        for si, s in enumerate(ss):
            audio, _ = k.create(s, voice=a.voice, speed=a.speed, lang=lang_for(a.voice, a.lang))
            audio = trim(np.asarray(audio, np.float32))
            meta.append({'para': pi, 'i': len(meta), 'text': s, 'start': round(pos / SR, 3), 'end': round((pos + len(audio)) / SR, 3)})
            out.append(audio); pos += len(audio)
            g = a.para if (si == len(ss) - 1 and pi < len(paras) - 1) else a.gap
            if len(s.split()) <= 2: g = max(g, a.short)
            z = np.zeros(int(g * SR), np.float32); out.append(z); pos += len(z)
            print(f"{meta[-1]['start']:7.2f}  {s[:80]}", flush=True)
    write(proj, np.concatenate(out + [np.zeros(int(1.0 * SR), np.float32)]), meta, {'voice': a.voice, 'speed': a.speed})


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('project', nargs='?')
    ap.add_argument('--voice', default='bm_george', help='script.txt mode (script.json names its own voices)')
    ap.add_argument('--speed', type=float, default=1.0)
    ap.add_argument('--gap', type=float, default=0.24)
    ap.add_argument('--para', type=float, default=0.6)
    ap.add_argument('--short', type=float, default=0.42)
    ap.add_argument('--lang', default=None, help='en-us / en-gb (default: from the voice name)')
    ap.add_argument('--list', action='store_true')
    ap.add_argument('--download', action='store_true')
    a = ap.parse_args()
    if a.list:
        for v, d in GOOD.items(): print(f'{v:12s} {d}')
        print('(all 50+ voices: https://huggingface.co/hexgrad/Kokoro-82M/blob/main/VOICES.md)')
        return
    ensure_models()
    if a.download:
        print('models ok:', KDIR); return
    if not a.project:
        sys.exit('usage: voice.py <project>')
    from kokoro_onnx import Kokoro
    k = Kokoro(str(KDIR / 'kokoro-v1.0.onnx'), str(KDIR / 'voices-v1.0.bin'))
    proj = Path(a.project)
    if (proj / 'script.json').exists():
        from_json(k, proj, json.loads((proj / 'script.json').read_text()))
    elif (proj / 'script.txt').exists():
        from_txt(k, proj, a)
    else:
        sys.exit(f'no script.json or script.txt in {proj}')


if __name__ == '__main__':
    main()
