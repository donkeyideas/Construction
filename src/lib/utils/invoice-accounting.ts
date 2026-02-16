import { SupabaseClient } from "@supabase/supabase-js";
import { createPostedJournalEntry } from "@/lib/queries/financial";
import type { JournalEntryCreateData } from "@/lib/queries/financial";

// Standard account numbers matching the chart of accounts seed data
const ACCOUNT_NUMBERS = {
  CASH: "1000",
  ACCOUNTS_RECEIVABLE: "1010",
  ACCOUNTS_PAYABLE: "2000",
  CONTRACT_REVENUE: "4000",
  SUBCONTRACTOR_COSTS: "5010",
} as const;

export type AccountLookup = Record<string, string>;

/**
 * Build an account_number → account_id lookup for the company's chart of accounts.
 * Only fetches the specific accounts needed for invoice/payment journal entries.
 */
export async function buildAccountLookup(
  supabase: SupabaseClient,
  companyId: string
): Promise<AccountLookup> {
  const targetNumbers = Object.values(ACCOUNT_NUMBERS);
  const { data: accounts } = await supabase
    .from("chart_of_accounts")
    .select("id, account_number")
    .eq("company_id", companyId)
    .in("account_number", targetNumbers);

  return (accounts || []).reduce((acc: AccountLookup, a: { id: string; account_number: string }) => {
    acc[a.account_number] = a.id;
    return acc;
  }, {} as AccountLookup);
}

/**
 * Generate a posted journal entry for an invoice.
 *
 * Receivable: DR 1010 (AR) / CR 4000 (Revenue)
 * Payable:    DR 5010 (Expenses) / CR 2000 (AP)
 *
 * Returns null gracefully if accounts are missing or invoice is zero/voided.
 */
export async function generateInvoiceJournalEntry(
  supabase: SupabaseClient,
  companyId: string,
  userId: string,
  invoice: {
    id: string;
    invoice_number: string;
    invoice_type: "payable" | "receivable";
    total_amount: number;
    invoice_date: string;
    status?: string;
    project_id?: string | null;
    vendor_name?: string | null;
    client_name?: string | null;
  },
  accountLookup: AccountLookup
): Promise<{ journalEntryId: string } | null> {
  if (invoice.total_amount <= 0) return null;
  if (invoice.status === "voided" || invoice.status === "cancelled") return null;

  let debitAccountNumber: string;
  let creditAccountNumber: string;
  let description: string;

  if (invoice.invoice_type === "receivable") {
    debitAccountNumber = ACCOUNT_NUMBERS.ACCOUNTS_RECEIVABLE;
    creditAccountNumber = ACCOUNT_NUMBERS.CONTRACT_REVENUE;
    description = `Invoice ${invoice.invoice_number}` +
      (invoice.client_name ? ` - ${invoice.client_name}` : "");
  } else {
    debitAccountNumber = ACCOUNT_NUMBERS.SUBCONTRACTOR_COSTS;
    creditAccountNumber = ACCOUNT_NUMBERS.ACCOUNTS_PAYABLE;
    description = `Bill ${invoice.invoice_number}` +
      (invoice.vendor_name ? ` - ${invoice.vendor_name}` : "");
  }

  const debitAccountId = accountLookup[debitAccountNumber];
  const creditAccountId = accountLookup[creditAccountNumber];

  if (!debitAccountId || !creditAccountId) {
    return null;
  }

  const entryData: JournalEntryCreateData = {
    entry_number: `JE-INV-${invoice.invoice_number}`,
    entry_date: invoice.invoice_date,
    description,
    reference: `invoice:${invoice.id}`,
    project_id: invoice.project_id ?? undefined,
    lines: [
      {
        account_id: debitAccountId,
        debit: invoice.total_amount,
        credit: 0,
        description,
        project_id: invoice.project_id ?? undefined,
      },
      {
        account_id: creditAccountId,
        debit: 0,
        credit: invoice.total_amount,
        description,
        project_id: invoice.project_id ?? undefined,
      },
    ],
  };

  const result = await createPostedJournalEntry(supabase, companyId, userId, entryData);
  return result ? { journalEntryId: result.id } : null;
}

