import { streamText } from "ai";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getProviderForTask } from "@/lib/ai/provider-router";
import { logAIUsage } from "@/lib/queries/ai";
import {
  getFinancialOverview,
  getIncomeStatement,
  getBalanceSheet,
  getAgingBuckets,
} from "@/lib/queries/financial";

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

  if (!companyId || !reportType || !projectId || !startDate || !endDate) {
    return new Response(
      JSON.stringify({ error: "Missing required fields: companyId, reportType, projectId, startDate, endDate" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!VALID_REPORT_TYPES.includes(reportType)) {
    return new Response(
      JSON.stringify({ error: `Invalid reportType. Must be one of: ${VALID_REPORT_TYPES.join(", ")}` }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  if (companyId !== userCompany.companyId) {
    return new Response("Forbidden", { status: 403 });
  }

  const providerResult = await getProviderForTask(supabase, companyId, "chat");

  if (!providerResult) {
    return new Response(
      JSON.stringify({ error: "No AI provider configured. Go to Administration > AI Providers to set one up." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const projectFilter = projectId !== "all" ? projectId : null;

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

  const today = new Date().toISOString().slice(0, 10);
  const reportLabel = getReportLabel(reportType);

  const systemPrompt = `You are a senior construction industry analyst for ${userCompany.companyName}. You write professional, data-driven reports for executive stakeholders.

Today's date: ${today}
Report period: ${startDate} to ${endDate}
Company: ${userCompany.companyName}

FORMATTING RULES:
- Use markdown headings (## for sections, ### for subsections)
- Present key metrics in markdown tables
- Format dollar amounts as currency ($1,234,567)
- Format percentages to one decimal place (85.3%)
- Use **bold** for important figures and callouts
- Be analytical — interpret data and identify trends
- Do NOT invent data — if data is missing, note it as "not available"
- Use professional construction industry terminology
- Keep the tone formal and authoritative`;

  const userPrompt = `Generate a comprehensive ${reportLabel} for ${userCompany.companyName}.
${projectFilter ? "This report is scoped to a specific project." : "This report covers all company projects."}
Report period: ${startDate} to ${endDate}

Here is the current data from the company's systems:

${contextData}

Generate the full ${reportLabel} with these sections:
1. Executive Summary (2-3 sentences)
2. Key Metrics (table format)
3. Detailed Analysis
4. Risk Factors
5. Recommendations
6. Next Steps`;

  let result;
  try {
    result = streamText({
      model: providerResult.model,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });
  } catch (err: unknown) {
    console.error("AI generate-report streamText error:", err);
    const msg = err instanceof Error ? err.message : "Unknown AI provider error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Fire-and-forget: log usage after stream completes
  const pConfig = providerResult.config;
  Promise.resolve(result.usage).then(async (usage) => {
    const inputTokens = usage.inputTokens ?? 0;
    const outputTokens = usage.outputTokens ?? 0;
    const rates: Record<string, { input: number; output: number }> = {
      openai: { input: 0.005, output: 0.015 },
      anthropic: { input: 0.003, output: 0.015 },
      google: { input: 0.00025, output: 0.0005 },
      groq: { input: 0.0005, output: 0.0005 },
      mistral: { input: 0.001, output: 0.003 },
      deepseek: { input: 0.001, output: 0.002 },
    };
    const r = rates[pConfig.provider_name] ?? { input: 0.005, output: 0.015 };
    const estimatedCost = (inputTokens * r.input + outputTokens * r.output) / 1000;

    await logAIUsage(supabase, {
      company_id: companyId,
      provider_name: pConfig.provider_name,
      user_id: userCompany.userId,
      task_type: "report",
      model_id: pConfig.model_id,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      estimated_cost: Math.round(estimatedCost * 10000) / 10000,
    });
  }).catch((err) => {
    console.error("Failed to log report usage:", err);
  });

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
// Helpers
// ---------------------------------------------------------------------------

function fmtDollar(n: number): string {
  return `$${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseArg = any;

// ---------------------------------------------------------------------------
// Data fetching for each report type
// ---------------------------------------------------------------------------

async function fetchReportData(
  supabase: SupabaseArg,
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
  supabase: SupabaseArg,
  companyId: string,
  projectId: string | null,
  startDate: string,
  endDate: string
): Promise<string> {
  let projectQuery = supabase
    .from("projects")
    .select("id, name, code, status, contract_amount, estimated_cost, actual_cost, completion_percentage, start_date, end_date, client_name, project_type")
    .eq("company_id", companyId)
    .order("name");
  if (projectId) projectQuery = projectQuery.eq("id", projectId);

  let logsQuery = supabase
    .from("daily_logs")
    .select("id, project_id, log_date, weather, summary, workers_count")
    .eq("company_id", companyId)
    .gte("log_date", startDate)
    .lte("log_date", endDate)
    .order("log_date", { ascending: false })
    .limit(50);
  if (projectId) logsQuery = logsQuery.eq("project_id", projectId);

  let rfisQuery = supabase
    .from("rfis")
    .select("id, rfi_number, subject, status, priority, date_submitted, date_required")
    .eq("company_id", companyId)
    .order("date_submitted", { ascending: false })
    .limit(50);
  if (projectId) rfisQuery = rfisQuery.eq("project_id", projectId);

  let cosQuery = supabase
    .from("change_orders")
    .select("id, co_number, title, status, amount, change_order_type, date_submitted")
    .eq("company_id", companyId)
    .order("date_submitted", { ascending: false })
    .limit(50);
  if (projectId) cosQuery = cosQuery.eq("project_id", projectId);

  let tasksQuery = supabase
    .from("tasks")
    .select("id, name, status, priority, progress_pct, start_date, end_date")
    .eq("company_id", companyId)
    .limit(100);
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

  sections.push("=== PROJECTS ===");
  if (projects.length === 0) {
    sections.push("No projects found.");
  } else {
    const totalContractValue = projects.reduce((s: number, p: { contract_amount?: number }) => s + Number(p.contract_amount || 0), 0);
    const totalActualCost = projects.reduce((s: number, p: { actual_cost?: number }) => s + Number(p.actual_cost || 0), 0);
    sections.push(`Total projects: ${projects.length}`);
    sections.push(`Total contract value: ${fmtDollar(totalContractValue)}`);
    sections.push(`Total actual cost: ${fmtDollar(totalActualCost)}`);
    for (const p of projects) {
      sections.push(
        `Project: ${p.name} (${p.code || "N/A"}) | Status: ${p.status} | Type: ${p.project_type || "N/A"}\n` +
        `  Client: ${p.client_name || "N/A"} | Contract: ${fmtDollar(Number(p.contract_amount || 0))} | Est. Cost: ${fmtDollar(Number(p.estimated_cost || 0))}\n` +
        `  Actual Cost: ${fmtDollar(Number(p.actual_cost || 0))} | Completion: ${Number(p.completion_percentage || 0)}%\n` +
        `  Start: ${p.start_date || "N/A"} | End: ${p.end_date || "N/A"}`
      );
    }
  }

  sections.push("\n=== DAILY LOGS (Recent) ===");
  sections.push(`Total daily logs in period: ${logs.length}`);
  for (const log of logs.slice(0, 10)) {
    sections.push(
      `Date: ${log.log_date} | Workers: ${log.workers_count ?? "N/A"} | Weather: ${log.weather || "N/A"}\n` +
      `  Summary: ${log.summary ? log.summary.substring(0, 200) : "N/A"}`
    );
  }

  sections.push("\n=== RFIs ===");
  sections.push(`Total RFIs: ${rfis.length}`);
  const rfisByStatus: Record<string, number> = {};
  for (const rfi of rfis) rfisByStatus[rfi.status] = (rfisByStatus[rfi.status] || 0) + 1;
  for (const [status, count] of Object.entries(rfisByStatus)) sections.push(`  ${status}: ${count}`);
  for (const rfi of rfis.slice(0, 10)) {
    sections.push(`RFI ${rfi.rfi_number}: ${rfi.subject} | Status: ${rfi.status} | Priority: ${rfi.priority || "N/A"}`);
  }

  sections.push("\n=== CHANGE ORDERS ===");
  sections.push(`Total change orders: ${cos.length}`);
  const totalCOAmount = cos.reduce((s: number, c: { amount?: number }) => s + Number(c.amount || 0), 0);
  sections.push(`Total CO value: ${fmtDollar(totalCOAmount)}`);
  const cosByStatus: Record<string, number> = {};
  for (const co of cos) cosByStatus[co.status] = (cosByStatus[co.status] || 0) + 1;
  for (const [status, count] of Object.entries(cosByStatus)) sections.push(`  ${status}: ${count}`);
  for (const co of cos.slice(0, 10)) {
    sections.push(`CO ${co.co_number}: ${co.title} | Status: ${co.status} | Amount: ${fmtDollar(Number(co.amount || 0))} | Type: ${co.change_order_type || "N/A"}`);
  }

  sections.push("\n=== TASKS ===");
  sections.push(`Total tasks: ${tasks.length}`);
  const tasksByStatus: Record<string, number> = {};
  for (const t of tasks) tasksByStatus[t.status] = (tasksByStatus[t.status] || 0) + 1;
  for (const [status, count] of Object.entries(tasksByStatus)) sections.push(`  ${status}: ${count}`);
  const avgProgress = tasks.length > 0
    ? tasks.reduce((s: number, t: { progress_pct?: number }) => s + Number(t.progress_pct || 0), 0) / tasks.length
    : 0;
  sections.push(`Average task progress: ${avgProgress.toFixed(1)}%`);

  return sections.join("\n");
}

// ---------------------------------------------------------------------------
// Financial Summary Data — uses proven financial query functions
// ---------------------------------------------------------------------------

async function fetchFinancialSummaryData(
  supabase: SupabaseArg,
  companyId: string,
  projectId: string | null,
  startDate: string,
  endDate: string
): Promise<string> {
  // Use the proven financial query functions that handle pagination and JE data
  const [overview, incomeStatement, balanceSheet, agingData, projectsRaw, budgetRaw] = await Promise.all([
    getFinancialOverview(supabase, companyId),
    getIncomeStatement(supabase, companyId, startDate, endDate),
    getBalanceSheet(supabase, companyId, endDate),
    getAgingBuckets(supabase, companyId),
    supabase
      .from("projects")
      .select("id, name, code, contract_amount, estimated_cost, actual_cost, completion_percentage")
      .eq("company_id", companyId)
      .order("name"),
    supabase
      .from("budget_lines")
      .select("id, description, budgeted_amount, actual_amount, category")
      .eq("company_id", companyId)
      .limit(100),
  ]);

  const allProjects = projectsRaw.data ?? [];
  const projectsRes = projectId ? allProjects.filter((p: { id: string }) => p.id === projectId) : allProjects;
  const budgetRes = budgetRaw.data ?? [];

  const sections: string[] = [];

  // Cash Position
  sections.push("=== CASH POSITION ===");
  sections.push(`Total cash position: ${fmtDollar(overview.cashPosition)}`);

  // Income Statement
  sections.push("\n=== INCOME STATEMENT (for report period) ===");
  sections.push(`Total Revenue: ${fmtDollar(incomeStatement.revenue.total)}`);
  for (const acct of incomeStatement.revenue.accounts) {
    sections.push(`  ${acct.account_number} ${acct.name}: ${fmtDollar(acct.amount)}`);
  }
  sections.push(`Total Cost of Construction: ${fmtDollar(incomeStatement.costOfConstruction.total)}`);
  for (const acct of incomeStatement.costOfConstruction.accounts) {
    sections.push(`  ${acct.account_number} ${acct.name}: ${fmtDollar(acct.amount)}`);
  }
  sections.push(`Gross Profit: ${fmtDollar(incomeStatement.grossProfit)}`);
  sections.push(`Total Operating Expenses: ${fmtDollar(incomeStatement.operatingExpenses.total)}`);
  for (const acct of incomeStatement.operatingExpenses.accounts) {
    sections.push(`  ${acct.account_number} ${acct.name}: ${fmtDollar(acct.amount)}`);
  }
  sections.push(`Net Income: ${fmtDollar(incomeStatement.netIncome)}`);
  const grossMargin = incomeStatement.revenue.total > 0
    ? ((incomeStatement.grossProfit / incomeStatement.revenue.total) * 100).toFixed(1)
    : "N/A";
  const netMargin = incomeStatement.revenue.total > 0
    ? ((incomeStatement.netIncome / incomeStatement.revenue.total) * 100).toFixed(1)
    : "N/A";
  sections.push(`Gross Margin: ${grossMargin}%`);
  sections.push(`Net Profit Margin: ${netMargin}%`);

  // Balance Sheet
  sections.push("\n=== BALANCE SHEET (as of end date) ===");
  sections.push(`Total Assets: ${fmtDollar(balanceSheet.assets.total)}`);
  for (const acct of balanceSheet.assets.accounts.slice(0, 15)) {
    sections.push(`  ${acct.account_number} ${acct.name}: ${fmtDollar(acct.amount)}`);
  }
  sections.push(`Total Liabilities: ${fmtDollar(balanceSheet.liabilities.total)}`);
  for (const acct of balanceSheet.liabilities.accounts.slice(0, 10)) {
    sections.push(`  ${acct.account_number} ${acct.name}: ${fmtDollar(acct.amount)}`);
  }
  sections.push(`Total Equity: ${fmtDollar(balanceSheet.equity.total)}`);
  sections.push(`Balance Check: Assets ${fmtDollar(balanceSheet.assets.total)} = L+E ${fmtDollar(balanceSheet.totalLiabilitiesAndEquity)} (${balanceSheet.isBalanced ? "BALANCED" : "UNBALANCED"})`);

  // AR / AP
  sections.push("\n=== ACCOUNTS RECEIVABLE / PAYABLE ===");
  sections.push(`Accounts Receivable (outstanding): ${fmtDollar(overview.totalAR)}`);
  sections.push(`Accounts Payable (outstanding): ${fmtDollar(overview.totalAP)}`);
  sections.push(`Net AR/AP position: ${fmtDollar(overview.totalAR - overview.totalAP)}`);

  // Aging
  if (agingData && agingData.length > 0) {
    sections.push("\nAR Aging Buckets:");
    for (const bucket of agingData) {
      sections.push(`  ${bucket.label}: ${fmtDollar(bucket.arAmount)}`);
    }
    sections.push("AP Aging Buckets:");
    for (const bucket of agingData) {
      sections.push(`  ${bucket.label}: ${fmtDollar(bucket.apAmount)}`);
    }
  }

  // Revenue this month
  sections.push(`\nRevenue this month: ${fmtDollar(overview.revenueThisMonth)}`);
  sections.push(`Expenses this month: ${fmtDollar(overview.expensesThisMonth)}`);

  // Budget
  if (budgetRes.length > 0) {
    sections.push("\n=== BUDGET PERFORMANCE ===");
    const totalBudgeted = budgetRes.reduce((s: number, b: { budgeted_amount?: number }) => s + Number(b.budgeted_amount || 0), 0);
    const totalActual = budgetRes.reduce((s: number, b: { actual_amount?: number }) => s + Number(b.actual_amount || 0), 0);
    sections.push(`Total budgeted: ${fmtDollar(totalBudgeted)}`);
    sections.push(`Total actual: ${fmtDollar(totalActual)}`);
    sections.push(`Variance: ${fmtDollar(totalBudgeted - totalActual)} (${totalBudgeted > 0 ? ((totalActual / totalBudgeted) * 100).toFixed(1) : "0"}% utilized)`);
    for (const bl of budgetRes.slice(0, 20)) {
      sections.push(`  ${bl.description || bl.category || "N/A"}: Budget ${fmtDollar(Number(bl.budgeted_amount || 0))} / Actual ${fmtDollar(Number(bl.actual_amount || 0))}`);
    }
  }

  // Project financials
  if (projectsRes.length > 0) {
    sections.push("\n=== PROJECT FINANCIALS ===");
    for (const p of projectsRes) {
      const variance = Number(p.estimated_cost || 0) - Number(p.actual_cost || 0);
      sections.push(
        `${p.name} (${p.code || "N/A"}): Contract ${fmtDollar(Number(p.contract_amount || 0))} | ` +
        `Est. Cost ${fmtDollar(Number(p.estimated_cost || 0))} | Actual ${fmtDollar(Number(p.actual_cost || 0))} | ` +
        `Variance ${fmtDollar(variance)} | ${Number(p.completion_percentage || 0)}% complete`
      );
    }
  }

  return sections.join("\n");
}

// ---------------------------------------------------------------------------
// Safety Compliance Data
// ---------------------------------------------------------------------------

async function fetchSafetyComplianceData(
  supabase: SupabaseArg,
  companyId: string,
  projectId: string | null,
  startDate: string,
  endDate: string
): Promise<string> {
  let incidentsQuery = supabase
    .from("safety_incidents")
    .select("id, incident_number, title, incident_type, severity, status, incident_date, location, osha_recordable, root_cause, corrective_action, days_away, days_restricted")
    .eq("company_id", companyId)
    .gte("incident_date", startDate)
    .lte("incident_date", endDate)
    .order("incident_date", { ascending: false })
    .limit(50);
  if (projectId) incidentsQuery = incidentsQuery.eq("project_id", projectId);

  let inspectionsQuery = supabase
    .from("safety_inspections")
    .select("id, inspection_number, inspection_type, status, score, inspector_name, inspection_date, findings, corrective_actions_required")
    .eq("company_id", companyId)
    .gte("inspection_date", startDate)
    .lte("inspection_date", endDate)
    .order("inspection_date", { ascending: false })
    .limit(50);
  if (projectId) inspectionsQuery = inspectionsQuery.eq("project_id", projectId);

  let talksQuery = supabase
    .from("toolbox_talks")
    .select("id, talk_number, title, topic, conducted_date, duration_minutes, attendee_count, status")
    .eq("company_id", companyId)
    .gte("conducted_date", startDate)
    .lte("conducted_date", endDate)
    .order("conducted_date", { ascending: false })
    .limit(50);
  if (projectId) talksQuery = talksQuery.eq("project_id", projectId);

  const certsQuery = supabase
    .from("certifications")
    .select("id, cert_name, cert_type, expiry_date, status, contacts(first_name, last_name)")
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
  for (const [sev, count] of Object.entries(bySeverity)) sections.push(`  ${sev}: ${count}`);
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

  sections.push("\n=== TOOLBOX TALKS ===");
  sections.push(`Total talks in period: ${talks.length}`);
  const totalAttendees = talks.reduce((s: number, t: { attendee_count?: number }) => s + Number(t.attendee_count || 0), 0);
  const totalMinutes = talks.reduce((s: number, t: { duration_minutes?: number }) => s + Number(t.duration_minutes || 0), 0);
  sections.push(`Total attendees: ${totalAttendees}`);
  sections.push(`Total training minutes: ${totalMinutes}`);

  for (const talk of talks.slice(0, 10)) {
    sections.push(`Talk ${talk.talk_number}: ${talk.title} | Topic: ${talk.topic || "N/A"} | Date: ${talk.conducted_date} | Attendees: ${talk.attendee_count ?? "N/A"}`);
  }

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
    const contact = cert.contacts as unknown as { first_name?: string; last_name?: string } | null;
    const personName = contact ? `${contact.first_name ?? ""} ${contact.last_name ?? ""}`.trim() || "Unknown" : "Unknown";
    sections.push(`  EXPIRING: ${personName} - ${cert.cert_name ?? cert.cert_type ?? "Certification"} (expires ${cert.expiry_date})`);
  }
  for (const cert of expired) {
    const contact = cert.contacts as unknown as { first_name?: string; last_name?: string } | null;
    const personName = contact ? `${contact.first_name ?? ""} ${contact.last_name ?? ""}`.trim() || "Unknown" : "Unknown";
    sections.push(`  EXPIRED: ${personName} - ${cert.cert_name ?? cert.cert_type ?? "Certification"} (expired ${cert.expiry_date})`);
  }

  return sections.join("\n");
}

// ---------------------------------------------------------------------------
// Executive Brief Data — combines all areas using proven functions
// ---------------------------------------------------------------------------

async function fetchExecutiveBriefData(
  supabase: SupabaseArg,
  companyId: string,
  projectId: string | null,
  startDate: string,
  endDate: string
): Promise<string> {
  const [overview, incomeStatement, balanceSheet] = await Promise.all([
    getFinancialOverview(supabase, companyId),
    getIncomeStatement(supabase, companyId, startDate, endDate),
    getBalanceSheet(supabase, companyId, endDate),
  ]);

  let projectQuery = supabase
    .from("projects")
    .select("id, name, code, status, contract_amount, estimated_cost, actual_cost, completion_percentage, start_date, end_date")
    .eq("company_id", companyId)
    .order("name");
  if (projectId) projectQuery = projectQuery.eq("id", projectId);

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
    .limit(200);
  if (projectId) rfisQuery = rfisQuery.eq("project_id", projectId);

  let cosQuery = supabase
    .from("change_orders")
    .select("id, status, amount")
    .eq("company_id", companyId)
    .limit(200);
  if (projectId) cosQuery = cosQuery.eq("project_id", projectId);

  const inspectionsQuery = supabase
    .from("safety_inspections")
    .select("id, score")
    .eq("company_id", companyId)
    .gte("inspection_date", startDate)
    .lte("inspection_date", endDate);

  const [projectsRes, incidentsRes, rfisRes, cosRes, inspRes] = await Promise.all([
    projectQuery,
    incidentsQuery,
    rfisQuery,
    cosQuery,
    inspectionsQuery,
  ]);

  const projects = projectsRes.data ?? [];
  const incidents = incidentsRes.data ?? [];
  const rfis = rfisRes.data ?? [];
  const cos = cosRes.data ?? [];
  const inspections = inspRes.data ?? [];

  const sections: string[] = [];

  // Portfolio overview
  sections.push("=== PORTFOLIO OVERVIEW ===");
  sections.push(`Total projects: ${projects.length}`);
  const statusCounts: Record<string, number> = {};
  for (const p of projects) statusCounts[p.status] = (statusCounts[p.status] || 0) + 1;
  for (const [status, count] of Object.entries(statusCounts)) sections.push(`  ${status}: ${count}`);

  const totalContractValue = projects.reduce((s: number, p: { contract_amount?: number }) => s + Number(p.contract_amount || 0), 0);
  const totalEstimatedCost = projects.reduce((s: number, p: { estimated_cost?: number }) => s + Number(p.estimated_cost || 0), 0);
  const totalActualCost = projects.reduce((s: number, p: { actual_cost?: number }) => s + Number(p.actual_cost || 0), 0);
  const avgCompletion = projects.length > 0
    ? projects.reduce((s: number, p: { completion_percentage?: number }) => s + Number(p.completion_percentage || 0), 0) / projects.length
    : 0;
  sections.push(`Total contract value: ${fmtDollar(totalContractValue)}`);
  sections.push(`Total estimated cost: ${fmtDollar(totalEstimatedCost)}`);
  sections.push(`Total actual cost: ${fmtDollar(totalActualCost)}`);
  sections.push(`Cost variance: ${fmtDollar(totalEstimatedCost - totalActualCost)}`);
  sections.push(`Average completion: ${avgCompletion.toFixed(1)}%`);

  const overBudget = projects.filter(
    (p: { actual_cost?: number; estimated_cost?: number }) =>
      Number(p.actual_cost || 0) > Number(p.estimated_cost || 0)
  );
  if (overBudget.length > 0) {
    sections.push(`Projects over budget: ${overBudget.length}`);
    for (const p of overBudget) {
      const over = Number(p.actual_cost || 0) - Number(p.estimated_cost || 0);
      sections.push(`  ${p.name}: ${fmtDollar(over)} over budget`);
    }
  }

  // Financial snapshot from proven functions
  sections.push("\n=== FINANCIAL SNAPSHOT ===");
  sections.push(`Cash position: ${fmtDollar(overview.cashPosition)}`);
  sections.push(`Accounts receivable: ${fmtDollar(overview.totalAR)}`);
  sections.push(`Accounts payable: ${fmtDollar(overview.totalAP)}`);
  sections.push(`Net AR/AP: ${fmtDollar(overview.totalAR - overview.totalAP)}`);

  // Income statement data
  sections.push(`\nRevenue (period): ${fmtDollar(incomeStatement.revenue.total)}`);
  sections.push(`Cost of Construction: ${fmtDollar(incomeStatement.costOfConstruction.total)}`);
  sections.push(`Gross Profit: ${fmtDollar(incomeStatement.grossProfit)}`);
  sections.push(`Operating Expenses: ${fmtDollar(incomeStatement.operatingExpenses.total)}`);
  sections.push(`Net Income: ${fmtDollar(incomeStatement.netIncome)}`);

  // Balance Sheet totals
  sections.push(`\nTotal Assets: ${fmtDollar(balanceSheet.assets.total)}`);
  sections.push(`Total Liabilities: ${fmtDollar(balanceSheet.liabilities.total)}`);
  sections.push(`Total Equity: ${fmtDollar(balanceSheet.equity.total)}`);

  // RFIs and Change Orders
  sections.push("\n=== RFIs & CHANGE ORDERS ===");
  const openRfis = rfis.filter((r: { status: string }) => r.status !== "closed" && r.status !== "cancelled").length;
  sections.push(`Total RFIs: ${rfis.length} (${openRfis} open)`);
  const totalCOAmount = cos.reduce((s: number, c: { amount?: number }) => s + Number(c.amount || 0), 0);
  const approvedCOs = cos.filter((c: { status: string }) => c.status === "approved");
  const pendingCOs = cos.filter((c: { status: string }) => c.status === "pending" || c.status === "submitted" || c.status === "draft");
  sections.push(`Total change orders: ${cos.length} (value: ${fmtDollar(totalCOAmount)})`);
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
  for (const [sev, count] of Object.entries(sevBuckets)) sections.push(`  ${sev}: ${count}`);
  sections.push(`OSHA recordable: ${oshaCount}`);

  const avgInspScore = inspections.length > 0
    ? inspections.reduce((s: number, i: { score?: number }) => s + Number(i.score || 0), 0) / inspections.length
    : 0;
  sections.push(`Inspections: ${inspections.length} | Average score: ${avgInspScore.toFixed(1)}`);

  return sections.join("\n");
}
