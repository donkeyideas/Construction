import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getDrawingSets, createDrawingSet } from "@/lib/queries/documents";

/* ------------------------------------------------------------------
   GET /api/documents/plan-room/sets — List drawing sets
   ------------------------------------------------------------------ */

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId") || undefined;

    const sets = await getDrawingSets(supabase, userCtx.companyId, projectId);

    return NextResponse.json(sets);
  } catch (err) {
    console.error("GET /api/documents/plan-room/sets error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/* ------------------------------------------------------------------
   POST /api/documents/plan-room/sets — Create a drawing set
   ------------------------------------------------------------------ */

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
      return NextResponse.json(
        { error: "Drawing set name is required." },
        { status: 400 }
      );
    }

    const { set, error } = await createDrawingSet(
      supabase,
      userCtx.companyId,
      userCtx.userId,
      {
        name: body.name.trim(),
        description: body.description,
        discipline: body.discipline,
        project_id: body.project_id,
      }
    );

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    return NextResponse.json(set, { status: 201 });
  } catch (err) {
    console.error("POST /api/documents/plan-room/sets error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
