import type { WebContents } from "electron";
import { whatsappDrawerSelectors } from "./selectors";

const TOGGLE_ID = "prettyzap-whatsapp-drawer-toggle";
const STYLE_ID = "prettyzap-whatsapp-drawer-style";
const CHAT_LIST_HIDDEN = "data-prettyzap-chat-list-hidden";
const CHAT_LIST_SHELL = "data-prettyzap-chat-list-shell";
const CHAT_CYCLE_IDLE_MS = 700;
const ARCHIVED_VIEW_DESCRIPTION =
  "These chats stay archived when new messages are received.";
const NAVIGATION_SHORTCUTS = {
  "1": "chats",
  "2": "calls",
  "3": "status",
  "4": "channels",
  "5": "communities",
  "6": "metaAi",
  "7": "media",
  "8": "you",
} as const;

const toggleDrawerScript = `(() => {
  const button = document.getElementById(${JSON.stringify(TOGGLE_ID)});
  if (!(button instanceof HTMLButtonElement)) return false;
  button.click();
  return true;
})()`;

const resetArchivedChatCycleScript = `(() => {
  window.__prettyzapChatCycleIndex = -1;
  window.__prettyzapChatCycleView = "archived";
})()`;

function createFocusSearchScript(): string {
  const selectors = JSON.stringify(whatsappDrawerSelectors);

  return `(() => {
    const selectors = ${selectors};
    const root = document.querySelector(selectors.applicationRoot);
    const search = document.querySelector(selectors.chatListSearch);
    const toggle = document.getElementById(${JSON.stringify(TOGGLE_ID)});

    if (!(search instanceof HTMLInputElement)) return false;

    if (
      root?.getAttribute("data-prettyzap-drawer-collapsed") === "true" &&
      toggle instanceof HTMLButtonElement
    ) {
      toggle.click();
    }

    window.requestAnimationFrame(() => {
      search.focus({ preventScroll: true });
      search.select();
    });
    return true;
  })()`;
}

function createNavigationScript(navigationKey: string): string {
  const selectors = JSON.stringify(whatsappDrawerSelectors);

  return `(() => {
    const selectors = ${selectors};
    const root = document.querySelector(selectors.applicationRoot);
    const toggle = document.getElementById(${JSON.stringify(TOGGLE_ID)});
    const targetSelector = selectors.navigationButtons[${JSON.stringify(navigationKey)}];
    const target = targetSelector ? document.querySelector(targetSelector) : null;

    if (!(target instanceof HTMLButtonElement)) return false;

    if (
      root?.getAttribute("data-prettyzap-drawer-collapsed") === "true" &&
      toggle instanceof HTMLButtonElement
    ) {
      toggle.click();
    }

    target.click();
    return true;
  })()`;
}

function createScrollConversationScript(direction: "up" | "down"): string {
  const selectors = JSON.stringify(whatsappDrawerSelectors);
  const multiplier = direction === "down" ? 1 : -1;

  return `(() => {
    const selectors = ${selectors};
    const messages = document.querySelector(selectors.conversationMessages);
    if (!(messages instanceof HTMLElement)) return false;

    const distance = Math.max(240, messages.clientHeight * 0.75);
    messages.scrollBy({ top: distance * ${multiplier}, behavior: "smooth" });
    return true;
  })()`;
}

function createFocusComposerScript(): string {
  const selectors = JSON.stringify(whatsappDrawerSelectors);

  return `(() => {
    const selectors = ${selectors};
    const composer = document.querySelector(selectors.messageComposer);
    if (!(composer instanceof HTMLElement)) return false;

    composer.focus({ preventScroll: true });
    return true;
  })()`;
}

