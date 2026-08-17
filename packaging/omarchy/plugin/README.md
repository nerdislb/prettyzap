# PrettyZap — Omarchy bar widget

A native Quickshell bar widget for [PrettyZap](https://github.com/prettyletto/prettyzap),
the keyboard-first WhatsApp Web desktop shell. One bar icon opens/hides the
app, and a popup panel offers Open / Hide, Settings, the WhatsApp/System theme
toggle, unread count, and notification mute control.

The widget is **purely additive**: enabling it adds a single entry to one bar
section. Nothing else in `~/.config/omarchy/shell.json` is touched. If the
PrettyZap app is missing, the panel offers an explicit **Install PrettyZap**
button that runs `yay -S --needed prettyzap-bin` in a visible terminal. It is
the only PrettyZap control surface intended for Omarchy Quattro; do not start
the standalone widget there.

## What it shows

- **Bar icon** — the supplied white PrettyZap mark on dark Omarchy themes and
  black mark on light themes (or the WhatsApp glyph when `icon` is set to
  `glyph`). The active icon follows Omarchy's live bar palette.
- **Left-click** — open PrettyZap, or hide it if it is already visible.
- **Middle-click** — open the PrettyZap settings window.
- **Right-click** — open the popup panel.
- **Panel** — branding header, live status line, Open / Hide, Settings, Theme,
  notification mute/unmute, and Quit buttons. An unread badge is shown on the
  bar icon when WhatsApp Web reports unread items.

## How it works

- `Data.qml` watches the atomic `~/.config/prettyzap/status.json` for theme,
  pid, visibility, readiness, unread count, notification preference, and
  revision. A slow pid check is retained only for crash recovery.
- Existing instances receive actions through the session D-Bus service
  `org.prettyzap.Desktop`; CLI flags are used when D-Bus is unavailable.

## Settings

| Key | Type | Default | Meaning |
|---|---|---|---|
| `launchCommand` | string | `uwsm-app -- prettyzap` | How the app is launched. Split on spaces. Set to `prettyzap` on desktops without `uwsm-app`. |
| `icon` | string | `brand` | `brand` (theme-aware PrettyZap logo) or `glyph` (WhatsApp symbol). |

```bash
omarchy bar set prettyletto.prettyzap icon glyph
omarchy bar set prettyletto.prettyzap launchCommand prettyzap
```

## Install

Install directly from the PrettyZap repository's plugin branch:

```bash
omarchy plugin add https://github.com/prettyletto/prettyzap.git --enable --yes
```

Open the PrettyZap bar panel and click **Install PrettyZap**. It installs the
`prettyzap-bin` AUR package through `yay`, then launches the app.

From a checked-out plugin directory, run the same setup manually with:

```bash
./install.sh
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
- `yay` is required only when installing PrettyZap from the panel. Otherwise
  install `prettyzap-bin` yourself before using the widget.

## Notes

- The unread count comes from Chromium's WhatsApp Web page title (`(3)
  WhatsApp`), so it does not depend on private WhatsApp DOM selectors.
- Notification mute affects PrettyZap's WhatsApp Web session and persists in
  `~/.config/prettyzap/shell-state.json`.
- A separate `panel` kind is unnecessary; the popup ships inside the bar
  widget.
