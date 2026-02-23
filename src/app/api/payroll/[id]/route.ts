import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getPayrollRunDetail } from "@/lib/queries/payroll";
import { voidJournalEntry } from "@/lib/queries/financial";
import { buildCompanyAccountMap, generatePayrollRunJournalEntry } from "@/lib/utils/invoice-accounting";
import { reverseLaborAccrualsForPeriod } from "@/lib/utils/labor-cost";

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

    // Handle "paid" transition: reverse daily labor accruals, then generate payroll JE
    if (newStatus === "paid") {
      // Reverse daily labor accrual JEs for this pay period to prevent double-counting
      const employeeUserIds = detail.items.map(
        (item: { user_id: string }) => item.user_id
      );
      const { reversedCount, totalAmount } = await reverseLaborAccrualsForPeriod(
        supabase,
        userCtx.companyId,
        detail.period_start,
        detail.period_end,
        employeeUserIds
      );
      if (reversedCount > 0) {
        console.log(
          `Reversed ${reversedCount} labor accruals ($${totalAmount}) for payroll run ${id}`
        );
      }

      const accountMap = await buildCompanyAccountMap(supabase, userCtx.companyId);
      const jeResult = await generatePayrollRunJournalEntry(
        supabase,
        userCtx.companyId,
        userCtx.userId,
        detail,
        accountMap
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

