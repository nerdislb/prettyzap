# PrettyZap — Omarchy bar widget

A native Quickshell side widget for [PrettyZap](https://github.com/prettyletto/prettyzap),
the keyboard-first WhatsApp Web desktop shell. One bar icon opens/hides the
app, and a popup panel offers Open / Hide, Settings, and the WhatsApp/System
theme toggle.

The widget is **purely additive**: enabling it adds a single entry to one bar
section. Nothing else in `~/.config/omarchy/shell.json` is touched, and the
widget never edits user configuration on its own.

## What it shows

- **Bar icon** — the PrettyZap logo (or the WhatsApp glyph when the SVG cannot
  load, or when `icon` is set to `glyph`). It lights up (`active`) while the
  app is running.
- **Left-click** — open PrettyZap, or hide it if it is already visible.
- **Middle-click** — open the PrettyZap settings window.
- **Right-click** — open the popup panel.
- **Panel** — branding header, live status line (running + current theme),
  Open / Hide, Settings, and Theme buttons.

## How it works

- `Data.qml` watches `~/.config/prettyzap/status.json` (written by the app on
  startup and on every theme change; removed on quit) for the theme and pid,
  and verifies the pid is alive with `kill -0`.
- Actions are fire-and-forget driver flags the app already understands:
  `prettyzap --settings`, `prettyzap --theme <whatsapp|system|toggle>`,
  `--show`, `--hide`, `--toggle`.

## Settings

| Key | Type | Default | Meaning |
|---|---|---|---|
| `launchCommand` | string | `uwsm-app -- prettyzap` | How the app is launched. Split on spaces. Set to `prettyzap` on desktops without `uwsm-app`. |
| `icon` | string | `brand` | `brand` (PrettyZap logo) or `glyph` (WhatsApp symbol). |

```bash
omarchy bar set prettyletto.prettyzap icon glyph
omarchy bar set prettyletto.prettyzap launchCommand prettyzap
```

## Install

From the repo (does not touch the rest of the bar):

```bash
./packaging/omarchy/install.sh            # copies + enables the plugin
```

Or via the plugin registry once this folder is published as its own repo:

```bash
omarchy plugin add https://github.com/prettyletto/prettyzap-omarchy-plugin.git --enable --yes
```

Or, by hand:

```bash
mkdir -p ~/.config/omarchy/plugins/prettyletto.prettyzap
cp -r manifest.json Widget.qml Data.qml assets ~/.config/omarchy/plugins/prettyletto.prettyzap/
omarchy-shell shell rescanPlugins
omarchy plugin enable prettyletto.prettyzap
```

## Requirements

- Omarchy (omarchy-shell) or a Quickshell setup with the `qs.Ui` component kit
- PrettyZap installed (`prettyzap` on PATH) — the widget shows a hint when it
  is missing

## Not included (yet)

- Unread-message badge (needs WhatsApp Web DOM scraping; `status.json` reserves
  the field)
- A separate `panel` kind — the popup ships inside the bar widget
