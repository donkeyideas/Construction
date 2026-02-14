import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";

/**
 * POST /api/reports/export
 * Generates a simple PDF report from provided data.
 * Uses server-side HTML-to-PDF approach for simplicity.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { title, data, columns } = body;

    if (!data || !Array.isArray(data)) {
      return NextResponse.json({ error: "No data provided" }, { status: 400 });
    }

    const cols = columns || (data.length > 0 ? Object.keys(data[0]).map((k: string) => ({ key: k, label: k })) : []);
    const now = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

    // Generate simple HTML for PDF
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8"/>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; color: #1a1a2e; font-size: 12px; }
          h1 { font-size: 20px; margin-bottom: 4px; color: #1a1a2e; }
          .meta { color: #666; font-size: 11px; margin-bottom: 24px; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          th { background: #f5f5f7; color: #1a1a2e; font-weight: 600; text-align: left; padding: 8px 10px; border-bottom: 2px solid #e0e0e0; font-size: 11px; }
          td { padding: 7px 10px; border-bottom: 1px solid #eee; font-size: 11px; }
          tr:nth-child(even) { background: #fafafa; }
          .footer { margin-top: 32px; font-size: 10px; color: #999; border-top: 1px solid #eee; padding-top: 12px; }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(title || "Report")}</h1>
        <div class="meta">${escapeHtml(userCompany.companyName)} &middot; Generated ${now}</div>
        <table>
          <thead>
            <tr>
              ${cols.map((c: { label: string }) => `<th>${escapeHtml(c.label)}</th>`).join("")}
            </tr>
          </thead>
          <tbody>
            ${data.map((row: Record<string, unknown>) => `
              <tr>
                ${cols.map((c: { key: string }) => {
                  const val = row[c.key];
                  return `<td>${escapeHtml(val !== null && val !== undefined ? String(val) : "")}</td>`;
                }).join("")}
              </tr>
            `).join("")}
          </tbody>
        </table>
        <div class="footer">
          Buildwrk Construction ERP &middot; ${data.length} records &middot; ${now}
        </div>
      </body>
      </html>
    `;

    // Return HTML that can be printed as PDF client-side
    // For server-side PDF generation, we'd need puppeteer/playwright (too heavy for serverless)
    // Instead, return printable HTML that the client opens in a new window and prints
    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html",
        "Content-Disposition": `inline; filename="${(title || "report").replace(/\s+/g, "_")}.html"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
