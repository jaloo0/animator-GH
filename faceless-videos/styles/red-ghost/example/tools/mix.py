"""The 2 A.M. Call — soundtrack, 100 % local and procedural (numpy/scipy), no samples, no AI audio.
Narration (Kokoro, data/narration.wav) + a dark drone score with a detuned music-box motif + sound design
keyed to data/cues.json (exported from the shot list): bell-phone ring, handset clunks, line hiss, breathing,
three heavy door knocks, a muffled closet knock, a door creak, a low sting. Soft by design — no ticks/clicks,
everything above ~5 kHz rolled off.

  SKILL/scripts/py tools/mix.py <project>      → data/mix.wav (+ data/stems/*.wav)
"""
import json, sys
from pathlib import Path
import numpy as np, soundfile as sf
from scipy import signal

P = Path(sys.argv[1] if len(sys.argv) > 1 else '.')
SR = 48000
rng = np.random.default_rng(11)
cues = json.loads((P / 'data/cues.json').read_text())
sen = json.loads((P / 'data/narration.sentences.json').read_text())
TAIL = 0.9
DUR = sen['duration'] + TAIL
N = int(DUR * SR)
C = {}
for c in cues: C.setdefault(c['type'], []).append(c)

def lp(x, f, o=2): b, a = signal.butter(o, f / (SR / 2), 'low'); return signal.lfilter(b, a, x)
def hp(x, f, o=2): b, a = signal.butter(o, f / (SR / 2), 'high'); return signal.lfilter(b, a, x)
def bp(x, f0, f1, o=2): b, a = signal.butter(o, [f0 / (SR / 2), f1 / (SR / 2)], 'band'); return signal.lfilter(b, a, x)
def db(x): return 10 ** (x / 20)
def tt(n): return np.arange(n) / SR
def place(buf, x, t, g=1.0, pan=0.0):
    if x.ndim == 1: x = np.stack([x * np.cos((pan + 1) * np.pi / 4) * 1.414, x * np.sin((pan + 1) * np.pi / 4) * 1.414], 1)
    i = int(round(t * SR))
    if i >= len(buf): return
    if i < 0: x = x[-i:]; i = 0
    x = x[: len(buf) - i]; buf[i:i + len(x)] += x * g

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
HALL_IR = reverb_ir(0.85, 0.015, 3000)
ROOM_IR = reverb_ir(0.45, 0.006, 2500)

# ---------------- sound kit ----------------
def bell_ring(dur=2.0):
    """electromechanical phone bell: clapper at 20 Hz alternating two gongs, inharmonic partials"""
    n = int(dur * SR); x = np.zeros(n + SR)
    gongs = [[(1040, 1.0), (2610, 0.35), (3900, 0.12)], [(1265, 1.0), (3120, 0.3), (4400, 0.1)]]
    for k, s0 in enumerate(np.arange(0, dur, 1 / 20)):
        i = int(s0 * SR); m = int(0.45 * SR); t = tt(m)
        hit = sum(a * np.sin(2 * np.pi * f * (1 + 0.002 * rng.standard_normal()) * t) * np.exp(-t * (9 + f / 400)) for f, a in gongs[k % 2])
        x[i:i + m] += hit * (0.75 + 0.25 * rng.random()) * np.minimum(1, t / 0.0015)
    x = lp(x, 4200, 2)
    return x / np.abs(x).max() * 0.9

def clunk(weight=1.0, ting=False):
    n = int(0.5 * SR); t = tt(n)
    x = np.sin(2 * np.pi * np.cumsum(np.linspace(140, 70, n)) / SR) * np.exp(-t * 30) * weight
    x += 0.35 * lp(rng.standard_normal(n), 1800) * np.exp(-t * 70)
    x += 0.25 * np.sin(2 * np.pi * 620 * t) * np.exp(-t * 45)
    if ting:  # the bell's faint ding when the handset drops onto the hook
        x += 0.18 * (np.sin(2 * np.pi * 1040 * t) + 0.3 * np.sin(2 * np.pi * 2610 * t)) * np.exp(-t * 6) * np.minimum(1, t / 0.002)
    return lp(x, 3000) * 0.9

