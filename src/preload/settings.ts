import { contextBridge, ipcRenderer } from "electron";

const GET = "prettyzap:settings-get";
const UPDATE = "prettyzap:settings-update";
const CLOSE = "prettyzap:settings-close";
const GET_PALETTE = "prettyzap:palette-get";
const SET_PALETTE = "prettyzap:palette-set";
const RESET_PALETTE = "prettyzap:palette-reset";
const PIN_PALETTE = "prettyzap:palette-pin";

contextBridge.exposeInMainWorld("prettyZapSettings", Object.freeze({
  get: () => ipcRenderer.invoke(GET),
  update: (value: unknown) => ipcRenderer.invoke(UPDATE, value),
  close: () => ipcRenderer.send(CLOSE),
  getPalette: () => ipcRenderer.invoke(GET_PALETTE),
  setPalette: (value: unknown) => ipcRenderer.invoke(SET_PALETTE, value),
  resetPalette: () => ipcRenderer.invoke(RESET_PALETTE),
  setPalettePinned: (pinned: boolean) => ipcRenderer.invoke(PIN_PALETTE, pinned),
}));
