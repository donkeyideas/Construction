import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getPlanRoomDocuments, type PlanRoomFilters } from "@/lib/queries/documents";

/* ------------------------------------------------------------------
   GET /api/documents/plan-room — List plan room documents
   ------------------------------------------------------------------ */

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const filters: PlanRoomFilters = {};

    const projectId = searchParams.get("projectId");
    if (projectId) filters.projectId = projectId;

    const discipline = searchParams.get("discipline");
    if (discipline) filters.discipline = discipline;

    const drawingSetId = searchParams.get("drawingSetId");
    if (drawingSetId) filters.drawingSetId = drawingSetId;

    const search = searchParams.get("search");
    if (search) filters.search = search;

    if (searchParams.get("showSuperseded") === "true") {
      filters.showSuperseded = true;
    }

    const documents = await getPlanRoomDocuments(
      supabase,
      userCtx.companyId,
      filters
    );

    return NextResponse.json(documents);
  } catch (err) {
    console.error("GET /api/documents/plan-room error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/* ------------------------------------------------------------------
   POST /api/documents/plan-room — Upload a plan room document
   ------------------------------------------------------------------ */

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided." },
        { status: 400 }
      );
    }

    const name = (formData.get("name") as string) || file.name;
    const category = (formData.get("category") as string) || "plan";
    const projectId = formData.get("project_id") as string | null;
    const discipline = formData.get("discipline") as string | null;
    const drawingSetId = formData.get("drawing_set_id") as string | null;
    const revisionLabel = formData.get("revision_label") as string | null;
    const tagsRaw = formData.get("tags") as string | null;
    const tags = tagsRaw ? tagsRaw.split(",").map((t) => t.trim()).filter(Boolean) : [];

    // Upload file to Supabase Storage
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `${userCtx.companyId}/plan-room/${timestamp}-${safeName}`;

    const { error: storageError } = await supabase.storage
      .from("documents")
      .upload(storagePath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (storageError) {
      console.error("Storage upload error:", storageError);
      return NextResponse.json(
        { error: `File upload failed: ${storageError.message}` },
        { status: 500 }
      );
    }

    // Determine file_type from extension
    const ext = file.name.split(".").pop()?.toLowerCase() || "";

    // Create document record
    const { data: document, error: docError } = await supabase
      .from("documents")
      .insert({
        company_id: userCtx.companyId,
        name: name.trim(),
        file_type: ext,
        file_size: file.size,
        file_path: storagePath,
        folder_path: "/plan-room",
        category,
        project_id: projectId || null,
        uploaded_by: userCtx.userId,
        tags,
        version: 1,
        discipline: discipline || null,
        drawing_set_id: drawingSetId || null,
        revision_label: revisionLabel || null,
        is_current: true,
      })
      .select()
      .single();

    if (docError) {
      console.error("POST /api/documents/plan-room insert error:", docError);
      return NextResponse.json({ error: docError.message }, { status: 400 });
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
