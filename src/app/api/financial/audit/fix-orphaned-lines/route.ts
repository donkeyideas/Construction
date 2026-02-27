import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";

export async function POST() {
  try {
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { companyId } = userCtx;

    // Get all active account IDs for this company
    const { data: accounts } = await supabase
      .from("chart_of_accounts")
      .select("id")
      .eq("company_id", companyId);

    const validIds = new Set((accounts ?? []).map((a) => a.id));

    // Get all JE lines for this company's JEs
    const { data: jeLines } = await supabase
      .from("journal_entry_lines")
      .select("id, account_id, journal_entries!inner(company_id)")
      .eq("journal_entries.company_id", companyId);

    const orphanedIds: string[] = [];
    for (const line of jeLines ?? []) {
      if (!validIds.has(line.account_id)) {
        orphanedIds.push(line.id);
      }
    }

    if (orphanedIds.length === 0) {
      return NextResponse.json({ message: "No orphaned lines found", removed: 0 });
    }

    // Delete orphaned lines in batches of 100
    let removed = 0;
    for (let i = 0; i < orphanedIds.length; i += 100) {
      const batch = orphanedIds.slice(i, i + 100);
      const { error } = await supabase
        .from("journal_entry_lines")
        .delete()
        .in("id", batch);
      if (!error) removed += batch.length;
    }

    return NextResponse.json({ message: `Removed ${removed} orphaned JE lines`, removed });
  } catch (err) {
    console.error("fix-orphaned-lines error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