function createOpenArchivedScript(): string {
  const selectors = JSON.stringify(whatsappDrawerSelectors);
  const archivedDescription = JSON.stringify(ARCHIVED_VIEW_DESCRIPTION);

  return `(() => {
    const selectors = ${selectors};
    const root = document.querySelector(selectors.applicationRoot);
    const toggle = document.getElementById(${JSON.stringify(TOGGLE_ID)});

    if (document.body.innerText.includes(${archivedDescription})) return false;

    const findArchivedEntry = () => {
      const candidates = [...document.querySelectorAll("*")].filter((element) => {
        const label = element.textContent?.replace(/\\s+/g, " ").trim() ?? "";
        if (label !== "Archived" && !/^Archived[0-9]+$/.test(label)) return false;
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });

      return candidates.sort((left, right) => {
        const leftRect = left.getBoundingClientRect();
        const rightRect = right.getBoundingClientRect();
        return leftRect.width * leftRect.height - rightRect.width * rightRect.height;
      })[0];
    };

    if (
      root?.getAttribute("data-prettyzap-drawer-collapsed") === "true" &&
      toggle instanceof HTMLButtonElement
    ) {
      toggle.click();
    }

    return new Promise((resolve) => {
      window.requestAnimationFrame(() => {
        const entry = findArchivedEntry();
        if (!(entry instanceof HTMLElement)) {
          resolve(null);
          return;
        }

        const rect = entry.getBoundingClientRect();
        resolve({
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
          archivedLabel: entry.textContent?.trim(),
          archivedHtml: entry.outerHTML.slice(0, 200),
        });
      });
    });
  })()`;
}

function createCycleChatsScript(direction: "forward" | "backward"): string {
  const selectors = JSON.stringify(whatsappDrawerSelectors);
  const step = direction === "forward" ? 1 : -1;

  return `(() => {
    const selectors = ${selectors};
    const root = document.querySelector(selectors.applicationRoot);
    const toggle = document.getElementById(${JSON.stringify(TOGGLE_ID)});
    const wasCollapsed = root?.getAttribute("data-prettyzap-drawer-collapsed") === "true";

    // Restore WhatsApp's own layout before measuring the target. The main
    // process will send a real mouse event at this coordinate, rather than
    // relying on a synthetic DOM click that WhatsApp may ignore.
    if (wasCollapsed && toggle instanceof HTMLButtonElement) {
      toggle.click();
    }

    return new Promise((resolve) => {
      window.requestAnimationFrame(() => {
        const archivedList = document.querySelector(selectors.archivedChatList);
        const isArchivedView = archivedList instanceof HTMLElement;
        const rowSelector = isArchivedView
          ? selectors.archivedChatListRows
          : selectors.chatListRows;
        const rowContainer = (row) => isArchivedView ? row : row.closest('[role="row"]');
        const isVisibleConversationRow = (row) => {
          const container = rowContainer(row);
          const label = container?.textContent?.trim() ?? "";
          const rect = container?.getBoundingClientRect();
          const elementAtCenter = rect
            ? document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)
            : null;
          return Boolean(
            label &&
            (isArchivedView || !label.startsWith("Archived")) &&
            rect &&
            rect.width > 0 &&
            rect.height > 0 &&
            elementAtCenter &&
            container?.contains(elementAtCenter),
          );
        };
        const getRows = () => [...document.querySelectorAll(rowSelector)]
          .filter(isVisibleConversationRow)
          .map((element) => {
            const item = element.closest('[data-testid^="list-item-"]');
            const match = item?.getAttribute("data-testid")?.match(/list-item-(\\d+)$/);
            return { element, index: match ? Number(match[1]) : -1 };
          })
          .filter((row) => row.index >= 0)
          .sort((left, right) => left.index - right.index);
        const findScrollContainer = (element) => {
          let current = element.parentElement;
          while (current && current !== document.body) {
            if (current.scrollHeight > current.clientHeight + 1) return current;
            current = current.parentElement;
          }
          return null;
        };

        const stateKey = "__prettyzapChatCycleIndex";
        const viewKey = "__prettyzapChatCycleView";
        const currentView = isArchivedView ? "archived" : "chats";
        if (window[viewKey] !== currentView) {
          window[viewKey] = currentView;
          window[stateKey] = -1;
        }

        const currentIndex = Number.isInteger(window[stateKey]) ? window[stateKey] : -1;
        const chooseTarget = (rows) => {
          if (currentIndex < 0) return rows[0];
          return ${step} > 0
            ? rows.find((row) => row.index > currentIndex)
            : [...rows].reverse().find((row) => row.index < currentIndex);
        };
        const resolveTarget = (target) => {
          if (!target?.element || !(target.element instanceof HTMLElement)) {
            resolve(null);
            return;
          }

          window[stateKey] = target.index;
          target.element.scrollIntoView({ block: "nearest" });
          const rect = target.element.getBoundingClientRect();
          resolve({
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
            wasCollapsed,
          });
        };

        const rows = getRows();
        const target = chooseTarget(rows);
        if (target) {
          resolveTarget(target);
          return;
        }

        // WhatsApp virtualizes both chat lists. At the rendered edge, move its
        // own scroll container first, then choose a newly rendered neighbor.
        const edgeRow = ${step} > 0 ? rows.at(-1) : rows[0];
        const scrollContainer = edgeRow ? findScrollContainer(edgeRow.element) : null;
        if (!(scrollContainer instanceof HTMLElement)) {
          resolve(null);
          return;
        }

        scrollContainer.scrollTop += ${step} * Math.max(160, scrollContainer.clientHeight * 0.75);
        window.setTimeout(() => resolveTarget(chooseTarget(getRows())), 80);
      });
    });
  })()`;
}

