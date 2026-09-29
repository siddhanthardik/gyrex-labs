/**
 * Gyrex Labs - Core Integration Provider Interfaces & Types
 *
 * Defines the vendor-agnostic boundaries between Gyrex Labs internal services
 * and third-party external providers.
 */


// ============================================================
// 1. PAYMENTS PROVIDER ABSTRACTION
// ============================================================

export interface CreateOrderParams {
  amountInPaise: number; // e.g. 50000 = ₹500.00
  currency?: string;
  receipt: string;
  notes?: Record<string, string>;
}

export interface PaymentOrderResult {
  gatewayOrderId: string;
  amount: number;
  currency: string;
  receipt: string;
  status: "created" | "attempted" | "paid";
}

export interface VerifySignatureParams {
  orderId: string;
  paymentId: string;
  signature: string;
  secret: string;
}

export interface RefundParams {
  gatewayPaymentId: string;
  amountInPaise?: number; // Optional: If omitted, refunds full amount
  notes?: Record<string, string>;
  reason?: string;
}

export interface RefundResult {
  refundId: string;
  gatewayPaymentId: string;
  amount: number;
  status: "processed" | "pending" | "failed";
  currency: string;
  createdAt: Date;
}

export interface CreateSubscriptionParams {
  planId: string;
  customerId?: string;
  totalCount?: number;
  quantity?: number;
  notes?: Record<string, string>;
}

export interface SubscriptionResult {
  subscriptionId: string;
  planId: string;
  status: "active" | "pending" | "halted" | "cancelled" | "completed" | "expired";
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
}

export interface PaymentProvider {
  createOrder(params: CreateOrderParams, credentials?: { keyId: string; keySecret: string }): Promise<PaymentOrderResult>;
  verifyPaymentSignature(params: VerifySignatureParams): boolean;
  verifyWebhookSignature(rawBody: string, signature: string, webhookSecret: string): boolean;
  refundPayment(params: RefundParams, credentials?: { keyId: string; keySecret: string }): Promise<RefundResult>;
  createSubscription(params: CreateSubscriptionParams, credentials?: { keyId: string; keySecret: string }): Promise<SubscriptionResult>;
  cancelSubscription(subscriptionId: string, credentials?: { keyId: string; keySecret: string }): Promise<{ cancelled: boolean }>;
}

// ============================================================
// 2. AI PRESCRIPTION EXTRACTION ABSTRACTION
// ============================================================

export interface RawExtractedItem {
  rawText: string;
  confidence: number;
  categoryHint?: string;
  uncertaintyReason?: string;
}

export interface PrescriptionExtractionOutput {
  status: "SUCCESS" | "PARTIAL" | "NO_MATCH" | "UNREADABLE" | "ERROR";
  rawItems: RawExtractedItem[];
  modelId: string;
  notes?: string;
  rawJson?: unknown;
}

export interface PrescriptionExtractionProvider {
  extractInvestigationsFromBuffer(
    fileBuffer: Buffer,
    mimeType: string
  ): Promise<PrescriptionExtractionOutput>;
}

// ============================================================
// 3. FILE STORAGE PROVIDER ABSTRACTION
// ============================================================

export interface StorageUploadParams {
  fileBuffer: Buffer;
  destinationPath: string;
  mimeType: string;
  accessClassification: "PUBLIC_READ" | "RESTRICTED_PATIENT_LAB" | "CONFIDENTIAL_MEDICAL";
}

export interface StorageUploadResult {
  storagePath: string;
  fileSizeBytes: number;
  mimeType: string;
  checksumSha256: string;
}

export interface StorageProvider {
  upload(params: StorageUploadParams): Promise<StorageUploadResult>;
  getDownloadStream(storagePath: string): Promise<ReadableStream<Uint8Array> | NodeJS.ReadableStream>;
  generateSignedAccessUrl(storagePath: string, expiresInSeconds: number): Promise<string>;
  exists(storagePath: string): Promise<boolean>;
  delete(storagePath: string): Promise<void>;
}

// ============================================================
// 4. TRANSACTIONAL EMAIL ABSTRACTION
// ============================================================

export type EmailTemplateId =
  | "PATIENT_ORDER_CONFIRMATION"
  | "PATIENT_PAYMENT_CONFIRMATION"
  | "PATIENT_COLLECTION_REMINDER"
  | "PATIENT_REPORT_READY"
  | "LAB_NEW_ORDER_ALERT"
  | "LAB_SUBSCRIPTION_INVOICE"
  | "LAB_VERIFICATION_STATUS"
  | "LAB_EMAIL_VERIFICATION"
  | "PLATFORM_SUPPORT_ALERT";

export interface SendEmailParams {
  to: string;
  subject: string;
  templateId: EmailTemplateId;
  templateData: Record<string, unknown>;
  replyTo?: string;
}

export interface EmailSendResult {
  messageId: string;
  success: boolean;
  timestamp: Date;
  error?: string;
}

export interface EmailProvider {
  send(params: SendEmailParams): Promise<EmailSendResult>;
}

// ============================================================
// 5. META WHATSAPP CLOUD API ABSTRACTION
// ============================================================

export type WhatsAppTemplateId =
  | "gyrex_booking_confirmed"
  | "gyrex_phlebotomist_assigned"
  | "gyrex_report_ready"
  | "gyrex_payment_received";

export interface SendWhatsAppTemplateParams {
  recipientPhone: string; // E.164 format, e.g. +919876543210
  templateName: WhatsAppTemplateId;
  languageCode?: string; // Default: "en"
  components: Array<{
    type: "header" | "body" | "button";
    parameters: Array<{
      type: "text" | "currency" | "date_time";
      text?: string;
    }>;
  }>;
}

export interface SendWhatsAppTextParams {
  recipientPhone: string;
  text: string;
}

export interface WhatsAppSendResult {
  messageId: string;
  recipientPhone: string;
  success: boolean;
  status: "sent" | "failed";
  timestamp: Date;
}

export interface WhatsAppProvider {
  sendTemplate(params: SendWhatsAppTemplateParams): Promise<WhatsAppSendResult>;
  sendText(params: SendWhatsAppTextParams): Promise<WhatsAppSendResult>;
  verifyWebhook(verifyToken: string, challenge: string): string | null;
  processWebhookPayload(rawPayload: unknown): Promise<{ handled: boolean; eventType?: string }>;
}

// ============================================================
// 6. HEALTH PROBE ABSTRACTION
// ============================================================

export type IntegrationHealthStatus = "OPERATIONAL" | "DEGRADED" | "FAILED" | "UNKNOWN";

export interface IntegrationHealthReport {
  serviceName: string;
  category: "PAYMENT" | "AI" | "STORAGE" | "EMAIL" | "WHATSAPP";
  status: IntegrationHealthStatus;
  latencyMs?: number;
  message?: string;
  checkedAt: Date;
}
