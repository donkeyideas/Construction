import { SupabaseClient } from "@supabase/supabase-js";
import { createPostedJournalEntry } from "@/lib/queries/financial";
import type { JournalEntryCreateData } from "@/lib/queries/financial";

/**
 * Dynamic account lookup — finds standard accounts by type/sub_type/name
 * instead of relying on hardcoded account numbers that differ between companies.
 */
export interface CompanyAccountMap {
  cashId: string | null;
  arId: string | null;
  apId: string | null;
  salesTaxPayableId: string | null;
  salesTaxReceivableId: string | null;
  retainageReceivableId: string | null;
  retainagePayableId: string | null;
  // Lookup by account number for GL account resolution
  byNumber: Record<string, string>;
}

/**
 * Build a comprehensive account map for a company by querying the chart of accounts.
 * Uses account_type + sub_type + name patterns to find the right accounts dynamically,
 * regardless of what numbering scheme the company uses.
 */
export async function buildCompanyAccountMap(
  supabase: SupabaseClient,
  companyId: string
): Promise<CompanyAccountMap> {
  const { data: accounts } = await supabase
    .from("chart_of_accounts")
    .select("id, account_number, name, account_type, sub_type, normal_balance")
    .eq("company_id", companyId)
    .eq("is_active", true);

  const map: CompanyAccountMap = {
    cashId: null,
    arId: null,
    apId: null,
    salesTaxPayableId: null,
    salesTaxReceivableId: null,
    retainageReceivableId: null,
    retainagePayableId: null,
    byNumber: {},
  };

  if (!accounts || accounts.length === 0) return map;

  // Build number → id lookup
  for (const a of accounts) {
    map.byNumber[a.account_number] = a.id;
  }

  // Find standard accounts by matching patterns (order matters — first match wins)
  for (const a of accounts) {
    const nameLower = a.name.toLowerCase();

    // Cash: first asset with "cash" or "checking" in name (prefer parent accounts)
    if (!map.cashId && a.account_type === "asset" && (
      nameLower.includes("cash") || nameLower.includes("checking")
    )) {
      map.cashId = a.id;
    }

    // AR: asset with "receivable" in name (but NOT "retainage receivable" or "tax receivable")
    if (!map.arId && a.account_type === "asset" &&
      nameLower.includes("receivable") &&
      !nameLower.includes("retainage") &&
      !nameLower.includes("tax")
    ) {
      map.arId = a.id;
    }

    // AP: liability with "payable" in name (but NOT "retainage payable" or "tax payable")
    if (!map.apId && a.account_type === "liability" &&
      nameLower.includes("payable") &&
      !nameLower.includes("retainage") &&
      !nameLower.includes("tax")
    ) {
      map.apId = a.id;
    }

    // Sales Tax Payable
    if (!map.salesTaxPayableId && a.account_type === "liability" &&
      nameLower.includes("tax") && nameLower.includes("payable")
    ) {
      map.salesTaxPayableId = a.id;
    }

    // Sales Tax Receivable
    if (!map.salesTaxReceivableId && a.account_type === "asset" &&
      nameLower.includes("tax") && nameLower.includes("receivable")
    ) {
      map.salesTaxReceivableId = a.id;
    }

    // Retainage Receivable
    if (!map.retainageReceivableId && a.account_type === "asset" &&
      nameLower.includes("retainage") && nameLower.includes("receivable")
    ) {
      map.retainageReceivableId = a.id;
    }

    // Retainage Payable
    if (!map.retainagePayableId && a.account_type === "liability" &&
      nameLower.includes("retainage") && nameLower.includes("payable")
    ) {
      map.retainagePayableId = a.id;
    }
  }

  return map;
}

// Legacy compatibility — kept for existing callers during transition
export type AccountLookup = Record<string, string>;
export async function buildAccountLookup(
  supabase: SupabaseClient,
  companyId: string
): Promise<AccountLookup> {
  const map = await buildCompanyAccountMap(supabase, companyId);
  return map.byNumber;
}

