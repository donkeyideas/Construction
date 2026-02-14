import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { storageUpload, storageSignedUrl } from "@/lib/supabase/storage";

// ---------------------------------------------------------------------------
// POST /api/admin/settings/logo - Upload company logo
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (userCtx.role !== "owner" && userCtx.role !== "admin") {
      return NextResponse.json(
        { error: "Insufficient permissions." },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Only image files are allowed." },
        { status: 400 }
      );
    }

    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File must be under 2MB." },
        { status: 400 }
      );
    }

    const ext = file.name.split(".").pop() || "png";
    const storagePath = `${userCtx.companyId}/branding/logo-${Date.now()}.${ext}`;

    const { error: uploadError } = await storageUpload(storagePath, file, {
      contentType: file.type,
      upsert: true,
    });

    if (uploadError) {
      console.error("Logo upload error:", uploadError);
      return NextResponse.json(
        { error: `Upload failed: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // Get a long-lived signed URL (7 days) for the logo
    const { data: signedData } = await storageSignedUrl(storagePath, 604800);
    const logoUrl = signedData?.signedUrl ?? "";

    // Update the company record
    const { error: updateError } = await supabase
      .from("companies")
      .update({ logo_url: logoUrl, updated_at: new Date().toISOString() })
      .eq("id", userCtx.companyId);

    if (updateError) {
      console.error("Logo DB update error:", updateError);
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    return NextResponse.json({ logo_url: logoUrl });
  } catch (err) {
    console.error("POST /api/admin/settings/logo error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
