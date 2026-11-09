#!/bin/bash
# Start a new video from a style's working example.
#   bash new_video.sh <style> <short-name> [--from <example>] [--dir <parent>]     → ~/faceless-videos/<short-name>/
#   bash new_video.sh --list                                                        the styles and their examples
# styles: lamplit-ink (story cartoon, 9:16) · red-ghost (horror / true-crime reconstruction, 9:16 + 16:9)
#         sunlit-explainer (3D explainer: 16:9 people, or --from nuke-volcano for 9:16 objects)
#         stickman (what-if stick figures, 16:9 + 9:16) · clay-atlas (documentary over your own AI stills, 16:9)
# The copy is the full example (engine + sets + shots + its narration), so it renders straight away; then you
# rewrite script → voice → words → shots/sets → cues → mix → render (see styles/<style>/STYLE.md).
set -eu
SKILL="$(cd "$(dirname "$0")/.." && pwd)"
if [ "${1:-}" = "--list" ]; then
  for d in "$SKILL"/styles/*/; do
    s=$(basename "$d"); ex=""
    for e in "$d"example*/; do e=$(basename "$e"); [ "$e" = example ] && ex="$ex default" || ex="$ex ${e#example-}"; done
    printf '%-18s examples:%s\n' "$s" "$ex"
  done
  exit 0
fi
USAGE="usage: new_video.sh <lamplit-ink|red-ghost|sunlit-explainer|stickman|clay-atlas> <short-name> [--from <example>] [--dir <parent>]"
STYLE="${1:?$USAGE}"; NAME="${2:?short name missing — $USAGE}"; shift 2
PARENT="$HOME/faceless-videos"; FROM=""
while [ $# -gt 0 ]; do
  case "$1" in
    --dir) PARENT="${2:?}"; shift 2 ;;
    --from) FROM="${2:?}"; shift 2 ;;
    *) echo "unknown option: $1 ($USAGE)" >&2; exit 2 ;;
  esac
done
case "$STYLE" in
  lamplit*|ink|story|cartoon|beanie) STYLE=lamplit-ink ;;
  red*|ghost|horror|crime|true-crime) STYLE=red-ghost ;;
  sunlit*|explainer|3d|history|zack*) STYLE=sunlit-explainer ;;
  stick*|what-if|whatif) STYLE=stickman ;;
  clay*|atlas|documentary|doc) STYLE=clay-atlas ;;
  *) echo "unknown style: $STYLE (lamplit-ink | red-ghost | sunlit-explainer | stickman | clay-atlas)" >&2; exit 2 ;;
esac
SRC="$SKILL/styles/$STYLE/example"
if [ -n "$FROM" ] && [ "$FROM" != default ] && [ "$FROM" != example ]; then SRC="$SKILL/styles/$STYLE/example-${FROM#example-}"; fi
[ -d "$SRC" ] || { echo "no example '$FROM' for $STYLE — see: bash $0 --list" >&2; exit 2; }
DST="$PARENT/$NAME"
[ -e "$DST" ] && { echo "$DST already exists — pick another name or delete it first" >&2; exit 2; }
mkdir -p "$PARENT"; cp -R "$SRC" "$DST"
# the skill stores the example's audio compressed; the tools want WAV
[ -f "$DST/data/narration.flac" ] && ffmpeg -v error -y -i "$DST/data/narration.flac" -c:a pcm_s16le "$DST/data/narration.wav" && rm "$DST/data/narration.flac"
mkdir -p "$DST/renders" "$DST/review"
if [ -f "$DST/tools/build_chars.mjs" ]; then
  echo "sculpting + skinning the cast (data/chars/*.bin, ~15 s per character)…"
  (cd "$DST" && node tools/build_chars.mjs) > "$DST/data/build.log" 2>&1 || { echo "build_chars failed: see $DST/data/build.log" >&2; exit 1; }
fi
echo "$DST"
echo "style: $STYLE ($(basename "$SRC")) — read $SKILL/styles/$STYLE/STYLE.md before changing anything"
