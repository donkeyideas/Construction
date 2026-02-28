import { SupabaseClient } from "@supabase/supabase-js";
import { paginatedQuery } from "@/lib/utils/paginated-query";
import { formatDateShort, toDateStr, formatDateSafe } from "@/lib/utils/format";

/* ------------------------------------------------------------------
   Types
   ------------------------------------------------------------------ */

export interface FinancialOverview {
  totalAR: number;
  totalAP: number;
  cashPosition: number;
  revenueThisMonth: number;
  expensesThisMonth: number;
  netIncome: number;
  /** Label for the period shown (e.g. "This Month" or "Oct 2025") */
  periodLabel: string;
}

export interface InvoiceRow {
  id: string;
  invoice_number: string;
  invoice_type: "payable" | "receivable";
  vendor_name: string | null;
  client_name: string | null;
  project_id: string | null;
  project_name: string | null;
  invoice_date: string;
  due_date: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  amount_paid: number;
  balance_due: number;
  status: string;
  notes: string | null;
  line_items: LineItem[] | null;
  created_at: string;
}

export interface InvoiceDetail extends InvoiceRow {
  payments: PaymentRow[];
}

export interface PaymentRow {
  id: string;
  payment_date: string;
  amount: number;
  method: string;
  reference_number: string | null;
  bank_account_id: string | null;
  bank_account_name: string | null;
  notes: string | null;
}

export interface LineItem {
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
  csi_code?: string;
}

export interface AccountRow {
  id: string;
  account_number: string;
  name: string;
  account_type: "asset" | "liability" | "equity" | "revenue" | "expense";
  sub_type: string | null;
  parent_id: string | null;
  is_active: boolean;
  description: string | null;
  normal_balance: string;
  balance: number;
}

export interface AccountTreeNode extends AccountRow {
  children: AccountTreeNode[];
}

export interface BudgetLineRow {
  id: string;
  project_id: string;
  csi_code: string;
  description: string;
  budgeted_amount: number;
  committed_amount: number;
  actual_amount: number;
  variance: number;
}

export interface JobCostingSummary {
  lines: BudgetLineRow[];
  totalBudgeted: number;
  totalCommitted: number;
  totalActual: number;
  totalVariance: number;
}

export interface InvoiceFilters {
  type?: "payable" | "receivable";
  status?: string;
  projectId?: string;
}

export interface InvoiceCreateData {
  invoice_number: string;
  invoice_type: "payable" | "receivable";
  vendor_name?: string;
  client_name?: string;
  project_id?: string;
  property_id?: string;
  invoice_date: string;
  due_date: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  line_items: LineItem[];
  notes?: string;
  status?: string;
  gl_account_id?: string;
  retainage_pct?: number;
  retainage_held?: number;
}

export interface AccountCreateData {
  account_number: string;
  name: string;
  account_type: "asset" | "liability" | "equity" | "revenue" | "expense";
  sub_type?: string;
  parent_id?: string;
  description?: string;
  normal_balance: string;
}

export interface JournalEntryLineData {
  account_id: string;
  debit?: number;
  credit?: number;
  description?: string;
  project_id?: string;
  property_id?: string;
}

export interface JournalEntryCreateData {
  entry_number: string;
  entry_date: string;
  description: string;
  reference?: string;
  project_id?: string;
  lines: JournalEntryLineData[];
}

export interface JournalEntryRow {
  id: string;
  entry_number: string;
  entry_date: string;
  description: string;
  reference: string | null;
  project_id: string | null;
  status: string;
  created_by: string | null;
  posted_by: string | null;
  posted_at: string | null;
  created_at: string;
  lines?: JournalEntryLineRow[];
  /** Computed sum of line debits (populated by getJournalEntries) */
  total_debit?: number;
  /** Computed sum of line credits (populated by getJournalEntries) */
  total_credit?: number;
}

export interface JournalEntryLineRow {
  id: string;
  account_id: string;
  debit: number;
  credit: number;
  description: string | null;
  project_id: string | null;
  property_id: string | null;
  account_number?: string;
  account_name?: string;
}

/** Alias for JournalEntryRow with lines populated (used in detail views) */
export type JournalEntryDetail = JournalEntryRow & { lines: JournalEntryLineRow[] };

export interface PaymentCreateData {
  invoice_id: string;
  payment_date: string;
  amount: number;
  method: string;
  reference_number?: string;
  bank_account_id?: string | null;
  notes?: string;
}

export interface ProjectRow {
  id: string;
  name: string;
  status: string;
  project_number: string | null;
}

/* ------------------------------------------------------------------
   Financial Overview
   ------------------------------------------------------------------ */

export async function getFinancialOverview(
  supabase: SupabaseClient,
  companyId: string
): Promise<FinancialOverview> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

  // Total AR: sum of balance_due on receivable invoices with outstanding balance
  // Includes paid invoices with retainage (balance_due > 0) to match GL
  const arPromise = paginatedQuery<{ balance_due: number }>((from, to) =>
    supabase
      .from("invoices")
      .select("balance_due")
      .eq("company_id", companyId)
      .eq("invoice_type", "receivable")
      .not("status", "eq", "voided")
      .gt("balance_due", 0)
      .range(from, to)
  );

  // Total AP: sum of balance_due on payable invoices with outstanding balance
  const apPromise = paginatedQuery<{ balance_due: number }>((from, to) =>
    supabase
      .from("invoices")
      .select("balance_due")
      .eq("company_id", companyId)
      .eq("invoice_type", "payable")
      .not("status", "eq", "voided")
      .gt("balance_due", 0)
      .range(from, to)
  );

  // Cash position: sum of current_balance from bank_accounts
  const cashPromise = supabase
    .from("bank_accounts")
    .select("current_balance")
    .eq("company_id", companyId);

  // Revenue & Expenses this month: use payments table (payment_date) for accuracy
  // This tracks when money actually moved, not when invoices were created
  const paymentsPromise = supabase
    .from("payments")
    .select("amount, invoices(invoice_type)")
    .eq("company_id", companyId)
    .gte("payment_date", startOfMonth)
    .lte("payment_date", endOfMonth);

  const [arRows, apRows, cashRes, paymentsRes] = await Promise.all([
    arPromise,
    apPromise,
    cashPromise,
    paymentsPromise,
  ]);

  const totalAR = arRows.reduce(
    (sum: number, row: { balance_due: number }) => sum + (row.balance_due ?? 0),
    0
  );
  const totalAP = apRows.reduce(
    (sum: number, row: { balance_due: number }) => sum + (row.balance_due ?? 0),
    0
  );
  const cashPosition = (cashRes.data ?? []).reduce(
    (sum: number, row: { current_balance: number }) => sum + (row.current_balance ?? 0),
    0
  );

  let revenueThisMonth = 0;
  let expensesThisMonth = 0;
  for (const row of paymentsRes.data ?? []) {
    const invoiceType = (row.invoices as unknown as { invoice_type: string } | null)?.invoice_type;
    if (invoiceType === "receivable") {
      revenueThisMonth += row.amount ?? 0;
    } else if (invoiceType === "payable") {
      expensesThisMonth += row.amount ?? 0;
    }
  }

  // Fallback 1: if no payments exist, use invoice-based estimation for current month
  let periodLabel = "This Month";
  if (revenueThisMonth === 0 && expensesThisMonth === 0) {
    const [revFallback, expFallback] = await Promise.all([
      supabase
        .from("invoices")
        .select("total_amount")
        .eq("company_id", companyId)
        .eq("invoice_type", "receivable")
        .in("status", ["paid", "approved", "pending"])
        .gte("invoice_date", startOfMonth)
        .lte("invoice_date", endOfMonth),
      supabase
        .from("invoices")
        .select("total_amount")
        .eq("company_id", companyId)
        .eq("invoice_type", "payable")
        .in("status", ["paid", "approved", "pending"])
        .gte("invoice_date", startOfMonth)
        .lte("invoice_date", endOfMonth),
    ]);
    revenueThisMonth = (revFallback.data ?? []).reduce(
      (sum: number, r: { total_amount: number }) => sum + (r.total_amount ?? 0), 0
    );
    expensesThisMonth = (expFallback.data ?? []).reduce(
      (sum: number, r: { total_amount: number }) => sum + (r.total_amount ?? 0), 0
    );
  }

  // Fallback 2: if current month is still empty, find the most recent month with data
  if (revenueThisMonth === 0 && expensesThisMonth === 0) {
    for (let i = 1; i <= 6; i++) {
      const pastMonth = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const pastEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
      const pastStartISO = pastMonth.toISOString();
      const pastEndISO = pastEnd.toISOString();

      const [revPast, expPast] = await Promise.all([
        supabase
          .from("invoices")
          .select("total_amount")
          .eq("company_id", companyId)
          .eq("invoice_type", "receivable")
          .neq("status", "voided")
          .gte("invoice_date", pastStartISO)
          .lte("invoice_date", pastEndISO),
        supabase
          .from("invoices")
          .select("total_amount")
          .eq("company_id", companyId)
          .eq("invoice_type", "payable")
          .neq("status", "voided")
          .gte("invoice_date", pastStartISO)
          .lte("invoice_date", pastEndISO),
      ]);

      const rev = (revPast.data ?? []).reduce(
        (sum: number, r: { total_amount: number }) => sum + (r.total_amount ?? 0), 0
      );
      const exp = (expPast.data ?? []).reduce(
        (sum: number, r: { total_amount: number }) => sum + (r.total_amount ?? 0), 0
      );

      if (rev > 0 || exp > 0) {
        revenueThisMonth = rev;
        expensesThisMonth = exp;
        periodLabel = formatDateShort(toDateStr(pastMonth));
        break;
      }
    }
  }

  return {
    totalAR,
    totalAP,
    cashPosition,
    revenueThisMonth,
    expensesThisMonth,
    netIncome: revenueThisMonth - expensesThisMonth,
    periodLabel,
  };
}

