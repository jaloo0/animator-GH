"""WHAT IF ZOMBIES HIT YOUR APARTMENT? — soundtrack, 100 % local and procedural (numpy/scipy). No samples, no AI audio.
The stickman-style sound rules: a quiet, mellow music bed from the very first frame, well under the voice; a blip for every
graphic, a whoosh on every card / scene change, footsteps on every walk, plus the story's own sounds (pounding through a
wall, a muffled scream, groans, running water, the power going, a phone buzz). Soft by design: no ticks, no hats, no
glitches, everything above ~5 kHz rolled off. The neighbour's line gets a small phone-speaker filter.

  SKILL/scripts/py tools/mix.py <project> [duration]      → data/mix.wav (+ data/stems/*.wav)
"""
import json, sys
from pathlib import Path
import numpy as np, soundfile as sf
from scipy import signal

P = Path(sys.argv[1] if len(sys.argv) > 1 else '.')
SR = 48000
rng = np.random.default_rng(7)
cues = json.loads((P / 'data/cues.json').read_text())
lines = json.loads((P / 'data/lines.json').read_text())
DUR = float(sys.argv[2]) if len(sys.argv) > 2 else max(lines['duration'], max(c['t'] for c in cues) + 3.5)
N = int(DUR * SR)
C = {}
for c in cues: C.setdefault(c['type'], []).append(c)

def lp(x, f, o=2): b, a = signal.butter(o, f / (SR / 2), 'low'); return signal.lfilter(b, a, x, axis=0)
def hp(x, f, o=2): b, a = signal.butter(o, f / (SR / 2), 'high'); return signal.lfilter(b, a, x, axis=0)
def bp(x, f0, f1, o=2): b, a = signal.butter(o, [f0 / (SR / 2), f1 / (SR / 2)], 'band'); return signal.lfilter(b, a, x, axis=0)
def db(x): return 10 ** (x / 20)
def tt(n): return np.arange(n) / SR
def noise(n): return rng.standard_normal(n)
def place(buf, x, t, g=1.0, pan=0.0):
    if x.ndim == 1: x = np.stack([x * np.cos((pan + 1) * np.pi / 4) * 1.414, x * np.sin((pan + 1) * np.pi / 4) * 1.414], 1)
    i = int(round(t * SR))
    if i >= len(buf): return
    if i < 0: x = x[-i:]; i = 0
    x = x[: len(buf) - i]; buf[i:i + len(x)] += x * g
def env(n, a=0.005, r=0.1):
    t = tt(n); d = n / SR
    return np.minimum(1, t / max(a, 1e-4)) * np.clip((d - t) / max(r, 1e-4), 0, 1)
def reverb_ir(rt=0.7, pre=0.012, damp=3500):
    n = int(rt * 1.3 * SR); t = tt(n); e = np.exp(-6.9 * t / rt)
    ir = np.zeros((n + int(pre * SR), 2)); ir[int(pre * SR):, 0] = lp(noise(n), damp) * e; ir[int(pre * SR):, 1] = lp(noise(n), damp) * e
    return ir / np.sqrt((ir ** 2).sum() / 2)
def verb(x, ir, wet=0.3):
    if x.ndim == 1: x = np.stack([x, x], 1)
    y = np.stack([signal.fftconvolve(x[:, k], ir[:, k])[: len(x)] for k in range(2)], 1)
    return x * (1 - wet) + y * wet
ROOM = reverb_ir(0.45, 0.006, 2600); HALL = reverb_ir(1.3, 0.02, 2400); BIG = reverb_ir(2.4, 0.03, 2000)

# ---------------- sound kit ----------------
def thump(f0=90, f1=45, dur=0.35, nz=0.4, cut=700):
    n = int(dur * SR); t = tt(n)
    x = np.sin(2 * np.pi * np.cumsum(np.linspace(f0, f1, n)) / SR) * np.exp(-t * 16) + nz * lp(noise(n), cut) * np.exp(-t * 45)
    return lp(x * np.minimum(1, t / 0.003), cut)
def blip(f=740, g=1.0):
    n = int(0.22 * SR); t = tt(n)
    x = (np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * f * 2 * t) * np.exp(-t * 30)) * np.exp(-t * 22) * np.minimum(1, t / 0.006)
    return lp(x, 2600) * g
def whoosh(dur=0.55, lo=200, hi=1600):
    n = int(dur * SR); t = tt(n); e = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 2
    return lp(bp(noise(n), lo, hi, 2), 2200) * e
