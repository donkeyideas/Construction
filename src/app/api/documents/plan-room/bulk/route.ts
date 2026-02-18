import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { moveDocumentsToFolder } from "@/lib/queries/documents";

/* ------------------------------------------------------------------
   PATCH /api/documents/plan-room/bulk — Move documents to a folder
   Body: { documentIds: string[], folderId: string | null }
   ------------------------------------------------------------------ */

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { documentIds, folderId } = body;

    if (!Array.isArray(documentIds) || documentIds.length === 0) {
      return NextResponse.json(
        { error: "documentIds array is required" },
        { status: 400 }
      );
    }

    // Verify documents belong to this company
    const { data: docs, error: docsError } = await supabase
      .from("documents")
      .select("id")
      .eq("company_id", userCtx.companyId)
      .in("id", documentIds);

    if (docsError) {
      return NextResponse.json({ error: docsError.message }, { status: 400 });
    }

    if (!docs || docs.length === 0) {
      return NextResponse.json(
        { error: "No matching documents found" },
        { status: 404 }
      );
    }

    // If folderId is provided, verify folder belongs to this company
    if (folderId) {
      const { data: folder, error: folderError } = await supabase
        .from("document_folders")
        .select("id")
        .eq("id", folderId)
        .eq("company_id", userCtx.companyId)
        .single();

      if (folderError || !folder) {
        return NextResponse.json(
          { error: "Folder not found" },
          { status: 404 }
        );
      }
    }

    const verifiedIds = docs.map((d) => d.id);
    const { error: moveError } = await moveDocumentsToFolder(
      supabase,
      verifiedIds,
      folderId ?? null
    );

    if (moveError) {
      return NextResponse.json({ error: moveError }, { status: 400 });
    }

    return NextResponse.json({
      message: `Moved ${verifiedIds.length} document(s)`,
      movedCount: verifiedIds.length,
    });
  } catch (err) {
    console.error("PATCH /api/documents/plan-room/bulk error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/* ------------------------------------------------------------------
   DELETE /api/documents/plan-room/bulk — Bulk delete documents
   Body: { documentIds: string[] }
   ------------------------------------------------------------------ */

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { documentIds } = body;

    if (!Array.isArray(documentIds) || documentIds.length === 0) {
      return NextResponse.json(
        { error: "documentIds array is required" },
        { status: 400 }
      );
    }

    // Verify documents belong to this company
    const { data: docs, error: docsError } = await supabase
      .from("documents")
      .select("id")
      .eq("company_id", userCtx.companyId)
      .in("id", documentIds);

    if (docsError) {
      return NextResponse.json({ error: docsError.message }, { status: 400 });
    }

    if (!docs || docs.length === 0) {
      return NextResponse.json(
        { error: "No matching documents found" },
        { status: 404 }
      );
    }

    const verifiedIds = docs.map((d) => d.id);

    const { error: deleteError } = await supabase
      .from("documents")
      .delete()
      .in("id", verifiedIds);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 400 });
    }

    return NextResponse.json({
      message: `Deleted ${verifiedIds.length} document(s)`,
      deletedCount: verifiedIds.length,
    });
  } catch (err) {
    console.error("DELETE /api/documents/plan-room/bulk error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
