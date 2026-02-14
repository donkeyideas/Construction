/**
 * QuickBooks Sync Engine
 *
 * Handles syncing data between Buildwrk and QuickBooks Online.
 * Uses the QB REST API v3.
 */

const QB_API_BASE = "https://quickbooks.api.intuit.com/v3/company";
const QB_SANDBOX_BASE = "https://sandbox-quickbooks.api.intuit.com/v3/company";

function getApiBase(): string {
  return process.env.QUICKBOOKS_SANDBOX === "true" ? QB_SANDBOX_BASE : QB_API_BASE;
}

interface QBApiOptions {
  accessToken: string;
  realmId: string;
}

/**
 * Make an authenticated request to QuickBooks API
 */
async function qbFetch(
  endpoint: string,
  options: QBApiOptions,
  init?: RequestInit
): Promise<Response> {
  const url = `${getApiBase()}/${options.realmId}/${endpoint}`;
  return fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${options.accessToken}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
}

/**
 * Sync Chart of Accounts from Buildwrk to QuickBooks
 */
export async function syncChartOfAccounts(
  accounts: { name: string; account_type: string; account_number?: string }[],
  options: QBApiOptions
): Promise<{ synced: number; errors: string[] }> {
  const errors: string[] = [];
  let synced = 0;

  for (const account of accounts) {
    try {
      const qbAccountType = mapAccountType(account.account_type);
      const res = await qbFetch("account", options, {
        method: "POST",
        body: JSON.stringify({
          Name: account.name,
          AccountType: qbAccountType,
          AcctNum: account.account_number || undefined,
        }),
      });

      if (res.ok) {
        synced++;
      } else {
        const err = await res.json().catch(() => ({}));
        const msg = err?.Fault?.Error?.[0]?.Detail || "Unknown error";
        // Skip duplicates
        if (!msg.includes("duplicate")) {
          errors.push(`${account.name}: ${msg}`);
        } else {
          synced++; // Already exists
        }
      }
    } catch (e) {
      errors.push(`${account.name}: ${e instanceof Error ? e.message : "Network error"}`);
    }
  }

  return { synced, errors };
}

/**
 * Sync invoices from Buildwrk to QuickBooks
 */
export async function syncInvoices(
  invoices: {
    invoice_number: string;
    customer_name: string;
    line_items: { description: string; amount: number; quantity: number }[];
    due_date?: string;
  }[],
  options: QBApiOptions
): Promise<{ synced: number; errors: string[] }> {
  const errors: string[] = [];
  let synced = 0;

  for (const inv of invoices) {
    try {
      // Find or create customer
      const customerRes = await qbFetch(
        `query?query=${encodeURIComponent(`SELECT * FROM Customer WHERE DisplayName = '${inv.customer_name.replace(/'/g, "\\'")}'`)}`,
        options
      );

      let customerId: string | null = null;
      if (customerRes.ok) {
        const data = await customerRes.json();
        customerId = data?.QueryResponse?.Customer?.[0]?.Id || null;
      }

      if (!customerId) {
        // Create customer
        const createRes = await qbFetch("customer", options, {
          method: "POST",
          body: JSON.stringify({ DisplayName: inv.customer_name }),
        });
        if (createRes.ok) {
          const created = await createRes.json();
          customerId = created?.Customer?.Id;
        }
      }

      if (!customerId) {
        errors.push(`${inv.invoice_number}: Could not find/create customer`);
        continue;
      }

      // Create invoice
      const qbInvoice = {
        CustomerRef: { value: customerId },
        DocNumber: inv.invoice_number,
        DueDate: inv.due_date || undefined,
        Line: inv.line_items.map((item) => ({
          DetailType: "SalesItemLineDetail",
          Amount: item.amount * item.quantity,
          Description: item.description,
          SalesItemLineDetail: {
            Qty: item.quantity,
            UnitPrice: item.amount,
          },
        })),
      };

      const invRes = await qbFetch("invoice", options, {
        method: "POST",
        body: JSON.stringify(qbInvoice),
      });

      if (invRes.ok) {
        synced++;
      } else {
        const err = await invRes.json().catch(() => ({}));
        errors.push(`${inv.invoice_number}: ${err?.Fault?.Error?.[0]?.Detail || "Failed"}`);
      }
    } catch (e) {
      errors.push(`${inv.invoice_number}: ${e instanceof Error ? e.message : "Network error"}`);
    }
  }

  return { synced, errors };
}

/**
 * Sync contacts as customers/vendors in QuickBooks
 */
export async function syncContacts(
  contacts: { name: string; email?: string; phone?: string; type: "customer" | "vendor" }[],
  options: QBApiOptions
): Promise<{ synced: number; errors: string[] }> {
  const errors: string[] = [];
  let synced = 0;

  for (const contact of contacts) {
    try {
      const endpoint = contact.type === "vendor" ? "vendor" : "customer";
      const payload: Record<string, unknown> = {
        DisplayName: contact.name,
      };
      if (contact.email) {
        payload.PrimaryEmailAddr = { Address: contact.email };
      }
      if (contact.phone) {
        payload.PrimaryPhone = { FreeFormNumber: contact.phone };
      }

      const res = await qbFetch(endpoint, options, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        synced++;
      } else {
        const err = await res.json().catch(() => ({}));
        const msg = err?.Fault?.Error?.[0]?.Detail || "Failed";
        if (!msg.includes("duplicate")) {
          errors.push(`${contact.name}: ${msg}`);
        } else {
          synced++;
        }
      }
    } catch (e) {
      errors.push(`${contact.name}: ${e instanceof Error ? e.message : "Network error"}`);
    }
  }

  return { synced, errors };
}

/**
 * Map Buildwrk account types to QuickBooks account types
 */
function mapAccountType(type: string): string {
  const mapping: Record<string, string> = {
    asset: "Other Current Asset",
    current_asset: "Other Current Asset",
    fixed_asset: "Fixed Asset",
    liability: "Other Current Liability",
    current_liability: "Other Current Liability",
    long_term_liability: "Long Term Liability",
    equity: "Equity",
    revenue: "Income",
    income: "Income",
    expense: "Expense",
    cost_of_goods_sold: "Cost of Goods Sold",
    cogs: "Cost of Goods Sold",
    other_income: "Other Income",
    other_expense: "Other Expense",
  };

  return mapping[type.toLowerCase()] || "Expense";
}
