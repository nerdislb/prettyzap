import type { WebContents } from "electron";
import * as fs from "node:fs";
import { waitForWhatsAppShell } from "../whatsapp-readiness";
import {
  parsePalette,
  resolvePaletteSources,
  type OmarchyPalette,
  type PaletteSources,
} from "../../main/palette";

export type WhatsAppThemeMode = "whatsapp" | "system";

export interface WhatsAppThemeController {
  toggle(): void;
  setMode(mode: WhatsAppThemeMode): void;
  getMode(): WhatsAppThemeMode;
  /** Re-read the palette file and re-apply the stylesheet (tweaker saves). */
  refreshPalette(): void;
  dispose(): void;
}

const THEME_ATTRIBUTE = "data-prettyzap-theme";

interface Rgb {
  r: number;
  g: number;
  b: number;
}

interface ThemeRoles {
  mode: "dark" | "light";
  appBackground: string;
  panelBackground: string;
  elevatedBackground: string;
  inputBackground: string;
  incomingBubble: string;
  outgoingBubble: string;
  primaryText: string;
  secondaryText: string;
  mutedText: string;
  border: string;
  selection: string;
  accent: string;
  link: string;
  unreadText: string;
}

function parseRgb(hex: string): Rgb {
  const value = hex.slice(1, 7);
  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16),
  };
}

function formatRgb(rgb: Rgb): string {
  return `#${[rgb.r, rgb.g, rgb.b]
    .map((channel) => Math.max(0, Math.min(255, Math.round(channel))).toString(16).padStart(2, "0"))
    .join("")}`;
}

function formatRgbChannels(hex: string): string {
  const rgb = parseRgb(hex);
  return `${rgb.r}, ${rgb.g}, ${rgb.b}`;
}

function mixColors(base: string, tint: string, tintWeight: number): string {
  const first = parseRgb(base);
  const second = parseRgb(tint);
  return formatRgb({
    r: first.r + (second.r - first.r) * tintWeight,
    g: first.g + (second.g - first.g) * tintWeight,
    b: first.b + (second.b - first.b) * tintWeight,
  });
}

function channelLuminance(channel: number): number {
  const normalized = channel / 255;
  return normalized <= 0.03928
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const rgb = parseRgb(hex);
  return 0.2126 * channelLuminance(rgb.r) + 0.7152 * channelLuminance(rgb.g) + 0.0722 * channelLuminance(rgb.b);
}

function deriveThemeRoles(palette: OmarchyPalette): ThemeRoles {
  const dark = palette.mode === "dark";
  const surfaceTint = dark ? 0.08 : 0.035;
  const elevatedTint = dark ? 0.14 : 0.07;
  const secondaryTint = dark ? 0.34 : 0.28;
  const mutedTint = dark ? 0.52 : 0.46;
  const appBackground = palette.background;
  const panelBackground = mixColors(appBackground, palette.foreground, surfaceTint);
  const elevatedBackground = mixColors(appBackground, palette.foreground, elevatedTint);
  const inputBackground = mixColors(palette.darkBackground, palette.foreground, dark ? 0.12 : 0.08);
  const incomingBubble = mixColors(appBackground, palette.foreground, dark ? 0.02 : 0.035);
  const outgoingBubble = mixColors(panelBackground, palette.accent, dark ? 0.2 : 0.1);
  const selection = mixColors(panelBackground, palette.accent, dark ? 0.18 : 0.11);
  const primaryText = palette.foreground;
  const secondaryText = mixColors(palette.foreground, appBackground, secondaryTint);
  const mutedText = mixColors(palette.foreground, appBackground, mutedTint);
  const border = mixColors(panelBackground, palette.foreground, dark ? 0.18 : 0.14);
  const accent = palette.accent;
  const link = luminance(palette.blue) < 0.16 && dark
    ? mixColors(palette.blue, palette.foreground, 0.5)
    : palette.blue;
  const unreadText = luminance(selection) > 0.55 ? palette.darkerBackground : palette.foreground;

  return {
    mode: palette.mode,
    appBackground,
    panelBackground,
    elevatedBackground,
    inputBackground,
    incomingBubble,
    outgoingBubble,
    primaryText,
    secondaryText,
    mutedText,
    border,
    selection,
    accent,
    link,
    unreadText,
  };
}

