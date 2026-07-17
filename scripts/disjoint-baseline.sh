#!/usr/bin/env bash
# disjoint-baseline.sh — the GOLDEN BASELINE for the stats.json emitter.
#
# WHY THIS EXISTS
# ---------------
# The emitter's `runners:` block in .github/workflows/ci.yml is a HAND-MAINTAINED list.
# Twice now it has silently drifted from the suites that actually exist:
#   - url-resolve.test.mjs was dropped from the list  -> emitted 69 instead of the truth
#   - the partial fix that restored it forgot playwright and the cascade rollups
#     -> emitted 93, which is SELF-CONSISTENT and passes the structural contract gate.
# That is the whole point: the contract gate checks FORM (total == sum(byType)), never
# TRUTH. A wrong-but-consistent total sails straight through it. Only an independently
# derived count catches it.
#
# THE NON-CIRCULARITY THAT MATTERS
# --------------------------------
# This script derives its suite list from the FILESYSTEM, never from `runners:`. If the
# two disagree — a suite exists on disk but the emitter never counts it — the totals
# diverge and CI goes red. Sharing the enumeration source with the emitter would give
# both the same blind spot and would let "playwright is missing" pass again.
#
# Honest residual (do not oversell this gate): the emitter and this script both count
# TAP-lite ok-lines, so the counting METHOD is shared. A newly introduced cascade would
# fool both. That shape is handled at the source instead — a suite that invokes another
# suite prints rollup() ("ok*"), which is outside the counter's regex, so cascades are
# PREVENTED by construction rather than detected here. See test/smoke.sh rollup().
#
# NO HARDCODED TOTAL. The true count moves every time a test is added (99 -> 106 in four
# days). Any committed number is stale on arrival and would fail a CORRECT emitter.
# This script recomputes from the runners at the SHA it runs on.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

# Suites that are EXECUTED BUT NOT CI-GATED, or otherwise non-additive. These are held
# in stats.json `declared` and MUST NOT enter `total` (stats-json-contract). Keep in sync
# with the `declared:` input in ci.yml — a suite listed here is excluded from the golden
# total for the same reason the emitter excludes it.
#   test/changelog-gate.test.sh: CI runs the GATE it tests (scripts/changelog-gate.sh via
#   the changelog-gate job) but never this test suite. Green, ungated -> declared.
DECLARED_SUITES=("test/changelog-gate.test.sh")

is_declared() {
  local candidate="$1" d
  for d in "${DECLARED_SUITES[@]}"; do
    [ "$candidate" = "$d" ] && return 0
  done
  return 1
}

# Count a runner's OWN TAP-lite reporter output. This regex is deliberately identical to
# test-stats-action's node/bash family so the golden measures what the emitter measures.
# rollup() lines ("ok*") do not match — that is what makes the raw count disjoint.
count_ok() { grep -cE '^[[:space:]]*ok[[:space:]]+-' "$1" || true; }

total=0
echo "==> golden disjoint baseline @ $(git rev-parse --short HEAD)"

# --- node + bash suites, discovered from disk -------------------------------------
# Globs, not a literal list: a new suite is picked up automatically and lands in the
# total, which forces the emitter's runners: block to be updated or CI goes red.
for suite in test/*.test.mjs test/*.sh; do
  [ -e "$suite" ] || continue
  case "$suite" in
    test/e2e/*) continue ;;
  esac

  if is_declared "$suite"; then
    echo "  declared (not in total) - $suite"
    continue
  fi

  out="$WORK/$(echo "$suite" | tr '/' '_').out"
  case "$suite" in
    *.mjs) node "$suite" > "$out" 2>&1 || true ;;
    *)     bash "$suite" > "$out" 2>&1 || true ;;
  esac

  n="$(count_ok "$out")"
  if [ "$n" -eq 0 ]; then
    echo "::error::golden: $suite produced 0 ok-lines — it failed, or its reporter format changed."
    cat "$out"
    exit 1
  fi
  echo "  gated   - $suite: $n"
  total=$(( total + n ))
done

# --- playwright, counted from its own authoritative --list ------------------------
# `--list` collects without a browser, so this needs no Chromium install. The suite is
# CI-gated by the e2e job (which DOES execute it); emit-stats gates red on that job's
# result, so a red e2e can never emit these as green.
if [ -d test/e2e ]; then
  npx playwright test --list > "$WORK/pw.out" 2>&1 || true
  pw="$(grep -oE 'Total: [0-9]+ tests?' "$WORK/pw.out" | grep -oE '[0-9]+' | tail -1 || true)"
  if ! [[ "$pw" =~ ^[0-9]+$ ]] || [ "$pw" -eq 0 ]; then
    echo "::error::golden: could not parse a playwright count from --list."
    cat "$WORK/pw.out"
    exit 1
  fi
  echo "  gated   - playwright: $pw"
  total=$(( total + pw ))
fi

echo "==> golden disjoint total: $total"

# --- compare against the emitted stats.json ---------------------------------------
# Only meaningful on a green run: a red suite legitimately prints fewer ok-lines, and the
# emitter flags that run red:true rather than trusting the count. Comparing a red run's
# undercount against the golden would be a false alarm, so skip it — the red flag already
# excludes that emit downstream.
if [ "${1:-}" = "--check-stats" ]; then
  stats="${2:-stats.json}"
  [ -f "$stats" ] || { echo "::error::golden: $stats not found"; exit 1; }

  if [ "$(jq -r '.red' "$stats")" = "true" ]; then
    echo "==> run is red — skipping golden comparison (undercount is expected on red)."
    exit 0
  fi

  emitted="$(jq -r '.tests.total' "$stats")"
  if [ "$emitted" != "$total" ]; then
    echo "::error::GOLDEN BASELINE MISMATCH — emitted total ${emitted}, own-runner disjoint truth ${total} at the same SHA."
    echo "The structural contract gate cannot catch this: a wrong total that equals sum(byType)"
    echo "is self-consistent and passes it. Most likely a suite exists on disk that the"
    echo "runners: block in ci.yml does not count (or counts twice)."
    jq . "$stats"
    exit 1
  fi
  echo "==> GOLDEN OK — emitted total ${emitted} == own-runner disjoint truth ${total}."
fi
