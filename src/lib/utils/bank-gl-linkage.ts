/**
 * Bank Account ↔ GL Account Linkage Utility
 *
 * Ensures every bank account has a corresponding GL account in the Chart of Accounts.
 * GL accounts are named "Checking ••1842" or "Savings ••7234" using the last 4 digits.
 * When a bank account is created (API or import), this utility:
 *   1. Finds or creates a matching GL account (asset, 1040-1099 range)
 *   2. Links it via bank_accounts.gl_account_id
 *   3. Creates an opening balance JE if the bank has an initial balance
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { createPostedJournalEntry } from "@/lib/queries/financial";
import type { JournalEntryCreateData } from "@/lib/queries/financial";

/**
 * Build the GL account display name: "Checking ••1842" or "Savings ••7234"
 */
function buildGLName(bankType: string, last4: string | null): string {
  const typeLabel = bankType === "savings" ? "Savings" : "Checking";
  return `${typeLabel} ••${last4 || "????"}`;
}

/**
 * Ensure a bank account is linked to a GL account.
 * If no link exists, finds a matching GL account or creates a new one.
 * Optionally creates an opening balance JE for the initial balance.
 */
export async function ensureBankAccountGLLink(
  supabase: SupabaseClient,
  companyId: string,
  bankAccountId: string,
  bankName: string,
  bankType: string,
  initialBalance?: number,
  userId?: string
): Promise<{ glAccountId: string; created: boolean }> {
  // 1. Check if already linked
  const { data: bankRow } = await supabase
    .from("bank_accounts")
    .select("gl_account_id, account_number_last4")
    .eq("id", bankAccountId)
    .single();

  if (bankRow?.gl_account_id) {
    return { glAccountId: bankRow.gl_account_id, created: false };
  }

  const last4 = bankRow?.account_number_last4 || null;
  const glName = buildGLName(bankType, last4);

  // 2. Search for existing GL account with the same "••last4" name (already created)
  let matchedId: string | null = null;
  if (last4) {
    const { data: existing } = await supabase
      .from("chart_of_accounts")
      .select("id")
      .eq("company_id", companyId)
      .eq("account_type", "asset")
      .eq("is_active", true)
      .ilike("name", `%••${last4}%`)
      .limit(1);

    if (existing && existing.length > 0) {
      // Verify it's not already linked to a different bank account
      const { data: alreadyLinked } = await supabase
        .from("bank_accounts")
        .select("id")
        .eq("gl_account_id", existing[0].id)
        .neq("id", bankAccountId)
        .limit(1);

      if (!alreadyLinked || alreadyLinked.length === 0) {
        matchedId = existing[0].id;
      }
    }
  }

  let glAccountId: string;
  let created = false;

  if (matchedId) {
    glAccountId = matchedId;
  } else {
    // 3. Auto-create a new GL account in 1040-1099 range
    const { data: highAccounts } = await supabase
      .from("chart_of_accounts")
      .select("account_number")
      .eq("company_id", companyId)
      .gte("account_number", "1040")
      .lte("account_number", "1099")
      .order("account_number", { ascending: false })
      .limit(1);

    const maxNum = highAccounts && highAccounts.length > 0
      ? parseInt(highAccounts[0].account_number, 10)
      : 1039;
    const nextNum = Math.max(maxNum + 1, 1040);

    if (nextNum > 1099) {
      // Fallback: use the parent Cash account (1000)
      const { data: cashParent } = await supabase
        .from("chart_of_accounts")
        .select("id")
        .eq("company_id", companyId)
        .eq("account_number", "1000")
        .single();

      if (cashParent) {
        glAccountId = cashParent.id;
      } else {
        throw new Error("No available account numbers in 1040-1099 range and no Cash parent (1000) account found");
      }
    } else {
      // Find parent account 1000 for hierarchy
      const { data: parentAccount } = await supabase
        .from("chart_of_accounts")
        .select("id")
        .eq("company_id", companyId)
        .eq("account_number", "1000")
        .single();

      const { data: newAccount, error: createErr } = await supabase
        .from("chart_of_accounts")
        .insert({
          company_id: companyId,
          account_number: String(nextNum),
          name: glName,
          account_type: "asset",
          sub_type: "current_asset",
          normal_balance: "debit",
          is_active: true,
          description: `Bank account: ${bankName}`,
          parent_id: parentAccount?.id || null,
        })
        .select("id")
        .single();

      if (createErr || !newAccount) {
        throw new Error(`Failed to create GL account for bank "${bankName}": ${createErr?.message}`);
      }

      glAccountId = newAccount.id;
      created = true;
    }
  }

  // 4. Link the bank account to the GL account
  await supabase
    .from("bank_accounts")
    .update({ gl_account_id: glAccountId })
    .eq("id", bankAccountId);

  // 5. Create opening balance JE if initial balance > 0
  if (initialBalance && initialBalance > 0 && userId) {
    await createOpeningBalanceJE(supabase, companyId, userId, bankAccountId, glAccountId, initialBalance, bankName);
  }

  return { glAccountId, created };
}

