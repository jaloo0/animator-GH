"""THE LOUVRE HEIST — soundtrack, 100 % local and procedural (numpy/scipy), no samples, no AI audio.
Narration (Kokoro, data/narration.wav) + a calm investigative score (D minor drone, soft pad, a felt pulse that
builds through the heist, sparse piano at the open and the close) + sound design keyed to data/cues.json.
Soft by design — no hats, ticks or clicks; everything above ~5 kHz rolled off.

  SKILL/scripts/py tools/mix.py .      → data/mix.wav (+ data/stems/*.wav)
"""
import json, sys
from pathlib import Path
import numpy as np, soundfile as sf
from scipy import signal

P = Path(sys.argv[1] if len(sys.argv) > 1 else '.')
SR = 48000
rng = np.random.default_rng(31)
cues = json.loads((P / 'data/cues.json').read_text())
sen = json.loads((P / 'data/narration.sentences.json').read_text())
DUR = sen['duration'] + 1.9
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
    n = int(rt * 1.3 * SR); t = tt(n); e = np.exp(-6.9 * t / rt)
    l = lp(rng.standard_normal(n), damp) * e; r = lp(rng.standard_normal(n), damp) * e
    ir = np.zeros((n + int(pre * SR), 2)); ir[int(pre * SR):, 0] = l; ir[int(pre * SR):, 1] = l * (1 - width) + r * width
    return ir / np.sqrt((ir ** 2).sum() / 2)
def verb(x, ir, wet=0.3):
    if x.ndim == 1: x = np.stack([x, x], 1)
    y = np.stack([signal.fftconvolve(x[:, k], ir[:, k])[: len(x)] for k in range(2)], 1)
    return x * (1 - wet) + y * wet
HALL = reverb_ir(2.2, 0.025, 2600)   # palace gallery
ROOM = reverb_ir(0.5, 0.008, 2400)
OUT = reverb_ir(0.9, 0.02, 2200, 0.8)
def saw(f, n, detune=0.0):
    t = tt(n); y = np.zeros(n)
    for d in (-detune, 0, detune): ph = (f * (1 + d) * t) % 1.0; y += 2 * ph - 1
    return y / 3
def mf(m): return 440 * 2 ** ((m - 69) / 12)
def piano(midi, v=1.0, dur=3.2):
    f = mf(midi); n = int(dur * SR); t = tt(n)
    x = np.sin(2 * np.pi * f * t) + 0.38 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t * 1.6) + 0.12 * np.sin(2 * np.pi * 3.01 * f * t) * np.exp(-t * 3)
    return lp(x * np.exp(-t * 1.2) * np.minimum(1, t / 0.008), 2000) * v
def mallet(midi, v=1.0, dur=1.2):
    f = mf(midi); n = int(dur * SR); t = tt(n)
    x = np.sin(2 * np.pi * f * t) * np.exp(-t * 5) + 0.25 * np.sin(2 * np.pi * 4.0 * f * t) * np.exp(-t * 14)
    return lp(x * np.minimum(1, t / 0.004), 2400) * v
def pluck(f, v=1.0, dur=0.45):
    n = int(dur * SR); t = tt(n)
    x = saw(f, n, 0.003) * np.exp(-t * 9) + 0.6 * np.sin(2 * np.pi * f / 2 * t) * np.exp(-t * 7)
    return lp(lp(x * np.minimum(1, t / 0.006), 700), 900) * v
def noise(n): return rng.standard_normal(n)

# ---------------- score ----------------
t = tt(N)
A = {k2: [c['t'] for c in v] for k2, v in C.items()}
tSmash = A['smash'][0]; tCount = A['count'][0]; tEsc = A['scooters'][0]; tPaper = A['paper'][0]; tSting = A['sting'][0]; tEnd = A['end'][0]
arc = np.interp(t, [0, 7, 12, 18, tSmash, tCount + 2, tEsc, tEsc + 3.5, tPaper, tSting - 0.2, tSting + 1.0, tEnd, DUR],
                   [0.45, 0.5, 0.58, 0.7, 0.86, 0.95, 0.9, 0.62, 0.5, 0.66, 0.42, 0.42, 0.3])