/**
 * Generate a posted journal entry for an invoice.
 *
 * Receivable: DR AR / CR Revenue (gl_account_id or default revenue account)
 * Payable:    DR Expense (gl_account_id) / CR AP
 *
 * Handles:
 * - Dynamic account resolution (no hardcoded account numbers)
 * - Tax splitting (separate line for sales tax if tax_amount > 0)
 * - Retainage (separate line for retainage if retainage_held > 0)
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
    subtotal?: number;
    tax_amount?: number;
    invoice_date: string;
    status?: string;
    project_id?: string | null;
    property_id?: string | null;
    vendor_name?: string | null;
    client_name?: string | null;
    gl_account_id?: string | null;
    retainage_pct?: number;
    retainage_held?: number;
  },
  accountMap: CompanyAccountMap
): Promise<{ journalEntryId: string } | null> {
  if (invoice.total_amount <= 0) return null;
  if (invoice.status === "voided" || invoice.status === "cancelled") return null;

  const lines: JournalEntryCreateData["lines"] = [];
  let description: string;

  const taxAmount = invoice.tax_amount ?? 0;
  const subtotal = invoice.subtotal ?? (invoice.total_amount - taxAmount);
  const retainageHeld = invoice.retainage_held ?? 0;

  if (invoice.invoice_type === "receivable") {
    // === RECEIVABLE (Customer Invoice) ===
    // DR Accounts Receivable (total_amount - retainage)
    // DR Retainage Receivable (retainage_held) — if applicable
    // CR Revenue Account (subtotal) — uses gl_account_id if set
    // CR Sales Tax Payable (tax_amount) — if applicable

    description = `Invoice ${invoice.invoice_number}` +
      (invoice.client_name ? ` - ${invoice.client_name}` : "");

    if (!accountMap.arId) return null;
    const revenueAccountId = invoice.gl_account_id || findDefaultRevenueAccount(accountMap);
    if (!revenueAccountId) return null;

    // DR: Accounts Receivable (net of retainage)
    const arAmount = invoice.total_amount - retainageHeld;
    if (arAmount > 0) {
      lines.push({
        account_id: accountMap.arId,
        debit: arAmount,
        credit: 0,
        description,
        project_id: invoice.project_id ?? undefined,
      });
    }

    // DR: Retainage Receivable (if retainage held)
    if (retainageHeld > 0 && accountMap.retainageReceivableId) {
      lines.push({
        account_id: accountMap.retainageReceivableId,
        debit: retainageHeld,
        credit: 0,
        description: `Retainage on ${invoice.invoice_number}`,
        project_id: invoice.project_id ?? undefined,
      });
    }

    // CR: Revenue (subtotal, excluding tax)
    lines.push({
      account_id: revenueAccountId,
      debit: 0,
      credit: subtotal,
      description,
      project_id: invoice.project_id ?? undefined,
    });

    // CR: Sales Tax Payable (if tax > 0)
    if (taxAmount > 0 && accountMap.salesTaxPayableId) {
      lines.push({
        account_id: accountMap.salesTaxPayableId,
        debit: 0,
        credit: taxAmount,
        description: `Sales tax on ${invoice.invoice_number}`,
        project_id: invoice.project_id ?? undefined,
      });
    } else if (taxAmount > 0) {
      // No tax payable account — include tax in revenue (less accurate but keeps books balanced)
      lines[lines.length - 1].credit += taxAmount;
    }

  } else {
    // === PAYABLE (Vendor Bill) ===
    // DR Expense Account (subtotal) — uses gl_account_id for proper classification
    // DR Sales Tax Receivable (tax_amount) — if applicable & recoverable
    // CR Accounts Payable (total_amount)
    // CR Retainage Payable (retainage_held) — if applicable, reduces AP

    description = `Bill ${invoice.invoice_number}` +
      (invoice.vendor_name ? ` - ${invoice.vendor_name}` : "");

    if (!accountMap.apId) return null;
    const expenseAccountId = invoice.gl_account_id || findDefaultExpenseAccount(accountMap);
    if (!expenseAccountId) return null;

    // DR: Expense (subtotal)
    lines.push({
      account_id: expenseAccountId,
      debit: subtotal,
      credit: 0,
      description,
      project_id: invoice.project_id ?? undefined,
    });

    // DR: Sales Tax Receivable (if tax > 0 and account exists)
    if (taxAmount > 0 && accountMap.salesTaxReceivableId) {
      lines.push({
        account_id: accountMap.salesTaxReceivableId,
        debit: taxAmount,
        credit: 0,
        description: `Input tax on ${invoice.invoice_number}`,
        project_id: invoice.project_id ?? undefined,
      });
    } else if (taxAmount > 0) {
      // No tax receivable account — expense the tax (common for construction)
      lines[0].debit += taxAmount;
    }

    // CR: Accounts Payable (total amount less retainage held)
    const apAmount = invoice.total_amount - retainageHeld;
    if (apAmount > 0) {
      lines.push({
        account_id: accountMap.apId,
        debit: 0,
        credit: apAmount,
        description,
        project_id: invoice.project_id ?? undefined,
      });
    }

    // CR: Retainage Payable (if retainage held)
    if (retainageHeld > 0 && accountMap.retainagePayableId) {
      lines.push({
        account_id: accountMap.retainagePayableId,
        debit: 0,
        credit: retainageHeld,
        description: `Retainage on ${invoice.invoice_number}`,
        project_id: invoice.project_id ?? undefined,
      });
    }
  }

  if (lines.length < 2) return null;

  const entryData: JournalEntryCreateData = {
    entry_number: `JE-INV-${invoice.invoice_number}`,
    entry_date: invoice.invoice_date,
    description,
    reference: `invoice:${invoice.id}`,
    project_id: invoice.project_id ?? undefined,
    lines,
  };

  const result = await createPostedJournalEntry(supabase, companyId, userId, entryData);
  return result ? { journalEntryId: result.id } : null;
}

/**
 * Generate a posted journal entry for a payment on an invoice.
 *
 * Payment on receivable: DR Cash / CR AR
 * Payment on payable:    DR AP / CR Cash
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
  accountMap: CompanyAccountMap
): Promise<{ journalEntryId: string } | null> {
  if (payment.amount <= 0) return null;

  if (!accountMap.cashId) return null;

  let debitAccountId: string;
  let creditAccountId: string;
  let description: string;

  if (invoice.invoice_type === "receivable") {
    if (!accountMap.arId) return null;
    debitAccountId = accountMap.cashId;
    creditAccountId = accountMap.arId;
    description = `Payment on ${invoice.invoice_number}` +
      (invoice.client_name ? ` from ${invoice.client_name}` : "") +
      ` (${payment.method})`;
  } else {
    if (!accountMap.apId) return null;
    debitAccountId = accountMap.apId;
    creditAccountId = accountMap.cashId;
    description = `Payment on ${invoice.invoice_number}` +
      (invoice.vendor_name ? ` to ${invoice.vendor_name}` : "") +
      ` (${payment.method})`;
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
 * Generate a journal entry for a change order approval.
 *
 * Owner-initiated: DR AR / CR Change Order Revenue
 * Cost change:     DR Expense / CR AP
 */
