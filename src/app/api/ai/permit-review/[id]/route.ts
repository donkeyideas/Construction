import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";

// ---------------------------------------------------------------------------
// GET /api/ai/permit-review/[id] - Fetch a single review
// ---------------------------------------------------------------------------

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id } = await params;

  const { data, error } = await supabase
    .from("permit_reviews")
    .select("*")
    .eq("id", id)
    .eq("company_id", userCompany.companyId)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Review not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: data.id,
    title: data.title,
    overallStatus: data.overall_status,
    overallConfidence: Number(data.overall_confidence) || 0,
    summary: data.summary || "",
    sections: data.sections || [],
    issues: data.issues || [],
    recommendations: data.recommendations || [],
    jurisdiction: data.jurisdiction,
    buildingType: data.building_type,
    projectId: data.project_id,
    processingTimeMs: data.processing_time_ms,
    providerName: data.provider_name,
    modelId: data.model_id,
    createdAt: data.created_at,
  });
}

// ---------------------------------------------------------------------------
// DELETE /api/ai/permit-review/[id] - Delete a review
// ---------------------------------------------------------------------------

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id } = await params;

  const { error } = await supabase
    .from("permit_reviews")
    .delete()
    .eq("id", id)
    .eq("company_id", userCompany.companyId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
