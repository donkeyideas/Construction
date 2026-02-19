import { SupabaseClient } from "@supabase/supabase-js";

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

  // Use inner join to filter lines by posted entries — avoids URL-length issues
  // with large .in() arrays
  const { data: lines, error: linesErr } = await supabase
    .from("journal_entry_lines")
    .select("debit, credit, journal_entries!inner(id)")
    .eq("company_id", companyId)
    .eq("journal_entries.status", "posted");

  if (linesErr) {
    return { id, name, status: "fail", summary: "Error querying journal entry lines", details: [linesErr.message] };
  }

  if (!lines || lines.length === 0) {
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

  // Use inner join to filter lines by posted entries — avoids URL-length issues
  const { data: lines, error: linesErr } = await supabase
    .from("journal_entry_lines")
    .select("debit, credit, account_id, chart_of_accounts(account_type), journal_entries!inner(id)")
    .eq("company_id", companyId)
    .eq("journal_entries.status", "posted");

  if (linesErr) {
    return { id, name, status: "fail", summary: "Error querying journal entry lines", details: [linesErr.message] };
  }

  if (!lines || lines.length === 0) {
    return { id, name, status: "pass", summary: "No posted journal entries found — nothing to validate", details: [] };
  }

  let totalAssets = 0;
  let totalLiabilities = 0;
  let totalEquity = 0;
  let totalRevenue = 0;
  let totalExpenses = 0;

  for (const line of lines ?? []) {
    const account = (line as Record<string, unknown>).chart_of_accounts as { account_type: string } | null;
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
    .select("id, invoice_number")
    .eq("company_id", companyId)
    .not("status", "in", "(draft,voided)");

  if (invErr) {
    return { id, name, status: "fail", summary: "Error querying invoices", details: [invErr.message] };
  }

  const allInvoices = invoices ?? [];

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
    .select("id, reference_number")
    .eq("company_id", companyId);

  if (payErr) {
    return { id, name, status: "fail", summary: "Error querying payments", details: [payErr.message] };
  }

  const allPayments = payments ?? [];

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

  // Get bank accounts total balance
  const { data: bankAccounts, error: bankErr } = await supabase
    .from("bank_accounts")
    .select("current_balance")
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

  // Find cash-type GL accounts
  const { data: cashAccounts, error: cashAccErr } = await supabase
    .from("chart_of_accounts")
    .select("id")
    .eq("company_id", companyId)
    .eq("account_type", "asset")
    .eq("is_active", true)
    .or("name.ilike.%cash%,name.ilike.%checking%,name.ilike.%savings%");

  if (cashAccErr) {
    return { id, name, status: "fail", summary: "Error querying cash accounts", details: [cashAccErr.message] };
  }

  const cashAccountIds = (cashAccounts ?? []).map((a: { id: string }) => a.id);

  if (cashAccountIds.length === 0) {
    return {
      id,
      name,
      status: "warn",
      summary: "No cash/checking/savings GL accounts found — cannot reconcile with bank balance",
      details: [`Bank balance: $${bankBalance.toFixed(2)}`],
    };
  }

  // Use inner join to filter lines by posted entries — avoids URL-length issues
  let glCashBalance = 0;

  const { data: cashLines, error: cashLinesErr } = await supabase
    .from("journal_entry_lines")
    .select("debit, credit, journal_entries!inner(id)")
    .eq("company_id", companyId)
    .in("account_id", cashAccountIds)
    .eq("journal_entries.status", "posted");

  if (cashLinesErr) {
    return { id, name, status: "fail", summary: "Error querying cash JE lines", details: [cashLinesErr.message] };
  }

  for (const line of cashLines ?? []) {
    glCashBalance += (Number(line.debit) || 0) - (Number(line.credit) || 0);
  }

  const difference = Math.abs(bankBalance - glCashBalance);

  if (difference <= 1.0) {
    return {
      id,
      name,
      status: "pass",
      summary: `Bank balance ($${bankBalance.toFixed(2)}) matches GL cash balance ($${glCashBalance.toFixed(2)})`,
      details: [],
    };
  }

  if (difference < 100) {
    return {
      id,
      name,
      status: "warn",
      summary: `Bank balance and GL cash differ by $${difference.toFixed(2)}`,
      details: [
        `Bank accounts total: $${bankBalance.toFixed(2)}`,
        `GL cash accounts total: $${glCashBalance.toFixed(2)}`,
        `Difference: $${difference.toFixed(2)}`,
      ],
    };
  }

  return {
    id,
    name,
    status: "fail",
    summary: `Bank balance and GL cash differ by $${difference.toFixed(2)}`,
    details: [
      `Bank accounts total: $${bankBalance.toFixed(2)}`,
      `GL cash accounts total: $${glCashBalance.toFixed(2)}`,
      `Difference: $${difference.toFixed(2)}`,
    ],
  };
}

/* ------------------------------------------------------------------
   6. Unposted (Draft) Journal Entries Check
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
    .select("id, invoice_number")
    .eq("company_id", companyId)
    .is("gl_account_id", null)
    .not("status", "in", "(draft,voided)");

  if (invErr) {
    return { id, name, status: "fail", summary: "Error querying invoices", details: [invErr.message] };
  }

  const unmapped = invoices ?? [];

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

  // Use inner join to get lines with entry numbers — avoids URL-length issues
  const { data: lines, error: linesErr } = await supabase
    .from("journal_entry_lines")
    .select("id, account_id, journal_entry_id, journal_entries!inner(entry_number)")
    .eq("company_id", companyId);

  if (linesErr) {
    return { id, name, status: "fail", summary: "Error querying journal entry lines", details: [linesErr.message] };
  }

  if (!lines || lines.length === 0) {
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