/* ------------------------------------------------------------------
   Invoices
   ------------------------------------------------------------------ */

export async function getInvoices(
  supabase: SupabaseClient,
  companyId: string,
  filters?: InvoiceFilters
): Promise<InvoiceRow[]> {
  let query = supabase
    .from("invoices")
    .select("*, projects(name)")
    .eq("company_id", companyId)
    .order("invoice_date", { ascending: false });

  if (filters?.type) {
    query = query.eq("invoice_type", filters.type);
  }

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }

  if (filters?.projectId) {
    query = query.eq("project_id", filters.projectId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching invoices:", error);
    return [];
  }

  return (data ?? []).map((row: Record<string, unknown>) => {
    const project = row.projects as { name: string } | null;
    return {
      ...row,
      project_name: project?.name ?? null,
    };
  }) as InvoiceRow[];
}

export async function getRecentInvoices(
  supabase: SupabaseClient,
  companyId: string,
  limit: number = 10
): Promise<InvoiceRow[]> {
  const { data, error } = await supabase
    .from("invoices")
    .select("*, projects(name)")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching recent invoices:", error);
    return [];
  }

  return (data ?? []).map((row: Record<string, unknown>) => {
    const project = row.projects as { name: string } | null;
    return {
      ...row,
      project_name: project?.name ?? null,
    };
  }) as InvoiceRow[];
}

export async function getInvoiceById(
  supabase: SupabaseClient,
  invoiceId: string
): Promise<InvoiceDetail | null> {
  const { data: invoice, error: invError } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", invoiceId)
    .single();

  if (invError || !invoice) {
    console.error("Error fetching invoice:", invError);
    return null;
  }

  const { data: payments, error: payError } = await supabase
    .from("payments")
    .select("id, payment_date, amount, method, reference_number, bank_account_id, notes")
    .eq("invoice_id", invoiceId)
    .order("payment_date", { ascending: false });

  if (payError) {
    console.error("Error fetching payments:", payError);
  }

  // Look up bank account names separately to avoid join failures
  const paymentRows = payments ?? [];
  const bankIds = [...new Set(paymentRows.map((p: Record<string, unknown>) => p.bank_account_id).filter(Boolean))] as string[];
  const bankNameMap: Record<string, string> = {};
  if (bankIds.length > 0) {
    const { data: banks } = await supabase
      .from("bank_accounts")
      .select("id, name")
      .in("id", bankIds);
    for (const b of banks ?? []) {
      bankNameMap[b.id] = b.name;
    }
  }

  const mappedPayments: PaymentRow[] = paymentRows.map((p: Record<string, unknown>) => ({
    id: p.id as string,
    payment_date: p.payment_date as string,
    amount: p.amount as number,
    method: p.method as string,
    reference_number: (p.reference_number as string) || null,
    bank_account_id: (p.bank_account_id as string) || null,
    bank_account_name: p.bank_account_id ? (bankNameMap[p.bank_account_id as string] || null) : null,
    notes: (p.notes as string) || null,
  }));

  return {
    ...(invoice as InvoiceRow),
    payments: mappedPayments,
  };
}

