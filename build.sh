#!/usr/bin/env bash
# build.sh — assemble the self-contained HTML outputs from src/ + vendor/.
# No runtime dependencies: all CSS/JS are inlined. Re-run after editing src/ or
# updating vendored libs. Outputs:
#   viewer.html      — Finder tool template (base64 placeholders, injected by mdview)
#   web/index.html   — interactive web app (drag/drop/paste), deployed to Vercel
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

SRC="src"
VENDOR="vendor"

# Verify inputs exist
for f in "$SRC/head.html" "$SRC/body.html" "$SRC/layout.css" "$SRC/app.js" \
         "$SRC/web-body.html" "$SRC/web-layout.css" "$SRC/web-app.js" \
         "$VENDOR/github-markdown.css" "$VENDOR/hljs-github-light.css" \
         "$VENDOR/hljs-github-dark.css" "$VENDOR/marked.min.js" \
         "$VENDOR/highlight.min.js" "$VENDOR/markdown.min.js" \
         "$VENDOR/dompurify.min.js"; do
  [ -f "$f" ] || { echo "build.sh: missing $f" >&2; exit 1; }
done

# emit_html <out> <body-file> <extra-css-file-or-empty> <app-js-file>
emit_html() {
  local out="$1" body="$2" extra_css="$3" app_js="$4"
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
    if [ -n "$extra_css" ]; then
      echo "/* --- extra: $extra_css --- */"
      cat "$extra_css"
    fi
    echo '</style>'
    echo '</head>'
    echo '<body>'
    cat "$body"
    echo '<script>'
    cat "$VENDOR/marked.min.js"; echo ''
    cat "$VENDOR/dompurify.min.js"; echo ''
    cat "$VENDOR/highlight.min.js"; echo ''
    cat "$VENDOR/markdown.min.js"; echo ''
    echo '</script>'
    echo '<script>'
    cat "$app_js"
    echo '</script>'
    echo '</body>'
    echo '</html>'
  } > "$out"
  local bytes; bytes=$(wc -c < "$out" | tr -d ' ')
  echo "build.sh: wrote $out (${bytes} bytes)"
}

# 1. Finder tool template
emit_html "viewer.html" "$SRC/body.html" "" "$SRC/app.js"

# 2. Interactive web app
mkdir -p web
emit_html "web/index.html" "$SRC/web-body.html" "$SRC/web-layout.css" "$SRC/web-app.js"
