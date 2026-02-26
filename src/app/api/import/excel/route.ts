import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import {
  parseXlsxFile,
  mapSheetToEntity,
  sortSheetsByDependency,
} from "@/lib/utils/xlsx-parser";
import {
  generateBulkInvoiceJournalEntries,
  generateBulkPaymentJournalEntries,
  buildCompanyAccountMap,
  inferGLAccountFromDescription,
} from "@/lib/utils/invoice-accounting";
import { ensureBankAccountGLLink, syncBankBalancesFromGL } from "@/lib/utils/bank-gl-linkage";
import { backfillMissingJournalEntries } from "@/lib/utils/backfill-journal-entries";
import { checkSubscriptionAccess } from "@/lib/guards/subscription-guard";

// ---------------------------------------------------------------------------
// POST /api/import/excel — Master Excel template import
// Accepts multipart/form-data with a .xlsx file, parses all sheets,
// imports entities in dependency order, and tracks results.
// ---------------------------------------------------------------------------

export const maxDuration = 60; // Vercel Pro timeout — import can take 30s+ for large files

interface SheetResult {
  sheetName: string;
  entity: string | null;
  rowCount: number;
  successCount: number;
  errorCount: number;
  errors: string[];
  skipped: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const subBlock = await checkSubscriptionAccess(userCtx.companyId, "POST");
    if (subBlock) return subBlock;

