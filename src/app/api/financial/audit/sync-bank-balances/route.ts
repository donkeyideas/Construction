import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { createOpeningBalanceJE } from "@/lib/utils/bank-gl-linkage";

/**
 * POST /api/financial/audit/sync-bank-balances
 * Recalculates each bank account's current_balance from posted GL cash JE lines.
 * Maps bank accounts to GL accounts by matching account names.
 */
export async function POST() {
  try {
    const supabase = await createClient();
    const ctx = await getCurrentUserCompany(supabase);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { companyId } = ctx;

    // Fetch bank accounts with GL linkage
    const { data: bankAccounts, error: bankErr } = await supabase
      .from("bank_accounts")
      .select("id, name, current_balance, gl_account_id")
      .eq("company_id", companyId);

    if (bankErr || !bankAccounts) {
      return NextResponse.json({ error: "Failed to fetch bank accounts" }, { status: 500 });
    }

    const updates: { id: string; name: string; oldBalance: number; newBalance: number }[] = [];

    // Helper: compute GL balance for a specific account from posted JE lines (paginated)
    async function computeGLBalance(accountId: string): Promise<number> {
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

    // Banks with linked GL accounts get exact balance from their specific GL account
    const linked = bankAccounts.filter((b) => b.gl_account_id);
    const unlinked = bankAccounts.filter((b) => !b.gl_account_id);

    // Pre-step: create missing opening balance JEs for linked banks.
    // If the Excel import ran before the GL-linkage fix, sub-accounts have no JE lines.
    // We must create the reclassification JE (DR sub-acct / CR 1000) BEFORE computing balances.
    for (const bank of linked) {
      const currentBal = Number(bank.current_balance) || 0;
      if (currentBal <= 0) continue; // nothing to reclassify

      // Check if opening balance JE already exists
      const ref = `opening_balance:bank:${bank.id}`;
      const { data: existingOB } = await supabase
        .from("journal_entries")
        .select("id")
        .eq("company_id", companyId)
        .eq("reference", ref)
        .limit(1);

      if (existingOB && existingOB.length > 0) continue; // already exists

      // Create the opening balance reclassification JE
      try {
        await createOpeningBalanceJE(
          supabase,
          companyId,
          ctx.userId,
          bank.id,
          bank.gl_account_id!,
          currentBal,
          bank.name
        );
      } catch (jeErr) {
        console.warn(`Failed to create opening balance JE for ${bank.name}:`, jeErr);
      }
    }

    for (const bank of linked) {
      const newBalance = await computeGLBalance(bank.gl_account_id!);
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

    // Unlinked banks fall back to proportional distribution of total cash GL balance
    if (unlinked.length > 0) {
      const { data: cashAccounts } = await supabase
        .from("chart_of_accounts")
        .select("id")
        .eq("company_id", companyId)
        .eq("account_type", "asset")
        .eq("is_active", true)
        .or("name.ilike.%cash%,name.ilike.%checking%,name.ilike.%savings%");

      const linkedGlIds = new Set(linked.map((b) => b.gl_account_id));
      const unlinkedCashIds = (cashAccounts ?? [])
        .map((a) => a.id)
        .filter((id) => !linkedGlIds.has(id));

      let remainingGlBalance = 0;
      for (const cid of unlinkedCashIds) {
        remainingGlBalance += await computeGLBalance(cid);
      }

      const oldTotal = unlinked.reduce((s, b) => s + (Number(b.current_balance) || 0), 0);
      for (const bank of unlinked) {
        const ratio = oldTotal > 0
          ? (Number(bank.current_balance) || 0) / oldTotal
          : 1 / unlinked.length;
        const newBalance = Math.round(remainingGlBalance * ratio * 100) / 100;

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

    const totalGlBalance = updates.reduce((s, u) => s + u.newBalance, 0);

    return NextResponse.json({
      success: true,
      glCashTotal: totalGlBalance,
      updates,
    });
  } catch (err) {
    console.error("Sync bank balances error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
