/**
 * Mock Supabase client factory for financial UAT tests.
 *
 * Provides a lightweight in-memory query builder that supports the common
 * Supabase PostgREST chain patterns used throughout the financial queries:
 *   .from(table).select(cols).eq(col, val).range(from, to)
 *   .from(table).select(cols).eq(col, val).single()
 *   await supabase.from(table).select(cols).eq(col, val)   // thenable
 *
 * Filtering supports dot-notation for nested joins (e.g. "journal_entries.status").
 */

export type MockDataset = Record<string, Record<string, unknown>[]>;

function resolveNestedValue(row: Record<string, unknown>, column: string): unknown {
  if (column.includes(".")) {
    const [join, field] = column.split(".");
    const nested = row[join];
    if (nested && typeof nested === "object" && !Array.isArray(nested)) {
      return (nested as Record<string, unknown>)[field];
    }
    return undefined;
  }
  return row[column];
}

export function createMockSupabase(tables: MockDataset) {
  return {
    from(tableName: string) {
      // Fresh copy per .from() call — safe for paginatedQuery re-invocations
      let data = [...(tables[tableName] ?? [])];

      const builder: Record<string, unknown> = {
        select(_cols?: string) {
          return builder;
        },

        eq(column: string, value: unknown) {
          data = data.filter((row) => resolveNestedValue(row, column) === value);
          return builder;
        },

        neq(column: string, value: unknown) {
          data = data.filter((row) => resolveNestedValue(row, column) !== value);
          return builder;
        },

        is(column: string, value: unknown) {
          data = data.filter((row) => resolveNestedValue(row, column) === value);
          return builder;
        },

        not(column: string, operator: string, value: unknown) {
          if (operator === "eq") {
            data = data.filter((row) => resolveNestedValue(row, column) !== value);
          } else if (operator === "in") {
            const raw = typeof value === "string" ? value : String(value);
            const vals = raw.replace(/[()]/g, "").split(",");
            data = data.filter((row) => !vals.includes(String(resolveNestedValue(row, column))));
          }
          return builder;
        },

        in(column: string, values: unknown[]) {
          data = data.filter((row) => values.includes(resolveNestedValue(row, column)));
          return builder;
        },

        gt(column: string, value: unknown) {
          data = data.filter((row) => (resolveNestedValue(row, column) as number) > (value as number));
          return builder;
        },

        gte(column: string, value: unknown) {
          data = data.filter((row) => (resolveNestedValue(row, column) as string) >= (value as string));
          return builder;
        },

        lt(column: string, value: unknown) {
          data = data.filter((row) => (resolveNestedValue(row, column) as number) < (value as number));
          return builder;
        },

        lte(column: string, value: unknown) {
          data = data.filter((row) => (resolveNestedValue(row, column) as string) <= (value as string));
          return builder;
        },

        like(column: string, pattern: string) {
          const regex = new RegExp("^" + pattern.replace(/%/g, ".*") + "$");
          data = data.filter((row) => regex.test(String(resolveNestedValue(row, column) ?? "")));
          return builder;
        },

        ilike(column: string, pattern: string) {
          const regex = new RegExp("^" + pattern.replace(/%/g, ".*") + "$", "i");
          data = data.filter((row) => regex.test(String(resolveNestedValue(row, column) ?? "")));
          return builder;
        },

        or(filterString: string) {
          // Parse Supabase .or() filter strings like "name.ilike.%accounts receivable%,name.ilike.%accts receivable%"
          const clauses = filterString.split(",").map((s) => s.trim());
          data = data.filter((row) =>
            clauses.some((clause) => {
              const parts = clause.split(".");
              if (parts.length >= 3) {
                const col = parts[0];
                const op = parts[1];
                const val = parts.slice(2).join(".");
                const cellVal = String(row[col] ?? "");
                if (op === "ilike") {
                  const regex = new RegExp("^" + val.replace(/%/g, ".*") + "$", "i");
                  return regex.test(cellVal);
                }
                if (op === "eq") return cellVal === val;
              }
              return false;
            })
          );
          return builder;
        },

        order(_column: string, _opts?: { ascending?: boolean }) {
          return builder;
        },

        limit(count: number) {
          data = data.slice(0, count);
          return builder;
        },

        range(from: number, to: number) {
          return Promise.resolve({ data: data.slice(from, to + 1), error: null });
        },

        single() {
          return Promise.resolve({
            data: data[0] ?? null,
            error: data.length === 0 ? { message: "Row not found", code: "PGRST116" } : null,
          });
        },

        // Make builder thenable so `await supabase.from(...).select(...)` works
        then(
          resolve: (value: { data: Record<string, unknown>[]; error: null }) => void,
          _reject?: (reason: unknown) => void
        ) {
          resolve({ data, error: null });
        },
      };

      return builder;
    },
  };
}