drone = (np.sin(2 * np.pi * mf(38) * t) * 0.7 + np.sin(2 * np.pi * mf(45) * t) * 0.3 + np.sin(2 * np.pi * mf(50) * t + 0.4) * 0.16) * (0.8 + 0.2 * np.sin(2 * np.pi * 0.07 * t))
# pad: Dm – Bb – F – C, 4 beats @ 92 bpm × 2 per chord
BEAT = 60 / 92; BAR = 4 * BEAT
CH = [[50, 53, 57, 62], [46, 50, 53, 58], [45, 48, 53, 57], [48, 52, 55, 60]]
pad = np.zeros(N)
for ci in range(int(DUR / (2 * BAR)) + 1):
    t0 = ci * 2 * BAR; n = int(2 * BAR * SR) + int(0.6 * SR); seg = np.zeros(n)
    for m in CH[ci % 4]: seg += saw(mf(m), n, 0.004)
    seg *= env(n, 0.6, 0.6); i = int(t0 * SR); seg = seg[: max(0, N - i)]; pad[i:i + len(seg)] += seg
pad = lp(lp(pad, 600), 800) * 0.22
air = lp(bp(noise(N), 150, 700, 2), 600) * (0.5 + 0.5 * np.sin(2 * np.pi * 0.05 * t)) * 0.25
mus = np.stack([(drone * 0.5 + pad + air) * arc, (np.roll(drone, 200) * 0.5 + np.roll(pad, 300) + np.roll(air, 500)) * arc], 1)
# the felt pulse: eighth notes on the chord root, from the truck to the escape, and under the password
pulse = np.zeros((N, 2)); on = lambda x: (12.0 <= x < tEsc + 2.0) or (tPaper + 2.0 <= x < tSting)
k = 0; x0 = 12.0 - (12.0 % (BEAT / 2))
while x0 < DUR - 1:
    if on(x0):
        ci = int(x0 / (2 * BAR)) % 4; root = CH[ci][0] - 12 + (12 if k % 8 in (3, 7) else 0)
        g = (0.55 if k % 2 == 0 else 0.32) * np.interp(x0, t[::480], arc[::480])
        place(pulse, pluck(mf(root), g), x0, pan=0.15 * np.sin(k * 0.7))
    x0 += BEAT / 2; k += 1
# heartbeat-like low thumps from the smash to the escape (felt, not heard as ticks)
for x1 in np.arange(tSmash + 0.5, tEsc, BEAT * 2):
    n = int(0.4 * SR); tb = tt(n); th = np.sin(2 * np.pi * np.cumsum(np.linspace(70, 42, n)) / SR) * np.exp(-tb * 12)
    place(pulse, lp(th, 140) * 0.7, x1); place(pulse, lp(th, 140) * 0.45, x1 + 0.22)
score = verb(mus * np.minimum(1, t / 1.2)[:, None], HALL, 0.25) + verb(pulse, ROOM, 0.2)
# sparse piano: the open (before the truck) and the close (from the arrests)
pn = np.zeros((N, 2)); motif = [62, 57, 65, 64, 62, 57, 60, 57]
for j, x2 in enumerate(np.arange(0.4, 11.0, BEAT * 2)): place(pn, piano(motif[j % 8], 0.15 + 0.04 * (j % 2)), x2, pan=0.2 * np.sin(j))
for j, x2 in enumerate(np.arange(A['end'][0] - 3.2, DUR - 2.5, BEAT * 2)): place(pn, piano(motif[(j + 4) % 8], 0.17), x2, pan=0.2 * np.sin(j))
place(pn, piano(50, 0.16, 5.0), tEnd); place(pn, piano(38, 0.14, 5.0), tEnd)
score += verb(pn, HALL, 0.4)

