import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import {
  getBankTransactions,
  createBankTransaction,
} from "@/lib/queries/banking";
import type { CreateTransactionData } from "@/lib/queries/banking";
import { generateBankTransactionJournalEntry } from "@/lib/utils/invoice-accounting";
import { ensureBankAccountGLLink } from "@/lib/utils/bank-gl-linkage";

// ---------------------------------------------------------------------------
// GET /api/financial/banking/transactions — List transactions
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get("accountId") ?? undefined;
    const startDate = searchParams.get("startDate") ?? undefined;
    const endDate = searchParams.get("endDate") ?? undefined;
    const transactionType = searchParams.get("transactionType") as
      | "debit"
      | "credit"
      | undefined;
    const category = searchParams.get("category") ?? undefined;
    const reconciled = searchParams.get("reconciled") as
      | "yes"
      | "no"
      | undefined;
    const search = searchParams.get("search") ?? undefined;

    const transactions = await getBankTransactions(
      supabase,
      userCtx.companyId,
      accountId,
      { startDate, endDate, transactionType, category, reconciled, search }
    );

    return NextResponse.json(transactions);
  } catch (err) {
    console.error("GET /api/financial/banking/transactions error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/financial/banking/transactions — Create a transaction
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Validate required fields
    if (
      !body.bank_account_id ||
      !body.transaction_date ||
      !body.description ||
      !body.transaction_type ||
      body.amount === undefined
    ) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: bank_account_id, transaction_date, description, transaction_type, amount",
        },
        { status: 400 }
      );
    }

    if (!["debit", "credit"].includes(body.transaction_type)) {
      return NextResponse.json(
        { error: "transaction_type must be 'debit' or 'credit'" },
        { status: 400 }
      );
    }

    if (typeof body.amount !== "number" || body.amount <= 0) {
      return NextResponse.json(
        { error: "amount must be a positive number" },
        { status: 400 }
      );
    }

    const glAccountId = body.gl_account_id || undefined;

    const data: CreateTransactionData = {
      bank_account_id: body.bank_account_id,
      transaction_date: body.transaction_date,
      description: body.description.trim(),
      reference: body.reference?.trim() || undefined,
      transaction_type: body.transaction_type,
      amount: body.amount,
      category: body.category || undefined,
      notes: body.notes?.trim() || undefined,
      metadata: glAccountId ? { gl_account_id: glAccountId } : undefined,
    };

    const result = await createBankTransaction(
      supabase,
      userCtx.companyId,
      data
    );

    if (!result) {
      return NextResponse.json(
        { error: "Failed to create transaction" },
        { status: 500 }
      );
    }

    // Auto-generate journal entry if GL account was selected (non-blocking)
    if (glAccountId) {
      try {
        // Ensure bank account has a GL link
        const { data: bankInfo } = await supabase
          .from("bank_accounts")
          .select("name, account_type")
          .eq("id", body.bank_account_id)
          .single();
        await ensureBankAccountGLLink(
          supabase, userCtx.companyId, body.bank_account_id,
          bankInfo?.name || "Bank Account", bankInfo?.account_type || "checking",
          undefined, userCtx.userId
        );

        await generateBankTransactionJournalEntry(
          supabase,
          userCtx.companyId,
          userCtx.userId,
          {
            id: result.id,
            transaction_date: body.transaction_date,
            transaction_type: body.transaction_type,
            amount: body.amount,
            description: body.description.trim(),
            gl_account_id: glAccountId,
            bank_account_id: body.bank_account_id,
          }
        );
      } catch (jeErr) {
        console.warn("JE generation failed for bank transaction:", result.id, jeErr);
      }
    }

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    console.error("POST /api/financial/banking/transactions error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
