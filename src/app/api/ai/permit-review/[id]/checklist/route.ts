import { NextResponse } from "next/server";
import { generateText } from "ai";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { resolveProvider } from "@/lib/ai/provider-selector";

// POST: Generate a submission checklist from review results
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);
  if (!userCompany) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;

  const { data: review } = await supabase
    .from("permit_reviews")
    .select("*")
    .eq("id", id)
    .eq("company_id", userCompany.companyId)
    .single();

  if (!review) {
    return NextResponse.json({ error: "Review not found" }, { status: 404 });
  }

  const providerResult = await resolveProvider(
    supabase,
    userCompany.companyId,
    "documents"
  );

  if (!providerResult) {
    return NextResponse.json(
      { error: "No AI provider configured." },
      { status: 400 }
    );
  }

  const prompt = `You are a permit submission specialist. Based on the following building permit review results, generate a comprehensive document submission checklist for the Authority Having Jurisdiction (AHJ).

Jurisdiction: ${review.jurisdiction || "General US"}
Building Type: ${review.building_type || "Not specified"}
Review Status: ${review.overall_status}
Issues Found: ${JSON.stringify(review.issues || [])}
Sections: ${JSON.stringify((review.sections || []).map((s: { name: string; status: string }) => ({ name: s.name, status: s.status })))}

Generate a JSON array of checklist items. Each item:
{
  "document_name": "<name of required document>",
  "description": "<what this document should contain>",
  "required": true/false,
  "status": "missing" | "ready" | "needs_update",
  "category": "<structural|fire_safety|electrical|plumbing|mechanical|zoning|ada|environmental|administrative>"
}

Status rules:
- "ready" if the corresponding section passed
- "needs_update" if the section was flagged
- "missing" if the section failed or had critical issues

Include standard permit documents: permit application form, site plan, floor plans, structural calculations, MEP plans, energy compliance, ADA compliance, fire safety plan, environmental reports, contractor licenses, insurance certificates, owner authorization, etc.

Return ONLY the JSON array, no other text.`;

  let result;
  try {
    result = await generateText({
      model: providerResult.model,
      messages: [{ role: "user", content: prompt }],
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "AI error";
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  let items;
  try {
    let raw = result.text || "";
    raw = raw.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "");
    items = JSON.parse(raw);
    if (!Array.isArray(items)) {
      const match = raw.match(/\[[\s\S]*\]/);
      items = match ? JSON.parse(match[0]) : [];
    }
  } catch {
    return NextResponse.json(
      { error: "Failed to parse checklist" },
      { status: 502 }
    );
  }

  const checklist = {
    items: items.map(
      (item: Record<string, unknown>, i: number) => ({
        ...item,
        id: `chk-${i}`,
        checked: false,
      })
    ),
    generated_at: new Date().toISOString(),
    jurisdiction: review.jurisdiction,
    building_type: review.building_type,
  };

  await supabase
    .from("permit_reviews")
    .update({ submission_checklist: checklist })
    .eq("id", id);

  return NextResponse.json(checklist);
}

// PATCH: Toggle checklist item checked state
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);
  if (!userCompany) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  const { itemId, checked } = await req.json();

  const { data: review } = await supabase
    .from("permit_reviews")
    .select("submission_checklist")
    .eq("id", id)
    .eq("company_id", userCompany.companyId)
    .single();

  if (!review?.submission_checklist) {
    return NextResponse.json({ error: "No checklist" }, { status: 404 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const checklist = review.submission_checklist as any;
  const item = checklist.items?.find((i: { id: string }) => i.id === itemId);
  if (item) item.checked = checked;

  await supabase
    .from("permit_reviews")
    .update({ submission_checklist: checklist })
    .eq("id", id);

  return NextResponse.json({ success: true });
}