def land():
    n = int(0.9 * SR); t = tt(n)
    x = sum(a * np.sin(2 * np.pi * f * t) for f, a in [(196, 0.6), (293.7, 0.35), (392, 0.2)]) * np.exp(-t * 4) * np.minimum(1, t / 0.008)
    return lp(x + thump(70, 45, 0.9, 0.2, 400) * 0.6, 1800)
def scream():
    """a scream two walls away: a voiced glide through vowel formants, then the wall takes the top off"""
    n = int(1.6 * SR); t = tt(n)
    f = 520 + 300 * np.sin(np.pi * np.clip(t / 1.2, 0, 1)) ** 0.6 + 14 * np.sin(2 * np.pi * 6 * t)
    ph = np.cumsum(f) / SR; src = sum(np.sin(2 * np.pi * k * ph) / k for k in range(1, 9))
    v = bp(src, 650, 1100, 2) * 0.9 + bp(src, 1100, 1700, 2) * 0.5 + bp(noise(n), 900, 2000, 2) * 0.15
    v *= np.minimum(1, t / 0.06) * np.clip((1.6 - t) / 0.5, 0, 1)
    return lp(v, 1300)
def groan(dur=1.4):
    n = int(dur * SR); t = tt(n); f = 92 + 10 * np.sin(2 * np.pi * 1.3 * t) - 18 * t / dur
    ph = np.cumsum(f) / SR; src = sum(np.sin(2 * np.pi * k * ph) * (1 / k) for k in range(1, 12))
    v = bp(src, 200, 650, 2) + 0.5 * bp(src, 650, 1100, 2) + 0.25 * lp(noise(n), 600) * (0.5 + 0.5 * np.sin(2 * np.pi * 7 * t))
    return lp(v * np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 0.7, 1400)
def water(dur):
    n = int(dur * SR); t = tt(n)
    x = bp(noise(n), 500, 3200, 2) * (0.8 + 0.2 * np.sin(2 * np.pi * 9 * t + np.sin(2 * np.pi * 1.7 * t))) + 0.4 * lp(noise(n), 400)
    return lp(x * env(n, 0.08, 0.3), 3800)
def bubbles(dur, rate=14, lo=300, hi=900):
    n = int(dur * SR); out = np.zeros(n)
    for _ in range(int(dur * rate)):
        i = rng.integers(0, max(1, n - 4000)); m = int(0.05 * SR); tm = tt(m); f0 = rng.uniform(lo, hi)
        out[i:i + m] += np.sin(2 * np.pi * np.cumsum(f0 * (1 + 1.5 * tm / 0.05)) / SR) * np.exp(-tm * 70) * rng.uniform(0.3, 1)
    return lp(out, 2400)
def hum(dur, f=60):
    n = int(dur * SR); t = tt(n)
    return lp(0.5 * np.sin(2 * np.pi * f * t) + 0.25 * np.sin(2 * np.pi * 2 * f * t) + 0.1 * np.sin(2 * np.pi * 3 * f * t) + 0.3 * lp(noise(n), 300), 500) * env(n, 0.2, 0.3)
def powerdown(dur=1.2):
    n = int(dur * SR); t = tt(n); f = 120 * np.exp(-t * 2.2)
    return lp(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 1.6) + thump(80, 40, dur, 0.3, 500) * 0.6, 700)
def click(f=1100):
    n = int(0.12 * SR); t = tt(n)
    x = np.sin(2 * np.pi * f * t) * np.exp(-t * 90) + 0.6 * lp(noise(n), 1600) * np.exp(-t * 120)
    return lp(x * np.minimum(1, t / 0.002), 2400) * 0.7 + thump(160, 90, 0.12, 0.2, 900) * 0.5
def scrape(dur):
    n = int(dur * SR); t = tt(n)
    x = bp(noise(n), 180, 900, 2) * (0.6 + 0.4 * np.abs(np.sin(2 * np.pi * 11 * t + 3 * np.sin(2 * np.pi * 2 * t))))
    return lp(x * env(n, 0.05, 0.12), 1200)
def cloth(dur):
    n = int(dur * SR); t = tt(n); return lp(bp(noise(n), 300, 2500, 2), 2600) * np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 1.5
