"""TOO TALL — soundtrack, 100 % local and procedural (numpy/scipy), no samples, no AI audio.
Narration (Kokoro, data/narration.wav) + a dark drone score with a sparse soft piano, and sound design keyed to
data/cues.json (exported from the shot list): CCTV tape hum + transport clunks, night ambience, store hum, the door
chime, soft keypad presses, the safe handle, footfalls of the run, two shots muffled by the office wall, a cell door,
a sting on the match. Soft by design — no ticks/clicks/beeps, everything above ~5 kHz rolled off.

  SKILL/scripts/py tools/mix.py <project>      → data/mix.wav (+ data/stems/*.wav)
"""
import json, sys
from pathlib import Path
import numpy as np, soundfile as sf
from scipy import signal

P = Path(sys.argv[1] if len(sys.argv) > 1 else '.')
SR = 48000
rng = np.random.default_rng(23)
cues = json.loads((P / 'data/cues.json').read_text())
sen = json.loads((P / 'data/narration.sentences.json').read_text())
TAIL = 0.9
DUR = sen['duration'] + TAIL
N = int(DUR * SR)
C = {}
for c in cues: C.setdefault(c['type'], []).append(c)

def lp(x, f, o=2): b, a = signal.butter(o, f / (SR / 2), 'low'); return signal.lfilter(b, a, x, axis=0)
def hp(x, f, o=2): b, a = signal.butter(o, f / (SR / 2), 'high'); return signal.lfilter(b, a, x, axis=0)
def bp(x, f0, f1, o=2): b, a = signal.butter(o, [f0 / (SR / 2), f1 / (SR / 2)], 'band'); return signal.lfilter(b, a, x, axis=0)
def db(x): return 10 ** (x / 20)
def tt(n): return np.arange(n) / SR
def place(buf, x, t, g=1.0, pan=0.0):
    if x.ndim == 1: x = np.stack([x * np.cos((pan + 1) * np.pi / 4) * 1.414, x * np.sin((pan + 1) * np.pi / 4) * 1.414], 1)
    i = int(round(t * SR))
    if i >= len(buf): return
    if i < 0: x = x[-i:]; i = 0
    x = x[: len(buf) - i]; buf[i:i + len(x)] += x * g
def env(n, a=0.005, r=0.1):
    t = tt(n); d = n / SR
    return np.minimum(1, t / max(a, 1e-4)) * np.clip((d - t) / max(r, 1e-4), 0, 1)

def reverb_ir(rt=0.7, pre=0.012, damp=3500, width=1.0):
    n = int(rt * 1.3 * SR); t = tt(n)
    e = np.exp(-6.9 * t / rt)
    l = lp(rng.standard_normal(n), damp) * e; r = lp(rng.standard_normal(n), damp) * e
    ir = np.zeros((n + int(pre * SR), 2)); ir[int(pre * SR):, 0] = l; ir[int(pre * SR):, 1] = l * (1 - width) + r * width
    return ir / np.sqrt((ir ** 2).sum() / 2)
def verb(x, ir, wet=0.3):
    if x.ndim == 1: x = np.stack([x, x], 1)
    y = np.stack([signal.fftconvolve(x[:, k], ir[:, k])[: len(x)] for k in range(2)], 1)
    return x * (1 - wet) + y * wet
STORE_IR = reverb_ir(0.75, 0.012, 3000)
ROOM_IR = reverb_ir(0.4, 0.006, 2500)
HALL_IR = reverb_ir(1.6, 0.02, 2600)      # concrete corridor

# ---------------- sound kit ----------------
def clunk(f0=110, f1=60, dur=0.35, noise=0.3, cut=1400):
    n = int(dur * SR); t = tt(n)
    x = np.sin(2 * np.pi * np.cumsum(np.linspace(f0, f1, n)) / SR) * np.exp(-t * 26)
    x += noise * lp(rng.standard_normal(n), cut) * np.exp(-t * 60)
    return lp(x * np.minimum(1, t / 0.002), cut + 400)

def tape_hum(dur):
    """VCR transport: low motor hum with wow + band-limited tape hiss (very soft)"""
    n = int(dur * SR); t = tt(n)
    wow = 1 + 0.004 * np.sin(2 * np.pi * 0.7 * t)
    x = 0.5 * np.sin(2 * np.pi * 59.5 * np.cumsum(wow) / SR) + 0.22 * np.sin(2 * np.pi * 119 * t + 0.3) + 0.08 * np.sin(2 * np.pi * 178.5 * t)
    x = lp(x, 400) + bp(rng.standard_normal(n), 400, 3800, 2) * 0.05
    return x * env(n, 0.25, 0.3)

