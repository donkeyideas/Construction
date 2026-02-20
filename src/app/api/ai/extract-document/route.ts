import { streamText } from "ai";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getProviderForTask } from "@/lib/ai/provider-router";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type DocumentType =
  | "contract"
  | "insurance_certificate"
  | "lien_waiver"
  | "invoice"
  | "change_order"
  | "permit"
  | "other";

interface RequestBody {
  companyId: string;
  documentText: string;
  documentType: DocumentType;
}

const VALID_DOCUMENT_TYPES: DocumentType[] = [
  "contract",
  "insurance_certificate",
  "lien_waiver",
  "invoice",
  "change_order",
  "permit",
  "other",
];

// ---------------------------------------------------------------------------
// Field definitions for each document type
// ---------------------------------------------------------------------------

const DOCUMENT_FIELDS: Record<DocumentType, string[]> = {
  contract: [
    "Parties",
    "Contract Value",
    "Start Date",
    "End Date",
    "Scope of Work",
    "Retainage Percentage",
    "Payment Terms",
  ],
  insurance_certificate: [
    "Insured Party",
    "Policy Number",
    "Coverage Amount",
    "Effective Date",
    "Expiration Date",
    "Certificate Holder",
  ],
  lien_waiver: [
    "Claimant",
    "Project",
    "Through Date",
    "Amount",
    "Waiver Type",
  ],
  invoice: [
    "Vendor",
    "Invoice Number",
    "Invoice Date",
    "Total Amount",
    "Line Items",
    "Payment Terms",
  ],
  change_order: [
    "CO Number",
    "Amount",
    "Reason",
    "Schedule Impact",
    "Description",
  ],
  permit: [
    "Permit Type",
    "Permit Number",
    "Issued Date",
    "Expiration Date",
    "Jurisdiction",
    "Scope",
  ],
  other: [
    "Document Title",
    "Date",
    "Parties Involved",
    "Key Terms",
    "Amount",
    "Summary",
  ],
};

// ---------------------------------------------------------------------------
// Human-readable document type labels
// ---------------------------------------------------------------------------

function getDocumentTypeLabel(docType: DocumentType): string {
  switch (docType) {
    case "contract":
      return "Contract";
    case "insurance_certificate":
      return "Insurance Certificate";
    case "lien_waiver":
      return "Lien Waiver";
    case "invoice":
      return "Invoice";
    case "change_order":
      return "Change Order";
    case "permit":
      return "Permit";
    case "other":
      return "Document";
    default:
      return "Document";
  }
}

// ---------------------------------------------------------------------------
// POST /api/ai/extract-document - Stream AI extraction of document fields
// ---------------------------------------------------------------------------

export async function POST(req: Request) {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = (await req.json()) as RequestBody;
  const { companyId, documentText, documentType } = body;

  // Validate required fields
  if (!companyId || !documentText || !documentType) {
    return new Response(
      JSON.stringify({
        error:
          "Missing required fields: companyId, documentText, documentType",
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Validate document type
  if (!VALID_DOCUMENT_TYPES.includes(documentType)) {
    return new Response(
      JSON.stringify({
        error: `Invalid documentType. Must be one of: ${VALID_DOCUMENT_TYPES.join(", ")}`,
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Verify company ownership
  if (companyId !== userCompany.companyId) {
    return new Response("Forbidden", { status: 403 });
  }

  // Validate document text is not unreasonably long (100k chars max)
  if (documentText.length > 100000) {
    return new Response(
      JSON.stringify({
        error: "Document text is too long. Maximum 100,000 characters.",
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Get the AI provider - try "documents" task first, fall back to "chat"
  let providerResult = await getProviderForTask(
    supabase,
    companyId,
    "documents"
  );

  if (!providerResult) {
    providerResult = await getProviderForTask(supabase, companyId, "chat");
  }

  if (!providerResult) {
    return new Response(
      JSON.stringify({
        error:
          "No AI provider configured. Go to Administration > AI Providers to set one up.",
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Build the extraction prompt
  const fields = DOCUMENT_FIELDS[documentType];
  const typeLabel = getDocumentTypeLabel(documentType);
  const fieldList = fields.map((f) => `  - ${f}`).join("\n");

  const systemPrompt = `You are a construction document data extraction specialist for ${userCompany.companyName}. You extract structured data from construction documents with high accuracy.

Extract the following fields from this ${typeLabel} document. Return the data as a JSON object with these fields:
${fieldList}

For each field, also provide a confidence level: "high", "medium", or "low".
- Use "high" when the value is clearly and explicitly stated in the document.
- Use "medium" when the value is inferred or partially stated.
- Use "low" when the value is uncertain or not found.

Return format:
{
  "fields": [
    { "name": "Field Name", "value": "Extracted Value", "confidence": "high" }
  ]
}

If a field is not found in the document, set value to null and confidence to "low".
Only return the JSON, no other text. Do not wrap the JSON in markdown code fences.`;

  const userPrompt = `Extract structured data from the following ${typeLabel} document:

---
${documentText}
---

Return the extracted fields as JSON.`;

  // Stream the AI response
  let result;
  try {
    result = streamText({
      model: providerResult.model,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });
  } catch (err: unknown) {
    console.error("AI extract-document streamText error:", err);
    const msg =
      err instanceof Error ? err.message : "Unknown AI provider error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }

  return result.toTextStreamResponse();
}
