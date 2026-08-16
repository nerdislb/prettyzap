/**
 * Stable anchors for WhatsApp Web's native composer.
 * Keep this DOM knowledge inside the focus feature.
 */
export const whatsappFocusSelectors = {
  conversationPanel: '[data-testid="drawer-right"]',
  messageComposer: '[data-testid="conversation-compose-box-input"]',
} as const;