def line_noise(dur):
    n = int(dur * SR); t = tt(n)
    x = bp(rng.standard_normal(n), 300, 3400, 3) * 0.04 + 0.025 * np.sin(2 * np.pi * 60 * t) + 0.012 * np.sin(2 * np.pi * 180 * t)
    fade = np.minimum(1, t / 0.05) * np.minimum(1, (dur - t) / 0.1)
    return x * fade

def breathing(dur, rate=0.48, seed=3):
    """slow heavy breathing, telephone band: inhale/exhale noise swells with formant-ish band shapes"""
    r = np.random.default_rng(seed); n = int(dur * SR); t = tt(n); x = np.zeros(n)
    period = 1 / rate; k = 0
    while k * period < dur:
        for half, (f0, f1, g) in enumerate([(700, 2600, 0.8), (450, 1800, 1.0)]):
            s0 = k * period + half * period * 0.48; m = int(period * 0.46 * SR); i = int(s0 * SR)
            if i >= n: break
            m = min(m, n - i); e = np.sin(np.linspace(0, np.pi, m)) ** (1.6 if half == 0 else 2.2)
            x[i:i + m] += bp(r.standard_normal(m), f0, f1, 2) * e * g
        k += 1
    x = bp(x, 300, 3400, 2)
    return x / (np.abs(x).max() + 1e-9) * 0.5 * np.minimum(1, t / 0.3)

def door_knock(gain=1.0, close=False):
    """heavy knuckle on a solid wooden door: body modes + a short noise tap; `close` = muffled (inside a closet)"""
    n = int(0.9 * SR); t = tt(n)
    modes = [(88, 1.0, 16), (176, 0.65, 22), (296, 0.45, 30), (460, 0.25, 42)]
    x = sum(a * np.sin(2 * np.pi * f * t) * np.exp(-t * d) for f, a, d in modes)
    x += 0.35 * lp(rng.standard_normal(n), 1400) * np.exp(-t * 110)
    x *= np.minimum(1, t / 0.0012)
    x = lp(x, 520 if close else 1600, 2)
    return x * gain

def creak(dur=2.0):
    """hinge creak: stick-slip impulse train with wandering rate through two resonances"""
    n = int(dur * SR); t = tt(n)
    rate = 26 + 22 * np.sin(2 * np.pi * 0.55 * t + 0.4) + 10 * np.sin(2 * np.pi * 1.7 * t)
    ph = np.cumsum(rate) / SR; imp = np.zeros(n)
    idx = np.where(np.diff(np.floor(ph)) > 0)[0]; imp[idx] = 0.6 + 0.4 * rng.random(len(idx))
    x = bp(imp, 360, 420, 2) * 3 + bp(imp, 820, 980, 2) * 2 + bp(imp, 1500, 1700, 2) * 0.6
    env = np.sin(np.linspace(0, np.pi, n)) ** 0.7
    return lp(x * env, 2600) / (np.abs(x).max() + 1e-9) * 0.5

def sub_boom(dur=3.2):
    n = int(dur * SR); t = tt(n)
    x = np.sin(2 * np.pi * np.cumsum(np.linspace(64, 31, n)) / SR) * np.exp(-t * 1.1) * np.minimum(1, t / 0.01)
    return lp(x, 160)

def riser(dur=1.4):
    n = int(dur * SR); t = tt(n)
    x = bp(rng.standard_normal(n), 120, 900, 2) * (t / dur) ** 2.5
    tone = sum(np.sin(2 * np.pi * f * t) for f in (73.4, 77.8, 110.0)) / 3 * (t / dur) ** 2
    return lp(x * 0.6 + tone * 0.5, 1400)

def saw(f, n, detune=0.0):
    t = tt(n); y = np.zeros(n)
    for d in (-detune, 0, detune):
        ph = (f * (1 + d) * t) % 1.0; y += 2 * ph - 1
    return y / 3

def music_box(notes, start, buf, g=1.0, detune=0.0):
    for i, (tn, midi, v) in enumerate(notes):
        f = 440 * 2 ** ((midi - 69) / 12) * (1 + detune * (rng.random() - 0.5))
        n = int(2.4 * SR); t = tt(n)
        x = (np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t * 3) + 0.15 * np.sin(2 * np.pi * f * 5.4 * t) * np.exp(-t * 6))
        x *= np.exp(-t * 2.2) * np.minimum(1, t / 0.003)
        place(buf, lp(x, 3200) * 0.22 * v * g, start + tn, pan=0.25 * np.sin(i))

