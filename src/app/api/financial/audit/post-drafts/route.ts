import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";

/**
 * POST /api/financial/audit/post-drafts
 * Bulk-posts all draft journal entries for the current company.
 */
export async function POST() {
  try {
    const supabase = await createClient();
    const ctx = await getCurrentUserCompany(supabase);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { companyId, userId } = ctx;

    // Get all draft JEs
    const { data: drafts, error: fetchErr } = await supabase
      .from("journal_entries")
      .select("id")
      .eq("company_id", companyId)
      .eq("status", "draft");

    if (fetchErr) {
      return NextResponse.json({ error: "Failed to fetch draft entries" }, { status: 500 });
    }

    if (!drafts || drafts.length === 0) {
      return NextResponse.json({ success: true, count: 0 });
    }

    const ids = drafts.map((d) => d.id);
    const now = new Date().toISOString();

    const { error: updateErr } = await supabase
      .from("journal_entries")
      .update({
        status: "posted",
        posted_by: userId,
        posted_at: now,
      })
      .in("id", ids);

    if (updateErr) {
      return NextResponse.json({ error: "Failed to post entries" }, { status: 500 });
    }

    return NextResponse.json({ success: true, count: ids.length });
  } catch (err) {
    console.error("Post drafts error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
