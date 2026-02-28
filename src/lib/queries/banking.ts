import { SupabaseClient } from "@supabase/supabase-js";

/* ------------------------------------------------------------------
   Types
   ------------------------------------------------------------------ */

export interface BankAccountRow {
  id: string;
  company_id: string;
  name: string;
  bank_name: string;
  account_type: string;
  account_number_last4: string | null;
  routing_number_last4: string | null;
  current_balance: number;
  is_default: boolean;
  gl_account_id: string | null;
  created_at: string;
  updated_at?: string;
}

export interface BankTransactionRow {
  id: string;
  company_id: string;
  bank_account_id: string;
  transaction_date: string;
  description: string;
  reference: string | null;
  transaction_type: "debit" | "credit";
  amount: number;
  running_balance: number;
  category: string | null;
  is_reconciled: boolean;
  reconciliation_id: string | null;
  notes: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at?: string;
}

export interface BankReconciliationRow {
  id: string;
  company_id: string;
  bank_account_id: string;
  statement_date: string;
  statement_ending_balance: number;
  book_balance: number;
  difference: number;
  status: "in_progress" | "completed";
  reconciled_by: string | null;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
  bank_account?: {
    name: string;
    bank_name: string;
  };
}

export interface BankingStats {
  totalBalance: number;
  accountCount: number;
  unreconciledCount: number;
}

export interface CreateTransactionData {
  bank_account_id: string;
  transaction_date: string;
  description: string;
  reference?: string;
  transaction_type: "debit" | "credit";
  amount: number;
  category?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
}

export interface CreateReconciliationData {
  bank_account_id: string;
  statement_date: string;
  statement_ending_balance: number;
  notes?: string;
}

export type TransactionCategory =
  | "payroll"
  | "materials"
  | "subcontractor"
  | "equipment"
  | "insurance"
  | "tax"
  | "revenue"
  | "transfer"
  | "other";

export interface TransactionFilters {
  startDate?: string;
  endDate?: string;
  transactionType?: "debit" | "credit";
  category?: string;
  reconciled?: "yes" | "no";
  search?: string;
}

/* ------------------------------------------------------------------
   Bank Accounts
   ------------------------------------------------------------------ */

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

export async function getBankAccountById(
  supabase: SupabaseClient,
  accountId: string
): Promise<BankAccountRow | null> {
  const { data, error } = await supabase
    .from("bank_accounts")
    .select("*")
    .eq("id", accountId)
    .single();

  if (error || !data) {
    console.error("Error fetching bank account:", error);
    return null;
  }
  return data as BankAccountRow;
}

export async function updateBankAccount(
  supabase: SupabaseClient,
  accountId: string,
  updates: Partial<{
    name: string;
    bank_name: string;
    account_type: string;
    account_number_last4: string;
    routing_number_last4: string;
    current_balance: number;
    is_default: boolean;
  }>
): Promise<boolean> {
  const { error } = await supabase
    .from("bank_accounts")
    .update(updates)
    .eq("id", accountId);

  if (error) {
    console.error("Error updating bank account:", error);
    return false;
  }
  return true;
}

export async function deleteBankAccount(
  supabase: SupabaseClient,
  accountId: string
): Promise<boolean> {
  const { error } = await supabase
    .from("bank_accounts")
    .delete()
    .eq("id", accountId);

  if (error) {
    console.error("Error deleting bank account:", error);
    return false;
  }
  return true;
}

/* ------------------------------------------------------------------
   Banking Stats
   ------------------------------------------------------------------ */

export async function getBankingStats(
  supabase: SupabaseClient,
  companyId: string
): Promise<BankingStats> {
  const [accountsRes, unreconciledRes] = await Promise.all([
    supabase
      .from("bank_accounts")
      .select("current_balance")
      .eq("company_id", companyId),
    supabase
      .from("bank_transactions")
      .select("id")
      .eq("company_id", companyId)
      .eq("is_reconciled", false),
  ]);

  const accounts = accountsRes.data ?? [];
  const totalBalance = accounts.reduce(
    (sum: number, row: { current_balance: number }) =>
      sum + (row.current_balance ?? 0),
    0
  );

  return {
    totalBalance,
    accountCount: accounts.length,
    unreconciledCount: (unreconciledRes.data ?? []).length,
  };
}

/* ------------------------------------------------------------------
   Bank Transactions
   ------------------------------------------------------------------ */

