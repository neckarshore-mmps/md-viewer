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
# rollup(): a whole CHILD SUITE passed, invoked here with its stdout suppressed.
# Deliberately NOT an "ok - " line. The estate stats emitter counts one test per
# "ok - " line per suite (test-stats-action, node/bash family). The child prints its
# OWN ok-lines when the emitter runs it standalone, so an "ok - " here would count
# that entire suite a SECOND time, as a single line — the CASCADE-DOUBLE-COUNT shape.
# The "ok*" prefix keeps the result visible to a human reading this output while
# staying outside the counter's `^[[:space:]]*ok[[:space:]]+-` regex. Print only —
# pass/fail semantics are unchanged (the caller still uses rollup/die for the verdict).
# Use ONLY where another suite is invoked; a self-contained assertion is a pass().
rollup() { echo "  ok*  - $1 (child suite — counted in its own standalone run)"; }

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
  rollup "frontmatter parser unit test"
else
  die "frontmatter parser unit test failed"
fi
grep -q "splitFrontmatter" "$ROOT/viewer.html" && pass "frontmatter splitter inlined" || die "frontmatter splitter not inlined"

# 7. Relative-URL resolver: unit test passes.
if node "$ROOT/test/url-resolve.test.mjs" >/dev/null 2>&1; then
  rollup "relative-URL resolver unit test"
else
  die "relative-URL resolver unit test failed"
fi

# 8. Quick action "Compare": workflow targets PDFs, the installer wires both launchers,
#    and bin/mdcompare calls md-converter correctly and fails visibly. A fake uv on PATH
#    stands in for the converter, so this runs on Linux CI without Python.
CWF="$ROOT/quick-action/Compare.workflow/Contents"
grep -q "com.adobe.pdf" "$CWF/Info.plist" && pass "Compare quick action accepts PDFs" || die "Compare workflow does not target PDFs"
grep -q "__MDCOMPARE_BIN__" "$CWF/document.wflow" && pass "Compare workflow calls the mdcompare placeholder" || die "Compare workflow placeholder missing"

QA_TMP="$(mktemp -d "${TMPDIR:-/tmp}/md-qa.XXXXXX")"
HOME="$QA_TMP/home" "$ROOT/install.sh" >/dev/null
for wf in "View Markdown" "Compare"; do
  doc="$QA_TMP/home/Library/Services/$wf.workflow/Contents/document.wflow"
  if [ -f "$doc" ] && ! grep -q "__MD" "$doc"; then pass "install.sh installs and wires \"$wf\""; else die "install.sh did not wire \"$wf\""; fi
done
grep -q "$ROOT/bin/mdcompare" "$QA_TMP/home/Library/Services/Compare.workflow/Contents/document.wflow" \
  && pass "installed Compare points at bin/mdcompare" || die "installed Compare does not point at bin/mdcompare"
HOME="$QA_TMP/home" "$ROOT/uninstall.sh" >/dev/null
[ ! -e "$QA_TMP/home/Library/Services/Compare.workflow" ] && pass "uninstall.sh removes Compare" || die "uninstall.sh left Compare behind"

mkdir -p "$QA_TMP/bin"
cat > "$QA_TMP/bin/uv" <<'FAKE'
#!/usr/bin/env bash
echo "$*" > "$FAKE_UV_ARGS"
if [ "${FAKE_UV_MODE:-ok}" = "ok" ]; then echo "/tmp/md-compare-x/doc.compare.html"; exit 0; fi
echo "FAIL doc.pdf: not a readable PDF" >&2; exit 1
FAKE
chmod +x "$QA_TMP/bin/uv"
export FAKE_UV_ARGS="$QA_TMP/uv-args"
out="$(PATH="$QA_TMP/bin:$PATH" MDCOMPARE_QUIET=1 MDCOMPARE_NO_OPEN=1 "$ROOT/bin/mdcompare" "$QA_TMP/doc.pdf" 2>/dev/null)" && rc=0 || rc=$?
[ "$rc" -eq 0 ] && [ "$out" = "/tmp/md-compare-x/doc.compare.html" ] && pass "mdcompare prints the page path" || die "mdcompare did not print the page path (rc=$rc)"
grep -q -- "run --quiet --project $ROOT/converter md-converter compare $QA_TMP/doc.pdf --no-open" "$FAKE_UV_ARGS" \
  && pass "mdcompare calls md-converter compare in converter/" || die "mdcompare called uv with: $(cat "$FAKE_UV_ARGS")"
err="$(PATH="$QA_TMP/bin:$PATH" FAKE_UV_MODE=fail MDCOMPARE_QUIET=1 "$ROOT/bin/mdcompare" "$QA_TMP/doc.pdf" 2>&1 >/dev/null)" && rc=0 || rc=$?
[ "$rc" -ne 0 ] && echo "$err" | grep -q "not a readable PDF" && pass "mdcompare fails visibly with the reason" || die "mdcompare failure not surfaced (rc=$rc)"
rm -rf "$QA_TMP"

if [ "$fail" -ne 0 ]; then
  echo "==> SMOKE TEST FAILED"
  exit 1
fi
echo "==> SMOKE TEST PASSED"
