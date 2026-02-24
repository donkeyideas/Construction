import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { syncBankBalancesFromGL } from "@/lib/utils/bank-gl-linkage";

/**
 * POST /api/financial/audit/sync-bank-balances
 *
 * Creates reclassification JEs for bank sub-accounts, adjusts Cash 1000 if
 * negative via Opening Balance Equity, and updates bank_accounts.current_balance.
 */
export async function POST() {
  try {
    const supabase = await createClient();
    const ctx = await getCurrentUserCompany(supabase);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await syncBankBalancesFromGL(supabase, ctx.companyId, ctx.userId);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (err) {
    console.error("Sync bank balances error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
