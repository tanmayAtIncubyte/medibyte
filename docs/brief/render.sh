#!/usr/bin/env bash
# Re-render docs/CANDIDATE-BRIEF.pdf from docs/brief/CANDIDATE-BRIEF.print.html.
#
# The print HTML is the branded layout of docs/CANDIDATE-BRIEF.md — when the
# markdown changes, update the HTML to match, then run this from the repo root:
#
#   docs/brief/render.sh
#
# Needs Google Chrome (headless) and network access for the two Google Fonts.
set -euo pipefail

cd "$(dirname "$0")/../.."
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
SRC="$PWD/docs/brief/CANDIDATE-BRIEF.print.html"
OUT="$PWD/docs/CANDIDATE-BRIEF.pdf"

"$CHROME" --headless=new --disable-gpu --no-pdf-header-footer \
  --virtual-time-budget=8000 \
  --print-to-pdf="$OUT" "file://$SRC" >/dev/null 2>&1

echo "wrote $OUT ($(du -h "$OUT" | cut -f1))"
