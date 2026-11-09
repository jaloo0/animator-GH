#!/bin/bash
# Make score takes for a project with ACE-Step, one music job per machine at a time.
#   bash make_music.sh <project> [seed ...]       (seeds default to song.json "seeds")
# Reads <project>/audio/song.json, writes <project>/audio/takes/seed<N>.wav. ~1–2 min per take on an M-series Mac
# after the first run. Then listen, pick one, and copy it to <project>/audio/music.wav (tools/mix.py reads audio/music.*).
set -u
SKILL="$(cd "$(dirname "$0")/../.." && pwd)"; VOX="${FACELESS_HOME:-$HOME/.faceless-videos}"
P="$(cd "${1:?usage: make_music.sh <project> [seed ...]}" && pwd)"; shift; SEEDS="$*"
ACE="${ACE_STEP_DIR:-$(cat "$VOX/acestep_path" 2>/dev/null || cat "$HOME/.vox-style-video/acestep_path" 2>/dev/null)}"
[ -n "$ACE" ] && [ -f "$ACE/pyproject.toml" ] || { echo "ACE-Step is not installed: bash $SKILL/scripts/music/install_acestep.sh" >&2; exit 2; }
[ -f "$P/audio/song.json" ] || { echo "missing $P/audio/song.json (copy the one from your style's example and rewrite the caption)" >&2; exit 2; }
# Loading the model pushes a 16 GB machine into swap; with too little free disk the computer can restart.
FREE=$(df -Pk "$HOME" | awk 'NR==2 {printf "%d", $4 / 1048576}')
if [ "${FREE:-0}" -lt 10 ] && [ "${FACELESS_FORCE:-0}" != 1 ]; then
  echo "Not starting: only ${FREE} GB free disk. Music generation needs ~10 GB free (swap) or the computer can restart." >&2; exit 3
fi
mkdir -p "$P/audio/takes"; LOCK="$VOX/acestep.lock"
while ! mkdir "$LOCK" 2>/dev/null; do
  holder="$(cat "$LOCK/pid" 2>/dev/null || true)"
  if [ -n "$holder" ] && ! ps -p "$holder" -o command= 2>/dev/null | grep -q make_music; then rm -f "$LOCK/pid"; rmdir "$LOCK" 2>/dev/null; continue; fi
  echo "[$(date +%T)] another music job is running… waiting"; sleep 20
done
echo $$ > "$LOCK/pid"; trap 'rm -f "$LOCK/pid"; rmdir "$LOCK" 2>/dev/null' EXIT INT TERM
cd "$ACE" || exit 2
export TOKENIZERS_PARALLELISM=false ACESTEP_MPS_DTYPE=bfloat16 ACESTEP_SAVE_MEMORY=1 PYTHONUNBUFFERED=1
[ "$(uname -s)" = Darwin ] && [ "$(uname -m)" = arm64 ] && export ACESTEP_LM_BACKEND="${ACESTEP_LM_BACKEND:-mlx}"
echo "[$(date +%T)] generating (first run downloads nothing more if install_acestep.sh finished)"
# shellcheck disable=SC2086
uv run python "$SKILL/scripts/music/gen_song.py" "$P" $SEEDS > "$P/audio/gen.log" 2>&1; gen=$?
echo "[$(date +%T)] generation exit $gen"
uv run python "$SKILL/scripts/music/decode_latents.py" "$P" > "$P/audio/decode.log" 2>&1; dec=$?
echo "[$(date +%T)] decode exit $dec"
find "$P/audio/takes" -maxdepth 1 -name '*-*-*-*-*.wav' -delete 2>/dev/null
ls -1 "$P/audio/takes/"seed*.wav 2>/dev/null | sed 's/^/  /'
[ "$gen" -eq 0 ] && [ "$dec" -eq 0 ]
