#!/usr/bin/env bash
set -euo pipefail

# PrettyZap — `omarchy plugin add` driver.
#
# The repo root carries the Omarchy plugin contract (manifest.json with entry
# points inside packaging/omarchy/plugin/), so the whole repository can be
# installed with the official command:
#
#   omarchy plugin add https://github.com/prettyletto/prettyzap.git --enable --yes
#
# This script preflights that contract locally, then drives the official add
# flow so the bar widget lands in ~/.config/omarchy/plugins/prettyletto.prettyzap
# and is enabled on the bar:
#
#   plugin-add.sh --check          validate this checkout only (no changes)
#   plugin-add.sh --local          add from this checkout (no publishing needed)
#   plugin-add.sh --url <git-url>  add from a published repo URL
#   plugin-add.sh --print          print the exact command for the published repo
#
# Add --no-enable to install without enabling, or --allow-dirty to skip the
# clean-working-tree check (the add flow clones committed state, so uncommitted
# changes are not installed).

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PLUGIN_ID="prettyletto.prettyzap"
MODE=""
URL=""
ENABLE=true
ALLOW_DIRTY=false

usage() {
  cat <<'USAGE'
Usage: plugin-add.sh [--check | --local | --url <git-url> | --print]
                     [--no-enable] [--allow-dirty]

  --check          Validate this checkout as an Omarchy plugin (no changes).
  --local          Install from this checkout via the official add flow.
  --url <git-url>  Install from a published repository URL.
  --print          Print the exact `omarchy plugin add` command to run.
  --no-enable      Install but leave the plugin disabled.
  --allow-dirty    Skip the clean-working-tree check (for --local/--url).
USAGE
}

while (( $# > 0 )); do
  case "$1" in
    --check) MODE="check" ;;
    --local) MODE="local" ;;
    --url) URL="${2:-}"; [[ -n $URL ]] || { echo "--url requires a git URL" >&2; exit 1; }; MODE="url"; shift ;;
    --print) MODE="print" ;;
    --no-enable) ENABLE=false ;;
    --allow-dirty) ALLOW_DIRTY=true ;;
    -h | --help) usage; exit 0 ;;
    *) echo "unknown option: $1" >&2; usage >&2; exit 1 ;;
  esac
  shift
done

[[ -n $MODE ]] || { usage >&2; exit 1; }

if ! command -v omarchy-plugin-add >/dev/null 2>&1; then
  echo "error: omarchy plugin add is unavailable on this system" >&2
  exit 1
fi

# Local contract check: packaging copies in sync, both manifests valid, no
# tracked symlinks (the validator rejects them).
if ! "$ROOT/packaging/omarchy/check-sync.sh" >/dev/null 2>&1; then
  echo "error: Omarchy packaging is out of sync; run:" >&2
  echo "  $ROOT/packaging/omarchy/check-sync.sh" >&2
  exit 1
fi

if [[ $MODE == "local" || $MODE == "url" ]] && [[ $ALLOW_DIRTY != true ]]; then
  dirty="$(git -C "$ROOT" status --porcelain)"
  if [[ -n $dirty ]]; then
    echo "error: the working tree has uncommitted changes; 'omarchy plugin add' installs" >&2
    echo "       committed state only. Commit first, or pass --allow-dirty to continue" >&2
    echo "       (the committed plugin would be installed instead)." >&2
    exit 1
  fi
fi

command_args=()
[[ $ENABLE == true ]] && command_args+=(--enable --yes)

case "$MODE" in
  check)
    echo "OK: this checkout is a valid Omarchy plugin (id $PLUGIN_ID)."
    echo "    Install it with:  packaging/omarchy/plugin-add.sh --local"
    echo "    Or publish the repo and run:"
    echo "      omarchy plugin add <repo-url> --enable --yes"
    ;;
  local)
    echo "Adding PrettyZap from this checkout..."
    omarchy plugin add "file://$ROOT" "${command_args[@]}"
    ;;
  url)
    echo "Adding PrettyZap from $URL ..."
    omarchy plugin add "$URL" "${command_args[@]}"
    ;;
  print)
    origin="$(git -C "$ROOT" remote get-url origin 2>/dev/null || true)"
    target="${URL:-${origin:-<repo-url>}}"
    echo "omarchy plugin add $target ${command_args[*]}"
    ;;
esac
