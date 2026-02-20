import { streamText } from "ai";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getProviderForTask } from "@/lib/ai/provider-router";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface KBDocument {
  title: string;
  content: string;
}

interface RequestBody {
  companyId: string;
  question: string;
  documents: KBDocument[];
}

// ---------------------------------------------------------------------------
// POST /api/ai/knowledge-query - Query knowledge base documents with AI
// ---------------------------------------------------------------------------

export async function POST(req: Request) {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = (await req.json()) as RequestBody;
  const { companyId, question, documents } = body;

  // Validate required fields
  if (!companyId || !question || !documents || documents.length === 0) {
    return new Response(
      JSON.stringify({
        error:
          "Missing required fields: companyId, question, and at least one document",
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

  // Build document context
  const documentContext = documents
    .map(
      (doc, idx) =>
        `--- Document ${idx + 1}: "${doc.title}" ---\n${doc.content}\n--- End of Document ${idx + 1} ---`
    )
    .join("\n\n");

  const systemPrompt = `You are a knowledge assistant for ${userCompany.companyName}. Answer the question using ONLY the provided documents. Cite which document you're referencing by title. If the answer isn't in the documents, say so clearly.

Here are the documents:

${documentContext}`;

  const userPrompt = question;

  // Stream the AI response
  let result;
  try {
    result = streamText({
      model: providerResult.model,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });
  } catch (err: unknown) {
    console.error("AI knowledge-query streamText error:", err);
    const msg =
      err instanceof Error ? err.message : "Unknown AI provider error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }

  return result.toTextStreamResponse();
}
