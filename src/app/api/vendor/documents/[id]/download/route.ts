import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { storageSignedUrl } from "@/lib/supabase/storage";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: documentId } = await params;
    const admin = createAdminClient();

    // Look up vendor contact
    const { data: contact } = await admin
      .from("contacts")
      .select("id")
      .eq("user_id", user.id)
      .in("contact_type", ["vendor", "subcontractor"])
      .limit(1)
      .single();

    if (!contact) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Verify document belongs to this vendor via vendor_documents
    const { data: vendorDoc } = await admin
      .from("vendor_documents")
      .select("document_id")
      .eq("vendor_contact_id", contact.id)
      .eq("document_id", documentId)
      .limit(1)
      .single();

    if (!vendorDoc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Get the document file_path
    const { data: doc } = await admin
      .from("documents")
      .select("file_path, name")
      .eq("id", documentId)
      .single();

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
      return NextResponse.json(
        { error: "Could not generate download URL." },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: signedData.signedUrl });
  } catch (err) {
    console.error("GET /api/vendor/documents/[id]/download error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
