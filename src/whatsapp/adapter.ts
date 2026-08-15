import type { WebContents } from "electron";
import {
  createConversationOnlyScript,
  getConversationOnlyStyle,
} from "./inject";
import { whatsappSelectors } from "./selectors";

export interface WhatsAppAdapterOptions {
  layoutEnabled?: boolean;
  conversationOnly?: boolean;
}

/**
 * The only application-side boundary for WhatsApp Web DOM work.
 */
export class WhatsAppAdapter {
  private readonly layoutEnabled: boolean;
  private conversationOnly: boolean;
  private readonly onFinishedLoading = (): void => {
    void this.applyCurrentLayout();
    [5000, 15000, 30000].forEach((delay) => {
      setTimeout(() => {
        void this.applyCurrentLayout();
      }, delay);
    });
  };

  public constructor(
    private readonly webContents: WebContents,
    options: WhatsAppAdapterOptions = {},
  ) {
    this.layoutEnabled = options.layoutEnabled !== false;
    this.conversationOnly = options.conversationOnly === true;
    this.webContents.on("did-finish-load", this.onFinishedLoading);
  }

  public async setConversationOnly(enabled: boolean): Promise<void> {
    this.conversationOnly = enabled;
    if (!this.layoutEnabled || this.webContents.isDestroyed()) return;

    try {
      if (enabled) {
        await this.webContents.insertCSS(getConversationOnlyStyle());
      }
      await this.webContents.executeJavaScript(
        createConversationOnlyScript(whatsappSelectors, enabled),
      );
    } catch (error: unknown) {
      console.warn("Unable to apply WhatsApp conversation layout", error);
    }
  }

  public async applyConversationOnlyLayout(): Promise<void> {
    await this.setConversationOnly(true);
  }

  private async applyCurrentLayout(): Promise<void> {
    await this.setConversationOnly(this.conversationOnly);
  }
}
