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

# Theme system: 6 colour token blocks + 3 font/structure blocks = 9 data-theme selectors.
n=$(grep -o 'data-theme="[a-z]*"\]\[data-mode' "$OUT" | wc -l | tr -d ' ')
[ "$n" -eq 6 ] && pass "6 theme×mode token blocks" || die "expected 6 theme×mode blocks, got $n"
for t in minimalist swiss brutalist; do
  grep -q "data-theme=\"$t\"" "$OUT" && pass "theme present: $t" || die "theme missing: $t"
done
grep -q "mdv-theme" "$OUT" && pass "no-FOUC init present" || die "theme init missing"

# README embedded (base64 prefix of README.md must appear; no leftover placeholder).
grep -qF "$(base64 < "$ROOT/README.md" | tr -d '\n' | cut -c1-40)" "$OUT" && pass "README payload embedded" || die "README not embedded"
grep -q "__README_B64__" "$OUT" && die "unresolved __README_B64__ placeholder" || pass "README placeholder resolved"

# Fonts: all 8 woff2 referenced + files present.
refs=$(grep -o './fonts/[a-z0-9-]*\.woff2' "$OUT" | sort -u | wc -l | tr -d ' ')
[ "$refs" -eq 8 ] && pass "8 font files referenced" || die "expected 8 font refs, got $refs"
files=$(ls "$ROOT"/web/fonts/*.woff2 2>/dev/null | wc -l | tr -d ' ')
[ "$files" -eq 8 ] && pass "8 font files present" || die "expected 8 font files, got $files"

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
echo "==> delegating to Finder smoke test"
"$ROOT/test/smoke.sh" >/dev/null && pass "Finder smoke test passes" || die "Finder smoke test failed"

if [ "$fail" -ne 0 ]; then echo "==> WEB SMOKE TEST FAILED"; exit 1; fi
echo "==> WEB SMOKE TEST PASSED"
