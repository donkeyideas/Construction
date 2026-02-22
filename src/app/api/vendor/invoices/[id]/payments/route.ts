import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: invoiceId } = await params;
    const admin = createAdminClient();

    // Look up vendor contact
    const { data: contact } = await admin
      .from("contacts")
      .select("id")
      .eq("user_id", user.id)
      .in("contact_type", ["vendor", "subcontractor"])
      .limit(1)
      .single();

    if (!contact) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Verify invoice belongs to this vendor
    const { data: invoice } = await admin
      .from("invoices")
      .select("id, invoice_number, vendor_id")
      .eq("id", invoiceId)
      .eq("vendor_id", contact.id)
      .single();

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // Fetch payments for this invoice
    const { data: payments } = await admin
      .from("payments")
      .select("id, payment_date, amount, method, reference_number, notes")
      .eq("invoice_id", invoiceId)
      .order("payment_date", { ascending: false });

    return NextResponse.json({ payments: payments ?? [] });
  } catch (err) {
    console.error("GET /api/vendor/invoices/[id]/payments error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
