import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import {
  getPayrollDeductions,
  upsertPayrollDeduction,
  deletePayrollDeduction,
} from "@/lib/queries/payroll";

/* ---------------------------------------------------------------------------
   GET /api/payroll/deductions - List deductions (optional ?userId= filter)
   --------------------------------------------------------------------------- */

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") ?? undefined;

    const deductions = await getPayrollDeductions(
      supabase,
      userCtx.companyId,
      userId
    );

    return NextResponse.json({ deductions });
  } catch (error) {
    console.error("GET /api/payroll/deductions error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/* ---------------------------------------------------------------------------
   POST /api/payroll/deductions - Create or update a deduction
   Body: { id?, user_id, deduction_type, label, amount, is_percentage,
           is_pretax, effective_date, end_date? }
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

    if (!body.deduction_type) {
      return NextResponse.json(
        { error: "deduction_type is required." },
        { status: 400 }
      );
    }

    if (!body.label) {
      return NextResponse.json(
        { error: "label is required." },
        { status: 400 }
      );
    }

    if (body.amount == null || body.amount < 0) {
      return NextResponse.json(
        { error: "amount is required and must be non-negative." },
        { status: 400 }
      );
    }

    if (!body.effective_date) {
      return NextResponse.json(
        { error: "effective_date is required." },
        { status: 400 }
      );
    }

    await upsertPayrollDeduction(supabase, userCtx.companyId, {
      id: body.id ?? undefined,
      user_id: body.user_id,
      deduction_type: body.deduction_type,
      label: body.label,
      amount: body.amount,
      is_percentage: body.is_percentage ?? false,
      is_pretax: body.is_pretax ?? false,
      effective_date: body.effective_date,
      end_date: body.end_date ?? null,
    });

    return NextResponse.json(
      { success: true },
      { status: body.id ? 200 : 201 }
    );
  } catch (error) {
    console.error("POST /api/payroll/deductions error:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/* ---------------------------------------------------------------------------
   DELETE /api/payroll/deductions - Delete a deduction
   Accepts: ?id= query param or { id } in body
   --------------------------------------------------------------------------- */

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Try query param first, then body
    const { searchParams } = new URL(request.url);
    let deductionId = searchParams.get("id");

    if (!deductionId) {
      try {
        const body = await request.json();
        deductionId = body.id ?? null;
      } catch {
        // No body provided
      }
    }

    if (!deductionId) {
      return NextResponse.json(
        { error: "Deduction id is required (query param or body)." },
        { status: 400 }
      );
    }

    await deletePayrollDeduction(supabase, userCtx.companyId, deductionId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/payroll/deductions error:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
