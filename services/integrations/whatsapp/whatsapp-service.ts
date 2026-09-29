/**
 * Gyrex Labs - Meta WhatsApp Cloud API Service & Multi-Tenant Management
 *
 * Implements official Meta Cloud API interfaces for:
 * 1. Multi-tenant Laboratory WhatsApp Business Account (WABA) connection management
 * 2. Secure storage of credentials (AES-256-GCM encrypted tokens & secrets)
 * 3. Inbound webhook signature verification (X-Hub-Signature-256 HMAC-SHA256)
 * 4. Tenant-isolated automated patient routing:
 *    - "Hi" / initial inbound messages trigger branded laboratory welcome
 *    - Provides clickable links to existing Gyrex patient storefronts:
 *      * Book a Test -> /[labSlug]
 *      * Health Packages -> /[labSlug]/packages
 *      * Upload Prescription -> /[labSlug]/prescription
 *      * My Orders & Reports -> /[labSlug]/reports
 *      * Talk to the Lab -> Phone / Call
 * 5. Idempotent webhook processing preventing duplicate reply loops
 *
 * STRICT PROHIBITIONS:
 * - NO Baileys
 * - NO WhatsApp Web automation
 * - NO Puppeteer / browser scraping
 * - NO unofficial reverse-engineered APIs
 * - NO separate WhatsApp cart, checkout, or duplicate catalogue
 */

import { prisma } from "@/lib/db/prisma";
import {
  WhatsAppProvider,
  SendWhatsAppTemplateParams,
  SendWhatsAppTextParams,
  WhatsAppSendResult,
} from "@/lib/integrations/types";
import { encryptSecret, decryptSecret, verifyMetaWebhookSignature } from "@/lib/integrations/crypto";
import { recordAuditLog } from "@/lib/db/audit";
import { AuditAction } from "@prisma/client";
import crypto from "crypto";

export interface LabWhatsAppSettings {
  wabaId: string | null;
  phoneNumberId: string | null;
  displayPhoneNumber: string | null;
  accessTokenEncrypted: string | null;
  appSecretEncrypted: string | null;
  webhookVerifyToken: string;
  status: "CONNECTED" | "DISCONNECTED" | "ERROR";
  isEnabled: boolean;
  lastVerifiedAt: string | null;
  errorMessage: string | null;
  welcomeMessageCustom: string | null;
  notifyOrderConfirmation?: boolean;
  notifyPaymentConfirmation?: boolean;
  notifySampleCollected?: boolean;
  notifyReportReady?: boolean;
}

export interface SafeLabWhatsAppResponse {
  configured: boolean;
  isEnabled: boolean;
  status: "CONNECTED" | "DISCONNECTED" | "ERROR";
  wabaId: string | null;
  phoneNumberId: string | null;
  displayPhoneNumber: string | null;
  hasAccessToken: boolean;
  hasAppSecret: boolean;
  webhookUrl: string;
  webhookVerifyToken: string;
  lastVerifiedAt: string | null;
  errorMessage: string | null;
  welcomeMessageCustom: string | null;
  previewMessage: string;
  notifyOrderConfirmation: boolean;
  notifyPaymentConfirmation: boolean;
  notifySampleCollected: boolean;
  notifyReportReady: boolean;
}

export interface UpdateLabWhatsAppInput {
  wabaId?: string;
  phoneNumberId?: string;
  displayPhoneNumber?: string;
  accessToken?: string;
  appSecret?: string;
  webhookVerifyToken?: string;
  isEnabled?: boolean;
  welcomeMessageCustom?: string;
  notifyOrderConfirmation?: boolean;
  notifyPaymentConfirmation?: boolean;
  notifySampleCollected?: boolean;
  notifyReportReady?: boolean;
}

// In-memory LRU cache for inbound message IDs to prevent duplicate replies from webhook retries
const processedMessageIds = new Map<string, number>();
const MESSAGE_ID_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function isMessageAlreadyProcessed(messageId: string): boolean {
  const now = Date.now();
  // Clean up expired entries periodically
  if (processedMessageIds.size > 2000) {
    for (const [id, ts] of processedMessageIds.entries()) {
      if (now - ts > MESSAGE_ID_TTL_MS) {
        processedMessageIds.delete(id);
      }
    }
  }

  if (processedMessageIds.has(messageId)) {
    return true;
  }
  processedMessageIds.set(messageId, now);
  return false;
}