def step(g=1.0):
    n = int(0.16 * SR); t = tt(n)
    x = np.sin(2 * np.pi * 75 * t) * np.exp(-t * 38) + 0.5 * lp(noise(n), 450) * np.exp(-t * 55)
    return lp(x * np.minimum(1, t / 0.004), 520) * g
def can():
    n = int(0.5 * SR); t = tt(n)
    x = sum(a * np.sin(2 * np.pi * f * t) * np.exp(-t * d) for f, a, d in [(310, 1, 18), (690, 0.5, 26), (1170, 0.25, 34)])
    return lp(x * np.minimum(1, t / 0.002) + thump(140, 90, 0.5, 0.2, 900) * 0.5, 2200) * 0.6
def buzz():
    n = int(0.9 * SR); t = tt(n); g = ((t % 0.42) < 0.28).astype(float)
    return lp((np.sin(2 * np.pi * 150 * t) + 0.4 * np.sin(2 * np.pi * 300 * t)) * g * env(n, 0.01, 0.05), 900)
def heart():
    out = np.zeros(int(0.7 * SR)); a = thump(60, 38, 0.3, 0.1, 200); out[:len(a)] += a; b = thump(55, 35, 0.3, 0.1, 200) * 0.7; i = int(0.18 * SR); out[i:i + len(b)] += b[:len(out) - i]
    return out
def rattle(dur=0.5):
    n = int(dur * SR); out = np.zeros(n)
    for k in range(7):
        i = int(k * 0.06 * SR); m = int(0.07 * SR); tm = tt(m)
        out[i:i + m] += (np.sin(2 * np.pi * 420 * tm) + 0.5 * np.sin(2 * np.pi * 980 * tm)) * np.exp(-tm * 60) * (1 - k / 8)
    return lp(out, 2400) * 0.6
def swell(dur):
    n = int(dur * SR); t = tt(n)
    x = sum(np.sin(2 * np.pi * f * t + rng.random()) for f in (98, 146.8, 196, 233.1)) / 4
    return lp(x, 900) * np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 2
def ambience(dur):
    n = int(dur * SR); t = tt(n)
    return (lp(noise(n), 250) * 1.4 * (0.6 + 0.4 * np.sin(2 * np.pi * 0.11 * t) ** 2) + lp(bp(noise(n), 300, 1200, 2), 1000) * 0.1) * env(n, 0.3, 0.3)

# ---------------- music bed: mellow, minor, from frame one ----------------
t = tt(N)
def epiano(midi, v=1.0, dur=3.2):
    f = 440 * 2 ** ((midi - 69) / 12); n = int(dur * SR); tm = tt(n)
    x = np.sin(2 * np.pi * f * tm + 0.6 * np.sin(2 * np.pi * f * tm) * np.exp(-tm * 3)) + 0.25 * np.sin(2 * np.pi * 2 * f * tm) * np.exp(-tm * 2)
    return lp(x * np.exp(-tm * 1.1) * np.minimum(1, tm / 0.01), 2200) * v
def pad_chord(notes, dur, g=1.0):
    n = int(dur * SR); tm = tt(n); y = np.zeros(n)
    for m in notes:
        f = 440 * 2 ** ((m - 69) / 12)
        for d in (-0.003, 0.003): ph = (f * (1 + d) * tm) % 1.0; y += (2 * ph - 1)
    return lp(lp(y / (2 * len(notes)), 700), 900) * np.minimum(1, tm / 0.8) * np.clip((dur - tm) / 0.8, 0, 1) * g
# A minor · F · C · G(sus) → i–VI–III–VII, 4 s per chord (slow, calm, a bit uneasy)
prog = [[45, 57, 60, 64], [41, 57, 60, 65], [48, 55, 60, 64], [43, 55, 62, 67]]
music = np.zeros((N, 2))
bar = 4.0; k = 0; tb = 0.0
motif = [76, 72, 69, 71, 72, 69, 67, 64]
while tb < DUR:
    ch = prog[k % 4]
    place(music, pad_chord(ch, bar + 1.0, 0.55), tb, pan=0)
    place(music, epiano(ch[0] + 12, 0.32, 3.5), tb, pan=-0.15)
    for j in range(2): place(music, epiano(motif[(2 * k + j) % len(motif)], 0.2, 3.0), tb + 0.9 + j * 1.6, pan=0.25 * (1 if j else -1))
    tb += bar; k += 1