export async function generateChangeOrderJournalEntry(
  supabase: SupabaseClient,
  companyId: string,
  userId: string,
  changeOrder: {
    id: string;
    co_number: string;
    amount: number;
    reason: string;
    project_id: string;
    title?: string;
  },
  accountMap: CompanyAccountMap
): Promise<{ journalEntryId: string } | null> {
  if (changeOrder.amount === 0) return null;

  const isOwnerCO = changeOrder.reason === "owner_request" || changeOrder.reason === "value_engineering";
  const description = `Change Order ${changeOrder.co_number}` +
    (changeOrder.title ? ` - ${changeOrder.title}` : "");

  let debitAccountId: string | null;
  let creditAccountId: string | null;

  if (isOwnerCO && changeOrder.amount > 0) {
    // Owner adds scope/money → DR AR / CR Change Order Revenue
    debitAccountId = accountMap.arId;
    // Look for "Change Order Revenue" (4010) or fall back to any revenue account
    creditAccountId = findAccountByPattern(accountMap, "change order") || findDefaultRevenueAccount(accountMap);
  } else {
    // Cost increase → DR Expense / CR AP
    debitAccountId = findDefaultExpenseAccount(accountMap);
    creditAccountId = accountMap.apId;
  }

  if (!debitAccountId || !creditAccountId) return null;

  const amount = Math.abs(changeOrder.amount);
  const entryData: JournalEntryCreateData = {
    entry_number: `JE-CO-${changeOrder.co_number}`,
    entry_date: new Date().toISOString().split("T")[0],
    description,
    reference: `change_order:${changeOrder.id}`,
    project_id: changeOrder.project_id,
    lines: [
      { account_id: debitAccountId, debit: amount, credit: 0, description, project_id: changeOrder.project_id },
      { account_id: creditAccountId, debit: 0, credit: amount, description, project_id: changeOrder.project_id },
    ],
  };

  const result = await createPostedJournalEntry(supabase, companyId, userId, entryData);
  return result ? { journalEntryId: result.id } : null;
}

