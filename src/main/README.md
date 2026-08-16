# PrettyZap desktop shell

PrettyZap stores only its shell preferences (window width, height, maximized
state, and WhatsApp drawer collapsed/expanded state) in the XDG config file
`$XDG_CONFIG_HOME/prettyzap/shell-state.json`, falling back to
`$HOME/.config/prettyzap/shell-state.json`.

When Electron can register a native tray item, closing the window hides it and
the tray menu can show, restart, or quit PrettyZap. Tray support on Linux is
provided by the desktop's status-notifier host. Some Wayland compositors do
not provide a compatible host, so the tray may be unavailable there; in that
case PrettyZap keeps normal close-to-quit behavior and does not leave the app
hidden in the background.
