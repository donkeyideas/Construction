import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";

// ---------------------------------------------------------------------------
// PATCH /api/projects/[id]/tasks/[taskId] - Update a task
// ---------------------------------------------------------------------------

const VALID_STATUSES = [
  "not_started",
  "in_progress",
  "completed",
  "blocked",
];

const VALID_PRIORITIES = ["low", "medium", "high", "critical"];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  try {
    const { id: projectId, taskId } = await params;
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify the task belongs to this project and company
    const { data: existing, error: fetchErr } = await supabase
      .from("project_tasks")
      .select("id, company_id, project_id")
      .eq("id", taskId)
      .eq("project_id", projectId)
      .single();

    if (fetchErr || !existing) {
      return NextResponse.json(
        { error: "Task not found." },
        { status: 404 }
      );
    }

    if (existing.company_id !== userCtx.companyId) {
      return NextResponse.json(
        { error: "Task not found." },
        { status: 404 }
      );
    }

    // Only owners, admins, PMs, supers can update tasks
    const allowedRoles = ["owner", "admin", "project_manager", "superintendent"];
    if (!allowedRoles.includes(userCtx.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    // Validate and apply fields
    if (body.status !== undefined) {
      if (!VALID_STATUSES.includes(body.status)) {
        return NextResponse.json(
          { error: "Invalid status." },
          { status: 400 }
        );
      }
      updatePayload.status = body.status;

      // Auto-set completion_pct when status changes
      if (body.status === "completed" && body.completion_pct === undefined) {
        updatePayload.completion_pct = 100;
      }
      if (body.status === "not_started" && body.completion_pct === undefined) {
        updatePayload.completion_pct = 0;
      }
    }

    if (body.priority !== undefined) {
      if (!VALID_PRIORITIES.includes(body.priority)) {
        return NextResponse.json(
          { error: "Invalid priority." },
          { status: 400 }
        );
      }
      updatePayload.priority = body.priority;
    }

    if (body.completion_pct !== undefined) {
      const pct = Number(body.completion_pct);
      if (isNaN(pct) || pct < 0 || pct > 100) {
        return NextResponse.json(
          { error: "Completion must be 0-100." },
          { status: 400 }
        );
      }
      updatePayload.completion_pct = pct;
    }

    if (body.is_milestone !== undefined) {
      updatePayload.is_milestone = Boolean(body.is_milestone);
    }

    if (body.is_critical_path !== undefined) {
      updatePayload.is_critical_path = Boolean(body.is_critical_path);
    }

    if (body.name !== undefined) {
      updatePayload.name = body.name;
    }

    if (body.description !== undefined) {
      updatePayload.description = body.description;
    }

    if (body.start_date !== undefined) {
      updatePayload.start_date = body.start_date || null;
    }

    if (body.end_date !== undefined) {
      updatePayload.end_date = body.end_date || null;
    }

    const { data, error } = await supabase
      .from("project_tasks")
      .update(updatePayload)
      .eq("id", taskId)
      .select()
      .single();

    if (error) {
      console.error("PATCH task error:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ task: data, success: true });
  } catch (err) {
    console.error("PATCH /api/projects/[id]/tasks/[taskId] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
