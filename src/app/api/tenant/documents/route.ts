import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { storageUpload } from "@/lib/supabase/storage";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get tenant's active lease to determine company, property
    const { data: lease } = await supabase
      .from("leases")
      .select("id, company_id, property_id")
      .eq("tenant_user_id", user.id)
      .eq("status", "active")
      .limit(1)
      .single();

    if (!lease) {
      return NextResponse.json(
        { error: "No active lease found for your account" },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    const name = (formData.get("name") as string) || file.name;

    // Upload file to Supabase Storage
    const timestamp = Date.now();
    const storagePath = `${lease.company_id}/tenant-uploads/${timestamp}-${file.name}`;

    const { error: storageError } = await storageUpload(storagePath, file, {
      contentType: file.type,
      upsert: false,
    });

    if (storageError) {
      console.error("Tenant storage upload error:", storageError);
      return NextResponse.json(
        { error: `File upload failed: ${storageError.message}` },
        { status: 500 }
      );
    }

    // Use admin client to insert into documents & tenant_documents (tenant lacks INSERT on these tables)
    const admin = createAdminClient();

    // Create document record in the company's document library
    const { data: doc, error: docError } = await admin
      .from("documents")
      .insert({
        company_id: lease.company_id,
        property_id: lease.property_id,
        name,
        file_path: storagePath,
        file_type: file.type,
        file_size: file.size,
        category: "correspondence",
        folder_path: "/Tenant Uploads",
        uploaded_by: user.id,
      })
      .select("id")
      .single();

    if (docError) {
      console.error("Error creating document record:", docError);
      return NextResponse.json(
        { error: "Failed to save document" },
        { status: 500 }
      );
    }

    // Create tenant_documents share so the tenant can see it in their portal
    await admin.from("tenant_documents").insert({
      company_id: lease.company_id,
      lease_id: lease.id,
      document_id: doc.id,
      shared_with_tenant_user_id: user.id,
    });

    return NextResponse.json({ success: true, id: doc.id }, { status: 201 });
  } catch (err) {
    console.error("Tenant document upload error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
