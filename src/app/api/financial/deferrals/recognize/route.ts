import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { schedule_id } = await request.json();

    if (!schedule_id) {
      return NextResponse.json({ error: "schedule_id is required" }, { status: 400 });
    }

    // Fetch the schedule row (ensure it belongs to this company)
    const { data: row, error: fetchErr } = await supabase
      .from("invoice_deferral_schedule")
      .select("id, status")
      .eq("id", schedule_id)
      .eq("company_id", userCtx.companyId)
      .single();

    if (fetchErr || !row) {
      return NextResponse.json({ error: "Schedule entry not found" }, { status: 404 });
    }

    if (row.status === "recognized") {
      return NextResponse.json({ message: "Already recognized" });
    }

    // Mark as recognized
    const { error: updateErr } = await supabase
      .from("invoice_deferral_schedule")
      .update({ status: "recognized" })
      .eq("id", schedule_id);

    if (updateErr) {
      return NextResponse.json({ error: "Failed to update status" }, { status: 500 });
    }

    return NextResponse.json({ message: "Month recognized", id: schedule_id });
  } catch (err) {
    console.error("deferrals/recognize error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
