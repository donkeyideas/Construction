import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getInvoiceById, updateInvoice } from "@/lib/queries/financial";
import { createNotifications } from "@/lib/utils/notifications";
import { checkSubscriptionAccess } from "@/lib/guards/subscription-guard";
import {
  buildCompanyAccountMap,
  generateInvoiceJournalEntry,
} from "@/lib/utils/invoice-accounting";

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

    // Auto-generate invoice JE if one doesn't exist yet (idempotent)
    const warnings: string[] = [];
    if (existing.total_amount && Number(existing.total_amount) > 0 && existing.status !== "voided") {
      try {
        // existing comes from select("*") — DB columns beyond InvoiceRow are present at runtime
        const raw = existing as unknown as Record<string, unknown>;
        const accountMap = await buildCompanyAccountMap(supabase, userCompany.companyId);
        const jeResult = await generateInvoiceJournalEntry(supabase, userCompany.companyId, userCompany.userId, {
          id,
          invoice_number: existing.invoice_number ?? "",
          invoice_type: existing.invoice_type ?? "payable",
          total_amount: Number(existing.total_amount),
          subtotal: existing.subtotal ? Number(existing.subtotal) : undefined,
          tax_amount: existing.tax_amount ? Number(existing.tax_amount) : undefined,
          invoice_date: existing.invoice_date ?? new Date().toISOString().split("T")[0],
          status: body.status ?? existing.status,
          project_id: existing.project_id,
          property_id: raw.property_id as string | null | undefined,
          vendor_name: existing.vendor_name,
          client_name: existing.client_name,
          gl_account_id: raw.gl_account_id as string | null | undefined,
          retainage_pct: raw.retainage_pct ? Number(raw.retainage_pct) : undefined,
          retainage_held: raw.retainage_held ? Number(raw.retainage_held) : undefined,
        }, accountMap);
        if (!jeResult) {
          const invType = existing.invoice_type ?? "payable";
          const missing = invType === "payable"
            ? (!accountMap.apId ? "AP account" : "expense account")
            : (!accountMap.arId ? "AR account" : "revenue account");
          warnings.push(`Journal entry not created: no ${missing} found in Chart of Accounts.`);
        }
      } catch (jeErr) {
        console.warn("Invoice JE generation failed (non-blocking):", jeErr);
        warnings.push("Journal entry generation failed. Check Chart of Accounts setup.");
      }
    }

    return NextResponse.json({ success: true, warnings });
  } catch (error) {
    console.error("PATCH /api/financial/invoices/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    const subBlock2 = await checkSubscriptionAccess(userCompany.companyId, "DELETE");
    if (subBlock2) return subBlock2;

    const { searchParams } = new URL(request.url);
    const hard = searchParams.get("hard") === "true";

    if (hard) {
      // Hard delete: remove JEs, payments, and the invoice row
      // Delete JE lines + JEs with reference matching this invoice
      await supabase
        .from("journal_entry_lines")
        .delete()
        .in("journal_entry_id",
          (await supabase
            .from("journal_entries")
            .select("id")
            .eq("company_id", userCompany.companyId)
            .or(`reference.eq.invoice:${id},reference.like.payment:%`)
          ).data?.filter(je => je.id).map(je => je.id) ?? []
        );
      // Delete JEs referencing this invoice
      await supabase
        .from("journal_entries")
        .delete()
        .eq("company_id", userCompany.companyId)
        .eq("reference", `invoice:${id}`);
      // Delete payments linked to this invoice
      await supabase
        .from("payments")
        .delete()
        .eq("invoice_id", id);
      // Delete the invoice itself
      const { error } = await supabase
        .from("invoices")
        .delete()
        .eq("id", id)
        .eq("company_id", userCompany.companyId);
      if (error) {
        return NextResponse.json(
          { error: "Failed to delete invoice" },
          { status: 500 }
        );
      }
    } else {
      // Soft delete: set status to voided
      const success = await updateInvoice(supabase, id, { status: "voided" });

      if (!success) {
        return NextResponse.json(
          { error: "Failed to void invoice" },
          { status: 500 }
        );
      }

      // Also void linked journal entries so GL stays in sync
      await supabase
        .from("journal_entries")
        .update({ status: "voided" })
        .eq("company_id", userCompany.companyId)
        .eq("reference", `invoice:${id}`);
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
