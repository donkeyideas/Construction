import { getStripeConfig } from "@/lib/queries/platform-settings";

/**
 * Create a centralized Stripe instance using the active configuration.
 * Returns null if no secret key is configured.
 */
export async function getStripeInstance() {
  const { secretKey } = await getStripeConfig();

  if (!secretKey) return null;

  const Stripe = (await import("stripe")).default;
  return new Stripe(secretKey);
}

/**
 * Get the webhook secret for the current Stripe mode.
 * Returns null if not configured.
 */
export async function getWebhookSecret(): Promise<string | null> {
  const { webhookSecret } = await getStripeConfig();
  return webhookSecret;
}
