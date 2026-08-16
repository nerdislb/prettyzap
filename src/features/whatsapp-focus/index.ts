import type { WebContents } from "electron";
import { whatsappFocusSelectors } from "./selectors";

const FOCUS_TIMEOUT_MS = 1400;
const DRAWER_TOGGLE_ID = "prettyzap-whatsapp-drawer-toggle";

function createFocusActiveComposerScript(): string {
  const selectors = JSON.stringify(whatsappFocusSelectors);

  return `(() => {
    const selectors = ${selectors};
    const deadline = Date.now() + ${FOCUS_TIMEOUT_MS};

    const isUsable = (element) => {
      if (!(element instanceof HTMLElement) || !element.isConnected) return false;
      if (element.getAttribute("aria-disabled") === "true" || element.hasAttribute("disabled")) {
        return false;
      }

      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      if (
        style.display === "none" ||
        style.visibility === "hidden" ||
        style.visibility === "collapse" ||
        rect.width <= 0 ||
        rect.height <= 0
      ) {
        return false;
      }

      return element.isContentEditable || element.getAttribute("role") === "textbox";
    };

    const findComposer = () => {
      const panel = document.querySelector(selectors.conversationPanel);
      const panelStyle = panel instanceof HTMLElement ? window.getComputedStyle(panel) : null;
      const panelRect = panel instanceof HTMLElement ? panel.getBoundingClientRect() : null;
      const panelVisible = Boolean(
        panel instanceof HTMLElement &&
        panelStyle &&
        panelStyle.display !== "none" &&
        panelStyle.visibility !== "hidden" &&
        panelRect &&
        panelRect.width > 0 &&
        panelRect.height > 0,
      );
      const candidates = panelVisible
        ? [...panel.querySelectorAll(selectors.messageComposer)]
        : [...document.querySelectorAll(selectors.messageComposer)];
      return candidates.find(isUsable) ?? null;
    };

    return new Promise((resolve) => {
      let settled = false;
      let observer;
      let timeoutId;
      let retryId;

      const finish = (focused) => {
        if (settled) return;
        settled = true;
        observer?.disconnect();
        window.clearTimeout(timeoutId);
        window.cancelAnimationFrame(retryId);
        resolve(focused);
      };

      const attempt = () => {
        const composer = findComposer();
        if (composer) {
          composer.focus({ preventScroll: true });
          if (document.activeElement === composer || composer.contains(document.activeElement)) {
            finish(true);
            return;
          }
        }

        if (Date.now() >= deadline) {
          finish(false);
          return;
        }
        retryId = window.requestAnimationFrame(attempt);
      };

      observer = new MutationObserver(attempt);
      if (document.body) observer.observe(document.body, { childList: true, subtree: true });
      timeoutId = window.setTimeout(() => finish(false), ${FOCUS_TIMEOUT_MS});
      retryId = window.requestAnimationFrame(attempt);
    });
  })()`;
}

/** Focus WhatsApp's currently rendered native composer, if one is available. */
export async function focusActiveComposer(webContents: WebContents): Promise<boolean> {
  if (webContents.isDestroyed()) return false;

  try {
    const result = await webContents.executeJavaScript(createFocusActiveComposerScript());
    return result === true;
  } catch (error: unknown) {
    console.warn("Unable to focus PrettyZap WhatsApp composer", error);
    return false;
  }
}

function createRecoverFocusAfterEscapeScript(): string {
  const selectors = JSON.stringify(whatsappFocusSelectors);

  return `(() => {
    const active = document.activeElement;
    const toggle = document.getElementById(${JSON.stringify(DRAWER_TOGGLE_ID)});
    const stranded = active === document.body ||
      active === document.documentElement ||
      active === toggle;
    if (!stranded) return false;

    const isVisible = (element) => {
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== "none" &&
        style.visibility !== "hidden" &&
        rect.width > 0 &&
        rect.height > 0;
    };
    const nativeOverlayOpen = [...document.querySelectorAll(
      '[role="dialog"], [aria-modal="true"]',
    )].some((element) => isVisible(element));
    if (nativeOverlayOpen) return false;

    const selectors = ${selectors};
    const panel = document.querySelector(selectors.conversationPanel);
    if (!(panel instanceof HTMLElement) || !isVisible(panel)) return false;
    const composer = panel.querySelector(selectors.messageComposer);
    if (!(composer instanceof HTMLElement) || !isVisible(composer)) return false;
    if (composer.getAttribute("aria-disabled") === "true" ||
        composer.hasAttribute("disabled")) return false;

    composer.focus({ preventScroll: true });
    return document.activeElement === composer || composer.contains(document.activeElement);
  })()`;
}

/** Restore composer focus only when Escape left focus at the document level. */
export async function recoverFocusAfterEscape(webContents: WebContents): Promise<boolean> {
  if (webContents.isDestroyed()) return false;

  try {
    const result = await webContents.executeJavaScript(createRecoverFocusAfterEscapeScript());
    return result === true;
  } catch (error: unknown) {
    console.warn("Unable to recover PrettyZap WhatsApp focus after Escape", error);
    return false;
  }
}
