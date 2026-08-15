import type { WhatsAppSelectors } from "./selectors";

const layoutStyle = `
  [data-pjzap-whatsapp-conversation-root="true"] {
    display: flex !important;
    position: absolute !important;
    inset: 0 !important;
    z-index: 1 !important;
    flex: 1 1 auto !important;
    width: 100% !important;
    max-width: none !important;
    min-width: 0 !important;
    min-height: 0 !important;
    height: 100% !important;
  }

  [data-pjzap-whatsapp-flex-container="true"] {
    display: flex !important;
    flex: 1 1 auto !important;
    width: 100% !important;
    max-width: none !important;
    min-width: 0 !important;
    min-height: 0 !important;
    height: 100% !important;
  }

  [data-pjzap-whatsapp-hidden="true"] {
    display: none !important;
  }
`;

/**
 * Returns a page-isolated script. It only changes visibility and layout of
 * WhatsApp's existing elements; it never changes message or composer content.
 */
export function createConversationOnlyScript(
  selectors: WhatsAppSelectors,
  enabled = true,
): string {
  const serializedSelectors = JSON.stringify(selectors);

  return `(() => {
    const selectors = ${serializedSelectors};
    const isolationEnabled = ${enabled};
    const rootMarker = "data-pjzap-whatsapp-conversation-root";
    const flexContainerMarker = "data-pjzap-whatsapp-flex-container";
    const hiddenMarker = "data-pjzap-whatsapp-hidden";
    const isolationMarker = "data-pjzap-whatsapp-isolated";

    const clearLayout = () => {
      document.querySelectorAll("[" + rootMarker + "]").forEach((element) => {
        element.removeAttribute(rootMarker);
        element.style.removeProperty("display");
        element.style.removeProperty("position");
        element.style.removeProperty("inset");
        element.style.removeProperty("z-index");
        element.style.removeProperty("flex");
        element.style.removeProperty("width");
        element.style.removeProperty("max-width");
        element.style.removeProperty("min-width");
        element.style.removeProperty("min-height");
        element.style.removeProperty("height");
      });
      document.querySelectorAll("[" + flexContainerMarker + "]").forEach((element) => {
        element.removeAttribute(flexContainerMarker);
        element.style.removeProperty("display");
        element.style.removeProperty("flex");
        element.style.removeProperty("width");
        element.style.removeProperty("max-width");
        element.style.removeProperty("min-width");
        element.style.removeProperty("min-height");
        element.style.removeProperty("height");
      });
      document.querySelectorAll("[" + hiddenMarker + "]").forEach((element) => {
        element.removeAttribute(hiddenMarker);
        element.style.removeProperty("display");
      });
      document.documentElement.removeAttribute(isolationMarker);
    };

    const stopObserver = () => {
      if (window.__pjzapWhatsAppLayoutObserver) {
        window.__pjzapWhatsAppLayoutObserver.disconnect();
        delete window.__pjzapWhatsAppLayoutObserver;
      }
    };

    if (!isolationEnabled) {
      clearLayout();
      stopObserver();
      document.getElementById("pjzap-whatsapp-layout-style")?.remove();
      return { applied: false, disabled: true };
    }

    const visibleElement = (element) => {
      if (!element) return false;
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
    };

    const findConversationPanel = (applicationRoot) => {
      return applicationRoot.querySelector(selectors.conversationPanel);
    };

    const applyLayout = () => {
      clearLayout();
      const applicationRoot = document.querySelector(selectors.applicationRoot);
      if (!applicationRoot) return false;

      const conversation = findConversationPanel(applicationRoot);
      if (!conversation) return false;

      conversation.setAttribute(rootMarker, "true");
      const navigation = [...applicationRoot.querySelectorAll(selectors.primaryNavigation)];
      const chatListElement = applicationRoot.querySelector(selectors.chatListPanel);
      const chatList = chatListElement?.parentElement ??
        applicationRoot.querySelector(selectors.chatListContainer);
      const leftColumn =
        navigation[0]?.parentElement && navigation[0].parentElement === chatList?.parentElement
          ? navigation[0].parentElement
          : null;
      [leftColumn, ...navigation, chatList].forEach((element) => {
        if (element) {
          element.setAttribute(hiddenMarker, "true");
          element.style.setProperty("display", "none", "important");
        }
      });
      let ancestor = conversation.parentElement;
      while (ancestor && applicationRoot.contains(ancestor)) {
        ancestor.setAttribute(flexContainerMarker, "true");
        ancestor = ancestor.parentElement;
      }
      conversation.style.setProperty("display", "flex", "important");
      conversation.style.setProperty("position", "absolute", "important");
      conversation.style.setProperty("inset", "0", "important");
      conversation.style.setProperty("z-index", "1", "important");
      conversation.style.setProperty("flex", "1 1 auto", "important");
      conversation.style.setProperty("width", "100%", "important");
      conversation.style.setProperty("max-width", "none", "important");
      conversation.style.setProperty("min-width", "0", "important");
      conversation.style.setProperty("min-height", "0", "important");
      conversation.style.setProperty("height", "100%", "important");
      document.documentElement.setAttribute(isolationMarker, "true");
      return {
        applied: true,
        navigationHidden: navigation.every((element) => element.getAttribute(hiddenMarker) === "true"),
        chatListHidden: chatList?.getAttribute(hiddenMarker) === "true",
        conversationMarker: conversation.getAttribute(rootMarker),
      };
    };

    if (!document.getElementById("pjzap-whatsapp-layout-style")) {
      const style = document.createElement("style");
      style.id = "pjzap-whatsapp-layout-style";
      style.textContent = ${JSON.stringify(layoutStyle)};
      document.head.appendChild(style);
    }

    let scheduled = false;
    const scheduleApply = () => {
      if (scheduled) return;
      scheduled = true;
      window.setTimeout(() => {
        scheduled = false;
        applyLayout();
      }, 100);
    };

    const initialLayoutResult = applyLayout();

    stopObserver();

    const observer = new MutationObserver((mutations) => {
      if (mutations.some((mutation) => mutation.type === "childList")) {
        scheduleApply();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    window.__pjzapWhatsAppLayoutObserver = observer;

    if (!initialLayoutResult) {
      let retryCount = 0;
      const retryUntilReady = () => {
        const result = applyLayout();
        if (!result && retryCount < 30) {
          retryCount += 1;
          window.setTimeout(retryUntilReady, 1000);
        }
      };
      retryUntilReady();
    }

    return initialLayoutResult;
  })()`;
}

export function getConversationOnlyStyle(): string {
  return layoutStyle;
}