const drawerStyle = `
  [${CHAT_LIST_HIDDEN}="true"],
  [${CHAT_LIST_SHELL}="true"] {
    display: none !important;
  }

  ${whatsappDrawerSelectors.navigationRail} {
    position: relative !important;
    box-sizing: border-box !important;
    border-right: 1px solid rgba(255, 255, 255, 0.1) !important;
  }

  #${TOGGLE_ID} {
    position: absolute !important;
    /* Keep the toggle below WhatsApp's rail actions on compact windows. */
    top: clamp(360px, 50%, 560px) !important;
    left: 50% !important;
    z-index: 20 !important;
    display: grid !important;
    width: 30px !important;
    height: 34px !important;
    padding: 0 !important;
    place-items: center !important;
    transform: translate(-50%, -50%) !important;
    border: 1px solid rgba(255, 255, 255, 0.12) !important;
    border-radius: 8px !important;
    color: rgba(233, 237, 239, 0.86) !important;
    background: rgba(34, 40, 44, 0.88) !important;
    cursor: pointer !important;
  }

  #${TOGGLE_ID}:hover {
    border-color: rgba(0, 168, 132, 0.72) !important;
    color: #ffffff !important;
    background: rgba(0, 168, 132, 0.18) !important;
  }

  #${TOGGLE_ID}:focus-visible {
    outline: 2px solid #53bdeb !important;
    outline-offset: 2px !important;
  }

  #${TOGGLE_ID} svg {
    width: 15px !important;
    height: 15px !important;
    fill: none !important;
    stroke: currentColor !important;
    stroke-linecap: round !important;
    stroke-linejoin: round !important;
    stroke-width: 1.7 !important;
  }
`;

function createDrawerScript(): string {
  const selectors = JSON.stringify(whatsappDrawerSelectors);

  return `(() => {
    const selectors = ${selectors};
    const toggleId = ${JSON.stringify(TOGGLE_ID)};
    const styleId = ${JSON.stringify(STYLE_ID)};
    const chatListHidden = ${JSON.stringify(CHAT_LIST_HIDDEN)};
    const chatListShell = ${JSON.stringify(CHAT_LIST_SHELL)};
    const root = document.querySelector(selectors.applicationRoot);
    const rail = document.querySelector(selectors.navigationRail);

    if (!root || !rail) {
      return {
        installed: false,
        hasRoot: Boolean(root),
        hasRail: Boolean(rail),
        hasChatList: Boolean(document.querySelector(selectors.chatListColumn)),
      };
    }

    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = ${JSON.stringify(drawerStyle)};
      document.head.appendChild(style);
    }

    if (!window.__prettyzapArchivedCycleResetInstalled) {
      document.addEventListener("click", (event) => {
        const clickedArchivedEntry = event.composedPath().some((entry) => {
          if (!(entry instanceof Element)) return false;
          const label = entry.textContent?.replace(/\s+/g, " ").trim() ?? "";
          return label === "Archived" || /^Archived[0-9]+$/.test(label);
        });
        if (!clickedArchivedEntry) return;

        // WhatsApp reuses list-item indexes in the Archived view. Reset
        // before its click handler swaps the visible chat list.
        window.__prettyzapChatCycleIndex = -1;
        window.__prettyzapChatCycleView = "archived";
      }, true);
      window.__prettyzapArchivedCycleResetInstalled = true;
    }

    const clearChatListMarkers = () => {
      document.querySelectorAll("[" + chatListHidden + "], [" + chatListShell + "]")
        .forEach((element) => {
          element.removeAttribute(chatListHidden);
          element.removeAttribute(chatListShell);
        });
    };

    const findChatListTargets = () => {
      const chatListShellElement = document.querySelector(selectors.chatListShell);
      const chatList = document.querySelector(selectors.chatListColumn);
      const chatListParent = chatList?.parentElement;
      const railRect = rail.getBoundingClientRect();
      const chatListHeader = [...document.querySelectorAll(selectors.chatListHeader)]
        .find((element) => {
          return element !== rail && element.getBoundingClientRect().width > railRect.width * 2;
        });

      return [chatListShellElement, chatList, chatListParent, chatListHeader].filter(Boolean);
    };

    const setCollapsed = (collapsed) => {
      clearChatListMarkers();
      if (collapsed) {
        const targets = findChatListTargets();
        const chatList = document.querySelector(selectors.chatListColumn);
        targets.forEach((element) => {
          if (element === chatList) {
            element.setAttribute(chatListHidden, "true");
          } else {
            element.setAttribute(chatListShell, "true");
          }
        });
      }
      root.setAttribute("data-prettyzap-drawer-collapsed", String(collapsed));
      const button = document.getElementById(toggleId);
      if (!button) return;

      button.setAttribute("aria-expanded", String(!collapsed));
      button.setAttribute(
        "aria-label",
        collapsed ? "Expand WhatsApp chat list" : "Collapse WhatsApp chat list",
      );
      button.innerHTML = collapsed
        ? '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="m6 3 5 5-5 5" /></svg>'
        : '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="m10 3-5 5 5 5" /></svg>';
    };

    let button = document.getElementById(toggleId);
    if (!button) {
      button = document.createElement("button");
      button.id = toggleId;
      button.type = "button";
      button.addEventListener("click", () => {
        const collapsed = root.getAttribute("data-prettyzap-drawer-collapsed") === "true";
        setCollapsed(!collapsed);
      });
      rail.appendChild(button);
    }

    // The first drawer slice starts compact while leaving WhatsApp's rail visible.
    setCollapsed(root.getAttribute("data-prettyzap-drawer-collapsed") !== "false");
    return {
      installed: true,
      collapsed: root.getAttribute("data-prettyzap-drawer-collapsed"),
    };
  })()`;
}