    const { companyId, userId } = userCtx;

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file uploaded" },
        { status: 400 }
      );
    }

    if (
      !file.name.endsWith(".xlsx") &&
      !file.name.endsWith(".xls")
    ) {
      return NextResponse.json(
        { error: "Only .xlsx and .xls files are supported" },
        { status: 400 }
      );
    }

    // Read file buffer
    const buffer = await file.arrayBuffer();
    const sheets = parseXlsxFile(buffer);

    if (sheets.length === 0) {
      return NextResponse.json(
        { error: "No valid sheets found in the file" },
        { status: 400 }
      );
    }

    // Create import run record
    const { data: importRun, error: runError } = await supabase
      .from("import_runs")
      .insert({
        company_id: companyId,
        run_type: "excel_master",
        status: "processing",
        total_sheets: sheets.length,
        processed_sheets: 0,
        file_name: file.name,
        started_at: new Date().toISOString(),
        created_by: userId,
      })
      .select("id")
      .single();

    if (runError || !importRun) {
      console.error("Failed to create import run:", runError);
      return NextResponse.json(
        { error: "Failed to initialize import tracking" },
        { status: 500 }
      );
    }

    const runId = importRun.id;

    // Sort sheets by dependency order
    const sortedSheets = sortSheetsByDependency(sheets);

    // Process each sheet
    const results: SheetResult[] = [];
    let totalRows = 0;
    let totalSuccess = 0;
    let totalErrors = 0;

    // Detect which entity types are present to skip redundant sheets
    const presentEntities = new Set(
      sortedSheets.map((s) => mapSheetToEntity(s.name)).filter(Boolean)
    );

    for (let s = 0; s < sortedSheets.length; s++) {
      const sheet = sortedSheets[s];
      const entity = mapSheetToEntity(sheet.name);

      if (!entity) {
        results.push({
          sheetName: sheet.name,
          entity: null,
          rowCount: sheet.rows.length,
          successCount: 0,
          errorCount: 0,
          errors: [],
          skipped: true,
        });
        continue;
      }

      // Skip AR/AP sheets when a full invoices sheet is present (avoids duplicates)
      if (
        (entity === "accounts_receivable" || entity === "accounts_payable") &&
        presentEntities.has("invoices")
      ) {
        results.push({
          sheetName: sheet.name,
          entity,
          rowCount: sheet.rows.length,
          successCount: 0,
          errorCount: 0,
          errors: [],
          skipped: true,
        });
        continue;
      }

      // Skip opening_balances when journal_entries sheet is present
      if (entity === "opening_balances" && presentEntities.has("journal_entries")) {
        results.push({
          sheetName: sheet.name,
          entity,
          rowCount: sheet.rows.length,
          successCount: 0,
          errorCount: 0,
          errors: [],
          skipped: true,
        });
        continue;
      }

      // Skip auto-JE generation for invoices/payments when pre-crafted JEs exist
      const hasJESheet = presentEntities.has("journal_entries") || presentEntities.has("opening_balances");
      const sheetResult = await processEntity(
        supabase,
        companyId,
        userId,
        entity,
        sheet.rows,
        { skipAutoJE: hasJESheet }
      );

      totalRows += sheet.rows.length;
      totalSuccess += sheetResult.successCount;
      totalErrors += sheetResult.errors.length;

      results.push({
        sheetName: sheet.name,
        entity,
        rowCount: sheet.rows.length,
        successCount: sheetResult.successCount,
        errorCount: sheetResult.errors.length,
        errors: sheetResult.errors.slice(0, 20), // Cap error list
        skipped: false,
      });

      // Update import run progress
      await supabase
        .from("import_runs")
        .update({
          processed_sheets: s + 1,
          total_rows: totalRows,
          success_rows: totalSuccess,
          error_rows: totalErrors,
          sheet_results: results,
        })
        .eq("id", runId);

      // Update company import_progress with per-entity counts
      const progressUpdate: Record<string, unknown> = {};
      for (const r of results) {
        if (r.entity && !r.skipped) {
          progressUpdate[r.entity] = {
            count: r.successCount,
            lastImported: new Date().toISOString(),
          };
        }
      }
      await supabase
        .from("companies")
        .update({ import_progress: progressUpdate })
        .eq("id", companyId);
    }

    // ── Post-import: sync bank sub-account balances ──
    // Creates reclassification JEs for bank sub-accounts + OBE adjustment if Cash 1000 goes negative.
    // This must run AFTER all sheets (especially journal_entries) are imported.
    if (presentEntities.has("bank_accounts")) {
      try {
        await syncBankBalancesFromGL(supabase, companyId, userId);
      } catch (syncErr) {
        console.warn("Post-import bank sync failed:", syncErr);
      }
    }

    // ── Post-import: backfill missing JEs for leases, equipment, change orders, etc. ──
    const JE_ENTITIES = ["invoices", "change_orders", "leases", "maintenance", "equipment", "equipment_maintenance"];
    const hasJEEntity = JE_ENTITIES.some((e) => presentEntities.has(e));
    if (hasJEEntity && totalSuccess > 0) {
      try {
        await backfillMissingJournalEntries(supabase, companyId, userId);
      } catch (bfErr) {
        console.warn("Post-import JE backfill failed:", bfErr);
      }
    }

    // Finalize import run
    await supabase
      .from("import_runs")
      .update({
        status: totalErrors > 0 && totalSuccess === 0 ? "failed" : "completed",
        processed_sheets: sortedSheets.length,
        total_rows: totalRows,
        success_rows: totalSuccess,
        error_rows: totalErrors,
        sheet_results: results,
        completed_at: new Date().toISOString(),
      })
      .eq("id", runId);

    return NextResponse.json({
      importRunId: runId,
      totalSheets: sortedSheets.length,
      processedSheets: sortedSheets.length,
      totalRows,
      totalSuccess,
      totalErrors,
      results,
    });
  } catch (err) {
    console.error("POST /api/import/excel error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// Entity processor — mirrors the logic in /api/import/route.ts
// ---------------------------------------------------------------------------

interface ProcessResult {
  successCount: number;
  errors: string[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function processEntity(
  supabase: any,
  companyId: string,
  userId: string,
  entity: string,
  rows: Record<string, string>[],
  options?: { skipAutoJE?: boolean }
): Promise<ProcessResult> {
  let successCount = 0;
  const errors: string[] = [];

  // ---- Project lookup for project-scoped entities ----
  const PROJECT_SCOPED = [
    "daily_logs", "rfis", "change_orders", "contracts", "safety_incidents",
    "toolbox_talks", "equipment_assignments", "time_entries",
    "safety_inspections", "invoices", "submittals", "phases", "tasks",
    "project_budget_lines", "estimates",
  ];
  let projLookup: Record<string, string> = {};
  if (PROJECT_SCOPED.includes(entity)) {
    const { data: companyProjects } = await supabase
      .from("projects")
      .select("id, name, code")
      .eq("company_id", companyId);
    projLookup = (companyProjects || []).reduce(
      (acc: Record<string, string>, p: { id: string; name: string; code?: string }) => {
        acc[p.name.trim().toLowerCase()] = p.id;
        if (p.code) acc[p.code.trim().toLowerCase()] = p.id;
        return acc;
      },
      {} as Record<string, string>
    );
  }

  // ---- User profile lookup for UUID FK fields (assigned_to, reviewer, etc.) ----
  const NEEDS_USER_LOOKUP = [
    "rfis", "submittals", "maintenance", "equipment_assignments",
  ];
  let userNameLookup: Record<string, string> = {};
  if (NEEDS_USER_LOOKUP.includes(entity)) {
    const { data: members } = await supabase
      .from("company_members")
      .select("user_id")
      .eq("company_id", companyId);
    const memberIds = (members || []).map((m: { user_id: string }) => m.user_id);
    if (memberIds.length > 0) {
      const { data: profiles } = await supabase
        .from("user_profiles")
        .select("id, full_name, email")
        .in("id", memberIds);
      for (const p of profiles || []) {
        if ((p as { full_name?: string }).full_name)
          userNameLookup[(p as { full_name: string }).full_name.trim().toLowerCase()] = (p as { id: string }).id;
        if ((p as { email?: string }).email)
          userNameLookup[(p as { email: string }).email.trim().toLowerCase()] = (p as { id: string }).id;
      }
    }
  }

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  function resolveUserRef(nameOrUuid: string | null | undefined): string | null {
    if (!nameOrUuid) return null;
    if (UUID_RE.test(nameOrUuid)) return nameOrUuid;
    return userNameLookup[nameOrUuid.trim().toLowerCase()] || null;
  }

  function resolveProjectId(r: Record<string, string>): string | null {
    if (r.project_id) return r.project_id;
    if (r.project_name) {
      const found = projLookup[r.project_name.trim().toLowerCase()];
      if (found) return found;
    }
    if (r.project_code) {
      const found = projLookup[r.project_code.trim().toLowerCase()];
      if (found) return found;
    }
    return null;
  }

  // ── Batch insert helper: try batch first, fall back to chunked/individual ──
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function batchInsert(table: string, batch: Record<string, any>[], needIds = false): Promise<{ ids: string[]; successCount: number }> {
    if (batch.length === 0) return { ids: [], successCount: 0 };
    let sc = 0;
    const ids: string[] = [];
    for (let c = 0; c < batch.length; c += 500) {
      const chunk = batch.slice(c, c + 500);
      const q = supabase.from(table).insert(chunk);
      const res = needIds ? await q.select("id") : await q;
      if (res.error) {
        for (let j = 0; j < chunk.length; j++) {
          const q2 = supabase.from(table).insert(chunk[j]);
          const r2 = needIds ? await q2.select("id").single() : await q2;
          if (r2.error) errors.push(`Row ${c + j + 2}: ${r2.error.message}`);
          else { sc++; if (needIds && r2.data) ids.push((r2.data as { id: string }).id); }
        }
      } else {
        sc += chunk.length;
        if (needIds && res.data) ids.push(...(res.data as { id: string }[]).map(d => d.id));
      }
    }
    return { ids, successCount: sc };
  }

  switch (entity) {
    case "chart_of_accounts": {
      const batch = rows.map(r => ({
        company_id: companyId,
        account_number: r.account_number || "",
        name: r.name || "",
        account_type: r.account_type || "expense",
        sub_type: r.sub_type || null,
        description: r.description || null,
        is_active: true,
      }));
      const res = await batchInsert("chart_of_accounts", batch);
      successCount += res.successCount;
      break;
    }

    case "bank_accounts": {
      const batch = rows.map(r => ({
        company_id: companyId,
        name: r.name || "",
        bank_name: r.bank_name || "",
        account_type: r.account_type || "checking",
        account_number_last4: r.account_number_last4 || "",
        routing_number_last4: r.routing_number_last4 || "",
        current_balance: r.current_balance ? parseFloat(r.current_balance) : 0,
      }));
      const res = await batchInsert("bank_accounts", batch, true);
      successCount += res.successCount;
      // Create GL sub-account linkages in parallel
      if (res.ids.length > 0) {
        await Promise.all(res.ids.map((id, i) =>
          ensureBankAccountGLLink(
            supabase, companyId, id,
            rows[i]?.name || "", rows[i]?.account_type || "checking"
          ).catch(err => console.warn(`Bank GL link failed:`, err))
        ));
      }
      break;
    }

    case "projects": {
      const batch = rows.map(r => ({
        company_id: companyId,
        name: r.name || "",
        code: r.code || null,
        status: r.status || "pre_construction",
        project_type: r.project_type || null,
        description: r.description || null,
        address_line1: r.address_line1 || r.address || null,
        city: r.city || null,
        state: r.state || null,
        zip: r.zip || null,
        client_name: r.client_name || r.client || null,
        client_contact: r.client_contact || null,
        client_email: r.client_email || null,
        client_phone: r.client_phone || null,
        contract_amount: r.contract_amount || r.budget
          ? parseFloat(r.contract_amount || r.budget)
          : null,
        estimated_cost: r.estimated_cost ? parseFloat(r.estimated_cost) : null,
        actual_cost: r.actual_cost ? parseFloat(r.actual_cost) : null,
        start_date: r.start_date || null,
        estimated_end_date: r.estimated_end_date || r.end_date || null,
        actual_end_date: r.actual_end_date || null,
        completion_pct: r.completion_pct ? parseFloat(r.completion_pct) : 0,
      }));
      const res = await batchInsert("projects", batch);
      successCount += res.successCount;
      break;
    }

    case "contacts": {
      const batch = rows.map(r => ({
        company_id: companyId,
        contact_type: r.contact_type || "subcontractor",
        first_name: r.first_name || "",
        last_name: r.last_name || "",
        company_name: r.company_name || "",
        job_title: r.job_title || "",
        email: r.email || "",
        phone: r.phone || "",
      }));
      const res = await batchInsert("contacts", batch);
      successCount += res.successCount;
      break;
    }

    case "vendors": {
      const batch = rows.map(r => ({
        company_id: companyId,
        contact_type: "vendor",
        first_name: r.first_name || "",
        last_name: r.last_name || "",
        company_name: r.company_name || "",
        job_title: r.job_title || "",
        email: r.email || "",
        phone: r.phone || "",
      }));
      const res = await batchInsert("contacts", batch);
      successCount += res.successCount;
      break;
    }

    case "equipment": {
      const batch = rows.map(r => ({
        company_id: companyId,
        name: r.name || "",
        equipment_type: r.equipment_type || "",
        make: r.make || "",
        model: r.model || "",
        serial_number: r.serial_number || "",
        status: r.status || "available",
        purchase_cost: parseFloat(r.purchase_cost) || 0,
        hourly_rate: parseFloat(r.hourly_rate) || 0,
        purchase_date: r.purchase_date || null,
        last_maintenance_date: r.last_maintenance_date || null,
        next_maintenance_date: r.next_maintenance_date || null,
      }));
      const res = await batchInsert("equipment", batch);
      successCount += res.successCount;
      break;
    }

    case "invoices": {
      const accountMap = await buildCompanyAccountMap(supabase, companyId);

      // Pre-fetch properties to resolve property_name to property_id
      const { data: invProps } = await supabase
        .from("properties")
        .select("id, name")
        .eq("company_id", companyId);
      const invPropLookup = (invProps || []).reduce((acc: Record<string, string>, p: { id: string; name: string }) => {
        acc[p.name.trim().toLowerCase()] = p.id;
        return acc;
      }, {} as Record<string, string>);

      // Build all invoice insert objects in memory (no DB calls in this loop)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const invInsertBatch: Record<string, any>[] = [];
      const invMeta: Array<{
        idx: number; invoiceNumber: string; invoiceType: "payable" | "receivable";
        totalAmount: number; subtotal: number; taxAmount: number; invoiceDate: string;
        status: string; projectId: string | null; propertyId: string | null;
        vendorName: string | null; clientName: string | null;
        glAccountId: string | null; retainagePct: number; retainageHeld: number;
        dueDate: string;
      }> = [];

      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const invoiceNumber = r.invoice_number || `INV-${String(i + 1).padStart(4, "0")}`;
        const invoiceDate = r.invoice_date || new Date().toISOString().split("T")[0];
        const projectId = resolveProjectId(r);
        const invoiceType = (r.invoice_type || "receivable") as "payable" | "receivable";
        const subtotal = r.amount ? parseFloat(r.amount) : 0;
        const taxAmount = r.tax_amount ? parseFloat(r.tax_amount) : 0;
        const totalAmount = subtotal + taxAmount;
        const status = r.status || "draft";

        let glAccountId: string | null = null;
        if (r.gl_account) glAccountId = accountMap.byNumber[r.gl_account] || null;
        if (!glAccountId) {
          const inferred = inferGLAccountFromDescription(r.description || "", invoiceType, r.vendor_name);
          if (inferred) glAccountId = accountMap.byNumber[inferred] || null;
        }

        const retainagePct = r.retainage_pct ? parseFloat(r.retainage_pct) : 0;
        const retainageHeld = r.retainage_held
          ? parseFloat(r.retainage_held)
          : retainagePct > 0 ? totalAmount * (retainagePct / 100) : 0;
        const isPaid = status === "paid";
        const amountPaid = isPaid ? totalAmount - retainageHeld : 0;

        let propertyId: string | null = null;
        if (r.property_name) propertyId = invPropLookup[r.property_name.trim().toLowerCase()] || null;

        invInsertBatch.push({
          company_id: companyId, invoice_number: invoiceNumber, invoice_date: invoiceDate,
          project_id: projectId, property_id: propertyId, invoice_type: invoiceType,
          vendor_name: r.vendor_name || null, client_name: r.client_name || null,
          subtotal, total_amount: totalAmount, tax_amount: taxAmount,
          due_date: r.due_date || null, notes: r.description || null, status,
          amount_paid: amountPaid, gl_account_id: glAccountId,
          retainage_pct: retainagePct, retainage_held: retainageHeld,
        });
        invMeta.push({
          idx: i, invoiceNumber, invoiceType, totalAmount, subtotal, taxAmount,
          invoiceDate, status, projectId, propertyId,
          vendorName: r.vendor_name || null, clientName: r.client_name || null,
          glAccountId, retainagePct, retainageHeld,
          dueDate: r.due_date || invoiceDate,
        });
      }

      // Batch insert all invoices at once
      const invRes = await batchInsert("invoices", invInsertBatch, true);
      successCount += invRes.successCount;

      // Map inserted IDs to invoice metadata for JE generation
      const insertedInvoices: Array<{
        id: string; invoice_number: string; invoice_type: "payable" | "receivable";
        total_amount: number; subtotal: number; tax_amount: number;
        invoice_date: string; status?: string; project_id?: string | null;
        property_id?: string | null; vendor_name?: string | null; client_name?: string | null;
        gl_account_id?: string | null; retainage_pct?: number; retainage_held?: number;
      }> = [];
      const paidInvoiceMeta: Array<{
        invoiceId: string; invoice_number: string; invoice_type: "payable" | "receivable";
        total_amount: number; retainage_held: number; due_date: string;
        project_id?: string | null; vendor_name?: string | null; client_name?: string | null;
      }> = [];

      for (let i = 0; i < invRes.ids.length && i < invMeta.length; i++) {
        const m = invMeta[i];
        const id = invRes.ids[i];
        insertedInvoices.push({
          id, invoice_number: m.invoiceNumber, invoice_type: m.invoiceType,
          total_amount: m.totalAmount, subtotal: m.subtotal, tax_amount: m.taxAmount,
          invoice_date: m.invoiceDate, status: m.status, project_id: m.projectId,
          property_id: m.propertyId, vendor_name: m.vendorName, client_name: m.clientName,
          gl_account_id: m.glAccountId, retainage_pct: m.retainagePct, retainage_held: m.retainageHeld,
        });
        if (m.status === "paid") {
          paidInvoiceMeta.push({
            invoiceId: id, invoice_number: m.invoiceNumber, invoice_type: m.invoiceType,
            total_amount: m.totalAmount, retainage_held: m.retainageHeld, due_date: m.dueDate,
            project_id: m.projectId, vendor_name: m.vendorName, client_name: m.clientName,
          });
        }
      }

      // Bulk JE generation (now truly bulk — 2 DB calls total)
      if (insertedInvoices.length > 0) {
        try {
          await generateBulkInvoiceJournalEntries(supabase, companyId, userId, insertedInvoices);
        } catch (jeErr) { console.warn("Bulk JE generation failed:", jeErr); }
      }

      // Batch insert payment records for paid invoices
      if (paidInvoiceMeta.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pmtBatch: Record<string, any>[] = [];
        const pmtInvoiceMap: Array<{
          invoiceId: string; invoice_number: string; invoice_type: "payable" | "receivable";
          project_id?: string | null; property_id?: string | null;
          vendor_name?: string | null; client_name?: string | null;
          paymentAmount: number; dueDate: string;
        }> = [];
        for (const pi of paidInvoiceMeta) {
          const paymentAmount = pi.total_amount - (pi.retainage_held ?? 0);
          if (paymentAmount <= 0) continue;
          pmtBatch.push({
            company_id: companyId, invoice_id: pi.invoiceId,
            payment_date: pi.due_date, amount: paymentAmount,
            method: "imported", notes: "Auto-generated from paid invoice import",
          });
          const invMatch = insertedInvoices.find(inv => inv.id === pi.invoiceId);
          pmtInvoiceMap.push({
            invoiceId: pi.invoiceId, invoice_number: pi.invoice_number,
            invoice_type: pi.invoice_type, project_id: pi.project_id,
            property_id: invMatch?.property_id ?? null,
            vendor_name: pi.vendor_name, client_name: pi.client_name,
            paymentAmount, dueDate: pi.due_date,
          });
        }

        const pmtRes = await batchInsert("payments", pmtBatch, true);

        // Bulk payment JE generation
        if (pmtRes.ids.length > 0) {
          const paymentRecords = pmtRes.ids.map((pmtId, i) => ({
            paymentId: pmtId,
            amount: pmtInvoiceMap[i].paymentAmount,
            payment_date: pmtInvoiceMap[i].dueDate,
            method: "imported",
            invoice: {
              id: pmtInvoiceMap[i].invoiceId,
              invoice_number: pmtInvoiceMap[i].invoice_number,
              invoice_type: pmtInvoiceMap[i].invoice_type,
              project_id: pmtInvoiceMap[i].project_id,
              property_id: pmtInvoiceMap[i].property_id,
              vendor_name: pmtInvoiceMap[i].vendor_name,
              client_name: pmtInvoiceMap[i].client_name,
            },
          }));
          try {
            await generateBulkPaymentJournalEntries(supabase, companyId, userId, paymentRecords);
          } catch (pmtJeErr) { console.warn("Bulk payment JE generation failed:", pmtJeErr); }
        }

        // Bank balance sync (single DB call)
        try {
          const { data: defaultBank } = await supabase
            .from("bank_accounts")
            .select("id, current_balance")
            .eq("company_id", companyId)
            .eq("is_default", true)
            .single();
          if (defaultBank) {
            let cashAdjustment = 0;
            for (const pi of paidInvoiceMeta) {
              cashAdjustment += pi.invoice_type === "payable" ? -pi.total_amount : pi.total_amount;
            }
            await supabase.from("bank_accounts")
              .update({ current_balance: defaultBank.current_balance + cashAdjustment })
              .eq("id", defaultBank.id);
          }
        } catch (bankErr) { console.warn("Bank balance sync failed:", bankErr); }
      }
      break;
    }

    case "time_entries": {
      const batch = rows.map(r => ({
        company_id: companyId,
        project_id: resolveProjectId(r),
        user_id: r.user_id || userId,
        entry_date: r.entry_date || new Date().toISOString().split("T")[0],
        hours: r.hours ? parseFloat(r.hours) : 0,
        notes: r.description || r.notes || null,
        cost_code: r.cost_code || null,
        status: r.status || "pending",
      }));
      const res = await batchInsert("time_entries", batch);
      successCount += res.successCount;
      break;
    }

    case "change_orders": {
      const batch = rows.map((r, i) => ({
        company_id: companyId,
        project_id: resolveProjectId(r),
        co_number: r.co_number || `CO-${String(i + 1).padStart(3, "0")}`,
        title: r.title || "",
        description: r.description || null,
        reason: r.reason || null,
        status: r.status || "draft",
        amount: r.amount ? parseFloat(r.amount) : 0,
        schedule_impact_days: r.schedule_impact_days ? parseInt(r.schedule_impact_days) : 0,
        requested_by: userId,
      }));
      const res = await batchInsert("change_orders", batch);
      successCount += res.successCount;
      break;
    }

    case "tasks": {
      // Per-project phase lookups and sort counters
      const taskPhaseLookup: Record<string, Record<string, string>> = {};
      const taskSortMap: Record<string, number> = {};
      const taskPhaseSortMap: Record<string, number> = {};
      const validPriorities = ["low", "medium", "high", "critical"];

      async function getPhaseLookup(pid: string) {
        if (!taskPhaseLookup[pid]) {
          const { data } = await supabase
            .from("project_phases")
            .select("id, name")
            .eq("project_id", pid)
            .eq("company_id", companyId);
          taskPhaseLookup[pid] = (data || []).reduce(
            (acc: Record<string, string>, p: { id: string; name: string }) => {
              acc[p.name.trim().toLowerCase()] = p.id;
              return acc;
            },
            {} as Record<string, string>
          );
        }
        return taskPhaseLookup[pid];
      }

      async function getTaskSort(pid: string) {
        if (taskSortMap[pid] === undefined) {
          const { data } = await supabase
            .from("project_tasks")
            .select("sort_order")
            .eq("project_id", pid)
            .order("sort_order", { ascending: false })
            .limit(1);
          taskSortMap[pid] = (data?.[0]?.sort_order ?? -1) + 1;
        }
        return taskSortMap[pid]++;
      }

      async function getPhaseSort(pid: string) {
        if (taskPhaseSortMap[pid] === undefined) {
          const { data } = await supabase
            .from("project_phases")
            .select("sort_order")
            .eq("project_id", pid)
            .order("sort_order", { ascending: false })
            .limit(1);
          taskPhaseSortMap[pid] = (data?.[0]?.sort_order ?? -1) + 1;
        }
        return taskPhaseSortMap[pid]++;
      }

      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const pid = resolveProjectId(r);
        if (!pid) {
          errors.push(`Row ${i + 2}: could not resolve project`);
          continue;
        }
        if (!r.name) {
          errors.push(`Row ${i + 2}: name is required`);
          continue;
        }
        const phases = await getPhaseLookup(pid);
        let phaseId = r.phase_id || null;
        if (!phaseId && r.phase_name) {
          phaseId = phases[r.phase_name.trim().toLowerCase()] || null;
          if (!phaseId) {
            const { data: newPhase } = await supabase
              .from("project_phases")
              .insert({
                company_id: companyId,
                project_id: pid,
                name: r.phase_name.trim(),
                sort_order: await getPhaseSort(pid),
              })
              .select("id")
              .single();
            if (newPhase) {
              phaseId = newPhase.id;
              phases[r.phase_name.trim().toLowerCase()] = newPhase.id;
            }
          }
        }
        const priority =
          r.priority && validPriorities.includes(r.priority.toLowerCase())
            ? r.priority.toLowerCase()
            : "medium";
        const { error } = await supabase.from("project_tasks").insert({
          company_id: companyId,
          project_id: pid,
          phase_id: phaseId,
          name: r.name.trim(),
          status: r.status || "not_started",
          priority,
          start_date: r.start_date || null,
          end_date: r.end_date || null,
          completion_pct: r.completion_pct ? parseFloat(r.completion_pct) : 0,
          is_milestone:
            r.is_milestone === "true" ||
            r.is_milestone === "1" ||
            r.is_milestone === "yes",
          is_critical_path:
            r.is_critical_path === "true" ||
            r.is_critical_path === "1" ||
            r.is_critical_path === "yes",
          sort_order: await getTaskSort(pid),
        });
        if (error) errors.push(`Row ${i + 2}: ${error.message}`);
        else successCount++;
      }
      break;
    }

    case "project_budget_lines": {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const batch: Record<string, any>[] = [];
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const pid = resolveProjectId(r);
        if (!pid) { errors.push(`Row ${i + 2}: could not resolve project`); continue; }
        batch.push({
          company_id: companyId, project_id: pid,
          csi_code: r.csi_code || "", description: r.description || "",
          budgeted_amount: parseFloat(r.budgeted_amount) || 0,
          committed_amount: parseFloat(r.committed_amount) || 0,
          actual_amount: parseFloat(r.actual_amount) || 0,
        });
      }
      const res = await batchInsert("project_budget_lines", batch);
      successCount += res.successCount;
      break;
    }

    case "daily_logs": {
      const batch = rows.map(r => ({
        company_id: companyId,
        project_id: resolveProjectId(r),
        log_date: r.log_date || new Date().toISOString().split("T")[0],
        status: r.status || "draft",
        weather_conditions: r.weather_conditions || null,
        weather_temp_high: r.temperature ? parseFloat(r.temperature) : null,
        work_performed: r.work_performed || null,
        safety_incidents: r.safety_incidents || null,
        delays: r.delays || null,
        created_by: userId,
      }));
      const res = await batchInsert("daily_logs", batch);
      successCount += res.successCount;
      break;
    }

    case "rfis": {
      const batch = rows.map((r, i) => ({
        company_id: companyId,
        project_id: resolveProjectId(r),
        rfi_number: r.rfi_number || `RFI-${String(i + 1).padStart(3, "0")}`,
        subject: r.subject || "",
        question: r.question || "",
        answer: r.answer || null,
        priority: r.priority || "medium",
        status: r.status || "submitted",
        due_date: r.due_date || null,
        submitted_by: userId,
        assigned_to: resolveUserRef(r.assigned_to) || userId,
        cost_impact: r.cost_impact ? parseFloat(r.cost_impact) : null,
        schedule_impact_days: r.schedule_impact_days ? parseInt(r.schedule_impact_days) : null,
      }));
      const res = await batchInsert("rfis", batch);
      successCount += res.successCount;
      break;
    }

    case "contracts": {
      const batch = rows.map((r, i) => ({
        company_id: companyId,
        contract_number: r.contract_number || `CON-${String(i + 1).padStart(3, "0")}`,
        title: r.title || "",
        contract_type: r.contract_type || "subcontractor",
        party_name: r.party_name || null,
        party_email: r.party_email || null,
        contract_amount: r.contract_amount ? parseFloat(r.contract_amount) : null,
        start_date: r.start_date || null,
        end_date: r.end_date || null,
        payment_terms: r.payment_terms || null,
        scope_of_work: r.scope_of_work || null,
        project_id: resolveProjectId(r),
        status: r.status || "draft",
        created_by: userId,
      }));
      const res = await batchInsert("contracts", batch);
      successCount += res.successCount;
      break;
    }

    case "properties": {
      const batch = rows.map(r => ({
        company_id: companyId,
        name: r.name || "",
        property_type: r.property_type || "residential",
        address_line1: r.address_line1 || r.address || "",
        city: r.city || "",
        state: r.state || "",
        zip: r.zip || "",
        year_built: r.year_built ? parseInt(r.year_built) : null,
        total_sqft: r.total_sqft ? parseInt(r.total_sqft) : null,
        total_units: r.total_units ? parseInt(r.total_units) : 0,
        occupied_units: 0,
        purchase_price: r.purchase_price ? parseFloat(r.purchase_price) : null,
        current_value: r.current_value ? parseFloat(r.current_value) : null,
        monthly_revenue: 0,
        monthly_expenses: 0,
      }));
      const res = await batchInsert("properties", batch);
      successCount += res.successCount;
      break;
    }

    case "units": {
      // Pre-fetch properties to resolve property_name to property_id
      const { data: unitProps } = await supabase
        .from("properties")
        .select("id, name")
        .eq("company_id", companyId);
      const unitPropLookup = (unitProps || []).reduce((acc: Record<string, string>, p: { id: string; name: string }) => {
        acc[p.name.trim().toLowerCase()] = p.id;
        return acc;
      }, {} as Record<string, string>);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const unitBatch: Record<string, any>[] = [];
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        let propertyId = r.property_id || null;
        if (!propertyId && r.property_name) {
          propertyId = unitPropLookup[r.property_name.trim().toLowerCase()] || null;
        }
        if (!propertyId) { errors.push(`Row ${i + 2}: Property "${r.property_name || ""}" not found.`); continue; }
        if (!r.unit_number) { errors.push(`Row ${i + 2}: Unit number is required.`); continue; }
        unitBatch.push({
          company_id: companyId, property_id: propertyId,
          unit_number: r.unit_number.trim(), unit_type: r.unit_type || "1br",
          sqft: r.sqft ? parseInt(r.sqft) : null,
          bedrooms: r.bedrooms ? parseInt(r.bedrooms) : null,
          bathrooms: r.bathrooms ? parseInt(r.bathrooms) : null,
          floor_number: r.floor_number ? parseInt(r.floor_number) : null,
          market_rent: r.market_rent ? parseFloat(r.market_rent) : null,
          status: r.status || "vacant",
        });
      }
      const unitRes = await batchInsert("units", unitBatch);
      successCount += unitRes.successCount;

      // Update total_units on affected properties (batch the count queries)
      if (unitProps && unitProps.length > 0) {
        await Promise.all(unitProps.map(async (prop: { id: string; name: string }) => {
          const { count } = await supabase
            .from("units")
            .select("id", { count: "exact", head: true })
            .eq("company_id", companyId)
            .eq("property_id", prop.id);
          if (count !== null) {
            await supabase.from("properties").update({ total_units: count }).eq("id", prop.id);
          }
        }));
      }
      break;
    }

    case "phases": {
      // Track sort_order per project
      const phaseSortMap: Record<string, number> = {};

      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const pid = resolveProjectId(r);
        if (!pid) {
          errors.push(`Row ${i + 2}: could not resolve project`);
          continue;
        }
        if (!r.name) {
          errors.push(`Row ${i + 2}: name is required`);
          continue;
        }
        if (phaseSortMap[pid] === undefined) {
          const { data: ex } = await supabase
            .from("project_phases")
            .select("sort_order")
            .eq("project_id", pid)
            .order("sort_order", { ascending: false })
            .limit(1);
          phaseSortMap[pid] = (ex?.[0]?.sort_order ?? -1) + 1;
        }
        const { error } = await supabase.from("project_phases").insert({
          company_id: companyId,
          project_id: pid,
          name: r.name.trim(),
          color: r.color || null,
          start_date: r.start_date || null,
          end_date: r.end_date || null,
          sort_order: phaseSortMap[pid]++,
        });
        if (error) errors.push(`Row ${i + 2}: ${error.message}`);
        else successCount++;
      }
      break;
    }

    case "certifications": {
      const { data: companyContacts } = await supabase
        .from("contacts")
        .select("id, first_name, last_name")
        .eq("company_id", companyId);
      const contactLookup = (companyContacts || []).reduce(
        (acc: Record<string, string>, c: { id: string; first_name: string; last_name: string }) => {
          const full = `${c.first_name} ${c.last_name}`.trim().toLowerCase();
          acc[full] = c.id;
          if (c.last_name) acc[c.last_name.toLowerCase()] = c.id;
          return acc;
        },
        {} as Record<string, string>
      );
      const batch = rows.map(r => {
        let contactId = r.contact_id || null;
        if (!contactId && r.contact_name) contactId = contactLookup[r.contact_name.trim().toLowerCase()] || null;
        if (!contactId) contactId = companyContacts?.[0]?.id || null;
        return {
          company_id: companyId, contact_id: contactId,
          cert_name: r.cert_name || "", cert_type: r.cert_type || "certification",
          issuing_authority: r.issuing_authority || null, cert_number: r.cert_number || null,
          issued_date: r.issued_date || null, expiry_date: r.expiry_date || null,
          status: r.status || "active",
        };
      });
      const res = await batchInsert("certifications", batch);
      successCount += res.successCount;
      break;
    }

    case "opportunities": {
      const batch = rows.map(r => ({
        company_id: companyId,
        name: r.name || "",
        client_name: r.client_name || null,
        stage: r.stage || "lead",
        estimated_value: r.estimated_value ? parseFloat(r.estimated_value) : null,
        probability_pct: r.probability_pct ? parseInt(r.probability_pct) : null,
        expected_close_date: r.expected_close_date || null,
        source: r.source || null,
        notes: r.notes || null,
        assigned_to: userId,
      }));
      const res = await batchInsert("opportunities", batch);
      successCount += res.successCount;
      break;
    }

    case "bids": {
      const batch = rows.map((r, i) => ({
        company_id: companyId,
        bid_number: r.bid_number || `BID-${String(i + 1).padStart(3, "0")}`,
        project_name: r.project_name || r.name || "",
        client_name: r.client_name || null,
        bid_amount: r.bid_amount ? parseFloat(r.bid_amount) : null,
        due_date: r.due_date || null,
        status: r.status || "draft",
        scope_description: r.notes || null,
        submitted_by: userId,
      }));
      const res = await batchInsert("bids", batch);
      successCount += res.successCount;
      break;
    }

    case "safety_incidents": {
      const batch = rows.map((r, i) => ({
        company_id: companyId,
        incident_number: r.incident_number || `INC-${String(i + 1).padStart(3, "0")}`,
        title: r.title || "",
        description: r.description || null,
        incident_type: r.incident_type || "near_miss",
        severity: r.severity || "medium",
        project_id: resolveProjectId(r),
        incident_date: r.incident_date || new Date().toISOString().split("T")[0],
        location: r.location || null,
        osha_recordable: r.osha_recordable === "true" || r.osha_recordable === "yes",
        status: r.status || "reported",
        reported_by: userId,
      }));
      const res = await batchInsert("safety_incidents", batch);
      successCount += res.successCount;
      break;
    }

    case "safety_inspections": {
      const batch = rows.map(r => ({
        company_id: companyId,
        project_id: resolveProjectId(r),
        inspection_type: r.inspection_type || "site_safety",
        inspection_date: r.inspection_date || new Date().toISOString().split("T")[0],
        score: r.score ? parseInt(r.score) : null,
        findings: r.findings || null,
        corrective_actions: r.corrective_actions || null,
        status: r.status || "scheduled",
        inspector_id: userId,
      }));
      const res = await batchInsert("safety_inspections", batch);
      successCount += res.successCount;
      break;
    }

    case "toolbox_talks": {
      const batch = rows.map((r, i) => ({
        company_id: companyId,
        talk_number: r.talk_number || `TBT-${String(i + 1).padStart(3, "0")}`,
        title: r.title || "",
        description: r.description || null,
        topic: r.topic || null,
        conducted_date: r.scheduled_date || r.conducted_date || new Date().toISOString().split("T")[0],
        project_id: resolveProjectId(r),
        attendee_count: r.attendees_count ? parseInt(r.attendees_count) : null,
        notes: r.notes || null,
        status: r.status || "scheduled",
        conducted_by: userId,
      }));
      const res = await batchInsert("toolbox_talks", batch);
      successCount += res.successCount;
      break;
    }

    case "equipment_assignments": {
      const { data: assignEquip } = await supabase
        .from("equipment")
        .select("id, name")
        .eq("company_id", companyId);
      const assignEquipLookup = (assignEquip || []).reduce(
        (acc: Record<string, string>, e: { id: string; name: string }) => {
          acc[e.name.trim().toLowerCase()] = e.id;
          return acc;
        },
        {} as Record<string, string>
      );

      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        let equipId = r.equipment_id || null;
        if (!equipId && r.equipment_name) {
          equipId = assignEquipLookup[r.equipment_name.trim().toLowerCase()] || null;
          if (!equipId) {
            errors.push(`Row ${i + 2}: Could not find equipment "${r.equipment_name}"`);
            continue;
          }
        }
        const assignStatus = r.status || "active";
        const projId = resolveProjectId(r);
        // Try to resolve assigned_to: UUID > user profile name lookup > store name in notes
        const resolvedAssignee = resolveUserRef(r.assigned_to);
        const assignedToName = (!resolvedAssignee && r.assigned_to) ? r.assigned_to : null;
        const notesVal = [r.notes, assignedToName ? `Assigned to: ${assignedToName}` : null].filter(Boolean).join("; ");
        const { error } = await supabase.from("equipment_assignments").insert({
          company_id: companyId,
          equipment_id: equipId,
          project_id: projId,
          assigned_to: resolvedAssignee || userId,
          assigned_date: r.assigned_date || new Date().toISOString().split("T")[0],
          returned_date: r.return_date || null,
          notes: notesVal || null,
          status: assignStatus,
        });
        if (error) errors.push(`Row ${i + 2}: ${error.message}`);
        else {
          successCount++;
          if (equipId) {
            await supabase.from("equipment").update({
              status: assignStatus === "active" ? "in_use" : "available",
              current_project_id: assignStatus === "active" ? projId : null,
              assigned_to: resolvedAssignee || userId,
            }).eq("id", equipId);
          }
        }
      }
      break;
    }

    case "equipment_maintenance": {
      const { data: companyEquipment } = await supabase
        .from("equipment")
        .select("id, name")
        .eq("company_id", companyId);
      const equipLookup = (companyEquipment || []).reduce(
        (acc: Record<string, string>, e: { id: string; name: string }) => {
          acc[e.name.trim().toLowerCase()] = e.id;
          return acc;
        },
        {} as Record<string, string>
      );

      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        let equipId = r.equipment_id || null;
        if (!equipId && r.equipment_name) {
          equipId = equipLookup[r.equipment_name.trim().toLowerCase()] || null;
          if (!equipId) {
            errors.push(`Row ${i + 2}: Could not find equipment "${r.equipment_name}"`);
            continue;
          }
        }
        const { error } = await supabase
          .from("equipment_maintenance_logs")
          .insert({
            company_id: companyId,
            equipment_id: equipId,
            maintenance_type: r.maintenance_type || "preventive",
            title: r.title || "",
            description: r.description || null,
            maintenance_date: r.maintenance_date || new Date().toISOString().split("T")[0],
            cost: r.cost ? parseFloat(r.cost) : null,
            performed_by: r.performed_by || null,
            vendor_name: r.vendor_name || null,
            status: r.status || "completed",
            next_due_date: r.next_due_date || null,
          });
        if (error) errors.push(`Row ${i + 2}: ${error.message}`);
        else {
          successCount++;
          // Backfill equipment.last_maintenance_date and next_maintenance_date
          if (equipId) {
            const updates: Record<string, string> = {};
            if (r.maintenance_date) updates.last_maintenance_date = r.maintenance_date;
            if (r.next_due_date) updates.next_maintenance_date = r.next_due_date;
            if (Object.keys(updates).length > 0) {
              await supabase.from("equipment").update(updates).eq("id", equipId);
            }
          }
        }
      }
      break;
    }

    case "leases": {
      const { data: leaseProps } = await supabase
        .from("properties")
        .select("id, name")
        .eq("company_id", companyId);
      const leasePropLookup = (leaseProps || []).reduce(
        (acc: Record<string, string>, p: { id: string; name: string }) => {
          acc[p.name.trim().toLowerCase()] = p.id;
          return acc;
        },
        {} as Record<string, string>
      );

      // Pre-fetch existing units to resolve unit_id without N+1
      const { data: existingUnits } = await supabase
        .from("units")
        .select("id, property_id")
        .eq("company_id", companyId);
      const unitCountByProp: Record<string, number> = {};
      for (const u of existingUnits ?? []) {
        unitCountByProp[u.property_id] = (unitCountByProp[u.property_id] || 0) + 1;
      }

      // Build units that need to be created and lease inserts
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const unitsToCreate: Record<string, any>[] = [];
      const leaseRows: Array<{ rowIdx: number; propertyId: string; unitIdx: number | null; existingUnitId: string | null; row: Record<string, string> }> = [];

      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        let propertyId = r.property_id || null;
        if (!propertyId && r.property_name) propertyId = leasePropLookup[r.property_name.trim().toLowerCase()] || null;
        if (!propertyId && leaseProps && leaseProps.length > 0) propertyId = leaseProps[0].id;
        if (!propertyId) { errors.push(`Row ${i + 2}: No property found. Create a property first.`); continue; }

        if (r.unit_id) {
          leaseRows.push({ rowIdx: i, propertyId, unitIdx: null, existingUnitId: r.unit_id, row: r });
        } else {
          const unitNum = (unitCountByProp[propertyId] || 0) + 1;
          unitCountByProp[propertyId] = unitNum;
          const unitIdx = unitsToCreate.length;
          unitsToCreate.push({
            company_id: companyId, property_id: propertyId,
            unit_number: r.unit_number || `Unit ${unitNum}`,
            unit_type: r.unit_type || "office", status: "occupied",
            market_rent: r.monthly_rent ? parseFloat(r.monthly_rent) : null,
          });
          leaseRows.push({ rowIdx: i, propertyId, unitIdx, existingUnitId: null, row: r });
        }
      }

      // Batch create all needed units
      const unitRes = await batchInsert("units", unitsToCreate, true);

      // Build lease batch with resolved unit IDs
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const leaseBatch: Record<string, any>[] = [];
      for (const lr of leaseRows) {
        let unitId = lr.existingUnitId;
        if (unitId === null && lr.unitIdx !== null && lr.unitIdx < unitRes.ids.length) {
          unitId = unitRes.ids[lr.unitIdx];
        }
        if (!unitId) { errors.push(`Row ${lr.rowIdx + 2}: Failed to create unit`); continue; }
        leaseBatch.push({
          company_id: companyId, property_id: lr.propertyId, unit_id: unitId,
          tenant_name: lr.row.tenant_name || "",
          tenant_email: lr.row.tenant_email || null,
          tenant_phone: lr.row.tenant_phone || null,
          monthly_rent: lr.row.monthly_rent ? parseFloat(lr.row.monthly_rent) : 0,
          security_deposit: lr.row.security_deposit ? parseFloat(lr.row.security_deposit) : 0,
          lease_start: lr.row.lease_start || null,
          lease_end: lr.row.lease_end || null,
          status: lr.row.status || "active",
        });
      }
      const leaseRes = await batchInsert("leases", leaseBatch);
      successCount += leaseRes.successCount;

      // Recalculate property stats (occupancy, revenue, NOI)
      if (leaseProps && leaseProps.length > 0) {
        await Promise.all(leaseProps.map(async (prop: { id: string; name: string }) => {
          const [propRes, unitsRes, leasesRes] = await Promise.all([
            supabase.from("properties").select("total_units").eq("id", prop.id).single(),
            supabase.from("units").select("id, status").eq("company_id", companyId).eq("property_id", prop.id),
            supabase.from("leases").select("monthly_rent").eq("company_id", companyId).eq("property_id", prop.id).eq("status", "active"),
          ]);
          const storedTotal = propRes.data?.total_units ?? 0;
          const units = unitsRes.data ?? [];
          const activeLeases = leasesRes.data ?? [];
          const occupiedCount = units.filter((u: { status: string }) => u.status === "occupied").length;
          const monthlyRevenue = activeLeases.reduce((sum: number, l: { monthly_rent: number | null }) => sum + (l.monthly_rent ?? 0), 0);
          const totalUnits = Math.max(units.length, storedTotal);
          const occupancyRate = totalUnits > 0 ? (occupiedCount / totalUnits) * 100 : 0;
          await supabase.from("properties").update({
            total_units: totalUnits, occupied_units: occupiedCount,
            occupancy_rate: occupancyRate, monthly_revenue: monthlyRevenue, noi: monthlyRevenue,
          }).eq("id", prop.id);
        }));
      }
      break;
    }

    case "maintenance": {
      const { data: maintProps } = await supabase
        .from("properties")
        .select("id, name")
        .eq("company_id", companyId);
      const maintPropLookup = (maintProps || []).reduce(
        (acc: Record<string, string>, p: { id: string; name: string }) => {
          acc[p.name.trim().toLowerCase()] = p.id;
          return acc;
        },
        {} as Record<string, string>
      );
      const batch = rows.map(r => {
        let propertyId = r.property_id || null;
        if (!propertyId && r.property_name) propertyId = maintPropLookup[r.property_name.trim().toLowerCase()] || null;
        if (!propertyId && maintProps && maintProps.length > 0) propertyId = maintProps[0].id;
        return {
          company_id: companyId, property_id: propertyId,
          title: r.title || "", description: r.description || null,
          priority: r.priority || "medium", category: r.category || null,
          status: r.status || "submitted", scheduled_date: r.scheduled_date || null,
          estimated_cost: r.estimated_cost ? parseFloat(r.estimated_cost) : null,
          actual_cost: r.actual_cost ? parseFloat(r.actual_cost) : null,
          requested_by: userId, assigned_to: resolveUserRef(r.assigned_to) || userId,
          notes: r.notes || null,
        };
      });
      const res = await batchInsert("maintenance_requests", batch);
      successCount += res.successCount;
      break;
    }

    case "journal_entries": {
      const { data: coaAccounts } = await supabase
        .from("chart_of_accounts")
        .select("id, account_number, account_type, name")
        .eq("company_id", companyId);
      const acctLookup = (coaAccounts || []).reduce(
        (acc: Record<string, string>, a: { id: string; account_number: string }) => {
          acc[a.account_number] = a.id;
          return acc;
        },
        {} as Record<string, string>
      );

      // Build AR/AP account ID set for filtering
      const arApAccountIds = new Set<string>();
      if (options?.skipAutoJE) {
        for (const a of coaAccounts || []) {
          const name = (a.name || "").toLowerCase();
          const type = (a.account_type || "").toLowerCase();
          if (
            (type === "asset" && (name.includes("accounts receivable") || name.includes("retainage receivable"))) ||
            (type === "liability" && (name.includes("accounts payable") || name.includes("retainage payable")))
          ) {
            arApAccountIds.add(a.id);
          }
        }
      }

      // Group rows by entry_number
      const entryMap = new Map<string, Record<string, string>[]>();
      for (const r of rows) {
        const key = r.entry_number || `auto-${Date.now()}-${Math.random()}`;
        if (!entryMap.has(key)) entryMap.set(key, []);
        entryMap.get(key)!.push(r);
      }

      // Build header + line arrays in memory, then batch insert
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const headerBatch: Record<string, any>[] = [];
      const lineSets: Array<Array<{ account_id: string | null; debit: number; credit: number; description: string | null }>> = [];

      for (const [entryNumber, entryRows] of entryMap) {
        // Skip pre-crafted JEs that touch AR/AP
        if (options?.skipAutoJE && arApAccountIds.size > 0) {
          const touchesArAp = entryRows.some((line) => {
            const lineAcctId = line.account_id || (line.account_number ? acctLookup[line.account_number] : null);
            return lineAcctId && arApAccountIds.has(lineAcctId);
          });
          if (touchesArAp) continue;
        }

        const first = entryRows[0];
        headerBatch.push({
          company_id: companyId,
          entry_number: entryNumber,
          entry_date: first.entry_date || new Date().toISOString().split("T")[0],
          description: first.description || "",
          reference: first.reference || null,
          status: first.status || "posted",
          created_by: userId,
        });
        lineSets.push(entryRows.map(line => ({
          account_id: line.account_id || (line.account_number ? acctLookup[line.account_number] : null) || null,
          debit: line.debit ? parseFloat(line.debit) : 0,
          credit: line.credit ? parseFloat(line.credit) : 0,
          description: line.line_description || null,
        })));
      }

      // Batch insert all JE headers
      const headerRes = await batchInsert("journal_entries", headerBatch, true);
      successCount += headerRes.successCount;

      // Build all line inserts with mapped IDs
      if (headerRes.ids.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const allLines: Record<string, any>[] = [];
        for (let h = 0; h < headerRes.ids.length && h < lineSets.length; h++) {
          const jeId = headerRes.ids[h];
          for (const line of lineSets[h]) {
            allLines.push({
              company_id: companyId,
              journal_entry_id: jeId,
              account_id: line.account_id,
              debit: line.debit,
              credit: line.credit,
              description: line.description,
            });
          }
        }
        // Batch insert all lines (chunks of 500)
        for (let c = 0; c < allLines.length; c += 500) {
          const chunk = allLines.slice(c, c + 500);
          const { error: lineErr } = await supabase.from("journal_entry_lines").insert(chunk);
          if (lineErr) {
            errors.push(`JE lines batch ${Math.floor(c / 500) + 1}: ${lineErr.message}`);
          }
        }
      }
      break;
    }

    case "submittals": {
      // Get count once, not per row
      const { count: subBaseCount } = await supabase
        .from("submittals")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId);
      const batch = rows.map((r, i) => ({
        company_id: companyId,
        project_id: resolveProjectId(r),
        submittal_number: r.submittal_number || `SUB-${String((subBaseCount ?? 0) + i + 1).padStart(3, "0")}`,
        title: r.title || "",
        spec_section: r.spec_section || null,
        due_date: r.due_date || null,
        submitted_by: userId,
        reviewer_id: resolveUserRef(r.reviewer || r.reviewer_id) || userId,
        review_comments: r.review_comments || null,
        status: r.status || "pending",
      }));
      const res = await batchInsert("submittals", batch);
      successCount += res.successCount;
      break;
    }

    case "property_expenses": {
      const { data: expProps } = await supabase
        .from("properties")
        .select("id, name")
        .eq("company_id", companyId);
      const expPropLookup = (expProps || []).reduce(
        (acc: Record<string, string>, p: { id: string; name: string }) => {
          acc[p.name.trim().toLowerCase()] = p.id;
          return acc;
        },
        {} as Record<string, string>
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const expBatch: Record<string, any>[] = [];
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        let propertyId = r.property_id || null;
        if (!propertyId && r.property_name) propertyId = expPropLookup[r.property_name.trim().toLowerCase()] || null;
        if (!propertyId && expProps && expProps.length > 0) propertyId = expProps[0].id;
        if (!propertyId) { errors.push(`Row ${i + 2}: No property found`); continue; }
        expBatch.push({
          company_id: companyId, property_id: propertyId,
          expense_type: r.expense_type || "other", description: r.description || null,
          amount: r.amount ? parseFloat(r.amount) : 0, frequency: r.frequency || "monthly",
          effective_date: r.effective_date || null, end_date: r.end_date || null,
          vendor_name: r.vendor_name || null, notes: r.notes || null,
        });
      }
      const expRes = await batchInsert("property_expenses", expBatch);
      successCount += expRes.successCount;
      break;
    }

    case "estimates": {
      const batch = rows.map((r, i) => ({
        company_id: companyId,
        project_id: resolveProjectId(r),
        estimate_number: r.estimate_number || `EST-${String(i + 1).padStart(4, "0")}`,
        title: r.title || "",
        description: r.description || null,
        status: r.status || "draft",
        total_cost: r.total_cost ? parseFloat(r.total_cost) : 0,
        total_price: r.total_price ? parseFloat(r.total_price) : 0,
        margin_pct: r.margin_pct ? parseFloat(r.margin_pct) : 0,
        overhead_pct: r.overhead_pct ? parseFloat(r.overhead_pct) : 10,
        profit_pct: r.profit_pct ? parseFloat(r.profit_pct) : 10,
        notes: r.notes || null,
        created_by: userId,
      }));
      const res = await batchInsert("estimates", batch);
      successCount += res.successCount;
      break;
    }

    // Fallback handlers: AR/AP → invoices, opening_balances → journal_entries
    // These only run when the parent entity sheet is absent from the workbook
    case "accounts_receivable": {
      // Process as invoices with forced type=receivable
      for (const r of rows) {
        r.invoice_type = "receivable";
        if (!r.invoice_date) r.invoice_date = r.due_date || new Date().toISOString().split("T")[0];
      }
      return processEntity(supabase, companyId, userId, "invoices", rows);
    }

    case "accounts_payable": {
      // Process as invoices with forced type=payable
      for (const r of rows) {
        r.invoice_type = "payable";
        if (!r.invoice_date) r.invoice_date = r.due_date || new Date().toISOString().split("T")[0];
      }
      return processEntity(supabase, companyId, userId, "invoices", rows);
    }

    case "opening_balances": {
      // Process as journal entries
      return processEntity(supabase, companyId, userId, "journal_entries", rows);
    }

    default: {
      errors.push(`Unsupported entity type: ${entity}`);
      break;
    }
  }

  return { successCount, errors };
}
