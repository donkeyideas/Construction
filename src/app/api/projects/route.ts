import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getProjects,
  createProject,
  getCurrentUserCompany,
  type ProjectStatus,
} from "@/lib/queries/projects";

// ---------------------------------------------------------------------------
// GET /api/projects - List projects for the current user's company
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as ProjectStatus | null;
    const search = searchParams.get("search") ?? undefined;

    const projects = await getProjects(supabase, userCtx.companyId, {
      status: status ?? undefined,
      search,
    });

    return NextResponse.json(projects);
  } catch (err) {
    console.error("GET /api/projects error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/projects - Create a new project
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
    if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
      return NextResponse.json(
        { error: "Project name is required." },
        { status: 400 }
      );
    }

    if (!body.code || typeof body.code !== "string" || !body.code.trim()) {
      return NextResponse.json(
        { error: "Project code is required." },
        { status: 400 }
      );
    }

    const { project, error } = await createProject(supabase, userCtx.companyId, {
      name: body.name.trim(),
      code: body.code.trim(),
      description: body.description,
      project_type: body.project_type,
      client_name: body.client_name,
      address_line1: body.address_line1,
      city: body.city,
      state: body.state,
      zip: body.zip,
      contract_amount: body.contract_amount,
      estimated_cost: body.estimated_cost,
      start_date: body.start_date,
      estimated_end_date: body.estimated_end_date,
      project_manager_id: body.project_manager_id,
      superintendent_id: body.superintendent_id,
      metadata: body.metadata,
    });

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    return NextResponse.json(project, { status: 201 });
  } catch (err) {
    console.error("POST /api/projects error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
