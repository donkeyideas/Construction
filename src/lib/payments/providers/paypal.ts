// ---------------------------------------------------------------------------
// PayPal — PaymentGateway implementation using company's OWN API keys
// Uses PayPal REST API v2 directly (no SDK dependency needed)
// ---------------------------------------------------------------------------

import type {
  PaymentGateway,
  GatewayAccountStatus,
  GatewayCredentials,
  CheckoutParams,
} from "../gateway";

const PAYPAL_API_LIVE = "https://api-m.paypal.com";
const PAYPAL_API_SANDBOX = "https://api-m.sandbox.paypal.com";

/**
 * Get PayPal API base URL. Uses live unless the client_id starts with "sb-" or
 * the secret_key starts with a sandbox indicator.
 */
function getBaseUrl(credentials: GatewayCredentials): string {
  const clientId = (credentials.client_id as string) || "";
  // Sandbox client IDs typically start with certain patterns
  if (clientId.startsWith("sb-") || clientId.startsWith("AV") === false) {
    // Default to sandbox for safety if unclear; live keys start with "A"
  }
  const useSandbox = credentials.sandbox === true || credentials.sandbox === "true";
  return useSandbox ? PAYPAL_API_SANDBOX : PAYPAL_API_LIVE;
}

/**
 * Get an OAuth2 access token from PayPal using Client ID + Secret.
 */
async function getAccessToken(
  credentials: GatewayCredentials
): Promise<string | null> {
  const clientId = credentials.client_id as string;
  const secret = credentials.secret_key;
  if (!clientId || !secret) return null;

  const baseUrl = getBaseUrl(credentials);
  const auth = Buffer.from(`${clientId}:${secret}`).toString("base64");

  const res = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) return null;

  const data = await res.json();
  return data.access_token || null;
}

export class PayPalGateway implements PaymentGateway {
  provider = "paypal" as const;

  async validateCredentials(
    credentials: GatewayCredentials
  ): Promise<{ valid: boolean; accountName?: string; error?: string }> {
    const clientId = credentials.client_id as string;
    if (!clientId) {
      return { valid: false, error: "Client ID is required" };
    }
    if (!credentials.secret_key) {
      return { valid: false, error: "Secret is required" };
    }

    try {
      const token = await getAccessToken(credentials);
      if (!token) {
        return { valid: false, error: "Invalid Client ID or Secret. Please check and try again." };
      }

      // Fetch merchant info to get account name
      const baseUrl = getBaseUrl(credentials);
      const userRes = await fetch(`${baseUrl}/v1/identity/oauth2/userinfo?schema=paypalv1.1`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      let accountName = "PayPal Account";
      if (userRes.ok) {
        const userInfo = await userRes.json();
        accountName = userInfo.name
          ? `${userInfo.name.given_name || ""} ${userInfo.name.surname || ""}`.trim()
          : userInfo.emails?.[0]?.value || "PayPal Account";
      }

      return { valid: true, accountName };
    } catch (err) {
      return {
        valid: false,
        error: err instanceof Error ? err.message : "Failed to validate credentials",
      };
    }
  }

  async getAccountStatus(
    credentials: GatewayCredentials
  ): Promise<GatewayAccountStatus> {
    if (!credentials.client_id || !credentials.secret_key) {
      return { connected: false, accountName: null, error: "No credentials configured" };
    }

    try {
      const token = await getAccessToken(credentials);
      if (!token) {
        return { connected: false, accountName: null, error: "API credentials are no longer valid" };
      }
      return { connected: true, accountName: "PayPal" };
    } catch {
      return { connected: false, accountName: null, error: "API credentials are no longer valid" };
    }
  }

  async createCheckoutSession(
    credentials: GatewayCredentials,
    params: CheckoutParams
  ): Promise<{ url: string } | null> {
    const token = await getAccessToken(credentials);
    if (!token) return null;

    const baseUrl = getBaseUrl(credentials);

    // Create a PayPal Order
    const orderRes = await fetch(`${baseUrl}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "PayPal-Request-Id": `rent-${params.leaseId}-${params.dueDate}`, // Idempotency
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            reference_id: params.leaseId,
            description: params.description,
            custom_id: JSON.stringify({
              company_id: params.companyId,
              lease_id: params.leaseId,
              tenant_user_id: params.tenantUserId,
              payment_type: "rent",
              due_date: params.dueDate,
              gateway_provider: "paypal",
            }),
            amount: {
              currency_code: "USD",
              value: params.amount.toFixed(2),
            },
          },
        ],
        payment_source: {
          paypal: {
            experience_context: {
              payment_method_preference: "IMMEDIATE_PAYMENT_REQUIRED",
              return_url: params.successUrl,
              cancel_url: params.cancelUrl,
              user_action: "PAY_NOW",
              brand_name: "Rent Payment",
            },
          },
        },
      }),
    });

    if (!orderRes.ok) return null;

    const order = await orderRes.json();

    // Find the approval URL
    const approveLink = order.links?.find(
      (link: { rel: string; href: string }) => link.rel === "payer-action"
    );

    return approveLink ? { url: approveLink.href } : null;
  }

  async verifyWebhook(
    credentials: GatewayCredentials,
    body: string,
    _signature: string,
    headers?: Record<string, string>
  ): Promise<unknown | null> {
    const webhookId = credentials.webhook_id as string;
    if (!webhookId) return null;

    const token = await getAccessToken(credentials);
    if (!token) return null;

    const baseUrl = getBaseUrl(credentials);

    // PayPal webhook verification
    const verifyRes = await fetch(`${baseUrl}/v1/notifications/verify-webhook-signature`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        auth_algo: headers?.["paypal-auth-algo"] || "",
        cert_url: headers?.["paypal-cert-url"] || "",
        transmission_id: headers?.["paypal-transmission-id"] || "",
        transmission_sig: headers?.["paypal-transmission-sig"] || "",
        transmission_time: headers?.["paypal-transmission-time"] || "",
        webhook_id: webhookId,
        webhook_event: JSON.parse(body),
      }),
    });

    if (!verifyRes.ok) return null;

    const result = await verifyRes.json();
    if (result.verification_status !== "SUCCESS") return null;

    return JSON.parse(body);
  }
}
