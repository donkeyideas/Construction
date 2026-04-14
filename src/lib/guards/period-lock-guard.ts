import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Asserts that the fiscal period containing `date` is NOT locked.
 * Throws an object with { status, message } if locked, which the caller
 * can use to return an HTTP error response.
 */
export async function assertPeriodOpen(
  supabase: SupabaseClient,
  companyId: string,
  date: string | Date
): Promise<void> {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = d.getMonth() + 1; // 1-based

  const { data: lock } = await supabase
    .from("fiscal_period_locks")
    .select("id")
    .eq("company_id", companyId)
    .eq("year", year)
    .eq("month", month)
    .limit(1)
    .maybeSingle();

  if (lock) {
    const monthName = d.toLocaleString("en-US", { month: "long" });
    throw {
      status: 409,
      message: `Fiscal period ${monthName} ${year} is locked. Unlock it before making changes.`,
    };
  }
}
