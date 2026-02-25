/**
 * Shared pagination helper — Supabase PostgREST defaults to returning max 1000 rows.
 * This fetches ALL rows by paginating through the full result set.
 *
 * Usage:
 *   const rows = await paginatedQuery<{ balance_due: number }>((from, to) =>
 *     supabase.from("invoices").select("balance_due").eq("company_id", id).range(from, to)
 *   );
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function paginatedQuery<T = Record<string, unknown>>(
  queryFn: (from: number, to: number) => PromiseLike<{ data: any[] | null; error: unknown }>
): Promise<T[]> {
  const PAGE_SIZE = 1000;
  const all: T[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await queryFn(from, from + PAGE_SIZE - 1);
    if (error) {
      const msg = typeof error === "object" && error !== null && "message" in error
        ? (error as { message: string }).message
        : String(error);
      console.error(`paginatedQuery error at offset ${from}:`, msg);
      throw new Error(`Query failed at offset ${from}: ${msg}`);
    }
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return all;
}
