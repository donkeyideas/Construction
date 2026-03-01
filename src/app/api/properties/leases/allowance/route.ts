import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import {
  calculateAgingAnalysis,
  postAllowanceAdjustment,
} from "@/lib/utils/credit-loss";

// ---------------------------------------------------------------------------
// Shared: fetch all data needed for the aging calculation
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchAgingData(supabase: any, companyId: string) {
  const [leasesResult, paymentsResult, allowanceBalanceResult, allowanceJEsResult] = await Promise.all([
    // Active + expired leases with property/unit context
    supabase
      .from("leases")
      .select("id, tenant_name, monthly_rent, lease_start, lease_end, status, properties(name)")
      .eq("company_id", companyId)
      .in("status", ["active", "expired"]),

    // All rent payments for those leases
    supabase
      .from("rent_payments")
      .select("lease_id, payment_date, due_date")
      .eq("company_id", companyId),

    // Current balance of the Allowance account (1230 — credit normal, so credit - debit)
    supabase
      .from("chart_of_accounts")
      .select("id")
      .eq("company_id", companyId)
      .ilike("name", "%allowance%doubtful%")
      .maybeSingle(),

    // Posted allowance journal entries (for display in UI)
    supabase
      .from("journal_entries")
      .select("id, entry_number, entry_date, description, reference, journal_entry_lines(debit, credit, description, chart_of_accounts(account_number, name))")
      .eq("company_id", companyId)
      .like("reference", "allowance:%")
      .eq("status", "posted")
      .order("entry_date", { ascending: false }),
  ]);

  const leases = (leasesResult.data ?? []).map((l: Record<string, unknown>) => {
    const props = l.properties as { name: string } | { name: string }[] | null;
    const propertyName = Array.isArray(props) ? (props[0]?.name ?? "Unknown") : (props?.name ?? "Unknown");
    return {
      id: l.id as string,
      tenant_name: l.tenant_name as string | null,
      monthly_rent: l.monthly_rent as number | null,
      lease_start: l.lease_start as string | null,
      lease_end: l.lease_end as string | null,
      status: l.status as string,
      property_name: propertyName,
    };
  });

  const payments = paymentsResult.data ?? [];

  // Get current allowance balance from journal entry lines
  let currentAllowanceBalance = 0;
  const allowanceAccount = allowanceBalanceResult.data;
  if (allowanceAccount?.id) {
    const { data: balanceRows } = await supabase
      .from("journal_entry_lines")
      .select("debit, credit, journal_entries!inner(company_id, status)")
      .eq("account_id", allowanceAccount.id)
      .eq("journal_entries.company_id", companyId)
      .eq("journal_entries.status", "posted");

    if (balanceRows) {
      for (const row of balanceRows) {
        currentAllowanceBalance += (row.credit ?? 0) - (row.debit ?? 0);
      }
    }
  }

  const allowanceJEs = allowanceJEsResult.data ?? [];

  return { leases, payments, currentAllowanceBalance, allowanceJEs };
}

// ---------------------------------------------------------------------------
// GET /api/properties/leases/allowance
// Preview the aging analysis without posting any JE
// ---------------------------------------------------------------------------

export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { leases, payments, currentAllowanceBalance, allowanceJEs } = await fetchAgingData(supabase, userCtx.companyId);

    const analysis = calculateAgingAnalysis(leases, payments, currentAllowanceBalance);

    return NextResponse.json({ ...analysis, allowanceJEs });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// POST /api/properties/leases/allowance
// Calculate and post the allowance adjustment JE
// ---------------------------------------------------------------------------

export async function POST(_request: NextRequest) {
  try {
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { leases, payments, currentAllowanceBalance } = await fetchAgingData(supabase, userCtx.companyId);

    const analysis = calculateAgingAnalysis(leases, payments, currentAllowanceBalance);
    const postResult = await postAllowanceAdjustment(supabase, userCtx.companyId, userCtx.userId, analysis);

    // Re-fetch updated current balance + JEs for the response
    const updatedBalance = analysis.currentAllowance + postResult.adjustmentAmount;
    const { allowanceJEs } = await fetchAgingData(supabase, userCtx.companyId);
    const updatedAnalysis = {
      ...analysis,
      currentAllowance: updatedBalance,
      adjustmentNeeded: 0,
      allowanceJEs,
    };

    return NextResponse.json({
      success: true,
      analysis: updatedAnalysis,
      posted: postResult.posted,
      adjustmentAmount: postResult.adjustmentAmount,
      jeId: postResult.jeId,
      reference: postResult.reference,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/properties/leases/allowance
// Reset all allowance JEs (clears account 1230 balance)
// ---------------------------------------------------------------------------

export async function DELETE(_request: NextRequest) {
  try {
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find all allowance JEs for this company
    const { data: jes } = await supabase
      .from("journal_entries")
      .select("id")
      .eq("company_id", userCtx.companyId)
      .like("reference", "allowance:%");

    let deleted = 0;
    if (jes && jes.length > 0) {
      await supabase
        .from("journal_entries")
        .delete()
        .in("id", jes.map((j: { id: string }) => j.id));
      deleted = jes.length;
    }

    return NextResponse.json({ success: true, deleted });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