export function installWhatsAppDrawer(webContents: WebContents): () => void {
  let cycleHideTimer: ReturnType<typeof setTimeout> | undefined;
  let cycleOpenedDrawer = false;
  const focusSearchScript = createFocusSearchScript();
  const scrollUpScript = createScrollConversationScript("up");
  const scrollDownScript = createScrollConversationScript("down");
  const focusComposerScript = createFocusComposerScript();
  const openArchivedScript = createOpenArchivedScript();
  const cycleChatsForwardScript = createCycleChatsScript("forward");
  const cycleChatsBackwardScript = createCycleChatsScript("backward");
  const navigationScripts = Object.fromEntries(
    Object.entries(NAVIGATION_SHORTCUTS).map(([key, navigationKey]) => [
      key,
      createNavigationScript(navigationKey),
    ]),
  );
  const onBeforeInput = (event: Electron.Event, input: Electron.Input): void => {
    const isToggleShortcut =
      input.type === "keyDown" &&
      (input.control || input.meta) &&
      !input.alt &&
      !input.shift &&
      input.key.toLowerCase() === "l";
    const isSearchShortcut =
      input.type === "keyDown" &&
      (input.control || input.meta) &&
      !input.alt &&
      (input.code === "Slash" || input.key === "/");
    const isScrollDownShortcut =
      input.type === "keyDown" &&
      (input.control || input.meta) &&
      !input.alt &&
      !input.shift &&
      input.key.toLowerCase() === "j";
    const isScrollUpShortcut =
      input.type === "keyDown" &&
      (input.control || input.meta) &&
      !input.alt &&
      !input.shift &&
      input.key.toLowerCase() === "k";
    const isFocusComposerShortcut =
      input.type === "keyDown" &&
      (input.control || input.meta) &&
      !input.alt &&
      !input.shift &&
      (input.key.toLowerCase() === "i" || input.key === "Enter");
    const isOpenArchivedShortcut =
      input.type === "keyDown" &&
      (input.control || input.meta) &&
      !input.alt &&
      !input.shift &&
      input.key.toLowerCase() === "a";
    const isCycleChatsForwardShortcut =
      input.type === "keyDown" &&
      (input.control || input.meta) &&
      input.shift &&
      !input.alt &&
      input.key.toLowerCase() === "j";
    const isCycleChatsBackwardShortcut =
      input.type === "keyDown" &&
      (input.control || input.meta) &&
      input.shift &&
      !input.alt &&
      input.key.toLowerCase() === "k";
    const navigationKey =
      input.code?.match(/^Digit([1-8])$/)?.[1] ??
      (input.key in NAVIGATION_SHORTCUTS ? input.key : undefined);
    const navigationScript = navigationKey ? navigationScripts[navigationKey] : undefined;

    if (
      !isToggleShortcut &&
      !isSearchShortcut &&
      !navigationScript &&
      !isScrollDownShortcut &&
      !isScrollUpShortcut &&
      !isFocusComposerShortcut &&
      !isOpenArchivedShortcut &&
      !isCycleChatsForwardShortcut &&
      !isCycleChatsBackwardShortcut
    ) {
      return;
    }

    event.preventDefault();
    const script = isToggleShortcut
      ? toggleDrawerScript
      : isSearchShortcut
        ? focusSearchScript
        : navigationScript
          ? navigationScript
          : isScrollDownShortcut
            ? scrollDownScript
            : isScrollUpShortcut
              ? scrollUpScript
              : isFocusComposerShortcut
                ? focusComposerScript
                : isOpenArchivedShortcut
                  ? openArchivedScript
                  : isCycleChatsForwardShortcut
                  ? cycleChatsForwardScript
                  : cycleChatsBackwardScript;
    if (!script) return;

    const isCycleShortcut = isCycleChatsForwardShortcut || isCycleChatsBackwardShortcut;
    void webContents.executeJavaScript(script).then((result) => {
      if (!result || typeof result !== "object") return;

      const target = result as {
        x?: unknown;
        y?: unknown;
        wasCollapsed?: unknown;
      };
      if (typeof target.x !== "number" || typeof target.y !== "number") return;

      if (isOpenArchivedShortcut) {
        void webContents.executeJavaScript(resetArchivedChatCycleScript).catch((error: unknown) => {
          console.warn("Unable to reset PrettyZap Archived chat cycle", error);
        });
        webContents.sendInputEvent({
          type: "mouseMove",
          x: target.x,
          y: target.y,
          movementX: 0,
          movementY: 0,
        });
        webContents.sendInputEvent({
          type: "mouseDown",
          x: target.x,
          y: target.y,
          button: "left",
          clickCount: 1,
        });
        webContents.sendInputEvent({
          type: "mouseUp",
          x: target.x,
          y: target.y,
          button: "left",
          clickCount: 1,
        });
        return;
      }

      if (!isCycleShortcut) return;

      webContents.sendInputEvent({
        type: "mouseMove",
        x: target.x,
        y: target.y,
        movementX: 0,
        movementY: 0,
      });
      webContents.sendInputEvent({
        type: "mouseDown",
        x: target.x,
        y: target.y,
        button: "left",
        clickCount: 1,
      });
      webContents.sendInputEvent({
        type: "mouseUp",
        x: target.x,
        y: target.y,
        button: "left",
        clickCount: 1,
      });

      if (target.wasCollapsed === true) {
        cycleOpenedDrawer = true;
      }

      if (cycleOpenedDrawer) {
        if (cycleHideTimer) clearTimeout(cycleHideTimer);
        cycleHideTimer = setTimeout(() => {
          cycleHideTimer = undefined;
          cycleOpenedDrawer = false;
          void webContents.executeJavaScript(toggleDrawerScript).catch((error: unknown) => {
            console.warn("Unable to restore PrettyZap chat drawer", error);
          });
        }, CHAT_CYCLE_IDLE_MS);
      }
    }).catch((error: unknown) => {
      console.warn("Unable to handle PrettyZap keyboard shortcut", error);
    });
  };

  const apply = (): void => {
    const applyLayout = (): void => {
      void webContents.executeJavaScript(createDrawerScript()).catch((error: unknown) => {
        console.warn("Unable to install PrettyZap WhatsApp drawer", error);
      });
    };

    applyLayout();
    [1000, 3000, 6000, 10000, 15000, 30000].forEach((delay) =>
      setTimeout(applyLayout, delay),
    );
  };

  webContents.on("did-finish-load", apply);
  webContents.on("before-input-event", onBeforeInput);

  return () => {
    if (cycleHideTimer) clearTimeout(cycleHideTimer);
    webContents.removeListener("did-finish-load", apply);
    webContents.removeListener("before-input-event", onBeforeInput);
  };
}
