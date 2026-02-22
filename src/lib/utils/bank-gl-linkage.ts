/**
 * Bank Account ↔ GL Account Linkage Utility
 *
 * Ensures every bank account has a corresponding GL account in the Chart of Accounts.
 * When a bank account is created (API or import), this utility:
 *   1. Finds or creates a matching GL account (asset, 1010-1049 range)
 *   2. Links it via bank_accounts.gl_account_id
 *   3. Creates an opening balance JE if the bank has an initial balance
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { createPostedJournalEntry } from "@/lib/queries/financial";
import type { JournalEntryCreateData } from "@/lib/queries/financial";

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
  const { data: existing } = await supabase
    .from("bank_accounts")
    .select("gl_account_id")
    .eq("id", bankAccountId)
    .single();

  if (existing?.gl_account_id) {
    return { glAccountId: existing.gl_account_id, created: false };
  }

  // 2. Search for matching GL account by name pattern
  const nameLower = bankName.toLowerCase();
  const { data: candidates } = await supabase
    .from("chart_of_accounts")
    .select("id, account_number, name")
    .eq("company_id", companyId)
    .eq("account_type", "asset")
    .eq("is_active", true)
    .gte("account_number", "1000")
    .lte("account_number", "1049")
    .order("account_number");

  let matchedId: string | null = null;
  if (candidates) {
    for (const ca of candidates) {
      const caNameLower = ca.name.toLowerCase();
      if (
        caNameLower === nameLower ||
        nameLower.includes(caNameLower) ||
        caNameLower.includes(nameLower) ||
        (nameLower.includes("operating") && caNameLower.includes("operating")) ||
        (nameLower.includes("payroll") && caNameLower.includes("payroll")) ||
        (nameLower.includes("savings") && caNameLower.includes("savings")) ||
        (nameLower.includes("reserve") && caNameLower.includes("reserve")) ||
        (nameLower.includes("checking") && caNameLower.includes("checking"))
      ) {
        // Make sure this GL account isn't already linked to a different bank account
        const { data: alreadyLinked } = await supabase
          .from("bank_accounts")
          .select("id")
          .eq("gl_account_id", ca.id)
          .neq("id", bankAccountId)
          .limit(1);

        if (!alreadyLinked || alreadyLinked.length === 0) {
          matchedId = ca.id;
          break;
        }
      }
    }
  }

  let glAccountId: string;
  let created = false;

  if (matchedId) {
    glAccountId = matchedId;
  } else {
    // 3. Auto-create a new GL account
    // Find next available account number in 1010-1049
    const maxNum = candidates && candidates.length > 0
      ? Math.max(...candidates.map((c) => parseInt(c.account_number, 10)))
      : 1009;
    const nextNum = Math.max(maxNum + 1, 1010);

    if (nextNum > 1049) {
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
        throw new Error("No available account numbers in 1010-1049 range and no Cash parent (1000) account found");
      }
    } else {
      // Find parent account 1000 for hierarchy
      const { data: parentAccount } = await supabase
        .from("chart_of_accounts")
        .select("id")
        .eq("company_id", companyId)
        .eq("account_number", "1000")
        .single();

      const glName = bankName;
      const subType = bankType === "savings" ? "current_asset" : "current_asset";
      const description = `Bank account: ${bankName} (${bankType})`;

      const { data: newAccount, error: createErr } = await supabase
        .from("chart_of_accounts")
        .insert({
          company_id: companyId,
          account_number: String(nextNum),
          name: glName,
          account_type: "asset",
          sub_type: subType,
          normal_balance: "debit",
          is_active: true,
          description,
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
 * DR Bank GL Account / CR Opening Balance Equity
 */
async function createOpeningBalanceJE(
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

  // Get or create Opening Balance Equity account (3050)
  const equityAccountId = await getOrCreateOpeningBalanceEquity(supabase, companyId);
  if (!equityAccountId) return;

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
        account_id: equityAccountId,
        debit: 0,
        credit: amount,
        description: `Opening balance - ${bankName}`,
      },
    ],
  };

  await createPostedJournalEntry(supabase, companyId, userId, entryData);
}

/**
 * Get or create the "Opening Balance Equity" account (3050).
 */
async function getOrCreateOpeningBalanceEquity(
  supabase: SupabaseClient,
  companyId: string
): Promise<string | null> {
  // Check if it already exists
  const { data: existing } = await supabase
    .from("chart_of_accounts")
    .select("id")
    .eq("company_id", companyId)
    .eq("account_number", "3050")
    .single();

  if (existing) return existing.id;

  // Also check by name pattern
  const { data: byName } = await supabase
    .from("chart_of_accounts")
    .select("id")
    .eq("company_id", companyId)
    .eq("account_type", "equity")
    .ilike("name", "%opening balance%")
    .limit(1);

  if (byName && byName.length > 0) return byName[0].id;

  // Find parent equity account (3000 Owner's Equity) for hierarchy
  const { data: parentEquity } = await supabase
    .from("chart_of_accounts")
    .select("id")
    .eq("company_id", companyId)
    .eq("account_number", "3000")
    .single();

  // Create the account
  const { data: created, error } = await supabase
    .from("chart_of_accounts")
    .insert({
      company_id: companyId,
      account_number: "3050",
      name: "Opening Balance Equity",
      account_type: "equity",
      sub_type: "owners_equity",
      normal_balance: "credit",
      is_active: true,
      description: "Offset account for opening balance entries when bank accounts are created",
      parent_id: parentEquity?.id || null,
    })
    .select("id")
    .single();

  if (error || !created) {
    console.error("Failed to create Opening Balance Equity account:", error?.message);
    return null;
  }

  return created.id;
}
