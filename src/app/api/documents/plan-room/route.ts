import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";

// ---------------------------------------------------------------------------
// POST /api/documents/plan-room — Create a plan room document
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
        { error: "Document name is required." },
        { status: 400 }
      );
    }

    if (!body.project_id) {
      return NextResponse.json(
        { error: "Project is required." },
        { status: 400 }
      );
    }

    // Parse tags from comma-separated string
    const tags: string[] = body.tags
      ? body.tags
          .split(",")
          .map((t: string) => t.trim())
          .filter(Boolean)
      : [];

    const { data: document, error } = await supabase
      .from("documents")
      .insert({
        company_id: userCtx.companyId,
        project_id: body.project_id,
        name: body.name.trim(),
        description: body.description?.trim() || null,
        category: body.category || "plan",
        version: body.version ? Number(body.version) : 1,
        file_path: body.file_url?.trim() || "pending-upload",
        file_type: body.file_type || null,
        file_size: 0,
        uploaded_by: userCtx.userId,
        tags,
      })
      .select()
      .single();

    if (error) {
      console.error("POST /api/documents/plan-room insert error:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(document, { status: 201 });
  } catch (err) {
    console.error("POST /api/documents/plan-room error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
