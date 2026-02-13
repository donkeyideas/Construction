import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { storageUpload } from "@/lib/supabase/storage";

/* ------------------------------------------------------------------
   POST /api/documents/plan-room/[id]/revision — Upload new revision
   ------------------------------------------------------------------ */

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the original document
    const { data: original } = await supabase
      .from("documents")
      .select("*")
      .eq("id", id)
      .eq("company_id", userCtx.companyId)
      .single();

    if (!original) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided." },
        { status: 400 }
      );
    }

    const revisionLabel = (formData.get("revision_label") as string) || null;

    // Upload new file to storage
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `${userCtx.companyId}/plan-room/${timestamp}-${safeName}`;

    const { error: storageError } = await storageUpload(storagePath, file, {
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

    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    const newVersion = (original.version ?? 1) + 1;

    // Mark old document as superseded
    await supabase
      .from("documents")
      .update({ is_current: false })
      .eq("id", id);

    // Create new document record inheriting metadata
    const { data: newDoc, error: docError } = await supabase
      .from("documents")
      .insert({
        company_id: userCtx.companyId,
        name: original.name,
        file_type: ext,
        file_size: file.size,
        file_path: storagePath,
        folder_path: original.folder_path,
        category: original.category,
        project_id: original.project_id,
        uploaded_by: userCtx.userId,
        tags: original.tags ?? [],
        version: newVersion,
        discipline: original.discipline,
        drawing_set_id: original.drawing_set_id,
        revision_label: revisionLabel || `Rev ${newVersion}`,
        is_current: true,
      })
      .select()
      .single();

    if (docError) {
      console.error("POST revision insert error:", docError);
      // Rollback: re-mark old document as current
      await supabase
        .from("documents")
        .update({ is_current: true })
        .eq("id", id);
      return NextResponse.json({ error: docError.message }, { status: 400 });
    }

    return NextResponse.json(newDoc, { status: 201 });
  } catch (err) {
    console.error("POST /api/documents/plan-room/[id]/revision error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
