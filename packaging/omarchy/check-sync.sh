#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
source_dir="$root/packaging/omarchy"
aur_dir="$root/packaging/aur/prettyzap-omarchy"

check_pair() {
  local source="$1"
  local target="$2"
  cmp -s "$source_dir/$source" "$aur_dir/$target" || {
    echo "out of sync: $source -> $target" >&2
    return 1
  }
}

check_pair plugin/manifest.json plugin-manifest.json
check_pair plugin/Widget.qml plugin-Widget.qml
check_pair plugin/Data.qml plugin-Data.qml
check_pair plugin/README.md plugin-README.md
check_pair plugin/assets/prettyzap-widget.png plugin-prettyzap-widget.png
check_pair install.sh install.sh
echo "Omarchy packaging copies are in sync."
