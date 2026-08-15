# PrettyZap Project — Chat Summary

## Project goal

PrettyZap is an Electron + TypeScript desktop framework around WhatsApp Web. It is not a WhatsApp reimplementation.

WhatsApp Web remains responsible for:

- Authentication and session state
- Synchronization
- Sending and receiving messages
- Message history, media, voice messages, replies, and reactions
- Composer behavior
- Encryption, networking, and normal rendering

PrettyZap owns the desktop shell and carefully scoped enhancements around the existing WhatsApp Web interface.

The project must not add:

- A replacement WhatsApp UI
- A custom backend
- A duplicate message/chat database
- Protocol or encryption reverse engineering
- Private webpack/internal WhatsApp APIs
- Undocumented networking APIs
- Unnecessary framework or state-management dependencies

## Electron architecture

The application uses an Electron `WebContentsView` to load:

```
https://web.whatsapp.com/
```

Important security requirements:

- Use `WebContentsView`, not `BrowserView`
- Do not use the `<webview>` element
- `nodeIntegration: false` for remote WhatsApp content
- `contextIsolation: true`
- `sandbox: true` where applicable
- Keep preload and IPC APIs narrow
- Do not expose arbitrary Electron or Node APIs to WhatsApp
- Use a persistent Electron partition, currently `persist:whatsapp`
- Preserve login/session data across restarts

Relevant source structure:

```
src/
  main/
  preload/
  features/
    whatsapp-drawer/
```

WhatsApp-specific DOM logic is kept inside the WhatsApp drawer feature. The original idea of a `src/whatsapp/` adapter boundary was discussed, but the current implementation stays simpler and avoids an unnecessary abstraction.

## Implemented foundation

The first slice created a minimal Electron + TypeScript application with:

- A resizable Electron window
- WhatsApp Web as the primary visible content
- Secure Electron defaults
- Persistent WhatsApp session
- Minimal preload boundary
- Development, typecheck, and build commands

PrettyZap displays WhatsApp Web itself rather than recreating WhatsApp beside it.

## Drawer enhancement

PrettyZap injects a small drawer control around WhatsApp’s own left-side navigation/chat-list area.

The drawer:

- Collapses and expands WhatsApp’s chat-list area
- Keeps WhatsApp’s native navigation rail visible
- Uses a button attached to the WhatsApp rail
- Starts collapsed in the intended layout
- Resizes with the Electron window
- Does not replace WhatsApp’s chat list or conversation UI
- Uses WhatsApp’s own DOM and native click behavior

The feature lives in:

- `src/features/whatsapp-drawer/index.ts`
- `src/features/whatsapp-drawer/selectors.ts`

Several visual issues were corrected during development, including leftover divider lines, incorrect compact-window sizing, poor drawer-button positioning, and overlaying clickable WhatsApp controls.

## Keyboard shortcuts

The Electron main process handles shortcuts through `before-input-event`:

- `Ctrl/Cmd + L`: toggle PrettyZap’s drawer
- `Ctrl/Cmd + /`: focus WhatsApp’s native chat search
- `Ctrl/Cmd + 1`: Chats
- `Ctrl/Cmd + 2`: Calls
- `Ctrl/Cmd + 3`: Status
- `Ctrl/Cmd + 4`: Channels
- `Ctrl/Cmd + 5`: Communities
- `Ctrl/Cmd + 6`: Meta AI
- `Ctrl/Cmd + 7`: Media
- `Ctrl/Cmd + 8`: You
- `Ctrl/Cmd + J`: scroll down in the active conversation
- `Ctrl/Cmd + K`: scroll up in the active conversation
- `Ctrl/Cmd + I`: focus the active conversation composer
- `Ctrl/Cmd + Enter`: focus the active conversation composer
- `Ctrl/Cmd + Shift + J`: cycle forward through chats
- `Ctrl/Cmd + Shift + K`: cycle backward through chats
- `Ctrl/Cmd + A`: open WhatsApp’s native Archived view

The chat-cycle drawer remains visible while shortcuts are repeated and hides after a short idle period when PrettyZap opened it automatically.

## Archived indexing bug and fix

Normal Chats and Archived use different rendered DOM structures.

Normal Chats use rows similar to:

```html
<div role="row" data-testid="list-item-0">
  <div role="gridcell">...</div>
</div>
```

Archived uses:

```html
<div data-testid="archived-chatlist">
  <div role="listitem" data-testid="list-item-0">...</div>
</div>
```

