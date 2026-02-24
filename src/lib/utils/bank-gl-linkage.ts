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
