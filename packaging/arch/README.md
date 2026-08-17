# Arch packaging

`prettyzap-bin` is the single AUR package. It provides the PrettyZap desktop
app; the optional Omarchy bar plugin is installed directly from GitHub with
`omarchy plugin add`.

The core package unpacks the tested AppImage into `/opt/prettyzap` so users do
not need AppImage FUSE support at runtime. The launcher and desktop entry are
installed through normal Arch paths.

Before publishing to the AUR, regenerate the release SHA-256 value from the
exact uploaded AppImage asset and confirm the tag matches `pkgver`.
