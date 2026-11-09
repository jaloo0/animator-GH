"""The soundtrack, all local: Kokoro narration + one ACE-Step take (audio/music.*, the example's is seed11) + procedural numpy/scipy SFX.
Soft by design (ticks, clicks and glitches hurt on phone speakers): felt thumps, low wooden knocks, filtered noise
beds, sine swells. Music is ducked under the voice; master ≈ -16 LUFS-ish RMS with a soft knee.

  SKILL/scripts/py tools/mix.py <project> [duration]     → data/mix.wav
  duration = the film length: node tools/capture.mjs eval 'OP.duration()' (the example is 183.76)
"""
import json, sys
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
shots = json.loads((P / 'data/shots.json').read_text()) if (P / 'data/shots.json').exists() else None
cues = json.loads((P / 'data/cues.json').read_text())
sent = json.loads((P / 'data/narration.sentences.json').read_text())
END = max(c.get('end', c['t']) for c in cues)
DUR = float(sys.argv[2]) if len(sys.argv) > 2 else 183.76
N = int(DUR * SR)

def lp(x, f, o=2): b, a = signal.butter(o, f / (SR / 2), 'low'); return signal.lfilter(b, a, x)
def hp(x, f, o=2): b, a = signal.butter(o, f / (SR / 2), 'high'); return signal.lfilter(b, a, x)
def bp(x, f0, f1, o=2): b, a = signal.butter(o, [f0 / (SR / 2), f1 / (SR / 2)], 'band'); return signal.lfilter(b, a, x)
def env(n, a, d, shape=3.0):
    t = np.arange(n) / SR
    e = np.minimum(1, t / max(a, 1e-4)) * np.exp(-np.maximum(0, t - a) * shape / max(d, 1e-4))
    return e
def db(x): return 10 ** (x / 20)
def place(buf, x, t, g=1.0, pan=0.0):
    i = int(t * SR)
    if i >= len(buf) or i + len(x) <= 0: return
    if i < 0: x = x[-i:]; i = 0
    x = x[: len(buf) - i]
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    buf[i:i + len(x), 0] += x * g * l * 1.414
    buf[i:i + len(x), 1] += x * g * r * 1.414

# ---------------- voices of the sound kit ----------------
def thump(dur=0.9, f0=70, f1=38):
    n = int(dur * SR); t = np.arange(n) / SR
    ph = 2 * np.pi * np.cumsum(np.linspace(f0, f1, n)) / SR
    x = np.sin(ph) * env(n, 0.006, dur * 0.6, 4)
    return lp(x + 0.15 * lp(rng.standard_normal(n), 300) * env(n, 0.002, 0.08, 5), 400)
def knock(pitch=1.0, dur=0.35):
    # a low wooden knock: two damped resonances + a soft noise tap, low-passed
    n = int(dur * SR); t = np.arange(n) / SR
    x = (np.sin(2 * np.pi * 180 * pitch * t) * np.exp(-t * 28) + 0.6 * np.sin(2 * np.pi * 410 * pitch * t) * np.exp(-t * 40))
    x += 0.25 * lp(rng.standard_normal(n), 1500) * np.exp(-t * 90)
    return lp(x, 1800) * 0.8
def clay(pitch=1.0):
    n = int(0.3 * SR); t = np.arange(n) / SR
    x = np.sin(2 * np.pi * 300 * pitch * t) * np.exp(-t * 35) + 0.4 * np.sin(2 * np.pi * 720 * pitch * t) * np.exp(-t * 55)
    return lp(x + 0.15 * lp(rng.standard_normal(n), 2500) * np.exp(-t * 120), 2600) * 0.7
def buzz(dur=0.45):
    n = int(dur * SR); t = np.arange(n) / SR
    x = np.sin(2 * np.pi * 155 * t) * (0.6 + 0.4 * np.sign(np.sin(2 * np.pi * 28 * t)))
    return lp(x, 700) * env(n, 0.02, dur, 1.2) * np.clip((dur - t) / 0.05, 0, 1) * 0.6
def chime():
    n = int(1.6 * SR); t = np.arange(n) / SR
    x = np.zeros(n)
    for f, t0 in [(784, 0), (587, 0.32)]:
        k = t >= t0; tt = t[k] - t0
        x[k] += (np.sin(2 * np.pi * f * tt) + 0.3 * np.sin(2 * np.pi * 2 * f * tt)) * np.exp(-tt * 3.2) * np.minimum(1, tt / 0.01)
    return lp(x, 2400) * 0.5
def lost():
    n = int(0.7 * SR); t = np.arange(n) / SR
    ph = 2 * np.pi * np.cumsum(np.linspace(520, 260, n)) / SR
    return lp(np.sin(ph) * env(n, 0.01, 0.5, 3), 1500) * 0.4
def felt():
    n = int(1.2 * SR); t = np.arange(n) / SR
    x = np.sin(2 * np.pi * 98 * t) * np.exp(-t * 5) + 0.5 * np.sin(2 * np.pi * 147 * t) * np.exp(-t * 6)
    return lp(x * np.minimum(1, t / 0.008), 900) * 0.8
