import {
  app,
  BrowserWindow,
  session,
  WebContentsView,
} from "electron";
import * as path from "node:path";
import { installWhatsAppDrawer } from "../features/whatsapp-drawer";

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
    width: 1280,
    height: 800,
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
    },
  });

  whatsappView.webContents.setUserAgent(WHATSAPP_USER_AGENT);
  whatsappView.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  whatsappView.webContents.on("did-fail-load", (_event, errorCode, errorDescription) => {
    console.error("Unable to load WhatsApp Web", errorCode, errorDescription);
  });

  window.contentView.addChildView(whatsappView);
  layoutWhatsAppView(window, whatsappView);

  const removeDrawerFeature =
    process.env.PRETTYZAP_DISABLE_DRAWER === "1"
      ? () => undefined
      : installWhatsAppDrawer(whatsappView.webContents);

  void whatsappView.webContents.loadURL(WHATSAPP_URL).catch((error: unknown) => {
    console.error("Unable to load WhatsApp Web", error);
  });

  window.on("resize", () => layoutWhatsAppView(window, whatsappView));
  window.on("closed", () => {
    removeDrawerFeature();
    if (!whatsappView.webContents.isDestroyed()) {
      whatsappView.webContents.close();
    }
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
