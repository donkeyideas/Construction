import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { storageUpload } from "@/lib/supabase/storage";

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

    // Upload to Supabase Storage (uses storageUpload which auto-creates bucket)
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `${contact.company_id}/vendor-uploads/${timestamp}-${safeName}`;

    const { error: uploadError } = await storageUpload(storagePath, file, {
      contentType: file.type,
      upsert: false,
    });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return NextResponse.json(
        { error: `Failed to upload file: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // Get uploader display name for document metadata
    const vendorName =
      contact.company_name ||
      `${contact.first_name || ""} ${contact.last_name || ""}`.trim() ||
      "Vendor";

    // Ensure vendor user has a user_profiles entry (documents.uploaded_by has FK to user_profiles)
    const { data: existingProfile } = await admin
      .from("user_profiles")
      .select("id")
      .eq("id", user.id)
      .single();

    if (!existingProfile) {
      await admin.from("user_profiles").insert({
        id: user.id,
        email: user.email ?? "",
        full_name: `${contact.first_name || ""} ${contact.last_name || ""}`.trim() || vendorName,
      });
    }

    // Insert into documents table (visible in admin Documents library)
    // Use valid category ("correspondence") and folder_path for sidebar grouping
    const { data: doc, error: docError } = await admin
      .from("documents")
      .insert({
        company_id: contact.company_id,
        name: docName,
        file_path: storagePath,
        file_type: file.type,
        file_size: file.size,
        uploaded_by: user.id,
        category: "correspondence",
        folder_path: "Vendor Uploads",
        ai_extracted_data: {
          uploader_name: vendorName,
          doc_type: docType,
        },
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
      company_id: contact.company_id,
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