/**
 * Create an opening balance journal entry for a bank account.
 * DR Bank GL Account / CR 1000 Cash (reclassification from generic Cash)
 * Idempotent — won't create duplicate JEs.
 *
 * NOTE: Prefer using syncBankBalancesFromGL() instead of calling this directly.
 * That function handles Cash 1000 going negative via OBE adjustment.
 */
export async function createOpeningBalanceJE(
  supabase: SupabaseClient,
  companyId: string,
  userId: string,
  bankAccountId: string,
  bankGlAccountId: string,
  amount: number,
  bankName: string
): Promise<void> {
  // Check idempotency — don't create duplicate opening balance JEs
  const reference = `opening_balance:bank:${bankAccountId}`;
  const { data: existingJE } = await supabase
    .from("journal_entries")
    .select("id")
    .eq("company_id", companyId)
    .eq("reference", reference)
    .limit(1);

  if (existingJE && existingJE.length > 0) {
    return; // Already exists
  }

  // Use 1000 Cash as the offset (reclassification from generic Cash)
  const { data: cashAccount } = await supabase
    .from("chart_of_accounts")
    .select("id")
    .eq("company_id", companyId)
    .eq("account_number", "1000")
    .single();

  if (!cashAccount) return;

  const shortId = bankAccountId.substring(0, 8);
  const today = new Date().toISOString().split("T")[0];

  const entryData: JournalEntryCreateData = {
    entry_number: `JE-OB-BANK-${shortId}`,
    entry_date: today,
    description: `Opening balance for ${bankName}`,
    reference,
    lines: [
      {
        account_id: bankGlAccountId,
        debit: amount,
        credit: 0,
        description: `Opening balance - ${bankName}`,
      },
      {
        account_id: cashAccount.id,
        debit: 0,
        credit: amount,
        description: `Reclassify Cash to ${bankName}`,
      },
    ],
  };

  await createPostedJournalEntry(supabase, companyId, userId, entryData);
}

// ---------------------------------------------------------------------------
// Sync Bank Balances from GL — the universal bank reconciliation fix
// ---------------------------------------------------------------------------

export interface SyncBankResult {
  updates: Array<{ id: string; name: string; oldBalance: number; newBalance: number }>;
  reclassified: number;
  obeAdjustment: number;
  glCashTotal: number;
}

/**
 * Compute GL balance (debit - credit) for a single account from posted JE lines.
 * Paginated to avoid Supabase 1000-row limit.
 */
async function computeGLBalance(
  supabase: SupabaseClient,
  companyId: string,
  accountId: string
): Promise<number> {
  let total = 0;
  let from = 0;
  const pageSize = 1000;
  while (true) {
    const { data: lines } = await supabase
      .from("journal_entry_lines")
      .select("debit, credit, journal_entries!inner(id)")
      .eq("company_id", companyId)
      .eq("account_id", accountId)
      .eq("journal_entries.status", "posted")
      .range(from, from + pageSize - 1);
    if (!lines || lines.length === 0) break;
    for (const line of lines) {
      total += (Number(line.debit) || 0) - (Number(line.credit) || 0);
    }
    if (lines.length < pageSize) break;
    from += pageSize;
  }
  return total;
}

/**
 * Find or create the "Opening Balance Equity" account (3900).
 */
async function findOrCreateOBE(
  supabase: SupabaseClient,
  companyId: string
): Promise<string | null> {
  const { data: existing } = await supabase
    .from("chart_of_accounts")
    .select("id")
    .eq("company_id", companyId)
    .eq("account_type", "equity")
    .ilike("name", "%opening balance%")
    .limit(1);

  if (existing && existing.length > 0) return existing[0].id;

  const { data: created } = await supabase
    .from("chart_of_accounts")
    .insert({
      company_id: companyId,
      account_number: "3900",
      name: "Opening Balance Equity",
      account_type: "equity",
      sub_type: "equity",
      normal_balance: "credit",
      is_active: true,
      description: "Auto-created for bank balance reconciliation",
    })
    .select("id")
    .single();

  return created?.id || null;
}

/**
 * Universal bank balance sync:
 *
 *  1. For each linked bank sub-account with $0 GL balance:
 *     Create reclassification JE (DR sub-acct / CR Cash 1000)
 *  2. If Cash 1000 goes negative after reclassification:
 *     Create an OBE adjustment JE (DR Cash 1000 / CR Opening Balance Equity)
 *     to bring Cash 1000 back to $0
 *  3. Update bank_accounts.current_balance from GL sub-account balances
 *  4. Unlinked banks get proportional share of remaining Cash 1000 balance
 *
 * This works for ANY mock data regardless of whether the pre-crafted JEs
 * have the right Cash 1000 balance or not.
 */
