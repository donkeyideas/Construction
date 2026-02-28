import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import {
  updateBankTransaction,
  deleteBankTransaction,
} from "@/lib/queries/banking";
import { generateBankTransactionJournalEntry } from "@/lib/utils/invoice-accounting";
import { ensureBankAccountGLLink } from "@/lib/utils/bank-gl-linkage";

// ---------------------------------------------------------------------------
// PATCH /api/financial/banking/transactions/[id] — Update a transaction
// ---------------------------------------------------------------------------

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Verify the transaction belongs to the company (fetch full row for JE regen)
    const { data: existing } = await supabase
      .from("bank_transactions")
      .select("id, company_id, bank_account_id, transaction_date, transaction_type, amount, description, metadata")
      .eq("id", id)
      .single();

    if (!existing || existing.company_id !== userCtx.companyId) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      );
    }

    const body = await request.json();

    const updates: Record<string, unknown> = {};
    if (body.transaction_date !== undefined)
      updates.transaction_date = body.transaction_date;
    if (body.description !== undefined)
      updates.description = body.description;
    if (body.reference !== undefined) updates.reference = body.reference;
    if (body.transaction_type !== undefined)
      updates.transaction_type = body.transaction_type;
    if (body.amount !== undefined) updates.amount = body.amount;
    if (body.category !== undefined) updates.category = body.category;
    if (body.is_reconciled !== undefined)
      updates.is_reconciled = body.is_reconciled;
    if (body.notes !== undefined) updates.notes = body.notes;
    if (body.gl_account_id !== undefined)
      updates.metadata = { gl_account_id: body.gl_account_id || null };

    const success = await updateBankTransaction(supabase, id, updates);

    if (!success) {
      return NextResponse.json(
        { error: "Failed to update transaction" },
        { status: 500 }
      );
    }

    // Regenerate journal entry when GL account or financial fields change
    if (
      body.gl_account_id !== undefined ||
      body.amount !== undefined ||
      body.transaction_type !== undefined ||
      body.transaction_date !== undefined
    ) {
      try {
        // Delete old JE
        const { data: linkedJEs } = await supabase
          .from("journal_entries")
          .select("id")
          .eq("company_id", userCtx.companyId)
          .eq("reference", `bank_txn:${id}`);
        if (linkedJEs && linkedJEs.length > 0) {
          const jeIds = linkedJEs.map((je) => je.id);
          await supabase.from("journal_entry_lines").delete().in("journal_entry_id", jeIds);
          await supabase.from("journal_entries").delete().in("id", jeIds);
        }

        // Generate new JE if GL account is set
        const newGlAccountId = body.gl_account_id !== undefined
          ? (body.gl_account_id || null)
          : (existing.metadata as { gl_account_id?: string } | null)?.gl_account_id || null;

        if (newGlAccountId) {
          const bankAccountId = existing.bank_account_id;
          const { data: bankInfo } = await supabase
            .from("bank_accounts")
            .select("name, account_type")
            .eq("id", bankAccountId)
            .single();
          await ensureBankAccountGLLink(
            supabase, userCtx.companyId, bankAccountId,
            bankInfo?.name || "Bank Account", bankInfo?.account_type || "checking",
            undefined, userCtx.userId
          );

          await generateBankTransactionJournalEntry(
            supabase,
            userCtx.companyId,
            userCtx.userId,
            {
              id,
              transaction_date: body.transaction_date ?? existing.transaction_date,
              transaction_type: body.transaction_type ?? existing.transaction_type,
              amount: body.amount !== undefined ? Number(body.amount) : existing.amount,
              description: body.description ?? existing.description,
              gl_account_id: newGlAccountId,
              bank_account_id: bankAccountId,
            }
          );
        }
      } catch (jeErr) {
        console.warn("JE regeneration failed for bank transaction:", id, jeErr);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("PATCH /api/financial/banking/transactions/[id] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/financial/banking/transactions/[id] — Delete a transaction
// ---------------------------------------------------------------------------

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Verify the transaction belongs to the company
    const { data: existing } = await supabase
      .from("bank_transactions")
      .select("id, company_id")
      .eq("id", id)
      .single();

    if (!existing || existing.company_id !== userCtx.companyId) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      );
    }

    // Clean up linked journal entry (if any)
    try {
      const { data: linkedJEs } = await supabase
        .from("journal_entries")
        .select("id")
        .eq("company_id", userCtx.companyId)
        .eq("reference", `bank_txn:${id}`);
      if (linkedJEs && linkedJEs.length > 0) {
        const jeIds = linkedJEs.map((je) => je.id);
        await supabase.from("journal_entry_lines").delete().in("journal_entry_id", jeIds);
        await supabase.from("journal_entries").delete().in("id", jeIds);
      }
    } catch (jeErr) {
      console.warn("Failed to clean up JE for bank transaction:", id, jeErr);
    }

    const success = await deleteBankTransaction(
      supabase,
      id,
      userCtx.companyId
    );

    if (!success) {
      return NextResponse.json(
        { error: "Failed to delete transaction" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(
      "DELETE /api/financial/banking/transactions/[id] error:",
      err
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