export async function getBankTransactions(
  supabase: SupabaseClient,
  companyId: string,
  accountId?: string,
  filters?: TransactionFilters
): Promise<BankTransactionRow[]> {
  let query = supabase
    .from("bank_transactions")
    .select("*")
    .eq("company_id", companyId)
    .order("transaction_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (accountId) {
    query = query.eq("bank_account_id", accountId);
  }

  if (filters?.startDate) {
    query = query.gte("transaction_date", filters.startDate);
  }

  if (filters?.endDate) {
    query = query.lte("transaction_date", filters.endDate);
  }

  if (filters?.transactionType) {
    query = query.eq("transaction_type", filters.transactionType);
  }

  if (filters?.category) {
    query = query.eq("category", filters.category);
  }

  if (filters?.reconciled === "yes") {
    query = query.eq("is_reconciled", true);
  } else if (filters?.reconciled === "no") {
    query = query.eq("is_reconciled", false);
  }

  if (filters?.search) {
    query = query.or(
      `description.ilike.%${filters.search}%,reference.ilike.%${filters.search}%`
    );
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching bank transactions:", error);
    return [];
  }

  return (data ?? []) as BankTransactionRow[];
}

/**
 * Get GL-derived transactions for a bank account by querying journal_entry_lines
 * for the bank account's linked GL account. Returns them in BankTransactionRow-like shape.
 */
export async function getBankAccountGLTransactions(
  supabase: SupabaseClient,
  companyId: string,
  bankAccountId: string
): Promise<BankTransactionRow[]> {
  // First get the GL account linked to this bank account
  const { data: bankAccount } = await supabase
    .from("bank_accounts")
    .select("gl_account_id")
    .eq("id", bankAccountId)
    .eq("company_id", companyId)
    .single();

  if (!bankAccount?.gl_account_id) return [];

  // Query JE lines for this GL account
  const { data: lines } = await supabase
    .from("journal_entry_lines")
    .select(`
      id, debit, credit, description,
      journal_entries!inner(id, entry_number, entry_date, description, reference, status)
    `)
    .eq("account_id", bankAccount.gl_account_id)
    .eq("company_id", companyId)
    .eq("journal_entries.status", "posted")
    .order("created_at", { ascending: false })
    .limit(500);

  if (!lines || lines.length === 0) return [];

  // Convert to BankTransactionRow-like shape
  let runningBalance = 0;
  return lines.map((line) => {
    const je = line.journal_entries as unknown as {
      id: string; entry_number: string; entry_date: string;
      description: string; reference: string | null; status: string;
    };
    const debit = line.debit ?? 0;
    const credit = line.credit ?? 0;
    const isDebit = debit > credit;
    const amount = isDebit ? debit : credit;
    runningBalance += credit - debit; // cash is an asset (debit normal), so credits reduce balance
    return {
      id: `gl-${line.id}`,
      company_id: companyId,
      bank_account_id: bankAccountId,
      transaction_date: je.entry_date,
      description: je.description || line.description || "",
      reference: je.reference,
      transaction_type: isDebit ? "debit" as const : "credit" as const,
      amount,
      running_balance: runningBalance,
      category: "gl",
      is_reconciled: false,
      reconciliation_id: null,
      notes: `From GL: ${je.entry_number}`,
      metadata: null,
      created_at: je.entry_date,
    };
  });
}

export async function createBankTransaction(
  supabase: SupabaseClient,
  companyId: string,
  txnData: CreateTransactionData
): Promise<{ id: string } | null> {
  // Get current balance of the bank account
  const { data: account } = await supabase
    .from("bank_accounts")
    .select("current_balance")
    .eq("id", txnData.bank_account_id)
    .eq("company_id", companyId)
    .single();

  if (!account) {
    console.error("Bank account not found");
    return null;
  }

  const currentBalance = account.current_balance ?? 0;
  const balanceChange =
    txnData.transaction_type === "credit" ? txnData.amount : -txnData.amount;
  const newBalance = currentBalance + balanceChange;

  // Insert the transaction
  const { data: result, error: txnError } = await supabase
    .from("bank_transactions")
    .insert({
      company_id: companyId,
      bank_account_id: txnData.bank_account_id,
      transaction_date: txnData.transaction_date,
      description: txnData.description,
      reference: txnData.reference ?? null,
      transaction_type: txnData.transaction_type,
      amount: txnData.amount,
      running_balance: newBalance,
      category: txnData.category ?? null,
      is_reconciled: false,
      notes: txnData.notes ?? null,
      metadata: txnData.metadata ?? {},
    })
    .select("id")
    .single();

  if (txnError) {
    console.error("Error creating bank transaction:", txnError);
    return null;
  }

  // Update bank account balance
  const { error: updateError } = await supabase
    .from("bank_accounts")
    .update({ current_balance: newBalance })
    .eq("id", txnData.bank_account_id);

  if (updateError) {
    console.error("Error updating bank account balance:", updateError);
  }

  return result as { id: string };
}

