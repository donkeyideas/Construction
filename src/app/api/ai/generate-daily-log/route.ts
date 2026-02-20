import { streamText } from "ai";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getProviderForTask } from "@/lib/ai/provider-router";

// ---------------------------------------------------------------------------
// POST /api/ai/generate-daily-log - Stream an AI-generated daily field report
// ---------------------------------------------------------------------------

export async function POST(req: Request) {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { companyId, projectId, date, notes, weather, workforce } =
    (await req.json()) as {
      companyId: string;
      projectId: string;
      date: string;
      notes: string;
      weather?: string;
      workforce?: Record<string, number>;
    };

  // Verify the user actually belongs to the company they claim
  if (companyId !== userCompany.companyId) {
    return new Response("Forbidden", { status: 403 });
  }

  // Get the AI provider configured for chat
  const providerResult = await getProviderForTask(supabase, companyId, "chat");

  if (!providerResult) {
    return new Response(
      JSON.stringify({ error: "No AI provider configured" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Fetch project info for context
  const { data: project } = await supabase
    .from("projects")
    .select("name, code, status, description")
    .eq("id", projectId)
    .single();

  const systemPrompt = `You are a professional construction daily log writer for ${userCompany.companyName}.
Generate a comprehensive daily field report based on the user's notes. Format it professionally with these sections:
- Work Performed (detailed description of activities)
- Workforce Summary (trades, headcounts if provided)
- Equipment Used (if mentioned)
- Materials Received (if mentioned)
- Weather Impact (if applicable)
- Safety Observations
- Delays/Issues (if any)

Write in professional third person. Be specific and factual. Use construction industry terminology.
Project: ${project?.name || "Unknown"} (${project?.code || ""})
Date: ${date}`;

  const userPrompt = `Generate a daily log from these notes:
${notes}
${weather ? `Weather: ${weather}` : ""}
${workforce ? `Workforce: ${JSON.stringify(workforce)}` : ""}`;

  let result;
  try {
    result = streamText({
      model: providerResult.model,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });
  } catch (err: unknown) {
    console.error("AI generate-daily-log streamText error:", err);
    const msg =
      err instanceof Error ? err.message : "Unknown AI provider error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }

  return result.toTextStreamResponse();
}
