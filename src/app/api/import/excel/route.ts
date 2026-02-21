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

// ---------------------------------------------------------------------------
// POST /api/import/excel — Master Excel template import
// Accepts multipart/form-data with a .xlsx file, parses all sheets,
// imports entities in dependency order, and tracks results.
// ---------------------------------------------------------------------------

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

      const sheetResult = await processEntity(
        supabase,
        companyId,
        userId,
        entity,
        sheet.rows
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
  rows: Record<string, string>[]
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

  switch (entity) {
    case "chart_of_accounts": {
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const { error } = await supabase.from("chart_of_accounts").insert({
          company_id: companyId,
          account_number: r.account_number || "",
          name: r.name || "",
          account_type: r.account_type || "expense",
          sub_type: r.sub_type || null,
          description: r.description || null,
          is_active: true,
        });
        if (error) errors.push(`Row ${i + 2}: ${error.message}`);
        else successCount++;
      }
      break;
    }

    case "bank_accounts": {
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const { error } = await supabase.from("bank_accounts").insert({
          company_id: companyId,
          name: r.name || "",
          bank_name: r.bank_name || "",
          account_type: r.account_type || "checking",
          account_number_last4: r.account_number_last4 || "",
          routing_number_last4: r.routing_number_last4 || "",
          current_balance: r.current_balance ? parseFloat(r.current_balance) : 0,
        });
        if (error) errors.push(`Row ${i + 2}: ${error.message}`);
        else successCount++;
      }
      break;
    }

    case "projects": {
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const { error } = await supabase.from("projects").insert({
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
        });
        if (error) errors.push(`Row ${i + 2}: ${error.message}`);
        else successCount++;
      }
      break;
    }

    case "contacts": {
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const { error } = await supabase.from("contacts").insert({
          company_id: companyId,
          contact_type: r.contact_type || "subcontractor",
          first_name: r.first_name || "",
          last_name: r.last_name || "",
          company_name: r.company_name || "",
          job_title: r.job_title || "",
          email: r.email || "",
          phone: r.phone || "",
        });
        if (error) errors.push(`Row ${i + 2}: ${error.message}`);
        else successCount++;
      }
      break;
    }

    case "vendors": {
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const { error } = await supabase.from("contacts").insert({
          company_id: companyId,
          contact_type: "vendor",
          first_name: r.first_name || "",
          last_name: r.last_name || "",
          company_name: r.company_name || "",
          job_title: r.job_title || "",
          email: r.email || "",
          phone: r.phone || "",
        });
        if (error) errors.push(`Row ${i + 2}: ${error.message}`);
        else successCount++;
      }
      break;
    }

    case "equipment": {
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const { error } = await supabase.from("equipment").insert({
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
        });
        if (error) errors.push(`Row ${i + 2}: ${error.message}`);
        else successCount++;
      }
      break;
    }

    case "invoices": {
      const accountMap = await buildCompanyAccountMap(supabase, companyId);
      const insertedInvoices: Array<{
        id: string;
        invoice_number: string;
        invoice_type: "payable" | "receivable";
        total_amount: number;
        subtotal: number;
        tax_amount: number;
        invoice_date: string;
        status?: string;
        project_id?: string | null;
        vendor_name?: string | null;
        client_name?: string | null;
        gl_account_id?: string | null;
        retainage_pct?: number;
        retainage_held?: number;
      }> = [];
      const paidInvoices: Array<{
        invoiceId: string;
        invoice_number: string;
        invoice_type: "payable" | "receivable";
        total_amount: number;
        due_date: string;
        project_id?: string | null;
        vendor_name?: string | null;
        client_name?: string | null;
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
        if (r.gl_account) {
          glAccountId = accountMap.byNumber[r.gl_account] || null;
        }
        if (!glAccountId) {
          const inferredNumber = inferGLAccountFromDescription(
            r.description || "",
            invoiceType,
            r.vendor_name
          );
          if (inferredNumber) {
            glAccountId = accountMap.byNumber[inferredNumber] || null;
          }
        }

        const retainagePct = r.retainage_pct ? parseFloat(r.retainage_pct) : 0;
        const retainageHeld = r.retainage_held
          ? parseFloat(r.retainage_held)
          : retainagePct > 0
            ? totalAmount * (retainagePct / 100)
            : 0;

        const isPaid = status === "paid";
        const amountPaid = isPaid ? totalAmount : 0;

        const { data: inserted, error } = await supabase
          .from("invoices")
          .insert({
            company_id: companyId,
            invoice_number: invoiceNumber,
            invoice_date: invoiceDate,
            project_id: projectId,
            invoice_type: invoiceType,
            vendor_name: r.vendor_name || null,
            client_name: r.client_name || null,
            subtotal,
            total_amount: totalAmount,
            tax_amount: taxAmount,
            due_date: r.due_date || null,
            notes: r.description || null,
            status,
            amount_paid: amountPaid,
            gl_account_id: glAccountId,
            retainage_pct: retainagePct,
            retainage_held: retainageHeld,
          })
          .select("id")
          .single();

        if (error) {
          errors.push(`Row ${i + 2}: ${error.message}`);
        } else {
          successCount++;
          if (inserted) {
            insertedInvoices.push({
              id: inserted.id,
              invoice_number: invoiceNumber,
              invoice_type: invoiceType,
              total_amount: totalAmount,
              subtotal,
              tax_amount: taxAmount,
              invoice_date: invoiceDate,
              status,
              project_id: projectId,
              vendor_name: r.vendor_name || null,
              client_name: r.client_name || null,
              gl_account_id: glAccountId,
              retainage_pct: retainagePct,
              retainage_held: retainageHeld,
            });
            if (isPaid) {
              paidInvoices.push({
                invoiceId: inserted.id,
                invoice_number: invoiceNumber,
                invoice_type: invoiceType,
                total_amount: totalAmount,
                due_date: r.due_date || invoiceDate,
                project_id: projectId,
                vendor_name: r.vendor_name || null,
                client_name: r.client_name || null,
              });
            }
          }
        }
      }

      // Auto-generate invoice JEs
      if (insertedInvoices.length > 0) {
        try {
          await generateBulkInvoiceJournalEntries(
            supabase,
            companyId,
            userId,
            insertedInvoices
          );
        } catch (jeErr) {
          console.warn("Bulk JE generation failed:", jeErr);
        }
      }

      // Payment records + JEs for paid invoices
      if (paidInvoices.length > 0) {
        const paymentRecords: Array<{
          paymentId: string;
          amount: number;
          payment_date: string;
          method: string;
          invoice: {
            id: string;
            invoice_number: string;
            invoice_type: "payable" | "receivable";
            project_id?: string | null;
            vendor_name?: string | null;
            client_name?: string | null;
          };
        }> = [];

        for (const pi of paidInvoices) {
          const { data: payment, error: pmtErr } = await supabase
            .from("payments")
            .insert({
              company_id: companyId,
              invoice_id: pi.invoiceId,
              payment_date: pi.due_date,
              amount: pi.total_amount,
              method: "imported",
              notes: "Auto-generated from paid invoice import",
            })
            .select("id")
            .single();

          if (!pmtErr && payment) {
            paymentRecords.push({
              paymentId: payment.id,
              amount: pi.total_amount,
              payment_date: pi.due_date,
              method: "imported",
              invoice: {
                id: pi.invoiceId,
                invoice_number: pi.invoice_number,
                invoice_type: pi.invoice_type,
                project_id: pi.project_id,
                vendor_name: pi.vendor_name,
                client_name: pi.client_name,
              },
            });
          }
        }

        if (paymentRecords.length > 0) {
          try {
            await generateBulkPaymentJournalEntries(
              supabase,
              companyId,
              userId,
              paymentRecords
            );
          } catch (pmtJeErr) {
            console.warn("Bulk payment JE generation failed:", pmtJeErr);
          }
        }

        // Bank balance sync
        try {
          const { data: defaultBank } = await supabase
            .from("bank_accounts")
            .select("id, current_balance")
            .eq("company_id", companyId)
            .eq("is_default", true)
            .single();
          if (defaultBank) {
            let cashAdjustment = 0;
            for (const pi of paidInvoices) {
              cashAdjustment +=
                pi.invoice_type === "payable"
                  ? -pi.total_amount
                  : pi.total_amount;
            }
            await supabase
              .from("bank_accounts")
              .update({
                current_balance: defaultBank.current_balance + cashAdjustment,
              })
              .eq("id", defaultBank.id);
          }
        } catch (bankErr) {
          console.warn("Bank balance sync failed:", bankErr);
        }
      }
      break;
    }

    case "time_entries": {
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const { error } = await supabase.from("time_entries").insert({
          company_id: companyId,
          project_id: resolveProjectId(r),
          user_id: r.user_id || userId,
          entry_date: r.entry_date || new Date().toISOString().split("T")[0],
          hours: r.hours ? parseFloat(r.hours) : 0,
          notes: r.description || r.notes || null,
          cost_code: r.cost_code || null,
          status: r.status || "pending",
        });
        if (error) errors.push(`Row ${i + 2}: ${error.message}`);
        else successCount++;
      }
      break;
    }

    case "change_orders": {
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const { error } = await supabase.from("change_orders").insert({
          company_id: companyId,
          project_id: resolveProjectId(r),
          co_number: r.co_number || `CO-${String(i + 1).padStart(3, "0")}`,
          title: r.title || "",
          description: r.description || null,
          reason: r.reason || null,
          status: r.status || "draft",
          amount: r.amount ? parseFloat(r.amount) : 0,
          schedule_impact_days: r.schedule_impact_days
            ? parseInt(r.schedule_impact_days)
            : 0,
          requested_by: userId,
        });
        if (error) errors.push(`Row ${i + 2}: ${error.message}`);
        else successCount++;
      }
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
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const pid = resolveProjectId(r);
        if (!pid) {
          errors.push(`Row ${i + 2}: could not resolve project`);
          continue;
        }
        const { error } = await supabase.from("project_budget_lines").insert({
          company_id: companyId,
          project_id: pid,
          csi_code: r.csi_code || "",
          description: r.description || "",
          budgeted_amount: parseFloat(r.budgeted_amount) || 0,
          committed_amount: parseFloat(r.committed_amount) || 0,
          actual_amount: parseFloat(r.actual_amount) || 0,
        });
        if (error) errors.push(`Row ${i + 2}: ${error.message}`);
        else successCount++;
      }
      break;
    }

    case "daily_logs": {
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const { error } = await supabase.from("daily_logs").insert({
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
        });
        if (error) errors.push(`Row ${i + 2}: ${error.message}`);
        else successCount++;
      }
      break;
    }

    case "rfis": {
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const { error } = await supabase.from("rfis").insert({
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
        });
        if (error) errors.push(`Row ${i + 2}: ${error.message}`);
        else successCount++;
      }
      break;
    }

    case "contracts": {
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const { error } = await supabase.from("contracts").insert({
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
        });
        if (error) errors.push(`Row ${i + 2}: ${error.message}`);
        else successCount++;
      }
      break;
    }

    case "properties": {
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const { error } = await supabase.from("properties").insert({
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
        });
        if (error) errors.push(`Row ${i + 2}: ${error.message}`);
        else successCount++;
      }
      break;
    }

    case "units": {
      // Pre-fetch properties to resolve property_name to property_id
      const { data: unitProps } = await supabase
        .from("properties")
        .select("id, name")
        .eq("company_id", companyId);
      const unitPropLookup = (unitProps || []).reduce((acc, p) => {
        acc[p.name.trim().toLowerCase()] = p.id;
        return acc;
      }, {} as Record<string, string>);

      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        let propertyId = r.property_id || null;
        if (!propertyId && r.property_name) {
          propertyId = unitPropLookup[r.property_name.trim().toLowerCase()] || null;
        }
        if (!propertyId) {
          errors.push(`Row ${i + 2}: Property "${r.property_name || ""}" not found.`);
          continue;
        }
        if (!r.unit_number) {
          errors.push(`Row ${i + 2}: Unit number is required.`);
          continue;
        }
        const { error } = await supabase.from("units").insert({
          company_id: companyId,
          property_id: propertyId,
          unit_number: r.unit_number.trim(),
          unit_type: r.unit_type || "1br",
          sqft: r.sqft ? parseInt(r.sqft) : null,
          bedrooms: r.bedrooms ? parseInt(r.bedrooms) : null,
          bathrooms: r.bathrooms ? parseInt(r.bathrooms) : null,
          floor_number: r.floor_number ? parseInt(r.floor_number) : null,
          market_rent: r.market_rent ? parseFloat(r.market_rent) : null,
          status: r.status || "vacant",
        });
        if (error) errors.push(`Row ${i + 2}: ${error.message}`);
        else successCount++;
      }

      // Update total_units on affected properties
      if (unitProps && unitProps.length > 0) {
        for (const prop of unitProps) {
          const { count } = await supabase
            .from("units")
            .select("id", { count: "exact", head: true })
            .eq("company_id", companyId)
            .eq("property_id", prop.id);
          if (count !== null) {
            await supabase
              .from("properties")
              .update({ total_units: count })
              .eq("id", prop.id);
          }
        }
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

      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        let contactId = r.contact_id || null;
        if (!contactId && r.contact_name) {
          contactId = contactLookup[r.contact_name.trim().toLowerCase()] || null;
        }
        if (!contactId) {
          contactId = companyContacts?.[0]?.id || null;
        }
        const { error } = await supabase.from("certifications").insert({
          company_id: companyId,
          contact_id: contactId,
          cert_name: r.cert_name || "",
          cert_type: r.cert_type || "certification",
          issuing_authority: r.issuing_authority || null,
          cert_number: r.cert_number || null,
          issued_date: r.issued_date || null,
          expiry_date: r.expiry_date || null,
          status: r.status || "active",
        });
        if (error) errors.push(`Row ${i + 2}: ${error.message}`);
        else successCount++;
      }
      break;
    }

    case "opportunities": {
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const { error } = await supabase.from("opportunities").insert({
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
        });
        if (error) errors.push(`Row ${i + 2}: ${error.message}`);
        else successCount++;
      }
      break;
    }

    case "bids": {
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const { error } = await supabase.from("bids").insert({
          company_id: companyId,
          bid_number: r.bid_number || `BID-${String(i + 1).padStart(3, "0")}`,
          project_name: r.project_name || r.name || "",
          client_name: r.client_name || null,
          bid_amount: r.bid_amount ? parseFloat(r.bid_amount) : null,
          due_date: r.due_date || null,
          status: r.status || "draft",
          scope_description: r.notes || null,
          submitted_by: userId,
        });
        if (error) errors.push(`Row ${i + 2}: ${error.message}`);
        else successCount++;
      }
      break;
    }

    case "safety_incidents": {
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const { error } = await supabase.from("safety_incidents").insert({
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
        });
        if (error) errors.push(`Row ${i + 2}: ${error.message}`);
        else successCount++;
      }
      break;
    }

    case "safety_inspections": {
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const { error } = await supabase.from("safety_inspections").insert({
          company_id: companyId,
          project_id: resolveProjectId(r),
          inspection_type: r.inspection_type || "site_safety",
          inspection_date: r.inspection_date || new Date().toISOString().split("T")[0],
          score: r.score ? parseInt(r.score) : null,
          findings: r.findings || null,
          corrective_actions: r.corrective_actions || null,
          status: r.status || "scheduled",
          inspector_id: userId,
        });
        if (error) errors.push(`Row ${i + 2}: ${error.message}`);
        else successCount++;
      }
      break;
    }

    case "toolbox_talks": {
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const { error } = await supabase.from("toolbox_talks").insert({
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
        });
        if (error) errors.push(`Row ${i + 2}: ${error.message}`);
        else successCount++;
      }
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

      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        let propertyId = r.property_id || null;
        if (!propertyId && r.property_name) {
          propertyId = leasePropLookup[r.property_name.trim().toLowerCase()] || null;
        }
        if (!propertyId && leaseProps && leaseProps.length > 0) {
          propertyId = leaseProps[0].id;
        }
        if (!propertyId) {
          errors.push(`Row ${i + 2}: No property found. Create a property first.`);
          continue;
        }
        let unitId = r.unit_id || null;
        if (!unitId) {
          const { count: unitCount } = await supabase
            .from("units")
            .select("id", { count: "exact", head: true })
            .eq("company_id", companyId)
            .eq("property_id", propertyId);
          const unitNum = (unitCount ?? 0) + 1;
          const { data: newUnit, error: unitError } = await supabase
            .from("units")
            .insert({
              company_id: companyId,
              property_id: propertyId,
              unit_number: r.unit_number || `Unit ${unitNum}`,
              unit_type: r.unit_type || "office",
              status: "occupied",
              market_rent: r.monthly_rent ? parseFloat(r.monthly_rent) : null,
            })
            .select("id")
            .single();
          if (unitError || !newUnit) {
            errors.push(`Row ${i + 2}: Failed to create unit -- ${unitError?.message}`);
            continue;
          }
          unitId = newUnit.id;
        }
        const { error } = await supabase.from("leases").insert({
          company_id: companyId,
          property_id: propertyId,
          unit_id: unitId,
          tenant_name: r.tenant_name || "",
          tenant_email: r.tenant_email || null,
          tenant_phone: r.tenant_phone || null,
          monthly_rent: r.monthly_rent ? parseFloat(r.monthly_rent) : 0,
          security_deposit: r.security_deposit ? parseFloat(r.security_deposit) : 0,
          lease_start: r.lease_start || null,
          lease_end: r.lease_end || null,
          status: r.status || "active",
        });
        if (error) errors.push(`Row ${i + 2}: ${error.message}`);
        else successCount++;
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

      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        let propertyId = r.property_id || null;
        if (!propertyId && r.property_name) {
          propertyId = maintPropLookup[r.property_name.trim().toLowerCase()] || null;
        }
        if (!propertyId && maintProps && maintProps.length > 0) {
          propertyId = maintProps[0].id;
        }
        const { error } = await supabase.from("maintenance_requests").insert({
          company_id: companyId,
          property_id: propertyId,
          title: r.title || "",
          description: r.description || null,
          priority: r.priority || "medium",
          category: r.category || null,
          status: r.status || "submitted",
          scheduled_date: r.scheduled_date || null,
          estimated_cost: r.estimated_cost ? parseFloat(r.estimated_cost) : null,
          actual_cost: r.actual_cost ? parseFloat(r.actual_cost) : null,
          requested_by: userId,
          assigned_to: resolveUserRef(r.assigned_to) || userId,
          notes: r.notes || null,
        });
        if (error) errors.push(`Row ${i + 2}: ${error.message}`);
        else successCount++;
      }
      break;
    }

    case "journal_entries": {
      const { data: coaAccounts } = await supabase
        .from("chart_of_accounts")
        .select("id, account_number")
        .eq("company_id", companyId);
      const acctLookup = (coaAccounts || []).reduce(
        (acc: Record<string, string>, a: { id: string; account_number: string }) => {
          acc[a.account_number] = a.id;
          return acc;
        },
        {} as Record<string, string>
      );

      const entryMap = new Map<string, Record<string, string>[]>();
      for (const r of rows) {
        const key = r.entry_number || `auto-${Date.now()}-${Math.random()}`;
        if (!entryMap.has(key)) entryMap.set(key, []);
        entryMap.get(key)!.push(r);
      }

      let entryIdx = 0;
      for (const [entryNumber, entryRows] of entryMap) {
        entryIdx++;
        const first = entryRows[0];
        const { data: entry, error: headerError } = await supabase
          .from("journal_entries")
          .insert({
            company_id: companyId,
            entry_number: entryNumber,
            entry_date: first.entry_date || new Date().toISOString().split("T")[0],
            description: first.description || "",
            reference: first.reference || null,
            status: first.status || "posted",
            created_by: userId,
          })
          .select("id")
          .single();

        if (headerError || !entry) {
          errors.push(`Entry ${entryIdx}: ${headerError?.message || "Failed to create"}`);
          continue;
        }

        for (let j = 0; j < entryRows.length; j++) {
          const line = entryRows[j];
          const { error: lineError } = await supabase
            .from("journal_entry_lines")
            .insert({
              company_id: companyId,
              journal_entry_id: entry.id,
              account_id:
                line.account_id ||
                (line.account_number ? acctLookup[line.account_number] : null) ||
                null,
              debit: line.debit ? parseFloat(line.debit) : 0,
              credit: line.credit ? parseFloat(line.credit) : 0,
              description: line.line_description || null,
            });
          if (lineError) {
            errors.push(`Entry ${entryIdx}, Line ${j + 1}: ${lineError.message}`);
          }
        }
        successCount++;
      }
      break;
    }

    case "submittals": {
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const { count: subCount } = await supabase
          .from("submittals")
          .select("id", { count: "exact", head: true })
          .eq("company_id", companyId);
        const subNum = (subCount ?? 0) + i + 1;
        const { error } = await supabase.from("submittals").insert({
          company_id: companyId,
          project_id: resolveProjectId(r),
          submittal_number: r.submittal_number || `SUB-${String(subNum).padStart(3, "0")}`,
          title: r.title || "",
          spec_section: r.spec_section || null,
          due_date: r.due_date || null,
          submitted_by: userId,
          reviewer_id: resolveUserRef(r.reviewer || r.reviewer_id) || userId,
          review_comments: r.review_comments || null,
          status: r.status || "pending",
        });
        if (error) errors.push(`Row ${i + 2}: ${error.message}`);
        else successCount++;
      }
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

      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        let propertyId = r.property_id || null;
        if (!propertyId && r.property_name) {
          propertyId = expPropLookup[r.property_name.trim().toLowerCase()] || null;
        }
        if (!propertyId && expProps && expProps.length > 0) {
          propertyId = expProps[0].id;
        }
        if (!propertyId) {
          errors.push(`Row ${i + 2}: No property found`);
          continue;
        }
        const { error } = await supabase.from("property_expenses").insert({
          company_id: companyId,
          property_id: propertyId,
          expense_type: r.expense_type || "other",
          description: r.description || null,
          amount: r.amount ? parseFloat(r.amount) : 0,
          frequency: r.frequency || "monthly",
          effective_date: r.effective_date || null,
          end_date: r.end_date || null,
          vendor_name: r.vendor_name || null,
          notes: r.notes || null,
        });
        if (error) errors.push(`Row ${i + 2}: ${error.message}`);
        else successCount++;
      }
      break;
    }

    case "estimates": {
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const estNum = r.estimate_number || `EST-${String(i + 1).padStart(4, "0")}`;
        const { error } = await supabase.from("estimates").insert({
          company_id: companyId,
          project_id: resolveProjectId(r),
          estimate_number: estNum,
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
        });
        if (error) errors.push(`Row ${i + 2}: ${error.message}`);
        else successCount++;
      }
      break;
    }

    default: {
      errors.push(`Unsupported entity type: ${entity}`);
      break;
    }
  }

  return { successCount, errors };
}
