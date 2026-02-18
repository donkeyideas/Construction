import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import {
  getEmployeePayRates,
  upsertEmployeePayRate,
} from "@/lib/queries/payroll";

/* ---------------------------------------------------------------------------
   GET /api/payroll/pay-rates - List all employee pay rates
   --------------------------------------------------------------------------- */

export async function GET() {
  try {
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payRates = await getEmployeePayRates(supabase, userCtx.companyId);

    return NextResponse.json({ pay_rates: payRates });
  } catch (error) {
    console.error("GET /api/payroll/pay-rates error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/* ---------------------------------------------------------------------------
   POST /api/payroll/pay-rates - Create or update a pay rate
   Body: { id?, user_id, pay_type, hourly_rate?, overtime_rate?, salary_amount?,
           filing_status, federal_allowances, state_code, effective_date, end_date? }
   --------------------------------------------------------------------------- */

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Validate required fields
    if (!body.user_id) {
      return NextResponse.json(
        { error: "user_id is required." },
        { status: 400 }
      );
    }

    if (!body.pay_type || !["hourly", "salary"].includes(body.pay_type)) {
      return NextResponse.json(
        { error: "pay_type must be 'hourly' or 'salary'." },
        { status: 400 }
      );
    }

    if (!body.effective_date) {
      return NextResponse.json(
        { error: "effective_date is required." },
        { status: 400 }
      );
    }

    if (body.pay_type === "hourly" && (body.hourly_rate == null || body.hourly_rate <= 0)) {
      return NextResponse.json(
        { error: "hourly_rate is required and must be greater than 0 for hourly employees." },
        { status: 400 }
      );
    }

    if (body.pay_type === "salary" && (body.salary_amount == null || body.salary_amount <= 0)) {
      return NextResponse.json(
        { error: "salary_amount is required and must be greater than 0 for salaried employees." },
        { status: 400 }
      );
    }

    await upsertEmployeePayRate(supabase, userCtx.companyId, {
      id: body.id ?? undefined,
      user_id: body.user_id,
      pay_type: body.pay_type,
      hourly_rate: body.hourly_rate ?? null,
      overtime_rate: body.overtime_rate ?? null,
      salary_amount: body.salary_amount ?? null,
      filing_status: body.filing_status ?? "single",
      federal_allowances: body.federal_allowances ?? 0,
      state_code: body.state_code ?? "",
      effective_date: body.effective_date,
      end_date: body.end_date ?? null,
    });

    return NextResponse.json(
      { success: true },
      { status: body.id ? 200 : 201 }
    );
  } catch (error) {
    console.error("POST /api/payroll/pay-rates error:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
