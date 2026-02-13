import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { returnEquipment } from "@/lib/queries/equipment";

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
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Verify the assignment exists and belongs to the company
    const { data: existing } = await supabase
      .from("equipment_assignments")
      .select("id, company_id, status")
      .eq("id", id)
      .single();

    if (!existing || existing.company_id !== userCtx.companyId) {
      return NextResponse.json(
        { error: "Assignment not found" },
        { status: 404 }
      );
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
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
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
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Verify the assignment exists and belongs to the company
    const { data: existing } = await supabase
      .from("equipment_assignments")
      .select("id, company_id")
      .eq("id", id)
      .single();

    if (!existing || existing.company_id !== userCtx.companyId) {
      return NextResponse.json(
        { error: "Assignment not found" },
        { status: 404 }
      );
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
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