/**
 * Generate a posted journal entry for a payment on an invoice.
 *
 * Payment on receivable: DR 1000 (Cash) / CR 1010 (AR)
 * Payment on payable:    DR 2000 (AP) / CR 1000 (Cash)
 */
export async function generatePaymentJournalEntry(
  supabase: SupabaseClient,
  companyId: string,
  userId: string,
  payment: {
    id: string;
    amount: number;
    payment_date: string;
    method: string;
  },
  invoice: {
    id: string;
    invoice_number: string;
    invoice_type: "payable" | "receivable";
    project_id?: string | null;
    vendor_name?: string | null;
    client_name?: string | null;
  },
  accountLookup: AccountLookup
): Promise<{ journalEntryId: string } | null> {
  if (payment.amount <= 0) return null;

  let debitAccountNumber: string;
  let creditAccountNumber: string;
  let description: string;

  if (invoice.invoice_type === "receivable") {
    debitAccountNumber = ACCOUNT_NUMBERS.CASH;
    creditAccountNumber = ACCOUNT_NUMBERS.ACCOUNTS_RECEIVABLE;
    description = `Payment on ${invoice.invoice_number}` +
      (invoice.client_name ? ` from ${invoice.client_name}` : "") +
      ` (${payment.method})`;
  } else {
    debitAccountNumber = ACCOUNT_NUMBERS.ACCOUNTS_PAYABLE;
    creditAccountNumber = ACCOUNT_NUMBERS.CASH;
    description = `Payment on ${invoice.invoice_number}` +
      (invoice.vendor_name ? ` to ${invoice.vendor_name}` : "") +
      ` (${payment.method})`;
  }

  const debitAccountId = accountLookup[debitAccountNumber];
  const creditAccountId = accountLookup[creditAccountNumber];

  if (!debitAccountId || !creditAccountId) {
    return null;
  }

  const shortPaymentId = payment.id.substring(0, 8);
  const entryData: JournalEntryCreateData = {
    entry_number: `JE-PMT-${shortPaymentId}`,
    entry_date: payment.payment_date,
    description,
    reference: `payment:${payment.id}`,
    project_id: invoice.project_id ?? undefined,
    lines: [
      {
        account_id: debitAccountId,
        debit: payment.amount,
        credit: 0,
        description,
        project_id: invoice.project_id ?? undefined,
      },
      {
        account_id: creditAccountId,
        debit: 0,
        credit: payment.amount,
        description,
        project_id: invoice.project_id ?? undefined,
      },
    ],
  };

  const result = await createPostedJournalEntry(supabase, companyId, userId, entryData);
  return result ? { journalEntryId: result.id } : null;
}

/**
 * Batch-generate journal entries for multiple invoices (used by import route).
 * Builds the account lookup once, then processes all invoices.
 */
export async function generateBulkInvoiceJournalEntries(
  supabase: SupabaseClient,
  companyId: string,
  userId: string,
  invoices: Array<{
    id: string;
    invoice_number: string;
    invoice_type: "payable" | "receivable";
    total_amount: number;
    invoice_date: string;
    status?: string;
    project_id?: string | null;
    vendor_name?: string | null;
    client_name?: string | null;
  }>
): Promise<{ successCount: number; errors: string[] }> {
  const accountLookup = await buildAccountLookup(supabase, companyId);
  let successCount = 0;
  const errors: string[] = [];

  const hasAccounts =
    accountLookup[ACCOUNT_NUMBERS.ACCOUNTS_RECEIVABLE] ||
    accountLookup[ACCOUNT_NUMBERS.ACCOUNTS_PAYABLE];

  if (!hasAccounts) {
    return { successCount: 0, errors: ["Chart of accounts not configured"] };
  }

  for (const invoice of invoices) {
    const result = await generateInvoiceJournalEntry(
      supabase, companyId, userId, invoice, accountLookup
    );
    if (result) {
      successCount++;
    } else if (invoice.total_amount > 0) {
      errors.push(`JE skipped for ${invoice.invoice_number}`);
    }
  }

  return { successCount, errors };
}
