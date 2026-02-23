import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getInvoiceById, updateInvoice } from "@/lib/queries/financial";
import { createNotifications } from "@/lib/utils/notifications";
import { checkSubscriptionAccess } from "@/lib/guards/subscription-guard";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();
    const userCompany = await getCurrentUserCompany(supabase);

    if (!userCompany) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const invoice = await getInvoiceById(supabase, id);

    if (!invoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ invoice });
  } catch (error) {
    console.error("GET /api/financial/invoices/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();
    const userCompany = await getCurrentUserCompany(supabase);

    if (!userCompany) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const subBlock = await checkSubscriptionAccess(userCompany.companyId, "PATCH");
    if (subBlock) return subBlock;

    // Verify the invoice belongs to this company
    const existing = await getInvoiceById(supabase, id);
    if (!existing) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    const body = await request.json();

    const success = await updateInvoice(supabase, id, body);

    if (!success) {
      return NextResponse.json(
        { error: "Failed to update invoice" },
        { status: 500 }
      );
    }

    if (body.status) {
      try {
        await createNotifications(supabase, {
          companyId: userCompany.companyId,
          actorUserId: userCompany.userId,
          title: `Invoice ${existing.invoice_number || id.slice(0, 8)} updated`,
          message: `Invoice status changed to "${body.status}".`,
          notificationType: body.status === "paid" ? "approval" : "info",
          entityType: "invoice",
          entityId: id,
        });
      } catch (e) { console.warn("Notification failed:", e); }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PATCH /api/financial/invoices/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();
    const userCompany = await getCurrentUserCompany(supabase);

    if (!userCompany) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const subBlock2 = await checkSubscriptionAccess(userCompany.companyId, "DELETE");
    if (subBlock2) return subBlock2;

    // Soft delete: set status to voided
    const success = await updateInvoice(supabase, id, { status: "voided" });

    if (!success) {
      return NextResponse.json(
        { error: "Failed to void invoice" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/financial/invoices/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
