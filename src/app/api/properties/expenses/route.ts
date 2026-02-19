import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";

const VALID_TYPES = [
  "cam", "property_tax", "insurance", "utilities",
  "management_fee", "capital_expense", "hoa_fee",
  "marketing", "legal", "other",
];

const VALID_FREQUENCIES = ["one_time", "monthly", "quarterly", "semi_annual", "annual"];

// ---------------------------------------------------------------------------
// POST /api/properties/expenses - Create a new property expense
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    if (!body.property_id) {
      return NextResponse.json({ error: "Property is required." }, { status: 400 });
    }
    if (!body.expense_type || !VALID_TYPES.includes(body.expense_type)) {
      return NextResponse.json(
        { error: `Invalid expense type. Use: ${VALID_TYPES.join(", ")}` },
        { status: 400 }
      );
    }
    if (!body.amount || Number(body.amount) <= 0) {
      return NextResponse.json({ error: "Amount must be greater than 0." }, { status: 400 });
    }

    const frequency = body.frequency || "monthly";
    if (!VALID_FREQUENCIES.includes(frequency)) {
      return NextResponse.json(
        { error: `Invalid frequency. Use: ${VALID_FREQUENCIES.join(", ")}` },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("property_expenses")
      .insert({
        company_id: userCtx.companyId,
        property_id: body.property_id,
        expense_type: body.expense_type,
        description: body.description?.trim() || null,
        amount: Number(body.amount),
        frequency,
        effective_date: body.effective_date || null,
        end_date: body.end_date || null,
        vendor_name: body.vendor_name?.trim() || null,
        notes: body.notes?.trim() || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Create property expense error:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error("Property expense POST error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/properties/expenses - Update a property expense
// ---------------------------------------------------------------------------

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    if (!body.id) {
      return NextResponse.json({ error: "Expense ID is required." }, { status: 400 });
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (body.expense_type !== undefined) {
      if (!VALID_TYPES.includes(body.expense_type)) {
        return NextResponse.json({ error: "Invalid expense type." }, { status: 400 });
      }
      updates.expense_type = body.expense_type;
    }
    if (body.amount !== undefined) updates.amount = Number(body.amount);
    if (body.frequency !== undefined) {
      if (!VALID_FREQUENCIES.includes(body.frequency)) {
        return NextResponse.json({ error: "Invalid frequency." }, { status: 400 });
      }
      updates.frequency = body.frequency;
    }
    if (body.description !== undefined) updates.description = body.description?.trim() || null;
    if (body.vendor_name !== undefined) updates.vendor_name = body.vendor_name?.trim() || null;
    if (body.effective_date !== undefined) updates.effective_date = body.effective_date || null;
    if (body.end_date !== undefined) updates.end_date = body.end_date || null;
    if (body.notes !== undefined) updates.notes = body.notes?.trim() || null;
    if (body.property_id !== undefined) updates.property_id = body.property_id;

    const { data, error } = await supabase
      .from("property_expenses")
      .update(updates)
      .eq("id", body.id)
      .eq("company_id", userCtx.companyId)
      .select()
      .single();

    if (error) {
      console.error("Update property expense error:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("Property expense PATCH error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/properties/expenses - Delete a property expense
// ---------------------------------------------------------------------------

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Expense ID is required." }, { status: 400 });
    }

    const { error } = await supabase
      .from("property_expenses")
      .delete()
      .eq("id", id)
      .eq("company_id", userCtx.companyId);

    if (error) {
      console.error("Delete property expense error:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Property expense DELETE error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
