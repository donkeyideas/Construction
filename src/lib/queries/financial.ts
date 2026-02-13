import { SupabaseClient } from "@supabase/supabase-js";

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
}

export interface InvoiceRow {
  id: string;
  invoice_number: string;
  invoice_type: "payable" | "receivable";
  vendor_name: string | null;
  client_name: string | null;
  project_id: string | null;
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

  // Total AR: sum of balance_due on receivable invoices that are not voided
  const arPromise = supabase
    .from("invoices")
    .select("balance_due")
    .eq("company_id", companyId)
    .eq("invoice_type", "receivable")
    .not("status", "eq", "voided")
    .not("status", "eq", "paid");

  // Total AP: sum of balance_due on payable invoices that are not voided
  const apPromise = supabase
    .from("invoices")
    .select("balance_due")
    .eq("company_id", companyId)
    .eq("invoice_type", "payable")
    .not("status", "eq", "voided")
    .not("status", "eq", "paid");

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

  const [arRes, apRes, cashRes, paymentsRes] = await Promise.all([
    arPromise,
    apPromise,
    cashPromise,
    paymentsPromise,
  ]);

  const totalAR = (arRes.data ?? []).reduce(
    (sum: number, row: { balance_due: number }) => sum + (row.balance_due ?? 0),
    0
  );
  const totalAP = (apRes.data ?? []).reduce(
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

  // Fallback: if no payments exist, use invoice-based estimation
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

  return {
    totalAR,
    totalAP,
    cashPosition,
    revenueThisMonth,
    expensesThisMonth,
    netIncome: revenueThisMonth - expensesThisMonth,
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
    .select("*")
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

  return (data ?? []) as InvoiceRow[];
}

export async function getRecentInvoices(
  supabase: SupabaseClient,
  companyId: string,
  limit: number = 10
): Promise<InvoiceRow[]> {
  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching recent invoices:", error);
    return [];
  }

  return (data ?? []) as InvoiceRow[];
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
    .select("id, payment_date, amount, method, reference_number")
    .eq("invoice_id", invoiceId)
    .order("payment_date", { ascending: false });

  if (payError) {
    console.error("Error fetching payments:", payError);
  }

  return {
    ...(invoice as InvoiceRow),
    payments: (payments ?? []) as PaymentRow[],
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
  const { data, error } = await supabase
    .from("chart_of_accounts")
    .select("*")
    .eq("company_id", companyId)
    .eq("is_active", true)
    .order("account_number", { ascending: true });

  if (error) {
    console.error("Error fetching chart of accounts:", error);
    return [];
  }

  const rows = (data ?? []) as AccountRow[];
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
  const { data, error } = await supabase
    .from("project_budget_lines")
    .select("*")
    .eq("company_id", companyId)
    .eq("project_id", projectId)
    .order("csi_code", { ascending: true });

  if (error) {
    console.error("Error fetching job costing:", error);
    return { lines: [], totalBudgeted: 0, totalCommitted: 0, totalActual: 0, totalVariance: 0 };
  }

  const lines = (data ?? []) as BudgetLineRow[];

  const totalBudgeted = lines.reduce((sum, l) => sum + (l.budgeted_amount ?? 0), 0);
  const totalCommitted = lines.reduce((sum, l) => sum + (l.committed_amount ?? 0), 0);
  const totalActual = lines.reduce((sum, l) => sum + (l.actual_amount ?? 0), 0);
  const totalVariance = lines.reduce((sum, l) => sum + (l.variance ?? 0), 0);

  return { lines, totalBudgeted, totalCommitted, totalActual, totalVariance };
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

  // Fetch all unpaid / non-voided invoices
  const { data, error } = await supabase
    .from("invoices")
    .select("invoice_type, due_date, balance_due")
    .eq("company_id", companyId)
    .not("status", "eq", "voided")
    .not("status", "eq", "paid")
    .gt("balance_due", 0);

  if (error) {
    console.error("Error fetching aging data:", error);
    return defaultBuckets();
  }

  const buckets = defaultBuckets();

  for (const row of data ?? []) {
    const dueDate = new Date(row.due_date);
    const daysOverdue = Math.floor(
      (now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const amount = row.balance_due ?? 0;

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
  const months: MonthlyFinancial[] = [];

  for (let i = 5; i >= 0; i--) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
    const label = monthDate.toLocaleDateString("en-US", { month: "short" });

    months.push({
      month: label,
      income: 0,
      expenses: 0,
    });

    const startISO = monthDate.toISOString();
    const endISO = monthEnd.toISOString();

    const [incomeRes, expenseRes] = await Promise.all([
      supabase
        .from("invoices")
        .select("total_amount")
        .eq("company_id", companyId)
        .eq("invoice_type", "receivable")
        .eq("status", "paid")
        .gte("invoice_date", startISO)
        .lte("invoice_date", endISO),
      supabase
        .from("invoices")
        .select("total_amount")
        .eq("company_id", companyId)
        .eq("invoice_type", "payable")
        .eq("status", "paid")
        .gte("invoice_date", startISO)
        .lte("invoice_date", endISO),
    ]);

    const income = (incomeRes.data ?? []).reduce(
      (sum: number, r: { total_amount: number }) => sum + (r.total_amount ?? 0),
      0
    );
    const expenses = (expenseRes.data ?? []).reduce(
      (sum: number, r: { total_amount: number }) => sum + (r.total_amount ?? 0),
      0
    );

    months[months.length - 1].income = income;
    months[months.length - 1].expenses = expenses;
  }

  return months;
}

/* ------------------------------------------------------------------
   Projects list (for dropdowns)
   ------------------------------------------------------------------ */

export interface ProjectOption {
  id: string;
  name: string;
}

export async function getProjects(
  supabase: SupabaseClient,
  companyId: string
): Promise<ProjectOption[]> {
  const { data, error } = await supabase
    .from("projects")
    .select("id, name")
    .eq("company_id", companyId)
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching projects:", error);
    return [];
  }

  return (data ?? []) as ProjectOption[];
}

/* ==================================================================
   PAYMENT TYPES & FUNCTIONS
   ================================================================== */

export interface PaymentCreateData {
  invoice_id: string;
  payment_date: string;
  amount: number;
  method: string;
  reference_number?: string;
  bank_account_id?: string;
  notes?: string;
}

export async function recordPayment(
  supabase: SupabaseClient,
  companyId: string,
  data: PaymentCreateData
): Promise<{ id: string } | null> {
  // Insert the payment
  const { data: payment, error: payError } = await supabase
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

  if (payError) {
    console.error("Error recording payment:", payError);
    return null;
  }

  // Update invoice amount_paid
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

    // Auto-set status to paid when fully paid
    if (newAmountPaid >= invoice.total_amount) {
      updatePayload.status = "paid";
    }

    await supabase
      .from("invoices")
      .update(updatePayload)
      .eq("id", data.invoice_id);
  }

  return payment as { id: string };
}

export async function getPayments(
  supabase: SupabaseClient,
  companyId: string,
  filters?: { invoiceId?: string; startDate?: string; endDate?: string }
): Promise<PaymentRow[]> {
  let query = supabase
    .from("payments")
    .select("id, payment_date, amount, method, reference_number")
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
  return (data ?? []) as PaymentRow[];
}

/* ==================================================================
   JOURNAL ENTRY TYPES & FUNCTIONS
   ================================================================== */

export interface JournalEntryRow {
  id: string;
  entry_number: string;
  entry_date: string;
  description: string;
  reference: string | null;
  project_id: string | null;
  status: string;
  posted_by: string | null;
  posted_at: string | null;
  created_by: string | null;
  created_at: string;
  total_debit?: number;
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

export interface JournalEntryDetail extends JournalEntryRow {
  lines: JournalEntryLineRow[];
}

export interface JournalEntryLineCreateData {
  account_id: string;
  debit: number;
  credit: number;
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
  lines: JournalEntryLineCreateData[];
}

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

  if (filters?.status && filters.status !== "all") {
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

  // Fetch line totals for each entry
  if (entries.length > 0) {
    const entryIds = entries.map((e) => e.id);
    const { data: lines } = await supabase
      .from("journal_entry_lines")
      .select("journal_entry_id, debit, credit")
      .in("journal_entry_id", entryIds);

    const totals = new Map<string, { debit: number; credit: number }>();
    for (const line of lines ?? []) {
      const existing = totals.get(line.journal_entry_id) ?? { debit: 0, credit: 0 };
      existing.debit += line.debit ?? 0;
      existing.credit += line.credit ?? 0;
      totals.set(line.journal_entry_id, existing);
    }

    for (const entry of entries) {
      const t = totals.get(entry.id);
      entry.total_debit = t?.debit ?? 0;
      entry.total_credit = t?.credit ?? 0;
    }
  }

  return entries;
}

export async function getJournalEntryById(
  supabase: SupabaseClient,
  entryId: string
): Promise<JournalEntryDetail | null> {
  const { data: entry, error: entryErr } = await supabase
    .from("journal_entries")
    .select("*")
    .eq("id", entryId)
    .single();

  if (entryErr || !entry) {
    console.error("Error fetching journal entry:", entryErr);
    return null;
  }

  const { data: lines, error: linesErr } = await supabase
    .from("journal_entry_lines")
    .select("*, chart_of_accounts(account_number, name)")
    .eq("journal_entry_id", entryId)
    .order("created_at", { ascending: true });

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
      description: line.description as string | null,
      project_id: line.project_id as string | null,
      property_id: line.property_id as string | null,
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
  // Validate: total debits must equal total credits
  const totalDebit = data.lines.reduce((sum, l) => sum + (l.debit ?? 0), 0);
  const totalCredit = data.lines.reduce((sum, l) => sum + (l.credit ?? 0), 0);

  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    console.error("Journal entry not balanced:", { totalDebit, totalCredit });
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
  // Get all posted journal entry IDs up to the date
  let entriesQuery = supabase
    .from("journal_entries")
    .select("id")
    .eq("company_id", companyId)
    .eq("status", "posted");

  if (asOfDate) {
    entriesQuery = entriesQuery.lte("entry_date", asOfDate);
  }

  const { data: entries } = await entriesQuery;
  const entryIds = (entries ?? []).map((e: { id: string }) => e.id);

  if (entryIds.length === 0) {
    return [];
  }

  // Get all lines for these entries with account info
  const { data: lines } = await supabase
    .from("journal_entry_lines")
    .select("account_id, debit, credit, chart_of_accounts(account_number, name, account_type)")
    .in("journal_entry_id", entryIds);

  // Aggregate by account
  const accountMap = new Map<
    string,
    { account_number: string; account_name: string; account_type: string; debit: number; credit: number }
  >();

  for (const line of lines ?? []) {
    const account = (line as Record<string, unknown>).chart_of_accounts as {
      account_number: string;
      name: string;
      account_type: string;
    } | null;

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
    // Revenue accounts have credit normal balance, so amount = credit - debit
    if (row.account_type === "revenue" || (num >= 4000 && num < 5000)) {
      revenue.push({ account_number: row.account_number, name: row.account_name, amount: row.credit - row.debit });
    } else if (num >= 5000 && num < 6000) {
      // COGS: debit normal balance, so amount = debit - credit
      cogs.push({ account_number: row.account_number, name: row.account_name, amount: row.debit - row.credit });
    } else if (row.account_type === "expense" || (num >= 6000 && num < 7000)) {
      opex.push({ account_number: row.account_number, name: row.account_name, amount: row.debit - row.credit });
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
): Promise<{ account_number: string; account_name: string; account_type: string; debit: number; credit: number }[]> {
  const { data: entries } = await supabase
    .from("journal_entries")
    .select("id")
    .eq("company_id", companyId)
    .eq("status", "posted")
    .gte("entry_date", startDate)
    .lte("entry_date", endDate);

  const entryIds = (entries ?? []).map((e: { id: string }) => e.id);
  if (entryIds.length === 0) return [];

  const { data: lines } = await supabase
    .from("journal_entry_lines")
    .select("account_id, debit, credit, chart_of_accounts(account_number, name, account_type)")
    .in("journal_entry_id", entryIds);

  const accountMap = new Map<string, { account_number: string; account_name: string; account_type: string; debit: number; credit: number }>();

  for (const line of lines ?? []) {
    const account = (line as Record<string, unknown>).chart_of_accounts as {
      account_number: string; name: string; account_type: string;
    } | null;
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

  return Array.from(accountMap.values()).sort((a, b) => a.account_number.localeCompare(b.account_number));
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

  for (const row of trialBalance) {
    if (row.account_type === "asset") {
      // Assets have debit normal balance
      assets.push({ account_number: row.account_number, name: row.account_name, amount: row.total_debit - row.total_credit });
    } else if (row.account_type === "liability") {
      // Liabilities have credit normal balance
      liabilities.push({ account_number: row.account_number, name: row.account_name, amount: row.total_credit - row.total_debit });
    } else if (row.account_type === "equity") {
      equity.push({ account_number: row.account_number, name: row.account_name, amount: row.total_credit - row.total_debit });
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

  // Get AR/AP changes during the period
  // AR at start vs AR at end
  const [arStartRes, arEndRes, apStartRes, apEndRes] = await Promise.all([
    supabase.from("invoices").select("balance_due").eq("company_id", companyId)
      .eq("invoice_type", "receivable").not("status", "eq", "voided").lte("invoice_date", startDate),
    supabase.from("invoices").select("balance_due").eq("company_id", companyId)
      .eq("invoice_type", "receivable").not("status", "eq", "voided").lte("invoice_date", endDate),
    supabase.from("invoices").select("balance_due").eq("company_id", companyId)
      .eq("invoice_type", "payable").not("status", "eq", "voided").lte("invoice_date", startDate),
    supabase.from("invoices").select("balance_due").eq("company_id", companyId)
      .eq("invoice_type", "payable").not("status", "eq", "voided").lte("invoice_date", endDate),
  ]);

  const arStart = (arStartRes.data ?? []).reduce((s, r) => s + (r.balance_due ?? 0), 0);
  const arEnd = (arEndRes.data ?? []).reduce((s, r) => s + (r.balance_due ?? 0), 0);
  const apStart = (apStartRes.data ?? []).reduce((s, r) => s + (r.balance_due ?? 0), 0);
  const apEnd = (apEndRes.data ?? []).reduce((s, r) => s + (r.balance_due ?? 0), 0);

  const arChange = -(arEnd - arStart); // Decrease in AR = cash inflow
  const apChange = apEnd - apStart; // Increase in AP = cash inflow

  const operating: CashFlowSection[] = [
    { label: "Net Income", amount: netIncome },
    { label: "Changes in Accounts Receivable", amount: arChange },
    { label: "Changes in Accounts Payable", amount: apChange },
  ];
  const netOperating = operating.reduce((s, i) => s + i.amount, 0);

  // Investing activities (placeholder — would need equipment/asset purchase tracking)
  const investing: CashFlowSection[] = [];
  const netInvesting = 0;

  // Financing activities (placeholder — would need loan tracking)
  const financing: CashFlowSection[] = [];
  const netFinancing = 0;

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
