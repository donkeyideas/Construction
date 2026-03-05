import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { storageUpload, storageSignedUrl } from "@/lib/supabase/storage";

const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
]);

const MAX_SIZE = 20 * 1024 * 1024; // 20MB

export async function POST(req: Request) {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);
  if (!userCompany) return new Response("Unauthorized", { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "File type not supported. Use PDF, JPG, or PNG." },
      { status: 400 }
    );
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "File too large. Maximum 20MB." },
      { status: 400 }
    );
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
  const path = `${userCompany.companyId}/permit-review/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  const { error } = await storageUpload(path, buffer, {
    contentType: file.type,
  });

  if (error) {
    console.error("permit-review upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }

  const signed = await storageSignedUrl(path, 3600);

  return NextResponse.json({
    path,
    signedUrl: signed || null,
    originalName: file.name,
    size: file.size,
    mimeType: file.type,
  });
}
