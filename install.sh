#!/usr/bin/env bash
# install.sh — install the "View Markdown" Finder Quick Action.
# Copies the .workflow bundle into ~/Library/Services/, wires in the absolute
# path to bin/mdview, validates the plists, and refreshes the Services cache.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MDVIEW="$ROOT/bin/mdview"
SRC_WF="$ROOT/quick-action/View Markdown.workflow"
DEST_DIR="$HOME/Library/Services"
DEST_WF="$DEST_DIR/View Markdown.workflow"

echo "==> md-viewer install"

# 1. Ensure the viewer is built and the launcher is executable.
chmod +x "$MDVIEW" "$ROOT/build.sh"
if [ ! -f "$ROOT/viewer.html" ]; then
  echo "    building viewer.html ..."
  "$ROOT/build.sh"
fi

# 2. Copy the workflow bundle into place (replace any previous install).
mkdir -p "$DEST_DIR"
rm -rf "$DEST_WF"
cp -R "$SRC_WF" "$DEST_WF"

# 3. Wire the real mdview path into the installed workflow.
WF_DOC="$DEST_WF/Contents/document.wflow"
# Use a temp file; mdview path contains slashes so use '|' as sed delimiter.
sed "s|__MDVIEW_BIN__|$MDVIEW|g" "$WF_DOC" > "$WF_DOC.tmp" && mv "$WF_DOC.tmp" "$WF_DOC"

# 4. Validate both plists — fail loudly if malformed.
plutil -lint "$DEST_WF/Contents/Info.plist" >/dev/null
plutil -lint "$WF_DOC" >/dev/null

# 5. Refresh the Services / Quick Actions registry.
/System/Library/CoreServices/pbs -flush >/dev/null 2>&1 || true

echo "==> Installed to: $DEST_WF"
echo "    mdview path : $MDVIEW"
echo ""
echo "Next: right-click a .md file in Finder -> Quick Actions -> \"View Markdown\"."
echo "If it does not appear yet, check System Settings > Keyboard > Keyboard"
echo "Shortcuts > Services > Files and Folders, and enable \"View Markdown\"."
