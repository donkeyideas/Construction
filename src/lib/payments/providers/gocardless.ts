// ---------------------------------------------------------------------------
// GoCardless — PaymentGateway implementation using company's OWN API keys
// ---------------------------------------------------------------------------

import { GoCardlessClient } from "gocardless-nodejs/client";
import { Environments } from "gocardless-nodejs/constants";
import crypto from "crypto";
import type {
  PaymentGateway,
  GatewayAccountStatus,
  GatewayCredentials,
  CheckoutParams,
} from "../gateway";

function createGCClient(accessToken: string, sandbox = false): GoCardlessClient {
  return new GoCardlessClient(
    accessToken,
    sandbox ? Environments.Sandbox : Environments.Live
  );
}

export class GoCardlessGateway implements PaymentGateway {
  provider = "gocardless" as const;

  async validateCredentials(
    credentials: GatewayCredentials
  ): Promise<{ valid: boolean; accountName?: string; error?: string }> {
    if (!credentials.secret_key) {
      return { valid: false, error: "Access Token is required" };
    }

    try {
      const sandbox = credentials.sandbox === true || credentials.sandbox === "true";
      const client = createGCClient(credentials.secret_key, sandbox);

      // List creditors to validate the token
      const creditors = await client.creditors.list({ limit: "1" });
      const creditor = creditors.creditors?.[0];
      const accountName = creditor?.name || "GoCardless Account";

      return { valid: true, accountName };
    } catch (err) {
      return {
        valid: false,
        error: err instanceof Error ? err.message : "Invalid access token. Please check and try again.",
      };
    }
  }

  async getAccountStatus(
    credentials: GatewayCredentials
  ): Promise<GatewayAccountStatus> {
    if (!credentials.secret_key) {
      return { connected: false, accountName: null, error: "No credentials configured" };
    }

    try {
      const sandbox = credentials.sandbox === true || credentials.sandbox === "true";
      const client = createGCClient(credentials.secret_key, sandbox);

      const creditors = await client.creditors.list({ limit: "1" });
      const creditor = creditors.creditors?.[0];

      return {
        connected: true,
        accountName: creditor?.name || "GoCardless Account",
      };
    } catch {
      return { connected: false, accountName: null, error: "Access token is no longer valid" };
    }
  }

  async createCheckoutSession(
    credentials: GatewayCredentials,
    params: CheckoutParams
  ): Promise<{ url: string } | null> {
    if (!credentials.secret_key) return null;

    try {
      const sandbox = credentials.sandbox === true || credentials.sandbox === "true";
      const client = createGCClient(credentials.secret_key, sandbox);

      // Step 1: Create a Billing Request for a one-off payment
      const billingRequest = await client.billingRequests.create({
        payment_request: {
          description: params.description,
          amount: String(Math.round(params.amount * 100)), // dollars → cents
          currency: "USD",
          metadata: {
            company_id: params.companyId,
            lease_id: params.leaseId,
            tenant_user_id: params.tenantUserId,
            payment_type: "rent",
            due_date: params.dueDate,
            gateway_provider: "gocardless",
          },
        },
        mandate_request: {
          scheme: "ach_debit",
        },
      });

      if (!billingRequest.id) return null;

      // Step 2: Create a Billing Request Flow (hosted checkout page)
      const flow = await client.billingRequestFlows.create({
        redirect_uri: params.successUrl,
        exit_uri: params.cancelUrl,
        links: {
          billing_request: billingRequest.id,
        },
      });

      return flow.authorisation_url ? { url: flow.authorisation_url } : null;
    } catch (err) {
      console.error("GoCardless checkout error:", err);
      return null;
    }
  }

  async verifyWebhook(
    credentials: GatewayCredentials,
    body: string,
    signature: string
  ): Promise<unknown | null> {
    const webhookSecret = credentials.webhook_secret;
    if (!webhookSecret || !signature) return null;

    try {
      // GoCardless uses HMAC-SHA256 for webhook signatures
      const hmac = crypto.createHmac("sha256", webhookSecret);
      hmac.update(body);
      const expectedSig = hmac.digest("hex");

      if (signature !== expectedSig) return null;

      return JSON.parse(body);
    } catch {
      return null;
    }
  }
}
