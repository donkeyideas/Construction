import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { returnEquipment } from "@/lib/queries/equipment";

// ---------------------------------------------------------------------------
// PUT /api/equipment/assignments/[id] — Update assignment fields
// ---------------------------------------------------------------------------

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: existing } = await supabase
      .from("equipment_assignments")
      .select("id, company_id, equipment_id, status")
      .eq("id", id)
      .single();

    if (!existing || existing.company_id !== userCtx.companyId) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }

    const body = await request.json();
    const updates: Record<string, unknown> = {};

    if (body.equipment_id !== undefined) updates.equipment_id = body.equipment_id;
    if (body.project_id !== undefined) updates.project_id = body.project_id || null;
    if (body.assigned_to !== undefined) updates.assigned_to = body.assigned_to || null;
    if (body.assigned_date !== undefined) updates.assigned_date = body.assigned_date;
    if (body.returned_date !== undefined) updates.returned_date = body.returned_date || null;
    if (body.notes !== undefined) updates.notes = body.notes || null;
    if (body.status !== undefined) updates.status = body.status;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    updates.updated_at = new Date().toISOString();

    const { data: updated, error } = await supabase
      .from("equipment_assignments")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // If equipment changed, update the old equipment status back to available
    if (body.equipment_id && body.equipment_id !== existing.equipment_id) {
      await supabase
        .from("equipment")
        .update({ status: "available", current_project_id: null })
        .eq("id", existing.equipment_id);
      if (body.status !== "returned") {
        await supabase
          .from("equipment")
          .update({ status: "in_use", current_project_id: body.project_id || null })
          .eq("id", body.equipment_id);
      }
    }

    // If status changed to returned, update equipment status
    if (body.status === "returned" && existing.status !== "returned") {
      await supabase
        .from("equipment")
        .update({ status: "available", current_project_id: null })
        .eq("id", updates.equipment_id || existing.equipment_id);
    }

    return NextResponse.json(updated);
  } catch (err) {
    console.error("PUT /api/equipment/assignments/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/equipment/assignments/[id] — Return equipment
// ---------------------------------------------------------------------------

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: existing } = await supabase
      .from("equipment_assignments")
      .select("id, company_id, status")
      .eq("id", id)
      .single();

    if (!existing || existing.company_id !== userCtx.companyId) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }

    if (existing.status === "returned") {
      return NextResponse.json(
        { error: "Equipment has already been returned" },
        { status: 400 }
      );
    }

    const { assignment, error } = await returnEquipment(supabase, id);

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    return NextResponse.json(assignment);
  } catch (err) {
    console.error("PATCH /api/equipment/assignments/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/equipment/assignments/[id] — Delete assignment
// ---------------------------------------------------------------------------

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: existing } = await supabase
      .from("equipment_assignments")
      .select("id, company_id")
      .eq("id", id)
      .single();

    if (!existing || existing.company_id !== userCtx.companyId) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }

    const { error } = await supabase
      .from("equipment_assignments")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/equipment/assignments/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
