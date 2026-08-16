# AUR release layout

The repository carries two independent AUR package directories:

```text
packaging/aur/prettyzap-bin/
packaging/aur/prettyzap-omarchy/
```

`prettyzap-bin` is the clean Arch package. It downloads the signed release
AppImage, extracts it at package-build time so runtime FUSE support is not
required, and installs a normal launcher, desktop entry, and icon.

`prettyzap-omarchy` depends on `prettyzap-bin` and installs the Omarchy/
Quattro integration: the `prettyletto.prettyzap` bar widget, an explicit
standalone fallback for non-Omarchy Quickshell users, the optional menu
snippet, and the `prettyzap-omarchy-setup` installer (which wraps
`packaging/omarchy/install.sh`). It never edits a user's Omarchy
configuration — the user runs `prettyzap-omarchy-setup` to opt in.

## Syncing the integration files

makepkg cannot take directories as sources, so the AUR directory carries
renamed copies of `packaging/omarchy/` (see the sync table in
`packaging/omarchy/README.md`). Before a release, re-copy those files and
refresh the checksums:

```bash
cd packaging/aur/prettyzap-omarchy
# (re-copy the renamed files from packaging/omarchy/)
makepkg -g >> PKGBUILD   # or update sha256sums manually, then remove the stray line
makepkg --printsrcinfo > .SRCINFO
makepkg -Cfs             # verify a clean build
```

## Release checklist

Before pushing either directory to the AUR:

1. Build the exact AppImage release and update its SHA-256 in the core PKGBUILD
   and `.SRCINFO`.
2. Run `packaging/omarchy/check-sync.sh`, then re-sync the
   `prettyzap-omarchy` integration files from `packaging/omarchy/`
   and refresh its PKGBUILD checksums + `.SRCINFO`.
3. Run `makepkg --printsrcinfo > .SRCINFO` in each package directory.
4. Run `makepkg -Cfs` in a clean Arch build environment.
5. Install the resulting package in a clean user account and verify launch,
   desktop-menu discovery, persistent WhatsApp authentication, Omarchy bar
   behavior, and tray fallback behavior,
   `prettyzap-omarchy-setup --plugin` and `--standalone`, and uninstall
   cleanliness.

The repository is `https://github.com/prettyletto/prettyzap` and the project is
licensed under MIT.
