# PrettyZap — Omarchy / Quickshell integration

PrettyZap ships a native Quickshell integration with one primary form and one
explicit fallback:

| Path | What | Runs inside |
|---|---|---|
| `plugin/` | Omarchy bar-widget `prettyletto.prettyzap` | `omarchy-shell` |
| `standalone/` | Optional fallback widget for non-Omarchy Quickshell | an explicitly launched `quickshell` instance |
| `omarchy-menu.jsonc` | Optional command-menu entry (legacy) | Omarchy menu |

The plugin is **additive**: enabling it adds exactly one entry to one bar
section via `omarchy plugin enable`; nothing else in the user's `shell.json`
is rewritten. Do not launch the standalone widget on Omarchy: Quattro runs one
long-lived `omarchy-shell` process and the bar plugin belongs inside it.

## Layout

```
packaging/omarchy/
  install.sh        idempotent installer (copy + enable, no symlinks)
  plugin/           the Omarchy bar widget (self-contained; manifest.json at root)
  standalone/       the standalone Quickshell widget (self-contained shell.qml)
  omarchy-menu.jsonc  optional command-menu snippet
```

## Install

### 1. From this repo

```bash
./packaging/omarchy/install.sh              # plugin (default)
./packaging/omarchy/install.sh --standalone # explicit non-Omarchy fallback
./packaging/omarchy/install.sh --uninstall  # remove both
```

The plugin install copies `plugin/` to
`~/.config/omarchy/plugins/prettyletto.prettyzap/`, rescans plugins, and runs
`omarchy plugin enable prettyletto.prettyzap` (places it at the right section).

### 2. AUR

`packaging/aur/prettyzap-omarchy` packages the same files under
`/usr/share/prettyzap/omarchy/` and ships `prettyzap-omarchy-setup`, which
wraps the same `install.sh`. Package install never edits `~/.config/`; you run
the setup command once.

### 3. `omarchy plugin add` (publish path)

`plugin/` is a complete plugin directory — `manifest.json` at its root. To let
users install with the registry command, publish it as its own git repo (e.g.
`prettyzap-omarchy-plugin`) whose root is this directory:

```bash
omarchy plugin add https://github.com/prettyletto/prettyzap-omarchy-plugin.git --enable --yes
```

Release step (one-liner per tag, after building):

```bash
git -C packaging/omarchy/plugin init
git -C packaging/omarchy/plugin add -A
git -C packaging/omarchy/plugin commit -m "prettyzap-omarchy-plugin vX.Y.Z"
git -C packaging/omarchy/plugin push https://github.com/prettyletto/prettyzap-omarchy-plugin.git master
```

## The widget

- Bar icon: PrettyZap logo (SVG) with the WhatsApp glyph as fallback; lights
  up while PrettyZap is running.
- Left-click opens/hides the app, middle-click opens settings, right-click
  opens the panel (Open / Hide, Settings, Theme toggle).
- Status and theme come from an atomic `~/.config/prettyzap/status.json`,
  written on startup and every visibility/theme transition. Existing
  instances are controlled over the session D-Bus service
  `org.prettyzap.Desktop`; CLI flags remain the fallback.

Requires PrettyZap itself (`prettyzap` on PATH) and, for the plugin form,
Omarchy's `qs.Ui` kit.

## Keeping the AUR package in sync

`packaging/aur/prettyzap-omarchy/` carries renamed copies of these files
(makepkg cannot take directories as sources). On release, re-copy:

| Source | AUR copy |
|---|---|
| `plugin/manifest.json` | `plugin-manifest.json` |
| `plugin/Widget.qml` | `plugin-Widget.qml` |
| `plugin/Data.qml` | `plugin-Data.qml` |
| `plugin/README.md` | `plugin-README.md` |
| `plugin/assets/prettyzap.svg` | `plugin-prettyzap.svg` |
| `standalone/shell.qml` | `standalone-shell.qml` |
| `standalone/Data.qml` | `standalone-Data.qml` |
| `standalone/README.md` | `standalone-README.md` |
| `standalone/assets/prettyzap.svg` | `standalone-prettyzap.svg` |
| `install.sh` | `install.sh` |

Then refresh the sha256sums in the PKGBUILD and run
`makepkg --printsrcinfo > .SRCINFO`.
