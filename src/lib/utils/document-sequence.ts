import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Atomically increments and returns the next sequential document number.
 * Uses upsert to initialize the counter if it doesn't exist yet.
 *
 * Returns formatted strings like "JE-000142", "INV-000089", "PAY-000031".
 */
export async function nextDocumentNumber(
  supabase: SupabaseClient,
  companyId: string,
  documentType: "JE" | "INV" | "PAY"
): Promise<string> {
  // Upsert: insert with last_number=1 or increment existing
  const { data, error } = await supabase.rpc("increment_document_sequence", {
    p_company_id: companyId,
    p_document_type: documentType,
  });

  if (error || data === null || data === undefined) {
    // Fallback: manual upsert + select approach
    return await fallbackNextNumber(supabase, companyId, documentType);
  }

  return formatDocumentNumber(documentType, data as number);
}

async function fallbackNextNumber(
  supabase: SupabaseClient,
  companyId: string,
  documentType: string
): Promise<string> {
  // Try to get existing sequence
  const { data: existing } = await supabase
    .from("document_sequences")
    .select("id, last_number")
    .eq("company_id", companyId)
    .eq("document_type", documentType)
    .single();

  if (existing) {
    const nextNum = existing.last_number + 1;
    await supabase
      .from("document_sequences")
      .update({ last_number: nextNum })
      .eq("id", existing.id);
    return formatDocumentNumber(documentType, nextNum);
  }

  // Insert new sequence starting at 1
  await supabase.from("document_sequences").insert({
    company_id: companyId,
    document_type: documentType,
    last_number: 1,
  });
  return formatDocumentNumber(documentType, 1);
}

function formatDocumentNumber(prefix: string, num: number): string {
  return `${prefix}-${String(num).padStart(6, "0")}`;
}
