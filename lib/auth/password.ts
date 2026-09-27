import bcrypt from "bcryptjs";

/**
 * Modern password hashing and verification using bcrypt
 */

const SALT_ROUNDS = 10;

/**
 * Hashes a plaintext password securely.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verifies a plaintext password against a stored bcrypt hash.
 * Performs constant-time comparison to prevent timing attacks.
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (!password || !hash) {
    return false;
  }
  return bcrypt.compare(password, hash);
}
