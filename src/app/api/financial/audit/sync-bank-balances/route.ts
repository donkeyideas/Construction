import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";

/**
 * POST /api/financial/audit/sync-bank-balances
 * Recalculates each bank account's current_balance from posted GL cash JE lines.
 *
 * Strategy:
 *  - Linked banks with JE lines in their sub-account → balance = sub-account GL balance
 *  - Linked banks with empty sub-accounts + unlinked banks → proportional share of
 *    parent Cash (1000) GL balance, distributed by their current_balance ratios
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

    // Split banks: linked (have gl_account_id) vs unlinked
    const linked = bankAccounts.filter((b) => b.gl_account_id);
    const unlinked = bankAccounts.filter((b) => !b.gl_account_id);

    // Phase 1: Compute GL balances for all linked bank sub-accounts
    const linkedWithBalance: { bank: typeof linked[0]; glBalance: number }[] = [];
    for (const bank of linked) {
      const glBalance = await computeGLBalance(bank.gl_account_id!);
      linkedWithBalance.push({ bank, glBalance });
    }

    // Linked banks with actual GL balances get synced directly
    const resolvedLinked = linkedWithBalance.filter((lb) => lb.glBalance !== 0);
    // Linked banks with empty sub-accounts need proportional distribution (same as unlinked)
    const emptyLinked = linkedWithBalance.filter((lb) => lb.glBalance === 0);

    // Update directly-resolved linked banks
    for (const { bank, glBalance } of resolvedLinked) {
      await supabase
        .from("bank_accounts")
        .update({ current_balance: glBalance })
        .eq("id", bank.id);
      updates.push({
        id: bank.id,
        name: bank.name,
        oldBalance: Number(bank.current_balance) || 0,
        newBalance: glBalance,
      });
    }

    // Phase 2: Distribute parent Cash GL balance to banks that need it
    const needsDistribution = [
      ...emptyLinked.map((lb) => lb.bank),
      ...unlinked,
    ];

    if (needsDistribution.length > 0) {
      // Find the parent Cash & Equivalents account (1000)
      const { data: cashAccounts } = await supabase
        .from("chart_of_accounts")
        .select("id")
        .eq("company_id", companyId)
        .eq("account_type", "asset")
        .eq("is_active", true)
        .or("name.ilike.%cash%,name.ilike.%checking%,name.ilike.%savings%");

      // Exclude GL accounts already resolved (linked banks with actual balances)
      const resolvedGlIds = new Set(resolvedLinked.map((rl) => rl.bank.gl_account_id));
      // Also exclude the empty sub-account IDs (they have $0, no point summing)
      const emptyGlIds = new Set(emptyLinked.map((el) => el.bank.gl_account_id));
      const distributableCashIds = (cashAccounts ?? [])
        .map((a) => a.id)
        .filter((id) => !resolvedGlIds.has(id) && !emptyGlIds.has(id));

      let availableCash = 0;
      for (const cid of distributableCashIds) {
        availableCash += await computeGLBalance(cid);
      }

      // Distribute proportionally by current_balance ratios
      const oldTotal = needsDistribution.reduce(
        (s, b) => s + (Number(b.current_balance) || 0),
        0
      );

      for (const bank of needsDistribution) {
        const ratio =
          oldTotal > 0
            ? (Number(bank.current_balance) || 0) / oldTotal
            : 1 / needsDistribution.length;
        const newBalance = Math.round(availableCash * ratio * 100) / 100;

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
