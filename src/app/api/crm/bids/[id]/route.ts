import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";

export async function GET(
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

    const { data: bid, error } = await supabase
      .from("bids")
      .select("*")
      .eq("id", id)
      .eq("company_id", userCtx.companyId)
      .single();

    if (error || !bid) {
      return NextResponse.json({ error: "Bid not found" }, { status: 404 });
    }

    return NextResponse.json(bid);
  } catch (err) {
    console.error("GET /api/crm/bids/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

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
      .from("bids")
      .select("id, company_id")
      .eq("id", id)
      .single();

    if (!existing || existing.company_id !== userCtx.companyId) {
      return NextResponse.json({ error: "Bid not found" }, { status: 404 });
    }

    const body = await request.json();
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (body.project_name !== undefined) updateData.project_name = body.project_name;
    if (body.client_name !== undefined) updateData.client_name = body.client_name;
    if (body.bid_amount !== undefined) updateData.bid_amount = body.bid_amount;
    if (body.estimated_cost !== undefined) updateData.estimated_cost = body.estimated_cost;
    if (body.margin_pct !== undefined) updateData.margin_pct = body.margin_pct;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.due_date !== undefined) updateData.due_date = body.due_date;
    if (body.scope_description !== undefined) updateData.scope_description = body.scope_description;

    const { data: updated, error } = await supabase
      .from("bids")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(updated);
  } catch (err) {
    console.error("PATCH /api/crm/bids/[id] error:", err);
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
      .from("bids")
      .select("id, company_id")
      .eq("id", id)
      .single();

    if (!existing || existing.company_id !== userCtx.companyId) {
      return NextResponse.json({ error: "Bid not found" }, { status: 404 });
    }

    const { error } = await supabase.from("bids").delete().eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/crm/bids/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