def tape_stop():
    n = int(0.9 * SR); t = tt(n)
    f = 59.5 * np.exp(-t * 2.6)
    x = 0.5 * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 2.2)
    y = lp(x, 300); c = clunk(130, 70, 0.4, 0.35, 1200) * 0.9; y[:len(c)] += c
    return y

def ambience(dur, kind='night'):
    n = int(dur * SR); t = tt(n)
    if kind == 'night':  # distant traffic + air: slow swells of low noise
        x = lp(rng.standard_normal(n), 260) * (0.55 + 0.45 * np.sin(2 * np.pi * 0.09 * t + 1.2) ** 2) * 1.6
        x += lp(bp(rng.standard_normal(n), 300, 1400, 2), 1200) * 0.12 * (0.5 + 0.5 * np.sin(2 * np.pi * 0.05 * t))
    else:  # store: fluorescent hum (120/240 Hz) + air handling
        x = 0.05 * np.sin(2 * np.pi * 120 * t) + 0.02 * np.sin(2 * np.pi * 240 * t + 0.7) + lp(rng.standard_normal(n), 380) * 0.5
    return x * env(n, 0.4, 0.4)

def chime():
    """door chime: two soft bell tones, high partials rolled off"""
    out = np.zeros(int(2.8 * SR))
    for k, (f, g) in enumerate([(659.3, 1.0), (523.3, 0.85)]):
        n = int(2.2 * SR); t = tt(n)
        x = (np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * f * 2.0 * t) * np.exp(-t * 3) + 0.12 * np.sin(2 * np.pi * f * 3.01 * t) * np.exp(-t * 5)) * np.exp(-t * 2.4) * np.minimum(1, t / 0.006)
        i = int(k * 0.42 * SR); out[i:i + n] += x * g
    return lp(out, 2800) * 0.5

def step(g=1.0):
    n = int(0.16 * SR); t = tt(n)
    x = np.sin(2 * np.pi * 72 * t) * np.exp(-t * 38) + 0.5 * lp(rng.standard_normal(n), 420) * np.exp(-t * 55)
    return lp(x * np.minimum(1, t / 0.004), 500) * g

def key():
    n = int(0.12 * SR); t = tt(n)
    x = np.sin(2 * np.pi * 210 * t) * np.exp(-t * 70) + 0.4 * lp(rng.standard_normal(n), 650) * np.exp(-t * 90)
    return lp(x * np.minimum(1, t / 0.003), 800) * 0.6

def handle():
    n = int(0.9 * SR); t = tt(n)
    modes = [(118, 1.0, 14), (310, 0.55, 20), (527, 0.32, 26), (880, 0.14, 34)]
    x = sum(a * np.sin(2 * np.pi * f * t) * np.exp(-t * d) for f, a, d in modes)
    x += 0.4 * lp(rng.standard_normal(n), 1300) * np.exp(-t * 80)
    rat = np.zeros(n)  # a short metal rattle as it stops
    for k in range(5): i = int((0.03 + k * 0.035) * SR); m = int(0.05 * SR); rat[i:i + m] += np.sin(2 * np.pi * 690 * tt(m)) * np.exp(-tt(m) * 90) * (0.4 - k * 0.07)
    return lp((x + rat) * np.minimum(1, t / 0.002), 1900) * 0.8

def bang_muffled(g=1.0, cut=900):
    """a gunshot heard through a wall: a low boom + a dull burst; no crack, nothing sharp"""
    n = int(1.6 * SR); t = tt(n)
    boom = np.sin(2 * np.pi * np.cumsum(np.linspace(95, 38, n)) / SR) * np.exp(-t * 5.5)
    burst = lp(rng.standard_normal(n), cut) * np.exp(-t * 32)
    x = (boom * 0.9 + burst * 0.8) * np.minimum(1, t / 0.003)
    return lp(x, cut + 300) * g

def sub_boom(dur=3.2):
    n = int(dur * SR); t = tt(n)
    x = np.sin(2 * np.pi * np.cumsum(np.linspace(64, 31, n)) / SR) * np.exp(-t * 1.1) * np.minimum(1, t / 0.01)
    return lp(x, 160)

def riser(dur=1.4):
    n = int(dur * SR); t = tt(n)
    x = bp(rng.standard_normal(n), 120, 900, 2) * (t / dur) ** 2.5
    tone = sum(np.sin(2 * np.pi * f * t) for f in (73.4, 77.8, 110.0)) / 3 * (t / dur) ** 2
    return lp(x * 0.6 + tone * 0.5, 1400)

