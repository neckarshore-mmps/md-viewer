#!/usr/bin/env bash
# install.sh — install the Finder Quick Actions "View Markdown" (for .md) and
# "Compare" (for .pdf). Copies each .workflow bundle into ~/Library/Services/,
# wires in the absolute path to its launcher in bin/, validates the plists and
# refreshes the Services cache. "Compare" also needs the converter installed:
# see converter/README.md (cd converter && uv sync --extra docling).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEST_DIR="$HOME/Library/Services"

echo "==> md-viewer install"

# 1. Ensure the pages are built and the launchers are executable.
chmod +x "$ROOT/bin/mdview" "$ROOT/bin/mdcompare" "$ROOT/build.sh"
if [ ! -f "$ROOT/viewer.html" ] || [ ! -f "$ROOT/web/compare.html" ]; then
  echo "    building viewer.html and web/compare.html ..."
  "$ROOT/build.sh"
fi
mkdir -p "$DEST_DIR"

# 2. One workflow per quick action: name | placeholder | launcher.
install_workflow() {
  local name="$1" placeholder="$2" launcher="$3"
  local src="$ROOT/quick-action/$name.workflow" dest="$DEST_DIR/$name.workflow"
  rm -rf "$dest"
  cp -R "$src" "$dest"
  local doc="$dest/Contents/document.wflow"
  # The launcher path contains slashes, so '|' is the sed delimiter.
  sed "s|$placeholder|$launcher|g" "$doc" > "$doc.tmp" && mv "$doc.tmp" "$doc"
  # Validate both plists — fail loudly if malformed (plutil exists on macOS only).
  if command -v plutil >/dev/null 2>&1; then
    plutil -lint "$dest/Contents/Info.plist" >/dev/null
    plutil -lint "$doc" >/dev/null
  fi
  echo "    installed: $dest"
}

install_workflow "View Markdown" "__MDVIEW_BIN__" "$ROOT/bin/mdview"
install_workflow "Compare" "__MDCOMPARE_BIN__" "$ROOT/bin/mdcompare"

# 3. Refresh the Services / Quick Actions registry.
/System/Library/CoreServices/pbs -flush >/dev/null 2>&1 || true

echo ""
echo "Next:"
echo "  - right-click a .md file in Finder -> Quick Actions -> \"View Markdown\""
echo "  - right-click a .pdf file in Finder -> Quick Actions -> \"Compare\""
echo "    (first set up the converter once: cd \"$ROOT/converter\" && uv sync --extra docling)"
echo "If an entry does not appear, check System Settings > Keyboard > Keyboard"
echo "Shortcuts > Services > Files and Folders, and enable it there."
