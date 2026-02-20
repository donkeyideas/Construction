import { streamText } from "ai";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getProviderForTask } from "@/lib/ai/provider-router";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RequestBody {
  companyId: string;
  projectType: string;
  squareFootage: number;
  stories: number;
  qualityLevel: string;
  location: string;
  requirements: string;
}

// ---------------------------------------------------------------------------
// POST /api/ai/estimate-cost - Stream an AI-generated cost estimate
// ---------------------------------------------------------------------------

export async function POST(req: Request) {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = (await req.json()) as RequestBody;
  const {
    companyId,
    projectType,
    squareFootage,
    stories,
    qualityLevel,
    location,
    requirements,
  } = body;

  // Validate required fields
  if (!companyId || !projectType || !squareFootage || !stories || !qualityLevel || !location) {
    return new Response(
      JSON.stringify({
        error:
          "Missing required fields: companyId, projectType, squareFootage, stories, qualityLevel, location",
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

  const systemPrompt = `You are a construction cost estimator for ${userCompany.companyName}. Generate a detailed cost estimate broken down by CSI MasterFormat divisions. Return a markdown table with columns: CSI Code, Division, Description, Cost/SF, Total Cost. Base estimates on current 2026 construction costs for the specified location and quality level. Include a total row at the bottom of the table. After the table, provide 2-3 paragraphs of assumptions and notes about the estimate.

Use these CSI divisions as the minimum set (add more if relevant):
- 01 - General Requirements
- 02 - Existing Conditions / Site Work
- 03 - Concrete
- 04 - Masonry
- 05 - Metals
- 06 - Wood, Plastics, and Composites
- 07 - Thermal and Moisture Protection
- 08 - Openings
- 09 - Finishes
- 10 - Specialties
- 21 - Fire Suppression
- 22 - Plumbing
- 23 - HVAC
- 26 - Electrical
- 31 - Earthwork

Format all dollar amounts as currency (e.g., $1,234). Make sure the Total Cost column values are calculated correctly based on Cost/SF multiplied by total square footage.`;

  const userPrompt = `Generate a detailed construction cost estimate for the following project:

- **Project Type**: ${projectType}
- **Square Footage**: ${Number(squareFootage).toLocaleString()} SF
- **Number of Stories**: ${stories}
- **Quality Level**: ${qualityLevel}
- **Location**: ${location}
${requirements ? `- **Special Requirements**: ${requirements}` : ""}

Please provide a comprehensive breakdown by CSI division with cost per square foot and total cost for each division.`;

  // Stream the AI response
  let result;
  try {
    result = streamText({
      model: providerResult.model,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });
  } catch (err: unknown) {
    console.error("AI estimate-cost streamText error:", err);
    const msg =
      err instanceof Error ? err.message : "Unknown AI provider error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }

  return result.toTextStreamResponse();
}
