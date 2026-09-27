/**
 * Gyrex Labs - Meta WhatsApp Cloud API Service
 *
 * Implements official Meta Cloud API interfaces for transactional customer notifications.
 *
 * STRICT PROHIBITION:
 * - NO Baileys
 * - NO WhatsApp Web automation
 * - NO Puppeteer / browser scraping
 * - NO unofficial reverse-engineered APIs
 */

import {
  WhatsAppProvider,
  SendWhatsAppTemplateParams,
  SendWhatsAppTextParams,
  WhatsAppSendResult,
} from "@/lib/integrations/types";

export class MetaWhatsAppService implements WhatsAppProvider {
  private readonly accessToken: string | null;
  private readonly phoneNumberId: string | null;
  private readonly verifyToken: string | null;
  private readonly graphApiVersion = "v20.0";

  constructor() {
    this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN || null;
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || null;
    this.verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || null;
  }

  /**
   * Verifies the GET webhook subscription challenge from Meta.
   */
  verifyWebhook(verifyToken: string, challenge: string): string | null {
    if (this.verifyToken && verifyToken === this.verifyToken) {
      return challenge;
    }
    return null;
  }

  /**
   * Sends an official pre-approved Meta WhatsApp Message Template.
   */
  async sendTemplate(params: SendWhatsAppTemplateParams): Promise<WhatsAppSendResult> {
    if (!this.accessToken || !this.phoneNumberId) {
      // Mock mode for local development and offline environments
      return {
        messageId: `wamid.mock.${Date.now()}`,
        recipientPhone: params.recipientPhone,
        success: true,
        status: "sent",
        timestamp: new Date(),
      };
    }

    try {
      const url = `https://graph.facebook.com/${this.graphApiVersion}/${this.phoneNumberId}/messages`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: params.recipientPhone.replace(/[^0-9]/g, ""),
          type: "template",
          template: {
            name: params.templateName,
            language: { code: params.languageCode || "en" },
            components: params.components,
          },
        }),
      });

      if (!response.ok) {
        const errorJson = await response.json().catch(() => ({}));
        console.error("Meta WhatsApp Cloud API error:", errorJson);
        return {
          messageId: `failed_${Date.now()}`,
          recipientPhone: params.recipientPhone,
          success: false,
          status: "failed",
          timestamp: new Date(),
        };
      }

      const json = await response.json();
      return {
        messageId: json.messages?.[0]?.id || `wamid.${Date.now()}`,
        recipientPhone: params.recipientPhone,
        success: true,
        status: "sent",
        timestamp: new Date(),
      };
    } catch (err: unknown) {
      console.error("WhatsApp delivery failure (non-blocking):", err);
      return {
        messageId: `failed_net_${Date.now()}`,
        recipientPhone: params.recipientPhone,
        success: false,
        status: "failed",
        timestamp: new Date(),
      };
    }
  }

  /**
   * Sends a session text message (only valid within customer 24h service window).
   */
  async sendText(params: SendWhatsAppTextParams): Promise<WhatsAppSendResult> {
    if (!this.accessToken || !this.phoneNumberId) {
      return {
        messageId: `wamid.mock.${Date.now()}`,
        recipientPhone: params.recipientPhone,
        success: true,
        status: "sent",
        timestamp: new Date(),
      };
    }

    try {
      const url = `https://graph.facebook.com/${this.graphApiVersion}/${this.phoneNumberId}/messages`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: params.recipientPhone.replace(/[^0-9]/g, ""),
          type: "text",
          text: { preview_url: false, body: params.text },
        }),
      });

      const json = await response.json();
      return {
        messageId: json.messages?.[0]?.id || `wamid.${Date.now()}`,
        recipientPhone: params.recipientPhone,
        success: response.ok,
        status: response.ok ? "sent" : "failed",
        timestamp: new Date(),
      };
    } catch {
      return {
        messageId: `failed_${Date.now()}`,
        recipientPhone: params.recipientPhone,
        success: false,
        status: "failed",
        timestamp: new Date(),
      };
    }
  }

  /**
   * Processes inbound WhatsApp delivery status / reply webhooks.
   */
  async processWebhookPayload(rawPayload: unknown): Promise<{ handled: boolean; eventType?: string }> {
    if (!rawPayload || typeof rawPayload !== "object") {
      return { handled: false };
    }

    const payload = rawPayload as Record<string, any>;
    const entry = payload.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    if (value?.statuses?.[0]) {
      const statusObj = value.statuses[0];
      return {
        handled: true,
        eventType: `STATUS_${statusObj.status.toUpperCase()}`,
      };
    }

    if (value?.messages?.[0]) {
      return {
        handled: true,
        eventType: "INBOUND_MESSAGE",
      };
    }

    return { handled: true, eventType: "UNSPECIFIED" };
  }
}

export const whatsAppService = new MetaWhatsAppService();
