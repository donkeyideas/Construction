import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getBankAccounts, createBankAccount } from "@/lib/queries/financial";
import type { BankAccountCreateData } from "@/lib/queries/financial";
import { ensureBankAccountGLLink } from "@/lib/utils/bank-gl-linkage";

export async function GET() {
  try {
    const supabase = await createClient();
    const userCompany = await getCurrentUserCompany(supabase);

    if (!userCompany) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const accounts = await getBankAccounts(supabase, userCompany.companyId);
    return NextResponse.json({ accounts });
  } catch (error) {
    console.error("GET /api/financial/bank-accounts error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const userCompany = await getCurrentUserCompany(supabase);

    if (!userCompany) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    if (!body.name || !body.bank_name || !body.account_type) {
      return NextResponse.json(
        { error: "Missing required fields: name, bank_name, account_type" },
        { status: 400 }
      );
    }

    const data: BankAccountCreateData = {
      name: body.name,
      bank_name: body.bank_name,
      account_number_last4: body.account_number_last4,
      routing_number_last4: body.routing_number_last4,
      account_type: body.account_type,
      current_balance: body.current_balance ?? 0,
      is_default: body.is_default ?? false,
    };

    const result = await createBankAccount(supabase, userCompany.companyId, data);

    if (!result) {
      return NextResponse.json({ error: "Failed to create bank account" }, { status: 500 });
    }

    // Auto-link to GL account (find or create)
    try {
      await ensureBankAccountGLLink(
        supabase,
        userCompany.companyId,
        result.id,
        data.name,
        data.account_type,
        data.current_balance,
        userCompany.userId
      );
    } catch (linkErr) {
      console.error("GL linkage warning (bank account created OK):", linkErr);
    }

    return NextResponse.json({ id: result.id }, { status: 201 });
  } catch (error) {
    console.error("POST /api/financial/bank-accounts error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
