/**
 * Gyrex Labs - Production Environment Validation
 *
 * Validates that all critical environment variables and secrets are present,
 * sufficiently strong, and properly segregated before runtime operation.
 *
 * STRICT SECURITY INVARIANT:
 * Error messages MUST NEVER print secret values or connection strings.
 */

export interface EnvValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

const INSECURE_FALLBACK_SECRETS = [
  "gyrex-labs-development-fallback-secret-minimum-32-characters",
  "gyrex-labs-default-encryption-key-for-dev-only-32bytes!",
  "gyrex-secret-key-for-signing-urls",
  "dummy_webhook_secret",
  "dummy_platform_secret",
];

/**
 * Validates the runtime environment configuration.
 * @param isProduction Optional override for checking production strictness
 */
export function validateEnvironment(isProduction = process.env.NODE_ENV === "production"): EnvValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Database Configuration
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    errors.push("Missing required environment variable: DATABASE_URL");
  } else if (isProduction && databaseUrl.includes("localhost")) {
    warnings.push("DATABASE_URL points to localhost in production mode.");
  }

  // 2. Authentication Secret (JWT)
  const authSecret = process.env.AUTH_SECRET;
  if (!authSecret) {
    if (isProduction) {
      errors.push("Missing required production environment variable: AUTH_SECRET");
    } else {
      warnings.push("AUTH_SECRET is not set; falling back to insecure development default.");
    }
  } else {
    if (authSecret.length < 32) {
      errors.push("AUTH_SECRET is too short (minimum 32 characters required for cryptographic security).");
    }
    if (isProduction && INSECURE_FALLBACK_SECRETS.includes(authSecret)) {
      errors.push("AUTH_SECRET is set to an insecure known development default in production.");
    }
  }

  // 3. Encryption Secret (AES-256-GCM for tenant secrets)
  const encryptionSecret = process.env.ENCRYPTION_SECRET;
  if (!encryptionSecret && isProduction) {
    warnings.push("ENCRYPTION_SECRET not explicitly set; defaulting to derived AUTH_SECRET.");
  } else if (encryptionSecret) {
    if (encryptionSecret.length < 32) {
      errors.push("ENCRYPTION_SECRET is too short (minimum 32 characters required for AES-256 key derivation).");
    }
    if (authSecret && encryptionSecret === authSecret) {
      warnings.push("ENCRYPTION_SECRET is identical to AUTH_SECRET. Key segregation is recommended.");
    }
  }

  // 4. Storage URL Signing Secret (HMAC-SHA256)
  const storageSecret = process.env.STORAGE_SIGNING_SECRET;
  if (!storageSecret && isProduction) {
    warnings.push("STORAGE_SIGNING_SECRET not explicitly set; defaulting to AUTH_SECRET.");
  } else if (storageSecret) {
    if (storageSecret.length < 32) {
      errors.push("STORAGE_SIGNING_SECRET is too short (minimum 32 characters required).");
    }
    if (authSecret && storageSecret === authSecret) {
      warnings.push("STORAGE_SIGNING_SECRET is identical to AUTH_SECRET. Key segregation is recommended.");
    }
  }

  // 5. Razorpay Platform Gateway (Flow B)
  const rzpPlatformKey = process.env.GYREX_RAZORPAY_KEY_ID;
  const rzpPlatformSecret = process.env.GYREX_RAZORPAY_KEY_SECRET;
  if (isProduction && (!rzpPlatformKey || !rzpPlatformSecret)) {
    warnings.push("Gyrex Platform Razorpay credentials (Flow B) are missing. SaaS billing will operate in mock mode.");
  }

  // 6. Gemini AI API Key
  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey) {
    warnings.push("GEMINI_API_KEY is not configured. Prescription OCR extraction will run in fallback mock mode.");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Asserts environment health on server bootstrap.
 * Throws a sanitized Error if fatal misconfigurations exist in production.
 */
export function assertProductionEnv(): void {
  const result = validateEnvironment();
  if (!result.valid) {
    const message = `[FATAL] Environment Configuration Error:\n- ${result.errors.join("\n- ")}`;
    if (process.env.NODE_ENV === "production") {
      throw new Error(message);
    } else {
      console.error(message);
    }
  }
}
