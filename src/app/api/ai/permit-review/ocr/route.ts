import { NextResponse } from "next/server";
import { generateText } from "ai";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { resolveProvider } from "@/lib/ai/provider-selector";

interface RequestBody {
  companyId: string;
  fileUrl: string;
  mimeType: string;
  selectedProviderId?: string;
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);
  if (!userCompany) return new Response("Unauthorized", { status: 401 });

  const body = (await req.json()) as RequestBody;
  const { companyId, fileUrl, mimeType, selectedProviderId } = body;

  if (!companyId || !fileUrl) {
    return NextResponse.json(
      { error: "Missing companyId or fileUrl" },
      { status: 400 }
    );
  }

  if (companyId !== userCompany.companyId) {
    return new Response("Forbidden", { status: 403 });
  }

  const providerResult = await resolveProvider(
    supabase,
    companyId,
    "documents",
    selectedProviderId
  );

  if (!providerResult) {
    return NextResponse.json(
      { error: "No AI provider configured." },
      { status: 400 }
    );
  }

  const isImage = mimeType.startsWith("image/");

  try {
    const result = await generateText({
      model: providerResult.model,
      messages: [
        {
          role: "user",
          content: isImage
            ? [
                {
                  type: "image" as const,
                  image: new URL(fileUrl),
                },
                {
                  type: "text" as const,
                  text: "Extract ALL text from this building permit document image. Include every specification, measurement, note, schedule, annotation, and table. Preserve the document structure with headers and sections. Return only the extracted text.",
                },
              ]
            : `Extract ALL text from this building permit document available at: ${fileUrl}\n\nInclude every specification, measurement, note, schedule, annotation, and table. Preserve the document structure. Return only the extracted text.`,
        },
      ],
    });

    return NextResponse.json({ extractedText: result.text || "" });
  } catch (err: unknown) {
    console.error("OCR error:", err);
    const msg = err instanceof Error ? err.message : "OCR failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
