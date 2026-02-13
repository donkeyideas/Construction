import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";

// ---------------------------------------------------------------------------
// POST /api/crm — Create a new opportunity
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Validate required fields
    if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
      return NextResponse.json(
        { error: "Opportunity name is required." },
        { status: 400 }
      );
    }

    const { data: opportunity, error } = await supabase
      .from("opportunities")
      .insert({
        company_id: userCtx.companyId,
        name: body.name.trim(),
        client_name: body.client_name?.trim() || null,
        description: body.description?.trim() || null,
        stage: body.stage || "lead",
        estimated_value: body.estimated_value ? Number(body.estimated_value) : null,
        probability_pct: body.probability_pct != null ? Number(body.probability_pct) : 50,
        expected_close_date: body.expected_close_date || null,
        source: body.source || null,
        assigned_to: userCtx.userId,
        notes: body.notes?.trim() || null,
      })
      .select()
      .single();

    if (error) {
      console.error("POST /api/crm insert error:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(opportunity, { status: 201 });
  } catch (err) {
    console.error("POST /api/crm error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