async function loadPalette(
  sources: PaletteSources,
  isCustomPaletteActive: () => boolean,
): Promise<OmarchyPalette | undefined> {
  // On Omarchy the saved palette only counts while the user pinned it;
  // elsewhere it always applies. Either way it wins over the Omarchy theme.
  const order = isCustomPaletteActive()
    ? [sources.custom, sources.omarchy]
    : [sources.omarchy, sources.custom];
  for (const source of order) {
    if (!source) continue;
    try {
      const palette = parsePalette(await fs.promises.readFile(source.file, "utf8"));
      if (palette) return palette;
    } catch (error: unknown) {
      // A missing file is normal before the first tweaker save or while
      // Omarchy swaps theme files; only report real read errors.
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        console.warn("PrettyZap could not read the active palette", error);
      }
    }
  }
  return undefined;
}

function createSystemThemeCss(palette: OmarchyPalette): string {
  const root = `html[${THEME_ATTRIBUTE}="system"]`;
  const roles = deriveThemeRoles(palette);
  return `
    /* Paint-only rules. No display, geometry, hierarchy, or visibility changes. */
    ${root} {
      color-scheme: ${roles.mode};
      --prettyzap-app-background: ${roles.appBackground} !important;
      --prettyzap-panel-background: ${roles.panelBackground} !important;
      --prettyzap-elevated-background: ${roles.elevatedBackground} !important;
      --prettyzap-input-background: ${roles.inputBackground} !important;
      --prettyzap-incoming-bubble: ${roles.incomingBubble} !important;
      --prettyzap-outgoing-bubble: ${roles.outgoingBubble} !important;
      --prettyzap-primary-text: ${roles.primaryText} !important;
      --prettyzap-secondary-text: ${roles.secondaryText} !important;
      --prettyzap-muted-text: ${roles.mutedText} !important;
      --prettyzap-border: ${roles.border} !important;
      --prettyzap-selection: ${roles.selection} !important;
      --prettyzap-accent: ${roles.accent} !important;
      --prettyzap-link: ${roles.link} !important;
      --prettyzap-unread-text: ${roles.unreadText} !important;

      /* WhatsApp's own surface tokens keep plain, preview, media, and quote
         messages on one palette without painting arbitrary descendant divs. */
      --background-default: ${roles.appBackground} !important;
      --search-container-background: ${roles.panelBackground} !important;
      --drawer-background-deep: ${roles.appBackground} !important;
      --panel-background-deeper: ${roles.appBackground} !important;
      --compose-input-background: ${roles.inputBackground} !important;
      --compose-input-border: ${roles.border} !important;
      --panel-input-background: ${roles.inputBackground} !important;
      --conversation-header-border: ${roles.border} !important;
      --conversation-panel-border: ${roles.border} !important;
      --dropdown-background: ${roles.elevatedBackground} !important;
      --intro-background: ${roles.panelBackground} !important;
      --reactions-panel-background-color: ${roles.elevatedBackground} !important;
      --reactions-tray-background: ${roles.elevatedBackground} !important;
      --reactions-details-background: ${roles.elevatedBackground} !important;
      --sticker-button-background: ${roles.elevatedBackground} !important;
      --svg-gray-button: ${roles.elevatedBackground} !important;
      --WDS-background-wash-inset: ${roles.panelBackground} !important;
      --WDS-background-wash-plain: ${roles.appBackground} !important;
      --WDS-background-elevated-wash-inset: ${roles.elevatedBackground} !important;
      --WDS-surface-default: ${roles.appBackground} !important;
      --WDS-surface-emphasized: ${roles.panelBackground} !important;
      --WDS-surface-elevated-default: ${roles.elevatedBackground} !important;
      --WDS-surface-elevated-emphasized: ${roles.elevatedBackground} !important;
      --WDS-content-default: ${roles.primaryText} !important;
      --WDS-content-deemphasized: ${roles.secondaryText} !important;
      --WDS-content-action-default: ${roles.primaryText} !important;
      --WDS-content-disabled: ${roles.mutedText} !important;
      --WDS-systems-chat-background-wallpaper: ${roles.appBackground} !important;
      --WDS-systems-chat-surface-composer: ${roles.inputBackground} !important;
      --WDS-systems-chat-surface-tray: ${roles.appBackground} !important;
      --WDS-systems-bubble-surface-system: ${roles.incomingBubble} !important;
      --WDS-systems-bubble-surface-incoming: ${roles.incomingBubble} !important;
      --WDS-systems-bubble-surface-incoming-RGB: ${formatRgbChannels(roles.incomingBubble)} !important;
      --WDS-systems-bubble-surface-outgoing: ${roles.outgoingBubble} !important;
      --WDS-systems-bubble-surface-outgoing-RGB: ${formatRgbChannels(roles.outgoingBubble)} !important;
    }

    ${root} [data-testid="cell-frame-primary-detail"],
    ${root} [data-testid="cell-frame-title"],
    ${root} [data-testid="conversation-info-header-chat-title"] {
      color: var(--prettyzap-primary-text) !important;
    }

    ${root} [data-testid="cell-frame-secondary"],
    ${root} [data-testid="chat-subtitle"],
    ${root} [data-testid="last-msg-status"],
    ${root} [data-testid="msg-meta"] {
      color: var(--prettyzap-secondary-text) !important;
    }

    ${root} [data-testid="filter-button"] {
      color: var(--prettyzap-secondary-text) !important;
    }

    ${root} [data-testid="filter-button"][aria-selected="true"],
    ${root} [data-testid="filter-button"][aria-pressed="true"],
    ${root} [data-testid="filter-button"][data-state="active"] {
      color: var(--prettyzap-primary-text) !important;
      background-color: var(--prettyzap-selection) !important;
      border-color: var(--prettyzap-border) !important;
    }

    ${root} [data-testid="icon-unread-count"] {
      background-color: var(--prettyzap-accent) !important;
      color: var(--prettyzap-unread-text) !important;
      border-color: transparent !important;
    }

    ${root} [data-testid="chatlist-header"],
    ${root} [data-testid="conversation-header"],
    ${root} [data-testid="conversation-compose-box"] {
      background-color: var(--prettyzap-panel-background) !important;
      border-color: var(--prettyzap-border) !important;
    }

    ${root} [data-testid="conversation-compose-box-input"] {
      color: var(--prettyzap-primary-text) !important;
      caret-color: var(--prettyzap-accent) !important;
    }

    ${root} [data-testid="message-in"],
    ${root} div.message-in {
      background-color: var(--prettyzap-incoming-bubble) !important;
      color: var(--prettyzap-primary-text) !important;
    }

    ${root} [data-testid="message-out"],
    ${root} div.message-out {
      background-color: var(--prettyzap-outgoing-bubble) !important;
      color: var(--prettyzap-primary-text) !important;
    }

    ${root} [data-testid="message-in"] [data-testid="msg-meta"],
    ${root} [data-testid="message-out"] [data-testid="msg-meta"] {
      color: var(--prettyzap-muted-text) !important;
    }

    ${root} [data-testid="addon-bubble-container"] {
      /* Reactions are mounted in this wrapper. Keep the wrapper transparent;
         painting it as an elevated panel creates a rectangular halo around a
         standalone emoji while WhatsApp's inner reaction chip is rendering. */
      background-color: transparent !important;
      border-color: transparent !important;
    }

    ${root} [data-testid="link-preview-container"] {
      background-color: var(--prettyzap-elevated-background) !important;
      color: var(--prettyzap-primary-text) !important;
      border-color: var(--prettyzap-border) !important;
    }

    ${root} [data-testid="message-in"] a,
    ${root} [data-testid="message-out"] a,
    ${root} [data-testid="url-element"],
    ${root} [data-testid="link-preview-title"] {
      color: var(--prettyzap-link) !important;
    }

    ${root} [data-testid="message-in"] [data-icon="msg-check"],
    ${root} [data-testid="message-in"] [data-icon="msg-dblcheck"],
    ${root} [data-testid="message-in"] [data-icon="msg-dblcheck-ack"],
    ${root} [data-testid="message-out"] [data-icon="msg-check"],
    ${root} [data-testid="message-out"] [data-icon="msg-dblcheck"],
    ${root} [data-testid="message-out"] [data-icon="msg-dblcheck-ack"] {
      color: var(--prettyzap-accent) !important;
    }

    ${root} [data-testid="conversation-background-default_chat_wallpaper"] {
      background-color: var(--prettyzap-app-background) !important;
    }

    ${root} ::selection {
      background-color: var(--prettyzap-accent) !important;
      color: var(--prettyzap-app-background) !important;
    }
  `;
}

