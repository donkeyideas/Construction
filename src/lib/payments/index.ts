// ---------------------------------------------------------------------------
// Payment Gateway Factory
// ---------------------------------------------------------------------------

import { createAdminClient } from "@/lib/supabase/admin";
import type { PaymentGateway, GatewayConfig, GatewayCredentials } from "./gateway";
import { StripeGateway } from "./providers/stripe";

/**
 * Get a gateway instance by provider key.
 */
export function getGateway(provider: string): PaymentGateway | null {
  switch (provider) {
    case "stripe":
      return new StripeGateway();
    // case "paypal":  return new PayPalGateway();  // Future
    // case "square":  return new SquareGateway();   // Future
    default:
      return null;
  }
}

/**
 * Get a company's active payment gateway with its credentials.
 * Returns the gateway implementation + config + credentials, or null if none configured.
 */
export async function getCompanyGateway(
  companyId: string
): Promise<{
  gateway: PaymentGateway;
  config: GatewayConfig;
  credentials: GatewayCredentials;
} | null> {
  const admin = createAdminClient();

  const { data } = await admin
    .from("payment_gateway_config")
    .select("*")
    .eq("company_id", companyId)
    .eq("is_active", true)
    .limit(1)
    .single();

  if (!data) return null;

  const gateway = getGateway(data.provider);
  if (!gateway) return null;

  const config = data as GatewayConfig;
  const credentials = (config.config || {}) as GatewayCredentials;

  if (!credentials.secret_key) return null;

  return { gateway, config, credentials };
}

/**
 * Get a company's gateway config (active or not) for a specific provider.
 */
export async function getCompanyGatewayConfig(
  companyId: string,
  provider?: string
): Promise<GatewayConfig | null> {
  const admin = createAdminClient();

  let query = admin
    .from("payment_gateway_config")
    .select("*")
    .eq("company_id", companyId);

  if (provider) {
    query = query.eq("provider", provider);
  }

  const { data } = await query.limit(1).single();
  return (data as GatewayConfig) ?? null;
}

// Re-export types and constants for convenience
export { GATEWAY_PROVIDERS } from "./gateway";
export type { GatewayConfig, GatewayCredentials, CheckoutParams } from "./gateway";
