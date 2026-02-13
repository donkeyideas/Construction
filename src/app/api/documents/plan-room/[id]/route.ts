import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getDocumentById } from "@/lib/queries/documents";
import { storageRemove } from "@/lib/supabase/storage";

/* ------------------------------------------------------------------
   GET /api/documents/plan-room/[id] — Get a single document
   ------------------------------------------------------------------ */

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const doc = await getDocumentById(supabase, id);

    if (!doc || doc.company_id !== userCtx.companyId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(doc);
  } catch (err) {
    console.error("GET /api/documents/plan-room/[id] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/* ------------------------------------------------------------------
   PUT /api/documents/plan-room/[id] — Update document metadata
   ------------------------------------------------------------------ */

export async function PUT(
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

    const body = await request.json();

    const updates: Record<string, unknown> = {};
    if (body.name !== undefined) updates.name = body.name.trim();
    if (body.discipline !== undefined) updates.discipline = body.discipline || null;
    if (body.drawing_set_id !== undefined) updates.drawing_set_id = body.drawing_set_id || null;
    if (body.revision_label !== undefined) updates.revision_label = body.revision_label || null;
    if (body.tags !== undefined) updates.tags = body.tags;
    if (body.category !== undefined) updates.category = body.category;

    const { data, error } = await supabase
      .from("documents")
      .update(updates)
      .eq("id", id)
      .eq("company_id", userCtx.companyId)
      .select()
      .single();

    if (error) {
      console.error("PUT /api/documents/plan-room/[id] error:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("PUT /api/documents/plan-room/[id] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/* ------------------------------------------------------------------
   DELETE /api/documents/plan-room/[id] — Delete a document
   ------------------------------------------------------------------ */

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the document to find its storage path
    const { data: doc } = await supabase
      .from("documents")
      .select("file_path")
      .eq("id", id)
      .eq("company_id", userCtx.companyId)
      .single();

    if (!doc) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Delete from storage
    if (doc.file_path && doc.file_path !== "pending-upload") {
      await storageRemove([doc.file_path]);
    }

    // Delete from database
    const { error } = await supabase
      .from("documents")
      .delete()
      .eq("id", id)
      .eq("company_id", userCtx.companyId);

    if (error) {
      console.error("DELETE /api/documents/plan-room/[id] error:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/documents/plan-room/[id] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
