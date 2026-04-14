import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Records field-level changes to financial_change_history.
 * Compares `before` and `after` snapshots and writes one row per changed field.
 * Fire-and-forget — errors are logged but never thrown.
 */
export async function trackChanges(
  supabase: SupabaseClient,
  params: {
    companyId: string;
    userId: string;
    entityType: "journal_entry" | "invoice" | "payment";
    entityId: string;
    before: Record<string, unknown>;
    after: Record<string, unknown>;
  }
): Promise<void> {
  try {
    const { companyId, userId, entityType, entityId, before, after } = params;
    const rows: Array<{
      company_id: string;
      user_id: string;
      entity_type: string;
      entity_id: string;
      field_name: string;
      old_value: string | null;
      new_value: string | null;
    }> = [];

    for (const key of Object.keys(after)) {
      const oldVal = before[key];
      const newVal = after[key];

      // Skip unchanged or undefined fields
      if (newVal === undefined) continue;
      if (stringify(oldVal) === stringify(newVal)) continue;

      rows.push({
        company_id: companyId,
        user_id: userId,
        entity_type: entityType,
        entity_id: entityId,
        field_name: key,
        old_value: stringify(oldVal),
        new_value: stringify(newVal),
      });
    }

    if (rows.length > 0) {
      await supabase.from("financial_change_history").insert(rows);
    }
  } catch (err) {
    console.error("[change-tracker] Failed to record changes:", err);
  }
}

function stringify(val: unknown): string | null {
  if (val === null || val === undefined) return null;
  if (typeof val === "object") return JSON.stringify(val);
  return String(val);
}
