import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import {
  getDocuments,
  uploadDocument,
  type DocumentFilters,
} from "@/lib/queries/documents";
import { storageUpload } from "@/lib/supabase/storage";

/* ------------------------------------------------------------------
   GET /api/documents - List documents for the current company
   ------------------------------------------------------------------ */

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const filters: DocumentFilters = {};

    const projectId = searchParams.get("projectId");
    if (projectId) filters.projectId = projectId;

    const propertyId = searchParams.get("propertyId");
    if (propertyId) filters.propertyId = propertyId;

    const category = searchParams.get("category");
    if (category) filters.category = category;

    const search = searchParams.get("search");
    if (search) filters.search = search;

    const folderPath = searchParams.get("folderPath");
    if (folderPath) filters.folderPath = folderPath;

    const documents = await getDocuments(supabase, userCtx.companyId, filters);

    return NextResponse.json(documents);
  } catch (err) {
    console.error("GET /api/documents error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/* ------------------------------------------------------------------
   POST /api/documents - Upload a document (multipart/form-data)
   ------------------------------------------------------------------ */

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const contentType = request.headers.get("content-type") ?? "";

    // Handle multipart form data
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;

      if (!file) {
        return NextResponse.json(
          { error: "No file provided." },
          { status: 400 }
        );
      }

      const name = (formData.get("name") as string) || file.name;
      const category =
        (formData.get("category") as string) || "correspondence";
      const folderPath = formData.get("folder_path") as string | null;
      const projectId = formData.get("project_id") as string | null;
      const propertyId = formData.get("property_id") as string | null;
      const tagsRaw = formData.get("tags") as string | null;
      let tags: string[] = [];
      if (tagsRaw) {
        try {
          const parsed = JSON.parse(tagsRaw);
          tags = Array.isArray(parsed) ? parsed : tagsRaw.split(",").map((t) => t.trim());
        } catch {
          tags = tagsRaw.split(",").map((t) => t.trim());
        }
      }

      // Upload file to Supabase Storage (admin client ensures bucket exists)
      const timestamp = Date.now();
      const storagePath = `${userCtx.companyId}/${folderPath || "uploads"}/${timestamp}-${file.name}`;

      const { error: storageError } = await storageUpload(storagePath, file, {
        contentType: file.type,
        upsert: false,
      });

      if (storageError) {
        console.error("Storage upload error:", storageError);
        return NextResponse.json(
          { error: `File upload failed: ${storageError.message}` },
          { status: 500 }
        );
      }

      // Create document record
      const { document, error: docError } = await uploadDocument(
        supabase,
        userCtx.companyId,
        userCtx.userId,
        {
          name,
          file_type: file.type,
          file_size: file.size,
          file_path: storagePath,
          folder_path: folderPath ?? undefined,
          category,
          project_id: projectId ?? undefined,
          property_id: propertyId ?? undefined,
          tags,
        }
      );

      if (docError) {
        return NextResponse.json({ error: docError }, { status: 400 });
      }

      return NextResponse.json(document, { status: 201 });
    }

    // Handle JSON body (metadata-only upload)
    const body = await request.json();

    if (!body.name || !body.file_path) {
      return NextResponse.json(
        { error: "name and file_path are required." },
        { status: 400 }
      );
    }

    const { document, error: docError } = await uploadDocument(
      supabase,
      userCtx.companyId,
      userCtx.userId,
      {
        name: body.name,
        file_type: body.file_type ?? "application/octet-stream",
        file_size: body.file_size ?? 0,
        file_path: body.file_path,
        folder_path: body.folder_path,
        category: body.category,
        project_id: body.project_id,
        property_id: body.property_id,
        tags: body.tags,
        version: body.version,
      }
    );

    if (docError) {
      return NextResponse.json({ error: docError }, { status: 400 });
    }

    return NextResponse.json(document, { status: 201 });
  } catch (err) {
    console.error("POST /api/documents error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
