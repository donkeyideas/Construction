import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";

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
      .select("file_path, company_id, name")
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

    // Try signed URL first
    const { data: signedData, error: signedError } = await supabase.storage
      .from("documents")
      .createSignedUrl(doc.file_path, 3600);

    if (!signedError && signedData?.signedUrl) {
      return NextResponse.json({ url: signedData.signedUrl });
    }

    console.error(
      `Signed URL failed for doc ${id} (path: ${doc.file_path}):`,
      signedError?.message
    );

    // Fallback: try public URL (in case bucket is public)
    const { data: publicData } = supabase.storage
      .from("documents")
      .getPublicUrl(doc.file_path);

    if (publicData?.publicUrl) {
      return NextResponse.json({ url: publicData.publicUrl });
    }

    return NextResponse.json(
      {
        error: `Could not generate URL. Storage error: ${signedError?.message || "Unknown"}. File path: ${doc.file_path}`,
      },
      { status: 500 }
    );
  } catch (err) {
    console.error("GET /api/documents/plan-room/[id]/download error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
