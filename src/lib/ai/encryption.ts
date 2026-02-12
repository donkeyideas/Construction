import crypto from "crypto";

// ---------------------------------------------------------------------------
// AES-256-GCM encryption for API keys at rest
// ---------------------------------------------------------------------------
// The encryption secret is a 32-byte hex string stored in
// process.env.AI_KEY_ENCRYPTION_SECRET (64 hex characters = 32 bytes).
//
// Ciphertext format stored in the database:
//   base64(iv):base64(authTag):base64(encrypted)
// ---------------------------------------------------------------------------

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96-bit IV recommended for GCM
const AUTH_TAG_LENGTH = 16;

function getKey(): Buffer {
  const secret = process.env.AI_KEY_ENCRYPTION_SECRET;
  if (!secret) {
    throw new Error(
      "AI_KEY_ENCRYPTION_SECRET environment variable is not set."
    );
  }
  if (secret.length !== 64) {
    throw new Error(
      "AI_KEY_ENCRYPTION_SECRET must be a 64-character hex string (32 bytes)."
    );
  }
  return Buffer.from(secret, "hex");
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Returns a string in the format: base64(iv):base64(authTag):base64(ciphertext)
 */
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return [
    iv.toString("base64"),
    authTag.toString("base64"),
    encrypted.toString("base64"),
  ].join(":");
}

/**
 * Decrypt a ciphertext string produced by encrypt().
 * Expects the format: base64(iv):base64(authTag):base64(ciphertext)
 */
export function decrypt(ciphertext: string): string {
  const key = getKey();
  const parts = ciphertext.split(":");

  if (parts.length !== 3) {
    throw new Error("Invalid ciphertext format. Expected iv:authTag:data.");
  }

  const iv = Buffer.from(parts[0], "base64");
  const authTag = Buffer.from(parts[1], "base64");
  const encrypted = Buffer.from(parts[2], "base64");

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}
