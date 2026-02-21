// ---------------------------------------------------------------------------
// Payment Gateway Interface — Provider-agnostic payment processing
// ---------------------------------------------------------------------------

/**
 * Common interface that all payment providers implement.
 * Each property management company configures their OWN API keys.
 * The platform (Buildwrk) does NOT intermediate — payments go directly
 * through the company's own provider account.
 */
export interface PaymentGateway {
  /** Provider key (e.g. "stripe", "paypal", "square") */
  provider: string;

  /**
   * Validate API credentials provided by the property manager.
   * Returns account info if valid, null if invalid.
   */
  validateCredentials(
    credentials: GatewayCredentials
  ): Promise<{ valid: boolean; accountName?: string; error?: string }>;

  /**
   * Check if the stored credentials are still valid and the account can accept payments.
   */
  getAccountStatus(
    credentials: GatewayCredentials
  ): Promise<GatewayAccountStatus>;

  /**
   * Create a checkout / payment session for a tenant to pay rent.
   * Uses the company's own API key — payments go directly to their account.
   */
  createCheckoutSession(
    credentials: GatewayCredentials,
    params: CheckoutParams
  ): Promise<{ url: string } | null>;

  /**
   * Verify a webhook signature using the company's webhook secret.
   * Returns the parsed event if valid, null if signature mismatch.
   */
  verifyWebhook(
    credentials: GatewayCredentials,
    body: string,
    signature: string
  ): Promise<unknown | null>;
}

export interface GatewayCredentials {
  secret_key: string;
  webhook_secret?: string;
  [key: string]: unknown;
}

export interface GatewayAccountStatus {
  connected: boolean;
  accountName: string | null;
  error?: string;
}

export interface CheckoutParams {
  leaseId: string;
  companyId: string;
  tenantUserId: string;
  amount: number; // in dollars
  description: string;
  dueDate: string;
  successUrl: string;
  cancelUrl: string;
}

/** Available gateway providers shown in the UI */
export interface GatewayProviderInfo {
  key: string;
  name: string;
  description: string;
  available: boolean; // false = "Coming Soon"
  fields: { key: string; label: string; placeholder: string; type: string }[];
}

export const GATEWAY_PROVIDERS: GatewayProviderInfo[] = [
  {
    key: "stripe",
    name: "Stripe",
    description: "Cards, ACH, Apple Pay, Google Pay",
    available: true,
    fields: [
      { key: "secret_key", label: "Secret Key", placeholder: "sk_live_...", type: "password" },
      { key: "webhook_secret", label: "Webhook Secret (optional)", placeholder: "whsec_...", type: "password" },
    ],
  },
  {
    key: "paypal",
    name: "PayPal",
    description: "PayPal, Venmo, cards",
    available: true,
    fields: [
      { key: "client_id", label: "Client ID", placeholder: "AV...", type: "password" },
      { key: "secret_key", label: "Secret", placeholder: "EL...", type: "password" },
      { key: "webhook_id", label: "Webhook ID (optional)", placeholder: "WH-...", type: "password" },
    ],
  },
  {
    key: "square",
    name: "Square",
    description: "Cards, ACH, Cash App Pay",
    available: true,
    fields: [
      { key: "secret_key", label: "Access Token", placeholder: "EAAAl...", type: "password" },
      { key: "webhook_secret", label: "Webhook Signature Key (optional)", placeholder: "...", type: "password" },
    ],
  },
  {
    key: "gocardless",
    name: "GoCardless",
    description: "ACH, Direct Debit (low fees)",
    available: true,
    fields: [
      { key: "secret_key", label: "Access Token", placeholder: "live_...", type: "password" },
      { key: "webhook_secret", label: "Webhook Secret (optional)", placeholder: "...", type: "password" },
    ],
  },
];

/** Database row shape for payment_gateway_config */
export interface GatewayConfig {
  id: string;
  company_id: string;
  provider: string;
  is_active: boolean;
  account_id: string | null;
  config: Record<string, unknown>;
  onboarded_at: string | null;
}
