import { ipcRenderer } from "electron";

const DRAWER_STATE_EVENT = "prettyzap-drawer-state";
const DRAWER_STATE_CHANNEL = "prettyzap:drawer-state";
const WHATSAPP_UNREAD_CHANNEL = "prettyzap:whatsapp-unread";

document.addEventListener(DRAWER_STATE_EVENT, (event) => {
  if (!(event instanceof CustomEvent)) return;
  const detail = event.detail;
  if (!detail || typeof detail !== "object" || typeof detail.collapsed !== "boolean") return;
  ipcRenderer.send(DRAWER_STATE_CHANNEL, { collapsed: detail.collapsed });
});

let lastUnreadCount = -1;

function parseUnreadCount(title: string): number {
  const text = String(title || "");
  const value = text.match(/\((\d[\d,]*\+?)\)/)?.[1]
    ?? text.match(/^(\d[\d,]*\+?)\s/)?.[1];
  if (!value) return 0;
  if (value.endsWith("+")) return 100;
  const count = Number.parseInt(value.replaceAll(",", ""), 10);
  return Number.isFinite(count) && count > 0 ? Math.min(count, 999_999) : 0;
}

function publishUnreadCount(): void {
  const count = parseUnreadCount(document.title);
  if (count === lastUnreadCount) return;
  lastUnreadCount = count;
  ipcRenderer.send(WHATSAPP_UNREAD_CHANNEL, count);
}

function observeUnreadTitle(): void {
  publishUnreadCount();
  const title = document.querySelector("title");
  if (!title) return;
  new MutationObserver(publishUnreadCount).observe(title, {
    childList: true,
    characterData: true,
    subtree: true,
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", observeUnreadTitle, { once: true });
} else {
  observeUnreadTitle();
}
