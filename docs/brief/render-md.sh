#!/usr/bin/env bash
# Render any candidate-facing Markdown doc to a branded PDF in the same look as
# docs/CANDIDATE-BRIEF.pdf, without touching a single word of the source.
#
#   docs/brief/render-md.sh <input.md> <output.pdf> [pill label]
#
# The Markdown is converted with `marked` (GFM), the H1 becomes the hero
# headline verbatim, everything else keeps its Markdown structure. Styles and
# the wordmark are lifted from docs/brief/CANDIDATE-BRIEF.print.html so the two
# renderers never drift. Needs Google Chrome (headless) and network access for
# the two Google Fonts + the marked CLI.
set -euo pipefail

IN="$1"; OUT="$2"; PILL="${3:-Assessment brief}"
cd "$(dirname "$0")/../.."
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
TEMPLATE="docs/brief/CANDIDATE-BRIEF.print.html"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# 1. Markdown -> HTML body (GFM tables, no smart-quote rewriting).
npx -y marked --gfm -i "$IN" > "$TMP/body.html"

# 2. Headline = the H1, verbatim; drop it from the body so it isn't printed twice.
H1="$(perl -0ne 'print $1 if /<h1[^>]*>(.*?)<\/h1>/s' "$TMP/body.html")"
perl -0pe 's/<h1[^>]*>.*?<\/h1>\s*//s' "$TMP/body.html" > "$TMP/rest.html"

# 3. Reuse the brief's stylesheet and wordmark.
STYLE="$(sed -n '/<style>/,/<\/style>/p' "$TEMPLATE")"
WORDMARK="$(sed -n '/<svg class="wordmark"/,/<\/svg>/p' "$TEMPLATE")"

cat > "$TMP/page.html" <<HTML
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${H1}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Inclusive+Sans:wght@400&display=swap" rel="stylesheet">
${STYLE}
<style>
  /* Markdown-generated structure, mapped onto the brief's language. */
  .hero { padding-bottom: 18px; }
  .hero h1 { max-width: none; font-size: 22pt; }
  main > p { margin-top: 9px; }
  main > h2 { margin-top: 18px; }
  main > h3 { margin-top: 12px; }
  main blockquote { display: flex; gap: 10px; align-items: flex-start; margin: 14px 0; border-radius: 12px; background: var(--blush); color: var(--plum); padding: 10px 14px; font-size: 9.4pt; }
  main blockquote::before { content: ""; width: 8px; height: 8px; border-radius: 999px; background: var(--plum); margin-top: 6px; flex: none; }
  main blockquote p { margin: 0; }
  main ol { margin: 6px 0 0; padding-left: 20px; }
  main li { margin: 3px 0; }
  main td { padding: 5px 10px; }
  main blockquote { margin: 12px 0; }
  main ol li::marker { color: var(--forest); font-weight: 600; }
  main li p { margin: 0; }
  main table { margin: 8px 0 4px; }
  main hr { border: 0; border-top: 1px solid var(--border); margin: 18px 0; }
  main > p:last-child { margin-top: 14px; padding-top: 10px; border-top: 1px solid var(--border); color: var(--muted); font-size: 9.4pt; break-before: avoid; }
</style>
</head>
<body>
<header class="hero">
  <div class="hero-top">
    ${WORDMARK}
    <span class="pill">${PILL}</span>
  </div>
  <h1>${H1}</h1>
</header>
<main>
$(cat "$TMP/rest.html")
</main>
</body>
</html>
HTML

# 4. Print through headless Chrome.
"$CHROME" --headless=new --disable-gpu --no-pdf-header-footer \
  --virtual-time-budget=8000 \
  --print-to-pdf="$PWD/$OUT" "file://$TMP/page.html" >/dev/null 2>&1

echo "wrote $OUT ($(du -h "$OUT" | cut -f1))"
