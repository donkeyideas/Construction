import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { checkSubscriptionAccess } from "@/lib/guards/subscription-guard";

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

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const userCompany = await getCurrentUserCompany(supabase);

    if (!userCompany) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const subBlock = await checkSubscriptionAccess(userCompany.companyId, "DELETE");
    if (subBlock) return subBlock;

    // Fetch the payment with its invoice info
    const { data: payment, error: fetchErr } = await supabase
      .from("payments")
      .select("id, invoice_id, amount, bank_account_id, company_id")
      .eq("id", id)
      .eq("company_id", userCompany.companyId)
      .single();

    if (fetchErr || !payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    // 1. Reverse the bank balance adjustment
    if (payment.bank_account_id) {
      const { data: invoice } = await supabase
        .from("invoices")
        .select("invoice_type")
        .eq("id", payment.invoice_id)
        .single();

      if (invoice) {
        // Reverse: payable payment subtracted cash, so add it back; receivable added, so subtract
        const reversal = invoice.invoice_type === "payable" ? payment.amount : -payment.amount;
        await supabase.rpc("adjust_bank_balance", {
          p_bank_id: payment.bank_account_id,
          p_adjustment: reversal,
        });
      }
    }

    // 2. Void the payment journal entry
    const { data: paymentJEs } = await supabase
      .from("journal_entries")
      .select("id")
      .eq("company_id", userCompany.companyId)
      .eq("reference", `payment:${id}`);

    if (paymentJEs && paymentJEs.length > 0) {
      const jeIds = paymentJEs.map((je) => je.id);
      await supabase
        .from("journal_entry_lines")
        .delete()
        .in("journal_entry_id", jeIds);
      await supabase
        .from("journal_entries")
        .delete()
        .in("id", jeIds);
    }

    // 3. Update invoice: subtract amount_paid, recalculate status
    const { data: inv } = await supabase
      .from("invoices")
      .select("total_amount, amount_paid, due_date")
      .eq("id", payment.invoice_id)
      .single();

    if (inv) {
      const newAmountPaid = Math.max(0, (inv.amount_paid ?? 0) - payment.amount);
      const newBalanceDue = (inv.total_amount ?? 0) - newAmountPaid;

      // Determine correct status after payment removal
      let newStatus: string;
      if (newBalanceDue <= 0.01) {
        newStatus = "paid";
      } else if (newAmountPaid > 0) {
        newStatus = "approved"; // still has partial payment
      } else {
        // No payments remain — check if overdue
        const dueDate = new Date(inv.due_date);
        newStatus = dueDate < new Date() ? "overdue" : "approved";
      }

      // Only update amount_paid and status — balance_due is a Postgres
      // GENERATED COLUMN (total_amount - amount_paid) and cannot be set directly
      await supabase
        .from("invoices")
        .update({
          amount_paid: newAmountPaid,
          status: newStatus,
        })
        .eq("id", payment.invoice_id);
    }

    // 4. Delete the payment record
    const { error: deleteErr } = await supabase
      .from("payments")
      .delete()
      .eq("id", id);

    if (deleteErr) {
      console.error("Failed to delete payment:", deleteErr);
      return NextResponse.json({ error: "Failed to delete payment" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/financial/payments/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