/**
 * Generate a journal entry for a security deposit collection.
 * DR Cash / CR Security Deposits Held
 */
export async function generateSecurityDepositJournalEntry(
  supabase: SupabaseClient,
  companyId: string,
  userId: string,
  deposit: {
    leaseId: string;
    amount: number;
    tenantName: string;
    date: string;
    projectId?: string;
  },
  accountMap: CompanyAccountMap
): Promise<{ journalEntryId: string } | null> {
  if (deposit.amount <= 0) return null;
  if (!accountMap.cashId) return null;

  // Find security deposit liability account
  const depositAccountId = findAccountByPattern(accountMap, "security deposit") ||
    findAccountByPattern(accountMap, "deposit");
  if (!depositAccountId) return null;

  const description = `Security deposit - ${deposit.tenantName}`;
  const shortLeaseId = deposit.leaseId.substring(0, 8);

  const entryData: JournalEntryCreateData = {
    entry_number: `JE-DEP-${shortLeaseId}`,
    entry_date: deposit.date,
    description,
    reference: `lease:${deposit.leaseId}`,
    project_id: deposit.projectId,
    lines: [
      { account_id: accountMap.cashId, debit: deposit.amount, credit: 0, description, project_id: deposit.projectId },
      { account_id: depositAccountId, debit: 0, credit: deposit.amount, description, project_id: deposit.projectId },
    ],
  };

  const result = await createPostedJournalEntry(supabase, companyId, userId, entryData);
  return result ? { journalEntryId: result.id } : null;
}

/**
 * Generate a journal entry for loan activity.
 * Loan draw: DR Cash / CR Loan Liability
 * Loan repayment: DR Loan Liability / CR Cash
 * Interest accrual: DR Interest Expense / CR Accrued Interest
 */
export async function generateLoanJournalEntry(
  supabase: SupabaseClient,
  companyId: string,
  userId: string,
  loan: {
    id: string;
    type: "draw" | "repayment" | "interest";
    amount: number;
    date: string;
    loanAccountId: string; // The specific loan liability account
    description?: string;
    projectId?: string;
  },
  accountMap: CompanyAccountMap
): Promise<{ journalEntryId: string } | null> {
  if (loan.amount <= 0) return null;
  if (!accountMap.cashId) return null;

  let debitAccountId: string;
  let creditAccountId: string;
  let description: string;

  switch (loan.type) {
    case "draw":
      debitAccountId = accountMap.cashId;
      creditAccountId = loan.loanAccountId;
      description = loan.description || `Loan draw`;
      break;
    case "repayment":
      debitAccountId = loan.loanAccountId;
      creditAccountId = accountMap.cashId;
      description = loan.description || `Loan repayment`;
      break;
    case "interest": {
      // DR Interest Expense / CR Accrued Interest (or Cash if paid immediately)
      const interestExpenseId = findAccountByPattern(accountMap, "interest expense");
      const accruedInterestId = findAccountByPattern(accountMap, "accrued interest") || accountMap.cashId;
      if (!interestExpenseId) return null;
      debitAccountId = interestExpenseId;
      creditAccountId = accruedInterestId!;
      description = loan.description || `Interest accrual`;
      break;
    }
    default:
      return null;
  }

  const shortId = loan.id.substring(0, 8);
  const entryData: JournalEntryCreateData = {
    entry_number: `JE-LOAN-${shortId}`,
    entry_date: loan.date,
    description,
    reference: `loan:${loan.id}`,
    project_id: loan.projectId,
    lines: [
      { account_id: debitAccountId, debit: loan.amount, credit: 0, description, project_id: loan.projectId },
      { account_id: creditAccountId, debit: 0, credit: loan.amount, description, project_id: loan.projectId },
    ],
  };

  const result = await createPostedJournalEntry(supabase, companyId, userId, entryData);
  return result ? { journalEntryId: result.id } : null;
}

