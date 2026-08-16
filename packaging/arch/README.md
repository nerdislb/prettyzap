# Arch packaging

The AUR packaging is split deliberately:

- `prettyzap-bin` is the clean, Omarchy-neutral x86_64 package.
- `prettyzap-omarchy` is an optional package containing only user-opt-in
  Omarchy menu integration assets.

The core package unpacks the tested AppImage into `/opt/prettyzap` so users do
not need AppImage FUSE support at runtime. The launcher and desktop entry are
installed through normal Arch paths.

Before publishing to the AUR, regenerate the release SHA-256 value from the
exact uploaded AppImage asset and confirm the tag matches `pkgver`.
