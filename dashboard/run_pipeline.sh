#!/usr/bin/env bash
set -euo pipefail

PROJECT="${1:?project directory required}"
STYLE="${2:?style required}"
ASPECT="${3:?aspect required}"
QUALITY="${4:?quality required}"

SKILL="$(cd "$(dirname "${BASH_SOURCE[0]}")/../faceless-videos" && pwd)"
PY="$SKILL/scripts/py"
export SKILL

case "$STYLE:$ASPECT" in
  lamplit-ink:9:16|red-ghost:9:16|red-ghost:16:9|sunlit-explainer:16:9|sunlit-explainer:9:16|stickman:16:9|stickman:9:16|clay-atlas:16:9) ;;
  *) echo "Unsupported style/aspect combination: $STYLE $ASPECT" >&2; exit 2 ;;
esac
case "$QUALITY" in draft|full) ;; *) echo "Unsupported quality: $QUALITY" >&2; exit 2 ;; esac

test -f "$PROJECT/index.html" || { echo "Project has no index.html" >&2; exit 2; }
test -f "$PROJECT/tools/capture.mjs" || { echo "Project has no tools/capture.mjs" >&2; exit 2; }
cd "$PROJECT"

if [[ "$STYLE" == "lamplit-ink" ]]; then
  "$PY" "$SKILL/scripts/voice.py" . --voice bm_george --speed 1.0 --gap 0.24 --para 0.6 --short 0.42
elif [[ "$STYLE" == "stickman" ]]; then
  test -f tools/voice.py || { echo "Stickman project is missing tools/voice.py" >&2; exit 2; }
  "$PY" tools/voice.py .
else
  "$PY" "$SKILL/scripts/voice.py" .
fi
"$PY" "$SKILL/scripts/words.py" .

if [[ "$STYLE" == "sunlit-explainer" && -f tools/build_chars.mjs ]]; then
  node tools/build_chars.mjs
fi
if [[ "$STYLE" == "clay-atlas" && -d stills ]]; then
  "$PY" "$SKILL/scripts/depth.py" stills
fi

node tools/capture.mjs cues data/cues.json
DURATION="$(node tools/capture.mjs eval 'OP.duration()' | head -n 1)"
if [[ "$STYLE" == "lamplit-ink" || "$STYLE" == "stickman" ]]; then
  "$PY" tools/mix.py . "$DURATION"
else
  "$PY" tools/mix.py .
fi

node tools/capture.mjs check
mkdir -p renders
render=(node tools/capture.mjs video renders/captured.mp4 0 -1 1 --audio)
if [[ "$QUALITY" == "draft" ]]; then
  render+=(--draft)
fi

case "$STYLE:$ASPECT" in
  red-ghost:16:9) QS=_land "${render[@]}" ;;
  sunlit-explainer:9:16) QS='&port' "${render[@]}" ;;
  stickman:9:16) AR=9x16 "${render[@]}" ;;
  *) "${render[@]}" ;;
esac

if [[ "$QUALITY" == "full" ]]; then
  ffmpeg -v error -y -i renders/captured.mp4 \
    -c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p \
    -c:a copy -movflags +faststart renders/video.mp4
else
  mv renders/captured.mp4 renders/video.mp4
fi
rm -f renders/captured.mp4
