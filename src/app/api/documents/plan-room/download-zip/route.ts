import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";

/* ------------------------------------------------------------------
   POST /api/documents/plan-room/download-zip — Download multiple docs as ZIP

   Note: This is a placeholder endpoint. Actual ZIP generation requires
   Supabase Storage to be fully configured with document files.
   The structure is in place for when storage is set up.
   ------------------------------------------------------------------ */

export async function POST(request: NextRequest) {
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
      .select("id, name, file_path, file_type")
      .eq("company_id", userCtx.companyId)
      .in("id", documentIds);

    if (docsError) {
      return NextResponse.json({ error: docsError.message }, { status: 400 });
    }

    if (!docs || docs.length === 0) {
      return NextResponse.json(
        { error: "No documents found" },
        { status: 404 }
      );
    }

    // Placeholder: ZIP download requires storage setup
    // When storage is configured, this endpoint will:
    // 1. Fetch each file from Supabase Storage
    // 2. Bundle them into a ZIP using a library like archiver or jszip
    // 3. Stream the ZIP back as a response
    return NextResponse.json(
      {
        message: "ZIP download requires storage setup. This feature will be available once Supabase Storage bucket is configured with actual document files.",
        documentCount: docs.length,
        documents: docs.map((d) => ({ id: d.id, name: d.name })),
      },
      { status: 501 }
    );
  } catch (err) {
    console.error("POST /api/documents/plan-room/download-zip error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
