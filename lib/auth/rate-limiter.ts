/**
 * In-Memory Sliding-Window Rate Limiter
 * 
 * Provides brute-force protection for login and authentication endpoints.
 * Compatible with standalone VPS and Next.js processes without requiring Redis.
 */

interface RateLimitRecord {
  attempts: number[];
}

const store = new Map<string, RateLimitRecord>();

// Clean up expired records every 10 minutes to prevent memory leaks
if (typeof setInterval !== "undefined") {
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of store.entries()) {
      record.attempts = record.attempts.filter((timestamp) => now - timestamp < 15 * 60 * 1000);
      if (record.attempts.length === 0) {
        store.delete(key);
      }
    }
  }, 10 * 60 * 1000);
  if (timer.unref) {
    timer.unref();
  }
}

export interface RateLimitOptions {
  maxAttempts?: number;
  windowMs?: number;
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  retryAfterSeconds?: number;
}

/**
 * Checks whether an action from a given identifier (e.g. IP + email) exceeds rate limits.
 */
export function checkRateLimit(
  identifier: string,
  options: RateLimitOptions = {}
): RateLimitResult {
  const maxAttempts = options.maxAttempts ?? 5; // Default 5 attempts
  const windowMs = options.windowMs ?? 15 * 60 * 1000; // Default 15 minutes window
  const now = Date.now();

  let record = store.get(identifier);
  if (!record) {
    record = { attempts: [] };
    store.set(identifier, record);
  }

  // Filter out attempts outside the sliding window
  record.attempts = record.attempts.filter((timestamp) => now - timestamp < windowMs);

  if (record.attempts.length >= maxAttempts) {
    const oldest = record.attempts[0];
    const retryAfterMs = oldest + windowMs - now;
    return {
      success: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil(Math.max(0, retryAfterMs) / 1000),
    };
  }

  return {
    success: true,
    remaining: maxAttempts - record.attempts.length,
  };
}

/**
 * Records a failed attempt for a given identifier.
 */
export function recordRateLimitAttempt(identifier: string): void {
  const now = Date.now();
  let record = store.get(identifier);
  if (!record) {
    record = { attempts: [] };
    store.set(identifier, record);
  }
  record.attempts.push(now);
}

/**
 * Resets rate limit attempts for an identifier (e.g. upon successful authentication).
 */
export function resetRateLimit(identifier: string): void {
  store.delete(identifier);
}
