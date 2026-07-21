#!/usr/bin/env bash
# web-smoke.sh — smoke test for the web app build (web/index.html).
# Asserts the theme system, README embed, fonts and libs are wired correctly,
# and that the Finder tool smoke test still passes. Exits non-zero on failure.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="$ROOT/web/index.html"
fail=0
pass() { echo "  ok   - $1"; }
die()  { echo "  FAIL - $1" >&2; fail=1; }
# rollup(): see test/smoke.sh for the full rationale. A whole CHILD SUITE passed,
# invoked with its stdout suppressed. Deliberately NOT an "ok - " line — the emitter
# runs that child standalone and counts its own ok-lines; an "ok - " here would count
# the entire child suite a second time as one line (CASCADE-DOUBLE-COUNT).
rollup() { echo "  ok*  - $1 (child suite — counted in its own standalone run)"; }

echo "==> md-viewer web smoke test"
"$ROOT/build.sh" >/dev/null

[ -f "$OUT" ] && pass "web/index.html built" || die "web/index.html missing"

# Theme system: 2 themes × 2 modes = 4 colour token blocks.
n=$(grep -o 'data-theme="[a-z]*"\]\[data-mode' "$OUT" | wc -l | tr -d ' ')
[ "$n" -eq 4 ] && pass "4 theme×mode token blocks" || die "expected 4 theme×mode blocks, got $n"
for t in minimalist swiss; do
  grep -q "data-theme=\"$t\"" "$OUT" && pass "theme present: $t" || die "theme missing: $t"
done
grep -q 'data-theme="brutalist"' "$OUT" && die "brutalist theme should be removed" || pass "brutalist removed"
grep -q "mdv-theme" "$OUT" && pass "no-FOUC init present" || die "theme init missing"

# SEO tags.
grep -q 'name="description"' "$OUT" && pass "meta description" || die "meta description missing"
grep -q 'rel="canonical"' "$OUT" && pass "canonical link" || die "canonical missing"
grep -q 'property="og:title"' "$OUT" && pass "Open Graph tags" || die "OG tags missing"
grep -q 'application/ld+json' "$OUT" && pass "JSON-LD schema" || die "JSON-LD missing"
grep -q '<title>Markdown Viewer' "$OUT" && pass "descriptive web title" || die "web title not descriptive"
[ -f "$ROOT/web/robots.txt" ] && pass "robots.txt present" || die "robots.txt missing"
[ -f "$ROOT/web/sitemap.xml" ] && pass "sitemap.xml present" || die "sitemap.xml missing"

# How-it-works page + nav link.
[ -f "$ROOT/web/how-it-works.html" ] && pass "how-it-works page present" || die "how-it-works.html missing"
grep -q 'href="/how-it-works"' "$OUT" && pass "how-it-works nav link" || die "how-it-works nav link missing"

# README embedded (base64 prefix of README.md must appear; no leftover placeholder).
grep -qF "$(base64 < "$ROOT/README.md" | tr -d '\n' | cut -c1-40)" "$OUT" && pass "README payload embedded" || die "README not embedded"
grep -q "__README_B64__" "$OUT" && die "unresolved __README_B64__ placeholder" || pass "README placeholder resolved"

# Backlog #9: the rendered README is baked into #rendered as STATIC HTML so non-JS
# crawlers / AI fetchers see the intro prose — checked on the raw file, no browser.
grep -q '<article id="rendered" class="rendered"></article>' "$OUT" \
  && die "#rendered is empty — pre-render did not run" \
  || pass "#rendered pre-rendered (not the empty anchor)"
grep -q '<h1>md-viewer</h1>' "$OUT" \
  && pass "rendered README H1 present as static HTML" \
  || die "README H1 not pre-rendered into #rendered"

