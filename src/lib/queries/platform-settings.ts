import { createAdminClient } from "@/lib/supabase/admin";
import { encrypt, decrypt } from "@/lib/ai/encryption";

export interface PlatformSettingRow {
  key: string;
  value: string;
  is_encrypted: boolean;
  description: string | null;
}

/**
 * Get a single platform setting by key.
 * Decrypts the value if the setting is marked as encrypted.
 */
export async function getPlatformSetting(
  key: string
): Promise<string | null> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("platform_settings")
    .select("value, is_encrypted")
    .eq("key", key)
    .single();

  if (error || !data) return null;

  if (data.is_encrypted) {
    try {
      return decrypt(data.value);
    } catch {
      console.error(`Failed to decrypt platform setting: ${key}`);
      return null;
    }
  }

  return data.value;
}

/**
 * Set a platform setting. Encrypts the value if isEncrypted is true.
 * Upserts on the unique `key` column.
 */
export async function setPlatformSetting(
  key: string,
  value: string,
  isEncrypted: boolean,
  description?: string,
  updatedBy?: string
): Promise<void> {
  const admin = createAdminClient();

  const storedValue = isEncrypted ? encrypt(value) : value;

  const { error } = await admin.from("platform_settings").upsert(
    {
      key,
      value: storedValue,
      is_encrypted: isEncrypted,
      ...(description !== undefined ? { description } : {}),
      ...(updatedBy ? { updated_by: updatedBy } : {}),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" }
  );

  if (error) {
    console.error(`Failed to set platform setting '${key}':`, error);
    throw new Error(`Failed to save setting: ${key}`);
  }
}

/**
 * Mask a value for display: show "••••" + last 4 characters.
 * If the value is shorter than 4 chars, show all dots.
 */
function maskValue(value: string): string {
  if (value.length <= 4) return "••••••••";
  return "••••" + value.slice(-4);
}

/**
 * Get all platform settings with masked values for encrypted ones.
 */
export async function getAllPlatformSettings(): Promise<PlatformSettingRow[]> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("platform_settings")
    .select("key, value, is_encrypted, description")
    .order("key");

  if (error || !data) return [];

  return data.map((row) => {
    if (row.is_encrypted) {
      try {
        const decrypted = decrypt(row.value);
        return {
          key: row.key,
          value: maskValue(decrypted),
          is_encrypted: row.is_encrypted,
          description: row.description,
        };
      } catch {
        return {
          key: row.key,
          value: "••••••••",
          is_encrypted: row.is_encrypted,
          description: row.description,
        };
      }
    }

    return {
      key: row.key,
      value: row.value,
      is_encrypted: row.is_encrypted,
      description: row.description,
    };
  });
}

/**
 * Convenience: get the active Stripe configuration.
 * Falls back to environment variables if DB values are not found.
 */
export async function getStripeConfig(): Promise<{
  secretKey: string | null;
  webhookSecret: string | null;
  mode: string;
}> {
  // 1. Get stripe_mode (default "test")
  const mode = (await getPlatformSetting("stripe_mode")) ?? "test";

  // 2. Get the corresponding secret key
  const secretKeySettingName =
    mode === "live" ? "stripe_secret_key_live" : "stripe_secret_key_test";
  let secretKey = await getPlatformSetting(secretKeySettingName);

  // 3. Get the corresponding webhook secret
  const webhookSettingName =
    mode === "live"
      ? "stripe_webhook_secret_live"
      : "stripe_webhook_secret_test";
  let webhookSecret = await getPlatformSetting(webhookSettingName);

  // 4. Fall back to env vars if DB values not found
  if (!secretKey) {
    secretKey = process.env.STRIPE_SECRET_KEY ?? null;
  }
  if (!webhookSecret) {
    webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? null;
  }

  return { secretKey, webhookSecret, mode };
}
