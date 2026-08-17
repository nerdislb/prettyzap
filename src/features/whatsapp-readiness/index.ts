import type { WebContents } from "electron";

const SHELL_SELECTORS = {
  applicationRoot: '[data-testid="wa-web-main-screen"]',
  navigationRail: 'header[data-testid="chatlist-header"]',
  chatList: "#side",
} as const;

export interface WhatsAppShellState {
  ready: boolean;
  url: string;
  documentReadyState: string;
  root: ElementState;
  navigationRail: ElementState;
  chatList: ElementState;
}

interface ElementState {
  present: boolean;
  visible: boolean;
  display?: string;
  visibility?: string;
  opacity?: string;
  width?: number;
  height?: number;
  drawerCollapsed?: string | null;
  chatListHidden?: string | null;
  chatListShell?: string | null;
}

function createShellStateScript(timeoutMs: number): string {
  return `(() => new Promise((resolve) => {
    const selectors = ${JSON.stringify(SHELL_SELECTORS)};
    const describe = (element) => {
      if (!(element instanceof Element)) return { present: false, visible: false };
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return {
        present: true,
        visible: style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity) !== 0 && rect.width > 0 && rect.height > 0,
        display: style.display,
        visibility: style.visibility,
        opacity: style.opacity,
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        drawerCollapsed: element.getAttribute("data-prettyzap-drawer-collapsed"),
        chatListHidden: element.getAttribute("data-prettyzap-chat-list-hidden"),
        chatListShell: element.getAttribute("data-prettyzap-chat-list-shell"),
      };
    };
    const inspect = () => {
      const root = document.querySelector(selectors.applicationRoot);
      const navigationRail = document.querySelector(selectors.navigationRail);
      const chatList = document.querySelector(selectors.chatList);
      const rootState = describe(root);
      const railState = describe(navigationRail);
      const chatListState = describe(chatList);
      return {
        ready: rootState.visible && railState.visible && chatListState.visible,
        url: location.href,
        documentReadyState: document.readyState,
        root: rootState,
        navigationRail: railState,
        chatList: chatListState,
      };
    };
    let settled = false;
    let observer;
    let timeout;
    let pollTimer;
    let frame = 0;
    const finish = (state) => {
      if (settled) return;
      settled = true;
      observer?.disconnect();
      clearTimeout(timeout);
      clearInterval(pollTimer);
      if (frame) cancelAnimationFrame(frame);
      resolve(state);
    };
    const check = () => {
      // Collapse mutation bursts into one check per frame. WhatsApp's boot
      // emits thousands of mutations; running layout reads on every single
      // one slows the very boot we are waiting for.
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const state = inspect();
        if (state.ready) finish(state);
      });
    };
    const initial = inspect();
    if (initial.ready) {
      finish(initial);
      return;
    }
    observer = new MutationObserver(check);
    observer.observe(document.documentElement, { childList: true, subtree: true });
    // Visibility can flip via style attribute changes that a childList-only
    // observer misses; a cheap poll covers that without a whole-document
    // attribute watch that would fire on every mutation.
    pollTimer = setInterval(() => {
      const state = inspect();
      if (state.ready) finish(state);
    }, 1000);
    timeout = setTimeout(() => finish(inspect()), ${timeoutMs});
  }))()`;
}

/**
 * Resolves once WhatsApp has painted the authenticated chat shell, or returns
 * its structural state after a short window. Callers are expected to re-poll:
 * after a fresh login or a slow reconnect the shell can appear minutes after
 * the page loaded. This deliberately records no chat content, message text,
 * or account data.
 */
export async function waitForWhatsAppShell(
  webContents: WebContents,
  timeoutMs = 4_000,
): Promise<WhatsAppShellState> {
  return webContents.executeJavaScript(createShellStateScript(timeoutMs)) as Promise<WhatsAppShellState>;
}
