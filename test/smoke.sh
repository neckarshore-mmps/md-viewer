#!/usr/bin/env bash
# smoke.sh — end-to-end smoke test for md-viewer.
# Builds the viewer, runs mdview on the fixture (no browser), and asserts the
# generated HTML is well-formed: no leftover placeholders, payload embedded,
# and required libraries/markup present. Exits non-zero on any failure.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FIXTURE="$ROOT/test/fixture.md"
fail=0

pass() { echo "  ok   - $1"; }
die()  { echo "  FAIL - $1" >&2; fail=1; }

echo "==> md-viewer smoke test"

# 1. Build must succeed and produce viewer.html with both placeholders.
"$ROOT/build.sh" >/dev/null
[ -f "$ROOT/viewer.html" ] && pass "build produced viewer.html" || die "viewer.html missing"
grep -q "__MD_BASE64__" "$ROOT/viewer.html" && pass "template has MD placeholder" || die "MD placeholder missing"
grep -q "__MD_FILENAME_B64__" "$ROOT/viewer.html" && pass "template has filename placeholder" || die "filename placeholder missing"
grep -q "__MD_BASEDIR_B64__" "$ROOT/viewer.html" && pass "template has base-dir placeholder" || die "base-dir placeholder missing"
grep -q "__MD_ROOT_B64__" "$ROOT/viewer.html" && pass "template has containment-root placeholder" || die "containment-root placeholder missing"
grep -q "resolveRelativeUrl" "$ROOT/viewer.html" && pass "relative-URL resolver inlined" || die "relative-URL resolver not inlined"
grep -q "isUnder" "$ROOT/viewer.html" && pass "containment check inlined" || die "containment check not inlined"

# 2. Vendored libs must be inlined (offline / self-contained).
grep -q "marked" "$ROOT/viewer.html" && pass "marked inlined" || die "marked not inlined"
grep -q "hljs" "$ROOT/viewer.html" && pass "highlight.js inlined" || die "highlight.js not inlined"
grep -q "DOMPurify" "$ROOT/viewer.html" && pass "DOMPurify inlined" || die "DOMPurify not inlined"
grep -q "markdown-body" "$ROOT/viewer.html" && pass "github-markdown css inlined" || die "markdown css not inlined"

# 3. mdview must generate output with placeholders resolved.
out="$(MDVIEW_NO_OPEN=1 "$ROOT/bin/mdview" "$FIXTURE")"
[ -f "$out" ] && pass "mdview generated $out" || die "mdview produced no output"
if grep -q "__MD_BASE64__\|__MD_FILENAME_B64__\|__MD_BASEDIR_B64__\|__MD_ROOT_B64__" "$out"; then
  die "unresolved placeholders remain in output"
else
  pass "all placeholders resolved"
fi

# 4. Payload round-trips: the fixture's base64 must appear in the output.
expected_b64="$(base64 < "$FIXTURE" | tr -d '\n')"
grep -qF "$expected_b64" "$out" && pass "MD payload embedded" || die "MD payload not embedded"

# 4b. Source dir round-trips: the fixture's absolute dir (base64) must be embedded
# so app.js can resolve relative image/link URLs against it at render time.
dir_b64="$(printf '%s' "$(cd "$(dirname "$FIXTURE")" && pwd)" | base64 | tr -d '\n')"
grep -qF "$dir_b64" "$out" && pass "source dir embedded" || die "source dir not embedded"

# 5. mdview must reject a missing file.
if MDVIEW_NO_OPEN=1 "$ROOT/bin/mdview" "$ROOT/test/does-not-exist.md" >/dev/null 2>&1; then
  die "mdview did not fail on missing file"
else
  pass "mdview rejects missing file"
fi

rm -f "$out"

# 6. Frontmatter: parser unit test passes and the splitter is wired into the build.
if node "$ROOT/test/frontmatter.test.mjs" >/dev/null 2>&1; then
  pass "frontmatter parser unit test"
else
  die "frontmatter parser unit test failed"
fi
grep -q "splitFrontmatter" "$ROOT/viewer.html" && pass "frontmatter splitter inlined" || die "frontmatter splitter not inlined"

# 7. Relative-URL resolver: unit test passes.
if node "$ROOT/test/url-resolve.test.mjs" >/dev/null 2>&1; then
  pass "relative-URL resolver unit test"
else
  die "relative-URL resolver unit test failed"
fi

if [ "$fail" -ne 0 ]; then
  echo "==> SMOKE TEST FAILED"
  exit 1
fi
echo "==> SMOKE TEST PASSED"
