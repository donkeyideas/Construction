import { SupabaseClient } from "@supabase/supabase-js";

export interface LinkedJournalEntry {
  id: string;
  entry_number: string;
  entry_date: string;
  description: string;
  reference: string | null;
  status: string;
  total_debit: number;
  total_credit: number;
}

/**
 * Find journal entries linked to a specific entity via the reference field.
 * Reference format: "invoice:{id}", "payment:{id}", "change_order:{id}", "payroll:{id}"
 */
export async function findLinkedJournalEntries(
  supabase: SupabaseClient,
  companyId: string,
  referencePrefix: string,
  entityId: string
): Promise<LinkedJournalEntry[]> {
  const reference = `${referencePrefix}${entityId}`;

  const { data: entries } = await supabase
    .from("journal_entries")
    .select("id, entry_number, entry_date, description, reference, status")
    .eq("company_id", companyId)
    .eq("reference", reference)
    .order("entry_date", { ascending: false });

  if (!entries || entries.length === 0) return [];

  // Get totals for each entry
  const entryIds = entries.map((e) => e.id);
  const { data: lines } = await supabase
    .from("journal_entry_lines")
    .select("journal_entry_id, debit, credit")
    .in("journal_entry_id", entryIds);

  const totalsMap = new Map<string, { debit: number; credit: number }>();
  for (const line of lines ?? []) {
    const existing = totalsMap.get(line.journal_entry_id) ?? { debit: 0, credit: 0 };
    existing.debit += line.debit ?? 0;
    existing.credit += line.credit ?? 0;
    totalsMap.set(line.journal_entry_id, existing);
  }

  return entries.map((e) => {
    const totals = totalsMap.get(e.id) ?? { debit: 0, credit: 0 };
    return {
      id: e.id,
      entry_number: e.entry_number,
      entry_date: e.entry_date,
      description: e.description,
      reference: e.reference,
      status: e.status,
      total_debit: totals.debit,
      total_credit: totals.credit,
    };
  });
}

/**
 * Find journal entries for multiple entities at once (batch lookup).
 * Returns a Map from entityId to its linked JEs.
 */
export async function findLinkedJournalEntriesBatch(
  supabase: SupabaseClient,
  companyId: string,
  referencePrefix: string,
  entityIds: string[]
): Promise<Map<string, LinkedJournalEntry[]>> {
  const result = new Map<string, LinkedJournalEntry[]>();
  if (entityIds.length === 0) return result;

  // Build reference values
  const references = entityIds.map((id) => `${referencePrefix}${id}`);

  const { data: entries } = await supabase
    .from("journal_entries")
    .select("id, entry_number, entry_date, description, reference, status")
    .eq("company_id", companyId)
    .in("reference", references)
    .order("entry_date", { ascending: false });

  if (!entries || entries.length === 0) return result;

  // Get totals
  const entryIds = entries.map((e) => e.id);
  const { data: lines } = await supabase
    .from("journal_entry_lines")
    .select("journal_entry_id, debit, credit")
    .in("journal_entry_id", entryIds);

  const totalsMap = new Map<string, { debit: number; credit: number }>();
  for (const line of lines ?? []) {
    const existing = totalsMap.get(line.journal_entry_id) ?? { debit: 0, credit: 0 };
    existing.debit += line.debit ?? 0;
    existing.credit += line.credit ?? 0;
    totalsMap.set(line.journal_entry_id, existing);
  }

  // Group by entity ID (extracted from reference)
  for (const entry of entries) {
    const entityId = entry.reference?.replace(referencePrefix, "") ?? "";
    const totals = totalsMap.get(entry.id) ?? { debit: 0, credit: 0 };

    const linked: LinkedJournalEntry = {
      id: entry.id,
      entry_number: entry.entry_number,
      entry_date: entry.entry_date,
      description: entry.description,
      reference: entry.reference,
      status: entry.status,
      total_debit: totals.debit,
      total_credit: totals.credit,
    };

    const existing = result.get(entityId) ?? [];
    existing.push(linked);
    result.set(entityId, existing);
  }

  return result;
}
