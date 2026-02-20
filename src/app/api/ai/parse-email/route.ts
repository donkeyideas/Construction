import { streamText } from "ai";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getProviderForTask } from "@/lib/ai/provider-router";

// ---------------------------------------------------------------------------
// POST /api/ai/parse-email - Stream NLP extraction from pasted email content
// ---------------------------------------------------------------------------

interface RequestBody {
  companyId: string;
  emailContent: string;
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = (await req.json()) as RequestBody;
  const { companyId, emailContent } = body;

  // Validate required fields
  if (!companyId || !emailContent?.trim()) {
    return new Response(
      JSON.stringify({
        error: "Missing required fields: companyId, emailContent",
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
  const systemPrompt = `You are an expert construction project coordinator for ${userCompany.companyName}. Your task is to parse email content and extract structured information relevant to construction project management.

## EXTRACTION RULES

Analyze the email and extract every item that falls into these categories:

### 1. Action Items
Extract any requests, tasks, or follow-ups. Classify each as one of:
- **RFI**: Questions requiring formal responses
- **Task**: Work items or assignments
- **Submittal**: Document submission requests
- **Action Item**: General action items
- **Follow-up**: Items that need follow-up

### 2. Key Entities
- **Project**: Any project names, codes, or references
- **Contact**: Names of people, their roles, companies

### 3. Important Dates
- **Date**: Any deadlines, meeting dates, milestones, or scheduled events

### 4. Financial Amounts
- **Amount**: Any dollar figures, costs, budgets, or financial references

## OUTPUT FORMAT

Structure your response as a clear, categorized list using this exact format:

## Action Items
- **RFI**: [description of the RFI or question]
- **Task**: [description of the task]
- **Submittal**: [description of what needs to be submitted]
- **Action Item**: [description]
- **Follow-up**: [description]

## Key Entities
- **Project**: [project name or code]
- **Contact**: [person name, role, company]

## Important Dates
- **Date**: [date and what it relates to]

## Financial Amounts
- **Amount**: [dollar amount and context]

## Summary
Provide a 2-3 sentence summary of the email's main purpose and urgency level.

IMPORTANT:
- Only include items that are actually present in the email. Omit empty sections.
- Be precise — quote exact dates, amounts, and names from the email.
- If the email is not construction-related, still extract whatever structured information you can.
- Do not invent or assume information not in the email.`;

  const userPrompt = `Parse the following email and extract all structured information:

---
${emailContent.substring(0, 8000)}
---

Extract all action items, entities, dates, and amounts following the format specified.`;

  // Stream the AI response
  let result;
  try {
    result = streamText({
      model: providerResult.model,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });
  } catch (err: unknown) {
    console.error("AI parse-email streamText error:", err);
    const msg =
      err instanceof Error ? err.message : "Unknown AI provider error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }

  return result.toTextStreamResponse();
}
