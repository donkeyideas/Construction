// ---------------------------------------------------------------------------
// Square — PaymentGateway implementation using company's OWN API keys
// ---------------------------------------------------------------------------

import { SquareClient, SquareEnvironment } from "square";
import crypto from "crypto";
import type {
  PaymentGateway,
  GatewayAccountStatus,
  GatewayCredentials,
  CheckoutParams,
} from "../gateway";

function createSquareClient(accessToken: string, sandbox = false): SquareClient {
  return new SquareClient({
    token: accessToken,
    environment: sandbox ? SquareEnvironment.Sandbox : SquareEnvironment.Production,
  });
}

export class SquareGateway implements PaymentGateway {
  provider = "square" as const;

  async validateCredentials(
    credentials: GatewayCredentials
  ): Promise<{ valid: boolean; accountName?: string; error?: string }> {
    if (!credentials.secret_key) {
      return { valid: false, error: "Access Token is required" };
    }

    try {
      const sandbox = credentials.sandbox === true || credentials.sandbox === "true";
      const client = createSquareClient(credentials.secret_key, sandbox);
      const response = await client.locations.list();
      const locations = response.locations || [];
      const mainLocation = locations[0];
      const accountName = mainLocation?.name || "Square Account";

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
      const client = createSquareClient(credentials.secret_key, sandbox);
      const response = await client.locations.list();
      const locations = response.locations || [];
      const mainLocation = locations[0];

      return {
        connected: true,
        accountName: mainLocation?.name || "Square Account",
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
      const client = createSquareClient(credentials.secret_key, sandbox);

      // Get the first location for the payment link
      const locResponse = await client.locations.list();
      const locationId = locResponse.locations?.[0]?.id;
      if (!locationId) return null;

      // Create a Payment Link (Square's hosted checkout)
      const response = await client.checkout.paymentLinks.create({
        idempotencyKey: `rent-${params.leaseId}-${params.dueDate}-${Date.now()}`,
        order: {
          locationId,
          lineItems: [
            {
              name: params.description,
              quantity: "1",
              basePriceMoney: {
                amount: BigInt(Math.round(params.amount * 100)), // dollars → cents
                currency: "USD",
              },
              metadata: {
                company_id: params.companyId,
                lease_id: params.leaseId,
                tenant_user_id: params.tenantUserId,
                payment_type: "rent",
                due_date: params.dueDate,
                gateway_provider: "square",
              },
            },
          ],
        },
        checkoutOptions: {
          redirectUrl: params.successUrl,
        },
      });

      const url = response.paymentLink?.url;
      return url ? { url } : null;
    } catch (err) {
      console.error("Square checkout error:", err);
      return null;
    }
  }

  async verifyWebhook(
    credentials: GatewayCredentials,
    body: string,
    signature: string
  ): Promise<unknown | null> {
    const sigKey = credentials.webhook_secret;
    if (!sigKey || !signature) return null;

    try {
      // Square webhook signature is HMAC-SHA256
      const hmac = crypto.createHmac("sha256", sigKey);
      hmac.update(body);
      const expectedSig = hmac.digest("base64");

      if (signature !== expectedSig) return null;

      return JSON.parse(body);
    } catch {
      return null;
    }
  }
}
