#!/usr/bin/env bash
set -euo pipefail

# Explicit user-facing setup for the Git-installed Omarchy plugin.
# Omarchy's plugin add command deliberately does not execute repository hooks;
# the popup's Install PrettyZap button launches this script in a terminal.

if [[ ${1:-} == "--uninstall" ]]; then
  yay -Rns --noconfirm prettyzap-bin
  exit 0
fi

if [[ $# -gt 0 ]]; then
  echo "usage: $0 [--uninstall]" >&2
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

if command -v omarchy >/dev/null 2>&1; then
  echo "Refreshing the Omarchy shell…"
  omarchy restart shell || echo "note: shell restart did not complete; run: omarchy restart shell"
fi

echo "PrettyZap is ready. Starting it now…"
setsid uwsm-app -- prettyzap >/dev/null 2>&1 &
