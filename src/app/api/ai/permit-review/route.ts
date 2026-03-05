import { NextResponse } from "next/server";
import { generateText } from "ai";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getProviderForTask } from "@/lib/ai/provider-router";
import { logAIUsage } from "@/lib/queries/ai";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RequestBody {
  companyId: string;
  documentText: string;
  jurisdiction?: string;
  buildingType?: string;
  projectId?: string;
  title?: string;
}

// ---------------------------------------------------------------------------
// System prompt for building code compliance analysis
// ---------------------------------------------------------------------------

function buildSystemPrompt(
  companyName: string,
  jurisdiction?: string,
  buildingType?: string
): string {
  return `You are an expert building code compliance analyst and permit reviewer for ${companyName}. You review building permit application documents against applicable building codes, zoning requirements, and safety standards.

${jurisdiction ? `Jurisdiction: ${jurisdiction}` : "Jurisdiction: Not specified (use IBC 2021 as baseline)"}
${buildingType ? `Building Type: ${buildingType}` : ""}

## YOUR ROLE
You are NOT approving or rejecting permits. You are providing a preliminary compliance assessment to help identify potential issues BEFORE formal submission to the Authority Having Jurisdiction (AHJ). This is an advisory tool, not a legal determination.

## ANALYSIS FRAMEWORK

Review the submitted documents against these code compliance areas:

### 1. STRUCTURAL (IBC Chapter 16-23)
- Load requirements (dead, live, snow, wind, seismic)
- Foundation specifications
- Structural member sizing and connections
- Soil/geotechnical requirements

### 2. FIRE SAFETY (IBC Chapter 7-9, 26, NFPA 101)
- Fire-resistance ratings for construction type
- Means of egress (exits, corridors, stairways)
- Fire suppression systems (sprinklers)
- Fire alarm and detection systems
- Fire separation requirements

### 3. ELECTRICAL (NEC/NFPA 70)
- Service entrance and panel sizing
- Branch circuit design
- Grounding and bonding
- Emergency/standby power
- Lighting requirements

### 4. PLUMBING (IPC)
- Fixture counts per occupancy
- Water supply sizing
- Drainage and venting
- Hot water systems
- Backflow prevention

### 5. MECHANICAL / HVAC (IMC)
- Ventilation rates per occupancy
- Equipment sizing
- Ductwork and distribution
- Energy code compliance (IECC)
- Refrigerant management

### 6. ZONING COMPLIANCE
- Setback requirements
- Height restrictions
- Lot coverage
- Parking requirements
- Use classification compatibility

### 7. ADA / ACCESSIBILITY (ADA Standards, IBC Chapter 11)
- Accessible routes
- Door widths and hardware
- Restroom accessibility
- Signage requirements
- Parking accessibility

### 8. ENVIRONMENTAL
- Stormwater management
- Erosion control
- Environmental impact considerations
- Energy efficiency (IECC compliance)
- Sustainability requirements

## OUTPUT FORMAT

You MUST return a valid JSON object with this exact structure. Do NOT wrap in markdown code fences.

{
  "overall_status": "likely_compliant" | "needs_review" | "issues_found",
  "overall_confidence": <number 0-100>,
  "summary": "<2-3 sentence executive summary>",
  "sections": [
    {
      "name": "<section name from the 8 areas above>",
      "status": "pass" | "flag" | "fail",
      "confidence": <number 0-100>,
      "findings": ["<specific observation 1>", "<specific observation 2>"],
      "code_references": ["<IBC 2021 Section X.X>", "<NFPA 101 Section Y.Y>"]
    }
  ],
  "issues": [
    {
      "severity": "critical" | "major" | "minor" | "info",
      "category": "<section name>",
      "title": "<short title>",
      "description": "<detailed description of the issue>",
      "code_reference": "<specific code citation>",
      "recommendation": "<specific action to resolve>"
    }
  ],
  "recommendations": [
    "<actionable recommendation 1>",
    "<actionable recommendation 2>"
  ]
}

## SCORING GUIDELINES

- **overall_status**:
  - "likely_compliant": No critical or major issues found, confidence > 70%
  - "needs_review": Minor issues or areas with insufficient information, or confidence between 40-70%
  - "issues_found": Critical or major issues identified, or confidence < 40%

- **section confidence**: Based on how much relevant information was provided for that section
  - 80-100: Clear, detailed information available
  - 50-79: Partial information, some inference needed
  - 0-49: Minimal or no information about this area

- **status per section**:
  - "pass": Requirements appear to be met based on available information
  - "flag": Potential concern or insufficient information to determine compliance
  - "fail": Clear non-compliance or critical issue identified

## IMPORTANT RULES
1. If document content is insufficient for a section, mark it as "flag" with low confidence and note what information is missing
2. Always cite specific code sections when identifying issues
3. Be conservative — flag potential issues rather than assuming compliance
4. Distinguish between definite non-compliance and areas needing further review
5. Only return the JSON, no other text`;
}

// ---------------------------------------------------------------------------
// POST /api/ai/permit-review - Run AI permit compliance review
// ---------------------------------------------------------------------------

