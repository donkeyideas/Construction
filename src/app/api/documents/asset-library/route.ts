import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getAssetLibrary } from "@/lib/queries/documents";
import { storageUpload } from "@/lib/supabase/storage";

/* ------------------------------------------------------------------
   GET /api/documents/asset-library — List assets for company
   ------------------------------------------------------------------ */

export async function GET() {
  try {
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const assets = await getAssetLibrary(supabase, userCtx.companyId);
    return NextResponse.json(assets);
  } catch (err) {
    console.error("GET /api/documents/asset-library error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/* ------------------------------------------------------------------
   POST /api/documents/asset-library — Upload/create a new asset
   ------------------------------------------------------------------ */

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided." },
        { status: 400 }
      );
    }

    const name = (formData.get("name") as string) || file.name.replace(/\.[^/.]+$/, "");
    const assetType = (formData.get("asset_type") as string) || "general";
    const description = formData.get("description") as string | null;
    const tagsRaw = formData.get("tags") as string | null;
    const tags = tagsRaw ? tagsRaw.split(",").map((t) => t.trim()).filter(Boolean) : [];

    // Upload file to Supabase Storage
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `${userCtx.companyId}/asset-library/${timestamp}-${safeName}`;

    const { error: storageError } = await storageUpload(storagePath, file, {
      contentType: file.type,
      upsert: false,
    });

    if (storageError) {
      console.error("Asset storage upload error:", storageError);
      return NextResponse.json(
        { error: `File upload failed: ${storageError.message}` },
        { status: 500 }
      );
    }

    // Determine file_type from extension
    const ext = file.name.split(".").pop()?.toLowerCase() || "";

    // Create asset record
    const { data: asset, error: assetError } = await supabase
      .from("asset_library")
      .insert({
        company_id: userCtx.companyId,
        name: name.trim(),
        description: description?.trim() || null,
        file_path: storagePath,
        file_type: ext,
        file_size: file.size,
        asset_type: assetType,
        tags,
        uploaded_by: userCtx.userId,
      })
      .select()
      .single();

    if (assetError) {
      console.error("POST /api/documents/asset-library insert error:", assetError);
      return NextResponse.json({ error: assetError.message }, { status: 400 });
    }

    return NextResponse.json(asset, { status: 201 });
  } catch (err) {
    console.error("POST /api/documents/asset-library error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
