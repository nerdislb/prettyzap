import {
  app,
  BrowserWindow,
  Menu,
  nativeImage,
  Tray,
  globalShortcut,
  ipcMain,
  session,
  shell,
  WebContentsView,
} from "electron";
import * as path from "node:path";
import { installWhatsAppDrawer } from "../features/whatsapp-drawer";
import { installWhatsAppTheme } from "../features/whatsapp-theme";
import type { WhatsAppThemeController } from "../features/whatsapp-theme";
import { focusActiveComposer } from "../features/whatsapp-focus";
import { loadShellState, saveShellState, type ShellState } from "./shell-state";

app.setName("PrettyZap");

// Keep the existing profile created by the earlier Pjzap builds. The product
// is now named PrettyZap, but changing Electron's userData directory would
// unnecessarily discard the user's existing WhatsApp Web session.
app.setPath("userData", path.join(app.getPath("appData"), "pjzap"));

const WHATSAPP_URL = "https://web.whatsapp.com/";
// Keep the existing WhatsApp Web cache so the current login survives this reset.
const WHATSAPP_PARTITION = "persist:whatsapp";
const WHATSAPP_USER_AGENT =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/132.0.6834.210 Safari/537.36";
function isWhatsAppUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.protocol === "https:" && parsedUrl.origin === "https://web.whatsapp.com";
  } catch {
    return false;
  }
}

function openExternalUrl(url: string): void {
  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") return;

    void shell.openExternal(parsedUrl.toString()).catch((error: unknown) => {
      console.warn("Unable to open external URL", error);
    });
  } catch {
    // Ignore malformed URLs and unsupported schemes at the shell boundary.
  }
}
const SHOW_HIDE_ACCELERATOR = "CommandOrControl+Shift+Space";
const TOGGLE_ARGUMENT = "--toggle";
const DRAWER_STATE_CHANNEL = "prettyzap:drawer-state";
const TRAY_ICON = nativeImage.createFromDataURL(
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQEAIAAADAAbR1AAAAIGNIUk0AAHomAACAhAAA+gAAAIDoAAB1MAAA6mAAADqYAAAXcJy6UTwAAAAGYktHRP///////wlY99wAAAAHdElNRQfqCBAAKTh3JqlvAAAAJXRFWHRkYXRlOmNyZWF0ZQAyMDI2LTA4LTE2VDAwOjQxOjU2KzAwOjAw19CgsgAAACV0RVh0ZGF0ZTptb2RpZnkAMjAyNi0wOC0xNlQwMDo0MTo1NiswMDowMKaNGA4AAAAodEVYdGRhdGU6dGltZXN0YW1wADIwMjYtMDgtMTZUMDA6NDE6NTYrMDA6MDDxmDnRAAAAYklEQVQ4y2NkYFixoqWFgWaAiXZG08kCFmIU/f8fHl5djSkuyLhertf2A8Ov7h8eFFkAMQhTHL/RBCxAc3U4QzV+g3D5ZuhH8qgFBAHOVIQraeICuJIsC6kaSAVDPw5obgEALmsjxWv//f0AAAAASUVORK5CYII=",
);

let prettyZapWindow: BrowserWindow | undefined;
let whatsappWebContents: WebContentsView["webContents"] | undefined;
let pendingToggle = false;
let pendingFocus = false;
let tray: Tray | undefined;
let isQuitting = false;
let shellState = loadShellState();
let saveTimer: ReturnType<typeof setTimeout> | undefined;
let whatsappThemeController: WhatsAppThemeController | undefined;
let whatsappThemeMenuItems: { whatsapp?: Electron.MenuItem; system?: Electron.MenuItem } = {};

function persistShellState(): void {
  if (saveTimer) clearTimeout(saveTimer);
  saveShellState(shellState);
}

function scheduleShellStateSave(): void {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = undefined;
    saveShellState(shellState);
  }, 150);
}

