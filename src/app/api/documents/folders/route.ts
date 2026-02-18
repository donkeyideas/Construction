import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getDocumentFolders, createDocumentFolder } from "@/lib/queries/documents";

/* ------------------------------------------------------------------
   GET /api/documents/folders — List folders for company
   ------------------------------------------------------------------ */

export async function GET() {
  try {
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const folders = await getDocumentFolders(supabase, userCtx.companyId);
    return NextResponse.json(folders);
  } catch (err) {
    console.error("GET /api/documents/folders error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/* ------------------------------------------------------------------
   POST /api/documents/folders — Create a new folder
   ------------------------------------------------------------------ */

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, parent_id, color } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { error: "Folder name is required" },
        { status: 400 }
      );
    }

    const { folder, error } = await createDocumentFolder(
      supabase,
      userCtx.companyId,
      name.trim(),
      parent_id ?? null,
      color ?? "#6366f1"
    );

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    return NextResponse.json(folder, { status: 201 });
  } catch (err) {
    console.error("POST /api/documents/folders error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
