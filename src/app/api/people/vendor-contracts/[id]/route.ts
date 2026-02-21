import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";

export async function PATCH(
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
      .from("vendor_contracts")
      .select("id, company_id")
      .eq("id", id)
      .single();

    if (!existing || existing.company_id !== userCtx.companyId) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 });
    }

    const body = await request.json();
    const updateData: Record<string, unknown> = {};

    if (body.vendor_id !== undefined) updateData.vendor_id = body.vendor_id;
    if (body.project_id !== undefined) updateData.project_id = body.project_id || null;
    if (body.contract_number !== undefined) updateData.contract_number = body.contract_number;
    if (body.title !== undefined) updateData.title = body.title;
    if (body.contract_type !== undefined) updateData.contract_type = body.contract_type;
    if (body.amount !== undefined) updateData.amount = Number(body.amount);
    if (body.status !== undefined) updateData.status = body.status;
    if (body.start_date !== undefined) updateData.start_date = body.start_date || null;
    if (body.end_date !== undefined) updateData.end_date = body.end_date || null;
    if (body.scope_of_work !== undefined) updateData.scope_of_work = body.scope_of_work;
    if (body.retention_pct !== undefined) updateData.retention_pct = Number(body.retention_pct);
    if (body.insurance_required !== undefined) updateData.insurance_required = body.insurance_required;
    if (body.insurance_expiry !== undefined) updateData.insurance_expiry = body.insurance_expiry || null;

    updateData.updated_at = new Date().toISOString();

    const { data: updated, error } = await supabase
      .from("vendor_contracts")
      .update(updateData)
      .eq("id", id)
      .select("*, contacts(first_name, last_name, company_name)")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(updated);
  } catch (err) {
    console.error("PATCH /api/people/vendor-contracts/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

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
      .from("vendor_contracts")
      .select("id, company_id")
      .eq("id", id)
      .single();

    if (!existing || existing.company_id !== userCtx.companyId) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 });
    }

    const { error } = await supabase
      .from("vendor_contracts")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/people/vendor-contracts/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
