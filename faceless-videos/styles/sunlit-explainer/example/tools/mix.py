"""Hard Boiled — soundtrack: Kokoro narration + the ACE-Step score (take seed89, spliced on a downbeat so it
resolves at 29.8 s) + soft procedural foley keyed to data/cues.json (exported from the shot list). Everything
is gentle: no hard clicks, highs rolled off, music ducked under the voice, master ≈ −16 LUFS-ish (RMS −19 dBFS).
  SKILL/scripts/py tools/mix.py <project>  → data/mix.wav (+ data/stems/*.wav)"""
import json, subprocess, sys
from pathlib import Path
import numpy as np, soundfile as sf
from scipy import signal

def read_music(P, sr=48000):
    """the chosen score: audio/music.wav (or .mp3/.flac/.m4a), decoded by ffmpeg to float stereo at `sr`"""
    import subprocess
    for ext in ('wav', 'flac', 'mp3', 'm4a', 'ogg'):
        f = P / f'audio/music.{ext}'
        if f.exists():
            raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(f), '-ar', str(sr), '-ac', '2', '-f', 'f32le', '-'], capture_output=True, check=True).stdout
            return np.frombuffer(raw, np.float32).reshape(-1, 2).astype(np.float64)
    raise SystemExit('no audio/music.* — make one (SKILL/scripts/music/make_music.sh) or drop in a royalty-free track')


P = Path(sys.argv[1] if len(sys.argv) > 1 else '.')
SR = 48000
rng = np.random.default_rng(7)
cues = json.loads((P / 'data/cues.json').read_text())
sen = json.loads((P / 'data/narration.sentences.json').read_text())
DUR = sen['duration']
N = int(DUR * SR)
t = np.arange(N) / SR

def lp(x, f, o=2): b, a = signal.butter(o, f / (SR / 2), 'low'); return signal.lfilter(b, a, x, axis=0)
def hp(x, f, o=2): b, a = signal.butter(o, f / (SR / 2), 'high'); return signal.lfilter(b, a, x, axis=0)
def bp(x, f0, f1, o=2): b, a = signal.butter(o, [f0 / (SR / 2), f1 / (SR / 2)], 'band'); return signal.lfilter(b, a, x, axis=0)
def db(x): return 10 ** (x / 20)
def tt(n): return np.arange(n) / SR
def env(n, a=0.01, r=0.2):
    e = np.ones(n); ka = max(1, int(a * SR)); kr = max(1, int(r * SR))
    e[:ka] = np.linspace(0, 1, ka); e[-kr:] *= np.linspace(1, 0, kr) ** 1.5; return e
def place(buf, x, at, g=1.0, pan=0.0):
    if x.ndim == 1: x = np.stack([x * np.cos((pan + 1) * np.pi / 4) * 1.414, x * np.sin((pan + 1) * np.pi / 4) * 1.414], 1)
    i = int(round(at * SR))
    if i >= len(buf): return
    if i < 0: x = x[-i:]; i = 0
    x = x[: len(buf) - i]; buf[i:i + len(x)] += x * g
def norm(x, p=0.9): return x / (np.abs(x).max() + 1e-9) * p
def addm(a, b):
    n = max(len(a), len(b)); return np.pad(a, (0, n - len(a))) + np.pad(b, (0, n - len(b)))
def reverb_ir(rt=0.6, pre=0.01, damp=3200):
    n = int(rt * 1.3 * SR); e = np.exp(-6.9 * tt(n) / rt)
    l = lp(rng.standard_normal(n), damp) * e; r = lp(rng.standard_normal(n), damp) * e
    ir = np.zeros((n + int(pre * SR), 2)); ir[int(pre * SR):, 0] = l; ir[int(pre * SR):, 1] = r
    return ir / np.sqrt((ir ** 2).sum() / 2)
def verb(x, ir, wet=0.25):
    if x.ndim == 1: x = np.stack([x, x], 1)
    y = np.stack([signal.fftconvolve(x[:, k], ir[:, k])[: len(x)] for k in range(2)], 1)
    return x * (1 - wet) + y * wet
ROOM = reverb_ir(0.45, 0.006, 2600); OPEN = reverb_ir(0.9, 0.02, 2200)

