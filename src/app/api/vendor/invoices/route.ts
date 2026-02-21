import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// ---------------------------------------------------------------------------
// POST /api/vendor/invoices
// Submit a new invoice from the vendor portal
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Look up vendor contact for this user
    const { data: contact } = await supabase
      .from("contacts")
      .select("id, company_id, company_name, first_name, last_name")
      .eq("user_id", user.id)
      .in("contact_type", ["vendor", "subcontractor"])
      .limit(1)
      .single();

    if (!contact) {
      return NextResponse.json(
        { error: "No vendor profile found for this user." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      project_id,
      invoice_number,
      amount,
      tax_amount,
      due_date,
      payment_terms,
      description,
      line_items,
    } = body as {
      project_id?: string;
      invoice_number?: string;
      amount?: number;
      tax_amount?: number;
      due_date?: string;
      payment_terms?: string;
      description?: string;
      line_items?: { description: string; quantity: number; unit_price: number; amount: number }[];
    };

    if (!invoice_number || !amount) {
      return NextResponse.json(
        { error: "Invoice number and amount are required." },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: "Amount must be greater than zero." },
        { status: 400 }
      );
    }

    const vendorName =
      contact.company_name ||
      `${contact.first_name || ""} ${contact.last_name || ""}`.trim();

    const today = new Date().toISOString().split("T")[0];
    const taxAmt = tax_amount && tax_amount > 0 ? tax_amount : 0;
    const totalAmount = amount + taxAmt;

    // Compute due date from payment terms or explicit date
    let computedDueDate = due_date || "";
    if (!computedDueDate && payment_terms) {
      const termDays: Record<string, number> = {
        due_on_receipt: 0, net_10: 10, net_15: 15, net_30: 30,
        net_45: 45, net_60: 60, net_90: 90,
      };
      const days = termDays[payment_terms] ?? 30;
      computedDueDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000)
        .toISOString().split("T")[0];
    }
    if (!computedDueDate) {
      computedDueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString().split("T")[0];
    }

    // Use admin client to bypass RLS (vendor users don't have company_members)
    const admin = createAdminClient();

    const { data: invoice, error: insertError } = await admin
      .from("invoices")
      .insert({
        company_id: contact.company_id,
        invoice_number,
        invoice_type: "payable",
        vendor_name: vendorName,
        vendor_id: contact.id,
        project_id: project_id || null,
        invoice_date: today,
        due_date: computedDueDate,
        subtotal: amount,
        tax_amount: taxAmt,
        total_amount: totalAmount,
        amount_paid: 0,
        status: "submitted",
        notes: description || null,
        payment_terms: payment_terms || null,
        submitted_by: user.id,
        submitted_at: new Date().toISOString(),
        line_items: line_items && line_items.length > 0 ? line_items : null,
      })
      .select("id, invoice_number, status")
      .single();

    if (insertError) {
      console.error("Vendor invoice insert error:", insertError);
      return NextResponse.json(
        { error: "Failed to submit invoice. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json(invoice, { status: 201 });
  } catch (err) {
    console.error("POST /api/vendor/invoices error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