export async function createInvoice(
  supabase: SupabaseClient,
  companyId: string,
  data: InvoiceCreateData
): Promise<{ id: string } | null> {
  const { data: result, error } = await supabase
    .from("invoices")
    .insert({
      company_id: companyId,
      invoice_number: data.invoice_number,
      invoice_type: data.invoice_type,
      vendor_name: data.vendor_name ?? null,
      client_name: data.client_name ?? null,
      project_id: data.project_id ?? null,
      property_id: data.property_id ?? null,
      invoice_date: data.invoice_date,
      due_date: data.due_date,
      subtotal: data.subtotal,
      tax_amount: data.tax_amount,
      total_amount: data.total_amount,
      amount_paid: 0,
      line_items: data.line_items,
      notes: data.notes ?? null,
      status: data.status ?? "draft",
      gl_account_id: data.gl_account_id ?? null,
      retainage_pct: data.retainage_pct ?? 0,
      retainage_held: data.retainage_held ?? 0,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Error creating invoice:", error);
    return null;
  }

  return result as { id: string };
}

export async function updateInvoice(
  supabase: SupabaseClient,
  invoiceId: string,
  data: Partial<InvoiceCreateData> & { status?: string }
): Promise<boolean> {
  const updatePayload: Record<string, unknown> = {};

  if (data.invoice_number !== undefined) updatePayload.invoice_number = data.invoice_number;
  if (data.invoice_type !== undefined) updatePayload.invoice_type = data.invoice_type;
  if (data.vendor_name !== undefined) updatePayload.vendor_name = data.vendor_name;
  if (data.client_name !== undefined) updatePayload.client_name = data.client_name;
  if (data.project_id !== undefined) updatePayload.project_id = data.project_id;
  if (data.property_id !== undefined) updatePayload.property_id = data.property_id;
  if (data.invoice_date !== undefined) updatePayload.invoice_date = data.invoice_date;
  if (data.due_date !== undefined) updatePayload.due_date = data.due_date;
  if (data.subtotal !== undefined) updatePayload.subtotal = data.subtotal;
  if (data.tax_amount !== undefined) updatePayload.tax_amount = data.tax_amount;
  if (data.total_amount !== undefined) updatePayload.total_amount = data.total_amount;
  if (data.line_items !== undefined) updatePayload.line_items = data.line_items;
  if (data.notes !== undefined) updatePayload.notes = data.notes;
  if (data.status !== undefined) updatePayload.status = data.status;
  // Note: balance_due is a Postgres GENERATED COLUMN — never include it in updates

  const { error } = await supabase
    .from("invoices")
    .update(updatePayload)
    .eq("id", invoiceId);

  if (error) {
    console.error("Error updating invoice:", error);
    return false;
  }

  return true;
}

/* ------------------------------------------------------------------
   Chart of Accounts
   ------------------------------------------------------------------ */

export async function getChartOfAccounts(
  supabase: SupabaseClient,
  companyId: string
): Promise<AccountTreeNode[]> {
  // Fetch accounts
  const accountsResult = await supabase
    .from("chart_of_accounts")
    .select("*")
    .eq("company_id", companyId)
    .eq("is_active", true)
    .order("account_number", { ascending: true });

  if (accountsResult.error) {
    console.error("Error fetching chart of accounts:", accountsResult.error);
    return [];
  }

  // Fetch ALL journal entry line totals (paginated to avoid 1000-row limit)
  const allLines = await paginatedQuery<{ account_id: string; debit: number; credit: number }>((from, to) =>
    supabase
      .from("journal_entry_lines")
      .select("account_id, debit, credit")
      .eq("company_id", companyId)
      .range(from, to)
  );

  // Sum debits and credits per account
  const balanceMap = new Map<string, { debit: number; credit: number }>();
  for (const line of allLines) {
    const existing = balanceMap.get(line.account_id) ?? { debit: 0, credit: 0 };
    existing.debit += Number(line.debit) || 0;
    existing.credit += Number(line.credit) || 0;
    balanceMap.set(line.account_id, existing);
  }

  const rows = (accountsResult.data ?? []).map((row) => {
    const totals = balanceMap.get(row.id) ?? { debit: 0, credit: 0 };
    // Debit-normal accounts: balance = debits - credits
    // Credit-normal accounts: balance = credits - debits
    const balance =
      row.normal_balance === "debit"
        ? totals.debit - totals.credit
        : totals.credit - totals.debit;
    return { ...row, balance } as AccountRow;
  });

  return buildAccountTree(rows);
}

function buildAccountTree(accounts: AccountRow[]): AccountTreeNode[] {
  const map = new Map<string, AccountTreeNode>();

  // Initialize all nodes
  for (const account of accounts) {
    map.set(account.id, { ...account, children: [] });
  }

  const roots: AccountTreeNode[] = [];

  // Build parent-child relationships
  for (const account of accounts) {
    const node = map.get(account.id)!;
    if (account.parent_id && map.has(account.parent_id)) {
      map.get(account.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

export async function createAccount(
  supabase: SupabaseClient,
  companyId: string,
  data: AccountCreateData
): Promise<{ id: string } | null> {
  const { data: result, error } = await supabase
    .from("chart_of_accounts")
    .insert({
      company_id: companyId,
      account_number: data.account_number,
      name: data.name,
      account_type: data.account_type,
      sub_type: data.sub_type ?? null,
      parent_id: data.parent_id ?? null,
      description: data.description ?? null,
      normal_balance: data.normal_balance,
      is_active: true,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Error creating account:", error);
    return null;
  }

  return result as { id: string };
}

/* ------------------------------------------------------------------
   Job Costing
   ------------------------------------------------------------------ */

export async function getJobCostingSummary(
  supabase: SupabaseClient,
  companyId: string,
  projectId: string
): Promise<JobCostingSummary> {
  let lines: BudgetLineRow[];
  try {
    lines = await paginatedQuery<BudgetLineRow>((from, to) =>
      supabase
        .from("project_budget_lines")
        .select("*")
        .eq("company_id", companyId)
        .eq("project_id", projectId)
        .order("csi_code", { ascending: true })
        .range(from, to)
    );
  } catch (err) {
    console.error("Error fetching job costing:", err);
    return { lines: [], totalBudgeted: 0, totalCommitted: 0, totalActual: 0, totalVariance: 0 };
  }

  const totalBudgeted = lines.reduce((sum, l) => sum + (l.budgeted_amount ?? 0), 0);
  const totalCommitted = lines.reduce((sum, l) => sum + (l.committed_amount ?? 0), 0);
  const totalActual = lines.reduce((sum, l) => sum + (l.actual_amount ?? 0), 0);
  const totalVariance = lines.reduce((sum, l) => sum + (l.variance ?? 0), 0);

  return { lines, totalBudgeted, totalCommitted, totalActual, totalVariance };
}

/* ------------------------------------------------------------------
   Budget Actuals Sync from Invoices
   Queries all non-voided invoices for a project, sums line_items by
   CSI code, and updates matching project_budget_lines.actual_amount.
   ------------------------------------------------------------------ */

export async function syncBudgetActualsFromInvoices(
  supabase: SupabaseClient,
  companyId: string,
  projectId: string
): Promise<{ updatedCount: number }> {
  // Get all non-voided invoices for this project
  const { data: invoices, error: invErr } = await supabase
    .from("invoices")
    .select("id, line_items, total_amount")
    .eq("company_id", companyId)
    .eq("project_id", projectId)
    .not("status", "eq", "voided");

  if (invErr) {
    console.error("syncBudgetActuals - invoice query error:", invErr);
    return { updatedCount: 0 };
  }

  // Sum amounts by CSI code from invoice line_items
  const csiTotals = new Map<string, number>();
  for (const inv of invoices ?? []) {
    const items = inv.line_items as { csi_code?: string; amount?: number; quantity?: number; unit_price?: number }[] | null;
    if (!items || !Array.isArray(items)) continue;
    for (const item of items) {
      if (!item.csi_code) continue;
      const code = item.csi_code.trim();
      if (!code) continue;
      const amount = item.amount ?? ((item.quantity ?? 0) * (item.unit_price ?? 0));
      csiTotals.set(code, (csiTotals.get(code) ?? 0) + (Number(amount) || 0));
    }
  }

  if (csiTotals.size === 0) {
    return { updatedCount: 0 };
  }

  // Get existing budget lines for this project
  const { data: budgetLines, error: blErr } = await supabase
    .from("project_budget_lines")
    .select("id, csi_code")
    .eq("company_id", companyId)
    .eq("project_id", projectId);

  if (blErr) {
    console.error("syncBudgetActuals - budget line query error:", blErr);
    return { updatedCount: 0 };
  }

  // Update each budget line's actual_amount
  let updatedCount = 0;
  for (const bl of budgetLines ?? []) {
    const actualAmount = csiTotals.get(bl.csi_code);
    if (actualAmount === undefined) continue;

    const { error: updateErr } = await supabase
      .from("project_budget_lines")
      .update({ actual_amount: actualAmount, updated_at: new Date().toISOString() })
      .eq("id", bl.id);

    if (!updateErr) updatedCount++;
  }

  return { updatedCount };
}

/* ------------------------------------------------------------------
   Aging Buckets
   ------------------------------------------------------------------ */

export interface AgingBucket {
  label: string;
  arAmount: number;
  apAmount: number;
}

export async function getAgingBuckets(
  supabase: SupabaseClient,
  companyId: string
): Promise<AgingBucket[]> {
  const now = new Date();

  // Fetch all invoices with outstanding balance (includes paid with retainage)
  let data: { invoice_type: string; due_date: string; balance_due: number }[];
  try {
    data = await paginatedQuery<{ invoice_type: string; due_date: string; balance_due: number }>((from, to) =>
      supabase
        .from("invoices")
        .select("invoice_type, due_date, balance_due")
        .eq("company_id", companyId)
        .not("status", "eq", "voided")
        .gt("balance_due", 0)
        .range(from, to)
    );
  } catch (err) {
    console.error("Error fetching aging data:", err);
    return defaultBuckets();
  }

  const buckets = defaultBuckets();

  for (const row of data ?? []) {
    const dueDate = new Date(row.due_date);
    const daysOverdue = Math.floor(
      (now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const amount = row.balance_due ?? 0;

    // Aging convention: "0-30 days" = Current (due within 30 days or not yet overdue).
    // Boundaries are inclusive on the upper end: a 30-day-old invoice is in bucket 0,
    // a 31-day-old invoice moves to bucket 1. This matches standard AP/AR aging reports.
    let bucketIndex: number;
    if (daysOverdue <= 30) {
      bucketIndex = 0;
    } else if (daysOverdue <= 60) {
      bucketIndex = 1;
    } else if (daysOverdue <= 90) {
      bucketIndex = 2;
    } else {
      bucketIndex = 3;
    }

    if (row.invoice_type === "receivable") {
      buckets[bucketIndex].arAmount += amount;
    } else {
      buckets[bucketIndex].apAmount += amount;
    }
  }

  return buckets;
}

function defaultBuckets(): AgingBucket[] {
  return [
    { label: "0-30 days", arAmount: 0, apAmount: 0 },
    { label: "31-60 days", arAmount: 0, apAmount: 0 },
    { label: "61-90 days", arAmount: 0, apAmount: 0 },
    { label: "90+ days", arAmount: 0, apAmount: 0 },
  ];
}

/* ------------------------------------------------------------------
   Monthly Income vs Expenses (last 6 months)
   ------------------------------------------------------------------ */

export interface MonthlyFinancial {
  month: string;
  income: number;
  expenses: number;
}

export async function getMonthlyIncomeExpenses(
  supabase: SupabaseClient,
  companyId: string
): Promise<MonthlyFinancial[]> {
  const now = new Date();
  // Compute date range: 6 months ago to today
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const startISO = sixMonthsAgo.toISOString();

  // Fetch ALL invoices for the 6-month window in just 2 parallel queries (was 12 sequential)
  const [incomeRes, expenseRes] = await Promise.all([
    supabase
      .from("invoices")
      .select("total_amount, invoice_date")
      .eq("company_id", companyId)
      .eq("invoice_type", "receivable")
      .neq("status", "voided")
      .gte("invoice_date", startISO),
    supabase
      .from("invoices")
      .select("total_amount, invoice_date")
      .eq("company_id", companyId)
      .eq("invoice_type", "payable")
      .neq("status", "voided")
      .gte("invoice_date", startISO),
  ]);

  // Group by month in JS
  const incomeByMonth = new Map<string, number>();
  const expenseByMonth = new Map<string, number>();

  for (const row of incomeRes.data ?? []) {
    const d = new Date(row.invoice_date);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    incomeByMonth.set(key, (incomeByMonth.get(key) ?? 0) + (Number(row.total_amount) || 0));
  }
  for (const row of expenseRes.data ?? []) {
    const d = new Date(row.invoice_date);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    expenseByMonth.set(key, (expenseByMonth.get(key) ?? 0) + (Number(row.total_amount) || 0));
  }

  // Build the 6-month result array
  const months: MonthlyFinancial[] = [];
  for (let i = 5; i >= 0; i--) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = formatDateSafe(toDateStr(monthDate));
    const key = `${monthDate.getFullYear()}-${monthDate.getMonth()}`;
    months.push({
      month: label,
      income: incomeByMonth.get(key) ?? 0,
      expenses: expenseByMonth.get(key) ?? 0,
    });
  }

  return months;
}

/**
 * Creates a journal entry directly in "posted" status.
 * Used for system-generated entries (invoice/payment accounting)
 * where the draft→post workflow is not needed.
 */
export async function createPostedJournalEntry(
  supabase: SupabaseClient,
  companyId: string,
  userId: string,
  data: JournalEntryCreateData
): Promise<{ id: string } | null> {
  const totalDebit = data.lines.reduce((sum, l) => sum + (l.debit ?? 0), 0);
  const totalCredit = data.lines.reduce((sum, l) => sum + (l.credit ?? 0), 0);

  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    console.error("Posted journal entry not balanced:", { totalDebit, totalCredit });
    return null;
  }

  const { data: entry, error: entryErr } = await supabase
    .from("journal_entries")
    .insert({
      company_id: companyId,
      entry_number: data.entry_number,
      entry_date: data.entry_date,
      description: data.description,
      reference: data.reference ?? null,
      project_id: data.project_id ?? null,
      status: "posted",
      created_by: userId,
      posted_by: userId,
      posted_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (entryErr || !entry) {
    console.error("Error creating posted journal entry:", entryErr);
    return null;
  }

  const lineInserts = data.lines.map((line) => ({
    company_id: companyId,
    journal_entry_id: entry.id,
    account_id: line.account_id,
    debit: line.debit ?? 0,
    credit: line.credit ?? 0,
    description: line.description ?? null,
    project_id: line.project_id ?? null,
    property_id: line.property_id ?? null,
  }));

  const { error: linesErr } = await supabase
    .from("journal_entry_lines")
    .insert(lineInserts);

  if (linesErr) {
    console.error("Error creating posted JE lines:", linesErr);
    await supabase.from("journal_entries").delete().eq("id", entry.id);
    return null;
  }

  return { id: entry.id };
}

/**
 * Bulk-create posted journal entries in two batch DB calls instead of 2×N.
 * 1. Batch insert all JE headers → get IDs
 * 2. Map IDs to lines → batch insert all lines (chunked at 500)
 */
export async function createBulkPostedJournalEntries(
  supabase: SupabaseClient,
  companyId: string,
  userId: string,
  entries: JournalEntryCreateData[]
): Promise<{ ids: string[]; errorCount: number }> {
  if (entries.length === 0) return { ids: [], errorCount: 0 };

  // Validate balance for each entry, filter out unbalanced
  const valid: JournalEntryCreateData[] = [];
  let errorCount = 0;
  for (const e of entries) {
    const totalDebit = e.lines.reduce((s, l) => s + (l.debit ?? 0), 0);
    const totalCredit = e.lines.reduce((s, l) => s + (l.credit ?? 0), 0);
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      console.warn("Bulk JE skipped (unbalanced):", e.entry_number, { totalDebit, totalCredit });
      errorCount++;
    } else {
      valid.push(e);
    }
  }

  if (valid.length === 0) return { ids: [], errorCount };

  const now = new Date().toISOString();
  const headerInserts = valid.map((e) => ({
    company_id: companyId,
    entry_number: e.entry_number,
    entry_date: e.entry_date,
    description: e.description,
    reference: e.reference ?? null,
    project_id: e.project_id ?? null,
    status: "posted",
    created_by: userId,
    posted_by: userId,
    posted_at: now,
  }));

  // Batch insert headers (chunk at 500 for Supabase payload limits)
  const allInserted: { id: string }[] = [];
  for (let i = 0; i < headerInserts.length; i += 500) {
    const chunk = headerInserts.slice(i, i + 500);
    const { data, error } = await supabase
      .from("journal_entries")
      .insert(chunk)
      .select("id");
    if (error) {
      console.error("Bulk JE header insert failed:", error);
      errorCount += chunk.length;
      continue;
    }
    if (data) allInserted.push(...data);
  }

  if (allInserted.length === 0) return { ids: [], errorCount };

  // Map IDs back to lines — allInserted order matches insertion order
  const allLines: Array<{
    company_id: string;
    journal_entry_id: string;
    account_id: string;
    debit: number;
    credit: number;
    description: string | null;
    project_id: string | null;
    property_id: string | null;
  }> = [];

  // Track which valid entries got inserted (skip ones that failed in chunking)
  let insertIdx = 0;
  for (const entry of valid) {
    if (insertIdx >= allInserted.length) break;
    const jeId = allInserted[insertIdx].id;
    for (const line of entry.lines) {
      allLines.push({
        company_id: companyId,
        journal_entry_id: jeId,
        account_id: line.account_id,
        debit: line.debit ?? 0,
        credit: line.credit ?? 0,
        description: line.description ?? null,
        project_id: line.project_id ?? null,
        property_id: line.property_id ?? null,
      });
    }
    insertIdx++;
  }

  // Batch insert lines (chunk at 500)
  for (let i = 0; i < allLines.length; i += 500) {
    const chunk = allLines.slice(i, i + 500);
    const { error } = await supabase.from("journal_entry_lines").insert(chunk);
    if (error) {
      console.error("Bulk JE lines insert failed at chunk", i, error);
    }
  }

  return { ids: allInserted.map((e) => e.id), errorCount };
}

export async function postJournalEntry(
  supabase: SupabaseClient,
  entryId: string,
  userId: string
): Promise<boolean> {
  const { error } = await supabase
    .from("journal_entries")
    .update({
      status: "posted",
      posted_by: userId,
      posted_at: new Date().toISOString(),
    })
    .eq("id", entryId)
    .eq("status", "draft");

  if (error) {
    console.error("Error posting journal entry:", error);
    return false;
  }
  return true;
}

export async function voidJournalEntry(
  supabase: SupabaseClient,
  entryId: string
): Promise<boolean> {
  const { error } = await supabase
    .from("journal_entries")
    .update({ status: "voided" })
    .eq("id", entryId);

  if (error) {
    console.error("Error voiding journal entry:", error);
    return false;
  }
  return true;
}

/* ==================================================================
   TRIAL BALANCE
   ================================================================== */

export interface TrialBalanceRow {
  account_id: string;
  account_number: string;
  account_name: string;
  account_type: string;
  total_debit: number;
  total_credit: number;
  balance: number;
}

export async function getTrialBalance(
  supabase: SupabaseClient,
  companyId: string,
  asOfDate?: string
): Promise<TrialBalanceRow[]> {
  // Use !inner join + pagination to fetch ALL posted JE lines
  // (Supabase defaults to 1000 rows — real datasets easily exceed this)
  const lines = await paginatedQuery<{
    account_id: string; debit: number; credit: number;
    chart_of_accounts: { account_number: string; name: string; account_type: string } | null;
    journal_entries: { status: string; entry_date: string };
  }>(((from: number, to: number) => {
    let q = supabase
      .from("journal_entry_lines")
      .select("account_id, debit, credit, chart_of_accounts(account_number, name, account_type), journal_entries!inner(status, entry_date)")
      .eq("company_id", companyId)
      .eq("journal_entries.status", "posted");
    if (asOfDate) q = q.lte("journal_entries.entry_date", asOfDate);
    return q.range(from, to);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any);

  if (lines.length === 0) {
    return [];
  }

  // Aggregate by account
  const accountMap = new Map<
    string,
    { account_number: string; account_name: string; account_type: string; debit: number; credit: number }
  >();

  for (const line of lines) {
    const account = line.chart_of_accounts;
    if (!account) continue;

    const existing = accountMap.get(line.account_id) ?? {
      account_number: account.account_number,
      account_name: account.name,
      account_type: account.account_type,
      debit: 0,
      credit: 0,
    };

    existing.debit += line.debit ?? 0;
    existing.credit += line.credit ?? 0;
    accountMap.set(line.account_id, existing);
  }

  const result: TrialBalanceRow[] = [];
  for (const [accountId, data] of accountMap) {
    result.push({
      account_id: accountId,
      account_number: data.account_number,
      account_name: data.account_name,
      account_type: data.account_type,
      total_debit: data.debit,
      total_credit: data.credit,
      balance: data.debit - data.credit,
    });
  }

  result.sort((a, b) => a.account_number.localeCompare(b.account_number));
  return result;
}

/* ==================================================================
   INCOME STATEMENT (P&L)
   ================================================================== */

export interface IncomeStatementLine {
  account_id?: string;
  account_number: string;
  name: string;
  amount: number;
}

export interface IncomeStatementSection {
  label: string;
  accounts: IncomeStatementLine[];
  total: number;
}

export interface IncomeStatementData {
  revenue: IncomeStatementSection;
  costOfConstruction: IncomeStatementSection;
  grossProfit: number;
  operatingExpenses: IncomeStatementSection;
  netIncome: number;
  startDate: string;
  endDate: string;
}

export async function getIncomeStatement(
  supabase: SupabaseClient,
  companyId: string,
  startDate: string,
  endDate: string
): Promise<IncomeStatementData> {
  // Try journal entries first (proper double-entry)
  const trialBalance = await getTrialBalanceDateRange(supabase, companyId, startDate, endDate);

  const revenue: IncomeStatementLine[] = [];
  const cogs: IncomeStatementLine[] = [];
  const opex: IncomeStatementLine[] = [];

  for (const row of trialBalance) {
    const num = parseInt(row.account_number);
    // Classify by account_type (authoritative), not number ranges, to support
    // custom chart of accounts structures. Number ranges are only used for the
    // COGS vs OpEx sub-split within the expense type.
    if (row.account_type === "revenue") {
      // Revenue accounts have credit normal balance, so amount = credit - debit
      revenue.push({ account_id: row.account_id, account_number: row.account_number, name: row.account_name, amount: row.credit - row.debit });
    } else if (row.account_type === "expense") {
      // COGS sub-split: accounts 5000-5999 are Cost of Goods Sold
      if (num >= 5000 && num < 6000) {
        cogs.push({ account_id: row.account_id, account_number: row.account_number, name: row.account_name, amount: row.debit - row.credit });
      } else {
        opex.push({ account_id: row.account_id, account_number: row.account_number, name: row.account_name, amount: row.debit - row.credit });
      }
    }
  }

  let totalRevenue = revenue.reduce((sum, a) => sum + a.amount, 0);
  let totalCOGS = cogs.reduce((sum, a) => sum + a.amount, 0);
  let totalOpex = opex.reduce((sum, a) => sum + a.amount, 0);

  // Fallback to invoice-based if no journal entries
  if (trialBalance.length === 0) {
    const [revRes, expRes] = await Promise.all([
      supabase
        .from("invoices")
        .select("total_amount")
        .eq("company_id", companyId)
        .eq("invoice_type", "receivable")
        .not("status", "eq", "voided")
        .gte("invoice_date", startDate)
        .lte("invoice_date", endDate),
      supabase
        .from("invoices")
        .select("total_amount")
        .eq("company_id", companyId)
        .eq("invoice_type", "payable")
        .not("status", "eq", "voided")
        .gte("invoice_date", startDate)
        .lte("invoice_date", endDate),
    ]);

    totalRevenue = (revRes.data ?? []).reduce((s: number, r: { total_amount: number }) => s + (r.total_amount ?? 0), 0);
    totalCOGS = (expRes.data ?? []).reduce((s: number, r: { total_amount: number }) => s + (r.total_amount ?? 0), 0);

    if (totalRevenue > 0) revenue.push({ account_number: "4000", name: "Construction Revenue (from invoices)", amount: totalRevenue });
    if (totalCOGS > 0) cogs.push({ account_number: "5000", name: "Cost of Construction (from invoices)", amount: totalCOGS });
  }

  const grossProfit = totalRevenue - totalCOGS;

  return {
    revenue: { label: "Revenue", accounts: revenue, total: totalRevenue },
    costOfConstruction: { label: "Cost of Construction", accounts: cogs, total: totalCOGS },
    grossProfit,
    operatingExpenses: { label: "Operating Expenses", accounts: opex, total: totalOpex },
    netIncome: grossProfit - totalOpex,
    startDate,
    endDate,
  };
}

// Helper: trial balance for a date range (income/expense accounts only)
async function getTrialBalanceDateRange(
  supabase: SupabaseClient,
  companyId: string,
  startDate: string,
  endDate: string
): Promise<{ account_id: string; account_number: string; account_name: string; account_type: string; debit: number; credit: number }[]> {
  // Paginated !inner join — avoids both URL-length and 1000-row limit issues
  const lines = await paginatedQuery<{
    account_id: string; debit: number; credit: number;
    chart_of_accounts: { account_number: string; name: string; account_type: string } | null;
    journal_entries: { status: string; entry_date: string };
  }>((from, to) =>
    supabase
      .from("journal_entry_lines")
      .select("account_id, debit, credit, chart_of_accounts(account_number, name, account_type), journal_entries!inner(status, entry_date)")
      .eq("company_id", companyId)
      .eq("journal_entries.status", "posted")
      .gte("journal_entries.entry_date", startDate)
      .lte("journal_entries.entry_date", endDate)
      .range(from, to)
  );

  if (lines.length === 0) return [];

  const accountMap = new Map<string, { account_number: string; account_name: string; account_type: string; debit: number; credit: number }>();

  for (const line of lines) {
    const account = line.chart_of_accounts;
    if (!account) continue;

    const existing = accountMap.get(line.account_id) ?? {
      account_number: account.account_number,
      account_name: account.name,
      account_type: account.account_type,
      debit: 0,
      credit: 0,
    };
    existing.debit += line.debit ?? 0;
    existing.credit += line.credit ?? 0;
    accountMap.set(line.account_id, existing);
  }

  return Array.from(accountMap.entries()).map(([accountId, data]) => ({
    account_id: accountId,
    ...data,
  })).sort((a, b) => a.account_number.localeCompare(b.account_number));
}

/* ==================================================================
   BALANCE SHEET
   ================================================================== */

export interface BalanceSheetSection {
  label: string;
  accounts: IncomeStatementLine[];
  total: number;
}

export interface BalanceSheetData {
  assets: BalanceSheetSection;
  liabilities: BalanceSheetSection;
  equity: BalanceSheetSection;
  totalLiabilitiesAndEquity: number;
  isBalanced: boolean;
  asOfDate: string;
}

export async function getBalanceSheet(
  supabase: SupabaseClient,
  companyId: string,
  asOfDate: string
): Promise<BalanceSheetData> {
  const trialBalance = await getTrialBalance(supabase, companyId, asOfDate);

  const assets: IncomeStatementLine[] = [];
  const liabilities: IncomeStatementLine[] = [];
  const equity: IncomeStatementLine[] = [];
  let totalRevenue = 0;
  let totalExpenses = 0;

  for (const row of trialBalance) {
    if (row.account_type === "asset") {
      // Assets have debit normal balance
      assets.push({ account_id: row.account_id, account_number: row.account_number, name: row.account_name, amount: row.total_debit - row.total_credit });
    } else if (row.account_type === "liability") {
      // Liabilities have credit normal balance
      liabilities.push({ account_id: row.account_id, account_number: row.account_number, name: row.account_name, amount: row.total_credit - row.total_debit });
    } else if (row.account_type === "equity") {
      equity.push({ account_id: row.account_id, account_number: row.account_number, name: row.account_name, amount: row.total_credit - row.total_debit });
    } else if (row.account_type === "revenue") {
      // Revenue has credit normal balance
      totalRevenue += row.total_credit - row.total_debit;
    } else if (row.account_type === "expense") {
      // Expenses have debit normal balance
      totalExpenses += row.total_debit - row.total_credit;
    }
  }

  // Net Income (Revenue - Expenses) flows into Equity as Retained Earnings
  // This is essential for the accounting equation: Assets = Liabilities + Equity
  // IMPORTANT: If a real "Retained Earnings" account (3200) already exists in the
  // trial balance, it was pushed into equity[] above. Adding another synthetic line
  // would double-count net income. In that case we show "Net Income (Current Period)"
  // to represent un-closed temporary accounts without duplicating retained earnings.
  if (trialBalance.length > 0) {
    const netIncome = totalRevenue - totalExpenses;
    if (Math.abs(netIncome) > 0.01) {
      const hasRetainedEarnings = equity.some(
        e => e.account_number === "3200" ||
          e.name.toLowerCase().includes("retained earnings")
      );
      equity.push({
        account_number: hasRetainedEarnings ? "" : "3200",
        name: hasRetainedEarnings ? "Net Income (Current Period)" : "Retained Earnings (Computed)",
        amount: netIncome,
      });
    }
  }

  // Fallback: use live data if no journal entries
  if (trialBalance.length === 0) {
    const [bankRes, arRes, apRes, allRevenueRes, allExpenseRes] = await Promise.all([
      supabase.from("bank_accounts").select("current_balance").eq("company_id", companyId),
      supabase.from("invoices").select("balance_due").eq("company_id", companyId).eq("invoice_type", "receivable").not("status", "eq", "voided").not("status", "eq", "paid"),
      supabase.from("invoices").select("balance_due").eq("company_id", companyId).eq("invoice_type", "payable").not("status", "eq", "voided").not("status", "eq", "paid"),
      // All-time revenue and expenses for Retained Earnings
      supabase.from("invoices").select("total_amount").eq("company_id", companyId).eq("invoice_type", "receivable").not("status", "eq", "voided"),
      supabase.from("invoices").select("total_amount").eq("company_id", companyId).eq("invoice_type", "payable").not("status", "eq", "voided"),
    ]);

    const cashTotal = (bankRes.data ?? []).reduce((s, r) => s + (r.current_balance ?? 0), 0);
    const arTotal = (arRes.data ?? []).reduce((s, r) => s + (r.balance_due ?? 0), 0);
    const apTotal = (apRes.data ?? []).reduce((s, r) => s + (r.balance_due ?? 0), 0);

    // Assets
    if (cashTotal > 0) assets.push({ account_number: "1000", name: "Cash & Equivalents", amount: cashTotal });
    if (arTotal > 0) assets.push({ account_number: "1100", name: "Accounts Receivable", amount: arTotal });

    // Liabilities
    if (apTotal > 0) liabilities.push({ account_number: "2000", name: "Accounts Payable", amount: apTotal });

    // Equity: Retained Earnings = All-time Revenue - All-time Expenses
    const allTimeRevenue = (allRevenueRes.data ?? []).reduce((s: number, r: { total_amount: number }) => s + (r.total_amount ?? 0), 0);
    const allTimeExpenses = (allExpenseRes.data ?? []).reduce((s: number, r: { total_amount: number }) => s + (r.total_amount ?? 0), 0);
    const retainedEarnings = allTimeRevenue - allTimeExpenses;

    if (retainedEarnings !== 0) {
      equity.push({ account_number: "3200", name: "Retained Earnings", amount: retainedEarnings });
    }

    // Owner's Equity / Capital = Total Assets - Total Liabilities - Retained Earnings
    // This is the balancing figure representing initial investment and capital contributions
    const totalAssetsCalc = cashTotal + arTotal;
    const ownersCapital = totalAssetsCalc - apTotal - retainedEarnings;
    if (Math.abs(ownersCapital) > 0.01) {
      equity.push({ account_number: "3000", name: "Owner's Equity / Capital", amount: ownersCapital });
    }
  }

  const totalAssets = assets.reduce((sum, a) => sum + a.amount, 0);
  const totalLiabilities = liabilities.reduce((sum, a) => sum + a.amount, 0);
  const totalEquity = equity.reduce((sum, a) => sum + a.amount, 0);
  const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;

  return {
    assets: { label: "Assets", accounts: assets, total: totalAssets },
    liabilities: { label: "Liabilities", accounts: liabilities, total: totalLiabilities },
    equity: { label: "Equity", accounts: equity, total: totalEquity },
    totalLiabilitiesAndEquity,
    isBalanced: Math.abs(totalAssets - totalLiabilitiesAndEquity) < 0.01,
    asOfDate,
  };
}

/* ==================================================================
   CASH FLOW STATEMENT (3-section format)
   ================================================================== */

export interface CashFlowSection {
  label: string;
  amount: number;
  account_id?: string;
}

export interface CashFlowStatementData {
  operating: CashFlowSection[];
  netOperating: number;
  investing: CashFlowSection[];
  netInvesting: number;
  financing: CashFlowSection[];
  netFinancing: number;
  netChange: number;
  beginningCash: number;
  endingCash: number;
}

export async function getCashFlowStatement(
  supabase: SupabaseClient,
  companyId: string,
  startDate: string,
  endDate: string
): Promise<CashFlowStatementData> {
  // Calculate net income for the period
  const incomeStatement = await getIncomeStatement(supabase, companyId, startDate, endDate);
  const netIncome = incomeStatement.netIncome;

  // Get AR/AP changes during the period (paginated to avoid 1000-row limit)
  // AR at start vs AR at end
  const [arStartRows, arEndRows, apStartRows, apEndRows] = await Promise.all([
    paginatedQuery<{ balance_due: number }>((from, to) =>
      supabase.from("invoices").select("balance_due").eq("company_id", companyId)
        .eq("invoice_type", "receivable").not("status", "eq", "voided").lte("invoice_date", startDate).range(from, to)),
    paginatedQuery<{ balance_due: number }>((from, to) =>
      supabase.from("invoices").select("balance_due").eq("company_id", companyId)
        .eq("invoice_type", "receivable").not("status", "eq", "voided").lte("invoice_date", endDate).range(from, to)),
    paginatedQuery<{ balance_due: number }>((from, to) =>
      supabase.from("invoices").select("balance_due").eq("company_id", companyId)
        .eq("invoice_type", "payable").not("status", "eq", "voided").lte("invoice_date", startDate).range(from, to)),
    paginatedQuery<{ balance_due: number }>((from, to) =>
      supabase.from("invoices").select("balance_due").eq("company_id", companyId)
        .eq("invoice_type", "payable").not("status", "eq", "voided").lte("invoice_date", endDate).range(from, to)),
  ]);

  const arStart = arStartRows.reduce((s, r) => s + (r.balance_due ?? 0), 0);
  const arEnd = arEndRows.reduce((s, r) => s + (r.balance_due ?? 0), 0);
  const apStart = apStartRows.reduce((s, r) => s + (r.balance_due ?? 0), 0);
  const apEnd = apEndRows.reduce((s, r) => s + (r.balance_due ?? 0), 0);

  const arChange = -(arEnd - arStart); // Decrease in AR = cash inflow
  const apChange = apEnd - apStart; // Increase in AP = cash inflow

  const operating: CashFlowSection[] = [
    { label: "Net Income", amount: netIncome },
    { label: "Changes in Accounts Receivable", amount: arChange },
    { label: "Changes in Accounts Payable", amount: apChange },
  ];

  // Investing activities — pull from journal entries hitting fixed asset accounts (1500-1999 range)
  const investing: CashFlowSection[] = [];
  let netInvesting = 0;

  // Financing activities — pull from journal entries hitting debt (2100-2399) and equity (3000-3299) accounts
  const financing: CashFlowSection[] = [];
  let netFinancing = 0;

  // Paginated query for investing and financing activities
  {
    const cfLines = await paginatedQuery<{
      debit: number; credit: number;
      chart_of_accounts: { account_number: string; name: string; account_type: string; sub_type: string } | null;
      journal_entries: { status: string; entry_date: string; entry_number: string; reference: string | null };
    }>((from, to) =>
      supabase
        .from("journal_entry_lines")
        .select("debit, credit, chart_of_accounts(account_number, name, account_type, sub_type), journal_entries!inner(status, entry_date, entry_number, reference)")
        .eq("company_id", companyId)
        .eq("journal_entries.status", "posted")
        .gte("journal_entries.entry_date", startDate)
        .lte("journal_entries.entry_date", endDate)
        .range(from, to)
    );

    const investingMap = new Map<string, number>();
    const financingMap = new Map<string, number>();
    const workingCapitalMap = new Map<string, number>();

    for (const line of cfLines) {
      const account = line.chart_of_accounts;
      if (!account) continue;

      // Skip opening balance / bank sync JEs — these represent starting positions,
      // not period cash activity (equipment/debt/equity OBs distort Investing/Financing).
      // Generator OB entries use "{PREFIX}-OB-{N}" (e.g., MBG-OB-001).
      // Bank sync uses "JE-OB-BANK-*" / "JE-OBE-CASH-*" with matching references.
      // Exclude invoice/payment JEs derived from OB invoices (JE-INV-*, JE-PMT-*).
      const je = line.journal_entries;
      const ref = je.reference ?? "";
      const entryNum = je.entry_number ?? "";
      if (
        (entryNum.includes("-OB-") && !entryNum.startsWith("JE-INV-") && !entryNum.startsWith("JE-PMT-")) ||
        ref.startsWith("opening_balance:") ||
        ref.startsWith("obe_cash_adj:")
      ) {
        continue;
      }

      const num = parseInt(account.account_number);
      const netAmount = (line.debit ?? 0) - (line.credit ?? 0);
      const nameLower = account.name.toLowerCase();

      // Fixed assets (investing): accounts 1500-1999 or sub_type 'fixed_asset'/'contra_asset'
      if (account.sub_type === "fixed_asset" || account.sub_type === "contra_asset" ||
          (num >= 1500 && num < 2000)) {
        const label = account.name;
        investingMap.set(label, (investingMap.get(label) ?? 0) + netAmount);
      }

      // Debt accounts (financing): accounts 2100-2399 or sub_type 'long_term_liability'
      else if (account.sub_type === "long_term_liability" || (num >= 2100 && num < 2400)) {
        const label = account.name;
        // Credit to liability = cash inflow (loan draw), Debit = cash outflow (repayment)
        financingMap.set(label, (financingMap.get(label) ?? 0) - netAmount);
      }

      // Equity accounts (financing): accounts 3000-3299 excluding retained earnings
      else if (account.account_type === "equity" && num >= 3000 && num < 3200) {
        const label = account.name;
        financingMap.set(label, (financingMap.get(label) ?? 0) - netAmount);
      }

      // Working capital: payment clearing accounts, rent receivable, prepaid
      // (current assets 1050-1499 that aren't Cash/Checking/Savings/AR)
      else if (
        account.sub_type === "current_asset" &&
        num >= 1050 && num < 1500 &&
        !nameLower.includes("cash") &&
        !nameLower.includes("checking") &&
        !nameLower.includes("savings")
      ) {
        // Increase in current asset = cash used (negative for operating)
        workingCapitalMap.set(account.name, (workingCapitalMap.get(account.name) ?? 0) + netAmount);
      }
    }

    for (const [label, amount] of investingMap) {
      if (Math.abs(amount) > 0.01) {
        // Investing: asset purchase is DR to asset (positive netAmount) = cash outflow (negative)
        investing.push({ label, amount: -amount });
        netInvesting -= amount;
      }
    }
    for (const [label, amount] of financingMap) {
      if (Math.abs(amount) > 0.01) {
        financing.push({ label, amount });
        netFinancing += amount;
      }
    }

    // Add working capital changes to operating section
    for (const [label, amount] of workingCapitalMap) {
      if (Math.abs(amount) > 0.01) {
        // Increase in asset = cash outflow (negative), decrease = cash inflow (positive)
        operating.push({ label: `Changes in ${label}`, amount: -amount });
      }
    }
  }

  const netOperating = operating.reduce((s, i) => s + i.amount, 0);
  const netChange = netOperating + netInvesting + netFinancing;

  // Get current cash position
  const { data: bankData } = await supabase
    .from("bank_accounts")
    .select("current_balance")
    .eq("company_id", companyId);

  const endingCash = (bankData ?? []).reduce((s, r) => s + (r.current_balance ?? 0), 0);
  const beginningCash = endingCash - netChange;

  return {
    operating,
    netOperating,
    investing,
    netInvesting,
    financing,
    netFinancing,
    netChange,
    beginningCash,
    endingCash,
  };
}

/* ==================================================================
   BANK ACCOUNTS
   ================================================================== */

export interface BankAccountRow {
  id: string;
  name: string;
  bank_name: string;
  account_number_last4: string | null;
  routing_number_last4: string | null;
  account_type: string;
  current_balance: number;
  is_default: boolean;
  gl_account_id: string | null;
  created_at: string;
}

export interface BankAccountCreateData {
  name: string;
  bank_name: string;
  account_number_last4?: string;
  routing_number_last4?: string;
  account_type: string;
  current_balance: number;
  is_default?: boolean;
  gl_account_id?: string;
}

export async function getBankAccounts(
  supabase: SupabaseClient,
  companyId: string
): Promise<BankAccountRow[]> {
  const { data, error } = await supabase
    .from("bank_accounts")
    .select("*")
    .eq("company_id", companyId)
    .order("is_default", { ascending: false })
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching bank accounts:", error);
    return [];
  }
  return (data ?? []) as BankAccountRow[];
}

export async function createBankAccount(
  supabase: SupabaseClient,
  companyId: string,
  data: BankAccountCreateData
): Promise<{ id: string } | null> {
  const { data: result, error } = await supabase
    .from("bank_accounts")
    .insert({
      company_id: companyId,
      name: data.name,
      bank_name: data.bank_name,
      account_number_last4: data.account_number_last4 ?? null,
      routing_number_last4: data.routing_number_last4 ?? null,
      account_type: data.account_type,
      current_balance: data.current_balance,
      is_default: data.is_default ?? false,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Error creating bank account:", error);
    return null;
  }
  return result as { id: string };
}

/* ==================================================================
   FINANCIAL KPIs
   ================================================================== */

export interface FinancialKPIs {
  currentRatio: number | null;
  quickRatio: number | null;
  debtToEquity: number | null;
  grossMargin: number | null;
  netProfitMargin: number | null;
  dso: number | null;
  dpo: number | null;
  workingCapital: number;
  revenueGrowth: number | null;
  burnRate: number;
}

export async function getFinancialKPIs(
  supabase: SupabaseClient,
  companyId: string
): Promise<FinancialKPIs> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1).toISOString();

  const [overview, balanceSheet, incomeThisMonth, incomeLastMonth, expLast6] = await Promise.all([
    getFinancialOverview(supabase, companyId),
    getBalanceSheet(supabase, companyId, now.toISOString()),
    getIncomeStatement(supabase, companyId, startOfMonth, endOfMonth),
    getIncomeStatement(supabase, companyId, startOfLastMonth, endOfLastMonth),
    // 6-month average expenses for burn rate
    supabase
      .from("invoices")
      .select("total_amount")
      .eq("company_id", companyId)
      .eq("invoice_type", "payable")
      .not("status", "eq", "voided")
      .gte("invoice_date", sixMonthsAgo)
      .lte("invoice_date", endOfMonth),
  ]);

  const totalAssets = balanceSheet.assets.total;
  const totalLiabilities = balanceSheet.liabilities.total;
  const totalEquity = balanceSheet.equity.total;

  const currentRatio = totalLiabilities > 0 ? totalAssets / totalLiabilities : null;
  const quickRatio = totalLiabilities > 0
    ? (overview.cashPosition + overview.totalAR) / totalLiabilities
    : null;
  const debtToEquity = totalEquity > 0 ? totalLiabilities / totalEquity : null;

  const revenue = incomeThisMonth.revenue.total;
  const cogs = incomeThisMonth.costOfConstruction.total;
  const netIncome = incomeThisMonth.netIncome;

  const grossMargin = revenue > 0 ? ((revenue - cogs) / revenue) * 100 : null;
  const netProfitMargin = revenue > 0 ? (netIncome / revenue) * 100 : null;

  // DSO: (AR / Revenue) * 30 (monthly approximation)
  const dso = revenue > 0 ? (overview.totalAR / revenue) * 30 : null;
  // DPO: (AP / COGS) * 30
  const dpo = cogs > 0 ? (overview.totalAP / cogs) * 30 : null;

  const workingCapital = totalAssets - totalLiabilities;

  // Revenue growth
  const lastMonthRevenue = incomeLastMonth.revenue.total;
  const revenueGrowth = lastMonthRevenue > 0
    ? ((revenue - lastMonthRevenue) / lastMonthRevenue) * 100
    : null;

  // Burn rate (average monthly expenses over last 6 months)
  const totalExpLast6 = (expLast6.data ?? []).reduce(
    (s: number, r: { total_amount: number }) => s + (r.total_amount ?? 0), 0
  );
  const burnRate = totalExpLast6 / 6;

  return {
    currentRatio,
    quickRatio,
    debtToEquity,
    grossMargin,
    netProfitMargin,
    dso,
    dpo,
    workingCapital,
    revenueGrowth,
    burnRate,
  };
}

/* ==================================================================
   ACCOUNT TRANSACTIONS (drill-down from financial reports)
   ================================================================== */

export interface AccountTransactionRow {
  id: string;
  journal_entry_id: string;
  entry_number: string;
  entry_date: string;
  description: string;
  reference: string | null;
  debit: number;
  credit: number;
  line_description: string | null;
}

export interface AccountTransactionsResult {
  transactions: AccountTransactionRow[];
  totalDebit: number;
  totalCredit: number;
  netBalance: number;
  accountName: string;
  accountNumber: string;
  normalBalance: string;
}

export async function getAccountTransactions(
  supabase: SupabaseClient,
  companyId: string,
  accountId: string,
  startDate?: string,
  endDate?: string,
  includeUnposted?: boolean
): Promise<AccountTransactionsResult> {
  // Get account info
  const { data: accountInfo } = await supabase
    .from("chart_of_accounts")
    .select("name, account_number, normal_balance")
    .eq("id", accountId)
    .eq("company_id", companyId)
    .single();

  // Paginated !inner join — avoids both URL-length and 1000-row limit issues
  const lines = await paginatedQuery<{
    id: string; account_id: string; debit: number; credit: number; description: string | null;
    journal_entries: { id: string; entry_number: string; entry_date: string; description: string; reference: string | null; status: string };
  }>((from, to) => {
    let q = supabase
      .from("journal_entry_lines")
      .select(`
        id, account_id, debit, credit, description,
        journal_entries!inner(id, entry_number, entry_date, description, reference, status)
      `)
      .eq("account_id", accountId)
      .eq("company_id", companyId);
    if (!includeUnposted) q = q.eq("journal_entries.status", "posted");
    if (startDate) q = q.gte("journal_entries.entry_date", startDate);
    if (endDate) q = q.lte("journal_entries.entry_date", endDate);
    return q.range(from, to);
  });

  if (lines.length === 0) {
    return {
      transactions: [],
      totalDebit: 0,
      totalCredit: 0,
      netBalance: 0,
      accountName: accountInfo?.name ?? "",
      accountNumber: accountInfo?.account_number ?? "",
      normalBalance: accountInfo?.normal_balance ?? "debit",
    };
  }

  const transactions: AccountTransactionRow[] = [];
  let totalDebit = 0;
  let totalCredit = 0;

  for (const line of lines) {
    const je = line.journal_entries;

    const debit = line.debit ?? 0;
    const credit = line.credit ?? 0;
    totalDebit += debit;
    totalCredit += credit;

    transactions.push({
      id: line.id,
      journal_entry_id: je.id,
      entry_number: je.entry_number,
      entry_date: je.entry_date,
      description: je.description,
      reference: je.reference,
      debit,
      credit,
      line_description: line.description,
    });
  }

  // Sort by entry_date
  transactions.sort((a, b) => a.entry_date.localeCompare(b.entry_date));

  const normalBalance = accountInfo?.normal_balance ?? "debit";
  const netBalance = normalBalance === "debit"
    ? totalDebit - totalCredit
    : totalCredit - totalDebit;

  return {
    transactions,
    totalDebit,
    totalCredit,
    netBalance,
    accountName: accountInfo?.name ?? "",
    accountNumber: accountInfo?.account_number ?? "",
    normalBalance,
  };
}

/* ==================================================================
   AP PAYMENT DASHBOARD
   ================================================================== */

export interface APPaymentRow {
  id: string;
  payment_date: string;
  amount: number;
  method: string;
  reference_number: string | null;
  notes: string | null;
  invoice_id: string;
  invoice_number: string;
  vendor_name: string;
  payment_terms: string | null;
  je_entry_number: string | null;
  je_id: string | null;
  bank_account_name: string | null;
}

export interface VendorPaymentSummary {
  vendor_id: string;
  vendor_name: string;
  total_owed: number;
  total_paid: number;
  invoice_count: number;
  last_payment_date: string | null;
  avg_days_to_pay: number | null;
}

export interface APDashboardData {
  payments: APPaymentRow[];
  vendorSummary: VendorPaymentSummary[];
}

export async function getAPPaymentHistory(
  supabase: SupabaseClient,
  companyId: string,
  filters?: { startDate?: string; endDate?: string }
): Promise<APPaymentRow[]> {
  // Get all payments for payable invoices
  let query = supabase
    .from("payments")
    .select("id, payment_date, amount, method, reference_number, notes, invoice_id, bank_account_id, invoices!inner(invoice_number, vendor_name, payment_terms, invoice_type)")
    .eq("company_id", companyId)
    .eq("invoices.invoice_type", "payable")
    .order("payment_date", { ascending: false });

  if (filters?.startDate) query = query.gte("payment_date", filters.startDate);
  if (filters?.endDate) query = query.lte("payment_date", filters.endDate);

  const { data: payments } = await query;
  if (!payments || payments.length === 0) return [];

  // Batch lookup JEs
  const paymentIds = payments.map((p: Record<string, unknown>) => p.id as string);
  const refs = paymentIds.map((pid: string) => `payment:${pid}`);
  const { data: jeData } = await supabase
    .from("journal_entries")
    .select("id, entry_number, reference")
    .eq("company_id", companyId)
    .in("reference", refs);

  const jeMap = new Map<string, { id: string; entry_number: string }>();
  if (jeData) {
    for (const je of jeData) {
      const paymentId = (je.reference as string).replace("payment:", "");
      jeMap.set(paymentId, { id: je.id, entry_number: je.entry_number });
    }
  }

  // Batch lookup bank account names
  const bankIds = [...new Set(
    payments
      .map((p: Record<string, unknown>) => p.bank_account_id as string | null)
      .filter(Boolean)
  )] as string[];

  const bankMap = new Map<string, string>();
  if (bankIds.length > 0) {
    const { data: banks } = await supabase
      .from("bank_accounts")
      .select("id, name, bank_name, account_number_last4")
      .in("id", bankIds);
    if (banks) {
      for (const b of banks) {
        const label = b.bank_name && b.account_number_last4
          ? `${b.name} — ${b.bank_name} (••${b.account_number_last4})`
          : b.name;
        bankMap.set(b.id, label);
      }
    }
  }

  return payments.map((p: Record<string, unknown>) => {
    const inv = p.invoices as { invoice_number: string; vendor_name: string; payment_terms: string | null };
    const pid = p.id as string;
    const je = jeMap.get(pid);
    return {
      id: pid,
      payment_date: p.payment_date as string,
      amount: p.amount as number,
      method: (p.method as string) || "check",
      reference_number: (p.reference_number as string) || null,
      notes: (p.notes as string) || null,
      invoice_id: p.invoice_id as string,
      invoice_number: inv?.invoice_number || "",
      vendor_name: inv?.vendor_name || "Unknown",
      payment_terms: inv?.payment_terms || null,
      je_entry_number: je?.entry_number || null,
      je_id: je?.id || null,
      bank_account_name: bankMap.get(p.bank_account_id as string) || null,
    };
  });
}

export async function getAPVendorSummary(
  supabase: SupabaseClient,
  companyId: string
): Promise<VendorPaymentSummary[]> {
  // Get all payable invoices with vendor info
  const { data: invoices } = await supabase
    .from("invoices")
    .select("id, vendor_id, vendor_name, total_amount, balance_due, amount_paid, status, invoice_date")
    .eq("company_id", companyId)
    .eq("invoice_type", "payable")
    .not("status", "eq", "voided");

  if (!invoices || invoices.length === 0) return [];

  // Get all payments for these invoices
  const invoiceIds = invoices.map((i: Record<string, unknown>) => i.id as string);
  const { data: payments } = await supabase
    .from("payments")
    .select("id, invoice_id, payment_date, amount")
    .in("invoice_id", invoiceIds)
    .order("payment_date", { ascending: false });

  const paymentsByInvoice = new Map<string, { payment_date: string; amount: number }[]>();
  if (payments) {
    for (const p of payments) {
      const list = paymentsByInvoice.get(p.invoice_id) || [];
      list.push({ payment_date: p.payment_date, amount: p.amount });
      paymentsByInvoice.set(p.invoice_id, list);
    }
  }

  // Group by vendor
  const vendorMap = new Map<string, {
    vendor_name: string;
    total_owed: number;
    total_paid: number;
    invoice_count: number;
    last_payment_date: string | null;
    days_to_pay: number[];
  }>();

  for (const inv of invoices as Record<string, unknown>[]) {
    const vendorId = (inv.vendor_id as string) || "unknown";
    const vendorName = (inv.vendor_name as string) || "Unknown Vendor";
    const existing = vendorMap.get(vendorId) || {
      vendor_name: vendorName,
      total_owed: 0,
      total_paid: 0,
      invoice_count: 0,
      last_payment_date: null,
      days_to_pay: [],
    };

    existing.total_owed += (inv.balance_due as number) || 0;
    existing.total_paid += (inv.amount_paid as number) || 0;
    existing.invoice_count += 1;

    // Check payments for this invoice
    const invPayments = paymentsByInvoice.get(inv.id as string) || [];
    for (const pmt of invPayments) {
      if (!existing.last_payment_date || pmt.payment_date > existing.last_payment_date) {
        existing.last_payment_date = pmt.payment_date;
      }
      // Calculate days to pay
      if (inv.invoice_date) {
        const invoiceDate = new Date(inv.invoice_date as string);
        const paymentDate = new Date(pmt.payment_date);
        const days = Math.round((paymentDate.getTime() - invoiceDate.getTime()) / (1000 * 60 * 60 * 24));
        if (days >= 0) existing.days_to_pay.push(days);
      }
    }

    vendorMap.set(vendorId, existing);
  }

  return Array.from(vendorMap.entries())
    .map(([vendor_id, data]) => ({
      vendor_id,
      vendor_name: data.vendor_name,
      total_owed: data.total_owed,
      total_paid: data.total_paid,
      invoice_count: data.invoice_count,
      last_payment_date: data.last_payment_date,
      avg_days_to_pay: data.days_to_pay.length > 0
        ? Math.round(data.days_to_pay.reduce((a, b) => a + b, 0) / data.days_to_pay.length)
        : null,
    }))
    .sort((a, b) => b.total_owed - a.total_owed);
}

/* ==================================================================
   PROJECTS (basic list for cross-module use)
   ================================================================== */

export async function getProjects(
  supabase: SupabaseClient,
  companyId: string
): Promise<ProjectRow[]> {
  const { data, error } = await supabase
    .from("projects")
    .select("id, name, status, project_number")
    .eq("company_id", companyId)
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching projects:", error);
    return [];
  }

  return (data ?? []) as ProjectRow[];
}

/* ==================================================================
   JOURNAL ENTRIES (CRUD)
   ================================================================== */

export async function getJournalEntries(
  supabase: SupabaseClient,
  companyId: string,
  filters?: { status?: string; startDate?: string; endDate?: string }
): Promise<JournalEntryRow[]> {
  let query = supabase
    .from("journal_entries")
    .select("*")
    .eq("company_id", companyId)
    .order("entry_date", { ascending: false });

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }
  if (filters?.startDate) {
    query = query.gte("entry_date", filters.startDate);
  }
  if (filters?.endDate) {
    query = query.lte("entry_date", filters.endDate);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching journal entries:", error);
    return [];
  }

  const entries = (data ?? []) as JournalEntryRow[];

  // Fetch lines for all entries (paginated to avoid 1000-row limit)
  if (entries.length > 0) {
    const entryIds = entries.map((e) => e.id);
    try {
      const allLines = await paginatedQuery<{
        id: string;
        journal_entry_id: string;
        account_id: string;
        debit: number;
        credit: number;
        description: string | null;
        project_id: string | null;
        property_id: string | null;
        chart_of_accounts: { account_number: string; name: string } | null;
      }>((from, to) =>
        supabase
          .from("journal_entry_lines")
          .select("id, journal_entry_id, account_id, debit, credit, description, project_id, property_id, chart_of_accounts(account_number, name)")
          .eq("company_id", companyId)
          .in("journal_entry_id", entryIds)
          .range(from, to)
      );

      // Group lines by journal_entry_id
      const linesByEntry = new Map<string, JournalEntryLineRow[]>();
      for (const line of allLines) {
        const account = line.chart_of_accounts;
        const mapped: JournalEntryLineRow = {
          id: line.id,
          account_id: line.account_id,
          debit: line.debit ?? 0,
          credit: line.credit ?? 0,
          description: line.description,
          project_id: line.project_id,
          property_id: line.property_id,
          account_number: account?.account_number,
          account_name: account?.name,
        };
        const existing = linesByEntry.get(line.journal_entry_id) ?? [];
        existing.push(mapped);
        linesByEntry.set(line.journal_entry_id, existing);
      }

      // Attach lines to entries and compute totals
      for (const entry of entries) {
        const entryLines = linesByEntry.get(entry.id) ?? [];
        entry.lines = entryLines;
        entry.total_debit = entryLines.reduce((s, l) => s + (l.debit ?? 0), 0);
        entry.total_credit = entryLines.reduce((s, l) => s + (l.credit ?? 0), 0);
      }
    } catch (err) {
      console.error("Error fetching journal entry lines:", err);
    }
  }

  return entries;
}

export async function getJournalEntryById(
  supabase: SupabaseClient,
  entryId: string
): Promise<JournalEntryRow | null> {
  const { data: entry, error: entryErr } = await supabase
    .from("journal_entries")
    .select("*")
    .eq("id", entryId)
    .single();

  if (entryErr || !entry) {
    console.error("Error fetching journal entry:", entryErr);
    return null;
  }

  // Fetch lines for this entry
  const { data: lines, error: linesErr } = await supabase
    .from("journal_entry_lines")
    .select("id, account_id, debit, credit, description, project_id, property_id, chart_of_accounts(account_number, name)")
    .eq("journal_entry_id", entryId)
    .order("id", { ascending: true });

  if (linesErr) {
    console.error("Error fetching journal entry lines:", linesErr);
  }

  const mappedLines: JournalEntryLineRow[] = (lines ?? []).map((line: Record<string, unknown>) => {
    const account = line.chart_of_accounts as { account_number: string; name: string } | null;
    return {
      id: line.id as string,
      account_id: line.account_id as string,
      debit: (line.debit as number) ?? 0,
      credit: (line.credit as number) ?? 0,
      description: (line.description as string) || null,
      project_id: (line.project_id as string) || null,
      property_id: (line.property_id as string) || null,
      account_number: account?.account_number,
      account_name: account?.name,
    };
  });

  return {
    ...(entry as JournalEntryRow),
    lines: mappedLines,
  };
}

export async function createJournalEntry(
  supabase: SupabaseClient,
  companyId: string,
  userId: string,
  data: JournalEntryCreateData
): Promise<{ id: string } | null> {
  const { data: entry, error: entryErr } = await supabase
    .from("journal_entries")
    .insert({
      company_id: companyId,
      entry_number: data.entry_number,
      entry_date: data.entry_date,
      description: data.description,
      reference: data.reference ?? null,
      project_id: data.project_id ?? null,
      status: "draft",
      created_by: userId,
    })
    .select("id")
    .single();

  if (entryErr || !entry) {
    console.error("Error creating journal entry:", entryErr);
    return null;
  }

  const lineInserts = data.lines.map((line) => ({
    company_id: companyId,
    journal_entry_id: entry.id,
    account_id: line.account_id,
    debit: line.debit ?? 0,
    credit: line.credit ?? 0,
    description: line.description ?? null,
    project_id: line.project_id ?? null,
    property_id: line.property_id ?? null,
  }));

  const { error: linesErr } = await supabase
    .from("journal_entry_lines")
    .insert(lineInserts);

  if (linesErr) {
    console.error("Error creating journal entry lines:", linesErr);
    // Clean up the header entry
    await supabase.from("journal_entries").delete().eq("id", entry.id);
    return null;
  }

  return { id: entry.id };
}

/* ==================================================================
   PAYMENTS (CRUD)
   ================================================================== */

export async function getPayments(
  supabase: SupabaseClient,
  companyId: string,
  filters?: { invoiceId?: string; startDate?: string; endDate?: string }
): Promise<PaymentRow[]> {
  let query = supabase
    .from("payments")
    .select("id, payment_date, amount, method, reference_number, bank_account_id, notes, invoice_id, invoices(invoice_number)")
    .eq("company_id", companyId)
    .order("payment_date", { ascending: false });

  if (filters?.invoiceId) {
    query = query.eq("invoice_id", filters.invoiceId);
  }
  if (filters?.startDate) {
    query = query.gte("payment_date", filters.startDate);
  }
  if (filters?.endDate) {
    query = query.lte("payment_date", filters.endDate);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching payments:", error);
    return [];
  }

  const payments = data ?? [];

  // Batch lookup bank account names
  const bankIds = [...new Set(
    payments
      .map((p: Record<string, unknown>) => p.bank_account_id as string | null)
      .filter(Boolean)
  )] as string[];

  const bankNameMap: Record<string, string> = {};
  if (bankIds.length > 0) {
    const { data: banks } = await supabase
      .from("bank_accounts")
      .select("id, name")
      .in("id", bankIds);
    for (const b of banks ?? []) {
      bankNameMap[b.id] = b.name;
    }
  }

  return payments.map((p: Record<string, unknown>) => ({
    id: p.id as string,
    payment_date: p.payment_date as string,
    amount: p.amount as number,
    method: (p.method as string) || "check",
    reference_number: (p.reference_number as string) || null,
    bank_account_id: (p.bank_account_id as string) || null,
    bank_account_name: p.bank_account_id ? (bankNameMap[p.bank_account_id as string] || null) : null,
    notes: (p.notes as string) || null,
  }));
}

export async function recordPayment(
  supabase: SupabaseClient,
  companyId: string,
  data: PaymentCreateData
): Promise<{ id: string } | null> {
  // Insert the payment record
  const { data: result, error } = await supabase
    .from("payments")
    .insert({
      company_id: companyId,
      invoice_id: data.invoice_id,
      payment_date: data.payment_date,
      amount: data.amount,
      method: data.method,
      reference_number: data.reference_number ?? null,
      bank_account_id: data.bank_account_id ?? null,
      notes: data.notes ?? null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Error recording payment:", error);
    return null;
  }

  // Update the invoice's amount_paid
  const { data: invoice } = await supabase
    .from("invoices")
    .select("amount_paid, total_amount")
    .eq("id", data.invoice_id)
    .single();

  if (invoice) {
    const newAmountPaid = (invoice.amount_paid ?? 0) + data.amount;
    const updatePayload: Record<string, unknown> = {
      amount_paid: newAmountPaid,
    };

    // Auto-update status to "paid" if fully paid
    if (newAmountPaid >= (invoice.total_amount ?? 0) - 0.01) {
      updatePayload.status = "paid";
    } else {
      updatePayload.status = "partial";
    }

    await supabase
      .from("invoices")
      .update(updatePayload)
      .eq("id", data.invoice_id);
  }

  return result as { id: string };
}
