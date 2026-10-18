/**
 * Gyrex Labs - Meta WhatsApp Cloud API Template Management Service
 *
 * Implements configurable, template-based outbound messaging for:
 * 1. Order Confirmation (ORDER_CONFIRMATION)
 * 2. Payment Confirmation (PAYMENT_CONFIRMATION)
 * 3. Sample Collection (SAMPLE_COLLECTED)
 * 4. Diagnostic Report Ready (REPORT_READY)
 *
 * STRICT CONSTRAINTS:
 * - Template names and language codes are configurable via PlatformSettings or env vars.
 * - Outbound business-initiated notifications use official Meta template structures ("type: template").
 * - Diagnostic reports send authenticated verification links, NEVER raw PDF bytes.
 * - Laboratory name is explicitly included in template parameters for tenant attribution.
 * - Missing required configuration or parameters fails validation cleanly.
 */

import { prisma } from "@/lib/db/prisma";

export type WhatsAppEventType =
  | "ORDER_CONFIRMATION"
  | "PAYMENT_CONFIRMATION"
  | "SAMPLE_COLLECTED"
  | "REPORT_READY";

export interface TemplateTextParameter {
  type: "text";
  text: string;
}

export interface TemplateBodyComponent {
  type: "body";
  parameters: TemplateTextParameter[];
}

export interface WhatsAppTemplatePayload {
  name: string;
  language: {
    code: string;
  };
  components: [TemplateBodyComponent];
}

export interface TemplateConfig {
  templateName: string;
  languageCode: string;
}

export interface TemplateBuildResult {
  valid: boolean;
  error?: string;
  payload?: WhatsAppTemplatePayload;
  summaryText?: string;
}

export const PLATFORM_TEMPLATES_SETTINGS_KEY = "platform_whatsapp_templates";

/**
 * Default template names as registered in Meta WhatsApp Business Manager.
 */
export const DEFAULT_TEMPLATE_NAMES: Record<WhatsAppEventType, string> = {
  ORDER_CONFIRMATION: "gyrex_order_confirmation",
  PAYMENT_CONFIRMATION: "gyrex_payment_confirmation",
  SAMPLE_COLLECTED: "gyrex_sample_collected",
  REPORT_READY: "gyrex_report_ready",
};

/**
 * Resolves template configuration (template name and language code) for a given event type.
 * Priority:
 * 1. PlatformSettings ('platform_whatsapp_templates')
 * 2. Environment variables:
 *    - WHATSAPP_TEMPLATE_ORDER_CONFIRMATION
 *    - WHATSAPP_TEMPLATE_PAYMENT_CONFIRMATION
 *    - WHATSAPP_TEMPLATE_SAMPLE_COLLECTED
 *    - WHATSAPP_TEMPLATE_REPORT_READY
 *    - WHATSAPP_TEMPLATE_LANGUAGE
 * 3. Default fallback template names
 */
export async function getWhatsAppTemplateConfig(
  eventType: WhatsAppEventType
): Promise<TemplateConfig> {
  const envTemplateMap: Record<WhatsAppEventType, string | undefined> = {
    ORDER_CONFIRMATION: process.env.WHATSAPP_TEMPLATE_ORDER_CONFIRMATION,
    PAYMENT_CONFIRMATION: process.env.WHATSAPP_TEMPLATE_PAYMENT_CONFIRMATION,
    SAMPLE_COLLECTED: process.env.WHATSAPP_TEMPLATE_SAMPLE_COLLECTED,
    REPORT_READY: process.env.WHATSAPP_TEMPLATE_REPORT_READY,
  };

  const defaultLang = process.env.WHATSAPP_TEMPLATE_LANGUAGE?.trim() || "en";

  try {
    const setting = await prisma.platformSettings.findUnique({
      where: { key: PLATFORM_TEMPLATES_SETTINGS_KEY },
    });

    if (setting?.value && typeof setting.value === "object" && !Array.isArray(setting.value)) {
      const config = setting.value as Record<string, any>;
      const customName = config[eventType] || config[eventType.toLowerCase()];
      const customLang = config.languageCode || config.language;

      if (typeof customName === "string" && customName.trim()) {
        return {
          templateName: customName.trim(),
          languageCode: (typeof customLang === "string" && customLang.trim()) || defaultLang,
        };
      }
    }
  } catch {
    // Fail-soft to env / default fallback on database error
  }

  const envName = envTemplateMap[eventType];
  const templateName = (envName && envName.trim()) || DEFAULT_TEMPLATE_NAMES[eventType];

  return {
    templateName,
    languageCode: defaultLang,
  };
}

