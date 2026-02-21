// ---------------------------------------------------------------------------
// Stripe Connect — PaymentGateway implementation
// ---------------------------------------------------------------------------

import { getStripeInstance } from "@/lib/stripe/config";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  PaymentGateway,
  GatewayAccountStatus,
  CheckoutParams,
} from "../gateway";

export class StripeGateway implements PaymentGateway {
  provider = "stripe" as const;

  async createOnboardingUrl(
    companyId: string,
    returnUrl: string,
    refreshUrl: string
  ): Promise<{ url: string; accountId: string } | null> {
    const stripe = await getStripeInstance();
    if (!stripe) return null;

    const admin = createAdminClient();

    // Check for existing gateway config
    const { data: existing } = await admin
      .from("payment_gateway_config")
      .select("account_id")
      .eq("company_id", companyId)
      .eq("provider", "stripe")
      .single();

    let accountId = existing?.account_id;

    if (!accountId) {
      // Create a new Standard connected account
      const account = await stripe.accounts.create({
        type: "standard",
        metadata: { company_id: companyId },
      });
      accountId = account.id;

      // Store immediately (even before onboarding completes)
      await admin.from("payment_gateway_config").upsert(
        {
          company_id: companyId,
          provider: "stripe",
          account_id: accountId,
          is_active: false,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "company_id,provider" }
      );
    }

    // Create an account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: "account_onboarding",
    });

    return { url: accountLink.url, accountId };
  }

  async getAccountStatus(accountId: string): Promise<GatewayAccountStatus> {
    const stripe = await getStripeInstance();
    if (!stripe || !accountId) {
      return {
        connected: false,
        accountId: null,
        chargesEnabled: false,
        detailsSubmitted: false,
      };
    }

    try {
      const account = await stripe.accounts.retrieve(accountId);
      return {
        connected: account.charges_enabled && account.details_submitted,
        accountId: account.id,
        chargesEnabled: account.charges_enabled,
        detailsSubmitted: account.details_submitted,
      };
    } catch {
      return {
        connected: false,
        accountId,
        chargesEnabled: false,
        detailsSubmitted: false,
      };
    }
  }

  async disconnect(companyId: string): Promise<void> {
    const admin = createAdminClient();

    await admin
      .from("payment_gateway_config")
      .update({
        is_active: false,
        account_id: null,
        onboarded_at: null,
        config: {},
        updated_at: new Date().toISOString(),
      })
      .eq("company_id", companyId)
      .eq("provider", "stripe");
  }

  async createCheckoutSession(
    params: CheckoutParams
  ): Promise<{ url: string } | null> {
    const stripe = await getStripeInstance();
    if (!stripe) return null;

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
        // application_fee_amount: Math.round(params.amount * 0.01 * 100), // 1% platform fee (enable later)
        transfer_data: {
          destination: params.destinationAccountId,
        },
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
}