def drip():
    n = int(0.35 * SR); t = np.arange(n) / SR
    ph = 2 * np.pi * np.cumsum(np.linspace(1100, 600, n)) / SR
    return lp(np.sin(ph) * np.exp(-t * 26) * np.minimum(1, t / 0.003), 2500) * 0.8
def cloth(dur=1.0):
    n = int(dur * SR)
    x = bp(rng.standard_normal(n), 200, 2200) * np.sin(np.linspace(0, np.pi, n)) ** 1.5
    return lp(x, 2000) * 0.5
def swell():
    n = int(3.2 * SR); t = np.arange(n) / SR
    x = sum(np.sin(2 * np.pi * f * t) * a for f, a in [(220, 1), (329.6, 0.7), (440, 0.35), (554.4, 0.25)])
    e = np.sin(np.clip(t / 3.2, 0, 1) * np.pi) ** 2
    return lp(x * e, 1600) * 0.6
def answer():
    n = int(0.9 * SR); t = np.arange(n) / SR
    x = np.sin(2 * np.pi * 196 * t) + 0.4 * np.sin(2 * np.pi * 293.7 * t)
    return lp(x * env(n, 0.03, 0.7, 3), 1200) * 0.4
def blow():
    n = int(0.6 * SR)
    x = bp(rng.standard_normal(n), 300, 3000) * np.sin(np.linspace(0, np.pi, n)) ** 0.8
    return lp(x, 2600) * 0.45
def creak():
    n = int(1.1 * SR); t = np.arange(n) / SR
    f = 140 + 60 * np.sin(2 * np.pi * 0.9 * t)
    pulses = (np.sin(2 * np.pi * np.cumsum(f) / SR) > 0.97).astype(float)
    x = signal.lfilter([1], [1, -1.94 * np.cos(2 * np.pi * 420 / SR), 0.94], pulses)
    x = lp(x * np.sin(np.linspace(0, np.pi, n)), 1400)
    return x / (np.abs(x).max() + 1e-9) * 0.35

# ---------------- beds ----------------
out = np.zeros((N, 2))
def bed_noise(t0, t1, lo, hi, gain, mod=0.1, seed=1):
    n = int((t1 - t0) * SR)
    if n <= 0: return
    r = np.random.default_rng(seed)
    x = np.stack([bp(r.standard_normal(n), lo, hi), bp(r.standard_normal(n), lo, hi)], 1)
    t = np.arange(n) / SR
    m = 1 + mod * np.sin(2 * np.pi * 0.07 * t + seed) + mod * 0.6 * np.sin(2 * np.pi * 0.23 * t)
    fade = np.minimum(1, np.minimum(t / 0.8, (t1 - t0 - t) / 0.8))
    i = int(t0 * SR); out[i:i + n] += x * (gain * m * np.clip(fade, 0, 1))[:, None]

for c in cues:
    T, g = c['t'], c.get('gain', 1)
    ty = c['type']
    if ty == 'hum':
        # the city's hum (traffic + mains) — fades as the blackout rolls in, cut dead with the lamp
        t1 = c['end']; n = int((t1 - T) * SR); t = np.arange(n) / SR + T
        x = 0.5 * lp(rng.standard_normal(n), 220, 3) + 0.08 * np.sin(2 * np.pi * 50 * t) + 0.05 * np.sin(2 * np.pi * 100 * t)
        x += 0.25 * bp(rng.standard_normal(n), 300, 900) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.13 * t))
        e = np.interp(t, [T, T + 0.6, c['fadeFrom'], c['fadeTo'], t1 - 0.02, t1], [0, 1, 1, 0.3, 0.3, 0])
        place(out, x * e * db(-17), T)
    elif ty == 'wind':
        bed_noise(T, c['end'], 120, 900, db(-37), 0.35, 3)
        bed_noise(T, c['end'], 1200, 3500, db(-49), 0.5, 4)
    elif ty == 'water':
        t1 = c['end']; n = int((t1 - T + 0.3) * SR); t = np.arange(n) / SR
        x = bp(rng.standard_normal(n), 400, 5000)
        f0, f1 = c['fill']
        res = np.zeros(n)
        # a filling resonance that rises as the tub fills (pitch up = less air above the water)
        fr = np.interp(t + T, [f0, f1, t1], [180, 420, 450])
        res = np.sin(2 * np.pi * np.cumsum(fr) / SR) * 0.15 * bp(rng.standard_normal(n), 50, 400) * 8
        e = np.interp(t + T, [T, T + 0.15, t1 - 0.05, t1 + 0.25], [0, 1, 1, 0])
        cf = c['coughFrom']
        gate = np.where(t + T > cf, (np.sin(2 * np.pi * 7 * (t + T - cf)) > -0.2).astype(float) * 0.85 + 0.15, 1)
        gate = lp(gate, 40)
        place(out, lp(x + res, 4200) * e * gate * db(-22), T)
    else:
        fn = {'thump': thump, 'knock': lambda: knock(c.get('pitch', 1)), 'lampoff': lambda: thump(0.5, 110, 60) * 0.7 + np.pad(knock(0.7), (0, int(0.15 * SR))),
              'buzz': buzz, 'chime': chime, 'lost': lost, 'felt': felt, 'clay': lambda: clay(c.get('pitch', 1)), 'drip': drip,
              'cloth': cloth, 'swell': swell, 'answer': answer, 'blow': blow, 'creak': creak}.get(ty)
        if fn is None: print('skip', ty); continue
        x = fn()
        if isinstance(x, np.ndarray):
            pan = {'buzz': 0.1, 'clay': -0.2, 'knock': 0.0, 'answer': 0.25}.get(ty, 0)
            place(out, x * g * db(-14), T, 1.0, pan)

