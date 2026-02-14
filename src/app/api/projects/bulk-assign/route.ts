import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/projects";

// ---------------------------------------------------------------------------
// PATCH /api/projects/bulk-assign
// Body: { projectIds: string[], field: "project_manager_id" | "superintendent_id", userId: string }
// ---------------------------------------------------------------------------

const ALLOWED_FIELDS = ["project_manager_id", "superintendent_id"] as const;

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { projectIds, field, userId } = body;

    // Validate inputs
    if (
      !Array.isArray(projectIds) ||
      projectIds.length === 0 ||
      !ALLOWED_FIELDS.includes(field) ||
      typeof userId !== "string" ||
      !userId
    ) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    // Verify all projects belong to the user's company
    const { data: projects, error: fetchErr } = await supabase
      .from("projects")
      .select("id")
      .eq("company_id", userCtx.companyId)
      .in("id", projectIds);

    if (fetchErr) {
      console.error("bulk-assign fetch error:", fetchErr);
      return NextResponse.json(
        { error: "Failed to verify projects" },
        { status: 500 }
      );
    }

    const validIds = new Set((projects ?? []).map((p) => p.id));
    const idsToUpdate = projectIds.filter((id: string) => validIds.has(id));

    if (idsToUpdate.length === 0) {
      return NextResponse.json(
        { error: "No valid projects found" },
        { status: 404 }
      );
    }

    // Update all matching projects
    const { error: updateErr } = await supabase
      .from("projects")
      .update({ [field]: userId })
      .in("id", idsToUpdate);

    if (updateErr) {
      console.error("bulk-assign update error:", updateErr);
      return NextResponse.json(
        { error: "Failed to update projects" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: idsToUpdate.length,
      total: projectIds.length,
    });
  } catch (err) {
    console.error("PATCH /api/projects/bulk-assign error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