def clang():
    """barred cell door slamming into its stop: inharmonic metal modes, a body thump, the corridor rings"""
    n = int(2.0 * SR); t = tt(n)
    modes = [(142, 1.0, 3.2), (331, 0.6, 4.5), (587, 0.42, 6.0), (913, 0.25, 8.0), (1340, 0.12, 11.0)]
    x = sum(a * np.sin(2 * np.pi * f * t + rng.random()) * np.exp(-t * d) for f, a, d in modes)
    x += 0.7 * np.sin(2 * np.pi * 60 * t) * np.exp(-t * 18) + 0.4 * lp(rng.standard_normal(n), 1500) * np.exp(-t * 70)
    return lp(x * np.minimum(1, t / 0.002), 2600) * 0.75

def saw(f, n, detune=0.0):
    t = tt(n); y = np.zeros(n)
    for d in (-detune, 0, detune):
        ph = (f * (1 + d) * t) % 1.0; y += 2 * ph - 1
    return y / 3

def piano(midi, v=1.0, dur=3.0):
    f = 440 * 2 ** ((midi - 69) / 12); n = int(dur * SR); t = tt(n)
    x = np.sin(2 * np.pi * f * t) + 0.38 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t * 1.6) + 0.12 * np.sin(2 * np.pi * 3.01 * f * t) * np.exp(-t * 3)
    x *= np.exp(-t * 1.25) * np.minimum(1, t / 0.008)
    return lp(x, 2000) * v

# ---------------- score ----------------
score = np.zeros((N, 2))
t = tt(N)
arc_pts = sorted((c['t'], c['v']) for c in C.get('arc', [])) or [(0, 0.5), (DUR, 0.5)]
xs, ys = [], []
for x, y in arc_pts:
    if not xs or x > xs[-1] + 1e-3: xs.append(x); ys.append(y)
arc = np.interp(t, xs, ys)
drone = (np.sin(2 * np.pi * 36.71 * t) * 0.7 + np.sin(2 * np.pi * 55.0 * t) * 0.35 + np.sin(2 * np.pi * 73.42 * t + 0.4) * 0.22) * (0.75 + 0.25 * np.sin(2 * np.pi * 0.08 * t))
pad = np.zeros(N)
for f, a in [(146.83, 0.5), (174.61, 0.35), (220.0, 0.28)]: pad += saw(f, N, 0.004) * a
pad += saw(155.56, N, 0.005) * 0.28 * np.clip((arc - 0.7) / 0.3, 0, 1)   # the dissonant semitone only when it's tense
pad = lp(lp(pad, 650), 850) * (0.7 + 0.3 * np.sin(2 * np.pi * 0.12 * t + 1))
air = lp(bp(rng.standard_normal(N), 150, 700, 2), 600) * (0.5 + 0.5 * np.sin(2 * np.pi * 0.06 * t)) * 0.3
mus = (drone * 0.55 + pad * 0.3 + air) * arc
fade = np.minimum(1, t / 1.0)
score[:, 0] += mus * fade; score[:, 1] += np.roll(mus, 240) * fade
score = verb(score, STORE_IR, 0.25)
# a sparse soft piano in D minor: before the robbery, and again from "weeks later" to the end (silent through the shots)
A = {c['type']: c['t'] for c in cues}
quiet0 = C['key'][0]['t'] - 1.0 if C.get('key') else DUR * 0.4
quiet1 = [c['t'] for c in C.get('arc', []) if abs(c['v'] - 0.42) < 1e-6]
quiet1 = quiet1[0] if quiet1 else DUR * 0.6
motif = [62, 57, 65, 64, 62, 57, 60, 57]
pn = np.zeros((N, 2)); tn = 0.6; k = 0
while tn < DUR - 2.0:
    if not (quiet0 <= tn <= quiet1):
        place(pn, piano(motif[k % len(motif)] - (12 if k % 4 == 3 else 0), 0.16 + 0.05 * (k % 2)), tn, pan=0.2 * np.sin(k))
        if k % 4 == 0: place(pn, piano(50, 0.09, 4.0), tn, pan=-0.2)
    tn += 1.55; k += 1
score += verb(pn, HALL_IR, 0.35)

# ---------------- sound design ----------------
fx = np.zeros((N, 2))
for c in C.get('vcr', []):
    place(fx, clunk(120, 70, 0.35, 0.3, 1200) * 0.5, c['t'])
    place(fx, tape_hum(c['dur']) * 0.28, c['t'] + 0.05)
