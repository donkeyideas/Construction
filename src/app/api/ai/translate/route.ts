import { streamText } from "ai";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getProviderForTask } from "@/lib/ai/provider-router";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RequestBody {
  companyId: string;
  text: string;
  sourceLang: string;
  targetLang: string;
}

// ---------------------------------------------------------------------------
// POST /api/ai/translate - Stream a translated text response
// ---------------------------------------------------------------------------

export async function POST(req: Request) {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = (await req.json()) as RequestBody;
  const { companyId, text, sourceLang, targetLang } = body;

  // Validate required fields
  if (!companyId || !text || !sourceLang || !targetLang) {
    return new Response(
      JSON.stringify({
        error: "Missing required fields: companyId, text, sourceLang, targetLang",
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

  const systemPrompt = `You are a professional translator specializing in construction industry terminology. Translate the following text from ${sourceLang} to ${targetLang}. Maintain technical construction terms accurately. Only return the translated text, nothing else.`;

  const userPrompt = text;

  // Stream the AI response
  let result;
  try {
    result = streamText({
      model: providerResult.model,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });
  } catch (err: unknown) {
    console.error("AI translate streamText error:", err);
    const msg =
      err instanceof Error ? err.message : "Unknown AI provider error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }

  return result.toTextStreamResponse();
}
