import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";

// ---------------------------------------------------------------------------
// POST /api/projects/rfis — Create a new RFI
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Validate required fields
    if (!body.project_id) {
      return NextResponse.json(
        { error: "Project is required." },
        { status: 400 }
      );
    }

    if (!body.subject || typeof body.subject !== "string" || !body.subject.trim()) {
      return NextResponse.json(
        { error: "Subject is required." },
        { status: 400 }
      );
    }

    if (!body.question || typeof body.question !== "string" || !body.question.trim()) {
      return NextResponse.json(
        { error: "Question is required." },
        { status: 400 }
      );
    }

    // Auto-generate RFI number: count existing RFIs for this project + 1
    const { count } = await supabase
      .from("rfis")
      .select("id", { count: "exact", head: true })
      .eq("company_id", userCtx.companyId)
      .eq("project_id", body.project_id);

    const rfiNum = (count ?? 0) + 1;
    const rfi_number = `RFI-${String(rfiNum).padStart(3, "0")}`;

    const { data: rfi, error } = await supabase
      .from("rfis")
      .insert({
        company_id: userCtx.companyId,
        project_id: body.project_id,
        rfi_number,
        subject: body.subject.trim(),
        question: body.question.trim(),
        priority: body.priority || "medium",
        due_date: body.due_date || null,
        assigned_to: body.assigned_to || null,
        submitted_by: userCtx.userId,
        status: "open",
      })
      .select("*")
      .single();

    if (error) {
      console.error("Insert rfi error:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(rfi, { status: 201 });
  } catch (err) {
    console.error("POST /api/projects/rfis error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
