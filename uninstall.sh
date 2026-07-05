#!/usr/bin/env bash
# uninstall.sh — remove the "View Markdown" Finder Quick Action.
set -euo pipefail

DEST_WF="$HOME/Library/Services/View Markdown.workflow"

if [ -d "$DEST_WF" ]; then
  rm -rf "$DEST_WF"
  /System/Library/CoreServices/pbs -flush >/dev/null 2>&1 || true
  echo "==> Removed: $DEST_WF"
else
  echo "==> Nothing to remove (not installed at $DEST_WF)."
fi