export async function updateBankTransaction(
  supabase: SupabaseClient,
  txnId: string,
  updates: Partial<{
    transaction_date: string;
    description: string;
    reference: string | null;
    transaction_type: "debit" | "credit";
    amount: number;
    category: string | null;
    is_reconciled: boolean;
    notes: string | null;
  }>
): Promise<boolean> {
  const { error } = await supabase
    .from("bank_transactions")
    .update(updates)
    .eq("id", txnId);

  if (error) {
    console.error("Error updating bank transaction:", error);
    return false;
  }
  return true;
}

export async function deleteBankTransaction(
  supabase: SupabaseClient,
  txnId: string,
  companyId: string
): Promise<boolean> {
  // Get the transaction details to reverse the balance
  const { data: txn } = await supabase
    .from("bank_transactions")
    .select("bank_account_id, transaction_type, amount")
    .eq("id", txnId)
    .eq("company_id", companyId)
    .single();

  if (!txn) {
    console.error("Transaction not found");
    return false;
  }

  // Delete the transaction
  const { error } = await supabase
    .from("bank_transactions")
    .delete()
    .eq("id", txnId);

  if (error) {
    console.error("Error deleting bank transaction:", error);
    return false;
  }

  // Reverse the balance change
  const { data: account } = await supabase
    .from("bank_accounts")
    .select("current_balance")
    .eq("id", txn.bank_account_id)
    .single();

  if (account) {
    const reversal =
      txn.transaction_type === "credit" ? -txn.amount : txn.amount;
    const newBalance = (account.current_balance ?? 0) + reversal;

    await supabase
      .from("bank_accounts")
      .update({ current_balance: newBalance })
      .eq("id", txn.bank_account_id);
  }

  return true;
}

/* ------------------------------------------------------------------
   Bank Reconciliations
   ------------------------------------------------------------------ */

export async function getBankReconciliations(
  supabase: SupabaseClient,
  companyId: string,
  accountId?: string
): Promise<BankReconciliationRow[]> {
  let query = supabase
    .from("bank_reconciliations")
    .select("*, bank_accounts(name, bank_name)")
    .eq("company_id", companyId)
    .order("statement_date", { ascending: false });

  if (accountId) {
    query = query.eq("bank_account_id", accountId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching bank reconciliations:", error);
    return [];
  }

  return (data ?? []).map((row: Record<string, unknown>) => {
    const bankAccount = row.bank_accounts as {
      name: string;
      bank_name: string;
    } | null;
    return {
      ...row,
      bank_account: bankAccount
        ? { name: bankAccount.name, bank_name: bankAccount.bank_name }
        : undefined,
    };
  }) as BankReconciliationRow[];
}

export async function createReconciliation(
  supabase: SupabaseClient,
  companyId: string,
  userId: string,
  data: CreateReconciliationData
): Promise<{ id: string } | null> {
  // Get book balance from bank account
  const { data: account } = await supabase
    .from("bank_accounts")
    .select("current_balance")
    .eq("id", data.bank_account_id)
    .eq("company_id", companyId)
    .single();

  if (!account) {
    console.error("Bank account not found");
    return null;
  }

  const bookBalance = account.current_balance ?? 0;
  const difference = data.statement_ending_balance - bookBalance;

  const { data: result, error } = await supabase
    .from("bank_reconciliations")
    .insert({
      company_id: companyId,
      bank_account_id: data.bank_account_id,
      statement_date: data.statement_date,
      statement_ending_balance: data.statement_ending_balance,
      book_balance: bookBalance,
      difference,
      status: "in_progress",
      reconciled_by: userId,
      notes: data.notes ?? null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Error creating reconciliation:", error);
    return null;
  }

  return result as { id: string };
}

export async function updateReconciliation(
  supabase: SupabaseClient,
  reconId: string,
  updates: Partial<{
    statement_date: string;
    statement_ending_balance: number;
    book_balance: number;
    difference: number;
    status: "in_progress" | "completed";
    completed_at: string | null;
    notes: string | null;
  }>
): Promise<boolean> {
  // If completing, set completed_at
  if (updates.status === "completed" && !updates.completed_at) {
    updates.completed_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("bank_reconciliations")
    .update(updates)
    .eq("id", reconId);

  if (error) {
    console.error("Error updating reconciliation:", error);
    return false;
  }
  return true;
}

export async function deleteReconciliation(
  supabase: SupabaseClient,
  reconId: string
): Promise<boolean> {
  const { error } = await supabase
    .from("bank_reconciliations")
    .delete()
    .eq("id", reconId);

  if (error) {
    console.error("Error deleting reconciliation:", error);
    return false;
  }
  return true;
}