/**
 * Builds Meta WhatsApp template payload for Order Confirmation.
 */
export async function buildOrderConfirmationTemplate(params: {
  patientName: string;
  labName: string;
  orderNumber: string;
  collectionSchedule: string;
  totalAmount: number | string;
  trackingUrl: string;
}): Promise<TemplateBuildResult> {
  const { patientName, labName, orderNumber, collectionSchedule, totalAmount, trackingUrl } = params;

  if (!patientName?.trim() || !labName?.trim() || !orderNumber?.trim() || !trackingUrl?.trim()) {
    return {
      valid: false,
      error: "Missing required order confirmation template parameters (patientName, labName, orderNumber, trackingUrl).",
    };
  }

  const config = await getWhatsAppTemplateConfig("ORDER_CONFIRMATION");
  if (!config.templateName) {
    return {
      valid: false,
      error: "Order confirmation WhatsApp template is not configured.",
    };
  }

  const formattedAmount =
    typeof totalAmount === "number"
      ? `₹${totalAmount.toLocaleString("en-IN")}`
      : totalAmount.startsWith("₹")
      ? totalAmount
      : `₹${totalAmount}`;

  const payload: WhatsAppTemplatePayload = {
    name: config.templateName,
    language: { code: config.languageCode },
    components: [
      {
        type: "body",
        parameters: [
          { type: "text", text: patientName.trim() },
          { type: "text", text: labName.trim() },
          { type: "text", text: orderNumber.trim() },
          { type: "text", text: collectionSchedule.trim() || "As scheduled" },
          { type: "text", text: formattedAmount },
          { type: "text", text: trackingUrl.trim() },
        ],
      },
    ],
  };

  const summaryText =
    `Order Confirmed! 📋\n\n` +
    `Dear ${patientName.trim()}, your diagnostic test booking with *${labName.trim()}* has been confirmed.\n\n` +
    `• *Order Number:* ${orderNumber.trim()}\n` +
    `• *Schedule:* ${collectionSchedule.trim() || "As scheduled"}\n` +
    `• *Total Amount:* ${formattedAmount}\n\n` +
    `Track your booking status & updates:\n${trackingUrl.trim()}\n\n` +
    `Reply STOP to opt out of updates.`;

  return { valid: true, payload, summaryText };
}

/**
 * Builds Meta WhatsApp template payload for Payment Confirmation.
 */
export async function buildPaymentConfirmationTemplate(params: {
  patientName: string;
  labName: string;
  amount: number | string;
  orderNumber: string;
  paymentNumber: string;
  trackingUrl: string;
}): Promise<TemplateBuildResult> {
  const { patientName, labName, amount, orderNumber, paymentNumber, trackingUrl } = params;

  if (!patientName?.trim() || !labName?.trim() || !orderNumber?.trim() || !paymentNumber?.trim() || !trackingUrl?.trim()) {
    return {
      valid: false,
      error: "Missing required payment confirmation template parameters (patientName, labName, orderNumber, paymentNumber, trackingUrl).",
    };
  }

  const config = await getWhatsAppTemplateConfig("PAYMENT_CONFIRMATION");
  if (!config.templateName) {
    return {
      valid: false,
      error: "Payment confirmation WhatsApp template is not configured.",
    };
  }

  const formattedAmount =
    typeof amount === "number"
      ? `₹${amount.toLocaleString("en-IN")}`
      : amount.startsWith("₹")
      ? amount
      : `₹${amount}`;

  const payload: WhatsAppTemplatePayload = {
    name: config.templateName,
    language: { code: config.languageCode },
    components: [
      {
        type: "body",
        parameters: [
          { type: "text", text: patientName.trim() },
          { type: "text", text: labName.trim() },
          { type: "text", text: formattedAmount },
          { type: "text", text: orderNumber.trim() },
          { type: "text", text: paymentNumber.trim() },
          { type: "text", text: trackingUrl.trim() },
        ],
      },
    ],
  };

  const summaryText =
    `Payment Received! 💳\n\n` +
    `Dear ${patientName.trim()}, we have received your payment of *${formattedAmount}* for Order *${orderNumber.trim()}*.\n\n` +
    `• *Payment Reference:* ${paymentNumber.trim()}\n` +
    `• *Laboratory:* ${labName.trim()}\n` +
    `• *Status:* Payment Verified & Confirmed\n\n` +
    `View your order receipt & collection details:\n${trackingUrl.trim()}\n\n` +
    `Reply STOP to opt out of updates.`;

  return { valid: true, payload, summaryText };
}

