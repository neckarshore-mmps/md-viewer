#!/usr/bin/env bash
# vercel-inject-version.sh — deploy-time footer SHA injection (AD-42 §6).
#
# The committed web/index.html carries churn-free deploy tokens (__COMMIT_SHA__ /
# __COMMIT_SHA_FULL__) so the CI staleness gate (build.sh + `git diff --exit-code`)
# stays green — build.sh never bakes a live SHA. This script runs ONLY at Vercel
# deploy time (wired as the buildCommand in web/vercel.json) and stamps the TRUE
# build-env commit SHA into the deployed footer, linked to the exact commit.
#
# Why not source the SHA from CHANGELOG.md (as an earlier cut did)? md-viewer
# squash-merges, so the changelog's top SHA goes stale the moment the release
# commit is squashed — the footer would point at a commit that no longer is HEAD.
# The build-env SHA (VERCEL_GIT_COMMIT_SHA) is always the one actually deployed.
#
# Usage:
#   vercel-inject-version.sh [path/to/index.html]
#   - No arg: resolves "index.html" (Vercel Root Directory = web) then "web/index.html".
#   - VERCEL_GIT_COMMIT_SHA unset (local / non-Vercel build): no-op, tokens survive,
#     and web-app.js renders "dev" in the footer.
set -euo pipefail

HTML="${1:-}"
if [ -z "$HTML" ]; then
  HTML="index.html"
  [ -f "$HTML" ] || HTML="web/index.html"
fi
[ -f "$HTML" ] || { echo "inject: target HTML not found ($HTML)" >&2; exit 1; }

SHA="${VERCEL_GIT_COMMIT_SHA:-}"
if [ -z "$SHA" ]; then
  echo "inject: VERCEL_GIT_COMMIT_SHA unset — leaving deploy tokens (local/non-Vercel build)"
  exit 0
fi
SHORT="${SHA:0:7}"

# Both tokens are unique to the footer, so a global replace is safe. Full-SHA token
# first (it is the longer, more specific match).
tmp="$(mktemp)"
sed -e "s|__COMMIT_SHA_FULL__|${SHA}|g" \
    -e "s|__COMMIT_SHA__|${SHORT}|g" \
    "$HTML" > "$tmp"
mv "$tmp" "$HTML"
echo "inject: stamped ${SHORT} (${SHA}) into ${HTML}"
