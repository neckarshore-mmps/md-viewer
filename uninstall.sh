#!/usr/bin/env bash
# uninstall.sh — remove the Finder Quick Actions "View Markdown" and "Compare".
# Converter results in ~/md-converter (or $MD_CONVERTER_OUT) are left alone.
set -euo pipefail

removed=0
for name in "View Markdown" "Compare"; do
  dest="$HOME/Library/Services/$name.workflow"
  if [ -d "$dest" ]; then
    rm -rf "$dest"
    echo "==> Removed: $dest"
    removed=1
  fi
done

if [ "$removed" -eq 1 ]; then
  /System/Library/CoreServices/pbs -flush >/dev/null 2>&1 || true
else
  echo "==> Nothing to remove (no quick action installed in ~/Library/Services)."
fi