/**
 * Builds Meta WhatsApp template payload for Sample Collection.
 */
export async function buildSampleCollectedTemplate(params: {
  patientName: string;
  labName: string;
  orderNumber: string;
  phlebotomistName?: string;
  trackingUrl: string;
}): Promise<TemplateBuildResult> {
  const { patientName, labName, orderNumber, phlebotomistName, trackingUrl } = params;

  if (!patientName?.trim() || !labName?.trim() || !orderNumber?.trim() || !trackingUrl?.trim()) {
    return {
      valid: false,
      error: "Missing required sample collection template parameters (patientName, labName, orderNumber, trackingUrl).",
    };
  }

  const config = await getWhatsAppTemplateConfig("SAMPLE_COLLECTED");
  if (!config.templateName) {
    return {
      valid: false,
      error: "Sample collection WhatsApp template is not configured.",
    };
  }

  const phleb = phlebotomistName?.trim() || "Gyrex Phlebotomy Team";

  const payload: WhatsAppTemplatePayload = {
    name: config.templateName,
    language: { code: config.languageCode },
    components: [
      {
        type: "body",
        parameters: [
          { type: "text", text: patientName.trim() },
          { type: "text", text: labName.trim() },
          { type: "text", text: orderNumber.trim() },
          { type: "text", text: phleb },
          { type: "text", text: trackingUrl.trim() },
        ],
      },
    ],
  };

  const summaryText =
    `Sample Collected! 🧪\n\n` +
    `Dear ${patientName.trim()}, your diagnostic sample for Order *${orderNumber.trim()}* has been successfully collected and safely transported to *${labName.trim()}*.\n\n` +
    `• *Collected by:* ${phleb}\n` +
    `• *Status:* Processing in Laboratory\n\n` +
    `Track your test processing live:\n${trackingUrl.trim()}\n\n` +
    `Reply STOP to opt out of updates.`;

  return { valid: true, payload, summaryText };
}

/**
 * Builds Meta WhatsApp template payload for Diagnostic Report Ready.
 *
 * CRITICAL SECURITY GUARANTEE:
 * Sends an authenticated verification URL, NEVER raw PDF bytes.
 */
export async function buildReportReadyTemplate(params: {
  patientName: string;
  labName: string;
  orderNumber: string;
  reportNumber: string;
  reportUrl: string;
}): Promise<TemplateBuildResult> {
  const { patientName, labName, orderNumber, reportNumber, reportUrl } = params;

  if (!patientName?.trim() || !labName?.trim() || !orderNumber?.trim() || !reportNumber?.trim() || !reportUrl?.trim()) {
    return {
      valid: false,
      error: "Missing required report ready template parameters (patientName, labName, orderNumber, reportNumber, reportUrl).",
    };
  }

  const config = await getWhatsAppTemplateConfig("REPORT_READY");
  if (!config.templateName) {
    return {
      valid: false,
      error: "Report ready WhatsApp template is not configured.",
    };
  }

  const payload: WhatsAppTemplatePayload = {
    name: config.templateName,
    language: { code: config.languageCode },
    components: [
      {
        type: "body",
        parameters: [
          { type: "text", text: patientName.trim() },
          { type: "text", text: labName.trim() },
          { type: "text", text: orderNumber.trim() },
          { type: "text", text: reportNumber.trim() },
          { type: "text", text: reportUrl.trim() },
        ],
      },
    ],
  };

  const summaryText =
    `Diagnostic Report Ready! 📄\n\n` +
    `Dear ${patientName.trim()}, your diagnostic test report from *${labName.trim()}* is now verified and available.\n\n` +
    `• *Order Number:* ${orderNumber.trim()}\n` +
    `• *Report ID:* ${reportNumber.trim()}\n\n` +
    `View and download your official report securely:\n${reportUrl.trim()}\n\n` +
    `🔒 *Privacy Notice:* To protect your clinical data, phone verification is required to download.\n\n` +
    `Reply STOP to opt out of updates.`;

  return { valid: true, payload, summaryText };
}
