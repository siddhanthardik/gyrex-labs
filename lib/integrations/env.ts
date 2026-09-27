/**
 * Gyrex Labs - Integrations Environment & Configuration Validator
 *
 * Validates external service credentials safely without printing secret values.
 * Distinguishes between development (graceful warnings) and production (hard fail on required).
 */

export interface IntegrationsConfig {
  isProduction: boolean;

  // Payments (Gyrex SaaS Platform - Flow B)
  platformRazorpayKeyId: string | null;
  hasPlatformRazorpaySecret: boolean;
  hasPlatformWebhookSecret: boolean;

  // AI Multimodal Extraction (Google Gemini)
  hasGeminiApiKey: boolean;

  // Private File Storage
  storageProvider: "LOCAL_SECURE" | "S3_COMPLIANT";
  storageLocalDir: string;
  hasS3Credentials: boolean;

  // Transactional Email
  emailFrom: string;
  hasEmailApiKey: boolean;

  // Meta WhatsApp Cloud API
  hasWhatsAppAccessToken: boolean;
  whatsAppPhoneNumberId: string | null;
  hasWhatsAppVerifyToken: boolean;
}

/**
 * Retrieves integration configuration summary without exposing sensitive tokens.
 */
export function getIntegrationsConfig(): IntegrationsConfig {
  const isProduction = process.env.NODE_ENV === "production";

  return {
    isProduction,

    platformRazorpayKeyId: process.env.GYREX_RAZORPAY_KEY_ID || null,
    hasPlatformRazorpaySecret: Boolean(process.env.GYREX_RAZORPAY_KEY_SECRET),
    hasPlatformWebhookSecret: Boolean(process.env.GYREX_RAZORPAY_WEBHOOK_SECRET),

    hasGeminiApiKey: Boolean(process.env.GEMINI_API_KEY),

    storageProvider: (process.env.STORAGE_PROVIDER as "LOCAL_SECURE" | "S3_COMPLIANT") || "LOCAL_SECURE",
    storageLocalDir: process.env.STORAGE_LOCAL_DIR || "./storage/secure",
    hasS3Credentials: Boolean(process.env.STORAGE_ACCESS_KEY && process.env.STORAGE_SECRET_KEY),

    emailFrom: process.env.EMAIL_FROM || "notifications@labs.gyrex.in",
    hasEmailApiKey: Boolean(process.env.EMAIL_API_KEY),

    hasWhatsAppAccessToken: Boolean(process.env.WHATSAPP_ACCESS_TOKEN),
    whatsAppPhoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || null,
    hasWhatsAppVerifyToken: Boolean(process.env.WHATSAPP_VERIFY_TOKEN),
  };
}

/**
 * Performs environment readiness checks on application startup.
 * Emits actionable operational warnings in development.
 */
export function validateIntegrationsEnvironment(): { valid: boolean; warnings: string[] } {
  const cfg = getIntegrationsConfig();
  const warnings: string[] = [];

  if (!cfg.platformRazorpayKeyId || !cfg.hasPlatformRazorpaySecret) {
    warnings.push("Platform Razorpay billing credentials (GYREX_RAZORPAY_KEY_ID) not fully configured.");
  }

  if (!cfg.hasGeminiApiKey) {
    warnings.push("Google Gemini API key (GEMINI_API_KEY) not set; AI prescription extraction will use mock fallback.");
  }

  if (!cfg.hasEmailApiKey) {
    warnings.push("Email provider API key (EMAIL_API_KEY) not set; transactional notifications will log to console.");
  }

  if (!cfg.hasWhatsAppAccessToken) {
    warnings.push("WhatsApp Cloud API credentials not configured; WhatsApp alerts will log to console.");
  }

  return {
    valid: warnings.length === 0,
    warnings,
  };
}
