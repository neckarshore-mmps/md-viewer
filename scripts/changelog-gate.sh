#!/usr/bin/env bash
# changelog-gate.sh — AD-42 mechanical changelog gate.
#
# Fails a PR that changes shipping code without recording a user-facing entry under
# "## [Unreleased]" in CHANGELOG.md — unless the PR carries the 'skip-changelog' label
# (the deliberate, auditable bypass). This is what makes the gate un-bypassable *by
# accident*, not ever. It is dependency-light on purpose: this step is the seed of the
# shared changelog Action extracted later (AD-42 rollout step 2), so no heavy tooling.
#
# ── What counts as "shipping code" (fail-closed denylist) ──────────────────────────
# Everything is shipping code EXCEPT: *.md (README, CHANGELOG, docs), docs/, test/,
# .github/, stats.json (auto-emitted), LICENSE, .gitignore, .vercel/. If a PR touches
# ONLY non-code paths, the gate passes with nothing to record. Anything else (src/,
# build.sh, bin/, web/ assets, viewer.html, vendor/, scripts/, install.sh, …) triggers.
#
# ── Pass condition ─────────────────────────────────────────────────────────────────
# The "## [Unreleased]" block gained at least one new top-level bullet in this PR
# (measured against the merge-base), OR the 'skip-changelog' label is present.
#
# ── Modes ──────────────────────────────────────────────────────────────────────────
# CI (default): reads git. Set GATE_BASE_REF / GATE_HEAD_REF to SHAs (fall back to
#   origin/main and HEAD). The diff is taken from the merge-base — robust when the PR
#   is behind its base.
# Test: set GATE_CHANGED_FILES (newline-separated), GATE_BASE_CHANGELOG,
#   GATE_HEAD_CHANGELOG (file paths) and GATE_LABELS to drive it without a real PR.
set -euo pipefail

# Count top-level "- " bullets inside the "## [Unreleased]" block (up to the next "## ").
count_unreleased_bullets() {
  local f="$1"
  [ -f "$f" ] || { echo 0; return; }
  awk '
    /^## \[Unreleased\]/ { inblock=1; next }
    /^## /               { inblock=0 }
    inblock && /^- /      { n++ }
    END { print n+0 }
  ' "$f"
}

# Shipping-code predicate: 0 (true) = code, 1 (false) = non-code (ignored).
is_code_path() {
  case "$1" in
    *.md)                       return 1 ;;
    docs/*|test/*|.github/*)    return 1 ;;
    .vercel/*)                  return 1 ;;
    stats.json|LICENSE|.gitignore) return 1 ;;
    *)                          return 0 ;;
  esac
}

# ── Gather changed files ───────────────────────────────────────────────────────────
if [ -n "${GATE_CHANGED_FILES:-}" ]; then
  changed="$GATE_CHANGED_FILES"
else
  base_ref="${GATE_BASE_REF:-origin/main}"
  head_ref="${GATE_HEAD_REF:-HEAD}"
  base_sha="$(git merge-base "$base_ref" "$head_ref")"
  changed="$(git diff --name-only "$base_sha" "$head_ref")"
fi

# ── Any shipping-code path touched? ────────────────────────────────────────────────
code_touched=0
code_list=""
while IFS= read -r p; do
  [ -z "$p" ] && continue
  if is_code_path "$p"; then
    code_touched=1
    code_list="${code_list}    ${p}"$'\n'
  fi
done <<< "$changed"

if [ "$code_touched" -eq 0 ]; then
  echo "changelog-gate: no shipping-code paths changed — nothing to record. PASS"
  exit 0
fi

# ── Deliberate bypass via label ────────────────────────────────────────────────────
if printf '%s' "${GATE_LABELS:-}" | tr ',' '\n' | grep -qx "skip-changelog"; then
  echo "changelog-gate: 'skip-changelog' label present — deliberate, auditable bypass. PASS"
  exit 0
fi

# ── Did [Unreleased] grow? ─────────────────────────────────────────────────────────
cleanup=()
if [ -n "${GATE_HEAD_CHANGELOG:-}" ]; then
  head_cl="$GATE_HEAD_CHANGELOG"
else
  head_cl="$(mktemp)"; cleanup+=("$head_cl")
  git show "${GATE_HEAD_REF:-HEAD}:CHANGELOG.md" > "$head_cl" 2>/dev/null || : > "$head_cl"
fi
if [ -n "${GATE_BASE_CHANGELOG:-}" ]; then
  base_cl="$GATE_BASE_CHANGELOG"
else
  base_cl="$(mktemp)"; cleanup+=("$base_cl")
  git show "${base_sha}:CHANGELOG.md" > "$base_cl" 2>/dev/null || : > "$base_cl"
fi

base_n="$(count_unreleased_bullets "$base_cl")"
head_n="$(count_unreleased_bullets "$head_cl")"
[ "${#cleanup[@]}" -gt 0 ] && rm -f "${cleanup[@]}"

if [ "$head_n" -gt "$base_n" ]; then
  echo "changelog-gate: [Unreleased] gained an entry (${base_n} → ${head_n} bullets). PASS"
  exit 0
fi

{
  echo "changelog-gate: shipping code changed but no new '## [Unreleased]' entry was added"
  echo "  ([Unreleased] bullets: base ${base_n}, head ${head_n})."
  echo ""
  echo "  Fix: add a benefit-oriented bullet under '## [Unreleased]' in CHANGELOG.md"
  echo "  (what the reader gains, with the PR link), OR apply the 'skip-changelog' label"
  echo "  for a deliberate, auditable bypass (docs/tooling/refactor-only PRs)."
  echo ""
  echo "  Changed shipping paths:"
  printf '%s' "$code_list"
} >&2
exit 1
