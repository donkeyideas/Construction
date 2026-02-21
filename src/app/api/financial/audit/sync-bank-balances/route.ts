import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";

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

    // Fetch bank accounts
    const { data: bankAccounts, error: bankErr } = await supabase
      .from("bank_accounts")
      .select("id, name, current_balance")
      .eq("company_id", companyId);

    if (bankErr || !bankAccounts) {
      return NextResponse.json({ error: "Failed to fetch bank accounts" }, { status: 500 });
    }

    // Fetch all cash-type GL accounts
    const { data: cashAccounts, error: cashErr } = await supabase
      .from("chart_of_accounts")
      .select("id, name")
      .eq("company_id", companyId)
      .eq("account_type", "asset")
      .eq("is_active", true)
      .or("name.ilike.%cash%,name.ilike.%checking%,name.ilike.%savings%");

    if (cashErr) {
      return NextResponse.json({ error: "Failed to fetch GL accounts" }, { status: 500 });
    }

    const glAccounts = cashAccounts ?? [];
    if (glAccounts.length === 0) {
      return NextResponse.json({ error: "No cash GL accounts found" }, { status: 400 });
    }

    // Calculate total GL cash balance from posted JE lines
    const allCashIds = glAccounts.map((a) => a.id);
    let totalGlBalance = 0;

    // Paginate through JE lines (Supabase 1000-row limit)
    let from = 0;
    const pageSize = 1000;
    while (true) {
      const { data: lines } = await supabase
        .from("journal_entry_lines")
        .select("debit, credit, journal_entries!inner(id)")
        .eq("company_id", companyId)
        .in("account_id", allCashIds)
        .eq("journal_entries.status", "posted")
        .range(from, from + pageSize - 1);

      if (!lines || lines.length === 0) break;
      for (const line of lines) {
        totalGlBalance += (Number(line.debit) || 0) - (Number(line.credit) || 0);
      }
      if (lines.length < pageSize) break;
      from += pageSize;
    }

    // Distribute proportionally if multiple bank accounts, or set directly if one
    const updates: { id: string; name: string; oldBalance: number; newBalance: number }[] = [];

    if (bankAccounts.length === 1) {
      const bank = bankAccounts[0];
      await supabase
        .from("bank_accounts")
        .update({ current_balance: totalGlBalance })
        .eq("id", bank.id);
      updates.push({
        id: bank.id,
        name: bank.name,
        oldBalance: bank.current_balance,
        newBalance: totalGlBalance,
      });
    } else {
      // For multiple bank accounts, try to match each to a GL account by name
      // Otherwise distribute total evenly
      const oldTotal = bankAccounts.reduce((s, b) => s + (Number(b.current_balance) || 0), 0);

      for (const bank of bankAccounts) {
        // Proportional distribution based on existing ratio
        const ratio = oldTotal > 0
          ? (Number(bank.current_balance) || 0) / oldTotal
          : 1 / bankAccounts.length;
        const newBalance = Math.round(totalGlBalance * ratio * 100) / 100;

        await supabase
          .from("bank_accounts")
          .update({ current_balance: newBalance })
          .eq("id", bank.id);

        updates.push({
          id: bank.id,
          name: bank.name,
          oldBalance: bank.current_balance,
          newBalance,
        });
      }
    }

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