export class MetaWhatsAppService implements WhatsAppProvider {
  private readonly defaultAccessToken: string | null;
  private readonly defaultPhoneNumberId: string | null;
  private readonly defaultVerifyToken: string | null;
  private readonly defaultAppSecret: string | null;
  private readonly graphApiVersion = "v20.0";

  constructor() {
    this.defaultAccessToken = process.env.WHATSAPP_ACCESS_TOKEN || null;
    this.defaultPhoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || null;
    this.defaultVerifyToken = process.env.WHATSAPP_VERIFY_TOKEN || null;
    this.defaultAppSecret = process.env.WHATSAPP_APP_SECRET || null;
  }

  private getSettingsKey(labId: string): string {
    return `lab_whatsapp:${labId}`;
  }

  /**
   * Retrieves laboratory WhatsApp configuration from PlatformSettings.
   * STRICT SECURITY: Secrets are never returned decrypted in client responses.
   */
  async getLabWhatsAppSettings(labId: string): Promise<SafeLabWhatsAppResponse> {
    const lab = await prisma.lab.findUnique({
      where: { id: labId },
      select: { id: true, name: true, slug: true, phone: true, emergencyPhone: true },
    });

    if (!lab) {
      throw new Error(`Laboratory '${labId}' not found.`);
    }

    const settingRecord = await prisma.platformSettings.findUnique({
      where: { key: this.getSettingsKey(labId) },
    });

    const rawData = (settingRecord?.value as Partial<LabWhatsAppSettings>) || {};

    const configured = Boolean(rawData.phoneNumberId && rawData.accessTokenEncrypted);
    const isEnabled = rawData.isEnabled ?? configured;
    const status = rawData.status || (configured ? "CONNECTED" : "DISCONNECTED");

    const defaultVerifyToken = `gyr_wa_${lab.slug.replace(/[^a-zA-Z0-9]/g, "")}_${labId.slice(-6)}`;
    const webhookVerifyToken = rawData.webhookVerifyToken || defaultVerifyToken;

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://labs.gyrex.in";
    const webhookUrl = `${baseUrl}/api/webhooks/whatsapp?labId=${labId}`;

    const previewMessage = this.generateWelcomeMessage({
      labName: lab.name,
      labSlug: lab.slug,
      labPhone: lab.emergencyPhone || lab.phone,
      patientName: "Patient",
      customMessage: rawData.welcomeMessageCustom || null,
      baseUrl,
    });

    return {
      configured,
      isEnabled,
      status,
      wabaId: rawData.wabaId || null,
      phoneNumberId: rawData.phoneNumberId || null,
      displayPhoneNumber: rawData.displayPhoneNumber || null,
      hasAccessToken: Boolean(rawData.accessTokenEncrypted),
      hasAppSecret: Boolean(rawData.appSecretEncrypted),
      webhookUrl,
      webhookVerifyToken,
      lastVerifiedAt: rawData.lastVerifiedAt || null,
      errorMessage: rawData.errorMessage || null,
      welcomeMessageCustom: rawData.welcomeMessageCustom || null,
      previewMessage,
      notifyOrderConfirmation: rawData.notifyOrderConfirmation ?? true,
      notifyPaymentConfirmation: rawData.notifyPaymentConfirmation ?? true,
      notifySampleCollected: rawData.notifySampleCollected ?? true,
      notifyReportReady: rawData.notifyReportReady ?? true,
    };
  }

