import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";

// GET /api/employee/photo?id=<uuid>
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);
    if (!userCtx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const id = new URL(request.url).searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("documents")
      .select("*, projects(name)")
      .eq("id", id)
      .eq("company_id", userCtx.companyId)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({
      ...data,
      project_name: (data.projects as { name: string } | null)?.name ?? null,
    });
  } catch (err) {
    console.error("GET /api/employee/photo error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
