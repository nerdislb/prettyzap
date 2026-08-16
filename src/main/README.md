# PrettyZap desktop shell

PrettyZap stores only its shell preferences (window width, height, maximized
state, and WhatsApp drawer collapsed/expanded state) in the XDG config file
`$XDG_CONFIG_HOME/prettyzap/shell-state.json`, falling back to
`$HOME/.config/prettyzap/shell-state.json`.

On Omarchy/Quattro, the bar plugin is the primary control surface and the
Electron tray is disabled by default. The window and WhatsApp Web contents stay
alive while hidden, and the plugin controls the existing instance over the
session D-Bus service `org.prettyzap.Desktop`. Closing the window hides it.

On other Linux desktops, the native tray remains available. Use
`PRETTYZAP_FORCE_TRAY=1` or `PRETTYZAP_DISABLE_TRAY=1` to override detection.
