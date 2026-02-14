import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { storageSignedUrl } from "@/lib/supabase/storage";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify tenant has access via tenant_documents, use admin to bypass RLS on documents join
    const admin = createAdminClient();
    const { data: td } = await admin
      .from("tenant_documents")
      .select("document_id, documents(file_path, name)")
      .eq("document_id", id)
      .eq("shared_with_tenant_user_id", user.id)
      .limit(1)
      .single();

    if (!td) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const doc = td.documents as unknown as {
      file_path: string;
      name: string;
    } | null;
    if (!doc?.file_path || doc.file_path === "pending-upload") {
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
      return NextResponse.json(
        {
          error: isNotFound
            ? "File not found in storage."
            : "Could not generate download URL.",
        },
        { status: isNotFound ? 404 : 500 }
      );
    }

    return NextResponse.json({ url: signedData.signedUrl });
  } catch (err) {
    console.error("Tenant document download error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
