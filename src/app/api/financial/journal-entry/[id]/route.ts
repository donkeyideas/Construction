import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: entry, error } = await supabase
      .from("journal_entries")
      .select("id, entry_number, entry_date, description, reference, status, created_at")
      .eq("id", id)
      .eq("company_id", userCtx.companyId)
      .single();

    if (error || !entry) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { data: lines } = await supabase
      .from("journal_entry_lines")
      .select("id, account_id, description, debit, credit, chart_of_accounts(account_number, name)")
      .eq("journal_entry_id", id)
      .eq("company_id", userCtx.companyId)
      .order("created_at", { ascending: true });

    return NextResponse.json({
      ...entry,
      lines: (lines ?? []).map((l) => ({
        id: l.id,
        accountNumber: (l.chart_of_accounts as unknown as { account_number: string; name: string } | null)?.account_number ?? "",
        accountName: (l.chart_of_accounts as unknown as { account_number: string; name: string } | null)?.name ?? "",
        description: l.description ?? "",
        debit: Number(l.debit) || 0,
        credit: Number(l.credit) || 0,
      })),
    });
  } catch (err) {
    console.error("GET /api/financial/journal-entry/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
