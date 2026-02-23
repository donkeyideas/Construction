import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { syncPropertyFinancials } from "@/lib/queries/properties";
import {
  generateBulkInvoiceJournalEntries,
  generateBulkPaymentJournalEntries,
  buildCompanyAccountMap,
  inferGLAccountFromDescription,
} from "@/lib/utils/invoice-accounting";
import { backfillMissingJournalEntries } from "@/lib/utils/backfill-journal-entries";
import { ensureBankAccountGLLink } from "@/lib/utils/bank-gl-linkage";
import { logAuditEvent, extractRequestMeta } from "@/lib/utils/audit-logger";
import { checkSubscriptionAccess } from "@/lib/guards/subscription-guard";

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
  "properties",
  "units",
  "phases",
  "tasks",
  "property_expenses",
  "estimates",
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

    // --- Import bounds & sanitization ---
    const MAX_IMPORT_ROWS = 10000;
    if (rows.length > MAX_IMPORT_ROWS) {
      return NextResponse.json(
        { error: `Import exceeds maximum of ${MAX_IMPORT_ROWS} rows. Please split into smaller batches.` },
        { status: 400 }
      );
    }

    // Strip HTML tags from all string values to prevent stored XSS
    for (const row of rows) {
      for (const key of Object.keys(row)) {
        if (typeof row[key] === "string") {
          row[key] = row[key].replace(/<[^>]*>/g, "").replace(/[<>]/g, "").trim();
        }
      }
    }

    // Safe numeric parser: rejects Infinity, NaN, and values outside bounds
    const safeParseNumber = (val: string | undefined, fallback = 0, min = -1e12, max = 1e12): number => {
      if (!val) return fallback;
      const n = parseFloat(val);
      if (!Number.isFinite(n)) return fallback;
      return Math.max(min, Math.min(max, n));
    };

    const { companyId, userId } = userCtx;
    let successCount = 0;
    const errors: string[] = [];

    // -----------------------------------------------------------------------
    // Shared project lookup — resolves project_name / project_code → project_id
    // Built once, reused by every project-scoped entity so CSVs can include a
    // "project_name" column instead of requiring a single target project picker.
    // -----------------------------------------------------------------------
    const PROJECT_SCOPED: AllowedEntity[] = [
      "daily_logs", "rfis", "change_orders", "contracts", "safety_incidents",
      "toolbox_talks", "equipment_assignments", "time_entries",
      "safety_inspections", "invoices", "submittals", "phases", "tasks",
      "project_budget_lines", "estimates",
    ];
    let projLookup: Record<string, string> = {};
    // Also index properties by name so project-scoped entities can reference
    // a property name when no project exists (common in property management).
    let propNameLookup: Record<string, {
      id: string; name: string;
      purchase_price: number | null; current_value: number | null;
      address_line1: string | null; city: string | null;
      state: string | null; zip: string | null;
    }> = {};
    if (PROJECT_SCOPED.includes(entity as AllowedEntity)) {
      const { data: companyProjects } = await supabase
        .from("projects")
        .select("id, name, code")
        .eq("company_id", companyId);
      projLookup = (companyProjects || []).reduce((acc, p) => {
        acc[p.name.trim().toLowerCase()] = p.id;
        if (p.code) acc[p.code.trim().toLowerCase()] = p.id;
        return acc;
      }, {} as Record<string, string>);

      // Build property lookup as fallback for project resolution
      // Include financial + address fields so auto-created projects inherit them.
      const { data: companyProperties } = await supabase
        .from("properties")
        .select("id, name, purchase_price, current_value, address_line1, city, state, zip")
        .eq("company_id", companyId);
      propNameLookup = (companyProperties || []).reduce((acc, p) => {
        acc[p.name.trim().toLowerCase()] = {
          id: p.id, name: p.name,
          purchase_price: p.purchase_price, current_value: p.current_value,
          address_line1: p.address_line1, city: p.city,
          state: p.state, zip: p.zip,
        };
        return acc;
      }, {} as typeof propNameLookup);
    }

    /** Resolve a row's project_id from project_name/project_code or body fallback.
     *  CSV columns (project_name / project_code) take PRIORITY over the body
     *  picker so that multi-project CSV files route rows to the correct project
     *  regardless of which tab the user happens to be viewing.
     *  Falls back to matching properties — auto-creates a project if a property
     *  name matches but no corresponding project exists. */
    async function resolveProjectId(r: Record<string, string>): Promise<string | null> {
      if (r.project_id) return r.project_id;
      if (r.project_name) {
        const key = r.project_name.trim().toLowerCase();
        const found = projLookup[key];
        if (found) return found;
        // Fallback: check if a property matches and auto-create a project
        // Copies financial + address data from the matching property so the
        // project doesn't show $0 across the board.
        const prop = propNameLookup[key];
        if (prop) {
          const contractAmt = prop.current_value ?? prop.purchase_price ?? null;
          const { data: newProj } = await supabase
            .from("projects")
            .insert({
              company_id: companyId,
              name: prop.name,
              status: "active",
              start_date: new Date().toISOString().split("T")[0],
              contract_amount: contractAmt,
              estimated_cost: prop.purchase_price ?? null,
              address_line1: prop.address_line1 ?? null,
              city: prop.city ?? null,
              state: prop.state ?? null,
              zip: prop.zip ?? null,
            })
            .select("id")
            .single();
          if (newProj) {
            projLookup[key] = newProj.id;
            return newProj.id;
          }
        }
      }
      if (r.project_code) {
        const found = projLookup[r.project_code.trim().toLowerCase()];
        if (found) return found;
      }
      if (body.project_id) return body.project_id as string;
      return null;
    }

    // ---- User profile lookup for UUID FK fields (assigned_to, reviewer, etc.) ----
    const NEEDS_USER_LOOKUP: AllowedEntity[] = [
      "rfis", "submittals", "maintenance", "equipment_assignments",
    ];
    let userNameLookup: Record<string, string> = {};
    if (NEEDS_USER_LOOKUP.includes(entity as AllowedEntity)) {
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
            purchase_cost: safeParseNumber(r.purchase_cost, 0, 0, 1e9),
            hourly_rate: safeParseNumber(r.hourly_rate, 0, 0, 1e6),
            purchase_date: r.purchase_date || null,
            last_maintenance_date: r.last_maintenance_date || null,
            next_maintenance_date: r.next_maintenance_date || null,
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
        for (let i = 0; i < rows.length; i++) {
          const r = rows[i];
          const pid = (await resolveProjectId(r)) || body.project_id;
          if (!pid) {
            errors.push(`Row ${i + 2}: could not resolve project`);
            continue;
          }
          const { error } = await supabase
            .from("project_budget_lines")
            .insert({
              company_id: companyId,
              project_id: pid,
              csi_code: r.csi_code || "",
              description: r.description || "",
              budgeted_amount: safeParseNumber(r.budgeted_amount, 0, -1e9, 1e9),
              committed_amount: safeParseNumber(r.committed_amount, 0, -1e9, 1e9),
              actual_amount: safeParseNumber(r.actual_amount, 0, -1e9, 1e9),
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
          const acctType = r.account_type || "expense";
          // Use upsert to handle existing accounts — if account_number already
          // exists for this company, update the name/type/etc. instead of failing.
          const { error } = await supabase.from("chart_of_accounts").upsert({
            company_id: companyId,
            account_number: r.account_number || "",
            name: r.name || "",
            account_type: acctType,
            sub_type: r.sub_type || null,
            normal_balance: r.normal_balance || (acctType === "asset" || acctType === "expense" ? "debit" : "credit"),
            description: r.description || null,
            is_active: true,
          }, { onConflict: "company_id,account_number" });
          if (error) {
            errors.push(`Row ${i + 2}: ${error.message}`);
          } else {
            successCount++;
          }
        }
        break;
      }

      case "daily_logs": {
        for (let i = 0; i < rows.length; i++) {
          const r = rows[i];
          const { error } = await supabase.from("daily_logs").insert({
            company_id: companyId,
            project_id: await resolveProjectId(r),
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
            project_id: await resolveProjectId(r),
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
            project_id: await resolveProjectId(r),
            co_number: r.co_number || `CO-${String(i + 1).padStart(3, "0")}`,
            title: r.title || "",
            description: r.description || null,
            reason: r.reason || null,
            status: r.status || "approved",
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
            project_id: await resolveProjectId(r),
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
        // Pre-fetch properties to resolve property_name to property_id
        const { data: leaseProps } = await supabase
          .from("properties")
          .select("id, name")
          .eq("company_id", companyId);
        const leasePropLookup = (leaseProps || []).reduce((acc, p) => {
          acc[p.name.trim().toLowerCase()] = p.id;
          return acc;
        }, {} as Record<string, string>);

        for (let i = 0; i < rows.length; i++) {
          const r = rows[i];
          let propertyId = r.property_id || null;
          if (!propertyId && r.property_name) {
            propertyId = leasePropLookup[r.property_name.trim().toLowerCase()] || null;
          }
          // Assign to first property as fallback
          if (!propertyId && leaseProps && leaseProps.length > 0) {
            propertyId = leaseProps[0].id;
          }
          if (!propertyId) {
            errors.push(`Row ${i + 2}: No property found. Create a property first.`);
            continue;
          }
          // Auto-create a unit if unit_id not provided
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
              errors.push(`Row ${i + 2}: Failed to create unit — ${unitError?.message}`);
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
          if (error) {
            errors.push(`Row ${i + 2}: ${error.message}`);
          } else {
            successCount++;
          }
        }

        // Recalculate property stats for all affected properties
        if (leaseProps && leaseProps.length > 0) {
          for (const prop of leaseProps) {
            const [propRes, unitsRes, leasesRes] = await Promise.all([
              supabase
                .from("properties")
                .select("total_units")
                .eq("id", prop.id)
                .single(),
              supabase
                .from("units")
                .select("id, status")
                .eq("company_id", companyId)
                .eq("property_id", prop.id),
              supabase
                .from("leases")
                .select("monthly_rent")
                .eq("company_id", companyId)
                .eq("property_id", prop.id)
                .eq("status", "active"),
            ]);
            const storedTotal = propRes.data?.total_units ?? 0;
            const units = unitsRes.data ?? [];
            const activeLeases = leasesRes.data ?? [];
            const occupiedCount = units.filter((u) => u.status === "occupied").length;
            const monthlyRevenue = activeLeases.reduce((sum, l) => sum + (l.monthly_rent ?? 0), 0);
            // Use the greater of unit records or stored total_units so properties
            // with vacant units (no unit record) still show correct capacity.
            const totalUnits = Math.max(units.length, storedTotal);
            const occupancyRate = totalUnits > 0 ? (occupiedCount / totalUnits) * 100 : 0;

            await supabase
              .from("properties")
              .update({
                total_units: totalUnits,
                occupied_units: occupiedCount,
                occupancy_rate: occupancyRate,
                monthly_revenue: monthlyRevenue,
                noi: monthlyRevenue,
              })
              .eq("id", prop.id);
          }
        }
        break;
      }

      case "maintenance": {
        // Pre-fetch properties to resolve property_name to property_id
        const { data: maintProps } = await supabase
          .from("properties")
          .select("id, name")
          .eq("company_id", companyId);
        const maintPropLookup = (maintProps || []).reduce((acc, p) => {
          acc[p.name.trim().toLowerCase()] = p.id;
          return acc;
        }, {} as Record<string, string>);

        for (let i = 0; i < rows.length; i++) {
          const r = rows[i];
          let propertyId = r.property_id || null;
          if (!propertyId && r.property_name) {
            propertyId = maintPropLookup[r.property_name.trim().toLowerCase()] || null;
          }
          // Assign to first property as fallback
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
            project_id: await resolveProjectId(r),
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
          const dateVal = r.scheduled_date || r.conducted_date || new Date().toISOString().split("T")[0];
          const { error } = await supabase.from("toolbox_talks").insert({
            company_id: companyId,
            talk_number: r.talk_number || `TBT-${String(i + 1).padStart(3, "0")}`,
            title: r.title || "",
            description: r.description || null,
            topic: r.topic || null,
            conducted_date: dateVal,
            scheduled_date: dateVal,
            project_id: await resolveProjectId(r),
            attendee_count: r.attendees_count || r.attendee_count ? parseInt(r.attendees_count || r.attendee_count) : null,
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
        // Pre-fetch equipment to resolve names to IDs
        const { data: assignEquipment } = await supabase
          .from("equipment")
          .select("id, name")
          .eq("company_id", companyId);
        const assignEquipLookup = (assignEquipment || []).reduce((acc, e) => {
          acc[e.name.trim().toLowerCase()] = e.id;
          return acc;
        }, {} as Record<string, string>);

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
          const projId = await resolveProjectId(r);
          // Try to resolve assigned_to: UUID > user profile name lookup > store name in notes
          const resolvedAssignee = resolveUserRef(r.assigned_to);
          const assignedName = (!resolvedAssignee && r.assigned_to) ? r.assigned_to : null;
          const assignNotes = [r.notes, assignedName ? `Assigned to: ${assignedName}` : null].filter(Boolean).join("; ");
          const { error } = await supabase.from("equipment_assignments").insert({
            company_id: companyId,
            equipment_id: equipId,
            project_id: projId,
            assigned_to: resolvedAssignee || userId,
            assigned_date: r.assigned_date || new Date().toISOString().split("T")[0],
            returned_date: r.return_date || null,
            notes: assignNotes || null,
            status: assignStatus,
          });
          if (error) {
            errors.push(`Row ${i + 2}: ${error.message}`);
          } else {
            successCount++;
            // Update equipment status based on assignment
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
        // Pre-fetch equipment to resolve names to IDs
        const { data: companyEquipment } = await supabase
          .from("equipment")
          .select("id, name")
          .eq("company_id", companyId);
        const equipLookup = (companyEquipment || []).reduce((acc, e) => {
          acc[e.name.trim().toLowerCase()] = e.id;
          return acc;
        }, {} as Record<string, string>);

        for (let i = 0; i < rows.length; i++) {
          const r = rows[i];
          // Resolve equipment_id from equipment_name if no UUID provided
          let equipId = r.equipment_id || null;
          if (!equipId && r.equipment_name) {
            equipId = equipLookup[r.equipment_name.trim().toLowerCase()] || null;
            if (!equipId) {
              errors.push(`Row ${i + 2}: Could not find equipment "${r.equipment_name}"`);
              continue;
            }
          }
          const { error } = await supabase.from("equipment_maintenance_logs").insert({
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
          if (error) {
            errors.push(`Row ${i + 2}: ${error.message}`);
          } else {
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

      case "bank_accounts": {
        for (let i = 0; i < rows.length; i++) {
          const r = rows[i];
          const balance = r.current_balance ? parseFloat(r.current_balance) : 0;
          const { data: inserted, error } = await supabase.from("bank_accounts").insert({
            company_id: companyId,
            name: r.name || "",
            bank_name: r.bank_name || "",
            account_type: r.account_type || "checking",
            account_number_last4: r.account_number_last4 || "",
            routing_number_last4: r.routing_number_last4 || "",
            current_balance: balance,
          }).select("id").single();
          if (error) {
            errors.push(`Row ${i + 2}: ${error.message}`);
          } else {
            successCount++;
            // Auto-link to GL account
            try {
              await ensureBankAccountGLLink(
                supabase, companyId, inserted.id,
                r.name || "", r.account_type || "checking",
                balance, userId
              );
            } catch (linkErr) {
              console.error(`GL linkage warning for bank "${r.name}":`, linkErr);
            }
          }
        }
        break;
      }

      case "time_entries": {
        for (let i = 0; i < rows.length; i++) {
          const r = rows[i];
          const { error } = await supabase.from("time_entries").insert({
            company_id: companyId,
            project_id: await resolveProjectId(r),
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
            contract_amount: r.contract_amount || r.budget ? parseFloat(r.contract_amount || r.budget) : null,
            estimated_cost: r.estimated_cost ? parseFloat(r.estimated_cost) : null,
            actual_cost: r.actual_cost ? parseFloat(r.actual_cost) : null,
            start_date: r.start_date || null,
            estimated_end_date: r.estimated_end_date || r.end_date || null,
            actual_end_date: r.actual_end_date || null,
            completion_pct: r.completion_pct ? parseFloat(r.completion_pct) : 0,
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
        // Build account map once for GL account resolution
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

        // Track paid invoices for payment JE generation (Phase 2: CRITICAL-3 fix)
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
          const projectId = await resolveProjectId(r);
          const invoiceType = (r.invoice_type || "receivable") as "payable" | "receivable";
          const subtotal = safeParseNumber(r.amount, 0, -1e9, 1e9);
          const taxAmount = safeParseNumber(r.tax_amount, 0, 0, 1e9);
          const totalAmount = subtotal + taxAmount;
          const status = r.status || "draft";

          // Resolve GL account: explicit column > auto-infer from description > null
          let glAccountId: string | null = null;
          if (r.gl_account) {
            // Explicit account number in CSV → resolve to account ID
            glAccountId = accountMap.byNumber[r.gl_account] || null;
          }
          if (!glAccountId) {
            // Auto-infer from description and vendor name
            const inferredNumber = inferGLAccountFromDescription(
              r.description || "",
              invoiceType,
              r.vendor_name
            );
            if (inferredNumber) {
              glAccountId = accountMap.byNumber[inferredNumber] || null;
            }
          }

          // Retainage fields
          const retainagePct = safeParseNumber(r.retainage_pct, 0, 0, 100);
          const retainageHeld = r.retainage_held
            ? safeParseNumber(r.retainage_held, 0, 0, 1e9)
            : retainagePct > 0 ? totalAmount * (retainagePct / 100) : 0;

          // For paid invoices: set amount_paid = total_amount
          const isPaid = status === "paid";
          const amountPaid = isPaid ? totalAmount : 0;

          const { data: inserted, error } = await supabase.from("invoices").insert({
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
            notes: body.generate_invoice_jes === true
              ? (r.description || null)
              : `csv-import:${r.description || ""}`,
            status,
            amount_paid: amountPaid,
            gl_account_id: glAccountId,
            retainage_pct: retainagePct,
            retainage_held: retainageHeld,
          }).select("id").single();

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

              // Track paid invoices for payment generation
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

        // Auto-generate invoice JEs only if explicitly requested.
        // CSV bulk imports should NOT auto-generate JEs — they cause double-counting
        // when a JE CSV is also imported. JEs should be imported explicitly.
        if (insertedInvoices.length > 0 && body.generate_invoice_jes === true) {
          try {
            const jeResult = await generateBulkInvoiceJournalEntries(
              supabase, companyId, userId, insertedInvoices
            );
            if (jeResult.errors.length > 0) {
              console.warn("Some invoice JEs skipped:", jeResult.errors);
            }
          } catch (jeErr) {
            console.warn("Bulk JE generation failed:", jeErr);
          }
        }

        // Phase 2: Generate payment records + payment JEs for paid invoices
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
            // Create a payment record
            const { data: payment, error: pmtErr } = await supabase.from("payments").insert({
              company_id: companyId,
              invoice_id: pi.invoiceId,
              payment_date: pi.due_date,
              amount: pi.total_amount,
              method: "imported",
              notes: body.generate_invoice_jes === true
                ? "Auto-generated from paid invoice import"
                : "csv-import:Auto-generated from paid invoice import",
            }).select("id").single();

            if (pmtErr) {
              console.warn(`Payment record failed for ${pi.invoice_number}:`, pmtErr.message);
            } else if (payment) {
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

          // Generate payment JEs only if explicitly requested (same as invoice JEs)
          if (paymentRecords.length > 0 && body.generate_invoice_jes === true) {
            try {
              const pmtJeResult = await generateBulkPaymentJournalEntries(
                supabase, companyId, userId, paymentRecords
              );
              if (pmtJeResult.errors.length > 0) {
                console.warn("Some payment JEs skipped:", pmtJeResult.errors);
              }
            } catch (pmtJeErr) {
              console.warn("Bulk payment JE generation failed:", pmtJeErr);
            }
          }

          // Sync bank balance only when auto-generating JEs (non-CSV workflow).
          // During CSV import, the bank_accounts CSV already has correct balances
          // and the GL balance comes from the JE CSV.
          if (body.generate_invoice_jes === true) {
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
                  cashAdjustment += pi.invoice_type === "payable" ? -pi.total_amount : pi.total_amount;
                }
                await supabase
                  .from("bank_accounts")
                  .update({ current_balance: defaultBank.current_balance + cashAdjustment })
                  .eq("id", defaultBank.id);
              }
            } catch (bankErr) {
              console.warn("Bank balance sync failed during import:", bankErr);
            }
          }
        }
        break;
      }

      case "safety_inspections": {
        for (let i = 0; i < rows.length; i++) {
          const r = rows[i];
          const { error } = await supabase.from("safety_inspections").insert({
            company_id: companyId,
            project_id: await resolveProjectId(r),
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

      case "submittals": {
        for (let i = 0; i < rows.length; i++) {
          const r = rows[i];

          // Auto-generate submittal number
          const { count: subCount } = await supabase
            .from("submittals")
            .select("id", { count: "exact", head: true })
            .eq("company_id", companyId);
          const subNum = (subCount ?? 0) + i + 1;

          const { error } = await supabase.from("submittals").insert({
            company_id: companyId,
            project_id: await resolveProjectId(r),
            submittal_number: r.submittal_number || `SUB-${String(subNum).padStart(3, "0")}`,
            title: r.title || "",
            spec_section: r.spec_section || null,
            due_date: r.due_date || null,
            submitted_by: userId,
            reviewer_id: resolveUserRef(r.reviewer || r.reviewer_id) || userId,
            review_comments: r.review_comments || null,
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
          if (error) {
            errors.push(`Row ${i + 2}: ${error.message}`);
          } else {
            successCount++;
          }
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
            errors.push(`Row ${i + 2}: Property "${r.property_name || ""}" not found. Import properties first.`);
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
          if (error) {
            errors.push(`Row ${i + 2}: ${error.message}`);
          } else {
            successCount++;
          }
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
              status: first.status || body.je_status || "posted",
              created_by: userId,
            })
            .select("id")
            .single();

          if (headerError || !entry) {
            errors.push(`Entry ${entryIdx}: ${headerError?.message || "Failed to create"}`);
            continue;
          }

          // Create journal entry lines — validate account lookups before inserting
          let linesFailed = false;
          for (let j = 0; j < entryRows.length; j++) {
            const line = entryRows[j];
            const accountId = line.account_id || (line.account_number ? acctLookup[line.account_number] : null) || null;
            if (!accountId) {
              errors.push(`Entry ${entryIdx}, Line ${j + 1}: Account "${line.account_number}" not found in Chart of Accounts`);
              linesFailed = true;
              continue;
            }
            const { error: lineError } = await supabase
              .from("journal_entry_lines")
              .insert({
                company_id: companyId,
                journal_entry_id: entry.id,
                account_id: accountId,
                debit: line.debit ? parseFloat(line.debit) : 0,
                credit: line.credit ? parseFloat(line.credit) : 0,
                description: line.line_description || null,
              });
            if (lineError) {
              errors.push(`Entry ${entryIdx}, Line ${j + 1}: ${lineError.message}`);
              linesFailed = true;
            }
          }
          if (!linesFailed) successCount++;
        }
        break;
      }

      case "phases": {
        // Per-row project resolution for multi-project CSVs
        const phaseSortMap: Record<string, number> = {};

        for (let i = 0; i < rows.length; i++) {
          const r = rows[i];
          const pid = (await resolveProjectId(r)) || body.project_id;
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
          if (error) {
            errors.push(`Row ${i + 2}: ${error.message}`);
          } else {
            successCount++;
          }
        }
        break;
      }

      case "tasks": {
        // Per-project phase lookups and sort counters for multi-project CSVs
        const taskPhaseLookup: Record<string, Record<string, string>> = {};
        const taskSortMap: Record<string, number> = {};
        const taskPhaseSortMap: Record<string, number> = {};
        const validPriorities = ["low", "medium", "high", "critical"];

        async function getCsvPhaseLookup(pid: string) {
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

        async function getCsvTaskSort(pid: string) {
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

        async function getCsvPhaseSort(pid: string) {
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
          const pid = (await resolveProjectId(r)) || body.project_id;
          if (!pid) {
            errors.push(`Row ${i + 2}: could not resolve project`);
            continue;
          }
          if (!r.name) {
            errors.push(`Row ${i + 2}: name is required`);
            continue;
          }
          const phases = await getCsvPhaseLookup(pid);
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
                  sort_order: await getCsvPhaseSort(pid),
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
            sort_order: await getCsvTaskSort(pid),
          });
          if (error) errors.push(`Row ${i + 2}: ${error.message}`);
          else successCount++;
        }
        break;
      }

      case "property_expenses": {
        // Resolve property_name → property_id
        const { data: expProps } = await supabase
          .from("properties")
          .select("id, name")
          .eq("company_id", companyId);
        const expPropLookup: Record<string, string> = {};
        for (const p of expProps ?? []) {
          expPropLookup[p.name.trim().toLowerCase()] = p.id;
        }

        const validTypes = [
          "cam", "property_tax", "insurance", "utilities",
          "management_fee", "capital_expense", "hoa_fee",
          "marketing", "legal", "other",
        ];
        const validFreqs = ["one_time", "monthly", "quarterly", "semi_annual", "annual"];

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
            errors.push(`Row ${i + 2}: No property found.`);
            continue;
          }
          const expType = (r.expense_type || "other").toLowerCase();
          if (!validTypes.includes(expType)) {
            errors.push(`Row ${i + 2}: Invalid expense_type "${r.expense_type}". Use: ${validTypes.join(", ")}`);
            continue;
          }
          const freq = (r.frequency || "monthly").toLowerCase();
          const { error } = await supabase.from("property_expenses").insert({
            company_id: companyId,
            property_id: propertyId,
            expense_type: expType,
            description: r.description || null,
            amount: r.amount ? parseFloat(r.amount) : 0,
            frequency: validFreqs.includes(freq) ? freq : "monthly",
            effective_date: r.effective_date || null,
            end_date: r.end_date || null,
            vendor_name: r.vendor_name || null,
            notes: r.notes || null,
          });
          if (error) {
            errors.push(`Row ${i + 2}: ${error.message}`);
          } else {
            successCount++;
          }
        }
        break;
      }

      case "estimates": {
        for (let i = 0; i < rows.length; i++) {
          const r = rows[i];
          const estNum = r.estimate_number || `EST-${String(i + 1).padStart(4, "0")}`;
          const { error } = await supabase.from("estimates").insert({
            company_id: companyId,
            project_id: await resolveProjectId(r),
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
    }

    // Auto-sync property financials after lease or maintenance imports
    if (
      (entity === "leases" || entity === "maintenance" || entity === "property_expenses") &&
      successCount > 0
    ) {
      try {
        await syncPropertyFinancials(supabase, companyId);
      } catch {
        // Non-blocking: don't fail the import if sync fails
      }
    }

    // Auto-generate missing journal entries after importing financial entities
    const JE_ENTITIES = [
      "invoices", "change_orders", "leases", "maintenance",
      "equipment", "equipment_maintenance",
    ];
    if (JE_ENTITIES.includes(entity) && successCount > 0) {
      try {
        await backfillMissingJournalEntries(supabase, companyId, userId);
      } catch {
        // Non-blocking: don't fail the import if backfill fails
      }
    }

    // Audit log (fire-and-forget)
    const { ipAddress } = extractRequestMeta(request);
    logAuditEvent({
      supabase,
      companyId,
      userId,
      action: "import_data",
      entityType: entity,
      details: { total: rows.length, success: successCount, errors: errors.length },
      ipAddress,
    });

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
