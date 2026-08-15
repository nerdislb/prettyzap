/**
 * DOM anchors observed in the current authenticated WhatsApp Web shell.
 *
 * Keep selectors here so a WhatsApp markup change is isolated to this
 * boundary. Generated class names are intentionally not used.
 */
export const whatsappSelectors = {
  applicationRoot: '[data-testid="wa-web-main-screen"]',
  primaryNavigation:
    '[data-testid="drawer-left"], [data-testid="drawer-middle"], [data-testid="navbar-primary-section"], [data-testid="navbar-footer-section"]',
  chatListPanel: "#side",
  chatListContainer: '#side, #pane-side, [data-testid="chat-list"], [aria-label="Chat list"]',
  conversationPanel: '[data-testid="drawer-right"]',
  emptyConversationPanel: '[data-testid="intro-panel"]',
  messageComposer:
    '[contenteditable="true"][role="textbox"], [contenteditable="true"]',
  conversationHeader: 'header:not([data-testid="chatlist-header"])',
} as const;

export type WhatsAppSelectors = typeof whatsappSelectors;
