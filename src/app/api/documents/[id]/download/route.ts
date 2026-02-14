import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { storageSignedUrl } from "@/lib/supabase/storage";

/* ------------------------------------------------------------------
   GET /api/documents/[id]/download — Get signed download URL
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

    const { data: signedData, error: signedError } = await storageSignedUrl(
      doc.file_path,
      3600
    );

    if (signedError || !signedData?.signedUrl) {
      const isNotFound =
        signedError?.message?.includes("Object not found") ||
        signedError?.message?.includes("not found");
      if (!isNotFound) {
        console.error(
          `Signed URL failed for doc ${id} (path: ${doc.file_path}):`,
          signedError?.message
        );
      }
      return NextResponse.json(
        {
          error: isNotFound
            ? "File not found in storage. It may not have been uploaded yet."
            : `Could not generate download URL. ${signedError?.message || "Unknown storage error"}`,
        },
        { status: isNotFound ? 404 : 500 }
      );
    }

    return NextResponse.json({ url: signedData.signedUrl });
  } catch (err) {
    console.error("GET /api/documents/[id]/download error:", err);
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
