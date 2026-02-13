import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getJournalEntries, createJournalEntry, getChartOfAccounts } from "@/lib/queries/financial";
import type { JournalEntryCreateData } from "@/lib/queries/financial";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const userCompany = await getCurrentUserCompany(supabase);

    if (!userCompany) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const filters: { status?: string; startDate?: string; endDate?: string } = {};

    const status = searchParams.get("status");
    if (status) filters.status = status;

    const startDate = searchParams.get("startDate");
    if (startDate) filters.startDate = startDate;

    const endDate = searchParams.get("endDate");
    if (endDate) filters.endDate = endDate;

    const [entries, accounts] = await Promise.all([
      getJournalEntries(supabase, userCompany.companyId, filters),
      searchParams.get("includeAccounts") === "true"
        ? getChartOfAccounts(supabase, userCompany.companyId)
        : Promise.resolve(null),
    ]);

    return NextResponse.json({ entries, accounts });
  } catch (error) {
    console.error("GET /api/financial/journal-entries error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const userCompany = await getCurrentUserCompany(supabase);

    if (!userCompany) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    if (!body.entry_number || !body.entry_date || !body.description || !body.lines?.length) {
      return NextResponse.json(
        { error: "Missing required fields: entry_number, entry_date, description, lines" },
        { status: 400 }
      );
    }

    // Validate balanced entry
    const totalDebit = body.lines.reduce((s: number, l: { debit?: number }) => s + (l.debit ?? 0), 0);
    const totalCredit = body.lines.reduce((s: number, l: { credit?: number }) => s + (l.credit ?? 0), 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return NextResponse.json(
        { error: `Entry is not balanced. Debits ($${totalDebit.toFixed(2)}) must equal Credits ($${totalCredit.toFixed(2)})` },
        { status: 400 }
      );
    }

    const data: JournalEntryCreateData = {
      entry_number: body.entry_number,
      entry_date: body.entry_date,
      description: body.description,
      reference: body.reference,
      project_id: body.project_id,
      lines: body.lines,
    };

    const result = await createJournalEntry(supabase, userCompany.companyId, userCompany.userId, data);

    if (!result) {
      return NextResponse.json({ error: "Failed to create journal entry" }, { status: 500 });
    }

    return NextResponse.json({ id: result.id }, { status: 201 });
  } catch (error) {
    console.error("POST /api/financial/journal-entries error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
