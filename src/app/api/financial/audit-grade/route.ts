import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { runFinancialAudit } from "@/lib/queries/financial-audit";

/**
 * GET /api/financial/audit-grade
 *
 * Returns a lightweight audit grade for display in the topbar.
 * Runs the full financial audit and returns only the grade + label.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const userCompany = await getCurrentUserCompany(supabase);

    if (!userCompany) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await runFinancialAudit(supabase, userCompany.companyId);

    return NextResponse.json({
      grade: result.grade,
      gradeLabel: result.gradeLabel,
    });
  } catch (error) {
    console.error("GET /api/financial/audit-grade error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
