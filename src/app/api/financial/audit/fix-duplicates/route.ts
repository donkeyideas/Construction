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

    // Get all JEs with references
    const { data: jes } = await supabase
      .from("journal_entries")
      .select("id, reference, created_at")
      .eq("company_id", companyId)
      .not("reference", "is", null)
      .order("created_at", { ascending: false });

    if (!jes || jes.length === 0) {
      return NextResponse.json({ message: "No journal entries found", removed: 0 });
    }

    // Group by reference, keep newest (first in desc order), mark rest for deletion
    const seen = new Set<string>();
    const toDelete: string[] = [];

    for (const je of jes) {
      if (!je.reference) continue;
      if (seen.has(je.reference)) {
        toDelete.push(je.id);
      } else {
        seen.add(je.reference);
      }
    }

    if (toDelete.length === 0) {
      return NextResponse.json({ message: "No duplicates found", removed: 0 });
    }

    // Delete JE lines first, then JEs
    let removed = 0;
    for (let i = 0; i < toDelete.length; i += 50) {
      const batch = toDelete.slice(i, i + 50);
      await supabase
        .from("journal_entry_lines")
        .delete()
        .in("journal_entry_id", batch);
      const { error } = await supabase
        .from("journal_entries")
        .delete()
        .in("id", batch);
      if (!error) removed += batch.length;
    }

    return NextResponse.json({ message: `Removed ${removed} duplicate journal entries`, removed });
  } catch (err) {
    console.error("fix-duplicates error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