# ---------------- sound design ----------------
fx = np.zeros((N, 2))
def span(c, default=1.0): return max(0.2, c.get('end', c['t'] + default) - c['t'])
for c in C.get('city', []):   # distant city air + traffic swells
    n = int(span(c) * SR); x = lp(noise(n), 300) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.11 * tt(n)) ** 2) * 1.4 + lp(bp(noise(n), 400, 1800, 2), 1500) * 0.1
    place(fx, verb(x * env(n, 0.5, 0.6), OUT, 0.3) * 0.32, c['t'])
for c in C.get('street', []):
    n = int(span(c) * SR); x = lp(noise(n), 260) * 1.2 + lp(bp(noise(n), 500, 2200, 2), 2000) * 0.08 * (0.5 + 0.5 * np.sin(2 * np.pi * 0.3 * tt(n)))
    place(fx, x * env(n, 0.15, 0.2) * 0.3, c['t'])
for c in C.get('whoosh', []):
    n = int(0.9 * SR); tw = tt(n); sh = np.sin(np.pi * np.clip(tw / 0.9, 0, 1)) ** 2
    place(fx, verb(lp(bp(noise(n), 200, 2500, 2), 2200) * sh * 0.55, OUT, 0.3) * c.get('gain', 1), c['t'], pan=-0.2)
for c in C.get('fill', []):
    n = int(1.6 * SR); tb = tt(n); x = sum(np.sin(2 * np.pi * mf(m) * tb) for m in (50, 57, 62)) / 3 * np.exp(-tb * 2.2) * np.minimum(1, tb / 0.02)
    place(fx, verb(lp(x, 900) * 0.35, HALL, 0.4), c['t'])
for c in C.get('pin', []): place(fx, verb(mallet(69, 0.35), HALL, 0.35), c['t'], pan=0.15)
for c in C.get('pop', []):
    notes = [62, 65, 69, 72, 74, 69, 65, 77]; j = C['pop'].index(c)
    place(fx, verb(mallet(notes[j % 8], 0.3 * c.get('gain', 1)), ROOM, 0.3), c['t'], pan=-0.4 + 0.8 * (j % 4) / 3)
for c in C.get('truck', []):   # small diesel rolling in, then brakes
    n = int(span(c) * SR); tn = tt(n); f = 52 + 6 * np.sin(2 * np.pi * 0.7 * tn)
    x = lp(saw(1, n) * 0 + np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * 0.4 + noise(n) * 0.3, 220) * env(n, 0.4, 0.5)
    place(fx, x * 0.5, c['t'], pan=-0.3)
    m = int(0.5 * SR); place(fx, lp(bp(noise(m), 900, 2600, 2), 2400) * env(m, 0.02, 0.4) * 0.08, c['end'] - 0.3, pan=0.1)
for c in C.get('lift', []):    # hydraulic hum + gentle motor whine
    n = int(span(c) * SR); tn = tt(n)
    x = lp(saw(68, n, 0.01), 260) * 0.6 + np.sin(2 * np.pi * (330 + 25 * np.clip(tn / 2, 0, 1)) * tn) * 0.05 + lp(noise(n), 400) * 0.25
    place(fx, verb(x * env(n, 0.3, 0.4), OUT, 0.2) * 0.42, c['t'])
for c in C.get('grinder', []):  # angle grinder biting glass: harmonic whine + grit, low-passed so it never screams
    n = int(span(c) * SR); tn = tt(n); f = 185 + 10 * np.sin(2 * np.pi * 3.1 * tn) + 6 * noise(n).cumsum() / np.sqrt(n)
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = sum(np.sin(h * ph) / h ** 1.2 for h in range(1, 9)) * 0.5 + bp(noise(n), 1200, 4200, 2) * 0.35 * (0.6 + 0.4 * np.sin(2 * np.pi * 7 * tn) ** 2)
    x = lp(x, 3800) * env(n, 0.12, 0.25) * (0.75 + 0.25 * np.sin(2 * np.pi * 0.9 * tn))
    place(fx, verb(x, OUT, 0.15) * 0.3, c['t'], pan=0.25)