# Fonts: all 8 woff2 referenced + files present.
refs=$(grep -o './fonts/[a-z0-9-]*\.woff2' "$OUT" | sort -u | wc -l | tr -d ' ')
[ "$refs" -eq 5 ] && pass "5 font files referenced" || die "expected 5 font refs, got $refs"
files=$(ls "$ROOT"/web/fonts/*.woff2 2>/dev/null | wc -l | tr -d ' ')
[ "$files" -eq 5 ] && pass "5 font files present" || die "expected 5 font files, got $files"

# Round-2 features present.
grep -q 'id="themeMenuList"' "$OUT" && pass "theme dropdown present" || die "theme dropdown missing"
grep -q 'theme chrome' "$OUT" && pass "theme-scoped chrome inlined" || die "web-chrome-themes not inlined"
grep -q 'class="grid-rail"' "$OUT" && pass "grid rail markup present" || die "grid rail missing"
grep -q 'font-size: 14px' "$OUT" && pass "raw font bumped to 14px" || die "raw font size not 14px"

# Libraries inlined (offline).
for lib in marked DOMPurify hljs; do
  grep -q "$lib" "$OUT" && pass "$lib inlined" || die "$lib not inlined"
done

# Shared split-view module inlined into both targets.
grep -q "mdv-split-view" "$OUT" && pass "split-view inlined (web)" || die "split-view.js not inlined in web/index.html"
grep -q "mdv-split-view" "$ROOT/viewer.html" && pass "split-view inlined (finder)" || die "split-view.js not inlined in viewer.html"

# Split-layout structure: mobile tabs + divider a11y in both targets; Readme relabel.
grep -q 'class="viewtabs"' "$ROOT/viewer.html" && pass "viewtabs present (finder)" || die "viewtabs missing in viewer.html"
grep -q 'class="viewtabs"' "$OUT" && pass "viewtabs present (web)" || die "viewtabs missing in web/index.html"
grep -q 'role="separator"' "$ROOT/viewer.html" && pass "divider a11y (finder)" || die "divider a11y missing in viewer.html"
grep -q 'role="separator"' "$OUT" && pass "divider a11y (web)" || die "divider a11y missing in web/index.html"
grep -q '>Readme' "$OUT" && pass "Readme label present" || die "Readme label missing in web/index.html"

# Finder tool untouched + still green.
grep -q "splitFrontmatter" "$OUT" && pass "frontmatter splitter inlined" || die "frontmatter splitter not inlined"

# Changelog + footer version-info (AD-42 variant A): product · version · commit-linked SHA · Changelog.
grep -q 'id="changelog"' "$OUT" && pass "Changelog link present" || die "Changelog link missing"
grep -q 'class="ver-app">md-viewer' "$OUT" && pass "footer product name present" || die "footer product name missing"
grep -qE 'ver-tag">v[0-9]+\.[0-9]+\.[0-9]+' "$OUT" && pass "footer version resolved from CHANGELOG" || die "footer version not resolved"
grep -q 'id="verSha"' "$OUT" && pass "footer SHA link present" || die "footer SHA link missing"
grep -q 'commit/__COMMIT_SHA_FULL__' "$OUT" && pass "SHA is a deploy slot (build-env, not changelog — AD-42 §6)" || die "SHA deploy slot missing"

# Hidden Swiss Grid style guide. Two gestures on the theme selector: a DOUBLE click
# renders the guide as Markdown in the viewer; a TRIPLE click opens the HTML page
# (/style-guide). Deliberately not linked/searchable. The Markdown payload is base64
# into __STYLE_GUIDE_B64__, so its verbatim token docs never leak into the plaintext
# greps above (theme-block count, brutalist check).
grep -qF "$(base64 < "$ROOT/src/web-style-guide.md" | tr -d '\n' | cut -c1-40)" "$OUT" \
  && pass "style-guide markdown payload embedded" || die "style-guide markdown payload not embedded"
grep -q 'var STYLE_GUIDE' "$OUT" && pass "style-guide constant present" || die "style-guide constant missing"
grep -q 'render(STYLE_GUIDE' "$OUT" && pass "double-click → markdown demo wired" || die "double-click markdown trigger missing"
grep -qF 'window.location.href = "/style-guide"' "$OUT" && pass "triple-click → HTML page wired" || die "triple-click HTML trigger missing"

# The HTML style-guide page itself (static, hand-authored in web/, noindex).
SG_HTML="$ROOT/web/style-guide.html"
[ -f "$SG_HTML" ] && pass "web/style-guide.html present" || die "web/style-guide.html missing"
grep -q 'content="noindex, nofollow"' "$SG_HTML" && pass "style-guide.html is noindex" || die "style-guide.html not noindex"
grep -q 'Swiss Grid — Style Guide' "$SG_HTML" && pass "style-guide.html has Swiss Grid heading" || die "style-guide.html heading missing"

# __COMMIT_SHA__ / __COMMIT_SHA_FULL__ are INTENTIONAL deploy slots (resolved at deploy by
# scripts/vercel-inject-version.sh) — excluded here on purpose. The rest must be resolved.
grep -qE '__README_B64__|__CHANGELOG_B64__|__STYLE_GUIDE_B64__|__APP_VERSION__|__APP_SHA__' "$OUT" \
  && die "unresolved build placeholder remains" || pass "build placeholders resolved"
grep -q "mdv-properties" "$OUT" && pass "properties panel styled" || die "properties panel CSS missing"

# Prove the deploy-time SHA injection resolves the tokens (churn-free — runs on a copy).
inj="$(mktemp)"; cp "$OUT" "$inj"
VERCEL_GIT_COMMIT_SHA=abcdef1234567890abcdef1234567890abcdef12 \
  bash "$ROOT/scripts/vercel-inject-version.sh" "$inj" >/dev/null
grep -q '<code>abcdef1</code>' "$inj" && pass "deploy injects the short SHA" || die "deploy short SHA not injected"
grep -q 'commit/abcdef1234567890abcdef1234567890abcdef12' "$inj" && pass "deploy injects the commit URL" || die "deploy commit URL not injected"
grep -qE '__COMMIT_SHA__|__COMMIT_SHA_FULL__' "$inj" && die "deploy tokens survived injection" || pass "all deploy tokens resolved at deploy"
rm -f "$inj"

echo "==> delegating to Finder smoke test"
"$ROOT/test/smoke.sh" >/dev/null && rollup "Finder smoke test passes" || die "Finder smoke test failed"

if [ "$fail" -ne 0 ]; then echo "==> WEB SMOKE TEST FAILED"; exit 1; fi
echo "==> WEB SMOKE TEST PASSED"
