import { contextBridge } from "electron";

// Intentionally empty: future PrettyZap features will add narrowly scoped APIs here.
contextBridge.exposeInMainWorld("prettyZap", Object.freeze({}));