music = verb(music, BIG, 0.38)
# arc: present from frame 1, dips under the beat card, swells into the cards, quiet in the final beat, blooms on the end card
arc = np.full(N, 0.85)
def ramp(a, b, v0, v1):
    i0, i1 = int(a * SR), int(b * SR); i0 = max(0, i0); i1 = min(N, i1)
    if i1 > i0: arc[i0:i1] = np.linspace(v0, v1, i1 - i0)
for c in C.get('heart', []): ramp(c['t'] - 0.4, c['t'], 0.85, 0.35); ramp(c['t'], c['t'] + 2.6, 0.35, 0.35)
for c in C.get('whoosh', [])[-1:]: ramp(c['t'], c['t'] + 0.8, 0.35, 1.1); arc[int((c['t'] + 0.8) * SR):] = 1.1
music *= arc[:, None] * np.minimum(1, t / 0.15)[:, None]

# ---------------- sound design ----------------
fx = np.zeros((N, 2))
for c in C.get('cut', []): place(fx, whoosh(0.32, 300, 1400) * 0.10, c['t'] - 0.12)
for c in C.get('whoosh', []): place(fx, verb(whoosh(0.6), ROOM, 0.3) * 0.32 * c['gain'], c['t'] - 0.3)
for i, c in enumerate(C.get('blip', [])): place(fx, verb(blip([740, 880, 659, 784][i % 4], c['gain']), ROOM, 0.25) * 0.42, c['t'])
for c in C.get('land', []): place(fx, verb(land(), ROOM, 0.3) * 0.4, c['t'])
for c in C.get('pound', []):
    for j in range(int(c.get('n', 4))):
        th = thump(85, 48, 0.4, 0.5, 520); place(fx, verb(th, HALL, 0.35) * 0.42 * c['gain'] * (1 - 0.06 * (j % 2)), c['t'] + j * c.get('every', 0.6) + rng.uniform(-0.03, 0.03))
for c in C.get('scream', []): place(fx, verb(scream(), HALL, 0.6) * 0.13, c['t'], pan=-0.3)
for c in C.get('groan', []): place(fx, verb(groan(1.5), HALL, 0.4) * 0.2 * c['gain'], c['t'], pan=0.2)
for c in C.get('knock', []): place(fx, verb(thump(110, 60, 0.35, 0.5, 700), HALL, 0.4) * 0.42, c['t'])
for c in C.get('click', []): place(fx, verb(click(), ROOM, 0.2) * 0.6, c['t'])
for c in C.get('scrape', []): place(fx, verb(scrape(c['dur']), ROOM, 0.2) * 0.45, c['t'])
for c in C.get('thud', []): place(fx, verb(thump(70, 40, 0.5, 0.5, 500), ROOM, 0.3) * 0.5, c['t'])
for c in C.get('step', []): place(fx, verb(step(c['gain']), ROOM, 0.2) * 0.5, c['t'])
for c in C.get('squeak', []): place(fx, verb(click(620), ROOM, 0.2) * 0.4, c['t'])
for c in C.get('water', []): place(fx, verb(water(c['dur']), ROOM, 0.3) * 0.16 * c['gain'], c['t'])
for c in C.get('powerdown', []): place(fx, verb(powerdown(), ROOM, 0.3) * 0.28 * c['gain'], c['t'])
for c in C.get('pumpstop', []): place(fx, verb(powerdown(0.9) * 0.6 + np.pad(hum(0.4, 50), (0, int(0.5 * SR))) * 0.3, ROOM, 0.3) * 0.22, c['t'])
for c in C.get('drain', []): place(fx, verb(bubbles(1.2, 10, 120, 400), ROOM, 0.3) * 0.25, c['t'])
for c in C.get('boil', []): place(fx, verb(bubbles(c['dur'] + 0.3, 22, 250, 700), ROOM, 0.2) * 0.35, c['t'])
for c in C.get('drops', []):
    m = 12
    for j in range(m): place(fx, verb(blip(990 - j * 18, 0.6), ROOM, 0.3) * 0.16, c['t'] + c['dur'] * j / m)
