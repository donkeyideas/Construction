import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";

// ---------------------------------------------------------------------------
// GET /api/import/excel/history — Fetch import run history
// ---------------------------------------------------------------------------

export async function GET() {
  try {
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: runs, error } = await supabase
      .from("import_runs")
      .select("*")
      .eq("company_id", userCtx.companyId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Failed to fetch import runs:", error);
      return NextResponse.json(
        { error: "Failed to fetch import history" },
        { status: 500 }
      );
    }

    return NextResponse.json({ runs: runs || [] });
  } catch (err) {
    console.error("GET /api/import/excel/history error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
