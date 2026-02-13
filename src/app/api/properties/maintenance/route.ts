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

// ---------------------------------------------------------------------------
// PATCH /api/properties/maintenance - Update a maintenance request
// ---------------------------------------------------------------------------

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    if (!body.id) {
      return NextResponse.json(
        { error: "Maintenance request id is required." },
        { status: 400 }
      );
    }

    // Verify ownership
    const { data: existing } = await supabase
      .from("maintenance_requests")
      .select("id")
      .eq("id", body.id)
      .eq("company_id", userCtx.companyId)
      .single();

    if (!existing) {
      return NextResponse.json(
        { error: "Maintenance request not found" },
        { status: 404 }
      );
    }

    const allowedFields = [
      "title",
      "description",
      "category",
      "priority",
      "status",
      "assigned_to",
      "estimated_cost",
      "actual_cost",
      "scheduled_date",
      "completed_at",
      "notes",
    ];

    const updates: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (body[key] !== undefined) updates[key] = body[key];
    }

    if (body.status === "completed" && !body.completed_at) {
      updates.completed_at = new Date().toISOString();
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid fields provided." },
        { status: 400 }
      );
    }

    updates.updated_at = new Date().toISOString();

    const { data: updated, error } = await supabase
      .from("maintenance_requests")
      .update(updates)
      .eq("id", body.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(updated);
  } catch (err) {
    console.error("PATCH /api/properties/maintenance error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/properties/maintenance - Delete a maintenance request
// ---------------------------------------------------------------------------

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    if (!body.id) {
      return NextResponse.json(
        { error: "Maintenance request id is required." },
        { status: 400 }
      );
    }

    const { data: existing } = await supabase
      .from("maintenance_requests")
      .select("id")
      .eq("id", body.id)
      .eq("company_id", userCtx.companyId)
      .single();

    if (!existing) {
      return NextResponse.json(
        { error: "Maintenance request not found" },
        { status: 404 }
      );
    }

    const { error } = await supabase
      .from("maintenance_requests")
      .delete()
      .eq("id", body.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/properties/maintenance error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