export async function POST(req: Request) {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = (await req.json()) as RequestBody;
  const { companyId, documentText, jurisdiction, buildingType, projectId, title } = body;

  // Validate required fields
  if (!companyId || !documentText) {
    return NextResponse.json(
      { error: "Missing required fields: companyId, documentText" },
      { status: 400 }
    );
  }

  // Verify company ownership
  if (companyId !== userCompany.companyId) {
    return new Response("Forbidden", { status: 403 });
  }

  // Validate document text length (100k chars max)
  if (documentText.length > 100000) {
    return NextResponse.json(
      { error: "Document text is too long. Maximum 100,000 characters." },
      { status: 400 }
    );
  }

  // Get AI provider — try "documents" first, fall back to "chat"
  let providerResult = await getProviderForTask(supabase, companyId, "documents");
  if (!providerResult) {
    providerResult = await getProviderForTask(supabase, companyId, "chat");
  }
  if (!providerResult) {
    return NextResponse.json(
      { error: "No AI provider configured. Go to Administration > AI Providers to set one up." },
      { status: 400 }
    );
  }

  const systemPrompt = buildSystemPrompt(
    userCompany.companyName,
    jurisdiction,
    buildingType
  );

  const userPrompt = `Review the following building permit application documents for code compliance:

${jurisdiction ? `Jurisdiction: ${jurisdiction}` : ""}
${buildingType ? `Building Type: ${buildingType}` : ""}

--- DOCUMENT CONTENT ---
${documentText.substring(0, 80000)}
--- END DOCUMENT ---

Analyze these documents against all 8 compliance areas and return the structured JSON assessment.`;

  const startTime = Date.now();

  let result;
  try {
    result = await generateText({
      model: providerResult.model,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });
  } catch (err: unknown) {
    console.error("AI permit-review generateText error:", err);
    const msg = err instanceof Error ? err.message : "Unknown AI provider error";
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  const processingTimeMs = Date.now() - startTime;

  // Parse the structured JSON response
  let rawText = result.text || "";

  // Strip markdown code fences if present
  rawText = rawText.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "");

  let parsed;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    // Try to extract JSON from the response
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        parsed = JSON.parse(jsonMatch[0]);
      } catch {
        return NextResponse.json(
          { error: "Failed to parse AI response. Please try again.", raw: rawText },
          { status: 502 }
        );
      }
    } else {
      return NextResponse.json(
        { error: "AI did not return valid JSON. Please try again.", raw: rawText },
        { status: 502 }
      );
    }
  }

  const inputTokens = result.usage?.inputTokens ?? 0;
  const outputTokens = result.usage?.outputTokens ?? 0;
  // Rough cost estimate: $0.01 per 1k tokens (varies by provider)
  const estimatedCost = ((inputTokens + outputTokens) / 1000) * 0.01;

  // Save to database
  const { data: savedReview, error: saveError } = await supabase
    .from("permit_reviews")
    .insert({
      company_id: companyId,
      project_id: projectId || null,
      title: title || "Untitled Review",
      status: "completed",
      document_text: documentText.substring(0, 50000), // truncate for storage
      jurisdiction: jurisdiction || null,
      building_type: buildingType || null,
      overall_status: parsed.overall_status || "needs_review",
      overall_confidence: parsed.overall_confidence ?? 0,
      summary: parsed.summary || null,
      sections: parsed.sections || [],
      issues: parsed.issues || [],
      recommendations: parsed.recommendations || [],
      raw_ai_response: rawText.substring(0, 50000),
      provider_name: providerResult.config.provider_name,
      model_id: providerResult.config.model_id,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      estimated_cost: estimatedCost,
      processing_time_ms: processingTimeMs,
      created_by: userCompany.userId,
    })
    .select("id")
    .single();

  if (saveError) {
    console.error("permit_reviews insert error:", saveError);
  }

  // Log AI usage (non-blocking)
  logAIUsage(supabase, {
    company_id: companyId,
    user_id: userCompany.userId,
    provider_name: providerResult.config.provider_name,
    model_id: providerResult.config.model_id,
    task_type: "permit_review",
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    estimated_cost: estimatedCost,
  }).catch(() => {});

  return NextResponse.json({
    id: savedReview?.id || null,
    overallStatus: parsed.overall_status || "needs_review",
    overallConfidence: parsed.overall_confidence ?? 0,
    summary: parsed.summary || "",
    sections: parsed.sections || [],
    issues: parsed.issues || [],
    recommendations: parsed.recommendations || [],
    processingTimeMs,
    providerName: providerResult.config.provider_name,
    modelId: providerResult.config.model_id,
  });
}

// ---------------------------------------------------------------------------
// GET /api/ai/permit-review - List past reviews
// ---------------------------------------------------------------------------

export async function GET() {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { data, error } = await supabase
    .from("permit_reviews")
    .select("id, title, overall_status, overall_confidence, building_type, jurisdiction, processing_time_ms, created_at")
    .eq("company_id", userCompany.companyId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    console.error("permit_reviews list error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ reviews: data || [] });
}