# ---------------- score ----------------
score = np.zeros((N, 2))
t = tt(N)
# sub + low fifth drone, slowly breathing; rises through the knocks into the ending
A = {c['type']: c['t'] for c in cues}
# the score's arc is keyed to the first 'knock' (tension rises) and the 'sting' (the reveal); stories without them
# get a sting 3 s before the end and the rise 6 s before that
ST = C['sting'][0]['t'] if C.get('sting') else DUR - 3.0
KN = C['knock'][0]['t'] if C.get('knock') else ST - 6.0
def ramp(pts):  # np.interp needs rising x: drop key points that would fold back on a short story
    xs, ys = [], []
    for x, y in pts:
        if not xs or x > xs[-1] + 1e-3: xs.append(x); ys.append(y)
    return np.interp(t, xs, ys)
arc = ramp([(0, 0.55), (5, 0.6), (8, 0.45), (KN - 4, 0.6), (KN, 0.75), (KN + 2, 0.9), (ST - 4, 1.0), (ST - 0.3, 1.25), (ST, 1.3), (ST + 0.3, 0.5), (DUR, 0.35)])
drone = (np.sin(2 * np.pi * 36.71 * t) * 0.7 + np.sin(2 * np.pi * 55.0 * t) * 0.35 + np.sin(2 * np.pi * 73.42 * t + 0.4) * 0.25) * (0.75 + 0.25 * np.sin(2 * np.pi * 0.09 * t))
pad = np.zeros(N)
for f, a in [(146.83, 0.5), (174.61, 0.35), (220.0, 0.3)]:
    pad += saw(f, N, 0.004) * a
# a dissonant semitone creeps in from the knocks on
pad += saw(155.56, N, 0.005) * 0.3 * np.clip((t - KN) / 6, 0, 1) * (t < ST + 0.1)
pad = lp(lp(pad, 700), 900) * (0.7 + 0.3 * np.sin(2 * np.pi * 0.13 * t + 1))
wind = lp(bp(rng.standard_normal(N), 150, 700, 2), 600) * (0.5 + 0.5 * np.sin(2 * np.pi * 0.07 * t)) * 0.35
mus = (drone * 0.55 + pad * 0.32 + wind) * arc
fade = np.minimum(1, t / 1.2)
score[:, 0] += mus * fade; score[:, 1] += np.roll(mus, 240) * fade
score = verb(score, HALL_IR, 0.25)
# music box: a little lullaby while she's alone, then a wrong-note echo after the reveal
lull = [(0.0, 81, 1), (0.42, 77, 0.8), (0.84, 74, 0.8), (1.26, 76, 0.9), (1.9, 77, 0.8), (2.32, 74, 0.7), (2.74, 69, 0.7), (3.6, 81, 0.9), (4.02, 77, 0.7), (4.44, 74, 0.7), (4.86, 73, 0.8)]
mb = np.zeros((N, 2)); music_box(lull, 0.55, mb, 1.0, 0.004)
music_box([(0.0, 81, 0.9), (0.55, 77, 0.7), (1.1, 73, 0.8)], ST + 0.75, mb, 0.9, 0.03)
score += verb(mb, HALL_IR, 0.4)

# ---------------- sound design ----------------
fx = np.zeros((N, 2))
for c in C.get('ring', []):
    r = bell_ring(c['dur']); r = verb(r, HALL_IR, 0.35)
    place(fx, r * 0.36, c['t'], pan=0.25)
for c in C.get('pickup', []): place(fx, verb(clunk(0.8), ROOM_IR, 0.25) * 0.5, c['t'], pan=0.2)
for c in C.get('hangup', []): place(fx, verb(clunk(1.0, ting=True), ROOM_IR, 0.3) * 0.62, c['t'], pan=0.25)
lines = C.get('line', [])
for i, c in enumerate(lines):
    place(fx, line_noise(c['dur']) * 0.55, c['t'])
    if i == 0:  # the first call: nobody speaks, somebody breathes
        b = breathing(c['dur'] - 0.5, 0.42)
        place(fx, b * 0.7, c['t'] + 0.35)
