import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getChartOfAccounts, createAccount } from "@/lib/queries/financial";
import type { AccountCreateData } from "@/lib/queries/financial";

export async function GET() {
  try {
    const supabase = await createClient();
    const userCompany = await getCurrentUserCompany(supabase);

    if (!userCompany) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const accounts = await getChartOfAccounts(supabase, userCompany.companyId);

    return NextResponse.json({ accounts });
  } catch (error) {
    console.error("GET /api/financial/accounts error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const userCompany = await getCurrentUserCompany(supabase);

    if (!userCompany) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Validate required fields
    if (!body.account_number || !body.name || !body.account_type || !body.normal_balance) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: account_number, name, account_type, normal_balance",
        },
        { status: 400 }
      );
    }

    const validTypes = ["asset", "liability", "equity", "revenue", "expense"];
    if (!validTypes.includes(body.account_type)) {
      return NextResponse.json(
        {
          error: `account_type must be one of: ${validTypes.join(", ")}`,
        },
        { status: 400 }
      );
    }

    const validBalances = ["debit", "credit"];
    if (!validBalances.includes(body.normal_balance)) {
      return NextResponse.json(
        { error: "normal_balance must be 'debit' or 'credit'" },
        { status: 400 }
      );
    }

    const data: AccountCreateData = {
      account_number: body.account_number,
      name: body.name,
      account_type: body.account_type,
      sub_type: body.sub_type,
      parent_id: body.parent_id,
      description: body.description,
      normal_balance: body.normal_balance,
    };

    const result = await createAccount(supabase, userCompany.companyId, data);

    if (!result) {
      return NextResponse.json(
        { error: "Failed to create account" },
        { status: 500 }
      );
    }

    return NextResponse.json({ id: result.id }, { status: 201 });
  } catch (error) {
    console.error("POST /api/financial/accounts error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
