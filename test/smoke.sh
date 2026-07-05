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

# 2. Vendored libs must be inlined (offline / self-contained).
grep -q "marked" "$ROOT/viewer.html" && pass "marked inlined" || die "marked not inlined"
grep -q "hljs" "$ROOT/viewer.html" && pass "highlight.js inlined" || die "highlight.js not inlined"
grep -q "DOMPurify" "$ROOT/viewer.html" && pass "DOMPurify inlined" || die "DOMPurify not inlined"
grep -q "markdown-body" "$ROOT/viewer.html" && pass "github-markdown css inlined" || die "markdown css not inlined"

# 3. mdview must generate output with placeholders resolved.
out="$(MDVIEW_NO_OPEN=1 "$ROOT/bin/mdview" "$FIXTURE")"
[ -f "$out" ] && pass "mdview generated $out" || die "mdview produced no output"
if grep -q "__MD_BASE64__\|__MD_FILENAME_B64__" "$out"; then
  die "unresolved placeholders remain in output"
else
  pass "all placeholders resolved"
fi

# 4. Payload round-trips: the fixture's base64 must appear in the output.
expected_b64="$(base64 < "$FIXTURE" | tr -d '\n')"
grep -qF "$expected_b64" "$out" && pass "MD payload embedded" || die "MD payload not embedded"

# 5. mdview must reject a missing file.
if MDVIEW_NO_OPEN=1 "$ROOT/bin/mdview" "$ROOT/test/does-not-exist.md" >/dev/null 2>&1; then
  die "mdview did not fail on missing file"
else
  pass "mdview rejects missing file"
fi

rm -f "$out"

if [ "$fail" -ne 0 ]; then
  echo "==> SMOKE TEST FAILED"
  exit 1
fi
echo "==> SMOKE TEST PASSED"