# ---------------- sound kit (soft) ----------------
def whoosh(dur, f0, f1):
    n = int(dur * SR); x = rng.standard_normal(n); out = np.zeros(n); k = 512
    fc = np.geomspace(f0, f1, n // k + 1)
    for i in range(0, n, k):
        seg = x[max(0, i - 2048):i + k]; y = bp(seg, fc[i // k] * 0.6, min(fc[i // k] * 1.6, 9000))
        out[i:i + k] = y[-min(k, n - i):]
    e = np.sin(np.pi * np.clip(tt(n) / dur, 0, 1)) ** 2
    return norm(lp(out * e, 5000)) * 0.8
def thunk(f=110, decay=10, click=0.25):
    n = int(0.6 * SR); s = tt(n)
    body = np.sin(2 * np.pi * f * s * (1 + 0.6 * np.exp(-s * 30))) * np.exp(-s * decay)
    c = lp(rng.standard_normal(n), 1800) * np.exp(-s * 70) * click
    return norm(lp(body + c, 2500)) * env(n, 0.002, 0.1)
def metal_tink(f=820, g=0.6):
    n = int(1.2 * SR); s = tt(n)
    parts = [(1.0, 1.0), (2.76, 0.35), (5.4, 0.12)]
    x = sum(a * np.sin(2 * np.pi * f * m * s) * np.exp(-s * (4 + 3 * m)) for m, a in parts)
    return norm(lp(x, 4000)) * g * env(n, 0.003, 0.3)
def tok(f=900):
    n = int(0.25 * SR); s = tt(n)
    x = np.sin(2 * np.pi * f * s) * np.exp(-s * 38) + 0.5 * np.sin(2 * np.pi * f * 1.52 * s) * np.exp(-s * 55)
    x += bp(rng.standard_normal(n), 900, 3000) * np.exp(-s * 120) * 0.4
    return norm(lp(x, 4500)) * env(n, 0.001, 0.08)
def noise_bed(dur, f0, f1, wob=0.3, seed=1):
    r = np.random.default_rng(seed); n = int(dur * SR)
    x = bp(r.standard_normal(n), f0, f1); m = 1 + wob * lp(r.standard_normal(n), 0.6) * 30
    return norm(x * np.clip(m, 0.2, 2)) * env(n, 0.3, 0.4)
def scrape(dur=0.45):
    n = int(dur * SR); s = tt(n)
    x = bp(rng.standard_normal(n), 400, 2200) * (0.6 + 0.4 * np.sin(2 * np.pi * 23 * s) ** 2)
    return norm(lp(x, 3000)) * np.sin(np.pi * s / dur) ** 1.5
def pour(dur):
    n = int(dur * SR); s = tt(n); out = np.zeros(n)
    base = bp(rng.standard_normal(n), 300, 1800) * 0.5
    for k in range(int(dur * 28)):  # bubbles
        i = int(rng.random() * n); m = int(0.04 * SR); f = 500 + 900 * (i / n) + rng.random() * 300
        b = np.sin(2 * np.pi * f * tt(m) * (1 + 1.5 * tt(m))) * np.exp(-tt(m) * 60)
        out[i:i + m] += b[: n - i] * (0.4 + 0.6 * rng.random())
    x = out + base
    return norm(lp(x, 3500)) * env(n, 0.06, 0.25)
def tear(dur):
    n = int(dur * SR); s = tt(n)
    crackle = (rng.random(n) < 0.012).astype(float) * rng.standard_normal(n)
    x = bp(rng.standard_normal(n), 900, 5000) * (0.4 + 0.6 * lp(np.abs(crackle), 200) * 30) + lp(crackle, 3500) * 2
    return norm(lp(x, 5500)) * np.sin(np.pi * np.clip(s / dur, 0, 1)) ** 0.7
def cloth(dur=0.35):
    n = int(dur * SR); s = tt(n)
    return norm(lp(bp(rng.standard_normal(n), 200, 2500), 2600)) * np.sin(np.pi * s / dur) ** 2
def brush(dur, wet=0.5):
    n = int(dur * SR); s = tt(n); strokes = 0.5 + 0.5 * np.sin(2 * np.pi * 3.2 * s - np.pi / 2)
    x = bp(rng.standard_normal(n), 1200, 4500) * strokes ** 2
    if wet: x += bp(rng.standard_normal(n), 300, 1200) * strokes ** 3 * wet * 0.7
    return norm(lp(x, 5000)) * env(n, 0.05, 0.15)
def shimmer(dur):
    n = int(dur * SR); s = tt(n); x = np.zeros(n)
    for f in (880, 1320, 1760, 2640):
        x += np.sin(2 * np.pi * f * s * (1 + 0.003 * np.sin(2 * np.pi * 5 * s))) * (0.5 if f > 1500 else 1)
    x += bp(rng.standard_normal(n), 3000, 7000) * 0.3
    return norm(lp(x, 6000)) * np.sin(np.pi * s / dur) ** 2 * 0.6
def rattle(dur, rate=17):
    n = int(dur * SR); x = np.zeros(n)
    for i in np.arange(0, dur, 1 / rate):
        m = int(0.03 * SR); j = int(i * SR); h = bp(rng.standard_normal(m), 500, 2500) * np.exp(-tt(m) * 140)
        x[j:j + m] += h[: n - j]
    return norm(lp(x, 3000)) * env(n, 0.02, 0.1)

fx = np.zeros((N, 2)); amb = np.zeros((N, 2))
for c in cues:
    ty, at, g, pan = c['type'], c['t'], c.get('g', 1.0), c.get('pan', 0.0)
    if ty == 'amb':
        d = c['dur']; s = c['set']
        if s == 'site': x = noise_bed(d, 60, 400, seed=2) * 0.5 + noise_bed(d, 900, 2500, seed=3) * 0.12
        elif s == 'wind': x = noise_bed(d, 120, 900, 0.5, seed=4) * 0.6
        elif s == 'room': x = noise_bed(d, 50, 300, 0.1, seed=5) * 0.25 + noise_bed(d, 2000, 5000, 0.2, seed=6) * 0.04
        else: x = noise_bed(d, 150, 1400, 0.7, seed=8) * 0.75
        place(amb, np.stack([x, np.roll(x, 1200)], 1), at, g)
    elif ty == 'whoosh': place(fx, whoosh(c['dur'], c['f0'], c['f1']) * 0.55, at, g, pan)
    elif ty == 'shimmer': place(fx, verb(shimmer(c['dur']), OPEN, 0.4) * 0.35, at, g)
    elif ty == 'lift': place(fx, verb(thunk(260, 30, 0.6) * 0.3, ROOM, 0.15), at, g)
    elif ty == 'catch': place(fx, verb(addm(thunk(150, 14, 0.4) * 0.55, metal_tink(620, 0.12)), OPEN, 0.2), at, g)
    elif ty == 'clunk': place(fx, verb(thunk(130, 12, 0.3) * 0.5, OPEN, 0.2), at, g)
    elif ty == 'scrape': place(fx, verb(scrape() * 0.25, OPEN, 0.3), at, g, -0.3)
    elif ty == 'knock': place(fx, verb(thunk(170, 18, 0.5) * 0.45, OPEN, 0.25), at, g, pan)
    elif ty == 'pour': place(fx, verb(pour(c['dur']) * 0.45, OPEN, 0.15), at, g)
    elif ty == 'tink': place(fx, verb(addm(metal_tink(760, 0.35), thunk(200, 25, 0.3) * 0.2), ROOM, 0.3), at, g, -0.3)
    elif ty == 'cart':
        d = c['dur']; n = int(d * SR); s = tt(n)
        x = lp(rng.standard_normal(n), 180) * 4 + bp(rng.standard_normal(n), 1800, 2600) * 0.08 * (np.sin(2 * np.pi * 0.9 * s) > 0.6)
        place(fx, verb(norm(x) * 0.22 * env(n, 0.4, 0.5), OPEN, 0.2), at, g)
    elif ty == 'pebble': place(fx, verb(thunk(320 + 120 * rng.random(), 40, 0.6) * 0.22, ROOM, 0.2), at, g, rng.uniform(-0.2, 0.2))
    elif ty == 'grit': place(fx, verb(lp(bp(rng.standard_normal(int(c['dur'] * SR)), 1500, 5000), 5000) * 0.05 * env(int(c['dur'] * SR), 0.2, 0.6), ROOM, 0.3), at, g)
    elif ty == 'tear': place(fx, verb(tear(c['dur']) * 0.35, ROOM, 0.2), at, g, 0.2)
    elif ty == 'steam':
        d = c['dur']; n = int(d * SR); x = hp(rng.standard_normal(n), 2500) * (0.7 + 0.3 * lp(rng.standard_normal(n), 2) * 10)
        place(fx, verb(lp(x, 7000) * 0.06 * env(n, 0.25, 0.5), ROOM, 0.3), at, g)
    elif ty == 'cloth': place(fx, verb(cloth() * 0.3, ROOM, 0.2), at, g)
    elif ty == 'brush': place(fx, verb(brush(c['dur'], c.get('wet', 0.5)) * 0.22, ROOM, 0.2), at, g)
    elif ty == 'snap': place(fx, verb(thunk(120, 16, 0.35) * 0.55, ROOM, 0.25), at, g)
    elif ty == 'stamp': place(fx, verb(thunk(140, 20, 0.7) * 0.65, ROOM, 0.25), at, g)
    elif ty == 'rivetgun': place(fx, verb(rattle(c['dur']) * 0.18, OPEN, 0.35), at, g, 0.3)
    elif ty == 'tok': place(fx, verb(tok(980) * 0.7, OPEN, 0.3), at, g, 0.1)
    else: print('mix.py: no sound for cue type', repr(ty), '— add a branch above')

# ---------------- music: seed89, spliced downbeat 26.977 → 32.309 so it resolves at the end ----------------
mus = read_music(P, SR)   # audio/music.* (the example's is take seed89)
cut_a, cut_b, xf = 26.977, 32.309, 0.12
a = mus[: int((cut_a + xf) * SR)]; b = mus[int((cut_b) * SR):]
k = int(xf * SR); w = np.linspace(0, 1, k)[:, None]
music = np.concatenate([a[:-k], a[-k:] * (1 - w) + b[:k] * w, b[k:]])
music = music[:N]; music = np.pad(music, ((0, N - len(music)), (0, 0)))
music *= np.clip((DUR - t) / 0.9, 0, 1)[:, None] ** 1.2
music = lp(music, 9000)

# ---------------- narration + duck ----------------
voice, vsr = sf.read(P / 'data/narration.wav', always_2d=True)
assert vsr == SR, vsr
voice = voice[:N]; voice = np.pad(voice, ((0, N - len(voice)), (0, 0)))
venv = lp(np.abs(voice).mean(1), 3, 1)
act = np.clip(venv / (np.percentile(venv, 90) + 1e-9), 0, 1)
duck = 1 - 0.5 * act
music_g = music * duck[:, None]

mix = voice * 1.0 + music_g * db(-11) + fx * db(-9) + amb * db(-20)
mix = hp(mix, 30, 2)
mix = mix - 0.3 * (mix - lp(mix, 6500, 1))
rms = np.sqrt((mix ** 2).mean()); mix *= db(-18.5) / rms
pk = np.abs(mix).max(); lim = db(-1.0)
if pk > lim * 0.7:
    k0 = 0.7 * lim; over = np.abs(mix) > k0
    mix = np.where(over, np.sign(mix) * (k0 + (np.abs(mix) - k0) / (1 + (np.abs(mix) - k0) / (0.3 * lim))), mix)
mix *= np.clip((DUR - t) / 0.3, 0, 1)[:, None]
sf.write(P / 'data/mix.wav', mix.astype(np.float32), SR, subtype='PCM_24')
(P / 'data/stems').mkdir(exist_ok=True)
for name, x in (('music', music_g * db(-11)), ('fx', fx * db(-9)), ('amb', amb * db(-20))): sf.write(P / f'data/stems/{name}.wav', x.astype(np.float32), SR)
print(f'data/mix.wav {DUR:.2f}s  rms {20 * np.log10(np.sqrt((mix ** 2).mean())):.1f} dBFS  peak {20 * np.log10(np.abs(mix).max()):.1f} dBFS')
