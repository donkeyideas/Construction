import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import {
  getOpportunities,
  createOpportunity,
  type OpportunityStage,
} from "@/lib/queries/crm";

// ---------------------------------------------------------------------------
// GET /api/crm/opportunities - List opportunities
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const stage = searchParams.get("stage") as OpportunityStage | null;
    const search = searchParams.get("search") ?? undefined;
    const assignedTo = searchParams.get("assigned_to") ?? undefined;

    const opportunities = await getOpportunities(
      supabase,
      userCtx.companyId,
      {
        stage: stage ?? undefined,
        search,
        assignedTo,
      }
    );

    return NextResponse.json(opportunities);
  } catch (err) {
    console.error("GET /api/crm/opportunities error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/crm/opportunities - Create a new opportunity
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Validate required fields
    if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
      return NextResponse.json(
        { error: "Opportunity name is required." },
        { status: 400 }
      );
    }

    const { opportunity, error } = await createOpportunity(
      supabase,
      userCtx.companyId,
      {
        name: body.name.trim(),
        client_name: body.client_name || null,
        client_contact: body.client_contact || null,
        client_email: body.client_email || null,
        client_phone: body.client_phone || null,
        project_type: body.project_type || null,
        estimated_value: body.estimated_value ?? null,
        probability_pct: body.probability_pct ?? null,
        stage: body.stage || "lead",
        source: body.source || null,
        assigned_to: body.assigned_to || null,
        expected_close_date: body.expected_close_date || null,
        notes: body.notes || null,
      }
    );

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    return NextResponse.json(opportunity, { status: 201 });
  } catch (err) {
    console.error("POST /api/crm/opportunities error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