for c in C.get('vcrstop', []): place(fx, tape_stop() * 0.5, c['t'])
for c in C.get('night', []): place(fx, verb(ambience(c['dur'], 'night'), STORE_IR, 0.2) * 0.32, c['t'])
for c in C.get('buzz', []): place(fx, ambience(c['dur'], 'store') * 0.3, c['t'])
for c in C.get('chime', []): place(fx, verb(chime(), STORE_IR, 0.35) * 0.42, c['t'], pan=0.25)
for c in C.get('swell', []):
    n = int(c['dur'] * SR); sw = lp(bp(rng.standard_normal(n), 60, 400, 2), 300) * np.sin(np.linspace(0, np.pi, n)) ** 1.5
    place(fx, verb(sw * 0.45, STORE_IR, 0.5), c['t'])
for c in C.get('step', []): place(fx, verb(step(c.get('gain', 1)), ROOM_IR, 0.25) * 0.55, c['t'], pan=-0.1)
for c in C.get('key', []): place(fx, verb(key(), ROOM_IR, 0.2) * 0.5, c['t'], pan=0.1)
for c in C.get('handle', []): place(fx, verb(handle(), ROOM_IR, 0.3) * 0.7, c['t'], pan=0.1)
for c in C.get('bang', []):
    b = verb(bang_muffled(c.get('gain', 1)), STORE_IR, 0.45)
    place(fx, b * 0.62, c['t'])
for c in C.get('thud', []): place(fx, verb(bang_muffled(0.6, 380), ROOM_IR, 0.3) * 0.38, c['t'])
for c in C.get('clang', []): place(fx, verb(clang(), HALL_IR, 0.45) * 0.45, c['t'], pan=-0.15)
for c in C.get('sting', []):
    place(fx, verb(riser(1.3), STORE_IR, 0.4) * 0.3, c['t'] - 1.3)
    place(fx, sub_boom(3.2) * 0.26, c['t'])
    n = int(3.0 * SR); tt_ = tt(n)
    cl = sum(saw(f, n, 0.006) for f in (73.42, 77.78, 116.54, 155.56)) / 4
    cl = lp(cl, 900) * np.minimum(1, tt_ / 0.08) * np.exp(-tt_ * 0.9)
    place(fx, verb(cl * 0.26, STORE_IR, 0.45), c['t'])
# room tone
tone = lp(np.cumsum(rng.standard_normal(N)) * 0.002, 220); tone -= lp(tone, 20)
fx[:, 0] += tone * 0.5; fx[:, 1] += np.roll(tone, 300) * 0.5

# ---------------- narration + duck ----------------
voice, vsr = sf.read(P / 'data/narration.wav', always_2d=True)
assert vsr == SR, vsr
voice = voice[:N]; voice = np.pad(voice, ((0, N - len(voice)), (0, 0)))
venv = lp(np.abs(voice).mean(1), 4, 1)
duck = 1 - 0.45 * np.clip(venv / (np.percentile(venv, 95) + 1e-9), 0, 1)
score *= duck[:, None]

# ---------------- master ----------------
mix = voice * 1.0 + score * db(-13) + fx * db(-6)
mix = hp(mix, 28, 2)
mix = mix - 0.25 * (mix - lp(mix, 6000, 1))     # soft high shelf down (gentle on the ears)
rms = np.sqrt((mix ** 2).mean()); mix *= db(-19.0) / rms
pk = np.abs(mix).max()
if pk > db(-1.0):
    k = db(-1.0); over = np.abs(mix) > 0.7 * k
    mix = np.where(over, np.sign(mix) * (0.7 * k + (np.abs(mix) - 0.7 * k) / (1 + (np.abs(mix) - 0.7 * k) / (0.3 * k))), mix)
mix *= np.clip((DUR - t) / 0.25, 0, 1)[:, None]
sf.write(P / 'data/mix.wav', mix.astype(np.float32), SR, subtype='PCM_24')
(P / 'data/stems').mkdir(exist_ok=True)
sf.write(P / 'data/stems/score.wav', (score * db(-13)).astype(np.float32), SR)
sf.write(P / 'data/stems/fx.wav', (fx * db(-6)).astype(np.float32), SR)
print(f'data/mix.wav {DUR:.2f}s  rms {20 * np.log10(np.sqrt((mix ** 2).mean())):.1f} dBFS  peak {20 * np.log10(np.abs(mix).max()):.1f} dBFS')
