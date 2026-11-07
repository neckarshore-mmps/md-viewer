#!/usr/bin/env bash
# fetch-corpus.sh <folder> — download the public evaluation PDFs and verify each sha256.
#
# The PDFs are not committed: arXiv grants a licence to distribute through arXiv, not
# through this repository. Each entry is pinned to a version and a hash, so the corpus is
# the same on every machine, and a changed file fails here instead of skewing a comparison.
# The target folder must not be the output root you convert into.
set -euo pipefail

target="${1:?usage: fetch-corpus.sh <folder>}"
mkdir -p "$target"

# name | url | sha256 | why it is in the corpus
CORPUS=(
  "docling-report-2408.09869v5.pdf|https://arxiv.org/pdf/2408.09869v5|82dd470712ce8389f19f20eb9330475e2166a281f8c7990a9f1d0763d73b4d22|two-column paper, figures, a few tables"
  "attention-1706.03762v7.pdf|https://arxiv.org/pdf/1706.03762v7|bdfaa68d8984f0dc02beaca527b76f207d99b666d31d1da728ee0728182df697|table-heavy, formulas"
)

status=0
for entry in "${CORPUS[@]}"; do
  IFS='|' read -r name url sha why <<< "$entry"
  file="$target/$name"
  if [ ! -f "$file" ]; then
    curl -sfL --retry 2 -o "$file.partial" "$url"
    mv "$file.partial" "$file"
  fi
  actual="$(shasum -a 256 "$file" | cut -c1-64)"
  if [ "$actual" = "$sha" ]; then
    echo "ok   $name ($why)"
  else
    echo "FAIL $name: sha256 $actual, expected $sha" >&2
    status=1
  fi
done
exit "$status"
