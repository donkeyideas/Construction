import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { storageUpload, storageSignedUrl, storageRemove } from "@/lib/supabase/storage";

// ---------------------------------------------------------------------------
// GET /api/properties/[id]/photos — List photos with signed URLs
// ---------------------------------------------------------------------------

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: propertyId } = await params;
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: docs, error } = await supabase
      .from("documents")
      .select("id, name, file_path, file_type, file_size, created_at, uploaded_by")
      .eq("company_id", userCtx.companyId)
      .eq("property_id", propertyId)
      .eq("category", "photo")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("List property photos error:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Generate signed URLs for each photo
    const photos = await Promise.all(
      (docs || []).map(async (doc) => {
        let url: string | null = null;
        if (doc.file_path) {
          const { data } = await storageSignedUrl(doc.file_path, 3600);
          url = data?.signedUrl ?? null;
        }
        return { ...doc, url };
      })
    );

    return NextResponse.json(photos);
  } catch (err) {
    console.error("GET /api/properties/[id]/photos error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/properties/[id]/photos — Upload a photo
// ---------------------------------------------------------------------------

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: propertyId } = await params;
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    // Validate image type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Only image files are allowed." },
        { status: 400 }
      );
    }

    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `${userCtx.companyId}/properties/${propertyId}/photos/${timestamp}-${safeName}`;

    const { error: uploadError } = await storageUpload(storagePath, file, {
      contentType: file.type,
    });

    if (uploadError) {
      console.error("Photo upload error:", uploadError);
      return NextResponse.json(
        { error: `Upload failed: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // Create document record
    const { data: doc, error: dbError } = await supabase
      .from("documents")
      .insert({
        company_id: userCtx.companyId,
        uploaded_by: userCtx.userId,
        property_id: propertyId,
        name: file.name,
        file_type: file.type,
        file_size: file.size,
        file_path: storagePath,
        category: "photo",
        folder_path: `properties/${propertyId}/photos`,
      })
      .select()
      .single();

    if (dbError) {
      console.error("Photo DB insert error:", dbError);
      return NextResponse.json({ error: dbError.message }, { status: 400 });
    }

    // Return the doc with a signed URL
    const { data: signedData } = await storageSignedUrl(storagePath, 3600);

    return NextResponse.json(
      { ...doc, url: signedData?.signedUrl ?? null },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST /api/properties/[id]/photos error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/properties/[id]/photos — Delete a photo by doc ID (query param)
// ---------------------------------------------------------------------------

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: propertyId } = await params;
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const docId = searchParams.get("docId");

    if (!docId) {
      return NextResponse.json({ error: "docId is required." }, { status: 400 });
    }

    // Verify document belongs to this property and company
    const { data: doc } = await supabase
      .from("documents")
      .select("id, file_path, company_id, property_id")
      .eq("id", docId)
      .single();

    if (!doc || doc.company_id !== userCtx.companyId || doc.property_id !== propertyId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Delete from storage
    if (doc.file_path) {
      await storageRemove([doc.file_path]);
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from("documents")
      .delete()
      .eq("id", docId);

    if (dbError) {
      console.error("Photo delete error:", dbError);
      return NextResponse.json({ error: dbError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/properties/[id]/photos error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