The old code searched only for normal `role="row"` elements. While Archived was open, the normal list remained underneath in the DOM, so PrettyZap sometimes indexed hidden normal rows or skipped the first archived conversation.

The fix:

- Detect the live archive container using `data-testid="archived-chatlist"`
- Use normal `role="row"` selectors only for Chats
- Use Archived `role="listitem"` rows only inside the archive container
- Maintain separate Chats and Archived cycle contexts
- Reset the index when entering or leaving Archived
- Reset before the native Archived click is processed
- Use WhatsApp’s `list-item-N` ordering instead of transient DOM-array positions
- Use native Electron mouse input for the final row click

Live verification:

1. `Ctrl+A` opens Archived.
2. First `Ctrl+Shift+J` selects **O melhor jogo de todos**, the actual first archived row.
3. Next `Ctrl+Shift+J` selects **Laryssa Rebouças**.
4. `Ctrl+Shift+K` returns to **O melhor jogo de todos**.
5. Returning to Chats resets the context and the first cycle selects **Novo Num (You)**.

## Virtualized lists

WhatsApp virtualizes long chat lists, so only part of a list may be rendered at once.

The cycling logic was extended to:

- Read the numeric `list-item-N` index
- Avoid relying on temporary DOM-array positions
- Detect when the next target is outside the rendered rows
- Scroll WhatsApp’s own list container
- Wait briefly for WhatsApp to render new rows
- Continue cycling through the newly rendered rows

This was live-tested by sending 24 forward cycle shortcuts through normal Chats. Selection continued beyond the initial rendered batch and reached a later conversation.

## Current changed files

- `/home/prettyletto/Projects/TS/Pjzap/src/features/whatsapp-drawer/index.ts`
- `/home/prettyletto/Projects/TS/Pjzap/src/features/whatsapp-drawer/selectors.ts`

Temporary DOM diagnostics were removed after the actual WhatsApp structures were confirmed.

## Validation

The following commands pass:

```
npm run typecheck
npm run build
```

The application has also been launched directly with:

```
npm run start
```

The authenticated WhatsApp session was used for live testing, and the app was left running after the latest validation.

## Constraints for future work

Work one vertical slice at a time:

1. Inspect the repository.
2. Explain the intended change.
3. Implement only that slice.
4. Run typecheck/build and relevant tests.
5. Fix errors.
6. Report changed files and limitations.

Keep WhatsApp selectors, DOM assumptions, observers, and injected scripts inside the WhatsApp feature area. Do not scatter them through generic application code.

Do not implement a custom PrettyZap chat list, duplicate WhatsApp state, or a new backend unless requirements explicitly change.

## Memory-consumption discussion

WhatsApp Web can grow to very high memory usage during long sessions and very large chats. Possible contributors include:

- Renderer JavaScript heap
- React/UI state
- DOM nodes and event handlers
- Decoded image/video buffers
- WebRTC or voice-call resources
- Service-worker and IndexedDB-backed data
- Chromium/Electron process overhead

PrettyZap cannot safely implement true message-level pagination or unload old WhatsApp message nodes. WhatsApp owns those nodes and its internal state. Removing them manually could break scrolling, replies, reactions, media, unread state, and event handlers.

A second PrettyZap message cache is also not recommended. It would duplicate data, introduce synchronization/privacy problems, and violate the goal of keeping WhatsApp Web as the source of truth.

The safe future feature is a memory-management layer around the WebContentsView:

```
PrettyZap memory layer
  -> observe WhatsApp renderer/process memory
  -> warn at a configurable threshold
  -> detect safe idle moments
  -> offer a manual “Recover memory” action
  -> optionally reload the WhatsApp WebContentsView
  -> preserve the persist:whatsapp session
```

Recovery should avoid reloads while the user is typing, recording voice, uploading media, or in a call.

Reloading the WebContentsView is the safest external way to destroy accumulated renderer JavaScript heap and DOM state. WhatsApp can reconstruct itself from its own persistent session data. This is not true message pagination, but it is compatible with the project’s architecture.

Clearing Chromium’s HTTP cache is unlikely to fix renderer heap growth. Clearing session storage or IndexedDB is unsafe because it may remove login/session data and should not be used for routine recovery.

## Suggested next slice

Implement a small memory guard without touching WhatsApp’s internal data:

- Collect renderer/process memory metrics from Electron
- Add a configurable warning threshold
- Add a manual recovery shortcut or control
- Reload only during a safe idle state
- Preserve the persistent WhatsApp partition
- Verify that login/session data survives recovery

Do not implement a duplicate message database or protocol-level cache.
