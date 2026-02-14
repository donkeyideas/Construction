import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";

// ---------------------------------------------------------------------------
// POST /api/import — Generic bulk import endpoint
// Body: { entity: string, rows: Record<string, string>[], project_id?: string }
// ---------------------------------------------------------------------------

const ALLOWED_ENTITIES = [
  "contacts",
  "equipment",
  "project_budget_lines",
  "chart_of_accounts",
  "daily_logs",
  "rfis",
  "change_orders",
  "contracts",
  "leases",
  "maintenance",
  "safety_incidents",
  "toolbox_talks",
  "equipment_assignments",
  "equipment_maintenance",
  "bank_accounts",
  "time_entries",
  "certifications",
  "opportunities",
  "bids",
  "projects",
  "invoices",
  "vendors",
  "safety_inspections",
  "journal_entries",
  "submittals",
] as const;

type AllowedEntity = (typeof ALLOWED_ENTITIES)[number];

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const entity = body.entity as string;
    const rows = body.rows as Record<string, string>[];

    if (!entity || !ALLOWED_ENTITIES.includes(entity as AllowedEntity)) {
      return NextResponse.json(
        { error: `Invalid entity. Allowed: ${ALLOWED_ENTITIES.join(", ")}` },
        { status: 400 }
      );
    }

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { error: "No rows to import" },
        { status: 400 }
      );
    }

    const { companyId, userId } = userCtx;
    let successCount = 0;
    const errors: string[] = [];

    // Process based on entity type
    switch (entity as AllowedEntity) {
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
          if (error) {
            errors.push(`Row ${i + 2}: ${error.message}`);
          } else {
            successCount++;
          }
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
          if (error) {
            errors.push(`Row ${i + 2}: ${error.message}`);
          } else {
            successCount++;
          }
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
          });
          if (error) {
            errors.push(`Row ${i + 2}: ${error.message}`);
          } else {
            successCount++;
          }
        }
        break;
      }

      case "project_budget_lines": {
        const projectId = body.project_id as string;
        if (!projectId) {
          return NextResponse.json(
            { error: "project_id is required for budget line import" },
            { status: 400 }
          );
        }
        for (let i = 0; i < rows.length; i++) {
          const r = rows[i];
          const { error } = await supabase
            .from("project_budget_lines")
            .insert({
              company_id: companyId,
              project_id: projectId,
              csi_code: r.csi_code || "",
              description: r.description || "",
              budgeted_amount: parseFloat(r.budgeted_amount) || 0,
              committed_amount: parseFloat(r.committed_amount) || 0,
              actual_amount: parseFloat(r.actual_amount) || 0,
            });
          if (error) {
            errors.push(`Row ${i + 2}: ${error.message}`);
          } else {
            successCount++;
          }
        }
        break;
      }

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
          if (error) {
            errors.push(`Row ${i + 2}: ${error.message}`);
          } else {
            successCount++;
          }
        }
        break;
      }

      case "daily_logs": {
        const projectId = body.project_id as string;
        for (let i = 0; i < rows.length; i++) {
          const r = rows[i];
          const { error } = await supabase.from("daily_logs").insert({
            company_id: companyId,
            project_id: r.project_id || projectId || null,
            log_date: r.log_date || new Date().toISOString().split("T")[0],
            status: r.status || "draft",
            weather_conditions: r.weather_conditions || null,
            weather_temp_high: r.temperature ? parseFloat(r.temperature) : null,
            work_performed: r.work_performed || null,
            safety_incidents: r.safety_incidents || null,
            delays: r.delays || null,
            created_by: userId,
          });
          if (error) {
            errors.push(`Row ${i + 2}: ${error.message}`);
          } else {
            successCount++;
          }
        }
        break;
      }

      case "rfis": {
        for (let i = 0; i < rows.length; i++) {
          const r = rows[i];
          const { error } = await supabase.from("rfis").insert({
            company_id: companyId,
            project_id: r.project_id || body.project_id || null,
            rfi_number: r.rfi_number || `RFI-${String(i + 1).padStart(3, "0")}`,
            subject: r.subject || "",
            question: r.question || "",
            priority: r.priority || "medium",
            status: r.status || "open",
            due_date: r.due_date || null,
            submitted_by: userId,
          });
          if (error) {
            errors.push(`Row ${i + 2}: ${error.message}`);
          } else {
            successCount++;
          }
        }
        break;
      }

      case "change_orders": {
        for (let i = 0; i < rows.length; i++) {
          const r = rows[i];
          const { error } = await supabase.from("change_orders").insert({
            company_id: companyId,
            project_id: r.project_id || body.project_id || null,
            co_number: r.co_number || `CO-${String(i + 1).padStart(3, "0")}`,
            title: r.title || "",
            description: r.description || null,
            reason: r.reason || null,
            status: r.status || "draft",
            amount: r.amount ? parseFloat(r.amount) : 0,
            schedule_impact_days: r.schedule_impact_days ? parseInt(r.schedule_impact_days) : 0,
            requested_by: userId,
          });
          if (error) {
            errors.push(`Row ${i + 2}: ${error.message}`);
          } else {
            successCount++;
          }
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
            project_id: r.project_id || body.project_id || null,
            status: r.status || "draft",
            created_by: userId,
          });
          if (error) {
            errors.push(`Row ${i + 2}: ${error.message}`);
          } else {
            successCount++;
          }
        }
        break;
      }

      case "leases": {
        for (let i = 0; i < rows.length; i++) {
          const r = rows[i];
          const { error } = await supabase.from("leases").insert({
            company_id: companyId,
            unit_id: r.unit_id || null,
            tenant_name: r.tenant_name || "",
            tenant_email: r.tenant_email || null,
            tenant_phone: r.tenant_phone || null,
            monthly_rent: r.monthly_rent ? parseFloat(r.monthly_rent) : 0,
            security_deposit: r.security_deposit ? parseFloat(r.security_deposit) : 0,
            lease_start: r.lease_start || null,
            lease_end: r.lease_end || null,
            status: r.status || "active",
          });
          if (error) {
            errors.push(`Row ${i + 2}: ${error.message}`);
          } else {
            successCount++;
          }
        }
        break;
      }

      case "maintenance": {
        for (let i = 0; i < rows.length; i++) {
          const r = rows[i];
          const { error } = await supabase.from("maintenance_requests").insert({
            company_id: companyId,
            property_id: r.property_id || null,
            title: r.title || "",
            description: r.description || null,
            priority: r.priority || "medium",
            category: r.category || null,
            status: r.status || "open",
            scheduled_date: r.scheduled_date || null,
            estimated_cost: r.estimated_cost ? parseFloat(r.estimated_cost) : null,
            requested_by: userId,
          });
          if (error) {
            errors.push(`Row ${i + 2}: ${error.message}`);
          } else {
            successCount++;
          }
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
            project_id: r.project_id || body.project_id || null,
            incident_date: r.incident_date || new Date().toISOString().split("T")[0],
            location: r.location || null,
            osha_recordable: r.osha_recordable === "true" || r.osha_recordable === "yes",
            status: r.status || "reported",
            reported_by: userId,
          });
          if (error) {
            errors.push(`Row ${i + 2}: ${error.message}`);
          } else {
            successCount++;
          }
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
            project_id: r.project_id || body.project_id || null,
            attendee_count: r.attendees_count ? parseInt(r.attendees_count) : null,
            notes: r.notes || null,
            status: r.status || "scheduled",
            conducted_by: userId,
          });
          if (error) {
            errors.push(`Row ${i + 2}: ${error.message}`);
          } else {
            successCount++;
          }
        }
        break;
      }

      case "equipment_assignments": {
        for (let i = 0; i < rows.length; i++) {
          const r = rows[i];
          const { error } = await supabase.from("equipment_assignments").insert({
            company_id: companyId,
            equipment_id: r.equipment_id || null,
            project_id: r.project_id || body.project_id || null,
            assigned_to: r.assigned_to || null,
            assigned_date: r.assigned_date || new Date().toISOString().split("T")[0],
            returned_date: r.return_date || null,
            notes: r.notes || null,
            status: r.status || "active",
          });
          if (error) {
            errors.push(`Row ${i + 2}: ${error.message}`);
          } else {
            successCount++;
          }
        }
        break;
      }

      case "equipment_maintenance": {
        for (let i = 0; i < rows.length; i++) {
          const r = rows[i];
          const { error } = await supabase.from("equipment_maintenance_logs").insert({
            company_id: companyId,
            equipment_id: r.equipment_id || null,
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
          if (error) {
            errors.push(`Row ${i + 2}: ${error.message}`);
          } else {
            successCount++;
          }
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
          if (error) {
            errors.push(`Row ${i + 2}: ${error.message}`);
          } else {
            successCount++;
          }
        }
        break;
      }

      case "time_entries": {
        for (let i = 0; i < rows.length; i++) {
          const r = rows[i];
          const { error } = await supabase.from("time_entries").insert({
            company_id: companyId,
            project_id: r.project_id || body.project_id || null,
            user_id: r.user_id || userId,
            entry_date: r.entry_date || new Date().toISOString().split("T")[0],
            hours: r.hours ? parseFloat(r.hours) : 0,
            notes: r.description || r.notes || null,
            cost_code: r.cost_code || null,
            status: r.status || "pending",
          });
          if (error) {
            errors.push(`Row ${i + 2}: ${error.message}`);
          } else {
            successCount++;
          }
        }
        break;
      }

      case "certifications": {
        // Pre-fetch contacts to resolve names to IDs
        const { data: companyContacts } = await supabase
          .from("contacts")
          .select("id, first_name, last_name")
          .eq("company_id", companyId);
        const contactLookup = (companyContacts || []).reduce((acc, c) => {
          const full = `${c.first_name} ${c.last_name}`.trim().toLowerCase();
          acc[full] = c.id;
          if (c.last_name) acc[c.last_name.toLowerCase()] = c.id;
          return acc;
        }, {} as Record<string, string>);

        for (let i = 0; i < rows.length; i++) {
          const r = rows[i];
          // Resolve contact_id from contact_name if no UUID provided
          let contactId = r.contact_id || null;
          if (!contactId && r.contact_name) {
            contactId = contactLookup[r.contact_name.trim().toLowerCase()] || null;
            if (!contactId) {
              errors.push(`Row ${i + 2}: Could not find contact "${r.contact_name}"`);
              continue;
            }
          }
          if (!contactId) {
            // Assign to first contact as fallback
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
          if (error) {
            errors.push(`Row ${i + 2}: ${error.message}`);
          } else {
            successCount++;
          }
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
          if (error) {
            errors.push(`Row ${i + 2}: ${error.message}`);
          } else {
            successCount++;
          }
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
          if (error) {
            errors.push(`Row ${i + 2}: ${error.message}`);
          } else {
            successCount++;
          }
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
            status: r.status || "planning",
            project_type: r.project_type || null,
            address_line1: r.address || null,
            city: r.city || null,
            state: r.state || null,
            contract_amount: r.budget ? parseFloat(r.budget) : null,
            start_date: r.start_date || null,
            estimated_end_date: r.end_date || null,
            description: r.description || null,
          });
          if (error) {
            errors.push(`Row ${i + 2}: ${error.message}`);
          } else {
            successCount++;
          }
        }
        break;
      }

      case "invoices": {
        for (let i = 0; i < rows.length; i++) {
          const r = rows[i];
          const { error } = await supabase.from("invoices").insert({
            company_id: companyId,
            invoice_number: r.invoice_number || `INV-${String(i + 1).padStart(4, "0")}`,
            invoice_date: r.invoice_date || new Date().toISOString().split("T")[0],
            project_id: r.project_id || body.project_id || null,
            invoice_type: r.invoice_type || "receivable",
            subtotal: r.amount ? parseFloat(r.amount) : 0,
            total_amount: r.amount ? parseFloat(r.amount) + (r.tax_amount ? parseFloat(r.tax_amount) : 0) : 0,
            tax_amount: r.tax_amount ? parseFloat(r.tax_amount) : 0,
            due_date: r.due_date || null,
            notes: r.description || null,
            status: r.status || "draft",
          });
          if (error) {
            errors.push(`Row ${i + 2}: ${error.message}`);
          } else {
            successCount++;
          }
        }
        break;
      }

      case "safety_inspections": {
        for (let i = 0; i < rows.length; i++) {
          const r = rows[i];
          const { error } = await supabase.from("safety_inspections").insert({
            company_id: companyId,
            project_id: r.project_id || body.project_id || null,
            inspection_type: r.inspection_type || "site_safety",
            inspection_date: r.inspection_date || new Date().toISOString().split("T")[0],
            score: r.score ? parseInt(r.score) : null,
            findings: r.findings || null,
            corrective_actions: r.corrective_actions || null,
            status: r.status || "scheduled",
            inspector_id: userId,
          });
          if (error) {
            errors.push(`Row ${i + 2}: ${error.message}`);
          } else {
            successCount++;
          }
        }
        break;
      }

      case "journal_entries": {
        // Pre-fetch chart of accounts to resolve account_number to account_id
        const { data: coaAccounts } = await supabase
          .from("chart_of_accounts")
          .select("id, account_number")
          .eq("company_id", companyId);
        const acctLookup = (coaAccounts || []).reduce((acc, a) => {
          acc[a.account_number] = a.id;
          return acc;
        }, {} as Record<string, string>);

        // Group rows by entry_number to create entries with lines
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
          // Create the journal entry header
          const { data: entry, error: headerError } = await supabase
            .from("journal_entries")
            .insert({
              company_id: companyId,
              entry_number: entryNumber,
              entry_date: first.entry_date || new Date().toISOString().split("T")[0],
              description: first.description || "",
              reference: first.reference || null,
              status: "draft",
              created_by: userId,
            })
            .select("id")
            .single();

          if (headerError || !entry) {
            errors.push(`Entry ${entryIdx}: ${headerError?.message || "Failed to create"}`);
            continue;
          }

          // Create journal entry lines
          for (let j = 0; j < entryRows.length; j++) {
            const line = entryRows[j];
            const { error: lineError } = await supabase
              .from("journal_entry_lines")
              .insert({
                company_id: companyId,
                journal_entry_id: entry.id,
                account_id: line.account_id || (line.account_number ? acctLookup[line.account_number] : null) || null,
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
    }

    return NextResponse.json({
      success: successCount,
      errors,
      total: rows.length,
    });
  } catch (err) {
    console.error("POST /api/import error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