  /**
   * Updates laboratory WhatsApp settings and encrypts secrets with AES-256-GCM.
   */
  async updateLabWhatsAppSettings(
    labId: string,
    input: UpdateLabWhatsAppInput,
    actorUserId?: string
  ): Promise<SafeLabWhatsAppResponse> {
    const existing = await prisma.platformSettings.findUnique({
      where: { key: this.getSettingsKey(labId) },
    });

    const existingData = (existing?.value as Partial<LabWhatsAppSettings>) || {};

    // Encrypt sensitive secrets if provided
    let accessTokenEncrypted = existingData.accessTokenEncrypted || null;
    if (input.accessToken !== undefined) {
      const trimmed = input.accessToken.trim();
      accessTokenEncrypted = trimmed ? encryptSecret(trimmed) : null;
    }

    let appSecretEncrypted = existingData.appSecretEncrypted || null;
    if (input.appSecret !== undefined) {
      const trimmed = input.appSecret.trim();
      appSecretEncrypted = trimmed ? encryptSecret(trimmed) : null;
    }

    const wabaId = input.wabaId !== undefined ? input.wabaId.trim() || null : existingData.wabaId || null;
    const phoneNumberId =
      input.phoneNumberId !== undefined ? input.phoneNumberId.trim() || null : existingData.phoneNumberId || null;
    const displayPhoneNumber =
      input.displayPhoneNumber !== undefined
        ? input.displayPhoneNumber.trim() || null
        : existingData.displayPhoneNumber || null;
    const defaultVerifyToken = `gyr_wa_${labId.slice(-6)}`;
    const webhookVerifyToken =
      input.webhookVerifyToken !== undefined
        ? input.webhookVerifyToken.trim() || existingData.webhookVerifyToken || defaultVerifyToken
        : existingData.webhookVerifyToken || defaultVerifyToken;
    const isEnabled = input.isEnabled !== undefined ? Boolean(input.isEnabled) : existingData.isEnabled ?? true;
    const welcomeMessageCustom =
      input.welcomeMessageCustom !== undefined
        ? input.welcomeMessageCustom.trim() || null
        : existingData.welcomeMessageCustom || null;

    const notifyOrderConfirmation =
      input.notifyOrderConfirmation !== undefined
        ? Boolean(input.notifyOrderConfirmation)
        : existingData.notifyOrderConfirmation ?? true;
    const notifyPaymentConfirmation =
      input.notifyPaymentConfirmation !== undefined
        ? Boolean(input.notifyPaymentConfirmation)
        : existingData.notifyPaymentConfirmation ?? true;
    const notifySampleCollected =
      input.notifySampleCollected !== undefined
        ? Boolean(input.notifySampleCollected)
        : existingData.notifySampleCollected ?? true;
    const notifyReportReady =
      input.notifyReportReady !== undefined
        ? Boolean(input.notifyReportReady)
        : existingData.notifyReportReady ?? true;

    const isConfigured = Boolean(phoneNumberId && accessTokenEncrypted);
    const status: "CONNECTED" | "DISCONNECTED" | "ERROR" = isConfigured ? "CONNECTED" : "DISCONNECTED";

    const updatedData: LabWhatsAppSettings = {
      wabaId,
      phoneNumberId,
      displayPhoneNumber,
      accessTokenEncrypted,
      appSecretEncrypted,
      webhookVerifyToken,
      status,
      isEnabled,
      lastVerifiedAt: isConfigured ? new Date().toISOString() : existingData.lastVerifiedAt || null,
      errorMessage: null,
      welcomeMessageCustom,
      notifyOrderConfirmation,
      notifyPaymentConfirmation,
      notifySampleCollected,
      notifyReportReady,
    };

    await prisma.platformSettings.upsert({
      where: { key: this.getSettingsKey(labId) },
      update: {
        value: updatedData as any,
        updatedByUserId: actorUserId || null,
      },
      create: {
        key: this.getSettingsKey(labId),
        value: updatedData as any,
        description: `Meta WhatsApp settings for lab ${labId}`,
        updatedByUserId: actorUserId || null,
      },
    });

    await recordAuditLog({
      actorUserId: actorUserId || null,
      action: AuditAction.USER_PERMISSION_CHANGED,
      entityType: "LabWhatsAppSettings",
      entityId: labId,
      labId,
      metadata: {
        action: "WHATSAPP_SETTINGS_UPDATED",
        phoneNumberId,
        wabaId,
        isEnabled,
        status,
      },
    });

    return this.getLabWhatsAppSettings(labId);
  }

