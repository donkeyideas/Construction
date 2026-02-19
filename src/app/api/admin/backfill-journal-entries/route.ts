import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { backfillMissingJournalEntries } from "@/lib/utils/backfill-journal-entries";

// ---------------------------------------------------------------------------
// POST /api/admin/backfill-journal-entries
// One-time admin action to backfill missing journal entries for all entities.
// ---------------------------------------------------------------------------

export async function POST() {
  try {
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await backfillMissingJournalEntries(
      supabase,
      userCtx.companyId,
      userCtx.userId
    );

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (err) {
    console.error("Backfill journal entries error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
