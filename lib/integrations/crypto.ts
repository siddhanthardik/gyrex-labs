/**
 * Gyrex Labs - Cryptographic Utilities for Integrations
 *
 * Provides:
 * 1. AES-256-GCM encryption/decryption for tenant payment secrets.
 * 2. HMAC-SHA256 signature verification for Razorpay payments and webhooks.
 * 3. SHA-256 file checksums.
 */

import crypto from "crypto";

const ENCRYPTION_ALGORITHM = "aes-256-gcm";
const IV_LENGTH_BYTES = 12;

/**
 * Derives a consistent 32-byte key from ENCRYPTION_SECRET or AUTH_SECRET.
 */
function getMasterKey(): Buffer {
  const secret = process.env.ENCRYPTION_SECRET || process.env.AUTH_SECRET || "gyrex-labs-default-encryption-key-for-dev-only-32bytes!";
  return crypto.createHash("sha256").update(secret).digest();
}

/**
 * Encrypts sensitive credentials (e.g. lab Razorpay Key Secret) using AES-256-GCM.
 * Output format: base64(iv:authTag:ciphertext)
 */
export function encryptSecret(plainText: string): string {
  const iv = crypto.randomBytes(IV_LENGTH_BYTES);
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, getMasterKey(), iv);

  let encrypted = cipher.update(plainText, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag();

  return Buffer.from(`${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`).toString("base64");
}

/**
 * Decrypts an encrypted credential string.
 */
export function decryptSecret(encryptedBase64: string): string {
  const raw = Buffer.from(encryptedBase64, "base64").toString("utf8");
  const [ivHex, authTagHex, cipherHex] = raw.split(":");

  if (!ivHex || !authTagHex || !cipherHex) {
    throw new Error("Invalid encrypted payload format");
  }

  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, getMasterKey(), iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(cipherHex, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

/**
 * Verifies Razorpay checkout payment signature:
 * Expected: HMAC-SHA256(order_id + "|" + razorpay_payment_id, secret) === signature
 */
export function verifyRazorpaySignature(
  orderId: string,
  razorpayPaymentId: string,
  signature: string,
  secret: string
): boolean {
  if (!orderId || !razorpayPaymentId || !signature || !secret) {
    return false;
  }

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(`${orderId}|${razorpayPaymentId}`)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(expectedSignature, "hex")
    );
  } catch {
    return false;
  }
}

/**
 * Verifies Razorpay webhook signature:
 * Expected: HMAC-SHA256(raw_body, webhook_secret) === x-razorpay-signature
 */
export function verifyRazorpayWebhookSignature(
  rawBody: string,
  signature: string,
  webhookSecret: string
): boolean {
  if (!rawBody || !signature || !webhookSecret) {
    return false;
  }

  const expectedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(rawBody)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(expectedSignature, "hex")
    );
  } catch {
    return false;
  }
}

/**
 * Verifies Meta WhatsApp Cloud API webhook signature:
 * Expected: HMAC-SHA256(raw_body, app_secret) === x-hub-signature-256 (prefix 'sha256=')
 */
export function verifyMetaWebhookSignature(
  rawBody: string,
  signatureHeader: string,
  appSecret: string
): boolean {
  if (!rawBody || !signatureHeader || !appSecret) {
    return false;
  }

  const parts = signatureHeader.split("sha256=");
  const signatureHex = parts.length === 2 ? parts[1] : signatureHeader;

  if (!signatureHex || signatureHex.length !== 64) {
    return false;
  }

  const expectedSignature = crypto
    .createHmac("sha256", appSecret)
    .update(rawBody)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signatureHex, "hex"),
      Buffer.from(expectedSignature, "hex")
    );
  } catch {
    return false;
  }
}

/**
 * Calculates SHA-256 checksum of a file buffer.
 */
export function calculateSha256Checksum(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}
