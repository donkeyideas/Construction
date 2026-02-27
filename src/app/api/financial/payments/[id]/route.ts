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
    const userCompany = await getCurrentUserCompany(supabase);

    if (!userCompany) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify the payment belongs to this company
    const { data: existing, error: fetchErr } = await supabase
      .from("payments")
      .select("id, company_id")
      .eq("id", id)
      .eq("company_id", userCompany.companyId)
      .single();

    if (fetchErr || !existing) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    const body = await request.json();

    const updatePayload: Record<string, unknown> = {};

    if (body.method !== undefined) updatePayload.method = body.method;
    if (body.bank_account_id !== undefined) updatePayload.bank_account_id = body.bank_account_id;
    if (body.reference_number !== undefined) updatePayload.reference_number = body.reference_number;
    if (body.notes !== undefined) updatePayload.notes = body.notes;

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ message: "No changes" });
    }

    const { error: updateErr } = await supabase
      .from("payments")
      .update(updatePayload)
      .eq("id", id);

    if (updateErr) {
      console.error("Failed to update payment:", updateErr);
      return NextResponse.json({ error: "Failed to update payment" }, { status: 500 });
    }

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error("PATCH /api/financial/payments/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
