import { streamText } from "ai";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getProviderForTask } from "@/lib/ai/provider-router";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ReportType =
  | "project_status"
  | "financial_summary"
  | "safety_compliance"
  | "executive_brief";

interface RequestBody {
  companyId: string;
  reportType: ReportType;
  projectId: string;
  startDate: string;
  endDate: string;
}

const VALID_REPORT_TYPES: ReportType[] = [
  "project_status",
  "financial_summary",
  "safety_compliance",
  "executive_brief",
];

// ---------------------------------------------------------------------------
// POST /api/ai/generate-report - Stream an AI-generated report
// ---------------------------------------------------------------------------

export async function POST(req: Request) {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = (await req.json()) as RequestBody;
  const { companyId, reportType, projectId, startDate, endDate } = body;

  // Validate required fields
  if (!companyId || !reportType || !projectId || !startDate || !endDate) {
    return new Response(
      JSON.stringify({ error: "Missing required fields: companyId, reportType, projectId, startDate, endDate" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Validate report type
  if (!VALID_REPORT_TYPES.includes(reportType)) {
    return new Response(
      JSON.stringify({ error: `Invalid reportType. Must be one of: ${VALID_REPORT_TYPES.join(", ")}` }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Verify company ownership
  if (companyId !== userCompany.companyId) {
    return new Response("Forbidden", { status: 403 });
  }

  // Get the AI provider
  const providerResult = await getProviderForTask(supabase, companyId, "chat");

  if (!providerResult) {
    return new Response(
      JSON.stringify({ error: "No AI provider configured. Go to Administration > AI Providers to set one up." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Build project filter
  const projectFilter = projectId !== "all" ? projectId : null;

  // Fetch data based on report type
  let contextData: string;
  try {
    contextData = await fetchReportData(
      supabase,
      companyId,
      reportType,
      projectFilter,
      startDate,
      endDate
    );
  } catch (err: unknown) {
    console.error("generate-report data fetch error:", err);
    return new Response(
      JSON.stringify({ error: "Failed to fetch report data" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  // Build prompts
  const today = new Date().toISOString().slice(0, 10);
  const reportLabel = getReportLabel(reportType);

  const systemPrompt = `You are a senior construction industry analyst for ${userCompany.companyName}. You write professional, data-driven reports for executive stakeholders, project managers, and financial officers.

Today's date: ${today}
Report period: ${startDate} to ${endDate}
Company: ${userCompany.companyName}

## FORMATTING RULES
- Write a professional report with clear section headings using markdown (## for main sections, ### for subsections)
- Include an Executive Summary at the top (2-3 sentences)
- Present Key Metrics in markdown table format where appropriate
- Provide a Detailed Analysis section with specific data points
- Include Risk Factors if any are identified in the data
- End with Recommendations (numbered list) and Next Steps
- Format all dollar amounts as currency ($1,234,567)
- Format percentages to one decimal place (85.3%)
- Use bold for key metrics and important callouts
- Be analytical, not just descriptive — interpret the data and identify trends
- Do not invent data that is not provided — if data is missing, note it as unavailable
- Use professional construction industry terminology
- Keep the tone formal and authoritative`;

  const userPrompt = `Generate a comprehensive ${reportLabel} for ${userCompany.companyName}.
${projectFilter ? "This report is scoped to a specific project." : "This report covers all company projects."}
Report period: ${startDate} to ${endDate}

Here is the current data from the company's systems:

${contextData}

Generate the full ${reportLabel} now. Include:
1. Executive Summary
2. Key Metrics (in table format)
3. Detailed Analysis
4. Risk Factors
5. Recommendations
6. Next Steps`;

  // Stream the AI response
  let result;
  try {
    result = streamText({
      model: providerResult.model,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });
  } catch (err: unknown) {
    console.error("AI generate-report streamText error:", err);
    const msg =
      err instanceof Error ? err.message : "Unknown AI provider error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }

  return result.toTextStreamResponse();
}

// ---------------------------------------------------------------------------
// Report label mapping
// ---------------------------------------------------------------------------

function getReportLabel(reportType: ReportType): string {
  switch (reportType) {
    case "project_status":
      return "Project Status Report";
    case "financial_summary":
      return "Financial Summary Report";
    case "safety_compliance":
      return "Safety Compliance Report";
    case "executive_brief":
      return "Executive Dashboard Brief";
    default:
      return "Report";
  }
}

// ---------------------------------------------------------------------------
// Data fetching for each report type
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any;

async function fetchReportData(
  supabase: SupabaseClient,
  companyId: string,
  reportType: ReportType,
  projectId: string | null,
  startDate: string,
  endDate: string
): Promise<string> {
  switch (reportType) {
    case "project_status":
      return fetchProjectStatusData(supabase, companyId, projectId, startDate, endDate);
    case "financial_summary":
      return fetchFinancialSummaryData(supabase, companyId, projectId, startDate, endDate);
    case "safety_compliance":
      return fetchSafetyComplianceData(supabase, companyId, projectId, startDate, endDate);
    case "executive_brief":
      return fetchExecutiveBriefData(supabase, companyId, projectId, startDate, endDate);
    default:
      return "No data available for this report type.";
  }
}

// ---------------------------------------------------------------------------
// Project Status Data
// ---------------------------------------------------------------------------

async function fetchProjectStatusData(
  supabase: SupabaseClient,
  companyId: string,
  projectId: string | null,
  startDate: string,
  endDate: string
): Promise<string> {
  // Projects
  let projectQuery = supabase
    .from("projects")
    .select("id, name, code, status, contract_amount, estimated_cost, actual_cost, completion_percentage, start_date, end_date, client_name, project_type")
    .eq("company_id", companyId)
    .order("name");
  if (projectId) projectQuery = projectQuery.eq("id", projectId);

  // Daily logs
  let logsQuery = supabase
    .from("daily_logs")
    .select("id, project_id, log_date, weather, summary, workers_count")
    .eq("company_id", companyId)
    .gte("log_date", startDate)
    .lte("log_date", endDate)
    .order("log_date", { ascending: false })
    .limit(50);
  if (projectId) logsQuery = logsQuery.eq("project_id", projectId);

  // RFIs
  let rfisQuery = supabase
    .from("rfis")
    .select("id, rfi_number, subject, status, priority, date_submitted, date_required")
    .eq("company_id", companyId)
    .order("date_submitted", { ascending: false })
    .limit(30);
  if (projectId) rfisQuery = rfisQuery.eq("project_id", projectId);

  // Change orders
  let cosQuery = supabase
    .from("change_orders")
    .select("id, co_number, title, status, amount, change_order_type, date_submitted")
    .eq("company_id", companyId)
    .order("date_submitted", { ascending: false })
    .limit(30);
  if (projectId) cosQuery = cosQuery.eq("project_id", projectId);

  // Tasks
  let tasksQuery = supabase
    .from("tasks")
    .select("id, name, status, priority, progress_pct, start_date, end_date")
    .eq("company_id", companyId)
    .limit(50);
  if (projectId) tasksQuery = tasksQuery.eq("project_id", projectId);

  const [projectsRes, logsRes, rfisRes, cosRes, tasksRes] = await Promise.all([
    projectQuery,
    logsQuery,
    rfisQuery,
    cosQuery,
    tasksQuery,
  ]);

  const projects = projectsRes.data ?? [];
  const logs = logsRes.data ?? [];
  const rfis = rfisRes.data ?? [];
  const cos = cosRes.data ?? [];
  const tasks = tasksRes.data ?? [];

  const sections: string[] = [];

  // Projects summary
  sections.push("=== PROJECTS ===");
  if (projects.length === 0) {
    sections.push("No projects found.");
  } else {
    for (const p of projects) {
      sections.push(
        `Project: ${p.name} (${p.code || "N/A"}) | Status: ${p.status} | Type: ${p.project_type || "N/A"}\n` +
        `  Client: ${p.client_name || "N/A"} | Contract: $${Number(p.contract_amount || 0).toLocaleString()} | Estimated Cost: $${Number(p.estimated_cost || 0).toLocaleString()}\n` +
        `  Actual Cost: $${Number(p.actual_cost || 0).toLocaleString()} | Completion: ${Number(p.completion_percentage || 0)}%\n` +
        `  Start: ${p.start_date || "N/A"} | End: ${p.end_date || "N/A"}`
      );
    }
  }

  // Daily logs summary
  sections.push("\n=== DAILY LOGS (Recent) ===");
  sections.push(`Total daily logs in period: ${logs.length}`);
  for (const log of logs.slice(0, 10)) {
    sections.push(
      `Date: ${log.log_date} | Workers: ${log.workers_count ?? "N/A"} | Weather: ${log.weather || "N/A"}\n` +
      `  Summary: ${log.summary ? log.summary.substring(0, 200) : "N/A"}`
    );
  }

  // RFIs
  sections.push("\n=== RFIs ===");
  sections.push(`Total RFIs: ${rfis.length}`);
  const rfisByStatus: Record<string, number> = {};
  for (const rfi of rfis) {
    rfisByStatus[rfi.status] = (rfisByStatus[rfi.status] || 0) + 1;
  }
  sections.push(`By status: ${JSON.stringify(rfisByStatus)}`);
  for (const rfi of rfis.slice(0, 10)) {
    sections.push(`RFI ${rfi.rfi_number}: ${rfi.subject} | Status: ${rfi.status} | Priority: ${rfi.priority || "N/A"}`);
  }

  // Change orders
  sections.push("\n=== CHANGE ORDERS ===");
  sections.push(`Total change orders: ${cos.length}`);
  const totalCOAmount = cos.reduce((s: number, c: { amount?: number }) => s + Number(c.amount || 0), 0);
  sections.push(`Total CO value: $${totalCOAmount.toLocaleString()}`);
  const cosByStatus: Record<string, number> = {};
  for (const co of cos) {
    cosByStatus[co.status] = (cosByStatus[co.status] || 0) + 1;
  }
  sections.push(`By status: ${JSON.stringify(cosByStatus)}`);
  for (const co of cos.slice(0, 10)) {
    sections.push(`CO ${co.co_number}: ${co.title} | Status: ${co.status} | Amount: $${Number(co.amount || 0).toLocaleString()} | Type: ${co.change_order_type || "N/A"}`);
  }

  // Tasks
  sections.push("\n=== TASKS ===");
  sections.push(`Total tasks: ${tasks.length}`);
  const tasksByStatus: Record<string, number> = {};
  for (const t of tasks) {
    tasksByStatus[t.status] = (tasksByStatus[t.status] || 0) + 1;
  }
  sections.push(`By status: ${JSON.stringify(tasksByStatus)}`);
  const avgProgress = tasks.length > 0
    ? tasks.reduce((s: number, t: { progress_pct?: number }) => s + Number(t.progress_pct || 0), 0) / tasks.length
    : 0;
  sections.push(`Average task progress: ${avgProgress.toFixed(1)}%`);

  return sections.join("\n");
}

// ---------------------------------------------------------------------------
// Financial Summary Data
// ---------------------------------------------------------------------------

async function fetchFinancialSummaryData(
  supabase: SupabaseClient,
  companyId: string,
  projectId: string | null,
  startDate: string,
  endDate: string
): Promise<string> {
  // Invoices
  let invoicesQuery = supabase
    .from("invoices")
    .select("id, invoice_number, invoice_type, status, total_amount, balance_due, tax_amount, due_date, paid_date, client_name, vendor_name")
    .eq("company_id", companyId)
    .order("due_date", { ascending: false })
    .limit(100);
  if (projectId) invoicesQuery = invoicesQuery.eq("project_id", projectId);

  // Budget lines
  let budgetQuery = supabase
    .from("budget_lines")
    .select("id, description, budgeted_amount, actual_amount, category")
    .eq("company_id", companyId)
    .limit(100);
  if (projectId) budgetQuery = budgetQuery.eq("project_id", projectId);

  // Bank accounts
  const bankQuery = supabase
    .from("bank_accounts")
    .select("id, account_name, account_type, current_balance")
    .eq("company_id", companyId);

  // Projects for financial context
  let projectQuery = supabase
    .from("projects")
    .select("id, name, code, contract_amount, estimated_cost, actual_cost, completion_percentage")
    .eq("company_id", companyId);
  if (projectId) projectQuery = projectQuery.eq("id", projectId);

  const [invoicesRes, budgetRes, bankRes, projectsRes] = await Promise.all([
    invoicesQuery,
    budgetQuery,
    bankQuery,
    projectQuery,
  ]);

  const invoices = invoicesRes.data ?? [];
  const budgetLines = budgetRes.data ?? [];
  const bankAccounts = bankRes.data ?? [];
  const projects = projectsRes.data ?? [];

  const sections: string[] = [];

  // Bank accounts
  sections.push("=== BANK ACCOUNTS ===");
  const totalCash = bankAccounts.reduce((s: number, b: { current_balance?: number }) => s + Number(b.current_balance || 0), 0);
  sections.push(`Total cash position: $${totalCash.toLocaleString()}`);
  for (const b of bankAccounts) {
    sections.push(`  ${b.account_name} (${b.account_type}): $${Number(b.current_balance || 0).toLocaleString()}`);
  }

  // Invoice summary
  sections.push("\n=== INVOICES ===");
  sections.push(`Total invoices: ${invoices.length}`);

  const receivables = invoices.filter((i: { invoice_type: string }) => i.invoice_type === "receivable");
  const payables = invoices.filter((i: { invoice_type: string }) => i.invoice_type === "payable");

  const totalAR = receivables
    .filter((i: { status: string }) => ["sent", "overdue", "partial"].includes(i.status))
    .reduce((s: number, i: { balance_due?: number }) => s + Number(i.balance_due || 0), 0);
  const totalAP = payables
    .filter((i: { status: string }) => ["sent", "overdue", "partial"].includes(i.status))
    .reduce((s: number, i: { balance_due?: number }) => s + Number(i.balance_due || 0), 0);
  const overdueInvoices = invoices.filter((i: { status: string }) => i.status === "overdue");
  const totalOverdue = overdueInvoices.reduce((s: number, i: { balance_due?: number }) => s + Number(i.balance_due || 0), 0);
  const paidInvoices = invoices.filter((i: { status: string }) => i.status === "paid");
  const totalPaidAmount = paidInvoices.reduce((s: number, i: { total_amount?: number }) => s + Number(i.total_amount || 0), 0);

  sections.push(`Accounts Receivable (outstanding): $${totalAR.toLocaleString()}`);
  sections.push(`Accounts Payable (outstanding): $${totalAP.toLocaleString()}`);
  sections.push(`Net AR/AP position: $${(totalAR - totalAP).toLocaleString()}`);
  sections.push(`Overdue invoices: ${overdueInvoices.length} totaling $${totalOverdue.toLocaleString()}`);
  sections.push(`Paid invoices: ${paidInvoices.length} totaling $${totalPaidAmount.toLocaleString()}`);

  // Invoice status breakdown
  const invoicesByStatus: Record<string, number> = {};
  for (const inv of invoices) {
    invoicesByStatus[inv.status] = (invoicesByStatus[inv.status] || 0) + 1;
  }
  sections.push(`Invoice status breakdown: ${JSON.stringify(invoicesByStatus)}`);

  // Budget lines
  sections.push("\n=== BUDGET ===");
  if (budgetLines.length === 0) {
    sections.push("No budget lines found.");
  } else {
    const totalBudgeted = budgetLines.reduce((s: number, b: { budgeted_amount?: number }) => s + Number(b.budgeted_amount || 0), 0);
    const totalActual = budgetLines.reduce((s: number, b: { actual_amount?: number }) => s + Number(b.actual_amount || 0), 0);
    sections.push(`Total budgeted: $${totalBudgeted.toLocaleString()}`);
    sections.push(`Total actual: $${totalActual.toLocaleString()}`);
    sections.push(`Variance: $${(totalBudgeted - totalActual).toLocaleString()} (${totalBudgeted > 0 ? ((totalActual / totalBudgeted) * 100).toFixed(1) : "0"}% utilized)`);

    for (const bl of budgetLines.slice(0, 20)) {
      const pct = Number(bl.budgeted_amount || 0) > 0
        ? ((Number(bl.actual_amount || 0) / Number(bl.budgeted_amount || 0)) * 100).toFixed(1)
        : "N/A";
      sections.push(`  ${bl.description || bl.category || "N/A"}: Budgeted $${Number(bl.budgeted_amount || 0).toLocaleString()} / Actual $${Number(bl.actual_amount || 0).toLocaleString()} (${pct}%)`);
    }
  }

  // Project financials
  sections.push("\n=== PROJECT FINANCIALS ===");
  for (const p of projects) {
    const variance = Number(p.estimated_cost || 0) - Number(p.actual_cost || 0);
    sections.push(
      `${p.name} (${p.code || "N/A"}): Contract $${Number(p.contract_amount || 0).toLocaleString()} | ` +
      `Est. Cost $${Number(p.estimated_cost || 0).toLocaleString()} | Actual $${Number(p.actual_cost || 0).toLocaleString()} | ` +
      `Variance $${variance.toLocaleString()} | ${Number(p.completion_percentage || 0)}% complete`
    );
  }

  return sections.join("\n");
}

// ---------------------------------------------------------------------------
// Safety Compliance Data
// ---------------------------------------------------------------------------

async function fetchSafetyComplianceData(
  supabase: SupabaseClient,
  companyId: string,
  projectId: string | null,
  startDate: string,
  endDate: string
): Promise<string> {
  // Incidents
  let incidentsQuery = supabase
    .from("safety_incidents")
    .select("id, incident_number, title, incident_type, severity, status, incident_date, location, osha_recordable, root_cause, corrective_action, days_away, days_restricted")
    .eq("company_id", companyId)
    .gte("incident_date", startDate)
    .lte("incident_date", endDate)
    .order("incident_date", { ascending: false })
    .limit(50);
  if (projectId) incidentsQuery = incidentsQuery.eq("project_id", projectId);

  // Inspections
  let inspectionsQuery = supabase
    .from("safety_inspections")
    .select("id, inspection_number, inspection_type, status, score, inspector_name, inspection_date, findings, corrective_actions_required")
    .eq("company_id", companyId)
    .gte("inspection_date", startDate)
    .lte("inspection_date", endDate)
    .order("inspection_date", { ascending: false })
    .limit(50);
  if (projectId) inspectionsQuery = inspectionsQuery.eq("project_id", projectId);

  // Toolbox talks
  let talksQuery = supabase
    .from("toolbox_talks")
    .select("id, talk_number, title, topic, conducted_date, duration_minutes, attendee_count, status")
    .eq("company_id", companyId)
    .gte("conducted_date", startDate)
    .lte("conducted_date", endDate)
    .order("conducted_date", { ascending: false })
    .limit(50);
  if (projectId) talksQuery = talksQuery.eq("project_id", projectId);

  // Certifications
  const certsQuery = supabase
    .from("certifications")
    .select("id, person_name, certification_name, cert_type, expiry_date, status")
    .eq("company_id", companyId)
    .order("expiry_date", { ascending: true })
    .limit(50);

  const [incidentsRes, inspectionsRes, talksRes, certsRes] = await Promise.all([
    incidentsQuery,
    inspectionsQuery,
    talksQuery,
    certsQuery,
  ]);

  const incidents = incidentsRes.data ?? [];
  const inspections = inspectionsRes.data ?? [];
  const talks = talksRes.data ?? [];
  const certs = certsRes.data ?? [];

  const sections: string[] = [];

  // Incidents
  sections.push("=== SAFETY INCIDENTS ===");
  sections.push(`Total incidents in period: ${incidents.length}`);
  const bySeverity: Record<string, number> = {};
  let oshaRecordable = 0;
  let totalDaysAway = 0;
  let totalDaysRestricted = 0;
  for (const inc of incidents) {
    bySeverity[inc.severity] = (bySeverity[inc.severity] || 0) + 1;
    if (inc.osha_recordable) oshaRecordable++;
    totalDaysAway += Number(inc.days_away || 0);
    totalDaysRestricted += Number(inc.days_restricted || 0);
  }
  sections.push(`By severity: ${JSON.stringify(bySeverity)}`);
  sections.push(`OSHA recordable: ${oshaRecordable}`);
  sections.push(`Total days away from work: ${totalDaysAway}`);
  sections.push(`Total days restricted duty: ${totalDaysRestricted}`);

  for (const inc of incidents.slice(0, 15)) {
    sections.push(
      `Incident ${inc.incident_number}: ${inc.title} | Severity: ${inc.severity} | Type: ${inc.incident_type || "N/A"}\n` +
      `  Date: ${inc.incident_date} | Location: ${inc.location || "N/A"} | Status: ${inc.status} | OSHA: ${inc.osha_recordable ? "Yes" : "No"}\n` +
      `  Root Cause: ${inc.root_cause ? inc.root_cause.substring(0, 150) : "N/A"}\n` +
      `  Corrective Action: ${inc.corrective_action ? inc.corrective_action.substring(0, 150) : "N/A"}`
    );
  }

  // Inspections
  sections.push("\n=== SAFETY INSPECTIONS ===");
  sections.push(`Total inspections in period: ${inspections.length}`);
  const avgScore = inspections.length > 0
    ? inspections.reduce((s: number, i: { score?: number }) => s + Number(i.score || 0), 0) / inspections.length
    : 0;
  sections.push(`Average inspection score: ${avgScore.toFixed(1)}`);
  const inspWithFindings = inspections.filter((i: { findings?: string }) => i.findings && i.findings.length > 0).length;
  sections.push(`Inspections with findings: ${inspWithFindings}`);

  for (const insp of inspections.slice(0, 10)) {
    sections.push(
      `Inspection ${insp.inspection_number}: ${insp.inspection_type || "General"} | Score: ${insp.score ?? "N/A"} | Date: ${insp.inspection_date}\n` +
      `  Inspector: ${insp.inspector_name || "N/A"} | Status: ${insp.status}\n` +
      `  Findings: ${insp.findings ? String(insp.findings).substring(0, 150) : "None"}`
    );
  }

  // Toolbox talks
  sections.push("\n=== TOOLBOX TALKS ===");
  sections.push(`Total talks in period: ${talks.length}`);
  const totalAttendees = talks.reduce((s: number, t: { attendee_count?: number }) => s + Number(t.attendee_count || 0), 0);
  const totalMinutes = talks.reduce((s: number, t: { duration_minutes?: number }) => s + Number(t.duration_minutes || 0), 0);
  sections.push(`Total attendees: ${totalAttendees}`);
  sections.push(`Total training minutes: ${totalMinutes}`);

  for (const talk of talks.slice(0, 10)) {
    sections.push(`Talk ${talk.talk_number}: ${talk.title} | Topic: ${talk.topic || "N/A"} | Date: ${talk.conducted_date} | Attendees: ${talk.attendee_count ?? "N/A"}`);
  }

  // Certifications
  sections.push("\n=== CERTIFICATIONS ===");
  sections.push(`Total certifications on file: ${certs.length}`);
  const now = new Date();
  const expiringSoon = certs.filter((c: { expiry_date?: string }) => {
    if (!c.expiry_date) return false;
    const exp = new Date(c.expiry_date);
    const daysUntil = Math.floor((exp.getTime() - now.getTime()) / 86400000);
    return daysUntil >= 0 && daysUntil <= 90;
  });
  const expired = certs.filter((c: { expiry_date?: string }) => {
    if (!c.expiry_date) return false;
    return new Date(c.expiry_date) < now;
  });
  sections.push(`Expiring within 90 days: ${expiringSoon.length}`);
  sections.push(`Already expired: ${expired.length}`);

  for (const cert of expiringSoon) {
    sections.push(`  EXPIRING: ${cert.person_name} - ${cert.certification_name} (expires ${cert.expiry_date})`);
  }
  for (const cert of expired) {
    sections.push(`  EXPIRED: ${cert.person_name} - ${cert.certification_name} (expired ${cert.expiry_date})`);
  }

  return sections.join("\n");
}

// ---------------------------------------------------------------------------
// Executive Brief Data (combination of all)
// ---------------------------------------------------------------------------

async function fetchExecutiveBriefData(
  supabase: SupabaseClient,
  companyId: string,
  projectId: string | null,
  startDate: string,
  endDate: string
): Promise<string> {
  // Fetch a mix of all data categories in parallel
  let projectQuery = supabase
    .from("projects")
    .select("id, name, code, status, contract_amount, estimated_cost, actual_cost, completion_percentage, start_date, end_date")
    .eq("company_id", companyId)
    .order("name");
  if (projectId) projectQuery = projectQuery.eq("id", projectId);

  let invoicesQuery = supabase
    .from("invoices")
    .select("id, invoice_type, status, total_amount, balance_due, due_date")
    .eq("company_id", companyId)
    .limit(200);
  if (projectId) invoicesQuery = invoicesQuery.eq("project_id", projectId);

  let incidentsQuery = supabase
    .from("safety_incidents")
    .select("id, severity, status, osha_recordable, incident_date")
    .eq("company_id", companyId)
    .gte("incident_date", startDate)
    .lte("incident_date", endDate);
  if (projectId) incidentsQuery = incidentsQuery.eq("project_id", projectId);

  let rfisQuery = supabase
    .from("rfis")
    .select("id, status")
    .eq("company_id", companyId)
    .limit(100);
  if (projectId) rfisQuery = rfisQuery.eq("project_id", projectId);

  let cosQuery = supabase
    .from("change_orders")
    .select("id, status, amount")
    .eq("company_id", companyId)
    .limit(100);
  if (projectId) cosQuery = cosQuery.eq("project_id", projectId);

  const bankQuery = supabase
    .from("bank_accounts")
    .select("id, current_balance")
    .eq("company_id", companyId);

  const inspectionsQuery = supabase
    .from("safety_inspections")
    .select("id, score")
    .eq("company_id", companyId)
    .gte("inspection_date", startDate)
    .lte("inspection_date", endDate);

  const [projectsRes, invoicesRes, incidentsRes, rfisRes, cosRes, bankRes, inspRes] =
    await Promise.all([
      projectQuery,
      invoicesQuery,
      incidentsQuery,
      rfisQuery,
      cosQuery,
      bankQuery,
      inspectionsQuery,
    ]);

  const projects = projectsRes.data ?? [];
  const invoices = invoicesRes.data ?? [];
  const incidents = incidentsRes.data ?? [];
  const rfis = rfisRes.data ?? [];
  const cos = cosRes.data ?? [];
  const bankAccounts = bankRes.data ?? [];
  const inspections = inspRes.data ?? [];

  const sections: string[] = [];

  // Portfolio overview
  sections.push("=== PORTFOLIO OVERVIEW ===");
  sections.push(`Total projects: ${projects.length}`);
  const statusCounts: Record<string, number> = {};
  for (const p of projects) {
    statusCounts[p.status] = (statusCounts[p.status] || 0) + 1;
  }
  sections.push(`By status: ${JSON.stringify(statusCounts)}`);
  const totalContractValue = projects.reduce((s: number, p: { contract_amount?: number }) => s + Number(p.contract_amount || 0), 0);
  const totalEstimatedCost = projects.reduce((s: number, p: { estimated_cost?: number }) => s + Number(p.estimated_cost || 0), 0);
  const totalActualCost = projects.reduce((s: number, p: { actual_cost?: number }) => s + Number(p.actual_cost || 0), 0);
  const avgCompletion = projects.length > 0
    ? projects.reduce((s: number, p: { completion_percentage?: number }) => s + Number(p.completion_percentage || 0), 0) / projects.length
    : 0;
  sections.push(`Total contract value: $${totalContractValue.toLocaleString()}`);
  sections.push(`Total estimated cost: $${totalEstimatedCost.toLocaleString()}`);
  sections.push(`Total actual cost: $${totalActualCost.toLocaleString()}`);
  sections.push(`Cost variance: $${(totalEstimatedCost - totalActualCost).toLocaleString()}`);
  sections.push(`Average completion: ${avgCompletion.toFixed(1)}%`);

  const overBudget = projects.filter(
    (p: { actual_cost?: number; estimated_cost?: number }) =>
      Number(p.actual_cost || 0) > Number(p.estimated_cost || 0)
  );
  if (overBudget.length > 0) {
    sections.push(`Projects over budget: ${overBudget.length}`);
    for (const p of overBudget) {
      const over = Number(p.actual_cost || 0) - Number(p.estimated_cost || 0);
      sections.push(`  ${p.name}: $${over.toLocaleString()} over budget`);
    }
  }

  // Financial snapshot
  sections.push("\n=== FINANCIAL SNAPSHOT ===");
  const totalCash = bankAccounts.reduce((s: number, b: { current_balance?: number }) => s + Number(b.current_balance || 0), 0);
  sections.push(`Cash position: $${totalCash.toLocaleString()}`);

  const receivables = invoices.filter((i: { invoice_type: string }) => i.invoice_type === "receivable");
  const payables = invoices.filter((i: { invoice_type: string }) => i.invoice_type === "payable");
  const arOutstanding = receivables
    .filter((i: { status: string }) => ["sent", "overdue", "partial"].includes(i.status))
    .reduce((s: number, i: { balance_due?: number }) => s + Number(i.balance_due || 0), 0);
  const apOutstanding = payables
    .filter((i: { status: string }) => ["sent", "overdue", "partial"].includes(i.status))
    .reduce((s: number, i: { balance_due?: number }) => s + Number(i.balance_due || 0), 0);
  const overdueCount = invoices.filter((i: { status: string }) => i.status === "overdue").length;

  sections.push(`Accounts receivable: $${arOutstanding.toLocaleString()}`);
  sections.push(`Accounts payable: $${apOutstanding.toLocaleString()}`);
  sections.push(`Net AR/AP: $${(arOutstanding - apOutstanding).toLocaleString()}`);
  sections.push(`Overdue invoices: ${overdueCount}`);

  // RFIs and Change Orders
  sections.push("\n=== RFIs & CHANGE ORDERS ===");
  const openRfis = rfis.filter((r: { status: string }) => r.status !== "closed" && r.status !== "cancelled").length;
  sections.push(`Total RFIs: ${rfis.length} (${openRfis} open)`);

  const totalCOAmount = cos.reduce((s: number, c: { amount?: number }) => s + Number(c.amount || 0), 0);
  const approvedCOs = cos.filter((c: { status: string }) => c.status === "approved");
  const pendingCOs = cos.filter((c: { status: string }) => c.status === "pending" || c.status === "submitted");
  sections.push(`Total change orders: ${cos.length} (value: $${totalCOAmount.toLocaleString()})`);
  sections.push(`Approved COs: ${approvedCOs.length} | Pending COs: ${pendingCOs.length}`);

  // Safety summary
  sections.push("\n=== SAFETY SUMMARY ===");
  sections.push(`Incidents in period: ${incidents.length}`);
  const sevBuckets: Record<string, number> = {};
  let oshaCount = 0;
  for (const inc of incidents) {
    sevBuckets[inc.severity] = (sevBuckets[inc.severity] || 0) + 1;
    if (inc.osha_recordable) oshaCount++;
  }
  sections.push(`By severity: ${JSON.stringify(sevBuckets)}`);
  sections.push(`OSHA recordable: ${oshaCount}`);

  const avgInspScore = inspections.length > 0
    ? inspections.reduce((s: number, i: { score?: number }) => s + Number(i.score || 0), 0) / inspections.length
    : 0;
  sections.push(`Inspections: ${inspections.length} | Average score: ${avgInspScore.toFixed(1)}`);

  return sections.join("\n");
}
