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

# Finder tool untouched + still green.
grep -q "splitFrontmatter" "$OUT" && pass "frontmatter splitter inlined" || die "frontmatter splitter not inlined"
grep -q "mdv-properties" "$OUT" && pass "properties panel styled" || die "properties panel CSS missing"

echo "==> delegating to Finder smoke test"
"$ROOT/test/smoke.sh" >/dev/null && pass "Finder smoke test passes" || die "Finder smoke test failed"

if [ "$fail" -ne 0 ]; then echo "==> WEB SMOKE TEST FAILED"; exit 1; fi
echo "==> WEB SMOKE TEST PASSED"
