import { ipcRenderer } from "electron";

const DRAWER_STATE_EVENT = "prettyzap-drawer-state";
const DRAWER_STATE_CHANNEL = "prettyzap:drawer-state";

document.addEventListener(DRAWER_STATE_EVENT, (event) => {
  if (!(event instanceof CustomEvent)) return;
  const detail = event.detail;
  if (!detail || typeof detail !== "object" || typeof detail.collapsed !== "boolean") return;
  ipcRenderer.send(DRAWER_STATE_CHANNEL, { collapsed: detail.collapsed });
});