# ---------------- narration ----------------
voice, vsr = sf.read(P / 'data/narration.wav')
if vsr != SR: raise SystemExit('narration must be 48k')
if voice.ndim == 1: voice = np.stack([voice, voice], 1)
voice = voice[:N]
# gentle voice EQ: a touch of warmth, de-harsh above 7k
v = np.stack([lp(hp(voice[:, k], 70), 9000) for k in range(2)], 1)
vbuf = np.zeros((N, 2)); vbuf[:len(v)] = v
vrms = np.sqrt(np.mean(v ** 2)) or 1
vbuf *= db(-17) / vrms * 0.95   # voice ≈ -17 dB RMS while speaking-ish

# ---------------- music ----------------
mus = read_music(P, SR)
if mus.ndim == 1: mus = np.stack([mus, mus], 1)
mbuf = np.zeros((N, 2))
L = min(len(mus), N); mbuf[:L] = mus[:L]
# duck under the voice (smoothed envelope)
venv = np.abs(vbuf).mean(1)
venv = lp(venv, 3, 1); venv = venv / (venv.max() or 1)
duck = 1 - 0.55 * np.clip(venv * 4, 0, 1)
duck = lp(duck, 2, 1)
t = np.arange(N) / SR
lastSent = sent['sentences'][-1]
endT = lastSent['end']
# the example's music bows out at its 'blow' cue (the candle goes out); without one, at the end of the narration
blowT = next((c['t'] for c in cues if c['type'] == 'blow'), endT - 0.5)
# music bows out when the candle goes out; the take's own outro returns under the end card
mus_g = np.interp(t, [0, 1.0, blowT - 0.3, blowT + 1.8, endT + 1.4, endT + 2.0, DUR - 1.2, DUR], [0.6, 1, 1, 0.0, 0.0, 0.0, 0.0, 0.0])
mrms = np.sqrt(np.mean(mus[: int(150 * SR)] ** 2)) or 1
mbuf = mbuf * (db(-27) / mrms) * (duck * mus_g)[:, None]
# end card: the take's last 9 s (its natural ending), faded in
tail0 = 172.0   # where the example take's ending phrase starts: change it for a new take
seg = mus[int(tail0 * SR): int((tail0 + 9.0) * SR)]
seg = seg * (db(-27) / mrms)
fade_in = np.minimum(1, np.arange(len(seg)) / (1.2 * SR))[:, None]
i0 = int((endT + 1.9) * SR)
k = min(len(seg), N - i0)
if k > 0: mbuf[i0:i0 + k] += seg[:k] * fade_in[:k] * 1.15

mix = vbuf + mbuf + out
if '--levels' in sys.argv:
    def r(x, a, b): seg = x[int(a * SR):int(b * SR)]; return 20 * np.log10(np.sqrt(np.mean(seg ** 2)) + 1e-9)
    print('voice (speech)', round(r(vbuf, 30, 34), 1), ' music under voice', round(r(mbuf, 30, 34), 1), ' music in gap', round(r(mbuf, 98.5, 99.0), 1))
    for c in cues:
        d = 0.5 if c['type'] not in ('hum', 'wind', 'water') else 3
        print(f"  {c['type']:8s} @{c['t']:7.2f}  sfx {r(out, c['t'], c['t'] + d):6.1f}  voice {r(vbuf, c['t'], c['t'] + d):6.1f}")
# soft high shelf + soft knee limiter
mix = np.stack([mix[:, k] - 0.25 * hp(mix[:, k], 7000) for k in range(2)], 1)
peak = np.abs(mix).max()
def softknee(x, th=0.7):
    a = np.abs(x); y = np.where(a < th, a, th + (1 - th) * np.tanh((a - th) / (1 - th)))
    return np.sign(x) * y
mix = mix / max(1e-6, np.percentile(np.abs(mix), 99.95)) * 0.8
mix = softknee(mix, 0.75) * 0.95
cur = 20 * np.log10(np.sqrt(np.mean(mix ** 2)))
mix *= db(-17.5 - cur)
fade = np.minimum(1, (N - np.arange(N)) / (0.8 * SR))[:, None]
mix *= fade
sf.write(P / 'data/mix.wav', mix.astype(np.float32), SR, subtype='PCM_16')
rms = 20 * np.log10(np.sqrt(np.mean(mix ** 2)))
print(f'data/mix.wav  {N / SR:.2f}s  rms {rms:.1f} dBFS  peak {20 * np.log10(np.abs(mix).max()):.1f}')
