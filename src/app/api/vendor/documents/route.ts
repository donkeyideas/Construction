import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// ---------------------------------------------------------------------------
// POST /api/vendor/documents
// Upload a document from the vendor portal (compliance cert or general doc).
// The document is stored in Supabase Storage and linked to the vendor contact
// so it also appears in the admin Documents library.
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();

    // Look up vendor contact
    const { data: contact } = await admin
      .from("contacts")
      .select("id, company_id, company_name, first_name, last_name")
      .eq("user_id", user.id)
      .in("contact_type", ["vendor", "subcontractor"])
      .limit(1)
      .single();

    if (!contact) {
      return NextResponse.json(
        { error: "No vendor profile found for this user." },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const docType = (formData.get("doc_type") as string) || "general";
    const docName = (formData.get("doc_name") as string) || file?.name || "Untitled";

    if (!file) {
      return NextResponse.json(
        { error: "No file provided." },
        { status: 400 }
      );
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 10MB." },
        { status: 400 }
      );
    }

    // Upload to Supabase Storage
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `vendor/${contact.id}/${timestamp}_${safeName}`;

    const { error: uploadError } = await admin.storage
      .from("documents")
      .upload(storagePath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      // If bucket doesn't exist, provide helpful message
      if (uploadError.message?.includes("not found") || uploadError.message?.includes("Bucket")) {
        return NextResponse.json(
          { error: "Storage not configured. Please ask your admin to create the 'documents' storage bucket in Supabase." },
          { status: 500 }
        );
      }
      return NextResponse.json(
        { error: "Failed to upload file." },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = admin.storage
      .from("documents")
      .getPublicUrl(storagePath);

    // Insert into documents table (visible in admin Documents library)
    const { data: doc, error: docError } = await admin
      .from("documents")
      .insert({
        company_id: contact.company_id,
        name: docName,
        file_path: urlData.publicUrl,
        file_type: file.type,
        file_size: file.size,
        uploaded_by: user.id,
        category: docType === "compliance" ? "Compliance" : "Vendor Upload",
      })
      .select("id, name, file_path, file_type")
      .single();

    if (docError) {
      console.error("Document insert error:", docError);
      return NextResponse.json(
        { error: "File uploaded but failed to create document record." },
        { status: 500 }
      );
    }

    // Link document to vendor contact (vendor_documents table)
    await admin.from("vendor_documents").insert({
      vendor_contact_id: contact.id,
      document_id: doc.id,
      shared_at: new Date().toISOString(),
    });

    return NextResponse.json(
      { id: doc.id, name: doc.name, file_path: doc.file_path, file_type: doc.file_type },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST /api/vendor/documents error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