/**
 * Batch-generate journal entries for multiple invoices (used by import route).
 * Builds the account map once, then processes all invoices.
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
    subtotal?: number;
    tax_amount?: number;
    invoice_date: string;
    status?: string;
    project_id?: string | null;
    property_id?: string | null;
    vendor_name?: string | null;
    client_name?: string | null;
    gl_account_id?: string | null;
    retainage_pct?: number;
    retainage_held?: number;
  }>
): Promise<{ successCount: number; errors: string[] }> {
  const accountMap = await buildCompanyAccountMap(supabase, companyId);
  let successCount = 0;
  const errors: string[] = [];

  if (!accountMap.arId && !accountMap.apId) {
    return { successCount: 0, errors: ["Chart of accounts not configured — no AR or AP account found"] };
  }

  for (const invoice of invoices) {
    const result = await generateInvoiceJournalEntry(
      supabase, companyId, userId, invoice, accountMap
    );
    if (result) {
      successCount++;
    } else if (invoice.total_amount > 0) {
      errors.push(`JE skipped for ${invoice.invoice_number}`);
    }
  }

  return { successCount, errors };
}

/**
 * Batch-generate payment journal entries (used by import route for paid invoices).
 */
export async function generateBulkPaymentJournalEntries(
  supabase: SupabaseClient,
  companyId: string,
  userId: string,
  payments: Array<{
    paymentId: string;
    amount: number;
    payment_date: string;
    method: string;
    invoice: {
      id: string;
      invoice_number: string;
      invoice_type: "payable" | "receivable";
      project_id?: string | null;
      vendor_name?: string | null;
      client_name?: string | null;
    };
  }>
): Promise<{ successCount: number; errors: string[] }> {
  const accountMap = await buildCompanyAccountMap(supabase, companyId);
  let successCount = 0;
  const errors: string[] = [];

  for (const p of payments) {
    const result = await generatePaymentJournalEntry(
      supabase, companyId, userId,
      { id: p.paymentId, amount: p.amount, payment_date: p.payment_date, method: p.method },
      p.invoice,
      accountMap
    );
    if (result) {
      successCount++;
    } else {
      errors.push(`Payment JE skipped for ${p.invoice.invoice_number}`);
    }
  }

  return { successCount, errors };
}

// ---------- Helpers ----------

/**
 * Auto-map an invoice description to a GL account number based on keywords.
 * Used during CSV import when no explicit gl_account column is provided.
 */
