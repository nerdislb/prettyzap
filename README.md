# PrettyZap

PrettyZap is a Linux desktop wrapper for [WhatsApp Web](https://web.whatsapp.com/)
with a collapsible chat drawer, keyboard shortcuts, theme controls, and a
persistent WhatsApp session.

On Omarchy, the optional bar plugin provides quick controls for opening,
hiding, theming, and quitting PrettyZap.

## See it in action

### Keyboard controls

![Keyboard controls demo](https://raw.githubusercontent.com/prettyletto/prettyzap/master/assets/keyboard-controls.gif)

[Watch the keyboard controls video](https://github.com/prettyletto/prettyzap/blob/master/assets/keyboard-controls.mp4)

### Theming

![Theming demo](https://raw.githubusercontent.com/prettyletto/prettyzap/master/assets/theming.gif)

[Watch the theming video](https://github.com/prettyletto/prettyzap/blob/master/assets/theming.mp4)

### Settings and widget controls

![Settings and widget demo](https://raw.githubusercontent.com/prettyletto/prettyzap/master/assets/settings-widget.gif)

[Watch the settings and widget video](https://github.com/prettyletto/prettyzap/blob/master/assets/settings-widget.mp4)

## Install

Install PrettyZap and the Omarchy bar plugin:

```bash
yay -S --needed prettyzap-bin
omarchy plugin add https://github.com/prettyletto/prettyzap.git --enable --yes
```

The plugin only checks whether the `prettyzap` command is installed; it never
installs packages or runs an installer on your behalf.

The plugin adds a bar icon. Left-click opens or hides PrettyZap, middle-click
opens settings, and right-click opens the control panel.

## Useful commands

```bash
prettyzap --toggle  # show or hide PrettyZap
```

Keyboard shortcuts include:

- `Ctrl/Cmd + L` — toggle the chat drawer
- `Ctrl/Cmd + /` — focus chat search
- `Ctrl/Cmd + 1` … `8` — navigate WhatsApp sections
- `Ctrl/Cmd + Shift + T` — toggle the theme
- `Ctrl/Cmd + Shift + Space` — show or hide PrettyZap

## Uninstall

Remove the AUR package and the Omarchy plugin while keeping settings and the
WhatsApp session:

```bash
yay -Rns prettyzap-bin
omarchy plugin remove prettyletto.prettyzap --yes
```

To also remove PrettyZap settings and session data:

```bash
rm -rf ~/.config/prettyzap ~/.config/pjzap
```

## License

MIT — see [LICENSE](LICENSE).
