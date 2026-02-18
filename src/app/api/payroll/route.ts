import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import {
  getPayrollRuns,
  getApprovedTimeEntries,
  getEmployeePayRates,
  getPayrollDeductions,
  getYtdGross,
  getPayrollTaxConfig,
} from "@/lib/queries/payroll";
import { calculatePayrollItems } from "@/lib/utils/payroll-calculator";

/* ---------------------------------------------------------------------------
   GET /api/payroll - List payroll runs
   --------------------------------------------------------------------------- */

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") ?? "25", 10);
    const offset = parseInt(searchParams.get("offset") ?? "0", 10);

    const runs = await getPayrollRuns(
      supabase,
      userCtx.companyId,
      limit,
      offset
    );

    return NextResponse.json({ runs });
  } catch (error) {
    console.error("GET /api/payroll error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/* ---------------------------------------------------------------------------
   POST /api/payroll - Create a new payroll run draft from approved time entries
   Body: { period_start, period_end, pay_date? }
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
    if (!body.period_start || !body.period_end) {
      return NextResponse.json(
        { error: "period_start and period_end are required." },
        { status: 400 }
      );
    }

    const periodStart: string = body.period_start;
    const periodEnd: string = body.period_end;
    const payDate: string = body.pay_date ?? periodEnd;

    // Fetch all required data in parallel
    const payYear = new Date(periodEnd).getFullYear();

    const [timeEntries, payRates, deductions, ytdGross, taxConfig] =
      await Promise.all([
        getApprovedTimeEntries(supabase, userCtx.companyId, periodStart, periodEnd),
        getEmployeePayRates(supabase, userCtx.companyId),
        getPayrollDeductions(supabase, userCtx.companyId),
        getYtdGross(supabase, userCtx.companyId, payYear),
        getPayrollTaxConfig(supabase, userCtx.companyId, payYear),
      ]);

    if (timeEntries.length === 0) {
      return NextResponse.json(
        { error: "No approved time entries found for this period." },
        { status: 400 }
      );
    }

    if (!taxConfig) {
      return NextResponse.json(
        {
          error:
            "Payroll tax config not found. Please configure payroll taxes before running payroll.",
        },
        { status: 400 }
      );
    }

    // Build pay rate and deduction maps by user_id for the calculator
    const payRateMap = new Map(
      payRates.map((r) => [r.user_id, r])
    );
    const deductionMap = new Map<string, typeof deductions>();
    for (const d of deductions) {
      if (!deductionMap.has(d.user_id)) {
        deductionMap.set(d.user_id, []);
      }
      deductionMap.get(d.user_id)!.push(d);
    }

    // Calculate payroll items for each employee
    const calculatedItems = calculatePayrollItems({
      timeEntries,
      payRateMap,
      deductionMap,
      ytdGross,
      taxConfig,
    });

    if (calculatedItems.length === 0) {
      return NextResponse.json(
        { error: "Could not calculate payroll for any employees. Check pay rates." },
        { status: 400 }
      );
    }

    // Compute run totals
    let totalGross = 0;
    let totalEmployeeTaxes = 0;
    let totalEmployerTaxes = 0;
    let totalDeductionsAmt = 0;
    let totalNet = 0;

    for (const item of calculatedItems) {
      totalGross += item.gross_pay;
      totalEmployeeTaxes +=
        item.federal_income_tax +
        item.state_income_tax +
        item.social_security_employee +
        item.medicare_employee;
      totalEmployerTaxes += item.total_employer_taxes;
      totalDeductionsAmt += item.pretax_deductions + item.posttax_deductions;
      totalNet += item.net_pay;
    }

    // Insert payroll run header
    const { data: run, error: runError } = await supabase
      .from("payroll_runs")
      .insert({
        company_id: userCtx.companyId,
        period_start: periodStart,
        period_end: periodEnd,
        pay_date: payDate,
        status: "draft",
        total_gross: Math.round(totalGross * 100) / 100,
        total_employee_taxes: Math.round(totalEmployeeTaxes * 100) / 100,
        total_employer_taxes: Math.round(totalEmployerTaxes * 100) / 100,
        total_deductions: Math.round(totalDeductionsAmt * 100) / 100,
        total_net: Math.round(totalNet * 100) / 100,
        employee_count: calculatedItems.length,
        created_by: userCtx.userId,
      })
      .select("id")
      .single();

    if (runError || !run) {
      console.error("Error creating payroll run:", runError);
      return NextResponse.json(
        { error: "Failed to create payroll run." },
        { status: 500 }
      );
    }

    // Insert payroll items
    const itemInserts = calculatedItems.map((item) => ({
      company_id: userCtx.companyId,
      payroll_run_id: run.id,
      user_id: item.user_id,
      regular_hours: item.regular_hours,
      overtime_hours: item.overtime_hours,
      hourly_rate: item.hourly_rate,
      overtime_rate: item.overtime_rate,
      gross_pay: Math.round(item.gross_pay * 100) / 100,
      federal_income_tax: Math.round(item.federal_income_tax * 100) / 100,
      state_income_tax: Math.round(item.state_income_tax * 100) / 100,
      social_security_employee:
        Math.round(item.social_security_employee * 100) / 100,
      medicare_employee: Math.round(item.medicare_employee * 100) / 100,
      social_security_employer:
        Math.round(item.social_security_employer * 100) / 100,
      medicare_employer: Math.round(item.medicare_employer * 100) / 100,
      futa_employer: Math.round(item.futa_employer * 100) / 100,
      suta_employer: Math.round(item.suta_employer * 100) / 100,
      pretax_deductions: Math.round(item.pretax_deductions * 100) / 100,
      posttax_deductions: Math.round(item.posttax_deductions * 100) / 100,
      total_employee_deductions:
        Math.round(item.total_employee_deductions * 100) / 100,
      total_employer_taxes:
        Math.round(item.total_employer_taxes * 100) / 100,
      net_pay: Math.round(item.net_pay * 100) / 100,
      ytd_gross: Math.round(item.ytd_gross * 100) / 100,
      deduction_details: item.deduction_details ?? null,
      time_entry_ids: item.time_entry_ids ?? null,
    }));

    const { error: itemsError } = await supabase
      .from("payroll_items")
      .insert(itemInserts);

    if (itemsError) {
      console.error("Error creating payroll items:", itemsError);
      // Clean up the run header
      await supabase.from("payroll_runs").delete().eq("id", run.id);
      return NextResponse.json(
        { error: "Failed to create payroll items." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        id: run.id,
        employee_count: calculatedItems.length,
        total_gross: Math.round(totalGross * 100) / 100,
        total_net: Math.round(totalNet * 100) / 100,
        status: "draft",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/payroll error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
