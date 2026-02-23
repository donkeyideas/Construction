import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const bucket = (formData.get("bucket") as string) || "photos";
    const pathPrefix = (formData.get("path") as string) || "uploads";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Only image files are allowed" }, { status: 400 });
    }

    // Max 10MB
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large. Max 10MB." }, { status: 400 });
    }

    // Extension whitelist — prevents uploading .html, .exe, etc. disguised as images
    const ALLOWED_EXTENSIONS = new Set(["jpg", "jpeg", "png", "gif", "webp", "heic", "heif"]);
    const ext = (file.name.split(".").pop() || "").toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return NextResponse.json(
        { error: `File extension .${ext} not allowed. Use: ${[...ALLOWED_EXTENSIONS].join(", ")}` },
        { status: 400 }
      );
    }

    // Validate file magic bytes to ensure actual image content (not a renamed .html/.exe)
    const headerBytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
    const isJPEG = headerBytes[0] === 0xFF && headerBytes[1] === 0xD8 && headerBytes[2] === 0xFF;
    const isPNG = headerBytes[0] === 0x89 && headerBytes[1] === 0x50 && headerBytes[2] === 0x4E && headerBytes[3] === 0x47;
    const isGIF = headerBytes[0] === 0x47 && headerBytes[1] === 0x49 && headerBytes[2] === 0x46 && headerBytes[3] === 0x38;
    const isWebP = headerBytes[0] === 0x52 && headerBytes[1] === 0x49 && headerBytes[2] === 0x46 && headerBytes[3] === 0x46;
    // HEIC/HEIF starts with ftyp box at offset 4
    const isHEIC = headerBytes[4] === 0x66 && headerBytes[5] === 0x74 && headerBytes[6] === 0x79 && headerBytes[7] === 0x70;

    if (!isJPEG && !isPNG && !isGIF && !isWebP && !isHEIC) {
      return NextResponse.json({ error: "File content does not match a supported image format" }, { status: 400 });
    }

    // Determine content type from actual file content, not client-provided MIME
    const detectedContentType = isJPEG ? "image/jpeg"
      : isPNG ? "image/png"
      : isGIF ? "image/gif"
      : isWebP ? "image/webp"
      : "image/heic";

    const fileName = `${userCompany.companyId}/${pathPrefix}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(fileName, file, {
        contentType: detectedContentType,
        upsert: false,
      });

    if (uploadError) {
      // If bucket doesn't exist, try creating it and retrying
      if (uploadError.message?.includes("not found") || uploadError.message?.includes("Bucket")) {
        // Try the default bucket
        const fallbackName = `public/${fileName}`;
        const { error: fallbackErr } = await supabase.storage
          .from("public")
          .upload(fallbackName, file, {
            contentType: detectedContentType,
            upsert: false,
          });

        if (fallbackErr) {
          return NextResponse.json({ error: fallbackErr.message }, { status: 500 });
        }

        const { data: publicUrl } = supabase.storage.from("public").getPublicUrl(fallbackName);
        return NextResponse.json({ url: publicUrl.publicUrl });
      }

      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: publicUrl } = supabase.storage.from(bucket).getPublicUrl(fileName);

    return NextResponse.json({ url: publicUrl.publicUrl });
  } catch {
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
