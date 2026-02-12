import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getProjectById,
  getProjectStats,
  updateProject,
  deleteProject,
  getCurrentUserCompany,
} from "@/lib/queries/projects";

// ---------------------------------------------------------------------------
// GET /api/projects/[id] - Get single project with stats
// ---------------------------------------------------------------------------

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const result = await getProjectById(supabase, id);

    if (!result) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    // Verify the project belongs to the user's company
    if (result.project.company_id !== userCtx.companyId) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    const stats = await getProjectStats(supabase, id);

    return NextResponse.json({
      ...result,
      stats,
    });
  } catch (err) {
    console.error("GET /api/projects/[id] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/projects/[id] - Update a project
// ---------------------------------------------------------------------------

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Verify the project exists and belongs to the company
    const existing = await getProjectById(supabase, id);
    if (!existing || existing.project.company_id !== userCtx.companyId) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    const body = await request.json();

    const { project, error } = await updateProject(supabase, id, body);

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    return NextResponse.json(project);
  } catch (err) {
    console.error("PATCH /api/projects/[id] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/projects/[id] - Delete a project
// ---------------------------------------------------------------------------

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Verify the project exists and belongs to the company
    const existing = await getProjectById(supabase, id);
    if (!existing || existing.project.company_id !== userCtx.companyId) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    const { error } = await deleteProject(supabase, id);

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/projects/[id] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
