import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";

// ---------------------------------------------------------------------------
// GET /api/import/template — Download the master Excel import template
// ---------------------------------------------------------------------------

export async function GET() {
  try {
    const filePath = join(process.cwd(), "mock-data", "template.v.2.xlsx");
    const fileBuffer = await readFile(filePath);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition":
          'attachment; filename="buildwrk-import-template.xlsx"',
        "Content-Length": String(fileBuffer.length),
      },
    });
  } catch (err) {
    console.error("GET /api/import/template error:", err);
    return NextResponse.json(
      { error: "Template file not found" },
      { status: 404 }
    );
  }
}
