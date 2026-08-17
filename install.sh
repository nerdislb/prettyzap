#!/usr/bin/env bash
set -euo pipefail

# Explicit user-facing setup for the Git-installed Omarchy plugin.
# Omarchy's plugin add command deliberately does not execute repository hooks;
# the popup's Install PrettyZap button launches this script in a terminal.

PLUGIN_ID="prettyletto.prettyzap"
CONFIG_HOME="${XDG_CONFIG_HOME:-$HOME/.config}"

# `omarchy plugin` needs this when invoked from a terminal that did not inherit
# the compositor's environment (for example a user shell or an installer).
if [[ -z ${OMARCHY_PATH:-} && -d "$HOME/.local/share/omarchy" ]]; then
  export OMARCHY_PATH="$HOME/.local/share/omarchy"
fi

uninstall() {
  local purge_data="$1"

  echo "Closing PrettyZap…"
  pkill -x prettyzap 2>/dev/null || true

  if pacman -Q prettyzap-bin >/dev/null 2>&1; then
    if ! command -v yay >/dev/null 2>&1; then
      echo "error: yay is required to remove prettyzap-bin." >&2
      exit 1
    fi
    echo "Removing PrettyZap…"
    yay -Rns --noconfirm prettyzap-bin
  else
    echo "PrettyZap is not installed."
  fi

  if [[ $purge_data == true ]]; then
    echo "Removing PrettyZap settings and WhatsApp session data…"
    rm -rf "$CONFIG_HOME/prettyzap" "$CONFIG_HOME/pjzap"
  fi

  if command -v omarchy >/dev/null 2>&1; then
    echo "Removing the Omarchy widget…"
    omarchy plugin remove "$PLUGIN_ID" --yes
  else
    echo "error: Omarchy is required to unregister the $PLUGIN_ID widget." >&2
    exit 1
  fi
}

case "${1:-}" in
  --uninstall)
    [[ $# -eq 1 ]] || { echo "usage: $0 [--uninstall|--purge]" >&2; exit 2; }
    uninstall false
    exit 0
    ;;
  --purge)
    [[ $# -eq 1 ]] || { echo "usage: $0 [--uninstall|--purge]" >&2; exit 2; }
    uninstall true
    exit 0
    ;;
  "") ;;
  *)
    echo "usage: $0 [--uninstall|--purge]" >&2
    exit 2
    ;;
esac

if [[ $# -gt 0 ]]; then
  echo "usage: $0 [--uninstall|--purge]" >&2
  exit 2
fi

if ! command -v yay >/dev/null 2>&1; then
  echo "error: yay is required to install PrettyZap from the AUR." >&2
  echo "Install yay, then run this installer again." >&2
  exit 1
fi

echo "Installing PrettyZap from the AUR…"
yay -S --needed --noconfirm prettyzap-bin

if ! command -v prettyzap >/dev/null 2>&1; then
  echo "error: prettyzap-bin completed but the prettyzap command was not found." >&2
  exit 1
fi

echo "PrettyZap is ready. Starting it now…"
setsid uwsm-app -- prettyzap >/dev/null 2>&1 &
