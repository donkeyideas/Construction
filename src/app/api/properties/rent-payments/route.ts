import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import {
  generateRentPaymentJournalEntry,
  buildCompanyAccountMap,
} from "@/lib/utils/invoice-accounting";

// ---------------------------------------------------------------------------
// /api/properties/rent-payments
// Record a rent payment received from a tenant
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);
    if (!userCtx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!["owner", "admin"].includes(userCtx.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const {
      lease_id,
      amount,
      payment_date,
      due_date,
      method,
      reference_number,
      notes,
      late_fee,
    } = body;

    if (!lease_id || !amount || !payment_date || !method) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: lease_id, amount, payment_date, method",
        },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: "Amount must be greater than 0" },
        { status: 400 }
      );
    }

    // Verify lease belongs to company
    const { data: lease, error: leaseErr } = await supabase
      .from("leases")
      .select("id, company_id, property_id, tenant_name, monthly_rent")
      .eq("id", lease_id)
      .eq("company_id", userCtx.companyId)
      .single();

    if (leaseErr || !lease) {
      return NextResponse.json(
        { error: "Lease not found" },
        { status: 404 }
      );
    }

    // Insert rent payment
    const { data: payment, error: paymentErr } = await supabase
      .from("rent_payments")
      .insert({
        lease_id,
        company_id: userCtx.companyId,
        amount: parseFloat(amount),
        payment_date,
        due_date: due_date || payment_date,
        method,
        reference_number: reference_number || null,
        notes: notes || null,
        late_fee: late_fee ? parseFloat(late_fee) : null,
        status: "paid",
      })
      .select()
      .single();

    if (paymentErr) {
      console.error("Insert rent payment error:", paymentErr);
      return NextResponse.json(
        { error: paymentErr.message },
        { status: 500 }
      );
    }

    // Auto-generate journal entry
    let journalEntryId: string | null = null;
    try {
      const accountMap = await buildCompanyAccountMap(
        supabase,
        userCtx.companyId
      );
      const jeResult = await generateRentPaymentJournalEntry(
        supabase,
        userCtx.companyId,
        userCtx.userId,
        {
          id: payment.id,
          amount: parseFloat(amount),
          payment_date,
          late_fee: late_fee ? parseFloat(late_fee) : undefined,
          lease_id,
          property_id: lease.property_id,
          tenant_name: lease.tenant_name || "Tenant",
        },
        accountMap
      );
      journalEntryId = jeResult?.journalEntryId ?? null;
    } catch (jeError) {
      console.warn(
        "Rent payment JE generation warning (payment still recorded):",
        jeError
      );
    }

    return NextResponse.json(
      { ...payment, journal_entry_id: journalEntryId },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST /api/properties/rent-payments error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