for c in C.get('room', []):
    n = int(span(c) * SR); x = lp(noise(n), 200) * 0.9 + 0.03 * np.sin(2 * np.pi * 100 * tt(n))
    place(fx, verb(x * env(n, 0.2, 0.2), HALL, 0.5) * 0.25, c['t'])
for c in C.get('smash', []):   # case glass: a thump, a soft burst, a few inharmonic shards that ring out
    n = int(2.2 * SR); tn = tt(n)
    x = np.sin(2 * np.pi * np.cumsum(np.linspace(110, 50, n)) / SR) * np.exp(-tn * 14) * 0.8
    x += lp(bp(noise(n), 900, 6000, 2), 5200) * np.exp(-tn * 9) * 0.7
    for j in range(14):
        f = 1800 + rng.random() * 2600; d = 0.03 + rng.random() * 0.5; m = int(0.5 * SR); tm = tt(m)
        sh = np.sin(2 * np.pi * f * tm) * np.exp(-tm * (25 + rng.random() * 30)) * 0.12
        i = int(d * SR); x[i:i + m] += sh[: max(0, n - i)]
    place(fx, verb(lp(x * np.minimum(1, tn / 0.002), 5200), HALL, 0.35) * 0.55, c['t'])
for c in C.get('count', []):
    n = int(span(c) * SR); tn = tt(n); d = n / SR
    x = bp(noise(n), 150, 1200, 2) * (tn / d) ** 2.2 * 0.5 + sum(np.sin(2 * np.pi * mf(m) * tn) for m in (50, 57, 62)) / 3 * (tn / d) ** 2 * 0.5
    place(fx, verb(lp(x, 1500), HALL, 0.4) * 0.4, c['t'])
    m = int(2.5 * SR); tm = tt(m); hit = sum(np.sin(2 * np.pi * mf(q) * tm) for q in (38, 50, 57)) / 3 * np.exp(-tm * 1.6) * np.minimum(1, tm / 0.01)
    place(fx, verb(lp(hit, 700) * 0.6, HALL, 0.4), c['end'])
for c in C.get('clock', []):  # the timer: a slow low swell under the thumps
    n = int(span(c) * SR); x = lp(saw(mf(38), n, 0.01), 300) * env(n, 0.3, 0.3) * np.linspace(0.3, 1, n)
    place(fx, x * 0.25, c['t'])
for c in C.get('scooters', []):   # two scooters pulling away, left to right, fading
    n = int(span(c) * SR); tn = tt(n); d = n / SR
    for j, (f0, off) in enumerate([(96, 0.0), (108, 0.25)]):
        f = f0 * (1 + 0.35 * np.clip((tn - off) / 1.4, 0, 1)) + 3 * np.sin(2 * np.pi * 11 * tn)
        x = lp(saw(1, n) * 0 + np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * 0.5 + bp(noise(n), 200, 900, 2) * 0.3, 1100)
        g = np.clip((tn - off) / 0.25, 0, 1) * np.clip((d - tn) / (d * 0.7), 0, 1) ** 1.5
        L = np.stack([x * g * np.cos((np.clip(tn / d, 0, 1) * 1.6 - 0.8 + 1) * np.pi / 4), x * g * np.sin((np.clip(tn / d, 0, 1) * 1.6 - 0.8 + 1) * np.pi / 4)], 1)
        place(fx, verb(L, OUT, 0.2) * 0.28, c['t'])
for c in C.get('clink', []):
    n = int(1.8 * SR); tn = tt(n)
    x = sum(a * np.sin(2 * np.pi * f * tn) * np.exp(-tn * dd) for f, a, dd in [(880, 1, 4), (1397, 0.6, 6), (2093, 0.3, 9), (2960, 0.15, 12)])
    place(fx, verb(lp(x * np.minimum(1, tn / 0.002), 4200) * 0.16, OUT, 0.35), c['t'], pan=0.2)
