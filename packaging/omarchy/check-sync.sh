#!/usr/bin/env bash
set -euo pipefail

# Verify every Omarchy packaging copy is in sync before a release.
#
# Checks:
#   1. packaging/omarchy/ -> packaging/aur/prettyzap-omarchy/ renamed copies
#      (makepkg cannot take directories as sources, so the AUR tree carries
#      flat copies of the plugin and standalone files).
#   2. The repo-root manifest.json (the `omarchy plugin add` entry point)
#      matches packaging/omarchy/plugin/manifest.json, differing only in the
#      entry-point paths (root manifest points into packaging/omarchy/plugin/,
#      the plugin-dir manifest is relative).
#   3. The plugin folder and repo contain no tracked symlinks — the Omarchy
#      plugin validator rejects symlinks inside a plugin folder, so a symlink
#      anywhere in the repo would make `omarchy plugin add <this-repo>` fail.
#   4. Both manifests pass `omarchy plugin validate` when that command exists.

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
source_dir="$root/packaging/omarchy"
aur_dir="$root/packaging/aur/prettyzap-omarchy"

failures=0

check_pair() {
  local source="$1"
  local target="$2"
  if ! cmp -s "$source_dir/$source" "$aur_dir/$target"; then
    echo "out of sync: $source -> $target" >&2
    failures=1
  fi
}

# Source path -> AUR copy path. The AUR package's own README.md and LICENSE
# are package documents, not copies of packaging/omarchy/; everything else it
# ships mirrors packaging/omarchy/ (see packaging/omarchy/README.md).
check_pair omarchy-menu.jsonc omarchy-menu.jsonc
check_pair install.sh install.sh
check_pair plugin/manifest.json plugin-manifest.json
check_pair plugin/Widget.qml plugin-Widget.qml
check_pair plugin/Data.qml plugin-Data.qml
check_pair plugin/README.md plugin-README.md
check_pair plugin/assets/prettyzap.svg plugin-prettyzap.svg
check_pair plugin/assets/prettyzap-widget.png plugin-prettyzap-widget.png
check_pair standalone/shell.qml standalone-shell.qml
check_pair standalone/Data.qml standalone-Data.qml
check_pair standalone/README.md standalone-README.md
check_pair standalone/assets/prettyzap.svg standalone-prettyzap.svg

# The root manifest must be the plugin-dir manifest with "packaging/omarchy/
# plugin/" prefixed onto every entry point. Anything else means the two
# manifests (and the `omarchy plugin add` contract) have drifted.
if ! jq -e --slurp '
    .[0].entryPoints as $rootEntry
    | .[1].entryPoints as $dirEntry
    | $rootEntry == ($dirEntry | map_values("packaging/omarchy/plugin/" + .))
      and (.[0] | del(.entryPoints)) == (.[1] | del(.entryPoints))
  ' "$root/manifest.json" "$source_dir/plugin/manifest.json" >/dev/null 2>&1; then
  echo "out of sync: root manifest.json and packaging/omarchy/plugin/manifest.json differ beyond entry-point prefixes" >&2
  failures=1
fi

# `omarchy plugin add` clones the whole repo into ~/.config/omarchy/plugins/
# and the validator refuses any symlink inside the plugin folder (including
# inside nested directories). Keep the repo free of tracked symlinks.
if [[ -n $(git -C "$root" ls-files -s | awk '$1 == "120000" { print $4 }') ]]; then
  echo "error: tracked symlinks would break 'omarchy plugin add' (validator rejects symlinks)" >&2
  git -C "$root" ls-files -s | awk '$1 == "120000" { print "  " $4 }' >&2
  failures=1
fi

# Ask the real validator about both manifests when it is installed.
if command -v omarchy-plugin-validate >/dev/null 2>&1; then
  if ! omarchy-plugin-validate "$source_dir/plugin" >/dev/null 2>&1; then
    echo "validation failed: packaging/omarchy/plugin" >&2
    failures=1
  fi
  # Mirror the working tree (not just HEAD): the root manifest may still be
  # uncommitted. The validator checks manifest.json, entry-point existence,
  # and the absence of symlinks — exactly what `omarchy plugin add` will run.
  stage="$(mktemp -d)"
  trap 'rm -rf "$stage"' EXIT
  if (cd "$root" && tar -cf - \
      --exclude=.git --exclude=node_modules --exclude=dist .) \
      | (cd "$stage" && tar -xf -) \
      && omarchy-plugin-validate "$stage" >/dev/null 2>&1; then
    :
  else
    echo "validation failed: repo root as plugin (manifest.json must be the plugin contract)" >&2
    failures=1
  fi
fi

if (( failures )); then
  echo "Omarchy packaging is OUT OF SYNC." >&2
  exit 1
fi
echo "Omarchy packaging copies are in sync."
