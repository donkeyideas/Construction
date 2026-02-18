import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import {
  getPayrollTaxConfig,
  upsertPayrollTaxConfig,
} from "@/lib/queries/payroll";

/* ---------------------------------------------------------------------------
   GET /api/payroll/tax-config - Get current tax config
   Optional query: ?year=2026
   --------------------------------------------------------------------------- */

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const yearParam = searchParams.get("year");
    const taxYear = yearParam ? parseInt(yearParam, 10) : undefined;

    const config = await getPayrollTaxConfig(
      supabase,
      userCtx.companyId,
      taxYear
    );

    if (!config) {
      return NextResponse.json(
        { config: null, message: "No tax config found for this year." },
        { status: 200 }
      );
    }

    return NextResponse.json({ config });
  } catch (error) {
    console.error("GET /api/payroll/tax-config error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/* ---------------------------------------------------------------------------
   PUT /api/payroll/tax-config - Create or update tax config
   Body: { tax_year, social_security_rate, social_security_wage_base,
           medicare_rate, additional_medicare_rate, additional_medicare_threshold,
           futa_rate, futa_wage_base, state_unemployment_rate,
           state_unemployment_wage_base, state_code }
   --------------------------------------------------------------------------- */

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Validate required fields
    if (!body.tax_year || typeof body.tax_year !== "number") {
      return NextResponse.json(
        { error: "tax_year is required and must be a number." },
        { status: 400 }
      );
    }

    if (body.social_security_rate == null || body.social_security_rate < 0) {
      return NextResponse.json(
        { error: "social_security_rate is required and must be non-negative." },
        { status: 400 }
      );
    }

    if (body.medicare_rate == null || body.medicare_rate < 0) {
      return NextResponse.json(
        { error: "medicare_rate is required and must be non-negative." },
        { status: 400 }
      );
    }

    if (!body.state_code) {
      return NextResponse.json(
        { error: "state_code is required." },
        { status: 400 }
      );
    }

    await upsertPayrollTaxConfig(supabase, userCtx.companyId, {
      tax_year: body.tax_year,
      social_security_rate: body.social_security_rate,
      social_security_wage_base: body.social_security_wage_base ?? 168600,
      medicare_rate: body.medicare_rate,
      additional_medicare_rate: body.additional_medicare_rate ?? 0.009,
      additional_medicare_threshold: body.additional_medicare_threshold ?? 200000,
      futa_rate: body.futa_rate ?? 0.006,
      futa_wage_base: body.futa_wage_base ?? 7000,
      state_unemployment_rate: body.state_unemployment_rate ?? 0,
      state_unemployment_wage_base: body.state_unemployment_wage_base ?? 0,
      state_code: body.state_code,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PUT /api/payroll/tax-config error:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
