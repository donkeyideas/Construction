import { streamText } from "ai";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getProviderForTask } from "@/lib/ai/provider-router";

// ---------------------------------------------------------------------------
// POST /api/ai/analyze-photo - Stream construction site photo analysis
// ---------------------------------------------------------------------------

interface RequestBody {
  companyId: string;
  description: string;
  projectName?: string;
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = (await req.json()) as RequestBody;
  const { companyId, description, projectName } = body;

  // Validate required fields
  if (!companyId || !description?.trim()) {
    return new Response(
      JSON.stringify({
        error: "Missing required fields: companyId, description",
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
  const projectContext = projectName
    ? `Project: ${projectName}\nCompany: ${userCompany.companyName}`
    : `Company: ${userCompany.companyName}`;

  const systemPrompt = `You are a construction site inspector and progress analyst for ${userCompany.companyName}. Based on descriptions of construction site photos, you provide detailed professional assessments.

${projectContext}

## ANALYSIS FRAMEWORK

Analyze the described photo and provide a structured assessment covering these four areas:

### 1. PROGRESS ASSESSMENT
- Estimated phase of construction (foundation, framing, rough-in, finishing, etc.)
- Estimated completion percentage for visible work
- Work activities currently in progress
- Comparison to what would be expected at this stage

### 2. SAFETY OBSERVATIONS
Identify any potential safety concerns mentioned or implied:
- **PPE compliance** — hard hats, safety vests, eye protection, fall protection
- **Fall hazards** — unprotected edges, scaffolding issues, ladder safety
- **Housekeeping** — debris, tripping hazards, material storage
- **Excavation safety** — shoring, sloping, protective systems
- **Electrical hazards** — temporary power, overhead lines
- **Equipment safety** — operator zones, outriggers, load limits
- **Fire prevention** — hot work, flammable storage

Rate the overall safety as: GOOD / NEEDS ATTENTION / CRITICAL

### 3. QUALITY OBSERVATIONS
Note any visible quality issues or positive quality indicators:
- Material quality and proper storage
- Workmanship quality (alignment, finishes, connections)
- Code compliance indicators
- Weather protection measures
- Proper sequencing of work

### 4. RECOMMENDATIONS
Provide specific, actionable recommendations:
- Immediate corrective actions needed (if any)
- Items to verify on next inspection
- Documentation recommendations
- Follow-up items for the project team

## OUTPUT FORMAT
Use clear markdown sections with bullet points. Be specific and professional. If a concern is identified, reference the OSHA standard or building code where applicable. If the description lacks detail in any area, note what additional information would be helpful.`;

  const userPrompt = `Based on the following description of a construction site photo, provide a complete site assessment:

---
${description.substring(0, 6000)}
---

Analyze the described scene and provide your full assessment across all four areas: Progress, Safety, Quality, and Recommendations.`;

  // Stream the AI response
  let result;
  try {
    result = streamText({
      model: providerResult.model,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });
  } catch (err: unknown) {
    console.error("AI analyze-photo streamText error:", err);
    const msg =
      err instanceof Error ? err.message : "Unknown AI provider error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }

  return result.toTextStreamResponse();
}
