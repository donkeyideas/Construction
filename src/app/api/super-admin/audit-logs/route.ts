import { createClient } from "@/lib/supabase/server";
import { isPlatformAdmin } from "@/lib/queries/super-admin";
import { getAuditLogs } from "@/lib/queries/audit-logs";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const isAdmin = await isPlatformAdmin(supabase);

    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = request.nextUrl;

    const filters = {
      action: searchParams.get("action") || undefined,
      entity_type: searchParams.get("entity_type") || undefined,
      user_id: searchParams.get("user_id") || undefined,
      company_id: searchParams.get("company_id") || undefined,
      dateFrom: searchParams.get("dateFrom") || undefined,
      dateTo: searchParams.get("dateTo") || undefined,
    };

    const logs = await getAuditLogs(filters);

    return NextResponse.json({ logs });
  } catch (err) {
    console.error("Audit logs API error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