export async function syncBankBalancesFromGL(
  supabase: SupabaseClient,
  companyId: string,
  userId: string
): Promise<SyncBankResult> {
  const updates: SyncBankResult["updates"] = [];
  let reclassifiedCount = 0;
  let obeAdjustmentAmount = 0;

  // Get all bank accounts
  const { data: bankAccounts } = await supabase
    .from("bank_accounts")
    .select("id, name, current_balance, gl_account_id")
    .eq("company_id", companyId);

  if (!bankAccounts || bankAccounts.length === 0) {
    return { updates, reclassified: 0, obeAdjustment: 0, glCashTotal: 0 };
  }

  // Find Cash 1000 account
  const { data: cashAccount } = await supabase
    .from("chart_of_accounts")
    .select("id")
    .eq("company_id", companyId)
    .eq("account_number", "1000")
    .single();

  if (!cashAccount) {
    return { updates, reclassified: 0, obeAdjustment: 0, glCashTotal: 0 };
  }

  const linked = bankAccounts.filter((b) => b.gl_account_id);
  const unlinked = bankAccounts.filter((b) => !b.gl_account_id);

  // ── Step 1: Create reclassification JEs for empty sub-accounts ──
  for (const bank of linked) {
    const subBalance = await computeGLBalance(supabase, companyId, bank.gl_account_id!);
    if (subBalance !== 0) continue; // Already has JE lines

    const bankBal = Number(bank.current_balance) || 0;
    if (bankBal <= 0) continue;

    // Idempotency check
    const ref = `opening_balance:bank:${bank.id}`;
    const { data: existingJE } = await supabase
      .from("journal_entries")
      .select("id")
      .eq("company_id", companyId)
      .eq("reference", ref)
      .limit(1);

    if (existingJE && existingJE.length > 0) continue;

    // Create reclassification JE: DR sub-account / CR Cash 1000
    const today = new Date().toISOString().split("T")[0];
    try {
      await createPostedJournalEntry(supabase, companyId, userId, {
        entry_number: `JE-OB-BANK-${bank.id.substring(0, 8)}`,
        entry_date: today,
        description: `Reclassify Cash to ${bank.name}`,
        reference: ref,
        lines: [
          {
            account_id: bank.gl_account_id!,
            debit: bankBal,
            credit: 0,
            description: `Opening balance - ${bank.name}`,
          },
          {
            account_id: cashAccount.id,
            debit: 0,
            credit: bankBal,
            description: `Reclassify Cash to ${bank.name}`,
          },
        ],
      });
      reclassifiedCount++;
    } catch (err) {
      console.warn(`Reclassification JE failed for ${bank.name}:`, err);
    }
  }

  // ── Step 2: If Cash 1000 is negative, adjust with Opening Balance Equity ──
  const cash1000Balance = await computeGLBalance(supabase, companyId, cashAccount.id);

  if (cash1000Balance < 0) {
    const obeId = await findOrCreateOBE(supabase, companyId);
    if (obeId) {
      const adjustment = Math.abs(cash1000Balance);
      const today = new Date().toISOString().split("T")[0];
      try {
        await createPostedJournalEntry(supabase, companyId, userId, {
          entry_number: `JE-OBE-CASH-${Date.now().toString(36)}`,
          entry_date: today,
          description: "Opening balance equity adjustment — Cash reconciliation",
          reference: `obe_cash_adj:${Math.round(adjustment * 100)}`,
          lines: [
            {
              account_id: cashAccount.id,
              debit: adjustment,
              credit: 0,
              description: "Adjust Cash 1000 to zero",
            },
            {
              account_id: obeId,
              debit: 0,
              credit: adjustment,
              description: "Opening balance equity offset",
            },
          ],
        });
        obeAdjustmentAmount = adjustment;
      } catch (err) {
        console.warn("OBE adjustment JE failed:", err);
      }
    }
  }

  // ── Step 3: Update bank.current_balance from GL sub-account balances ──
  for (const bank of linked) {
    const newBalance = await computeGLBalance(supabase, companyId, bank.gl_account_id!);
    await supabase
      .from("bank_accounts")
      .update({ current_balance: newBalance })
      .eq("id", bank.id);
    updates.push({
      id: bank.id,
      name: bank.name,
      oldBalance: Number(bank.current_balance) || 0,
      newBalance,
    });
  }

  // ── Step 4: Unlinked banks get proportional share of remaining Cash 1000 ──
  if (unlinked.length > 0) {
    const remainingCash = await computeGLBalance(supabase, companyId, cashAccount.id);
    const oldTotal = unlinked.reduce((s, b) => s + (Number(b.current_balance) || 0), 0);

    for (const bank of unlinked) {
      const ratio = oldTotal > 0
        ? (Number(bank.current_balance) || 0) / oldTotal
        : 1 / unlinked.length;
      const newBalance = Math.round(remainingCash * ratio * 100) / 100;

      await supabase
        .from("bank_accounts")
        .update({ current_balance: newBalance })
        .eq("id", bank.id);
      updates.push({
        id: bank.id,
        name: bank.name,
        oldBalance: Number(bank.current_balance) || 0,
        newBalance,
      });
    }
  }

  const glCashTotal = updates.reduce((s, u) => s + u.newBalance, 0);
  return { updates, reclassified: reclassifiedCount, obeAdjustment: obeAdjustmentAmount, glCashTotal };
}
