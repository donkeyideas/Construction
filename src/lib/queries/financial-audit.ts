import { SupabaseClient } from "@supabase/supabase-js";

// Pagination helper — Supabase defaults to returning max 1000 rows.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function paginatedQuery<T = Record<string, unknown>>(
  queryFn: (from: number, to: number) => PromiseLike<{ data: any[] | null; error: unknown }>
): Promise<T[]> {
  const PAGE_SIZE = 1000;
  const all: T[] = [];
  let from = 0;
  for (;;) {
    const { data } = await queryFn(from, from + PAGE_SIZE - 1);
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return all;
}

export interface AuditCheckResult {
  id: string;
  name: string;
  status: "pass" | "warn" | "fail";
  summary: string;
  details: string[];
}

export interface AuditResult {
  grade: "A" | "B" | "C" | "D" | "F";
  gradeLabel: string;
  checks: AuditCheckResult[];
  runAt: string;
}

/**
 * Run all financial audit checks for a company.
 */
export async function runFinancialAudit(
  supabase: SupabaseClient,
  companyId: string
): Promise<AuditResult> {
  const checks = await Promise.all([
    checkTrialBalance(supabase, companyId),
    checkBalanceSheetBalance(supabase, companyId),
    checkInvoiceJECoverage(supabase, companyId),
    checkPaymentJECoverage(supabase, companyId),
    checkBankReconciliation(supabase, companyId),
    checkARReconciliation(supabase, companyId),
    checkAPReconciliation(supabase, companyId),
    checkUnpostedEntries(supabase, companyId),
    checkMissingGLMappings(supabase, companyId),
    checkOrphanedJELines(supabase, companyId),
    checkRevenueRecognition(supabase, companyId),
  ]);

  const failCount = checks.filter((c) => c.status === "fail").length;
  const warnCount = checks.filter((c) => c.status === "warn").length;

  let grade: AuditResult["grade"];
  let gradeLabel: string;
  if (failCount === 0 && warnCount <= 1) {
    grade = "A";
    gradeLabel = "Excellent";
  } else if (failCount === 0) {
    grade = "B";
    gradeLabel = "Good";
  } else if (failCount === 1) {
    grade = "C";
    gradeLabel = "Fair";
  } else if (failCount <= 3) {
    grade = "D";
    gradeLabel = "Needs Attention";
  } else {
    grade = "F";
    gradeLabel = "Critical Issues";
  }

  return { grade, gradeLabel, checks, runAt: new Date().toISOString() };
}

/* ------------------------------------------------------------------
   1. Trial Balance Check
   Verifies that total debits equal total credits across all posted
   journal entry lines.
   ------------------------------------------------------------------ */

async function checkTrialBalance(
  supabase: SupabaseClient,
  companyId: string
): Promise<AuditCheckResult> {
  const id = "trial-balance";
  const name = "Trial Balance";

  // Paginated inner join — avoids both URL-length and 1000-row limit issues
  const lines = await paginatedQuery<{ debit: number; credit: number; journal_entries: { id: string } }>((from, to) =>
    supabase
      .from("journal_entry_lines")
      .select("debit, credit, journal_entries!inner(id)")
      .eq("company_id", companyId)
      .eq("journal_entries.status", "posted")
      .range(from, to)
  );

  if (lines.length === 0) {
    return { id, name, status: "pass", summary: "No posted journal entries found — nothing to validate", details: [] };
  }

  let totalDebit = 0;
  let totalCredit = 0;
  for (const line of lines) {
    totalDebit += Number(line.debit) || 0;
    totalCredit += Number(line.credit) || 0;
  }

  const difference = Math.abs(totalDebit - totalCredit);

  if (difference <= 0.01) {
    return {
      id,
      name,
      status: "pass",
      summary: `Trial balance is balanced — total debits $${totalDebit.toFixed(2)} = total credits $${totalCredit.toFixed(2)}`,
      details: [],
    };
  }

  return {
    id,
    name,
    status: "fail",
    summary: `Trial balance is out of balance by $${difference.toFixed(2)}`,
    details: [
      `Total debits: $${totalDebit.toFixed(2)}`,
      `Total credits: $${totalCredit.toFixed(2)}`,
      `Difference: $${difference.toFixed(2)}`,
    ],
  };
}

/* ------------------------------------------------------------------
   2. Balance Sheet Balance Check
   Verifies Assets = Liabilities + Equity from posted JE lines.
   ------------------------------------------------------------------ */

async function checkBalanceSheetBalance(
  supabase: SupabaseClient,
  companyId: string
): Promise<AuditCheckResult> {
  const id = "balance-sheet";
  const name = "Balance Sheet Equation";

  // Paginated inner join — avoids both URL-length and 1000-row limit issues
  const lines = await paginatedQuery<{
    debit: number; credit: number; account_id: string;
    chart_of_accounts: { account_type: string } | null;
    journal_entries: { id: string };
  }>((from, to) =>
    supabase
      .from("journal_entry_lines")
      .select("debit, credit, account_id, chart_of_accounts(account_type), journal_entries!inner(id)")
      .eq("company_id", companyId)
      .eq("journal_entries.status", "posted")
      .range(from, to)
  );

  if (lines.length === 0) {
    return { id, name, status: "pass", summary: "No posted journal entries found — nothing to validate", details: [] };
  }

  let totalAssets = 0;
  let totalLiabilities = 0;
  let totalEquity = 0;
  let totalRevenue = 0;
  let totalExpenses = 0;

  for (const line of lines) {
    const account = line.chart_of_accounts;
    if (!account) continue;

    const debit = Number(line.debit) || 0;
    const credit = Number(line.credit) || 0;

    switch (account.account_type) {
      case "asset":
        totalAssets += debit - credit;
        break;
      case "liability":
        totalLiabilities += credit - debit;
        break;
      case "equity":
        totalEquity += credit - debit;
        break;
      case "revenue":
        totalRevenue += credit - debit;
        break;
      case "expense":
        totalExpenses += debit - credit;
        break;
    }
  }

  // Revenue and expenses close into retained earnings (equity)
  const retainedEarnings = totalRevenue - totalExpenses;
  const effectiveEquity = totalEquity + retainedEarnings;
  const liabilitiesPlusEquity = totalLiabilities + effectiveEquity;
  const difference = Math.abs(totalAssets - liabilitiesPlusEquity);

  if (difference <= 0.01) {
    return {
      id,
      name,
      status: "pass",
      summary: `Balance sheet is balanced — Assets $${totalAssets.toFixed(2)} = L+E $${liabilitiesPlusEquity.toFixed(2)}`,
      details: [],
    };
  }

  return {
    id,
    name,
    status: "fail",
    summary: `Balance sheet is out of balance by $${difference.toFixed(2)}`,
    details: [
      `Total assets: $${totalAssets.toFixed(2)}`,
      `Total liabilities: $${totalLiabilities.toFixed(2)}`,
      `Total equity (incl. retained earnings): $${effectiveEquity.toFixed(2)}`,
      `Liabilities + Equity: $${liabilitiesPlusEquity.toFixed(2)}`,
      `Difference: $${difference.toFixed(2)}`,
    ],
  };
}

/* ------------------------------------------------------------------
   3. Invoice Journal Entry Coverage
   Checks that every non-draft, non-voided invoice has a corresponding
   journal entry with reference = 'invoice:{id}'.
   ------------------------------------------------------------------ */

async function checkInvoiceJECoverage(
  supabase: SupabaseClient,
  companyId: string
): Promise<AuditCheckResult> {
  const id = "invoice-je-coverage";
  const name = "Invoice JE Coverage";

  // Get all non-draft, non-voided invoices
  const { data: invoices, error: invErr } = await supabase
    .from("invoices")
    .select("id, invoice_number, notes")
    .eq("company_id", companyId)
    .not("status", "in", "(draft,voided)");

  if (invErr) {
    return { id, name, status: "fail", summary: "Error querying invoices", details: [invErr.message] };
  }

  // Exclude invoices that don't need individual JE linkage:
  // - auto-rent-/auto-maint-: syncPropertyFinancials batch JEs
  // - csv-import: imported alongside a JE CSV (accounting handled separately)
  const allInvoices = (invoices ?? []).filter(
    (inv) =>
      !inv.notes?.startsWith("auto-rent-") &&
      !inv.notes?.startsWith("auto-maint-") &&
      !inv.notes?.startsWith("csv-import:")
  );

  if (allInvoices.length === 0) {
    return { id, name, status: "pass", summary: "No active invoices found — nothing to validate", details: [] };
  }

  // Get all journal entries with invoice references
  const { data: journalEntries, error: jeErr } = await supabase
    .from("journal_entries")
    .select("reference")
    .eq("company_id", companyId)
    .like("reference", "invoice:%");

  if (jeErr) {
    return { id, name, status: "fail", summary: "Error querying journal entries", details: [jeErr.message] };
  }

  // Build a set of invoice IDs that have JEs
  const coveredInvoiceIds = new Set<string>();
  for (const je of journalEntries ?? []) {
    if (je.reference) {
      const invoiceId = je.reference.replace("invoice:", "");
      coveredInvoiceIds.add(invoiceId);
    }
  }

  // Find invoices missing JEs
  const missingInvoices = allInvoices.filter((inv) => !coveredInvoiceIds.has(inv.id));
  const missingCount = missingInvoices.length;
  const totalCount = allInvoices.length;
  const missingPct = totalCount > 0 ? (missingCount / totalCount) * 100 : 0;

  if (missingCount === 0) {
    return {
      id,
      name,
      status: "pass",
      summary: `All ${totalCount} active invoices have journal entries`,
      details: [],
    };
  }

  const details = missingInvoices
    .slice(0, 10)
    .map((inv) => `Invoice ${inv.invoice_number} (${inv.id}) — missing JE`);

  if (missingCount > 10) {
    details.push(`...and ${missingCount - 10} more`);
  }

  if (missingPct <= 10) {
    return {
      id,
      name,
      status: "warn",
      summary: `${missingCount} of ${totalCount} invoices (${missingPct.toFixed(1)}%) are missing journal entries`,
      details,
    };
  }

  return {
    id,
    name,
    status: "fail",
    summary: `${missingCount} of ${totalCount} invoices (${missingPct.toFixed(1)}%) are missing journal entries`,
    details,
  };
}

/* ------------------------------------------------------------------
   4. Payment Journal Entry Coverage
   Checks that every payment has a corresponding journal entry
   with reference = 'payment:{id}'.
   ------------------------------------------------------------------ */

async function checkPaymentJECoverage(
  supabase: SupabaseClient,
  companyId: string
): Promise<AuditCheckResult> {
  const id = "payment-je-coverage";
  const name = "Payment JE Coverage";

  // Get all payments for the company
  const { data: payments, error: payErr } = await supabase
    .from("payments")
    .select("id, reference_number, notes")
    .eq("company_id", companyId);

  if (payErr) {
    return { id, name, status: "fail", summary: "Error querying payments", details: [payErr.message] };
  }

  // Exclude CSV-imported payments (accounting handled by JE CSV, not per-payment JEs)
  const allPayments = (payments ?? []).filter(
    (p) => !p.notes?.startsWith("csv-import:")
  );

  if (allPayments.length === 0) {
    return { id, name, status: "pass", summary: "No payments found — nothing to validate", details: [] };
  }

  // Get all journal entries with payment references
  const { data: journalEntries, error: jeErr } = await supabase
    .from("journal_entries")
    .select("reference")
    .eq("company_id", companyId)
    .like("reference", "payment:%");

  if (jeErr) {
    return { id, name, status: "fail", summary: "Error querying journal entries", details: [jeErr.message] };
  }

  // Build a set of payment IDs that have JEs
  const coveredPaymentIds = new Set<string>();
  for (const je of journalEntries ?? []) {
    if (je.reference) {
      const paymentId = je.reference.replace("payment:", "");
      coveredPaymentIds.add(paymentId);
    }
  }

  // Find payments missing JEs
  const missingPayments = allPayments.filter((p) => !coveredPaymentIds.has(p.id));
  const missingCount = missingPayments.length;
  const totalCount = allPayments.length;
  const missingPct = totalCount > 0 ? (missingCount / totalCount) * 100 : 0;

  if (missingCount === 0) {
    return {
      id,
      name,
      status: "pass",
      summary: `All ${totalCount} payments have journal entries`,
      details: [],
    };
  }

  const details = missingPayments
    .slice(0, 10)
    .map((p) => `Payment ${p.reference_number || p.id} — missing JE`);

  if (missingCount > 10) {
    details.push(`...and ${missingCount - 10} more`);
  }

  if (missingPct <= 10) {
    return {
      id,
      name,
      status: "warn",
      summary: `${missingCount} of ${totalCount} payments (${missingPct.toFixed(1)}%) are missing journal entries`,
      details,
    };
  }

  return {
    id,
    name,
    status: "fail",
    summary: `${missingCount} of ${totalCount} payments (${missingPct.toFixed(1)}%) are missing journal entries`,
    details,
  };
}

/* ------------------------------------------------------------------
   5. Bank Reconciliation Check
   Compares bank_accounts.current_balance sum with GL cash account
   balances derived from posted journal entry lines.
   ------------------------------------------------------------------ */

async function checkBankReconciliation(
  supabase: SupabaseClient,
  companyId: string
): Promise<AuditCheckResult> {
  const id = "bank-reconciliation";
  const name = "Bank Reconciliation";

  // Get bank accounts with GL linkage
  const { data: bankAccounts, error: bankErr } = await supabase
    .from("bank_accounts")
    .select("id, name, current_balance, gl_account_id")
    .eq("company_id", companyId);

  if (bankErr) {
    return { id, name, status: "fail", summary: "Error querying bank accounts", details: [bankErr.message] };
  }

  if (!bankAccounts || bankAccounts.length === 0) {
    return { id, name, status: "pass", summary: "No bank accounts found — nothing to reconcile", details: [] };
  }

  const bankBalance = bankAccounts.reduce(
    (sum, row) => sum + (Number(row.current_balance) || 0),
    0
  );

  // Compare bank balances vs their linked GL sub-account balances.
  // Only sum the GL sub-accounts that are actually linked to bank accounts.
  // Cash 1000 (parent) holds unallocated cash that doesn't belong to any
  // specific bank — including it inflates the GL side of this comparison.
  const linkedBanks = bankAccounts.filter((b) => b.gl_account_id);
  const unlinkedBanks = bankAccounts.filter((b) => !b.gl_account_id);
  const linkedGlIds = linkedBanks.map((b) => b.gl_account_id!);

  // Only include Cash 1000 when there are banks WITHOUT GL sub-accounts
  // (those banks' balances sit in the parent Cash account)
  const { data: cashParent } = await supabase
    .from("chart_of_accounts")
    .select("id")
    .eq("company_id", companyId)
    .eq("account_number", "1000")
    .single();

  const cashAccountIds = [...new Set([
    ...linkedGlIds,
    ...(unlinkedBanks.length > 0 && cashParent ? [cashParent.id] : []),
  ])];

  if (cashAccountIds.length === 0) {
    return {
      id,
      name,
      status: "warn",
      summary: "No linked GL accounts found — cannot reconcile with bank balance",
      details: [`Bank balance: $${bankBalance.toFixed(2)}`],
    };
  }

  // Paginated inner join — avoids both URL-length and 1000-row limit issues
  let glCashBalance = 0;

  const cashLines = await paginatedQuery<{ debit: number; credit: number; journal_entries: { id: string } }>((from, to) =>
    supabase
      .from("journal_entry_lines")
      .select("debit, credit, journal_entries!inner(id)")
      .eq("company_id", companyId)
      .in("account_id", cashAccountIds)
      .eq("journal_entries.status", "posted")
      .range(from, to)
  );

  for (const line of cashLines) {
    glCashBalance += (Number(line.debit) || 0) - (Number(line.credit) || 0);
  }

  const difference = Math.abs(bankBalance - glCashBalance);
  const largerBalance = Math.max(bankBalance, glCashBalance, 1);
  const diffPct = (difference / largerBalance) * 100;

  const diffDetails = [
    `Bank accounts total: $${bankBalance.toFixed(2)}`,
    `GL cash accounts total: $${glCashBalance.toFixed(2)}`,
    `Difference: $${difference.toFixed(2)} (${diffPct.toFixed(1)}%)`,
  ];

  // Pass: within 1% or $100
  if (diffPct <= 1 || difference <= 100) {
    return {
      id,
      name,
      status: "pass",
      summary: difference <= 1
        ? `Bank balance matches GL cash balance ($${bankBalance.toFixed(2)})`
        : `Bank and GL cash within ${diffPct.toFixed(1)}% ($${difference.toFixed(2)})`,
      details: difference <= 1 ? [] : diffDetails,
    };
  }

  // Warn: within 5%
  if (diffPct <= 5) {
    return {
      id,
      name,
      status: "warn",
      summary: `Bank and GL cash differ by ${diffPct.toFixed(1)}% ($${difference.toFixed(2)})`,
      details: diffDetails,
    };
  }

  return {
    id,
    name,
    status: "fail",
    summary: `Bank and GL cash differ by ${diffPct.toFixed(1)}% ($${difference.toFixed(2)})`,
    details: diffDetails,
  };
}

/* ------------------------------------------------------------------
   6. AR Reconciliation — GL Accounts Receivable vs Invoice Subledger
   Compares AR balance in the GL (from journal entries) to the sum of
   unpaid receivable invoices. A large discrepancy means the GL has
   entries that don't match actual invoices.
   ------------------------------------------------------------------ */

async function checkARReconciliation(
  supabase: SupabaseClient,
  companyId: string
): Promise<AuditCheckResult> {
  const id = "ar-reconciliation";
  const name = "AR Subledger Reconciliation";

  // Find AR GL accounts (include retainage receivable — auto-generated invoice JEs
  // split retainage into a separate account, so AR + retainage = total owed by clients)
  const { data: arAccounts } = await supabase
    .from("chart_of_accounts")
    .select("id, name")
    .eq("company_id", companyId)
    .eq("account_type", "asset")
    .eq("is_active", true)
    .or("name.ilike.%accounts receivable%,name.ilike.%accts receivable%,name.ilike.%a/r%,name.ilike.%trade receivable%,name.ilike.%retainage receivable%");

  const arAccountIds = (arAccounts ?? []).map((a: { id: string }) => a.id);

  if (arAccountIds.length === 0) {
    return { id, name, status: "pass", summary: "No AR GL accounts found — nothing to reconcile", details: [] };
  }

  // GL AR balance from posted journal entries
  const arLines = await paginatedQuery<{ debit: number; credit: number; journal_entries: { id: string } }>((from, to) =>
    supabase
      .from("journal_entry_lines")
      .select("debit, credit, journal_entries!inner(id)")
      .eq("company_id", companyId)
      .in("account_id", arAccountIds)
      .eq("journal_entries.status", "posted")
      .range(from, to)
  );

  let glARBalance = 0;
  for (const line of arLines) {
    glARBalance += (Number(line.debit) || 0) - (Number(line.credit) || 0);
  }

  // Invoice subledger: sum balance_due for unpaid receivables
  const { data: arInvoices } = await supabase
    .from("invoices")
    .select("balance_due")
    .eq("company_id", companyId)
    .eq("invoice_type", "receivable")
    .not("status", "eq", "voided")
    .not("status", "eq", "paid");

  const invoiceARBalance = (arInvoices ?? []).reduce(
    (sum, inv) => sum + (Number((inv as { balance_due: number }).balance_due) || 0), 0
  );

  const difference = Math.abs(glARBalance - invoiceARBalance);
  const largerBalance = Math.max(Math.abs(glARBalance), Math.abs(invoiceARBalance), 1);
  const diffPct = (difference / largerBalance) * 100;

  const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  const diffDetails = [
    `GL AR balance (journal entries): ${fmt(glARBalance)}`,
    `Invoice subledger (unpaid receivables): ${fmt(invoiceARBalance)}`,
    `Difference: ${fmt(difference)} (${diffPct.toFixed(1)}%)`,
  ];

  if (diffPct <= 1 || difference <= 100) {
    return { id, name, status: "pass", summary: `GL AR matches invoice subledger — ${fmt(glARBalance)}`, details: difference <= 1 ? [] : diffDetails };
  }
  if (diffPct <= 5) {
    return { id, name, status: "warn", summary: `GL AR and invoices differ by ${diffPct.toFixed(1)}% (${fmt(difference)})`, details: diffDetails };
  }
  return { id, name, status: "fail", summary: `GL AR (${fmt(glARBalance)}) does not match invoices (${fmt(invoiceARBalance)}) — ${fmt(difference)} discrepancy`, details: diffDetails };
}

/* ------------------------------------------------------------------
   7. AP Reconciliation — GL Accounts Payable vs Invoice Subledger
   Compares AP balance in the GL (from journal entries) to the sum of
   unpaid payable invoices. A large discrepancy means the GL has
   entries that don't match actual invoices.
   ------------------------------------------------------------------ */

async function checkAPReconciliation(
  supabase: SupabaseClient,
  companyId: string
): Promise<AuditCheckResult> {
  const id = "ap-reconciliation";
  const name = "AP Subledger Reconciliation";

  // Find AP GL accounts (include retainage payable — invoice JEs may split retainage
  // into a separate liability account, so AP + retainage = total owed to vendors)
  const { data: apAccounts } = await supabase
    .from("chart_of_accounts")
    .select("id, name")
    .eq("company_id", companyId)
    .eq("account_type", "liability")
    .eq("is_active", true)
    .or("name.ilike.%accounts payable%,name.ilike.%accts payable%,name.ilike.%a/p%,name.ilike.%trade payable%,name.ilike.%retainage payable%");

  const apAccountIds = (apAccounts ?? []).map((a: { id: string }) => a.id);

  if (apAccountIds.length === 0) {
    return { id, name, status: "pass", summary: "No AP GL accounts found — nothing to reconcile", details: [] };
  }

  // GL AP balance from posted journal entries (liability = credits - debits)
  const apLines = await paginatedQuery<{ debit: number; credit: number; journal_entries: { id: string } }>((from, to) =>
    supabase
      .from("journal_entry_lines")
      .select("debit, credit, journal_entries!inner(id)")
      .eq("company_id", companyId)
      .in("account_id", apAccountIds)
      .eq("journal_entries.status", "posted")
      .range(from, to)
  );

  let glAPBalance = 0;
  for (const line of apLines) {
    glAPBalance += (Number(line.credit) || 0) - (Number(line.debit) || 0);
  }

  // Invoice subledger: sum balance_due for unpaid payables
  const { data: apInvoices } = await supabase
    .from("invoices")
    .select("balance_due")
    .eq("company_id", companyId)
    .eq("invoice_type", "payable")
    .not("status", "eq", "voided")
    .not("status", "eq", "paid");

  const invoiceAPBalance = (apInvoices ?? []).reduce(
    (sum, inv) => sum + (Number((inv as { balance_due: number }).balance_due) || 0), 0
  );

  const difference = Math.abs(glAPBalance - invoiceAPBalance);
  const largerBalance = Math.max(Math.abs(glAPBalance), Math.abs(invoiceAPBalance), 1);
  const diffPct = (difference / largerBalance) * 100;

  const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  const diffDetails = [
    `GL AP balance (journal entries): ${fmt(glAPBalance)}`,
    `Invoice subledger (unpaid payables): ${fmt(invoiceAPBalance)}`,
    `Difference: ${fmt(difference)} (${diffPct.toFixed(1)}%)`,
  ];

  if (diffPct <= 1 || difference <= 100) {
    return { id, name, status: "pass", summary: `GL AP matches invoice subledger — ${fmt(glAPBalance)}`, details: difference <= 1 ? [] : diffDetails };
  }
  if (diffPct <= 5) {
    return { id, name, status: "warn", summary: `GL AP and invoices differ by ${diffPct.toFixed(1)}% (${fmt(difference)})`, details: diffDetails };
  }
  return { id, name, status: "fail", summary: `GL AP (${fmt(glAPBalance)}) does not match invoices (${fmt(invoiceAPBalance)}) — ${fmt(difference)} discrepancy`, details: diffDetails };
}

/* ------------------------------------------------------------------
   8. Unposted (Draft) Journal Entries Check
   Flags draft journal entries, especially old ones (>7 days).
   ------------------------------------------------------------------ */

async function checkUnpostedEntries(
  supabase: SupabaseClient,
  companyId: string
): Promise<AuditCheckResult> {
  const id = "unposted-entries";
  const name = "Unposted Journal Entries";

  const { data: drafts, error: draftErr } = await supabase
    .from("journal_entries")
    .select("id, entry_number, created_at")
    .eq("company_id", companyId)
    .eq("status", "draft")
    .order("created_at", { ascending: true });

  if (draftErr) {
    return { id, name, status: "fail", summary: "Error querying draft journal entries", details: [draftErr.message] };
  }

  const allDrafts = drafts ?? [];

  if (allDrafts.length === 0) {
    return { id, name, status: "pass", summary: "No draft journal entries found", details: [] };
  }

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const oldDrafts = allDrafts.filter((d) => new Date(d.created_at) < sevenDaysAgo);

  if (oldDrafts.length === 0) {
    return {
      id,
      name,
      status: "warn",
      summary: `${allDrafts.length} draft journal entries exist, but none are older than 7 days`,
      details: allDrafts.slice(0, 10).map(
        (d) => `${d.entry_number} — created ${new Date(d.created_at).toLocaleDateString()}`
      ),
    };
  }

  const details = oldDrafts
    .slice(0, 10)
    .map(
      (d) => `${d.entry_number} — created ${new Date(d.created_at).toLocaleDateString()} (older than 7 days)`
    );

  if (oldDrafts.length > 10) {
    details.push(`...and ${oldDrafts.length - 10} more`);
  }

  return {
    id,
    name,
    status: "fail",
    summary: `${oldDrafts.length} draft journal entries are older than 7 days (${allDrafts.length} total drafts)`,
    details,
  };
}

/* ------------------------------------------------------------------
   7. Missing GL Account Mappings
   Checks for non-draft, non-voided invoices that have no gl_account_id.
   ------------------------------------------------------------------ */

async function checkMissingGLMappings(
  supabase: SupabaseClient,
  companyId: string
): Promise<AuditCheckResult> {
  const id = "missing-gl-mappings";
  const name = "Invoice GL Mappings";

  const { data: invoices, error: invErr } = await supabase
    .from("invoices")
    .select("id, invoice_number, notes")
    .eq("company_id", companyId)
    .is("gl_account_id", null)
    .not("status", "in", "(draft,voided)");

  if (invErr) {
    return { id, name, status: "fail", summary: "Error querying invoices", details: [invErr.message] };
  }

  // Exclude auto-generated and CSV-imported invoices:
  // - auto-rent-/auto-maint-: batch JE accounting via syncPropertyFinancials
  // - csv-import: GL mapping handled by JE CSV, not per-invoice
  const unmapped = (invoices ?? []).filter(
    (inv) =>
      !inv.notes?.startsWith("auto-rent-") &&
      !inv.notes?.startsWith("auto-maint-") &&
      !inv.notes?.startsWith("csv-import:")
  );

  if (unmapped.length === 0) {
    return { id, name, status: "pass", summary: "All active invoices have GL account mappings", details: [] };
  }

  const details = unmapped
    .slice(0, 10)
    .map((inv) => `Invoice ${inv.invoice_number} — no GL account mapped`);

  if (unmapped.length > 10) {
    details.push(`...and ${unmapped.length - 10} more`);
  }

  if (unmapped.length < 5) {
    return {
      id,
      name,
      status: "warn",
      summary: `${unmapped.length} active invoices are missing GL account mappings`,
      details,
    };
  }

  return {
    id,
    name,
    status: "fail",
    summary: `${unmapped.length} active invoices are missing GL account mappings`,
    details,
  };
}

/* ------------------------------------------------------------------
   8. Orphaned Journal Entry Lines
   Checks for JE lines referencing accounts that don't exist in the
   company's chart of accounts (e.g., deleted or wrong-company accounts).
   ------------------------------------------------------------------ */

async function checkOrphanedJELines(
  supabase: SupabaseClient,
  companyId: string
): Promise<AuditCheckResult> {
  const id = "orphaned-je-lines";
  const name = "Orphaned JE Lines";

  // Get all valid account IDs for this company
  const { data: accounts, error: accErr } = await supabase
    .from("chart_of_accounts")
    .select("id")
    .eq("company_id", companyId);

  if (accErr) {
    return { id, name, status: "fail", summary: "Error querying chart of accounts", details: [accErr.message] };
  }

  const validAccountIds = new Set((accounts ?? []).map((a: { id: string }) => a.id));

  // Paginated query — avoids 1000-row limit
  const lines = await paginatedQuery<{
    id: string; account_id: string; journal_entry_id: string;
    journal_entries: { entry_number: string };
  }>((from, to) =>
    supabase
      .from("journal_entry_lines")
      .select("id, account_id, journal_entry_id, journal_entries!inner(entry_number)")
      .eq("company_id", companyId)
      .range(from, to)
  );

  if (lines.length === 0) {
    return { id, name, status: "pass", summary: "No journal entries found — nothing to validate", details: [] };
  }

  // Find lines whose account_id is not in this company's chart of accounts
  const orphanedEntryNumbers = new Set<string>();
  let orphanedCount = 0;

  for (const line of lines) {
    if (!validAccountIds.has(line.account_id)) {
      orphanedCount++;
      const je = line.journal_entries as unknown as { entry_number: string } | null;
      if (je?.entry_number) {
        orphanedEntryNumbers.add(je.entry_number);
      }
    }
  }

  if (orphanedCount === 0) {
    return { id, name, status: "pass", summary: "No orphaned journal entry lines found", details: [] };
  }

  const details = Array.from(orphanedEntryNumbers)
    .slice(0, 10)
    .map((num) => `Entry ${num} has lines referencing invalid accounts`);

  if (orphanedEntryNumbers.size > 10) {
    details.push(`...and ${orphanedEntryNumbers.size - 10} more entries`);
  }

  return {
    id,
    name,
    status: "fail",
    summary: `${orphanedCount} journal entry lines reference accounts not in this company's chart of accounts`,
    details,
  };
}

/* ------------------------------------------------------------------
   9. Revenue Recognition Timing
   Checks that revenue invoice JEs are dated within 30 days of the
   invoice date. Large discrepancies may indicate improper revenue
   recognition timing.
   ------------------------------------------------------------------ */

async function checkRevenueRecognition(
  supabase: SupabaseClient,
  companyId: string
): Promise<AuditCheckResult> {
  const id = "revenue-recognition";
  const name = "Revenue Recognition Timing";

  // Get all receivable invoices that are not draft or voided
  const { data: invoices, error: invErr } = await supabase
    .from("invoices")
    .select("id, invoice_number, invoice_date")
    .eq("company_id", companyId)
    .eq("invoice_type", "receivable")
    .not("status", "in", "(draft,voided)");

  if (invErr) {
    return { id, name, status: "fail", summary: "Error querying invoices", details: [invErr.message] };
  }

  const revenueInvoices = invoices ?? [];

  if (revenueInvoices.length === 0) {
    return { id, name, status: "pass", summary: "No revenue invoices found — nothing to validate", details: [] };
  }

  // Get all invoice JEs for this company
  const { data: journalEntries, error: jeErr } = await supabase
    .from("journal_entries")
    .select("reference, entry_date")
    .eq("company_id", companyId)
    .like("reference", "invoice:%");

  if (jeErr) {
    return { id, name, status: "fail", summary: "Error querying journal entries", details: [jeErr.message] };
  }

  // Build map of invoice ID → JE entry_date
  const jeEntryDateMap = new Map<string, string>();
  for (const je of journalEntries ?? []) {
    if (je.reference) {
      const invoiceId = je.reference.replace("invoice:", "");
      jeEntryDateMap.set(invoiceId, je.entry_date);
    }
  }

  // Compare invoice_date to JE entry_date for each revenue invoice
  const mismatchedInvoices: { invoice_number: string; invoiceDate: string; jeDate: string; daysDiff: number }[] = [];

  for (const inv of revenueInvoices) {
    const jeDate = jeEntryDateMap.get(inv.id);
    if (!jeDate) continue; // No JE found — covered by invoice JE coverage check

    const invDate = new Date(inv.invoice_date);
    const entryDate = new Date(jeDate);
    const daysDiff = Math.abs(
      Math.floor((entryDate.getTime() - invDate.getTime()) / (1000 * 60 * 60 * 24))
    );

    if (daysDiff > 30) {
      mismatchedInvoices.push({
        invoice_number: inv.invoice_number,
        invoiceDate: inv.invoice_date,
        jeDate,
        daysDiff,
      });
    }
  }

  if (mismatchedInvoices.length === 0) {
    return {
      id,
      name,
      status: "pass",
      summary: "All revenue journal entries are dated within 30 days of their invoice date",
      details: [],
    };
  }

  const details = mismatchedInvoices
    .slice(0, 10)
    .map(
      (m) =>
        `Invoice ${m.invoice_number}: invoice date ${m.invoiceDate}, JE date ${m.jeDate} (${m.daysDiff} days apart)`
    );

  if (mismatchedInvoices.length > 10) {
    details.push(`...and ${mismatchedInvoices.length - 10} more`);
  }

  return {
    id,
    name,
    status: "warn",
    summary: `${mismatchedInvoices.length} revenue invoices have JE dates more than 30 days from invoice date`,
    details,
  };
}
