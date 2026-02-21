import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getCompanyGateway } from "@/lib/payments";

/**
 * POST /api/financial/vendor-payments/checkout
 * Create a checkout session to pay a vendor invoice online.
 * Body: { invoice_id: string }
 * Returns: { url } for redirect to payment provider
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const ctx = await getCurrentUserCompany(supabase);

    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { invoice_id, return_path } = body;

    if (!invoice_id) {
      return NextResponse.json(
        { error: "invoice_id is required" },
        { status: 400 }
      );
    }

    // Fetch the invoice and validate it belongs to this company
    const { data: invoice } = await supabase
      .from("invoices")
      .select(
        "id, invoice_number, vendor_name, total_amount, balance_due, status, invoice_type, due_date, projects(name)"
      )
      .eq("id", invoice_id)
      .eq("company_id", ctx.companyId)
      .eq("invoice_type", "payable")
      .single();

    if (!invoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    if (invoice.status === "paid" || invoice.status === "voided") {
      return NextResponse.json(
        { error: "Invoice is already paid or voided" },
        { status: 400 }
      );
    }

    const amount = invoice.balance_due || invoice.total_amount;
    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: "Invalid payment amount" },
        { status: 400 }
      );
    }

    // Get the company's active payment gateway
    const result = await getCompanyGateway(ctx.companyId);
    if (!result) {
      return NextResponse.json(
        { error: "No payment provider configured. Go to Payment Settings to connect one." },
        { status: 400 }
      );
    }

    const vendorName = invoice.vendor_name || "Vendor";
    const proj = invoice.projects as unknown as { name: string } | null;
    const projectName = proj?.name || "";
    const dueDate = invoice.due_date || new Date().toISOString().slice(0, 10);
    const origin = request.headers.get("origin") || "";

    const description = projectName
      ? `Payment to ${vendorName} — ${invoice.invoice_number} (${projectName})`
      : `Payment to ${vendorName} — ${invoice.invoice_number}`;

    const session = await result.gateway.createCheckoutSession(
      result.credentials,
      {
        leaseId: invoice.id, // reusing leaseId field for invoice_id
        companyId: ctx.companyId,
        tenantUserId: ctx.userId, // admin user making the payment
        amount,
        description,
        dueDate,
        successUrl: `${origin}${return_path || "/financial/ap"}?payment=success&invoice=${invoice_id}`,
        cancelUrl: `${origin}${return_path || "/financial/ap"}?payment=canceled`,
      }
    );

    if (!session) {
      return NextResponse.json(
        { error: "Failed to create checkout session" },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Vendor payment checkout error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
