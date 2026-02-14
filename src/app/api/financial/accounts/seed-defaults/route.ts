import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";

// POST /api/financial/accounts/seed-defaults
// Seeds the standard construction chart of accounts for the company.
// Only works if the company has NO existing accounts (prevents duplicates).

export async function POST() {
  try {
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if company already has accounts
    const { count } = await supabase
      .from("chart_of_accounts")
      .select("id", { count: "exact", head: true })
      .eq("company_id", userCtx.companyId);

    if ((count ?? 0) > 0) {
      return NextResponse.json(
        { error: "Chart of accounts already has entries. Delete existing accounts first or add accounts manually." },
        { status: 409 }
      );
    }

    // Call the seed function
    const { error } = await supabase.rpc("seed_company_chart_of_accounts", {
      p_company_id: userCtx.companyId,
    });

    if (error) {
      console.error("Seed chart of accounts error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("POST /api/financial/accounts/seed-defaults error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
