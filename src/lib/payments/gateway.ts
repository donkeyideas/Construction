// ---------------------------------------------------------------------------
// Payment Gateway Interface — Provider-agnostic payment processing
// ---------------------------------------------------------------------------

/**
 * Common interface that all payment providers implement.
 * Adding a new provider = creating a new file in providers/ that implements this.
 */
export interface PaymentGateway {
  /** Provider key (e.g. "stripe", "paypal", "square") */
  provider: string;

  /**
   * Start the onboarding/OAuth flow — redirect the user to the provider.
   * Returns the redirect URL and the provider-specific account ID.
   */
  createOnboardingUrl(
    companyId: string,
    returnUrl: string,
    refreshUrl: string
  ): Promise<{ url: string; accountId: string } | null>;

  /**
   * Check if the connected account is fully set up and can accept payments.
   */
  getAccountStatus(accountId: string): Promise<GatewayAccountStatus>;

  /**
   * Disconnect / deauthorize the provider account.
   */
  disconnect(companyId: string): Promise<void>;

  /**
   * Create a checkout / payment session for a tenant to pay rent.
   * Returns a URL that the tenant should be redirected to.
   */
  createCheckoutSession(params: CheckoutParams): Promise<{ url: string } | null>;
}

export interface GatewayAccountStatus {
  connected: boolean;
  accountId: string | null;
  chargesEnabled: boolean;
  detailsSubmitted: boolean;
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
  /** Provider-specific destination account ID */
  destinationAccountId: string;
}

/** Available gateway providers shown in the UI */
export interface GatewayProviderInfo {
  key: string;
  name: string;
  description: string;
  available: boolean; // false = "Coming Soon"
}

export const GATEWAY_PROVIDERS: GatewayProviderInfo[] = [
  { key: "stripe", name: "Stripe", description: "Cards, ACH, Apple Pay, Google Pay", available: true },
  { key: "paypal", name: "PayPal", description: "PayPal, Venmo, cards", available: false },
  { key: "square", name: "Square", description: "Cards, ACH, Cash App Pay", available: false },
  { key: "gocardless", name: "GoCardless", description: "ACH, Direct Debit (low fees)", available: false },
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
