import { streamText } from "ai";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getProviderForTask } from "@/lib/ai/provider-router";

// ---------------------------------------------------------------------------
// POST /api/ai/analyze-contract - Stream contract clause analysis
// ---------------------------------------------------------------------------

interface RequestBody {
  companyId: string;
  contractText: string;
  contractTitle?: string;
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = (await req.json()) as RequestBody;
  const { companyId, contractText, contractTitle } = body;

  // Validate required fields
  if (!companyId || !contractText?.trim()) {
    return new Response(
      JSON.stringify({
        error: "Missing required fields: companyId, contractText",
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
  const systemPrompt = `You are a construction contract attorney and risk analyst for ${userCompany.companyName}. Analyze the provided contract text and produce a comprehensive clause-by-clause risk assessment.

## ANALYSIS FRAMEWORK

### 1. RISKY CLAUSES
Identify and rate each risky clause found. Focus on these critical areas:
- **Indemnification / Hold Harmless** — broad vs. limited indemnification
- **Liquidated Damages** — daily rates, caps, enforceability
- **Flow-Down Provisions** — obligations passing to subcontractors
- **Pay-When-Paid / Pay-If-Paid** — payment conditionality
- **Dispute Resolution** — mandatory arbitration, venue selection, waiver of jury trial
- **Termination for Convenience** — one-sided termination rights
- **No Damages for Delay** — time extension as sole remedy
- **Warranty Obligations** — scope and duration
- **Insurance Requirements** — excessive coverage demands
- **Consequential Damages** — exposure to indirect losses

Rate each clause as:
- **HIGH RISK** — Immediate attention needed, significant financial or legal exposure
- **MEDIUM RISK** — Should be negotiated, moderate exposure
- **LOW RISK** — Standard language, minimal concern

### 2. FAVORABLE TERMS
Identify clauses that benefit the contractor, such as:
- Clear payment terms and schedules
- Reasonable change order procedures
- Equitable risk allocation
- Right to stop work for non-payment
- Retainage release provisions

### 3. MISSING CLAUSES
Flag important provisions that are absent:
- Retainage terms
- Change order procedures
- Force majeure / unforeseen conditions
- Insurance requirements
- Dispute resolution escalation
- Safety requirements
- Schedule of values
- Warranty terms
- Lien waiver provisions

## OUTPUT FORMAT
Use clear markdown sections with bullet points. For each risky clause, quote the relevant language (if present in the text) and explain the risk. Provide a final **OVERALL RISK RATING** (Low / Medium / High / Critical) with a brief summary.`;

  const titleContext = contractTitle
    ? `Contract title: "${contractTitle}"\n\n`
    : "";

  const userPrompt = `${titleContext}Analyze the following contract text and provide a detailed risk assessment:

---
${contractText.substring(0, 12000)}
---

Provide the full analysis with all three sections: Risky Clauses, Favorable Terms, and Missing Clauses. Include an Overall Risk Rating at the end.`;

  // Stream the AI response
  let result;
  try {
    result = streamText({
      model: providerResult.model,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });
  } catch (err: unknown) {
    console.error("AI analyze-contract streamText error:", err);
    const msg =
      err instanceof Error ? err.message : "Unknown AI provider error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }

  return result.toTextStreamResponse();
}
