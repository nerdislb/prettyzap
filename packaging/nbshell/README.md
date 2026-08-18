# nbshell integration

This integration adds PrettyZap to nbshell without depending on Omarchy or
`uwsm-app`. It reads only PrettyZap's public `status.json` file and invokes the
documented single-instance command-line controls.

```bash
paru -S --needed prettyzap-bin
./packaging/nbshell/install.sh
```

After installation, add `PrettyZap` from nbshell's plugin inventory to the bar.
The cell shows process state and unread count. Clicking the cell toggles the app;
the popout exposes show/hide, settings, theme, notifications, and quit controls.
While the plugin is active it also mirrors nbshell's generated `palette.sh` to
PrettyZap's private `colors.toml`. PrettyZap's System theme therefore follows
every nbshell theme switch without requiring Omarchy or duplicate color setup.

The plugin requires `bash` and `jq`, both part of the expected nbshell system.