function updateWindowState(window: BrowserWindow): void {
  const [width, height] = window.getContentSize();
  if (!window.isMaximized()) {
    shellState.width = width;
    shellState.height = height;
  }
  shellState.maximized = window.isMaximized();
  scheduleShellStateSave();
}

function showWindow(): void {
  restoreAndFocusPrettyZapWindow();
}

function createTray(): void {
  try {
    tray = new Tray(TRAY_ICON);
    tray.setToolTip("PrettyZap");
    tray.setContextMenu(Menu.buildFromTemplate([
      { label: "Show PrettyZap", click: showWindow },
      { type: "separator" },
      {
        label: "Restart PrettyZap",
        click: () => {
          isQuitting = true;
          persistShellState();
          app.relaunch();
          app.exit(0);
        },
      },
      {
        label: "Quit PrettyZap",
        click: () => {
          isQuitting = true;
          persistShellState();
          app.quit();
        },
      },
    ]));
    tray.on("click", showWindow);
  } catch (error: unknown) {
    tray = undefined;
    console.warn("PrettyZap tray is unavailable on this desktop", error);
  }
}

function restoreAndFocusPrettyZapWindow(): void {
  const window = prettyZapWindow;
  if (!window || window.isDestroyed()) {
    pendingFocus = true;
    return;
  }

  if (window.isMinimized()) window.restore();
  window.show();
  window.focus();
}

function togglePrettyZapWindow(): void {
  const window = prettyZapWindow;
  if (!window || window.isDestroyed()) {
    pendingToggle = true;
    return;
  }

  if (window.isVisible()) {
    window.hide();
    return;
  }

  restoreAndFocusPrettyZapWindow();
  const webContents = whatsappWebContents;
  if (webContents) void focusActiveComposer(webContents);
}

function updateWhatsAppThemeMenu(): void {
  const mode = whatsappThemeController?.getMode();
  if (!mode) return;
  if (whatsappThemeMenuItems.whatsapp) whatsappThemeMenuItems.whatsapp.checked = mode === "whatsapp";
  if (whatsappThemeMenuItems.system) whatsappThemeMenuItems.system.checked = mode === "system";
}

function installApplicationMenu(): void {
  whatsappThemeMenuItems = {};
  const menu = Menu.buildFromTemplate([
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { type: "separator" },
        {
          label: "Use WhatsApp appearance",
          type: "radio",
          click: () => whatsappThemeController?.setMode("whatsapp"),
          registerAccelerator: false,
        },
        {
          label: "Use System palette",
          type: "radio",
          click: () => whatsappThemeController?.setMode("system"),
          registerAccelerator: false,
        },
      ],
    },
  ]);
  const view = menu.items[0]?.submenu;
  if (view) {
    whatsappThemeMenuItems.whatsapp = view.items[2];
    whatsappThemeMenuItems.system = view.items[3];
  }
  Menu.setApplicationMenu(menu);
  updateWhatsAppThemeMenu();
}

function layoutWhatsAppView(
  window: BrowserWindow,
  whatsappView: WebContentsView,
): void {
  const [contentWidth, contentHeight] = window.getContentSize();

  whatsappView.setBounds({
    x: 0,
    y: 0,
    width: contentWidth,
    height: contentHeight,
  });
}

