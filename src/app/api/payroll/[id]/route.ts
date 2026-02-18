import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getPayrollRunDetail } from "@/lib/queries/payroll";
import { createPostedJournalEntry, voidJournalEntry } from "@/lib/queries/financial";
import { buildCompanyAccountMap } from "@/lib/utils/invoice-accounting";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/* ---------------------------------------------------------------------------
   GET /api/payroll/[id] - Get payroll run detail
   --------------------------------------------------------------------------- */

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const detail = await getPayrollRunDetail(supabase, userCtx.companyId, id);

    if (!detail) {
      return NextResponse.json(
        { error: "Payroll run not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ run: detail });
  } catch (error) {
    console.error("GET /api/payroll/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/* ---------------------------------------------------------------------------
   PATCH /api/payroll/[id] - Update payroll run status
   Body: { status: "approved" | "paid" | "voided", notes? }
   --------------------------------------------------------------------------- */

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const newStatus = body.status;

    if (!newStatus || !["approved", "paid", "voided"].includes(newStatus)) {
      return NextResponse.json(
        { error: "Invalid status. Must be 'approved', 'paid', or 'voided'." },
        { status: 400 }
      );
    }

    // Fetch current run
    const detail = await getPayrollRunDetail(supabase, userCtx.companyId, id);
    if (!detail) {
      return NextResponse.json(
        { error: "Payroll run not found" },
        { status: 404 }
      );
    }

    // Validate status transitions
    const validTransitions: Record<string, string[]> = {
      draft: ["approved", "voided"],
      approved: ["paid", "voided"],
      paid: ["voided"],
      voided: [],
    };

    if (!validTransitions[detail.status]?.includes(newStatus)) {
      return NextResponse.json(
        {
          error: `Cannot transition from '${detail.status}' to '${newStatus}'.`,
        },
        { status: 400 }
      );
    }

    const updatePayload: Record<string, unknown> = { status: newStatus };

    if (body.notes !== undefined) {
      updatePayload.notes = body.notes;
    }

    // Handle "approved" transition
    if (newStatus === "approved") {
      updatePayload.approved_by = userCtx.userId;
      updatePayload.approved_at = new Date().toISOString();
    }

    // Handle "paid" transition: generate journal entry
    if (newStatus === "paid") {
      const jeResult = await generatePayrollJournalEntry(
        supabase,
        userCtx.companyId,
        userCtx.userId,
        detail
      );

      if (jeResult) {
        updatePayload.journal_entry_id = jeResult.journalEntryId;
      }

      // Mark consumed time entries as processed
      const allTimeEntryIds: string[] = [];
      for (const item of detail.items) {
        if (item.time_entry_ids && item.time_entry_ids.length > 0) {
          allTimeEntryIds.push(...item.time_entry_ids);
        }
      }

      if (allTimeEntryIds.length > 0) {
        await supabase
          .from("time_entries")
          .update({ status: "processed" })
          .in("id", allTimeEntryIds);
      }
    }

    // Handle "voided" transition: void the journal entry if exists
    if (newStatus === "voided" && detail.journal_entry_id) {
      await voidJournalEntry(supabase, detail.journal_entry_id);
    }

    // Update the payroll run
    const { error: updateError } = await supabase
      .from("payroll_runs")
      .update(updatePayload)
      .eq("id", id)
      .eq("company_id", userCtx.companyId);

    if (updateError) {
      console.error("Error updating payroll run status:", updateError);
      return NextResponse.json(
        { error: "Failed to update payroll run status." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, status: newStatus });
  } catch (error) {
    console.error("PATCH /api/payroll/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/* ---------------------------------------------------------------------------
   DELETE /api/payroll/[id] - Delete a draft payroll run and its items
   --------------------------------------------------------------------------- */

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify the run exists and is in draft status
    const { data: run } = await supabase
      .from("payroll_runs")
      .select("id, status")
      .eq("id", id)
      .eq("company_id", userCtx.companyId)
      .single();

    if (!run) {
      return NextResponse.json(
        { error: "Payroll run not found" },
        { status: 404 }
      );
    }

    if (run.status !== "draft") {
      return NextResponse.json(
        { error: "Only draft payroll runs can be deleted." },
        { status: 400 }
      );
    }

    // Delete items first, then the run
    await supabase
      .from("payroll_items")
      .delete()
      .eq("payroll_run_id", id)
      .eq("company_id", userCtx.companyId);

    const { error: deleteError } = await supabase
      .from("payroll_runs")
      .delete()
      .eq("id", id)
      .eq("company_id", userCtx.companyId);

    if (deleteError) {
      console.error("Error deleting payroll run:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete payroll run." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/payroll/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/* ==================================================================
   Internal: Generate Payroll Journal Entry
   ================================================================== */

async function generatePayrollJournalEntry(
  supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never,
  companyId: string,
  userId: string,
  run: NonNullable<Awaited<ReturnType<typeof getPayrollRunDetail>>>
): Promise<{ journalEntryId: string } | null> {
  const accountMap = await buildCompanyAccountMap(supabase, companyId);

  if (!accountMap.cashId) {
    console.error("Payroll JE: No cash account found");
    return null;
  }

  // Find payroll expense account: search for expense account with "payroll" or "salary" in name
  let payrollExpenseId: string | null = null;
  const { data: expenseAccounts } = await supabase
    .from("chart_of_accounts")
    .select("id, name, account_number")
    .eq("company_id", companyId)
    .eq("account_type", "expense")
    .eq("is_active", true);

  for (const acct of expenseAccounts ?? []) {
    const nameLower = acct.name.toLowerCase();
    if (nameLower.includes("payroll") || nameLower.includes("salary") || nameLower.includes("wages")) {
      payrollExpenseId = acct.id;
      break;
    }
  }

  // Fallback to first expense account
  if (!payrollExpenseId && expenseAccounts && expenseAccounts.length > 0) {
    payrollExpenseId = expenseAccounts[0].id;
  }

  if (!payrollExpenseId) {
    console.error("Payroll JE: No expense account found");
    return null;
  }

  // Find payroll liability accounts by account_number
  const findAccount = async (accountNumber: string): Promise<string | null> => {
    // First check the byNumber map
    if (accountMap.byNumber[accountNumber]) {
      return accountMap.byNumber[accountNumber];
    }
    // If not found, try to look up directly
    const { data } = await supabase
      .from("chart_of_accounts")
      .select("id")
      .eq("company_id", companyId)
      .eq("account_number", accountNumber)
      .eq("is_active", true)
      .single();
    return data?.id ?? null;
  };

  const [
    fitPayableId,
    sitPayableId,
    ficaPayableId,
    futaPayableId,
    sutaPayableId,
  ] = await Promise.all([
    findAccount("2500"),
    findAccount("2510"),
    findAccount("2520"),
    findAccount("2530"),
    findAccount("2540"),
  ]);

  // Sum tax amounts across all items
  let totalFIT = 0;
  let totalSIT = 0;
  let totalFICA = 0; // SS + Medicare (employee + employer)
  let totalFUTA = 0;
  let totalSUTA = 0;

  for (const item of run.items) {
    totalFIT += item.federal_income_tax;
    totalSIT += item.state_income_tax;
    totalFICA +=
      item.social_security_employee +
      item.medicare_employee +
      item.social_security_employer +
      item.medicare_employer;
    totalFUTA += item.futa_employer;
    totalSUTA += item.suta_employer;
  }

  // Build JE lines
  const lines: {
    account_id: string;
    debit: number;
    credit: number;
    description?: string;
  }[] = [];

  // DR: Payroll Expense = total_gross + total_employer_taxes
  const payrollExpenseAmount = run.total_gross + run.total_employer_taxes;
  lines.push({
    account_id: payrollExpenseId,
    debit: Math.round(payrollExpenseAmount * 100) / 100,
    credit: 0,
    description: "Payroll expense",
  });

  // CR: Federal Income Tax Payable
  if (totalFIT > 0 && fitPayableId) {
    lines.push({
      account_id: fitPayableId,
      debit: 0,
      credit: Math.round(totalFIT * 100) / 100,
      description: "Federal income tax withheld",
    });
  }

  // CR: State Income Tax Payable
  if (totalSIT > 0 && sitPayableId) {
    lines.push({
      account_id: sitPayableId,
      debit: 0,
      credit: Math.round(totalSIT * 100) / 100,
      description: "State income tax withheld",
    });
  }

  // CR: FICA Payable (SS + Medicare, employee + employer)
  if (totalFICA > 0 && ficaPayableId) {
    lines.push({
      account_id: ficaPayableId,
      debit: 0,
      credit: Math.round(totalFICA * 100) / 100,
      description: "FICA payable (SS + Medicare)",
    });
  }

  // CR: FUTA Payable
  if (totalFUTA > 0 && futaPayableId) {
    lines.push({
      account_id: futaPayableId,
      debit: 0,
      credit: Math.round(totalFUTA * 100) / 100,
      description: "FUTA payable",
    });
  }

  // CR: SUTA Payable
  if (totalSUTA > 0 && sutaPayableId) {
    lines.push({
      account_id: sutaPayableId,
      debit: 0,
      credit: Math.round(totalSUTA * 100) / 100,
      description: "SUTA payable",
    });
  }

  // CR: Cash = total_net
  lines.push({
    account_id: accountMap.cashId,
    debit: 0,
    credit: Math.round(run.total_net * 100) / 100,
    description: "Net payroll disbursement",
  });

  // If any payable accounts were missing, lump those amounts into Cash credit
  // to keep the entry balanced. Calculate the imbalance.
  const totalDebits = lines.reduce((s, l) => s + l.debit, 0);
  const totalCredits = lines.reduce((s, l) => s + l.credit, 0);
  const imbalance = totalDebits - totalCredits;

  if (Math.abs(imbalance) > 0.01) {
    // Add the difference to cash credit (missing payable accounts)
    const cashLine = lines.find(
      (l) => l.account_id === accountMap.cashId && l.credit > 0
    );
    if (cashLine) {
      cashLine.credit = Math.round((cashLine.credit + imbalance) * 100) / 100;
    }
  }

  const periodLabel = `${run.period_start} to ${run.period_end}`;
  const entryData = {
    entry_number: `JE-PR-${run.id.substring(0, 8)}`,
    entry_date: run.pay_date,
    description: `Payroll for ${periodLabel} (${run.employee_count} employees)`,
    reference: `payroll_run:${run.id}`,
    lines,
  };

  const result = await createPostedJournalEntry(
    supabase,
    companyId,
    userId,
    entryData
  );

  return result ? { journalEntryId: result.id } : null;
}
