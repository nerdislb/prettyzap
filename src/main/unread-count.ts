/**
 * WhatsApp Web puts the number of unread chats/messages in the browser title,
 * usually as `(3) WhatsApp`. Chromium exposes that title to Electron, so the
 * shell can show a count without scraping WhatsApp's private DOM structure.
 * `99+` is represented as 100 so the UI can render it as `99+`.
 */
export function parseUnreadCount(title: string): number {
  const value = String(title || "").match(/\((\d[\d,]*\+?)\)/)?.[1]
    ?? String(title || "").match(/^(\d[\d,]*\+?)\s/)?.[1];
  if (!value) return 0;
  if (value.endsWith("+")) return 100;
  const count = Number.parseInt(value.replaceAll(",", ""), 10);
  return Number.isFinite(count) && count > 0 ? Math.min(count, 999_999) : 0;
}

/**
 * Install a small page-world guard around Notification. Permission handlers
 * below cover Chromium/service-worker permission checks; this guard also
 * stops an already-granted page from constructing new notifications while
 * the user has PrettyZap notifications muted.
 */
export function notificationPolicyScript(enabled: boolean): string {
  const value = enabled ? "true" : "false";
  return `(() => {
    const key = "__prettyzapNotificationPolicy";
    const state = window[key] || (window[key] = { original: window.Notification });
    state.enabled = ${value};
    if (state.enabled) {
      if (state.original) window.Notification = state.original;
      return;
    }
    const BlockedNotification = function() {
      return {
        close() {},
        addEventListener() {},
        removeEventListener() {},
        dispatchEvent() { return false; },
      };
    };
    Object.defineProperty(BlockedNotification, "permission", {
      configurable: true,
      value: "denied",
    });
    BlockedNotification.requestPermission = () => Promise.resolve("denied");
    window.Notification = BlockedNotification;
  })()`;
}