function createWindow(): void {
  const window = new BrowserWindow({
    width: shellState.width,
    height: shellState.height,
    minWidth: 720,
    minHeight: 520,
    title: "PrettyZap",
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  const whatsappView = new WebContentsView({
    webPreferences: {
      session: session.fromPartition(WHATSAPP_PARTITION),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, "../preload/whatsapp.js"),
    },
  });

  prettyZapWindow = window;
  whatsappWebContents = whatsappView.webContents;

  whatsappView.webContents.setUserAgent(WHATSAPP_USER_AGENT);
  whatsappView.webContents.on("will-navigate", (event, url) => {
    if (isWhatsAppUrl(url)) return;

    event.preventDefault();
    openExternalUrl(url);
  });
  whatsappView.webContents.setWindowOpenHandler(({ url }) => {
    if (!isWhatsAppUrl(url)) openExternalUrl(url);
    return { action: "deny" };
  });
  whatsappView.webContents.on("did-fail-load", (_event, errorCode, errorDescription) => {
    console.error("Unable to load WhatsApp Web", errorCode, errorDescription);
  });

  window.contentView.addChildView(whatsappView);
  layoutWhatsAppView(window, whatsappView);

  const removeDrawerFeature =
    process.env.PRETTYZAP_DISABLE_DRAWER === "1"
      ? () => undefined
      : installWhatsAppDrawer(whatsappView.webContents, shellState.drawerCollapsed);

  const themeController = installWhatsAppTheme(
    whatsappView.webContents,
    shellState.whatsappTheme,
    (mode) => {
      shellState.whatsappTheme = mode;
      scheduleShellStateSave();
      updateWhatsAppThemeMenu();
    },
  );
  whatsappThemeController = themeController;

  if (shellState.maximized) window.maximize();

  void whatsappView.webContents.loadURL(WHATSAPP_URL).catch((error: unknown) => {
    console.error("Unable to load WhatsApp Web", error);
  });
  window.on("resize", () => {
    layoutWhatsAppView(window, whatsappView);
    updateWindowState(window);
  });
  window.on("maximize", () => updateWindowState(window));
  window.on("unmaximize", () => updateWindowState(window));
  window.on("close", (event) => {
    if (!isQuitting && tray) {
      event.preventDefault();
      window.hide();
      return;
    }
    persistShellState();
  });
  window.on("closed", () => {
    removeDrawerFeature();
    themeController?.dispose();
    if (whatsappThemeController === themeController) whatsappThemeController = undefined;
    if (prettyZapWindow === window) prettyZapWindow = undefined;
    if (whatsappWebContents === whatsappView.webContents) {
      whatsappWebContents = undefined;
    }
    if (!whatsappView.webContents.isDestroyed()) {
      whatsappView.webContents.close();
    }
  });
}

ipcMain.on(DRAWER_STATE_CHANNEL, (event, value: unknown) => {
  if (!whatsappWebContents || event.sender.id !== whatsappWebContents.id) return;
  if (!value || typeof value !== "object" || typeof (value as { collapsed?: unknown }).collapsed !== "boolean") return;
  shellState.drawerCollapsed = (value as { collapsed: boolean }).collapsed;
  scheduleShellStateSave();
});

const hasSingleInstanceLock = app.requestSingleInstanceLock();

if (!hasSingleInstanceLock) {
  app.quit();
} else {
  app.on("second-instance", (_event, commandLine) => {
    if (commandLine.includes(TOGGLE_ARGUMENT)) {
      togglePrettyZapWindow();
      return;
    }

    restoreAndFocusPrettyZapWindow();
  });

  app.whenReady().then(() => {
    createWindow();
    installApplicationMenu();
    createTray();

    if (pendingToggle) {
      pendingToggle = false;
      togglePrettyZapWindow();
    }
    if (pendingFocus) {
      pendingFocus = false;
      restoreAndFocusPrettyZapWindow();
    }

    const registered = globalShortcut.register(SHOW_HIDE_ACCELERATOR, () => {
      togglePrettyZapWindow();
    });
    if (!registered) {
      console.warn(
        `Unable to register PrettyZap global shortcut: ${SHOW_HIDE_ACCELERATOR}`,
      );
    }

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      } else {
        restoreAndFocusPrettyZapWindow();
      }
    });
  });

  app.on("will-quit", () => {
    isQuitting = true;
    persistShellState();
    tray?.destroy();
    tray = undefined;
    globalShortcut.unregister(SHOW_HIDE_ACCELERATOR);
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit();
    }
  });
}
