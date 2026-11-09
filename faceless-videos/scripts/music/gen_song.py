"""Generate song / score takes with ACE-Step 1.5 (local, free, MIT). Saves LATENTS only.

Don't call this directly. make_music.sh calls it from inside the ACE-Step checkout (so its venv and
checkpoints resolve), under the one-job-per-machine lock, and then decodes in a second process:
  cd <ACE-Step-1.5> && uv run python <SKILL>/scripts/music/gen_song.py <ABS_PROJECT> [seed ...]

Reads <project>/audio/song.json (caption, lyrics, bpm, duration, seeds, ...). Example: styles/<style>/example/audio/song.json.
FACELESS_DRY_RUN=1 checks song.json against ACE-Step's parameters without loading a model.
Writes <project>/audio/takes/seed<N>.latents.pt

Why latents only: on a 16 GB machine, loading the DiT + LM AND decoding audio in one process gets
killed (exit 137). decode_latents.py turns latents into WAV in a fresh process that loads only the VAE.
"""

import json
import os
import platform
import sys

from acestep.handler import AceStepHandler
from acestep.inference import GenerationConfig, GenerationParams, generate_music
from acestep.llm_inference import LLMHandler

ACE_ROOT = os.getcwd()
PROJECT = os.path.abspath(sys.argv[1])
CFG = json.load(open(os.path.join(PROJECT, "audio", "song.json")))
OUT_DIR = os.path.join(PROJECT, "audio", "takes")
os.makedirs(OUT_DIR, exist_ok=True)

SEEDS = [int(s) for s in sys.argv[2:]] or CFG.get("seeds") or [11, 23, 47, 89]
APPLE = sys.platform == "darwin" and platform.machine() == "arm64"
LM_BACKEND = os.environ.get("ACESTEP_LM_BACKEND") or ("mlx" if APPLE else "pt")
LM_MODEL = CFG.get("lm", "acestep-5Hz-lm-0.6B")

instrumental = bool(CFG.get("instrumental", False))
params = GenerationParams(
    task_type="text2music",
    caption=CFG["caption"],
    lyrics=CFG.get("lyrics") or "[Instrumental]",
    instrumental=instrumental,
    vocal_language=CFG.get("language", "en"),
    bpm=CFG.get("bpm"),
    timesignature=str(CFG.get("timesignature", "4")),
    duration=float(CFG["duration"]),
    inference_steps=int(CFG.get("inference_steps", 8)),
    shift=float(CFG.get("shift", 3.0)),
)

if os.environ.get("FACELESS_DRY_RUN") == "1":
    # validate song.json against ACE-Step without loading any model (cheap, safe on any machine)
    print("dry run ok:", {k: getattr(params, k) for k in ("caption", "instrumental", "bpm", "duration", "vocal_language")})
    print("seeds:", SEEDS, "LM:", LM_MODEL, "backend:", LM_BACKEND)
    sys.exit(0)

dit = AceStepHandler()
status, ok = dit.initialize_service(
    project_root=ACE_ROOT,
    config_path="acestep-v15-turbo",
    device="auto",
    use_mlx_dit=False,  # one bf16 torch copy instead of torch fp32 + an MLX copy
)
print("DiT:", status, flush=True)
if not ok:
    sys.exit(1)

import torch  # noqa: E402  (after the handler picked the device)

dit.use_mlx_vae = False
dit.mlx_vae = None
CURRENT = {"seed": None}


def save_latents_instead_of_decoding(latents, *args, **kwargs):
    path = os.path.join(OUT_DIR, f"seed{CURRENT['seed']}.latents.pt")
    torch.save(latents.detach().float().cpu(), path)
    print(f"saved latents {tuple(latents.shape)} -> {path}", flush=True)
    return torch.zeros(latents.shape[0], 2, latents.shape[-1] * 1920)


dit.tiled_decode = save_latents_instead_of_decoding

lm = LLMHandler()
status, ok = lm.initialize(
    checkpoint_dir=os.path.join(ACE_ROOT, "checkpoints"),
    lm_model_path=LM_MODEL,
    backend=LM_BACKEND,
    device="auto",
)
print("LM:", status, flush=True)
if not ok:
    sys.exit(1)

for seed in SEEDS:
    CURRENT["seed"] = seed
    config = GenerationConfig(batch_size=1, seeds=[seed], use_random_seed=False, audio_format="wav")
    result = generate_music(dit, lm, params, config, save_dir=OUT_DIR)
    if not result.success:
        print(f"seed {seed}: FAILED {result.error}", flush=True)
        continue
    print(f"seed {seed}: ok", flush=True)
