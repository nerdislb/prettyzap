# AUR release layout

The repository carries one AUR package:

```text
packaging/aur/prettyzap-bin/
```

`prettyzap-bin` installs the PrettyZap desktop application. The Omarchy bar
widget is intentionally not packaged: install it from GitHub instead:

```bash
omarchy plugin add https://github.com/prettyletto/prettyzap.git --enable --yes
```

Before updating the AUR package, build the exact GitHub release AppImage,
update its SHA-256 in `PKGBUILD`, regenerate `.SRCINFO`, and verify a clean
build:

```bash
cd packaging/aur/prettyzap-bin
makepkg --printsrcinfo > .SRCINFO
makepkg -Cfs
```