function setThemeMarker(webContents: WebContents, mode: WhatsAppThemeMode): Promise<void> {
  const value = mode === "system" ? "system" : "whatsapp";
  return webContents.executeJavaScript(`(() => {
    const root = document.documentElement;
    if (!root) return false;
    root.setAttribute(${JSON.stringify(THEME_ATTRIBUTE)}, ${JSON.stringify(value)});
    return root.getAttribute(${JSON.stringify(THEME_ATTRIBUTE)}) === ${JSON.stringify(value)};
  })()`).then(() => undefined);
}

/** Installs one reversible stylesheet and toggles only its root marker. */
export function installWhatsAppTheme(
  webContents: WebContents,
  initialMode: WhatsAppThemeMode,
  onModeChanged: (mode: WhatsAppThemeMode) => void,
  isCustomPaletteActive: () => boolean,
): WhatsAppThemeController {
  let mode = initialMode;
  let stylesheetKey: string | undefined;
  let disposed = false;
  let applyChain = Promise.resolve();
  let refreshTimer: ReturnType<typeof setTimeout> | undefined;
  let palettePollTimer: ReturnType<typeof setInterval> | undefined;
  let themeWatcher: fs.FSWatcher | undefined;
  let omarchyThemeWatcher: fs.FSWatcher | undefined;
  let documentReady = false;
  let loadGeneration = 0;

  const removeStylesheet = async (): Promise<void> => {
    const key = stylesheetKey;
    stylesheetKey = undefined;
    if (!key || webContents.isDestroyed()) return;
    try {
      await webContents.removeInsertedCSS(key);
    } catch (error: unknown) {
      console.warn("Unable to remove PrettyZap system palette", error);
    }
  };

  const installStylesheet = async (): Promise<void> => {
    if (disposed || webContents.isDestroyed() || stylesheetKey) return;
    const palette = await loadPalette(sources, isCustomPaletteActive);
    if (!palette || disposed || webContents.isDestroyed()) return;
    try {
      stylesheetKey = await webContents.insertCSS(createSystemThemeCss(palette));
    } catch (error: unknown) {
      console.warn("Unable to install PrettyZap system palette", error);
    }
  };

  const applyMarker = async (): Promise<void> => {
    if (disposed || webContents.isDestroyed()) return;
    try {
      await setThemeMarker(webContents, mode);
    } catch (error: unknown) {
      console.warn("Unable to set PrettyZap theme marker", error);
    }
  };

  const applyDocument = async (): Promise<void> => {
    if (disposed || webContents.isDestroyed()) return;
    await installStylesheet();
    await applyMarker();
  };

  const queue = (operation: () => Promise<void>): void => {
    applyChain = applyChain.then(operation, operation);
  };

  const setMode = (nextMode: WhatsAppThemeMode): void => {
    if (mode === nextMode) return;
    mode = nextMode;
    onModeChanged(mode);
    if (documentReady) queue(applyMarker);
  };

  const onBeforeInput = (event: Electron.Event, input: Electron.Input): void => {
    if (
      input.type !== "keyDown" ||
      !(input.control || input.meta) ||
      !input.shift ||
      input.alt ||
      input.key.toLowerCase() !== "t"
    ) return;
    event.preventDefault();
    setMode(mode === "system" ? "whatsapp" : "system");
  };

  const onFinishedLoad = (): void => {
    documentReady = true;
    const generation = ++loadGeneration;
    queue(async () => {
      const state = await waitForWhatsAppShell(webContents);
      if (disposed || generation !== loadGeneration || !state.ready) {
        if (!disposed && !state.ready) {
          console.warn("PrettyZap system palette skipped: WhatsApp chat shell was not ready", state);
        }
        return;
      }
      await removeStylesheet();
      await applyDocument();
    });
  };
  const scheduleThemeRefresh = (): void => {
    if (refreshTimer) clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => {
      refreshTimer = undefined;
      if (!documentReady) return;
      queue(async () => {
        await removeStylesheet();
        await applyDocument();
      });
    }, 200);
  };

  const sources = resolvePaletteSources();

  // Effective-state tracking across both possible sources: a saved custom
  // palette overrides the live Omarchy palette. Content snapshots make the
  // 1s poll resilient to file/directory replacements that kill fs.watch.
  let lastState: string | undefined;
  let paletteMissing = false;
  const pollPaletteSource = async (): Promise<void> => {
    let state: string | undefined;
    const order = isCustomPaletteActive()
      ? [sources.custom, sources.omarchy]
      : [sources.omarchy, sources.custom];
    for (const source of order) {
      if (!source) continue;
      try {
        const content = await fs.promises.readFile(source.file, "utf8");
        state = `${source.kind}:${content}`;
        break;
      } catch {
        state = undefined;
      }
    }
    if (state === undefined) {
      paletteMissing = true;
      // The active palette can be briefly absent while the tweaker swaps
      // files or Omarchy switches themes. The next poll picks it up without
      // disturbing the WhatsApp view.
      return;
    }
    if (paletteMissing) {
      // The palette reappeared (first custom save, or Omarchy finished a
      // theme swap): apply it now, not on the next change.
      paletteMissing = false;
      lastState = state;
      scheduleThemeRefresh();
      return;
    }
    if (lastState === undefined) {
      lastState = state; // already applied by the initial document pass
      return;
    }
    if (state !== lastState) {
      lastState = state;
      scheduleThemeRefresh();
    }
  };

  webContents.on("before-input-event", onBeforeInput);
  webContents.on("did-finish-load", onFinishedLoad);
  try {
    // The custom palette shares its directory with shell-state.json and
    // status.json, so only react to the palette file itself.
    themeWatcher = fs.watch(sources.custom.watchDir, { persistent: false }, (_eventType, filename) => {
      if (typeof filename === "string" && filename !== "colors.toml") return;
      scheduleThemeRefresh();
    });
  } catch (error: unknown) {
    console.warn("Unable to watch the PrettyZap palette", error);
  }
  if (sources.omarchy) {
    try {
      // Omarchy can replace colors.toml or its containing theme directory
      // during a theme switch (filename may be null), so react to any event.
      omarchyThemeWatcher = fs.watch(sources.omarchy.watchDir, { persistent: false }, () => {
        scheduleThemeRefresh();
      });
    } catch (error: unknown) {
      console.warn("Unable to watch the Omarchy theme", error);
    }
  }
  void pollPaletteSource();
  palettePollTimer = setInterval(() => {
    void pollPaletteSource();
  }, 1_000);
  palettePollTimer.unref();
  return {
    toggle: () => setMode(mode === "system" ? "whatsapp" : "system"),
    setMode,
    getMode: () => mode,
    refreshPalette: () => {
      if (disposed || !documentReady) return;
      scheduleThemeRefresh();
    },
    dispose: () => {
      disposed = true;
      loadGeneration += 1;
      if (refreshTimer) clearTimeout(refreshTimer);
      if (palettePollTimer) clearInterval(palettePollTimer);
      themeWatcher?.close();
      omarchyThemeWatcher?.close();
      webContents.removeListener("before-input-event", onBeforeInput);
      webContents.removeListener("did-finish-load", onFinishedLoad);
      applyChain = applyChain.then(async () => {
        await removeStylesheet();
        if (!webContents.isDestroyed()) await setThemeMarker(webContents, "whatsapp");
      }, removeStylesheet);
    },
  };
}