export function inferGLAccountFromDescription(
  description: string,
  invoiceType: "payable" | "receivable",
  vendorName?: string
): string | null {
  const text = `${description} ${vendorName || ""}`.toLowerCase();

  if (invoiceType === "receivable") {
    // Revenue classification
    if (text.includes("studio") && text.includes("lease")) return "4010";
    if (text.includes("rent")) return "4000";
    if (text.includes("equipment rental")) return "4030";
    if (text.includes("catering")) return "4040";
    if (text.includes("tour")) return "4050";
    if (text.includes("parking")) return "4020";
    return "4000"; // default revenue
  }

  // Payable / Expense classification
  // Development costs (6000 series in 8400 Edgewater chart)
  if (text.includes("a&e") || text.includes("architect") || text.includes("design")) return "6000";
  if (text.includes("structural") || text.includes("engineer")) return "6000";
  if (text.includes("mep")) return "6000";
  if (text.includes("loan") || text.includes("legal") || text.includes("closing") || text.includes("appraisal")) return "6010";
  if (text.includes("interest") && text.includes("construction")) return "6020";
  if (text.includes("permit") || text.includes("pre-construction") || text.includes("project management")) return "6030";
  if (text.includes("leasing commission")) return "6040";
  if (text.includes("developer fee")) return "6050";

  // Operating expenses (5000 series in 8400 Edgewater chart)
  if (text.includes("utilit")) return "5000";
  if (text.includes("turnover") || text.includes("make-ready")) return "5010";
  if (text.includes("repair") || text.includes("maintenance") || text.includes("r&m")) return "5020";
  if (text.includes("janitorial") || text.includes("landscap") || text.includes("pest") || text.includes("contract service")) return "5030";
  if (text.includes("marketing") || text.includes("advertising") || text.includes("rendering") || text.includes("brochure") || text.includes("website") || text.includes("collateral")) return "5040";
  if (text.includes("general & admin") || text.includes("g&a") || text.includes("office")) return "5050";
  if (text.includes("personnel") || text.includes("payroll") || text.includes("salary")) return "5060";
  if (text.includes("management fee")) return "5070";
  if (text.includes("insurance") || text.includes("builder's risk")) return "5080";
  if (text.includes("property tax") || text.includes("real estate tax")) return "5090";
  if (text.includes("replacement reserve")) return "5100";

  // Studio-specific operating expenses
  if (text.includes("studio") && text.includes("personnel")) return "5200";
  if (text.includes("studio") && text.includes("utilit")) return "5210";
  if (text.includes("studio") && text.includes("repair")) return "5220";
  if (text.includes("studio") && text.includes("insurance")) return "5230";
  if (text.includes("studio") && text.includes("tax")) return "5240";
  if (text.includes("security")) return "5250";
  if (text.includes("studio") && text.includes("g&a")) return "5260";

  // Construction costs
  if (text.includes("construction") || text.includes("mobilization") || text.includes("site prep")) return "5010";
  if (text.includes("geotechnical") || text.includes("testing") || text.includes("inspection") || text.includes("environmental")) return "6030";

  return null; // No match — caller should use a default
}

/** Find the first revenue account in the map (fallback for receivable invoices) */
function findDefaultRevenueAccount(map: CompanyAccountMap): string | null {
  // Look for common revenue account numbers
  for (const num of ["4000", "4010", "4100", "4200"]) {
    if (map.byNumber[num]) return map.byNumber[num];
  }
  return null;
}

/** Find the first expense account in the map (fallback for payable invoices) */
function findDefaultExpenseAccount(map: CompanyAccountMap): string | null {
  // Look for common expense account numbers
  for (const num of ["5000", "5010", "6000", "6100", "6200", "6900"]) {
    if (map.byNumber[num]) return map.byNumber[num];
  }
  return null;
}

/** Find an account by name pattern match, searching the byNumber map */
function findAccountByPattern(map: CompanyAccountMap, pattern: string): string | null {
  // This needs the full account list — we use a simple approach:
  // The byNumber map only has number→id. For name-based search, we'd need
  // to re-query. Instead, we search common account numbers for the pattern.
  // This covers the most common cases.
  const patternLower = pattern.toLowerCase();

  // Map known patterns to likely account numbers
  const patternToNumbers: Record<string, string[]> = {
    "change order": ["4010"],
    "security deposit": ["2020", "2400"],
    "deposit": ["2020", "2400", "2500"],
    "interest expense": ["6800", "7000", "7010"],
    "accrued interest": ["2120"],
    "construction loan": ["2100"],
    "permanent loan": ["2110"],
    "depreciation": ["6700", "8000"],
    "accumulated depreciation": ["1200", "1540"],
  };

  const candidates = patternToNumbers[patternLower] || [];
  for (const num of candidates) {
    if (map.byNumber[num]) return map.byNumber[num];
  }
  return null;
}
