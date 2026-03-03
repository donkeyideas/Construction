import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";

export interface GLSourceEntry {
  id: string;
  entry_number: string;
  entry_date: string;
  description: string;
  reference: string | null;
  debit: number;
  credit: number;
}

/**
 * GET /api/financial/gl-sources?type=ar|ap
 *
 * Returns GL journal entries that post to AR or AP accounts but are NOT
 * backed by an invoice record in the subledger (i.e. JE reference does NOT
 * start with "invoice:"). These are the "missing" entries that explain the
 * GL vs subledger mismatch shown on the AR/AP pages.
 *
 * Results are aggregated at the journal-entry level (net debit/credit per JE).
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type"); // "ar" or "ap"

  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);
  if (!userCompany) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { companyId } = userCompany;

  // Account name patterns depend on whether we're looking at AR or AP
  const nameFilter =
    type === "ar"
      ? "name.ilike.%accounts receivable%,name.ilike.%retainage receivable%"
      : "name.ilike.%accounts payable%,name.ilike.%retainage payable%";

  const { data: accounts } = await supabase
    .from("chart_of_accounts")
    .select("id")
    .eq("company_id", companyId)
    .or(nameFilter);

  if (!accounts || accounts.length === 0) return NextResponse.json([]);

  const accountIds = accounts.map((a) => a.id);

  // Paginate JE lines to avoid the 1000-row Supabase limit
  const PAGE_SIZE = 1000;
  let from = 0;
  const allLines: Array<{
    id: string;
    debit: number | null;
    credit: number | null;
    description: string | null;
    journal_entries: {
      id: string;
      entry_number: string;
      entry_date: string;
      description: string | null;
      reference: string | null;
      status: string;
    } | null;
  }> = [];

  for (;;) {
    const { data: lines } = await supabase
      .from("journal_entry_lines")
      .select(
        "id, debit, credit, description, journal_entries(id, entry_number, entry_date, description, reference, status)"
      )
      .eq("company_id", companyId)
      .in("account_id", accountIds)
      .range(from, from + PAGE_SIZE - 1);

    if (!lines || lines.length === 0) break;
    allLines.push(...(lines as unknown as typeof allLines));
    if (lines.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  // Keep only posted JEs that are NOT invoice-backed
  const filtered = allLines.filter((l) => {
    const je = l.journal_entries;
    if (!je || je.status !== "posted") return false;
    // Invoice-backed entries are already in the subledger — skip them
    if (je.reference?.startsWith("invoice:")) return false;
    return true;
  });

  // Aggregate debit/credit per journal entry
  const jeMap = new Map<
    string,
    GLSourceEntry
  >();

  for (const line of filtered) {
    const je = line.journal_entries!;
    if (!jeMap.has(je.id)) {
      jeMap.set(je.id, {
        id: je.id,
        entry_number: je.entry_number,
        entry_date: je.entry_date,
        description: je.description || line.description || "",
        reference: je.reference,
        debit: 0,
        credit: 0,
      });
    }
    const entry = jeMap.get(je.id)!;
    entry.debit += Number(line.debit) || 0;
    entry.credit += Number(line.credit) || 0;
  }

  // For AR: only include entries where net debit > 0 (increases AR balance)
  // For AP: only include entries where net credit > 0 (increases AP balance)
  const result = Array.from(jeMap.values())
    .filter((e) =>
      type === "ar" ? e.debit - e.credit > 0.01 : e.credit - e.debit > 0.01
    )
    .sort((a, b) => b.entry_date.localeCompare(a.entry_date));

  return NextResponse.json(result);
}
