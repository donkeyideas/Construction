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

  // Revenue this month: receivable invoices paid this month
  const revenuePromise = supabase
    .from("invoices")
    .select("total_amount")
    .eq("company_id", companyId)
    .eq("invoice_type", "receivable")
    .eq("status", "paid")
    .gte("invoice_date", startOfMonth)
    .lte("invoice_date", endOfMonth);

  // Expenses this month: payable invoices paid this month
  const expensePromise = supabase
    .from("invoices")
    .select("total_amount")
    .eq("company_id", companyId)
    .eq("invoice_type", "payable")
    .eq("status", "paid")
    .gte("invoice_date", startOfMonth)
    .lte("invoice_date", endOfMonth);

  const [arRes, apRes, cashRes, revenueRes, expenseRes] = await Promise.all([
    arPromise,
    apPromise,
    cashPromise,
    revenuePromise,
    expensePromise,
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
  const revenueThisMonth = (revenueRes.data ?? []).reduce(
    (sum: number, row: { total_amount: number }) => sum + (row.total_amount ?? 0),
    0
  );
  const expensesThisMonth = (expenseRes.data ?? []).reduce(
    (sum: number, row: { total_amount: number }) => sum + (row.total_amount ?? 0),
    0
  );

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
