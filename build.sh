#!/usr/bin/env bash
# build.sh — assemble the self-contained viewer.html from src/ + vendor/.
# No runtime dependencies: all CSS/JS are inlined. Re-run after editing src/ or
# updating vendored libs. Output: viewer.html (committed).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

SRC="src"
VENDOR="vendor"
OUT="viewer.html"

# Verify inputs exist
for f in "$SRC/head.html" "$SRC/body.html" "$SRC/layout.css" "$SRC/app.js" \
         "$VENDOR/github-markdown.css" "$VENDOR/hljs-github-light.css" \
         "$VENDOR/hljs-github-dark.css" "$VENDOR/marked.min.js" \
         "$VENDOR/highlight.min.js" "$VENDOR/markdown.min.js" \
         "$VENDOR/dompurify.min.js"; do
  [ -f "$f" ] || { echo "build.sh: missing $f" >&2; exit 1; }
done

{
  echo '<!doctype html>'
  echo '<html lang="en">'
  echo '<head>'
  cat "$SRC/head.html"
  echo '<style>'
  echo '/* --- github-markdown-css (rendered pane, auto light/dark) --- */'
  cat "$VENDOR/github-markdown.css"
  echo '/* --- highlight.js theme: light base --- */'
  cat "$VENDOR/hljs-github-light.css"
  echo '/* --- highlight.js theme: dark override --- */'
  echo '@media (prefers-color-scheme: dark) {'
  cat "$VENDOR/hljs-github-dark.css"
  echo '}'
  echo '/* --- md-viewer layout --- */'
  cat "$SRC/layout.css"
  echo '</style>'
  echo '</head>'
  echo '<body>'
  cat "$SRC/body.html"
  echo '<script>'
  cat "$VENDOR/marked.min.js"
  echo ''
  cat "$VENDOR/dompurify.min.js"
  echo ''
  cat "$VENDOR/highlight.min.js"
  echo ''
  cat "$VENDOR/markdown.min.js"
  echo ''
  echo '</script>'
  echo '<script>'
  cat "$SRC/app.js"
  echo '</script>'
  echo '</body>'
  echo '</html>'
} > "$OUT"

bytes=$(wc -c < "$OUT" | tr -d ' ')
echo "build.sh: wrote $OUT (${bytes} bytes)"
