import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import {
  getBankReconciliations,
  createReconciliation,
} from "@/lib/queries/banking";
import type { CreateReconciliationData } from "@/lib/queries/banking";

// ---------------------------------------------------------------------------
// GET /api/financial/banking/reconciliations — List reconciliations
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

    const reconciliations = await getBankReconciliations(
      supabase,
      userCtx.companyId,
      accountId
    );

    return NextResponse.json(reconciliations);
  } catch (err) {
    console.error("GET /api/financial/banking/reconciliations error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/financial/banking/reconciliations — Create a reconciliation
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
      !body.statement_date ||
      body.statement_ending_balance === undefined
    ) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: bank_account_id, statement_date, statement_ending_balance",
        },
        { status: 400 }
      );
    }

    const data: CreateReconciliationData = {
      bank_account_id: body.bank_account_id,
      statement_date: body.statement_date,
      statement_ending_balance: body.statement_ending_balance,
      notes: body.notes?.trim() || undefined,
    };

    const result = await createReconciliation(
      supabase,
      userCtx.companyId,
      userCtx.userId,
      data
    );

    if (!result) {
      return NextResponse.json(
        { error: "Failed to create reconciliation" },
        { status: 500 }
      );
    }

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    console.error("POST /api/financial/banking/reconciliations error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
