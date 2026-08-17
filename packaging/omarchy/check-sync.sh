#!/usr/bin/env bash
set -euo pipefail

# Validate the source directory used to publish the plugin-only quattro branch.
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
plugin_dir="$root/packaging/omarchy/plugin"

if [[ -n $(git -C "$root" ls-files -s | awk '$1 == "120000" { print $4 }') ]]; then
  echo "error: tracked symlinks would break omarchy plugin add" >&2
  exit 1
fi

if command -v omarchy-plugin-validate >/dev/null 2>&1; then
  omarchy-plugin-validate "$plugin_dir"
fi

bash -n "$plugin_dir/install.sh"
echo "Omarchy plugin source is valid."
