#!/usr/bin/env bash
set -euo pipefail

script_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
target_dir=${XDG_CONFIG_HOME:-"$HOME/.config"}/nbshell/plugins/prettyzap

install -d "$target_dir"
install -m 0644 "$script_dir/manifest.json" "$target_dir/manifest.json"
install -m 0644 "$script_dir/BarWidget.qml" "$target_dir/BarWidget.qml"
install -m 0755 "$script_dir/prettyzap-status.sh" "$target_dir/prettyzap-status.sh"
install -m 0755 "$script_dir/prettyzap-control.sh" "$target_dir/prettyzap-control.sh"

if command -v nbshell >/dev/null 2>&1; then
    nbshell plugins reload
fi

printf 'PrettyZap nbshell plugin installed in %s\n' "$target_dir"