for c in C.get('paper', []):
    n = int(0.7 * SR); tn = tt(n); x = lp(bp(noise(n), 700, 4500, 2), 4200) * np.sin(np.pi * np.clip(tn / 0.7, 0, 1)) ** 2
    place(fx, verb(x * 0.35, ROOM, 0.2), c['t'])
for c in C.get('hum', []):
    n = int(span(c) * SR); tn = tt(n); x = 0.05 * np.sin(2 * np.pi * 120 * tn) + 0.025 * np.sin(2 * np.pi * 240 * tn) + lp(noise(n), 350) * 0.5
    place(fx, verb(x * env(n, 0.2, 0.2), ROOM, 0.3) * 0.32, c['t'])
for c in C.get('key', []):
    n = int(0.12 * SR); tn = tt(n); x = np.sin(2 * np.pi * 210 * tn) * np.exp(-tn * 70) + 0.4 * lp(noise(n), 650) * np.exp(-tn * 90)
    place(fx, verb(lp(x * np.minimum(1, tn / 0.003), 800), ROOM, 0.2) * 0.42, c['t'], pan=0.1)
for c in C.get('sting', []):
    n = int(3.0 * SR); tn = tt(n)
    boom = lp(np.sin(2 * np.pi * np.cumsum(np.linspace(64, 31, n)) / SR) * np.exp(-tn * 1.2) * np.minimum(1, tn / 0.01), 160)
    cl = lp(sum(saw(mf(m), n, 0.006) for m in (50, 53, 57, 61)) / 4, 900) * np.minimum(1, tn / 0.06) * np.exp(-tn * 0.9)
    place(fx, verb(boom * 0.3 + cl * 0.22, HALL, 0.45), c['t'])
for c in C.get('end', []):
    n = int(4.0 * SR); tn = tt(n); x = lp(np.sin(2 * np.pi * np.cumsum(np.linspace(55, 36, n)) / SR) * np.exp(-tn * 0.9) * np.minimum(1, tn / 0.02), 140)
    place(fx, verb(x * 0.3, HALL, 0.4), c['t'])

# ---------------- narration + duck ----------------
voice, vsr = sf.read(P / 'data/narration.wav', always_2d=True)
assert vsr == SR, vsr
voice = voice[:N]; voice = np.pad(voice, ((0, N - len(voice)), (0, 0)))
venv = lp(np.abs(voice).mean(1), 4, 1)
duck = 1 - 0.42 * np.clip(venv / (np.percentile(venv, 95) + 1e-9), 0, 1)
score *= duck[:, None]; fx *= (1 - 0.25 * (1 - duck) / 0.42)[:, None]

# ---------------- master ----------------
mix = voice * 1.0 + score * db(-12.5) + fx * db(-10)
mix = hp(mix, 28, 2)
mix = mix - 0.25 * (mix - lp(mix, 6000, 1))
rms = np.sqrt((mix ** 2).mean()); mix *= db(-19.0) / rms
pk = np.abs(mix).max()
if pk > db(-1.0):
    kk = db(-1.0); over = np.abs(mix) > 0.7 * kk
    mix = np.where(over, np.sign(mix) * (0.7 * kk + (np.abs(mix) - 0.7 * kk) / (1 + (np.abs(mix) - 0.7 * kk) / (0.3 * kk))), mix)
mix *= np.clip((DUR - t) / 0.4, 0, 1)[:, None]
sf.write(P / 'data/mix.wav', mix.astype(np.float32), SR, subtype='PCM_24')
(P / 'data/stems').mkdir(exist_ok=True)
sf.write(P / 'data/stems/score.wav', (score * db(-12.5)).astype(np.float32), SR)
sf.write(P / "data/stems/fx.wav", (fx * db(-10)).astype(np.float32), SR)
print(f'data/mix.wav {DUR:.2f}s  rms {20 * np.log10(np.sqrt((mix ** 2).mean())):.1f} dBFS  peak {20 * np.log10(np.abs(mix).max()):.1f} dBFS')
