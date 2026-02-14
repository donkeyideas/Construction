import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";

// ---------------------------------------------------------------------------
// POST /api/projects/[id]/tasks — Create a new task
// ---------------------------------------------------------------------------

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId } = await params;
    const body = await request.json();

    if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
      return NextResponse.json({ error: "Task name is required." }, { status: 400 });
    }

    // Auto sort_order: count existing tasks for this project + 1
    const { count } = await supabase
      .from("project_tasks")
      .select("id", { count: "exact", head: true })
      .eq("company_id", userCtx.companyId)
      .eq("project_id", projectId);

    const validPriorities = ["low", "medium", "high", "critical"];
    const priority = validPriorities.includes(body.priority) ? body.priority : "medium";

    const { data: task, error } = await supabase
      .from("project_tasks")
      .insert({
        company_id: userCtx.companyId,
        project_id: projectId,
        phase_id: body.phase_id || null,
        name: body.name.trim(),
        description: body.description?.trim() || null,
        status: "not_started",
        priority,
        start_date: body.start_date || null,
        end_date: body.end_date || null,
        is_milestone: body.is_milestone ?? false,
        is_critical_path: body.is_critical_path ?? false,
        completion_pct: 0,
        sort_order: (count ?? 0) + 1,
      })
      .select("*")
      .single();

    if (error) {
      console.error("Insert task error:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(task, { status: 201 });
  } catch (err) {
    console.error("POST /api/projects/[id]/tasks error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
