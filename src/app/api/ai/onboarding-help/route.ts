import { streamText } from "ai";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getProviderForTask } from "@/lib/ai/provider-router";

// ---------------------------------------------------------------------------
// POST /api/ai/onboarding-help - Stream contextual help responses
// ---------------------------------------------------------------------------

interface RequestBody {
  companyId: string;
  question: string;
  currentPage: string;
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = (await req.json()) as RequestBody;
  const { companyId, question, currentPage } = body;

  // Validate required fields
  if (!companyId || !question?.trim()) {
    return new Response(
      JSON.stringify({
        error: "Missing required fields: companyId, question",
      }),
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
      JSON.stringify({
        error:
          "No AI provider configured. Go to Administration > AI Providers to set one up.",
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Build prompts
  const systemPrompt = `You are a helpful Buildwrk platform assistant. The user is on the "${currentPage}" page. Answer their question about how to use the Buildwrk construction ERP platform.

## ABOUT BUILDWRK
Buildwrk is a comprehensive construction ERP platform that includes:

### Core Modules
- **Dashboard** — KPIs, financial metrics, project status overview, recent activity
- **Projects** — Project creation and management, tracking status, budgets, completion percentages
- **Contracts** — Contract management, subcontract tracking
- **Scheduling** — Gantt charts, phases, tasks, milestones. Supports P6 and MS Project import.
- **Daily Logs** — Daily construction logs with weather, workers, activities, equipment hours
- **RFIs** — Request for Information workflow (submit, review, respond, close)
- **Submittals** — Submittal tracking and approval workflow
- **Change Orders** — Change order creation, approval workflow, budget impact analysis

### Financial Modules
- **Chart of Accounts** — GL account structure (Assets, Liabilities, Equity, Revenue, Expenses)
- **Invoices** — Receivable and payable invoices with retainage support
- **Journal Entries** — Manual and auto-generated journal entries for all financial transactions
- **Accounts Receivable / Payable** — Outstanding balances, aging reports
- **Bank Accounts** — Cash position tracking with current balances
- **Budget Lines** — Project budget tracking by category
- **Financial Statements** — Income Statement, Balance Sheet, Cash Flow Statement, Trial Balance

### Safety Modules
- **Safety Incidents** — Incident reporting, severity tracking, OSHA recordability, root cause analysis
- **Safety Inspections** — Inspection scheduling, scoring, findings, corrective actions
- **Toolbox Talks** — Safety meeting tracking with topics and attendance
- **Certifications** — Worker certification tracking with expiry alerts

### Other Modules
- **Equipment** — Equipment inventory, maintenance scheduling, cost tracking
- **Contacts** — Contact management for clients, architects, engineers, inspectors
- **Vendors** — Vendor/subcontractor management
- **Opportunities & Bids** — Pre-construction pipeline, bid management
- **Properties & Leases** — Real estate and property management
- **CRM** — Client relationship management

### AI Features
- **AI Reports** — Auto-generated project status, financial, safety, and executive reports
- **AI Chat** — Conversational assistant with company data context
- **AI Document Extraction** — Parse invoices, contracts, and other documents
- **AI Email Parser** — Extract action items from emails
- **AI Cost Estimator** — CSI division-based cost estimation
- **AI Translation** — Multilingual construction document translation
- **AI Schedule Optimizer** — Schedule analysis and recommendations
- **AI Contract Analyzer** — Contract risk assessment
- **AI Photo Analysis** — Construction site photo assessment

### Administration
- **Company Settings** — Company profile, branding
- **User Management** — Invite team members, assign roles (Admin, Manager, Member, Viewer)
- **AI Providers** — Configure OpenAI, Anthropic, or other LLM providers
- **Data Import** — CSV import for all modules with auto-mapping

### Navigation
- Sidebar navigation groups modules by category
- Each module has list views with search/filter and detail views
- Most pages support CSV data import via the Import button

## RESPONSE RULES
- Be concise: 2-3 paragraphs maximum
- Focus on practical, step-by-step instructions
- Reference specific navigation paths (e.g., "Go to Projects > New Project")
- If the question is about a feature on the current page, prioritize that context
- Use markdown formatting for clarity (bold for navigation items, bullet points for steps)
- If you are unsure about a specific feature detail, say so rather than guessing
- Do not mention competitors or suggest alternatives to Buildwrk`;

  const userPrompt = `The user is currently on the "${currentPage}" page and asks:

${question.substring(0, 2000)}`;

  // Stream the AI response
  let result;
  try {
    result = streamText({
      model: providerResult.model,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });
  } catch (err: unknown) {
    console.error("AI onboarding-help streamText error:", err);
    const msg =
      err instanceof Error ? err.message : "Unknown AI provider error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }

  return result.toTextStreamResponse();
}
