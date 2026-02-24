import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserCompany } from "@/lib/queries/user";

const ALLOWED_EMAIL = "beltran_alain@yahoo.com";

/**
 * Paginated delete — Supabase PostgREST limits DELETE to 1000 rows per call.
 * Loop until all matching rows are gone so tables with >1000 rows are fully cleared.
 */
async function deleteAllRows(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adminSb: any,
  table: string,
  companyId: string
): Promise<{ deleted: number; error?: string }> {
  let totalDeleted = 0;

  for (let attempt = 0; attempt < 100; attempt++) {
    const { count, error } = await adminSb
      .from(table)
      .delete({ count: "exact" })
      .eq("company_id", companyId);

    if (error) {
      return { deleted: totalDeleted, error: error.message };
    }

    const batch = count ?? 0;
    totalDeleted += batch;

    // If fewer than 1000 deleted, we got them all
    if (batch < 1000) break;
  }

  return { deleted: totalDeleted };
}

export async function DELETE() {
  const supabase = await createClient();

  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== ALLOWED_EMAIL) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const userCompany = await getCurrentUserCompany(supabase);
  if (!userCompany) {
    return NextResponse.json({ error: "No company found" }, { status: 404 });
  }

  const companyId = userCompany.companyId;

  // Use admin client to bypass RLS
  const adminSb = createAdminClient();

  // Delete in dependency order (children first, parents last).
  // Every table with a company_id column must be listed here.
  // Tables referencing other tables via FK must come BEFORE the referenced table.
  const tables = [
    // Payroll children
    "payroll_items",
    "payroll_runs",
    "employee_pay_rates",
    "payroll_deductions",
    "payroll_tax_config",
    // Journal entries (children first)
    "journal_entry_lines",
    "journal_entries",
    // Financial
    "payments",
    "invoices",
    "bank_reconciliations",
    "bank_transactions",
    // Contracts (must come before contacts & projects — FK to both)
    "contract_milestones",
    "contracts",
    // Project children
    "project_tasks",
    "change_orders",
    "project_phases",
    "project_budget_lines",
    "rfis",
    "submittals",
    "daily_logs",
    // Time & clock
    "clock_events",
    "time_entries",
    // Equipment
    "equipment_assignments",
    "equipment_maintenance",
    "equipment_maintenance_logs",
    "equipment",
    // Safety
    "safety_incidents",
    "safety_inspections",
    "toolbox_talks",
    "certifications",
    // Documents
    "markup_annotations",
    "drawing_sets",
    "document_folders",
    "documents",
    "vendor_documents",
    "tenant_documents",
    // Estimates
    "estimate_line_items",
    "estimate_assemblies",
    "estimates",
    // CRM
    "opportunities",
    "bids",
    // AI
    "ai_usage_log",
    "ai_conversations",
    "ai_provider_configs",
    // Comments
    "comments",
    // People
    "contacts",
    // Properties (children first)
    "property_expenses",
    "property_payment_methods",
    "leases",
    "maintenance_requests",
    "tenant_announcements",
    "units",
    "properties",
    // Projects (after all project-referencing tables)
    "projects",
    // Finance parent tables
    "bank_accounts",
    "chart_of_accounts",
    // Messaging & tickets
    "notifications",
    "messages",
    "tickets",
    "support_ticket_messages",
    "support_tickets",
    // Portal & auth related
    "portal_invitations",
    "login_history",
    "active_sessions",
    // System
    "automation_rules",
    "automation_logs",
    "import_runs",
    "audit_logs",
    "audit_log",
    "payment_webhook_events",
    "payment_gateway_config",
    "integrations",
    "security_settings",
    "feature_flags",
    "promo_code_redemptions",
    "promo_codes",
    "asset_library",
  ];

  const results: { table: string; deleted: number; error?: string }[] = [];

  for (const table of tables) {
    try {
      const result = await deleteAllRows(adminSb, table, companyId);

      if (result.error) {
        results.push({ table, deleted: result.deleted, error: result.error });
      } else if (result.deleted > 0) {
        results.push({ table, deleted: result.deleted });
      }
    } catch {
      // Table may not exist yet — skip silently
    }
  }

  return NextResponse.json({
    success: true,
    companyId,
    results,
  });
}
