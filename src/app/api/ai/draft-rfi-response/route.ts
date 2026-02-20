import { streamText } from "ai";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getProviderForTask } from "@/lib/ai/provider-router";

// ---------------------------------------------------------------------------
// POST /api/ai/draft-rfi-response - Stream an AI-drafted RFI response
// ---------------------------------------------------------------------------

export async function POST(req: Request) {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { companyId, rfiId } = (await req.json()) as {
    companyId: string;
    rfiId: string;
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

  // Fetch the RFI with project context
  const { data: rfi } = await supabase
    .from("rfis")
    .select(
      "rfi_number, subject, question, priority, projects(name, code, description)"
    )
    .eq("id", rfiId)
    .single();

  if (!rfi) {
    return new Response("RFI not found", { status: 404 });
  }

  // Extract project from the joined relation
  const project = rfi.projects as unknown as {
    name?: string;
    code?: string;
    description?: string;
  } | null;

  const systemPrompt = `You are a senior construction project manager for ${userCompany.companyName}.
Draft a professional response to the following RFI (Request for Information).

Guidelines:
- Be specific and technical
- Reference industry standards where applicable
- If the question involves design decisions, note that the architect/engineer should confirm
- Keep the response concise but thorough
- Use professional construction language
- Include any assumptions you're making

Project: ${project?.name || "Unknown"} (${project?.code || ""})`;

  const userPrompt = `RFI #${rfi.rfi_number}: ${rfi.subject}

Question:
${rfi.question}

Priority: ${rfi.priority || "Normal"}

Please draft a professional response.`;

  let result;
  try {
    result = streamText({
      model: providerResult.model,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });
  } catch (err: unknown) {
    console.error("AI draft-rfi-response streamText error:", err);
    const msg =
      err instanceof Error ? err.message : "Unknown AI provider error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }

  return result.toTextStreamResponse();
}
