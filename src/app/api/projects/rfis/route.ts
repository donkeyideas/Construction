import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { createNotifications } from "@/lib/utils/notifications";

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

    try {
      await createNotifications(supabase, {
        companyId: userCtx.companyId,
        actorUserId: userCtx.userId,
        title: `RFI ${rfi_number}: ${body.subject.trim()}`,
        message: `New RFI submitted: "${body.subject.trim()}"`,
        notificationType: "info",
        entityType: "rfi",
        entityId: rfi.id,
      });
    } catch (e) { console.warn("Notification failed:", e); }

    return NextResponse.json(rfi, { status: 201 });
  } catch (err) {
    console.error("POST /api/projects/rfis error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/projects/rfis — Update an existing RFI
// ---------------------------------------------------------------------------

export async function PATCH(request: NextRequest) {
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

    if (!body.id) {
      return NextResponse.json(
        { error: "RFI id is required." },
        { status: 400 }
      );
    }

    // Build update payload from allowed fields
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (body.subject !== undefined) updateData.subject = body.subject;
    if (body.question !== undefined) updateData.question = body.question;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.priority !== undefined) updateData.priority = body.priority;
    if (body.answer !== undefined) updateData.answer = body.answer;
    if (body.answered_by !== undefined) updateData.answered_by = body.answered_by;
    if (body.answered_at !== undefined) updateData.answered_at = body.answered_at;
    if (body.assigned_to !== undefined) updateData.assigned_to = body.assigned_to;
    if (body.due_date !== undefined) updateData.due_date = body.due_date;
    if (body.cost_impact !== undefined) updateData.cost_impact = body.cost_impact;
    if (body.schedule_impact_days !== undefined) updateData.schedule_impact_days = body.schedule_impact_days;

    // If closing with an answer, auto-set answered_by and answered_at
    if (body.status === "closed" && body.answer) {
      updateData.answered_by = userCtx.userId;
      updateData.answered_at = new Date().toISOString();
    }

    const { data: rfi, error } = await supabase
      .from("rfis")
      .update(updateData)
      .eq("id", body.id)
      .select("*")
      .single();

    if (error) {
      console.error("Update rfi error:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    if (body.status === "closed") {
      try {
        await createNotifications(supabase, {
          companyId: userCtx.companyId,
          actorUserId: userCtx.userId,
          title: `RFI ${rfi.rfi_number} answered`,
          message: `RFI "${rfi.subject}" has been answered and closed.`,
          notificationType: "info",
          entityType: "rfi",
          entityId: rfi.id,
        });
      } catch (e) { console.warn("Notification failed:", e); }
    }

    return NextResponse.json(rfi);
  } catch (err) {
    console.error("PATCH /api/projects/rfis error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/projects/rfis — Delete an RFI
// ---------------------------------------------------------------------------

export async function DELETE(request: NextRequest) {
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

    if (!body.id) {
      return NextResponse.json(
        { error: "RFI id is required." },
        { status: 400 }
      );
    }

    // Verify ownership
    const { data: existing } = await supabase
      .from("rfis")
      .select("id")
      .eq("id", body.id)
      .eq("company_id", userCtx.companyId)
      .single();

    if (!existing) {
      return NextResponse.json(
        { error: "RFI not found" },
        { status: 404 }
      );
    }

    const { error } = await supabase
      .from("rfis")
      .delete()
      .eq("id", body.id);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/projects/rfis error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
