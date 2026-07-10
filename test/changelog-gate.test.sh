#!/usr/bin/env bash
# changelog-gate.test.sh — smoke test for scripts/changelog-gate.sh (AD-42 gate).
# Drives the gate in test mode (fixtures via env, no real PR / git) and asserts the
# three mandated outcomes plus a docs-only sanity case. Exits non-zero on any failure.
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
GATE="$ROOT/scripts/changelog-gate.sh"
chmod +x "$GATE" 2>/dev/null || true

fail=0
pass() { echo "  ok   - $1"; }
die()  { echo "  FAIL - $1" >&2; fail=1; }

echo "==> changelog-gate smoke test"

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

# Base CHANGELOG: an empty [Unreleased] block.
cat > "$tmp/base.md" <<'MD'
# Changelog

## [Unreleased]

## v0.5.0 — 2026-07-10

**Headline** · `abcdef0`

- An existing shipped bullet. ([#1](https://example.com/pull/1))
MD

# Head CHANGELOG: same, plus one fresh [Unreleased] bullet.
cat > "$tmp/head-with-entry.md" <<'MD'
# Changelog

## [Unreleased]

- A new user-facing thing you can now do. ([#28](https://example.com/pull/28))

## v0.5.0 — 2026-07-10

**Headline** · `abcdef0`

- An existing shipped bullet. ([#1](https://example.com/pull/1))
MD

run_gate() { # labels changed base head  -> prints exit code
  GATE_LABELS="$1" \
  GATE_CHANGED_FILES="$2" \
  GATE_BASE_CHANGELOG="$3" \
  GATE_HEAD_CHANGELOG="$4" \
  bash "$GATE" >/dev/null 2>&1
  echo $?
}

# Case (a) fail-no-entry: code changed, [Unreleased] unchanged, no label -> FAIL (exit 1).
rc="$(run_gate "" "src/web-app.js" "$tmp/base.md" "$tmp/base.md")"
[ "$rc" -eq 1 ] && pass "fail-no-entry: code-only diff with no entry is rejected" \
                || die "fail-no-entry: expected exit 1, got $rc"

# Case (b) pass-entry: code changed AND a new [Unreleased] bullet -> PASS (exit 0).
rc="$(run_gate "" "src/web-app.js" "$tmp/base.md" "$tmp/head-with-entry.md")"
[ "$rc" -eq 0 ] && pass "pass-entry: code diff with a new entry passes" \
                || die "pass-entry: expected exit 0, got $rc"

# Case (c) pass-label: code changed, no entry, but 'skip-changelog' label -> PASS.
rc="$(run_gate "skip-changelog" "src/web-app.js" "$tmp/base.md" "$tmp/base.md")"
[ "$rc" -eq 0 ] && pass "pass-label: 'skip-changelog' label bypasses the gate" \
                || die "pass-label: expected exit 0, got $rc"

# Case (d) sanity — docs/tooling-only diff (no shipping code) -> PASS with nothing to record.
rc="$(run_gate "" "$(printf 'docs/notes.md\nREADME.md\ntest/web-smoke.sh')" "$tmp/base.md" "$tmp/base.md")"
[ "$rc" -eq 0 ] && pass "docs-only: non-code diff needs no entry" \
                || die "docs-only: expected exit 0, got $rc"

# Case (e) label present among several -> PASS (comma-separated labels parsed).
rc="$(run_gate "enhancement,skip-changelog,to-do" "build.sh" "$tmp/base.md" "$tmp/base.md")"
[ "$rc" -eq 0 ] && pass "pass-label: label found within a comma-separated set" \
                || die "multi-label: expected exit 0, got $rc"

if [ "$fail" -ne 0 ]; then echo "==> CHANGELOG-GATE TEST FAILED"; exit 1; fi
echo "==> CHANGELOG-GATE TEST PASSED"
