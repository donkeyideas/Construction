import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";

const ALLOWED_EMAIL = "beltran_alain@yahoo.com";

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

  // Delete in dependency order (children first)
  const tables = [
    "payroll_items",
    "payroll_runs",
    "employee_pay_rates",
    "payroll_deductions",
    "payroll_tax_config",
    "journal_entry_lines",
    "journal_entries",
    "payments",
    "invoices",
    "change_orders",
    "project_phases",
    "rfis",
    "submittals",
    "daily_logs",
    "time_entries",
    "equipment_assignments",
    "equipment_maintenance",
    "equipment",
    "safety_incidents",
    "safety_inspections",
    "toolbox_talks",
    "certifications",
    "documents",
    "drawing_sets",
    "opportunities",
    "bids",
    "contacts",
    "leases",
    "maintenance_requests",
    "properties",
    "projects",
    "bank_accounts",
    "chart_of_accounts",
    "automation_rules",
    "automation_logs",
    "import_runs",
  ];

  const results: { table: string; deleted: number; error?: string }[] = [];

  for (const table of tables) {
    const { count, error } = await supabase
      .from(table)
      .delete({ count: "exact" })
      .eq("company_id", companyId);

    results.push({
      table,
      deleted: count ?? 0,
      error: error?.message,
    });
  }

  return NextResponse.json({
    success: true,
    companyId,
    results: results.filter((r) => r.deleted > 0 || r.error),
  });
}
