import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getIncidentById } from "@/lib/queries/safety";

// GET /api/employee/safety-incident?id=<uuid>
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

    const incident = await getIncidentById(supabase, id);
    if (!incident || incident.company_id !== userCtx.companyId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(incident);
  } catch (err) {
    console.error("GET /api/employee/safety-incident error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
