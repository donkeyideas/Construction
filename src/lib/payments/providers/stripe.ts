// ---------------------------------------------------------------------------
// Stripe — PaymentGateway implementation using company's OWN API keys
// ---------------------------------------------------------------------------

import Stripe from "stripe";
import type {
  PaymentGateway,
  GatewayAccountStatus,
  GatewayCredentials,
  CheckoutParams,
} from "../gateway";

/**
 * Creates a Stripe instance using the company's own secret key.
 * Each company manages their own Stripe account — no platform Connect.
 */
function createStripeClient(secretKey: string): Stripe {
  return new Stripe(secretKey);
}

export class StripeGateway implements PaymentGateway {
  provider = "stripe" as const;

  async validateCredentials(
    credentials: GatewayCredentials
  ): Promise<{ valid: boolean; accountName?: string; error?: string }> {
    if (!credentials.secret_key) {
      return { valid: false, error: "Secret key is required" };
    }

    try {
      const stripe = createStripeClient(credentials.secret_key);
      // Retrieve the account to verify the key works
      const account = await stripe.accounts.retrieve();
      const name =
        (account as Stripe.Account & { settings?: { dashboard?: { display_name?: string } } })
          .settings?.dashboard?.display_name ||
        (account as Stripe.Account & { business_profile?: { name?: string } })
          .business_profile?.name ||
        "Stripe Account";
      return { valid: true, accountName: name };
    } catch (err) {
      const message =
        err instanceof Stripe.errors.StripeAuthenticationError
          ? "Invalid API key. Please check and try again."
          : err instanceof Error
            ? err.message
            : "Failed to validate key";
      return { valid: false, error: message };
    }
  }

  async getAccountStatus(
    credentials: GatewayCredentials
  ): Promise<GatewayAccountStatus> {
    if (!credentials.secret_key) {
      return { connected: false, accountName: null, error: "No key configured" };
    }

    try {
      const stripe = createStripeClient(credentials.secret_key);
      const account = await stripe.accounts.retrieve();
      const name =
        (account as Stripe.Account & { settings?: { dashboard?: { display_name?: string } } })
          .settings?.dashboard?.display_name ||
        (account as Stripe.Account & { business_profile?: { name?: string } })
          .business_profile?.name ||
        "Stripe Account";
      return { connected: true, accountName: name };
    } catch {
      return { connected: false, accountName: null, error: "API key is no longer valid" };
    }
  }

  async createCheckoutSession(
    credentials: GatewayCredentials,
    params: CheckoutParams
  ): Promise<{ url: string } | null> {
    if (!credentials.secret_key) return null;

    const stripe = createStripeClient(credentials.secret_key);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: params.description,
            },
            unit_amount: Math.round(params.amount * 100), // dollars → cents
          },
          quantity: 1,
        },
      ],
      payment_intent_data: {
        metadata: {
          company_id: params.companyId,
          lease_id: params.leaseId,
          tenant_user_id: params.tenantUserId,
          payment_type: "rent",
          due_date: params.dueDate,
          gateway_provider: "stripe",
        },
      },
      metadata: {
        company_id: params.companyId,
        lease_id: params.leaseId,
        tenant_user_id: params.tenantUserId,
        payment_type: "rent",
        gateway_provider: "stripe",
      },
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
    });

    return session.url ? { url: session.url } : null;
  }

  async verifyWebhook(
    credentials: GatewayCredentials,
    body: string,
    signature: string
  ): Promise<Stripe.Event | null> {
    if (!credentials.webhook_secret || !credentials.secret_key) return null;

    try {
      const stripe = createStripeClient(credentials.secret_key);
      return stripe.webhooks.constructEvent(
        body,
        signature,
        credentials.webhook_secret
      );
    } catch {
      return null;
    }
  }
}
