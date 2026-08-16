#!/usr/bin/env bash
set -euo pipefail

# PrettyZap — Omarchy/Quickshell integration installer.
#
# Installs the Omarchy bar widget and/or the standalone Quickshell widget into
# the user's configuration and enables the plugin through Omarchy's own
# additive path. It never rewrites shell.json wholesale: `omarchy plugin
# enable` adds exactly one entry to one bar section, and nothing else in the
# user's config is touched. Files are always copied, never symlinked (the
# plugin validator rejects symlinks).
#
#   install.sh [--plugin] [--standalone] [--uninstall]
#
# From the repo checkout this uses ./plugin and ./standalone. The AUR wrapper
# (prettyzap-omarchy-setup) overrides PZ_PLUGIN_SRC / PZ_STANDALONE_SRC with
# the packaged paths under /usr/share/prettyzap.

PLUGIN_ID="prettyletto.prettyzap"

BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PZ_PLUGIN_SRC="${PZ_PLUGIN_SRC:-$BASE_DIR/plugin}"
PZ_STANDALONE_SRC="${PZ_STANDALONE_SRC:-$BASE_DIR/standalone}"

PLUGIN_DEST="$HOME/.config/omarchy/plugins/$PLUGIN_ID"
STANDALONE_DEST="$HOME/.config/quickshell/prettyzap"

usage() {
  cat <<'USAGE'
Usage: install.sh [--plugin] [--standalone] [--uninstall]

  --plugin       Install and enable the Omarchy bar widget (default when no
                 flags are given).
  --standalone   Install the standalone Quickshell widget to
                 ~/.config/quickshell/prettyzap/ (no Omarchy required).
  --uninstall    Disable and remove both.

The plugin install is additive: `omarchy plugin enable` adds a single entry to
one bar section. Nothing else in ~/.config/omarchy/shell.json is touched.
USAGE
}

MODE=""

while (( $# > 0 )); do
  case "$1" in
    --plugin) MODE="plugin" ;;
    --standalone) MODE="standalone" ;;
    --uninstall) MODE="uninstall" ;;
    -h | --help) usage; exit 0 ;;
    *) echo "unknown option: $1" >&2; usage >&2; exit 1 ;;
  esac
  shift
done

[[ -n $MODE ]] || MODE="plugin"

shell_ready() {
  omarchy-shell shell ping >/dev/null 2>&1
}

enable_plugin() {
  if ! shell_ready; then
    echo "  note: omarchy-shell is not running; the widget is installed but not enabled."
    echo "        Run later: omarchy plugin enable $PLUGIN_ID"
    return
  fi
  omarchy-shell shell rescanPlugins >/dev/null 2>&1 || true
  if omarchy plugin enable "$PLUGIN_ID" 2>&1; then
    echo "  enabled $PLUGIN_ID on the bar."
  else
    echo "  note: could not enable $PLUGIN_ID automatically."
    echo "        Run: omarchy plugin enable $PLUGIN_ID"
  fi
}

install_plugin() {
  if [[ ! -f "$PZ_PLUGIN_SRC/manifest.json" ]]; then
    echo "error: plugin source not found at $PZ_PLUGIN_SRC" >&2
    exit 1
  fi
  echo "Installing the Omarchy bar widget ($PLUGIN_ID)..."
  mkdir -p "$(dirname "$PLUGIN_DEST")"
  rm -rf "$PLUGIN_DEST"
  cp -r "$PZ_PLUGIN_SRC" "$PLUGIN_DEST"
  if ! omarchy plugin validate "$PLUGIN_DEST" 2>&1; then
    echo "error: installed plugin failed validation; removed it again" >&2
    rm -rf "$PLUGIN_DEST"
    exit 1
  fi
  echo "  copied to $PLUGIN_DEST"
  enable_plugin
  echo "Done. The PrettyZap icon should appear on the right side of the bar."
  echo "      Left-click opens/hides the app · right-click opens the panel."
}

install_standalone() {
  if [[ ! -f "$PZ_STANDALONE_SRC/shell.qml" ]]; then
    echo "error: standalone source not found at $PZ_STANDALONE_SRC" >&2
    exit 1
  fi
  echo "Installing the standalone Quickshell widget..."
  mkdir -p "$STANDALONE_DEST"
  cp -r "$PZ_STANDALONE_SRC/." "$STANDALONE_DEST/"
  echo "  copied to $STANDALONE_DEST"
  echo "Done. Run it with:"
  echo "      quickshell -p $STANDALONE_DEST"
  echo "  or, to start it with the desktop, add to autostart:"
  echo "      quickshell -n -p $STANDALONE_DEST"
}

uninstall_all() {
  echo "Removing the PrettyZap Omarchy integration..."
  if shell_ready; then
    omarchy plugin disable "$PLUGIN_ID" 2>&1 || true
  else
    echo "  note: omarchy-shell is not running; skipping disable."
  fi
  rm -rf "$PLUGIN_DEST"
  rm -rf "$STANDALONE_DEST"
  echo "Removed the plugin and the standalone widget."
}

case "$MODE" in
  plugin) install_plugin ;;
  standalone) install_standalone ;;
  uninstall) uninstall_all ;;
esac