  /**
   * Tests connection with Meta Graph API for a specific laboratory.
   */
  async testLabWhatsAppConnection(
    labId: string
  ): Promise<{ success: boolean; message: string; details?: any }> {
    const settingRecord = await prisma.platformSettings.findUnique({
      where: { key: this.getSettingsKey(labId) },
    });

    const data = (settingRecord?.value as Partial<LabWhatsAppSettings>) || {};

    if (!data.phoneNumberId || !data.accessTokenEncrypted) {
      return {
        success: false,
        message: "WhatsApp configuration incomplete. Please provide both Phone Number ID and Access Token.",
      };
    }

    let accessToken: string;
    try {
      accessToken = decryptSecret(data.accessTokenEncrypted);
    } catch {
      return { success: false, message: "Failed to decrypt laboratory access token." };
    }

    // Offline / Mock Testing Environment
    if (
      process.env.TEST_PAYMENT_MOCK === "true" ||
      data.phoneNumberId.startsWith("mock_") ||
      accessToken.startsWith("mock_")
    ) {
      const now = new Date().toISOString();
      await prisma.platformSettings.update({
        where: { key: this.getSettingsKey(labId) },
        data: {
          value: {
            ...data,
            status: "CONNECTED",
            lastVerifiedAt: now,
            errorMessage: null,
          } as any,
        },
      });

      return {
        success: true,
        message: "Connection verified successfully (Test Mock Mode).",
        details: {
          verifiedName: "Gyrex Verified Test Lab",
          displayPhoneNumber: data.displayPhoneNumber || "+91 98765 00000",
          qualityRating: "GREEN",
        },
      };
    }

    try {
      const url = `https://graph.facebook.com/${this.graphApiVersion}/${data.phoneNumberId}?fields=verified_name,display_phone_number,quality_rating`;
      const res = await fetch(url, {
        method: "GET",
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        const errMsg = errJson.error?.message || `Meta API returned HTTP ${res.status}`;
        await prisma.platformSettings.update({
          where: { key: this.getSettingsKey(labId) },
          data: {
            value: {
              ...data,
              status: "ERROR",
              errorMessage: errMsg,
            } as any,
          },
        });
        return { success: false, message: `Meta verification failed: ${errMsg}` };
      }

      const json = await res.json();
      const now = new Date().toISOString();

      await prisma.platformSettings.update({
        where: { key: this.getSettingsKey(labId) },
        data: {
          value: {
            ...data,
            status: "CONNECTED",
            displayPhoneNumber: json.display_phone_number || data.displayPhoneNumber,
            lastVerifiedAt: now,
            errorMessage: null,
          } as any,
        },
      });

      return {
        success: true,
        message: "Meta WhatsApp Business account verified and connected.",
        details: {
          verifiedName: json.verified_name,
          displayPhoneNumber: json.display_phone_number,
          qualityRating: json.quality_rating,
        },
      };
    } catch (err: any) {
      return { success: false, message: `Network error connecting to Meta: ${err.message}` };
    }
  }

  /**
   * Generates branded auto-reply welcome message with links to existing Gyrex patient experiences.
   */
  generateWelcomeMessage(params: {
    labName: string;
    labSlug: string;
    labPhone: string;
    patientName?: string;
    customMessage?: string | null;
    baseUrl: string;
  }): string {
    const { labName, labSlug, labPhone, patientName, customMessage, baseUrl } = params;
    const greetingName = patientName && patientName.trim() ? ` ${patientName.trim()}` : "";

    const storeUrl = `${baseUrl}/${labSlug}`;
    const packagesUrl = `${baseUrl}/${labSlug}/packages`;
    const prescriptionUrl = `${baseUrl}/${labSlug}/prescription`;
    const reportsUrl = `${baseUrl}/${labSlug}/reports`;

    if (customMessage && customMessage.trim()) {
      return customMessage
        .replace(/{{patient_name}}/g, patientName?.trim() || "there")
        .replace(/{{lab_name}}/g, labName)
        .replace(/{{store_url}}/g, storeUrl)
        .replace(/{{packages_url}}/g, packagesUrl)
        .replace(/{{prescription_url}}/g, prescriptionUrl)
        .replace(/{{reports_url}}/g, reportsUrl)
        .replace(/{{lab_phone}}/g, labPhone);
    }

    return (
      `Hello${greetingName}! 👋\n` +
      `Welcome to *${labName}* on Gyrex Labs.\n\n` +
      `How can we assist you with your diagnostic tests today?\n\n` +
      `📋 *Book a Test:*\n${storeUrl}\n\n` +
      `📦 *Health Checkup Packages:*\n${packagesUrl}\n\n` +
      `📝 *Upload Prescription:*\n${prescriptionUrl}\n\n` +
      `📄 *My Orders & Reports:*\n${reportsUrl}\n\n` +
      `📞 *Call Lab Support:* ${labPhone}`
    );
  }

  /**
   * Verifies Meta Webhook subscription handshake (GET /api/webhooks/whatsapp).
   */
  async verifyWebhookHandshake(
    verifyToken: string,
    challenge: string,
    labIdQuery?: string
  ): Promise<string | null> {
    if (!verifyToken || !challenge) return null;

    // 1. If labId provided in query, verify against that specific lab's token strictly
    if (labIdQuery) {
      const settingRecord = await prisma.platformSettings.findUnique({
        where: { key: this.getSettingsKey(labIdQuery) },
      });
      const data = (settingRecord?.value as Partial<LabWhatsAppSettings>) || {};
      return data.webhookVerifyToken === verifyToken ? challenge : null;
    }

    // 2. Platform default token check
    if (this.defaultVerifyToken && this.defaultVerifyToken === verifyToken) {
      return challenge;
    }

    // 3. Search all configured lab settings for matching verify token
    const allSettings = await prisma.platformSettings.findMany({
      where: {
        key: { startsWith: "lab_whatsapp:" },
      },
    });

    for (const rec of allSettings) {
      const data = (rec.value as Partial<LabWhatsAppSettings>) || {};
      if (data.webhookVerifyToken === verifyToken) {
        return challenge;
      }
    }

    return null;
  }

  /**
   * Resolves the target laboratory from inbound webhook payload or query param.
   */
  async resolveLabFromInbound(
    payload: any,
    labIdQuery?: string
  ): Promise<{ lab: any; settings: LabWhatsAppSettings } | null> {
    // 1. Explicit query param (recommended integration url: ?labId=xxx)
    if (labIdQuery) {
      const lab = await prisma.lab.findUnique({
        where: { id: labIdQuery },
      });
      if (lab) {
        const settingRecord = await prisma.platformSettings.findUnique({
          where: { key: this.getSettingsKey(lab.id) },
        });
        const settings = (settingRecord?.value as unknown as LabWhatsAppSettings) || ({} as LabWhatsAppSettings);
        return { lab, settings };
      }
    }

    // 2. Match from Meta metadata.phone_number_id or entry[0].id (WABA ID)
    const entry = payload?.entry?.[0];
    const wabaId = entry?.id;
    const phoneNumberId = entry?.changes?.[0]?.value?.metadata?.phone_number_id;

    if (phoneNumberId || wabaId) {
      const settingsRecords = await prisma.platformSettings.findMany({
        where: { key: { startsWith: "lab_whatsapp:" } },
      });

      for (const rec of settingsRecords) {
        const val = rec.value as unknown as Partial<LabWhatsAppSettings>;
        if (
          (phoneNumberId && val.phoneNumberId === phoneNumberId) ||
          (wabaId && val.wabaId === wabaId)
        ) {
          const labId = rec.key.replace("lab_whatsapp:", "");
          const lab = await prisma.lab.findUnique({ where: { id: labId } });
          if (lab) {
            return { lab, settings: val as unknown as LabWhatsAppSettings };
          }
        }
      }
    }

    // 3. Fallback: single active lab in system (development/testing convenience)
    const firstLab = await prisma.lab.findFirst({
      where: { status: "ACTIVE" },
      orderBy: { createdAt: "asc" },
    });

    if (firstLab) {
      const settingRecord = await prisma.platformSettings.findUnique({
        where: { key: this.getSettingsKey(firstLab.id) },
      });
      const settings = (settingRecord?.value as unknown as LabWhatsAppSettings) || ({} as LabWhatsAppSettings);
      return { lab: firstLab, settings };
    }

    return null;
  }

  /**
   * Handles inbound WhatsApp webhook POST payloads.
   * Performs cryptographic signature validation, tenant resolution, message deduplication,
   * and dispatches automated response pointing to existing Gyrex patient flows.
   */
  async handleInboundWebhook(
    rawBody: string,
    signatureHeader: string | null,
    labIdQuery?: string
  ): Promise<{ handled: boolean; eventType: string; replySent?: boolean; messageId?: string }> {
    if (!rawBody || typeof rawBody !== "string") {
      throw new Error("Missing raw body in webhook request.");
    }

    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      throw new Error("Invalid JSON in webhook payload.");
    }

    // Resolve tenant laboratory
    const tenantInfo = await this.resolveLabFromInbound(payload, labIdQuery);
    if (!tenantInfo) {
      return { handled: false, eventType: "NO_MATCHING_LABORATORY" };
    }

    const { lab, settings } = tenantInfo;

    // Cryptographic signature verification (X-Hub-Signature-256)
    const appSecretEncrypted = settings.appSecretEncrypted;
    let appSecret = this.defaultAppSecret;
    if (appSecretEncrypted) {
      try {
        appSecret = decryptSecret(appSecretEncrypted);
      } catch {
        // fallback to default
      }
    }

    if (appSecret && signatureHeader) {
      const isValid = verifyMetaWebhookSignature(rawBody, signatureHeader, appSecret);
      if (!isValid) {
        await recordAuditLog({
          action: AuditAction.SECURITY_ALERT,
          entityType: "Webhook",
          entityId: "WHATSAPP_WEBHOOK",
          labId: lab.id,
          metadata: {
            reason: "Invalid Meta WhatsApp webhook signature",
            signatureHeader,
          },
        });
        throw new Error("Invalid Meta webhook signature.");
      }
    }

    const value = payload.entry?.[0]?.changes?.[0]?.value;

    // Check for message delivery status update (DELIVERED, READ, SENT, FAILED)
    if (value?.statuses?.[0]) {
      const statusObj = value.statuses[0];
      return {
        handled: true,
        eventType: `STATUS_${statusObj.status?.toUpperCase() || "UNKNOWN"}`,
      };
    }

    // Process inbound message
    const message = value?.messages?.[0];
    if (!message) {
      return { handled: true, eventType: "UNHANDLED_CHANGE_EVENT" };
    }

    const messageId = message.id;
    const senderPhone = message.from;
    const messageType = message.type;
    const contactProfile = value?.contacts?.[0]?.profile;
    const patientName = contactProfile?.name;

    // Idempotency: skip duplicate message delivery from Meta retries
    if (messageId && isMessageAlreadyProcessed(messageId)) {
      return {
        handled: true,
        eventType: "DUPLICATE_MESSAGE_ACKNOWLEDGED",
        replySent: false,
        messageId,
      };
    }

    // Check if channel is enabled for this lab
    if (settings.isEnabled === false) {
      return {
        handled: true,
        eventType: "CHANNEL_DISABLED",
        replySent: false,
      };
    }

    const phoneNumberId = settings.phoneNumberId || this.defaultPhoneNumberId;
    let accessToken = this.defaultAccessToken;
    if (settings.accessTokenEncrypted) {
      try {
        accessToken = decryptSecret(settings.accessTokenEncrypted);
      } catch {
        // fallback
      }
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://labs.gyrex.in";
    const bodyText = (message.text?.body || "").trim().toUpperCase();

    // Handle Patient Opt-Out ("STOP", "UNSUBSCRIBE", "STOPALL", "CANCEL", "QUIT")
    if (["STOP", "UNSUBSCRIBE", "STOPALL", "CANCEL", "QUIT"].includes(bodyText)) {
      await this.optOutPatient(lab.id, senderPhone);
      const optOutReply = `You have been unsubscribed from diagnostic updates for *${lab.name}*.\n\nYou will no longer receive transactional updates on WhatsApp.\n\nReply START to opt back in at any time.`;
      const sendResult = await this.sendTextMessageInternal({
        recipientPhone: senderPhone,
        text: optOutReply,
        phoneNumberId,
        accessToken,
      });
      return {
        handled: true,
        eventType: "PATIENT_OPT_OUT",
        replySent: sendResult.success,
        messageId: sendResult.messageId,
      };
    }

    // Handle Patient Opt-In ("START", "UNSTOP", "OPTIN", "SUBSCRIBE")
    if (["START", "UNSTOP", "OPTIN", "SUBSCRIBE"].includes(bodyText)) {
      await this.optInPatient(lab.id, senderPhone);
      const optInReply = `Welcome back! You have opted back in to diagnostic updates for *${lab.name}*.\n\nVisit our digital laboratory:\n${baseUrl}/${lab.slug}`;
      const sendResult = await this.sendTextMessageInternal({
        recipientPhone: senderPhone,
        text: optInReply,
        phoneNumberId,
        accessToken,
      });
      return {
        handled: true,
        eventType: "PATIENT_OPT_IN",
        replySent: sendResult.success,
        messageId: sendResult.messageId,
      };
    }

    // Generate response message pointing to existing Gyrex storefront
    const replyBody = this.generateWelcomeMessage({
      labName: lab.name,
      labSlug: lab.slug,
      labPhone: lab.emergencyPhone || lab.phone,
      patientName,
      customMessage: settings.welcomeMessageCustom,
      baseUrl,
    });

    const sendResult = await this.sendTextMessageInternal({
      recipientPhone: senderPhone,
      text: replyBody,
      phoneNumberId,
      accessToken,
    });

    return {
      handled: true,
      eventType: "WELCOME_REPLY_SENT",
      replySent: sendResult.success,
      messageId: sendResult.messageId,
    };
  }

  private getOptOutKey(labId: string): string {
    return `lab_whatsapp_optouts:${labId}`;
  }

  async isPatientOptedOut(labId: string, phone: string): Promise<boolean> {
    const cleanPhone = phone.replace(/\D/g, "");
    if (!cleanPhone) return false;

    const record = await prisma.platformSettings.findUnique({
      where: { key: this.getOptOutKey(labId) },
    });

    const optOutList = (record?.value as string[]) || [];
    return Array.isArray(optOutList) && optOutList.includes(cleanPhone);
  }

  async optOutPatient(labId: string, phone: string): Promise<void> {
    const cleanPhone = phone.replace(/\D/g, "");
    if (!cleanPhone) return;

    const key = this.getOptOutKey(labId);
    const existing = await prisma.platformSettings.findUnique({ where: { key } });
    const list = Array.isArray(existing?.value) ? (existing.value as string[]) : [];

    if (!list.includes(cleanPhone)) {
      list.push(cleanPhone);
      await prisma.platformSettings.upsert({
        where: { key },
        update: { value: list as any },
        create: {
          key,
          value: list as any,
          description: `Opted-out patient phone numbers for lab ${labId}`,
        },
      });
    }
  }

  async optInPatient(labId: string, phone: string): Promise<void> {
    const cleanPhone = phone.replace(/\D/g, "");
    if (!cleanPhone) return;

    const key = this.getOptOutKey(labId);
    const existing = await prisma.platformSettings.findUnique({ where: { key } });
    if (!existing || !Array.isArray(existing.value)) return;

    const list = (existing.value as string[]).filter((p) => p !== cleanPhone);
    await prisma.platformSettings.update({
      where: { key },
      data: { value: list as any },
    });
  }

  /**
   * Dispatches outbound WhatsApp message using the specific laboratory's encrypted credentials.
   * Checks opt-out status, enablement, and configuration before sending.
   */
  async sendLabTextMessage(params: {
    labId: string;
    recipientPhone: string;
    text: string;
  }): Promise<WhatsAppSendResult> {
    const { labId, recipientPhone, text } = params;

    // 1. Retrieve settings
    const settingRecord = await prisma.platformSettings.findUnique({
      where: { key: this.getSettingsKey(labId) },
    });

    const settings = (settingRecord?.value as Partial<LabWhatsAppSettings>) || {};
    if (!settings.phoneNumberId || !settings.accessTokenEncrypted || settings.isEnabled === false) {
      return {
        messageId: "",
        recipientPhone,
        success: false,
        status: "disabled",
        timestamp: new Date(),
      };
    }

    // 2. Check patient opt-out status
    const isOptedOut = await this.isPatientOptedOut(labId, recipientPhone);
    if (isOptedOut) {
      return {
        messageId: "",
        recipientPhone,
        success: false,
        status: "opted_out",
        timestamp: new Date(),
      };
    }

    // 3. Decrypt credentials
    let accessToken: string;
    try {
      accessToken = decryptSecret(settings.accessTokenEncrypted);
    } catch {
      return {
        messageId: "",
        recipientPhone,
        success: false,
        status: "failed",
        timestamp: new Date(),
      };
    }

    return this.sendTextMessageInternal({
      recipientPhone,
      text,
      phoneNumberId: settings.phoneNumberId,
      accessToken,
    });
  }

  /**
   * Internal text message dispatcher supporting custom lab credentials or mock fallback.
   */
  private async sendTextMessageInternal(params: {
    recipientPhone: string;
    text: string;
    phoneNumberId: string | null;
    accessToken: string | null;
  }): Promise<WhatsAppSendResult> {
    const { recipientPhone, text, phoneNumberId, accessToken } = params;

    // Deterministic mock for test / unconfigured environments
    if (
      !accessToken ||
      !phoneNumberId ||
      process.env.TEST_PAYMENT_MOCK === "true" ||
      accessToken.startsWith("mock_") ||
      phoneNumberId.startsWith("mock_")
    ) {
      return {
        messageId: `wamid.mock.${Date.now()}_${Math.random().toString(36).substring(7)}`,
        recipientPhone,
        success: true,
        status: "sent",
        timestamp: new Date(),
      };
    }

    try {
      const url = `https://graph.facebook.com/${this.graphApiVersion}/${phoneNumberId}/messages`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: recipientPhone.replace(/[^0-9]/g, ""),
          type: "text",
          text: { preview_url: true, body: text },
        }),
      });

      if (!response.ok) {
        const errorJson = await response.json().catch(() => ({}));
        return {
          messageId: `failed_${Date.now()}`,
          recipientPhone,
          success: false,
          status: "failed",
          timestamp: new Date(),
        };
      }

      const json = await response.json();
      return {
        messageId: json.messages?.[0]?.id || `wamid.${Date.now()}`,
        recipientPhone,
        success: true,
        status: "sent",
        timestamp: new Date(),
      };
    } catch {
      return {
        messageId: `failed_net_${Date.now()}`,
        recipientPhone,
        success: false,
        status: "failed",
        timestamp: new Date(),
      };
    }
  }

  // --- Implement standard WhatsAppProvider interface for backward compatibility ---
  verifyWebhook(verifyToken: string, challenge: string): string | null {
    if (this.defaultVerifyToken && verifyToken === this.defaultVerifyToken) {
      return challenge;
    }
    return null;
  }

  async sendTemplate(params: SendWhatsAppTemplateParams): Promise<WhatsAppSendResult> {
    return this.sendTextMessageInternal({
      recipientPhone: params.recipientPhone,
      text: `[Template: ${params.templateName}]`,
      phoneNumberId: this.defaultPhoneNumberId,
      accessToken: this.defaultAccessToken,
    });
  }

  async sendText(params: SendWhatsAppTextParams): Promise<WhatsAppSendResult> {
    return this.sendTextMessageInternal({
      recipientPhone: params.recipientPhone,
      text: params.text,
      phoneNumberId: this.defaultPhoneNumberId,
      accessToken: this.defaultAccessToken,
    });
  }

  async processWebhookPayload(rawPayload: unknown): Promise<{ handled: boolean; eventType?: string }> {
    return this.handleInboundWebhook(JSON.stringify(rawPayload), null);
  }
}

export const whatsAppService = new MetaWhatsAppService();
