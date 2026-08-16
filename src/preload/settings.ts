import { contextBridge, ipcRenderer } from "electron";

const GET = "prettyzap:settings-get";
const UPDATE = "prettyzap:settings-update";
const CLOSE = "prettyzap:settings-close";

contextBridge.exposeInMainWorld("prettyZapSettings", Object.freeze({
  get: () => ipcRenderer.invoke(GET),
  update: (value: unknown) => ipcRenderer.invoke(UPDATE, value),
  close: () => ipcRenderer.send(CLOSE),
}));
