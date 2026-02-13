import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import {
  updateReconciliation,
  deleteReconciliation,
} from "@/lib/queries/banking";

// ---------------------------------------------------------------------------
// PATCH /api/financial/banking/reconciliations/[id] — Update a reconciliation
// ---------------------------------------------------------------------------

export async function PATCH(
  request: NextRequest,
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

    // Verify the reconciliation belongs to the company
    const { data: existing } = await supabase
      .from("bank_reconciliations")
      .select("id, company_id")
      .eq("id", id)
      .single();

    if (!existing || existing.company_id !== userCtx.companyId) {
      return NextResponse.json(
        { error: "Reconciliation not found" },
        { status: 404 }
      );
    }

    const body = await request.json();

    const updates: Record<string, unknown> = {};
    if (body.statement_date !== undefined)
      updates.statement_date = body.statement_date;
    if (body.statement_ending_balance !== undefined)
      updates.statement_ending_balance = body.statement_ending_balance;
    if (body.book_balance !== undefined)
      updates.book_balance = body.book_balance;
    if (body.difference !== undefined) updates.difference = body.difference;
    if (body.status !== undefined) updates.status = body.status;
    if (body.notes !== undefined) updates.notes = body.notes;

    // Auto-set completed_at when status changes to completed
    if (body.status === "completed") {
      updates.completed_at = new Date().toISOString();
    }

    const success = await updateReconciliation(supabase, id, updates);

    if (!success) {
      return NextResponse.json(
        { error: "Failed to update reconciliation" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(
      "PATCH /api/financial/banking/reconciliations/[id] error:",
      err
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/financial/banking/reconciliations/[id] — Delete a reconciliation
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

    // Verify the reconciliation belongs to the company
    const { data: existing } = await supabase
      .from("bank_reconciliations")
      .select("id, company_id")
      .eq("id", id)
      .single();

    if (!existing || existing.company_id !== userCtx.companyId) {
      return NextResponse.json(
        { error: "Reconciliation not found" },
        { status: 404 }
      );
    }

    const success = await deleteReconciliation(supabase, id);

    if (!success) {
      return NextResponse.json(
        { error: "Failed to delete reconciliation" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(
      "DELETE /api/financial/banking/reconciliations/[id] error:",
      err
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
