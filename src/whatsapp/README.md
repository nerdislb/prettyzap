# WhatsApp boundary

This directory owns the WhatsApp Web DOM boundary. Selectors, injected layout
CSS/JS, and the mutation observer live here; the renderer does not query
WhatsApp's document.

The current slice uses live authenticated layout anchors observed in WhatsApp
Web: `drawer-left`, `drawer-middle`, `#side`, and `drawer-right`, plus the
current navbar sections. The expanded drawer shows WhatsApp's own navigation
and chat-list branches directly. When collapsed, those branches are hidden,
the ancestor chain is promoted to a full-size flex layout, and the existing
`drawer-right` conversation surface is positioned over the available area. If
no conversation is selected, WhatsApp's own empty state remains visible there.

For debugging a WhatsApp markup change, run the production build with layout
injection disabled:

```sh
PJZAP_DISABLE_WHATSAPP_LAYOUT=1 npm run start
```

This leaves the normal WhatsApp Web interface visible while keeping the same
persistent session and security settings.
