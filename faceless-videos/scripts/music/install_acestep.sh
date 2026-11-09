#!/bin/bash
# Install ACE-Step 1.5 (MIT, open source) for $0 local music. Reuses a checkout you already have.
#   bash install_acestep.sh [--dir <path>]
# Needs: Apple Silicon Mac with 16 GB+ RAM, or an NVIDIA GPU with 6 GB+ VRAM; ~15 GB disk (code + ~11 GB of models).
set -u
SKILL="$(cd "$(dirname "$0")/../.." && pwd)"; VOX="${FACELESS_HOME:-$HOME/.faceless-videos}"; mkdir -p "$VOX"
ACE_COMMIT="ca1e85fe9430179831e6bc6be790c332190a3866"  # the revision the example videos were made with
ACE=""; [ "${1:-}" = "--dir" ] && ACE="$2"
if [ -z "$ACE" ]; then  # an install from this or a sibling skill?
  for c in "${ACE_STEP_DIR:-}" "$(cat "$VOX/acestep_path" 2>/dev/null)" "$(cat "$HOME/.vox-style-video/acestep_path" 2>/dev/null)" "$(cat "$HOME/.motion-carousels/acestep_path" 2>/dev/null)" "$HOME/.one-prompt-mv/ACE-Step-1.5" "$HOME/motion-studio-tools/ACE-Step-1.5" "$VOX/ACE-Step-1.5"; do
    [ -n "$c" ] && [ -f "$c/pyproject.toml" ] && { ACE="$c"; break; }
  done
fi
ACE="${ACE:-$VOX/ACE-Step-1.5}"
export PATH="$HOME/.local/bin:$PATH"
command -v uv >/dev/null || curl -LsSf https://astral.sh/uv/install.sh | sh >/dev/null 2>&1
command -v git >/dev/null || { echo "git is missing (macOS: xcode-select --install)"; exit 1; }
if [ ! -f "$ACE/pyproject.toml" ]; then
  FREE=$(df -Pk "$HOME" | awk 'NR==2 {printf "%d", $4 / 1048576}')
  [ "$FREE" -lt 25 ] && { echo "Only ${FREE} GB free: installing needs ~15 GB, then ~10 GB free to run. Free up space first."; exit 1; }
  echo "cloning ACE-Step 1.5 into $ACE"; git clone -q https://github.com/ACE-Step/ACE-Step-1.5.git "$ACE" && (cd "$ACE" && git checkout -q "$ACE_COMMIT")
fi
echo "$ACE" > "$VOX/acestep_path"
cd "$ACE"
if ! grep -q ACESTEP_MPS_DTYPE acestep/core/generation/handler/init_service_orchestrator.py 2>/dev/null; then
  git apply "$SKILL/scripts/music/acestep-mps-bf16.patch" 2>/dev/null && echo "applied the 16 GB Mac memory patch" || echo "(memory patch not applied: fine on NVIDIA or 32 GB+ machines)"
fi
uv run python -c "import acestep" >/dev/null 2>&1 || { echo "installing ACE-Step's Python env (a few GB)…"; uv sync >/dev/null 2>&1 || { echo "uv sync failed: run it in $ACE to see why"; exit 1; }; }
has() { [ -n "$(find "checkpoints/$1" -maxdepth 1 \( -name '*.safetensors' -o -name '*.bin' \) 2>/dev/null | head -1)" ]; }
has acestep-v15-turbo && has vae || { echo "downloading the main model (~9.5 GB)…"; uv run acestep-download >/dev/null 2>&1 || { echo "model download failed: cd $ACE && uv run acestep-download"; exit 1; }; }
has acestep-5Hz-lm-0.6B || { echo "downloading the 0.6B language model (~1.3 GB)…"; uv run acestep-download --model acestep-5Hz-lm-0.6B --skip-main >/dev/null 2>&1 || { echo "LM download failed"; exit 1; }; }
echo "ACE-Step ready: $ACE"