for c in C.get('switch', []): place(fx, verb(click(900), ROOM, 0.25) * 0.65, c['t'])
for c in C.get('cloth', []): place(fx, verb(cloth(c['dur']), ROOM, 0.2) * 0.32 * c['gain'], c['t'])
for c in C.get('night', []): place(fx, verb(ambience(c['dur']), BIG, 0.3) * 0.35, c['t'])
for c in C.get('plug', []): place(fx, verb(click(500), ROOM, 0.2) * 0.6, c['t']); place(fx, blip(523, 0.3) * 0.6, c['t'] + 0.02)
for c in C.get('blackout', []):
    for j in range(5): place(fx, verb(thump(70 - j * 4, 38, 0.6, 0.3, 380), BIG, 0.45) * 0.26 * (1 - j * 0.1), c['t'] + j * c['dur'] / 5)
    place(fx, powerdown(1.6) * 0.2, c['t'])
for c in C.get('fridge', []): place(fx, verb(thump(120, 80, 0.2, 0.6, 1200), ROOM, 0.25) * 0.33, c['t']); place(fx, hum(1.4, 55) * 0.14, c['t'] + 0.05)
for c in C.get('can', []): place(fx, verb(can(), ROOM, 0.2) * 0.45, c['t'], pan=rng.uniform(-0.3, 0.3))
for c in C.get('hum', []): place(fx, verb(hum(c['dur'], 120) * 0.35 + ambience(c['dur']) * 0.5, HALL, 0.3) * 0.22, c['t'])
for c in C.get('buzz', []): place(fx, verb(buzz(), ROOM, 0.2) * 0.16, c['t'])
for c in C.get('type', []): place(fx, blip(1046, 0.25), c['t'])
for c in C.get('shuffle', []): place(fx, verb(scrape(0.7), HALL, 0.45) * 0.18, c['t']); place(fx, step(0.6) * 0.3, c['t'] + 0.2)
for c in C.get('heart', []):
    for j in range(int(c.get('n', 2))): place(fx, heart() * 0.55, c['t'] + j * 0.82)
for c in C.get('knob', []): place(fx, verb(rattle(0.5), ROOM, 0.3) * 0.6, c['t'])
for c in C.get('swell', []): place(fx, verb(swell(c['dur']), BIG, 0.5) * 0.25, c['t'])
tone = lp(np.cumsum(noise(N)) * 0.002, 220); tone -= lp(tone, 20)
fx[:, 0] += tone * 0.4; fx[:, 1] += np.roll(tone, 300) * 0.4

# ---------------- voice (+ phone filter on the neighbour) ----------------
voice, vsr = sf.read(P / 'data/narration.wav', always_2d=True)
assert vsr == SR, vsr
voice = voice[:N]; voice = np.pad(voice, ((0, N - len(voice)), (0, 0)))
for L in lines['lines']:
    if L['who'] not in ('narrator', 'beat'):
        i0, i1 = int((L['start'] - 0.05) * SR), int((L['end'] + 0.15) * SR)
        seg = voice[i0:i1]; ph = bp(seg, 320, 3400, 3) * 2.6
        voice[i0:i1] = verb(ph, ROOM, 0.18)
venv = lp(np.abs(voice).mean(1), 4, 1)
duck = 1 - 0.5 * np.clip(venv / (np.percentile(venv, 95) + 1e-9), 0, 1)

fduck = 1 - 0.35 * np.clip(venv / (np.percentile(venv, 95) + 1e-9), 0, 1)
mix = voice * 1.0 + music * duck[:, None] * db(-17) + fx * fduck[:, None] * db(-5)
mix = hp(mix, 30, 2)
mix = mix - 0.25 * (mix - lp(mix, 6000, 1))
rms = np.sqrt((mix ** 2).mean()); mix *= db(-18.5) / rms
k = db(-1.0); over = np.abs(mix) > 0.7 * k
mix = np.where(over, np.sign(mix) * (0.7 * k + (np.abs(mix) - 0.7 * k) / (1 + (np.abs(mix) - 0.7 * k) / (0.3 * k))), mix)
mix *= np.clip((DUR - t) / 0.6, 0, 1)[:, None]
sf.write(P / 'data/mix.wav', mix.astype(np.float32), SR, subtype='PCM_24')
(P / 'data/stems').mkdir(exist_ok=True)
sf.write(P / 'data/stems/music.wav', (music * db(-17)).astype(np.float32), SR)
sf.write(P / 'data/stems/fx.wav', (fx * db(-5)).astype(np.float32), SR)
print(f'data/mix.wav {DUR:.2f}s  rms {20 * np.log10(np.sqrt((mix ** 2).mean())):.1f} dBFS  peak {20 * np.log10(np.abs(mix).max()):.1f} dBFS')
