import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import AlertsClient from "./AlertsClient";

export const metadata = { title: "Smart Alerts - Buildwrk" };

export default async function AlertsPage() {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    redirect("/register");
  }

  const { companyId } = userCompany;
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const todayStr = now.toISOString().slice(0, 10);

  // Fetch all anomaly detection data in parallel
  const [
    invoicesResult,
    journalEntriesResult,
    budgetLinesResult,
    unpostedJEsResult,
    expiringCertsResult,
    overdueRfisResult,
    pendingCOsResult,
    overdueEquipmentResult,
    overdueTasksResult,
  ] = await Promise.all([
    // 1. All non-draft invoices (to find ones without JEs)
    supabase
      .from("invoices")
      .select("id, invoice_number, total_amount, status")
      .eq("company_id", companyId)
      .neq("status", "draft"),

    // 2. All journal entries with invoice references (to cross-reference)
    supabase
      .from("journal_entries")
      .select("reference")
      .eq("company_id", companyId)
      .like("reference", "invoice:%"),

    // 3. Budget lines with project info where spending > 90%
    supabase
      .from("project_budget_lines")
      .select("id, project_id, description, budgeted_amount, actual_amount, projects(name)")
      .eq("company_id", companyId)
      .gt("budgeted_amount", 0),

    // 4. Unposted journal entries older than 7 days
    supabase
      .from("journal_entries")
      .select("id, entry_number, entry_date, status, created_at")
      .eq("company_id", companyId)
      .eq("status", "draft")
      .lt("created_at", sevenDaysAgo),

    // 5. Certifications expiring within 30 days
    supabase
      .from("certifications")
      .select("id, certification_name, expiry_date, contacts(first_name, last_name)")
      .eq("company_id", companyId)
      .gte("expiry_date", todayStr)
      .lte("expiry_date", thirtyDaysFromNow),

    // 6. Overdue RFIs (open for > 7 days)
    supabase
      .from("rfis")
      .select("id, rfi_number, subject, status, created_at")
      .eq("company_id", companyId)
      .eq("status", "open")
      .lt("created_at", sevenDaysAgo),

    // 7. Pending change orders older than 14 days
    supabase
      .from("change_orders")
      .select("id, co_number, amount, status, created_at")
      .eq("company_id", companyId)
      .in("status", ["pending", "submitted"])
      .lt("created_at", fourteenDaysAgo),

    // 8. Overdue equipment maintenance
    supabase
      .from("equipment")
      .select("id, name, next_maintenance_date")
      .eq("company_id", companyId)
      .lt("next_maintenance_date", todayStr),

    // 9. Overdue tasks (not completed, past end_date)
    supabase
      .from("project_tasks")
      .select("id, name, status, end_date, project_id, projects(name)")
      .eq("company_id", companyId)
      .neq("status", "completed")
      .lt("end_date", todayStr),
  ]);

  // --- Process: Invoices without journal entries ---
  const allInvoices = invoicesResult.data ?? [];
  const jeReferences = new Set(
    (journalEntriesResult.data ?? []).map((je) => je.reference as string)
  );
  const invoicesWithoutJE = allInvoices.filter(
    (inv) => !jeReferences.has(`invoice:${inv.id}`)
  );

  // --- Process: Budget lines > 90% ---
  const budgetLines = budgetLinesResult.data ?? [];
  const budgetsOver90 = budgetLines
    .filter((bl) => {
      const pct = (bl.actual_amount / bl.budgeted_amount) * 100;
      return pct > 90;
    })
    .map((bl) => {
      const project = bl.projects as unknown as { name: string } | null;
      return {
        projectName: project?.name ?? bl.description,
        budgeted: bl.budgeted_amount,
        actual: bl.actual_amount,
        pct: Math.round((bl.actual_amount / bl.budgeted_amount) * 1000) / 10,
      };
    });

  // --- Process: Unposted JEs (calculate total_debit from lines if needed) ---
  const unpostedJEs = (unpostedJEsResult.data ?? []).map((je) => {
    const createdAt = new Date(je.created_at);
    const daysInDraft = Math.ceil(
      (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );
    return {
      id: je.id,
      entry_number: je.entry_number,
      entry_date: je.entry_date,
      total_debit: 0, // Will be enriched on client if needed
      daysInDraft,
    };
  });

  // --- Process: Expiring certifications ---
  const expiringCerts = (expiringCertsResult.data ?? []).map((cert) => {
    const contact = cert.contacts as unknown as {
      first_name: string | null;
      last_name: string | null;
    } | null;
    const personName = contact
      ? `${contact.first_name ?? ""} ${contact.last_name ?? ""}`.trim()
      : "Unknown";
    return {
      personName,
      certName: cert.certification_name ?? "Certification",
      expiresAt: cert.expiry_date,
    };
  });

  // --- Process: Overdue RFIs ---
  const overdueRFIs = (overdueRfisResult.data ?? []).map((rfi) => {
    const createdAt = new Date(rfi.created_at);
    const daysPending = Math.ceil(
      (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );
    return {
      id: rfi.id,
      rfi_number: rfi.rfi_number ?? "N/A",
      subject: rfi.subject ?? "",
      daysPending,
    };
  });

  // --- Process: Pending change orders ---
  const pendingCOs = (pendingCOsResult.data ?? []).map((co) => {
    const createdAt = new Date(co.created_at);
    const daysPending = Math.ceil(
      (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );
    return {
      id: co.id,
      co_number: co.co_number ?? "N/A",
      amount: co.amount ?? 0,
      daysPending,
    };
  });

  // --- Process: Overdue equipment ---
  const overdueEquipment = (overdueEquipmentResult.data ?? [])
    .filter((eq) => eq.next_maintenance_date)
    .map((eq) => {
      const maintDate = new Date(eq.next_maintenance_date);
      const daysPastDue = Math.ceil(
        (now.getTime() - maintDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      return {
        id: eq.id,
        name: eq.name ?? "Unknown Equipment",
        daysPastDue,
      };
    });

  // --- Process: Overdue tasks ---
  const overdueTasks = (overdueTasksResult.data ?? [])
    .filter((t) => t.end_date)
    .map((t) => {
      const endDate = new Date(t.end_date);
      const daysOverdue = Math.ceil(
        (now.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      const project = t.projects as unknown as { name: string } | null;
      return {
        id: t.id,
        taskName: t.name ?? "Unnamed Task",
        projectName: project?.name ?? "Unknown Project",
        daysOverdue,
      };
    });

  return (
    <AlertsClient
      invoicesWithoutJE={invoicesWithoutJE}
      budgetsOver90Pct={budgetsOver90}
      unpostedJEs={unpostedJEs}
      expiringCerts={expiringCerts}
      overdueRFIs={overdueRFIs}
      pendingCOs={pendingCOs}
      overdueEquipment={overdueEquipment}
      overdueTasks={overdueTasks}
    />
  );
}
