#!/bin/bash
# One-time setup: checks the free tools, builds the private Python env, downloads the local voice + Whisper models.
#   bash setup.sh            → prints "All set" when everything works (safe to re-run), ~1 GB
#   bash setup.sh --depth    → the same, plus the OPTIONAL depth model for NEW Clay Atlas stills (~0.1 GB)
set -u
DEPTH=0; [ "${1:-}" = "--depth" ] && DEPTH=1
ok=1; say() { printf '%-12s %s\n' "$1" "$2"; }
export PATH="$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"
SKILL="$(cd "$(dirname "$0")/.." && pwd)"; FH="${FACELESS_HOME:-$HOME/.faceless-videos}"; VENV="$FH/venv"
NODE_V=$(node -v 2>/dev/null | sed 's/v//' | cut -d. -f1)
if [ -n "$NODE_V" ] && [ "$NODE_V" -ge 22 ]; then say node "ok ($(node -v))"; else say node "MISSING or too old (need Node.js 22+: nodejs.org, or brew install node)"; ok=0; fi
if command -v ffmpeg >/dev/null && command -v ffprobe >/dev/null; then say ffmpeg ok; else say ffmpeg "MISSING (brew install ffmpeg / winget install ffmpeg / apt install ffmpeg)"; ok=0; fi
CH=""; for p in "${CHROME:-}" "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" "/Applications/Chromium.app/Contents/MacOS/Chromium" "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge" /usr/bin/google-chrome /usr/bin/google-chrome-stable /usr/bin/chromium /usr/bin/chromium-browser /snap/bin/chromium "/c/Program Files/Google/Chrome/Application/chrome.exe"; do [ -n "$p" ] && [ -x "$p" ] && CH="$p" && break; done
if [ -n "$CH" ]; then say chrome "ok"; else say chrome "MISSING (install Google Chrome from google.com/chrome, or set CHROME=/path/to/chrome)"; ok=0; fi
if ! command -v uv >/dev/null; then echo "installing uv (free Python package manager, no admin needed)…"; curl -LsSf https://astral.sh/uv/install.sh | sh >/dev/null 2>&1; export PATH="$HOME/.local/bin:$PATH"; fi
if command -v uv >/dev/null; then say uv ok; else say uv "MISSING (see docs.astral.sh/uv)"; ok=0; fi
if command -v uv >/dev/null; then
  mkdir -p "$FH"
  if [ ! -x "$VENV/bin/python" ] && [ ! -x "$VENV/Scripts/python.exe" ]; then
    echo "building the Python env in $VENV (numpy, scipy, Whisper, Kokoro voice) — a few minutes, ~0.4 GB…"
    uv venv --python 3.11 "$VENV" >/dev/null 2>&1 || uv venv "$VENV" >/dev/null 2>&1
  fi
  PY="$VENV/bin/python"; [ -x "$PY" ] || PY="$VENV/Scripts/python.exe"
  CHECK="import numpy, scipy, soundfile, faster_whisper, kokoro_onnx"
  "$PY" -c "$CHECK" 2>/dev/null || uv pip install --python "$PY" -q numpy scipy soundfile faster-whisper kokoro-onnx >/dev/null 2>&1
  if "$PY" -c "$CHECK" 2>/dev/null; then say python-env "ok ($VENV)"; else say python-env "BROKEN — run: uv pip install --python $PY numpy scipy soundfile faster-whisper kokoro-onnx"; ok=0; fi
  if "$PY" -I "$SKILL/scripts/voice.py" --download >/dev/null 2>&1; then say voice "ok (Kokoro, ~350 MB in $FH/kokoro)"; else say voice "model download FAILED (check the internet connection, then re-run)"; ok=0; fi
  if "$PY" -c "from faster_whisper import WhisperModel; WhisperModel('small.en', device='cpu', compute_type='int8')" >/dev/null 2>&1; then say whisper "ok (small.en)"; else say whisper "model download FAILED (re-run setup.sh)"; ok=0; fi
fi
if [ $ok = 1 ] && [ $DEPTH = 1 ]; then
  "$PY" -c "import PIL" 2>/dev/null || uv pip install --python "$PY" -q pillow >/dev/null 2>&1
  if "$PY" -I "$SKILL/scripts/depth.py" --download >/dev/null 2>&1; then say depth "ok (Depth Anything V2 Small, ~0.1 GB in $FH/depth)"; else say depth "FAILED (check the internet connection, then: bash setup.sh --depth)"; ok=0; fi
elif [ -f "$FH/depth/depth-anything-v2-small.onnx" ]; then say depth "ok (Depth Anything V2 Small)"
else say depth "optional, not installed — depth maps for NEW Clay Atlas stills: bash $SKILL/scripts/setup.sh --depth (~0.1 GB)"; fi
ACE="${ACE_STEP_DIR:-$(cat "$FH/acestep_path" 2>/dev/null || cat "$HOME/.vox-style-video/acestep_path" 2>/dev/null)}"
if [ -n "$ACE" ] && [ -f "$ACE/pyproject.toml" ]; then echo "$ACE" > "$FH/acestep_path"; say music "ok (ACE-Step at $ACE)"; else say music "optional, not installed — original scores for \$0: bash $SKILL/scripts/music/install_acestep.sh (~15 GB)"; fi
chmod +x "$SKILL"/scripts/*.sh "$SKILL"/scripts/py "$SKILL"/scripts/music/*.sh 2>/dev/null
[ $ok = 1 ] && echo "All set" || { echo "Fix the MISSING items above, then run setup.sh again."; exit 1; }
