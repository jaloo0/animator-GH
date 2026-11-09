"""Decode ACE-Step latents (<project>/audio/takes/*.latents.pt) to 48 kHz WAV with only the VAE in memory.

Called by make_music.sh from inside the ACE-Step checkout (checkpoints/vae must resolve):
  cd <ACE-Step-1.5> && uv run python <SKILL>/scripts/music/decode_latents.py <ABS_PROJECT>
Skips takes that already have a WAV. Normalises every take to -1 dBFS.
"""

import glob
import os
import sys
import wave

import numpy as np
import torch
from diffusers.models import AutoencoderOobleck

TAKES = os.path.join(os.path.abspath(sys.argv[1]), "audio", "takes")
CHUNK, OVERLAP, HOP = 128, 16, 1920  # latent frames per window, overlap, samples per frame

torch.set_num_threads(os.cpu_count() or 8)
vae = AutoencoderOobleck.from_pretrained("checkpoints/vae").float().eval()


@torch.inference_mode()
def decode(lat):
    frames = lat.shape[-1]
    out = []
    start = 0
    while start < frames:
        a = max(0, start - OVERLAP)
        b = min(frames, start + CHUNK + OVERLAP)
        wav = vae.decode(lat[:, :, a:b]).sample
        keep_from = (start - a) * HOP
        keep_to = keep_from + (min(start + CHUNK, frames) - start) * HOP
        out.append(wav[:, :, keep_from:keep_to])
        start += CHUNK
    return torch.cat(out, dim=-1)


for path in sorted(glob.glob(os.path.join(TAKES, "*.latents.pt"))):
    wav_path = path.replace(".latents.pt", ".wav")
    if os.path.exists(wav_path):
        continue
    wav = decode(torch.load(path))[0].clamp(-1, 1).numpy()
    peak = float(np.abs(wav).max()) or 1.0
    pcm = (wav / max(peak, 1e-6) * 0.89 * 32767).astype(np.int16).T  # normalise to -1 dBFS
    with wave.open(wav_path, "wb") as w:
        w.setnchannels(pcm.shape[1])
        w.setsampwidth(2)
        w.setframerate(48000)
        w.writeframes(pcm.tobytes())
    print(f"{os.path.basename(wav_path)}: {pcm.shape[0] / 48000:.2f}s", flush=True)
