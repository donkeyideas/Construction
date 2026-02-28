import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getInvoices, createInvoice } from "@/lib/queries/financial";
import type { InvoiceFilters, InvoiceCreateData } from "@/lib/queries/financial";
import { buildCompanyAccountMap, generateInvoiceJournalEntry, generateInvoiceDeferralSchedule } from "@/lib/utils/invoice-accounting";
import { checkSubscriptionAccess } from "@/lib/guards/subscription-guard";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const userCompany = await getCurrentUserCompany(supabase);

    if (!userCompany) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const filters: InvoiceFilters = {};

    const type = searchParams.get("type");
    if (type === "payable" || type === "receivable") {
      filters.type = type;
    }

    const status = searchParams.get("status");
    if (status) {
      filters.status = status;
    }

    const projectId = searchParams.get("projectId");
    if (projectId) {
      filters.projectId = projectId;
    }

    const invoices = await getInvoices(supabase, userCompany.companyId, filters);

    return NextResponse.json({ invoices });
  } catch (error) {
    console.error("GET /api/financial/invoices error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const userCompany = await getCurrentUserCompany(supabase);

    if (!userCompany) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const subBlock = await checkSubscriptionAccess(userCompany.companyId, "POST");
    if (subBlock) return subBlock;

    const body = await request.json();

    // Validate required fields
    if (!body.invoice_number || !body.invoice_type || !body.invoice_date || !body.due_date) {
      return NextResponse.json(
        { error: "Missing required fields: invoice_number, invoice_type, invoice_date, due_date" },
        { status: 400 }
      );
    }

    if (body.invoice_type !== "payable" && body.invoice_type !== "receivable") {
      return NextResponse.json(
        { error: "invoice_type must be 'payable' or 'receivable'" },
        { status: 400 }
      );
    }

    const data: InvoiceCreateData = {
      invoice_number: body.invoice_number,
      invoice_type: body.invoice_type,
      vendor_name: body.vendor_name,
      client_name: body.client_name,
      project_id: body.project_id,
      property_id: body.property_id,
      invoice_date: body.invoice_date,
      due_date: body.due_date,
      subtotal: body.subtotal ?? 0,
      tax_amount: body.tax_amount ?? 0,
      total_amount: body.total_amount ?? 0,
      line_items: body.line_items ?? [],
      notes: body.notes,
      status: body.status ?? "draft",
      gl_account_id: body.gl_account_id,
      retainage_pct: body.retainage_pct ?? 0,
      retainage_held: body.retainage_held ?? 0,
      deferral_start_date: body.deferral_start_date,
      deferral_end_date: body.deferral_end_date,
    };

    const result = await createInvoice(supabase, userCompany.companyId, data);

    if (!result) {
      return NextResponse.json(
        { error: "Failed to create invoice" },
        { status: 500 }
      );
    }

    // Auto-generate journal entry (non-blocking — invoice succeeds regardless)
    const warnings: string[] = [];
    let accountMap: Awaited<ReturnType<typeof buildCompanyAccountMap>> | null = null;
    try {
      accountMap = await buildCompanyAccountMap(supabase, userCompany.companyId);
      const jeResult = await generateInvoiceJournalEntry(
        supabase,
        userCompany.companyId,
        userCompany.userId,
        {
          id: result.id,
          invoice_number: data.invoice_number,
          invoice_type: data.invoice_type,
          total_amount: data.total_amount,
          subtotal: data.subtotal,
          tax_amount: data.tax_amount,
          invoice_date: data.invoice_date,
          status: data.status,
          project_id: data.project_id,
          property_id: data.property_id,
          vendor_name: data.vendor_name,
          client_name: data.client_name,
          gl_account_id: data.gl_account_id,
          retainage_pct: data.retainage_pct,
          retainage_held: data.retainage_held,
          deferral_start_date: data.deferral_start_date,
          deferral_end_date: data.deferral_end_date,
        },
        accountMap
      );
      if (!jeResult) {
        const missing = data.invoice_type === "payable"
          ? (!accountMap.apId ? "AP account" : "expense account")
          : (!accountMap.arId ? "AR account" : "revenue account");
        warnings.push(`Journal entry not created: no ${missing} found in Chart of Accounts. Financial statements may be incomplete.`);
      }
    } catch (jeErr) {
      console.warn("Journal entry generation failed for invoice:", result.id, jeErr);
      warnings.push("Journal entry generation failed. Check Chart of Accounts setup.");
    }

    // Generate deferral schedule if deferral dates provided
    if (body.deferral_start_date && body.deferral_end_date) {
      try {
        const defAccountMap = accountMap ?? await buildCompanyAccountMap(supabase, userCompany.companyId);
        await generateInvoiceDeferralSchedule(supabase, userCompany.companyId, userCompany.userId, {
          id: result.id,
          invoice_type: body.invoice_type,
          total_amount: body.total_amount,
          deferral_start_date: body.deferral_start_date,
          deferral_end_date: body.deferral_end_date,
          project_id: body.project_id,
          gl_account_id: body.gl_account_id,
        }, defAccountMap);
      } catch (defErr) {
        console.warn("Deferral schedule generation failed:", defErr);
        warnings.push("Deferral schedule generation failed.");
      }
    }

    return NextResponse.json({ id: result.id, warnings }, { status: 201 });
  } catch (error) {
    console.error("POST /api/financial/invoices error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
