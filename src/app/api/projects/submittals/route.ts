import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";

// ---------------------------------------------------------------------------
// POST /api/projects/submittals — Create a new Submittal
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    if (!body.project_id) {
      return NextResponse.json({ error: "Project is required." }, { status: 400 });
    }

    if (!body.title || typeof body.title !== "string" || !body.title.trim()) {
      return NextResponse.json({ error: "Title is required." }, { status: 400 });
    }

    // Auto-generate submittal number: count existing for this project + 1
    const { count } = await supabase
      .from("submittals")
      .select("id", { count: "exact", head: true })
      .eq("company_id", userCtx.companyId)
      .eq("project_id", body.project_id);

    const num = (count ?? 0) + 1;
    const submittal_number = `SUB-${String(num).padStart(3, "0")}`;

    const { data, error } = await supabase
      .from("submittals")
      .insert({
        company_id: userCtx.companyId,
        project_id: body.project_id,
        submittal_number,
        title: body.title.trim(),
        spec_section: body.spec_section?.trim() || null,
        due_date: body.due_date || null,
        reviewer_id: body.reviewer_id || null,
        submitted_by: userCtx.userId,
        status: "pending",
      })
      .select("*")
      .single();

    if (error) {
      console.error("Insert submittal error:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error("POST /api/projects/submittals error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/projects/submittals — Update an existing Submittal
// ---------------------------------------------------------------------------

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    if (!body.id) {
      return NextResponse.json({ error: "Submittal id is required." }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (body.title !== undefined) updateData.title = body.title;
    if (body.spec_section !== undefined) updateData.spec_section = body.spec_section;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.reviewer_id !== undefined) updateData.reviewer_id = body.reviewer_id;
    if (body.due_date !== undefined) updateData.due_date = body.due_date;
    if (body.review_comments !== undefined) updateData.review_comments = body.review_comments;

    // If approving/rejecting, set reviewed_at
    if (body.status === "approved" || body.status === "rejected") {
      updateData.reviewed_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from("submittals")
      .update(updateData)
      .eq("id", body.id)
      .eq("company_id", userCtx.companyId)
      .select("*")
      .single();

    if (error) {
      console.error("Update submittal error:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("PATCH /api/projects/submittals error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/projects/submittals — Delete a Submittal
// ---------------------------------------------------------------------------

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    if (!body.id) {
      return NextResponse.json({ error: "Submittal id is required." }, { status: 400 });
    }

    const { data: existing } = await supabase
      .from("submittals")
      .select("id")
      .eq("id", body.id)
      .eq("company_id", userCtx.companyId)
      .single();

    if (!existing) {
      return NextResponse.json({ error: "Submittal not found" }, { status: 404 });
    }

    const { error } = await supabase
      .from("submittals")
      .delete()
      .eq("id", body.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/projects/submittals error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
