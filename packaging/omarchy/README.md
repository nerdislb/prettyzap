# PrettyZap Omarchy plugin source

`plugin/` is the source for PrettyZap's native Omarchy bar widget. The
published `quattro` branch contains this directory at repository root so
Omarchy can install it directly:

```bash
omarchy plugin add https://github.com/prettyletto/prettyzap.git --enable --yes
```

The plugin is additive: enabling it adds one bar entry and does not rewrite
the user's `shell.json`. If the desktop app is absent, left-click the bar icon
and choose **Install PrettyZap**; the visible installer runs
`yay -S --needed prettyzap-bin` and starts the app. The bar panel detects the
new command automatically; no shell restart is needed.

To remove the app and widget together, run:

```bash
~/.config/omarchy/plugins/prettyletto.prettyzap/install.sh --uninstall
```

Add `--purge` to also delete PrettyZap's settings and WhatsApp Web session.

For local development, `install.sh` copies `plugin/` into the user plugin
directory. `standalone/` is retained only as an explicit Quickshell fallback
outside Omarchy.
