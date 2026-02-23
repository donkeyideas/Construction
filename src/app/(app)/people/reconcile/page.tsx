import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getPayrollRuns } from "@/lib/queries/payroll";
import ReconcileClient from "./ReconcileClient";

export const metadata = { title: "Labor Reconcile - Buildwrk" };

// ---------------------------------------------------------------------------
// Types for the client component
// ---------------------------------------------------------------------------

export interface AccrualRow {
  jeId: string;
  date: string;
  userId: string;
  employeeName: string;
  amount: number;
  description: string;
}

export interface WageAccountSummary {
  accountName: string;
  accountType: string;
  totalDebits: number;
  totalCredits: number;
  netBalance: number;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function ReconcilePage() {
  const supabase = await createClient();
  const userCtx = await getCurrentUserCompany(supabase);
  if (!userCtx) redirect("/register");

  const { companyId } = userCtx;

  // -----------------------------------------------------------------------
  // 1. Find wage-related GL accounts (same pattern as findLaborAccounts)
  // -----------------------------------------------------------------------
  const { data: accounts } = await supabase
    .from("chart_of_accounts")
    .select("id, name, account_type, account_number")
    .eq("company_id", companyId)
    .eq("is_active", true);

  let wagesExpenseId: string | null = null;
  let wagesExpenseName = "Wages Expense";
  let wagesPayableId: string | null = null;
  let wagesPayableName = "Wages Payable";

  for (const a of accounts ?? []) {
    const n = a.name.toLowerCase();
    if (
      !wagesExpenseId &&
      a.account_type === "expense" &&
      (n.includes("wage") || n.includes("labor") || n.includes("salary") || n.includes("payroll"))
    ) {
      wagesExpenseId = a.id;
      wagesExpenseName = a.name;
    }
    if (
      !wagesPayableId &&
      a.account_type === "liability" &&
      (n.includes("payable") || n.includes("accrued")) &&
      (n.includes("wage") || n.includes("payroll") || n.includes("labor") || n.includes("salary"))
    ) {
      wagesPayableId = a.id;
      wagesPayableName = a.name;
    }
  }

  // Fallbacks
  if (!wagesExpenseId) {
    for (const a of accounts ?? []) {
      if (a.account_type === "expense") { wagesExpenseId = a.id; wagesExpenseName = a.name; break; }
    }
  }
  if (!wagesPayableId) {
    for (const a of accounts ?? []) {
      if (a.account_type === "liability" && a.name.toLowerCase().includes("payable")) {
        wagesPayableId = a.id; wagesPayableName = a.name; break;
      }
    }
  }

  // -----------------------------------------------------------------------
  // 2. Parallel fetches
  // -----------------------------------------------------------------------
  const [accrualJEsRes, payrollRuns, expenseLinesRes, payableLinesRes, employeesRes] =
    await Promise.all([
      // Active labor accrual JEs
      supabase
        .from("journal_entries")
        .select("id, reference, entry_date, description")
        .eq("company_id", companyId)
        .eq("status", "posted")
        .like("reference", "labor:%")
        .order("entry_date", { ascending: false }),

      // Payroll runs
      getPayrollRuns(supabase, companyId, 20),

      // Wages Expense account lines
      wagesExpenseId
        ? supabase
            .from("journal_entry_lines")
            .select("debit, credit, journal_entries!inner(company_id, status)")
            .eq("account_id", wagesExpenseId)
            .eq("journal_entries.company_id", companyId)
            .eq("journal_entries.status", "posted")
        : Promise.resolve({ data: [] }),

      // Wages Payable account lines
      wagesPayableId
        ? supabase
            .from("journal_entry_lines")
            .select("debit, credit, journal_entries!inner(company_id, status)")
            .eq("account_id", wagesPayableId)
            .eq("journal_entries.company_id", companyId)
            .eq("journal_entries.status", "posted")
        : Promise.resolve({ data: [] }),

      // Employee names
      supabase
        .from("contacts")
        .select("user_id, first_name, last_name, email")
        .eq("company_id", companyId)
        .eq("contact_type", "employee")
        .not("user_id", "is", null),
    ]);

  // -----------------------------------------------------------------------
  // 3. Build employee name map
  // -----------------------------------------------------------------------
  const empMap: Record<string, string> = {};
  for (const e of employeesRes.data ?? []) {
    if (e.user_id) {
      empMap[e.user_id] =
        `${e.first_name ?? ""} ${e.last_name ?? ""}`.trim() || e.email || "Unknown";
    }
  }

  // -----------------------------------------------------------------------
  // 4. Get amounts for each accrual JE
  // -----------------------------------------------------------------------
  const accrualJEs = accrualJEsRes.data ?? [];
  const accrualJEIds = accrualJEs.map((j) => j.id);

  let accrualLinesMap: Record<string, number> = {};
  if (accrualJEIds.length > 0) {
    const { data: lines } = await supabase
      .from("journal_entry_lines")
      .select("journal_entry_id, debit")
      .in("journal_entry_id", accrualJEIds)
      .gt("debit", 0);

    for (const l of lines ?? []) {
      accrualLinesMap[l.journal_entry_id] =
        (accrualLinesMap[l.journal_entry_id] ?? 0) + Number(l.debit);
    }
  }

  // Build accrual rows
  const accruals: AccrualRow[] = accrualJEs.map((je) => {
    const parts = (je.reference as string).split(":");
    const userId = parts[1] ?? "";
    return {
      jeId: je.id,
      date: je.entry_date,
      userId,
      employeeName: empMap[userId] || "Unknown Employee",
      amount: Math.round((accrualLinesMap[je.id] ?? 0) * 100) / 100,
      description: je.description ?? "",
    };
  });

  // -----------------------------------------------------------------------
  // 5. Wage account summaries
  // -----------------------------------------------------------------------
  function sumAccount(
    lines: { debit: number; credit: number }[] | null,
    name: string,
    type: string
  ): WageAccountSummary {
    let totalDebits = 0;
    let totalCredits = 0;
    for (const l of lines ?? []) {
      totalDebits += Number(l.debit ?? 0);
      totalCredits += Number(l.credit ?? 0);
    }
    return {
      accountName: name,
      accountType: type,
      totalDebits: Math.round(totalDebits * 100) / 100,
      totalCredits: Math.round(totalCredits * 100) / 100,
      netBalance: Math.round((totalDebits - totalCredits) * 100) / 100,
    };
  }

  const wageAccounts: WageAccountSummary[] = [
    sumAccount(
      (expenseLinesRes.data ?? []) as { debit: number; credit: number }[],
      wagesExpenseName,
      "expense"
    ),
    sumAccount(
      (payableLinesRes.data ?? []) as { debit: number; credit: number }[],
      wagesPayableName,
      "liability"
    ),
  ];

  return (
    <ReconcileClient
      accruals={JSON.parse(JSON.stringify(accruals))}
      payrollRuns={JSON.parse(JSON.stringify(payrollRuns))}
      wageAccounts={wageAccounts}
    />
  );
}
