# History

PrettyZap evolved from an earlier Electron shell experiment that rendered a
custom sidebar beside WhatsApp Web.

That iteration lived in `src/renderer/` (a React sidebar UI) and
`src/whatsapp/` (a DOM adapter around WhatsApp's chat list). It was replaced
by the current architecture — a plain Electron window hosting a
`WebContentsView` with WhatsApp Web as the primary content, plus scoped
injected features under `src/features/` — and the old directories were
removed from the repository. They are preserved in git history (commit
`1e7f896` and earlier) for reference; nothing outside the current `src/main`,
`src/preload`, and `src/features` trees is built or imported.

Current feature layout:

```
src/
  main/          Electron main process (window, CLI, D-Bus, status file)
  preload/       Narrow preload scripts (settings window, WhatsApp page)
  features/      Injected WhatsApp features (drawer, focus, theme, readiness)
```