for c in C.get('knock', []):
    k = verb(door_knock(c.get('gain', 1)), HALL_IR, 0.42)
    place(fx, k * 0.78, c['t'], pan=-0.05)
for c in C.get('swell', []):
    n = int(c['dur'] * SR); tt_ = tt(n)
    sw = lp(bp(rng.standard_normal(n), 60, 400, 2), 300) * np.sin(np.linspace(0, np.pi, n)) ** 1.5
    place(fx, verb(sw * 0.5, HALL_IR, 0.5), c['t'])
for c in C.get('closetknock', []):
    place(fx, verb(door_knock(0.9, close=True), ROOM_IR, 0.2) * 0.95, c['t'], pan=0.15)
for c in C.get('creak', []): place(fx, verb(creak(c['dur']), HALL_IR, 0.3) * 0.62, c['t'], pan=0.1)
for c in C.get('sting', []):
    place(fx, verb(riser(1.3), HALL_IR, 0.4) * 0.5, c['t'] - 1.3)
    place(fx, sub_boom(3.2) * 0.68, c['t'])
    n = int(3.0 * SR); tt_ = tt(n)
    cl = sum(saw(f, n, 0.006) for f in (73.42, 77.78, 116.54, 155.56)) / 4
    cl = lp(cl, 900) * np.minimum(1, tt_ / 0.08) * np.exp(-tt_ * 0.9)
    place(fx, verb(cl * 0.45, HALL_IR, 0.45), c['t'])
for c in C.get('lastknock', []): place(fx, verb(door_knock(0.7, close=True), ROOM_IR, 0.25) * 0.8, c['t'], pan=0.15)
# floor creak as she backs away from the ringing phone
if len(C.get('ring', [])) > 1: place(fx, verb(creak(0.5) * 0.7, ROOM_IR, 0.2) * 0.25, C['ring'][1]['t'] + 0.15)
# room tone
tone = lp(np.cumsum(rng.standard_normal(N)) * 0.002, 220); tone -= lp(tone, 20)
fx[:, 0] += tone * 0.5; fx[:, 1] += np.roll(tone, 300) * 0.5

# ---------------- narration + duck ----------------
voice, vsr = sf.read(P / 'data/narration.wav', always_2d=True)
assert vsr == SR, vsr
voice = voice[:N]; voice = np.pad(voice, ((0, N - len(voice)), (0, 0)))
venv = np.abs(voice).mean(1)
venv = lp(venv, 4, 1)
duck = 1 - 0.45 * np.clip(venv / (np.percentile(venv, 95) + 1e-9), 0, 1)
score *= duck[:, None]

# ---------------- master ----------------
mix = voice * 1.0 + score * db(-14) + fx * db(-6)
mix = hp(mix.T, 28, 2).T
# soft high shelf down (gentle on the ears)
mix = mix - 0.25 * (mix - lp(mix.T, 6000, 1).T)
rms = np.sqrt((mix ** 2).mean()); target = db(-19.0)
mix *= target / rms
pk = np.abs(mix).max()
if pk > db(-1.0):
    k = db(-1.0)
    over = np.abs(mix) > 0.7 * k
    mix = np.where(over, np.sign(mix) * (0.7 * k + (np.abs(mix) - 0.7 * k) / (1 + (np.abs(mix) - 0.7 * k) / (0.3 * k))), mix)
end_fade = np.clip((DUR - t) / 0.25, 0, 1)
mix *= end_fade[:, None]
sf.write(P / 'data/mix.wav', mix.astype(np.float32), SR, subtype='PCM_24')
(P / 'data/stems').mkdir(exist_ok=True)
sf.write(P / 'data/stems/score.wav', (score * db(-14)).astype(np.float32), SR)
sf.write(P / 'data/stems/fx.wav', (fx * db(-6)).astype(np.float32), SR)
print(f'data/mix.wav {DUR:.2f}s  rms {20 * np.log10(np.sqrt((mix ** 2).mean())):.1f} dBFS  peak {20 * np.log10(np.abs(mix).max()):.1f} dBFS')
