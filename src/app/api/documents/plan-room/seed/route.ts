import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { storageUpload } from "@/lib/supabase/storage";

/**
 * Generates a minimal valid PDF with construction plan text.
 */
function generateSamplePdf(): Buffer {
  const parts: string[] = [];
  const positions: number[] = [];
  let offset = 0;

  function add(text: string) {
    parts.push(text);
    offset += Buffer.byteLength(text, "utf-8");
  }

  function markPosition() {
    positions.push(offset);
  }

  // Header
  add("%PDF-1.4\n");

  // Object 1: Catalog
  markPosition();
  add("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");

  // Object 2: Pages
  markPosition();
  add("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n");

  // Content stream
  const streamLines = [
    "BT",
    "/F1 28 Tf 72 700 Td",
    "(Buildwrk - Sample Construction Plan) Tj",
    "0 -40 Td /F1 18 Tf",
    "(Sheet A-101: Ground Floor Plan) Tj",
    "0 -32 Td /F1 12 Tf",
    "(This is a sample PDF for the Buildwrk Plan Room.) Tj",
    "0 -20 Td",
    "(Upload your own construction documents to replace this sample.) Tj",
    "0 -36 Td /F1 14 Tf",
    "(Project: Demo Construction Project) Tj",
    "0 -24 Td /F1 12 Tf",
    "(Discipline: Architectural) Tj",
    "0 -20 Td",
    "(Version: 1  |  Status: For Review) Tj",
    "0 -20 Td",
    "(Date: 2025-01-15) Tj",
    "ET",
  ].join("\n");

  const streamByteLength = Buffer.byteLength(streamLines, "utf-8");

  // Object 3: Page
  markPosition();
  add("3 0 obj\n");
  add(
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\n"
  );
  add("endobj\n");

  // Object 4: Stream
  markPosition();
  add(`4 0 obj\n<< /Length ${streamByteLength} >>\nstream\n`);
  add(streamLines);
  add("\nendstream\nendobj\n");

  // Object 5: Font
  markPosition();
  add(
    "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n"
  );

  // Cross-reference table
  const xrefOffset = offset;
  add("xref\n");
  add(`0 ${positions.length + 1}\n`);
  add("0000000000 65535 f \n");
  for (const pos of positions) {
    add(String(pos).padStart(10, "0") + " 00000 n \n");
  }

  // Trailer
  add("trailer\n");
  add(`<< /Size ${positions.length + 1} /Root 1 0 R >>\n`);
  add("startxref\n");
  add(`${xrefOffset}\n`);
  add("%%EOF\n");

  return Buffer.from(parts.join(""), "utf-8");
}

/* ------------------------------------------------------------------
   POST /api/documents/plan-room/seed — Create a sample document
   ------------------------------------------------------------------ */

export async function POST() {
  try {
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Generate sample PDF
    const pdfBuffer = generateSamplePdf();
    const timestamp = Date.now();
    const storagePath = `${userCtx.companyId}/plan-room/${timestamp}-Sample-Floor-Plan-A101.pdf`;

    // Upload to Supabase Storage
    const { error: storageError } = await storageUpload(storagePath, pdfBuffer, {
      contentType: "application/pdf",
      upsert: false,
    });

    if (storageError) {
      console.error("Seed storage upload error:", storageError);
      return NextResponse.json(
        { error: `Upload failed: ${storageError.message}` },
        { status: 500 }
      );
    }

    // Create document record
    const { data: document, error: docError } = await supabase
      .from("documents")
      .insert({
        company_id: userCtx.companyId,
        name: "Sample Floor Plan A-101",
        file_type: "pdf",
        file_size: pdfBuffer.byteLength,
        file_path: storagePath,
        folder_path: "/plan-room",
        category: "plan",
        project_id: null,
        uploaded_by: userCtx.userId,
        tags: ["sample", "architectural"],
        version: 1,
        discipline: "architectural",
        revision_label: "A",
        is_current: true,
      })
      .select()
      .single();

    if (docError) {
      console.error("Seed document insert error:", docError);
      return NextResponse.json({ error: docError.message }, { status: 400 });
    }

    return NextResponse.json(
      { message: "Sample document created", document },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST /api/documents/plan-room/seed error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
