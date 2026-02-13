import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getDocumentSignedUrl } from "@/lib/queries/documents";

/* ------------------------------------------------------------------
   GET /api/documents/plan-room/[id]/download — Get signed download URL
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

    const { data: doc } = await supabase
      .from("documents")
      .select("file_path, company_id")
      .eq("id", id)
      .single();

    if (!doc || doc.company_id !== userCtx.companyId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (!doc.file_path || doc.file_path === "pending-upload") {
      return NextResponse.json(
        { error: "No file available for this document." },
        { status: 404 }
      );
    }

    const { url, error } = await getDocumentSignedUrl(supabase, doc.file_path);

    if (error || !url) {
      return NextResponse.json(
        { error: error || "Failed to generate download URL." },
        { status: 500 }
      );
    }

    return NextResponse.json({ url });
  } catch (err) {
    console.error("GET /api/documents/plan-room/[id]/download error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
