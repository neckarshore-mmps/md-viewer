#!/usr/bin/env bash
# build.sh — assemble the self-contained HTML outputs from src/ + vendor/.
# No runtime dependencies: all CSS/JS are inlined. Re-run after editing src/ or
# updating vendored libs. Outputs:
#   viewer.html      — Finder tool template (base64 placeholders, injected by mdview)
#   web/index.html   — interactive web app (themes, drag/drop/paste), deployed to Vercel
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

SRC="src"
VENDOR="vendor"

# Verify inputs exist
for f in "$SRC/head.html" "$SRC/body.html" "$SRC/layout.css" "$SRC/app.js" \
         "$SRC/split-view.js" \
         "$SRC/web-head.html" "$SRC/web-body.html" "$SRC/web-app.js" \
         "$SRC/web-fonts.css" "$SRC/web-themes.css" "$SRC/web-chrome.css" \
         "$SRC/web-chrome-themes.css" "$SRC/web-md.css" \
         "$VENDOR/github-markdown.css" "$VENDOR/hljs-github-light.css" \
         "$VENDOR/hljs-github-dark.css" "$VENDOR/marked.min.js" \
         "$VENDOR/highlight.min.js" "$VENDOR/markdown.min.js" \
         "$VENDOR/dompurify.min.js" "CHANGELOG.md"; do
  [ -f "$f" ] || { echo "build.sh: missing $f" >&2; exit 1; }
done

# Shared: inline the JS libraries (marked, DOMPurify, highlight.js + markdown grammar).
emit_libs() {
  echo '<script>'
  cat "$VENDOR/marked.min.js"; echo ''
  cat "$VENDOR/dompurify.min.js"; echo ''
  cat "$VENDOR/highlight.min.js"; echo ''
  cat "$VENDOR/markdown.min.js"; echo ''
  echo '</script>'
}

# Finder tool template — GitHub styling, base64 placeholders injected by mdview.
emit_finder() {
  local out="viewer.html"
  {
    echo '<!doctype html>'; echo '<html lang="en">'; echo '<head>'
    cat "$SRC/head.html"
    echo '<title>md-viewer</title>'
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
    echo '</style>'; echo '</head>'; echo '<body>'
    cat "$SRC/body.html"
    emit_libs
    echo '<script>'; cat "$SRC/app.js"; echo '</script>'
    echo '<script>'; cat "$SRC/split-view.js"; echo '</script>'
    echo '</body>'; echo '</html>'
  } > "$out"
  echo "build.sh: wrote $out ($(wc -c < "$out" | tr -d ' ') bytes)"
}

# Web app — token-driven theme system (self-hosted fonts, 3 themes, light/dark).
emit_web() {
  mkdir -p web
  local out="web/index.html"
  {
    echo '<!doctype html>'; echo '<html lang="en">'; echo '<head>'
    cat "$SRC/head.html"
    echo '<title>Markdown Viewer — rendered + source, side by side</title>'
    cat "$SRC/web-head.html"
    echo '<style>'
    echo '/* --- fonts --- */';   cat "$SRC/web-fonts.css"
    echo '/* --- themes --- */';  cat "$SRC/web-themes.css"
    echo '/* --- chrome --- */';  cat "$SRC/web-chrome.css"
    echo '/* --- theme chrome --- */'; cat "$SRC/web-chrome-themes.css"
    echo '/* --- markdown + highlight --- */'; cat "$SRC/web-md.css"
    echo '</style>'; echo '</head>'; echo '<body>'
    cat "$SRC/web-body.html"
    emit_libs
    echo '<script>'; cat "$SRC/web-app.js"; echo '</script>'
    echo '<script>'; cat "$SRC/split-view.js"; echo '</script>'
    echo '</body>'; echo '</html>'
  } > "$out"

  # Embed the repo README as the default/sample document (base64 → injection-safe).
  local readme_b64; readme_b64=$(base64 < README.md | tr -d '\n')
  awk -v r="$readme_b64" '{ gsub(/__README_B64__/, r); print }' "$out" > "$out.tmp" && mv "$out.tmp" "$out"

  # Embed CHANGELOG.md so the footer "Changelog" link renders it in the viewer.
  local changelog_b64; changelog_b64=$(base64 < CHANGELOG.md | tr -d '\n')
  awk -v c="$changelog_b64" '{ gsub(/__CHANGELOG_B64__/, c); print }' "$out" > "$out.tmp" && mv "$out.tmp" "$out"

  # Footer VERSION — from CHANGELOG.md's top *released* entry (first "## vX.Y.Z",
  # skipping "## [Unreleased]"). Stable across builds: only a deliberate version cut
  # changes it, so the committed artifact never churns.
  #
  # Footer SHA is deliberately NOT sourced here. AD-42 §6 requires the true build-env
  # commit SHA (stale under squash-merge if taken from the changelog), injected at
  # DEPLOY time by scripts/vercel-inject-version.sh (wired via web/vercel.json). build.sh
  # leaves the __COMMIT_SHA__ / __COMMIT_SHA_FULL__ deploy tokens untouched so the
  # committed artifact stays churn-free; local preview shows "dev" (web-app.js fallback).
  local top_ver
  top_ver=$(grep -m1 -oE '^## v[0-9]+\.[0-9]+\.[0-9]+' CHANGELOG.md | awk '{print $2}')
  : "${top_ver:=v0.0.0}"
  awk -v v="$top_ver" '{ gsub(/__APP_VERSION__/, v); print }' "$out" > "$out.tmp" && mv "$out.tmp" "$out"

  echo "build.sh: wrote $out ($(wc -c < "$out" | tr -d ' ') bytes) — $top_ver (SHA @ deploy)"
}

# Bake the rendered README into #rendered of web/index.html so non-JS crawlers /
# AI fetchers see the intro prose (backlog #9). Uses jsdom + the vendored
# marked/dompurify — no browser. Fail-open: without node/jsdom the page still
# renders client-side exactly as before, so a bare checkout keeps building.
prerender_web() {
  if command -v node >/dev/null 2>&1 && [ -f node_modules/jsdom/package.json ]; then
    if node scripts/prerender.mjs web/index.html; then
      echo "build.sh: pre-rendered #rendered ($(wc -c < web/index.html | tr -d ' ') bytes)"
    else
      echo "build.sh: WARNING pre-render skipped (jsdom render failed) — #rendered stays client-rendered" >&2
    fi
  else
    echo "build.sh: WARNING node/jsdom unavailable — pre-render skipped, #rendered stays client-rendered" >&2
  fi
}

emit_finder
emit_web
prerender_web
