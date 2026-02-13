import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";

// ---------------------------------------------------------------------------
// POST /api/properties/maintenance - Create a new maintenance request
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
    if (!body.property_id) {
      return NextResponse.json(
        { error: "Property is required." },
        { status: 400 }
      );
    }

    if (!body.title || typeof body.title !== "string" || !body.title.trim()) {
      return NextResponse.json(
        { error: "Title is required." },
        { status: 400 }
      );
    }

    const validPriorities = ["low", "medium", "high", "emergency"];
    const priority = body.priority || "medium";
    if (!validPriorities.includes(priority)) {
      return NextResponse.json(
        { error: "Invalid priority value." },
        { status: 400 }
      );
    }

    const validCategories = [
      "plumbing",
      "electrical",
      "hvac",
      "structural",
      "cosmetic",
      "appliance",
      "pest_control",
      "general",
      "other",
    ];
    if (body.category && !validCategories.includes(body.category)) {
      return NextResponse.json(
        { error: "Invalid category value." },
        { status: 400 }
      );
    }

    const { data: request_record, error } = await supabase
      .from("maintenance_requests")
      .insert({
        company_id: userCtx.companyId,
        property_id: body.property_id,
        unit_id: body.unit_id || null,
        title: body.title.trim(),
        description: body.description?.trim() || null,
        priority,
        category: body.category || null,
        status: "submitted",
        requested_by: userCtx.userId,
        scheduled_date: body.scheduled_date || null,
        estimated_cost: body.estimated_cost ? Number(body.estimated_cost) : null,
      })
      .select()
      .single();

    if (error) {
      console.error("Create maintenance request error:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(request_record, { status: 201 });
  } catch (err) {
    console.error("POST /api/properties/maintenance error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
