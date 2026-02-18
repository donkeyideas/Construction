import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getAccountTransactions } from "@/lib/queries/financial";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const userCompany = await getCurrentUserCompany(supabase);

    if (!userCompany) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get("accountId");
    const startDate = searchParams.get("startDate") ?? undefined;
    const endDate = searchParams.get("endDate") ?? undefined;

    if (!accountId) {
      return NextResponse.json({ error: "accountId is required" }, { status: 400 });
    }

    const result = await getAccountTransactions(
      supabase,
      userCompany.companyId,
      accountId,
      startDate,
      endDate
    );

    return NextResponse.json(result);
  } catch (err) {
    console.error("GET /api/financial/account-transactions error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
