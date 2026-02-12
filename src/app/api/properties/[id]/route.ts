import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();
    const ctx = await getCurrentUserCompany(supabase);

    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: property, error } = await supabase
      .from("properties")
      .select("*")
      .eq("id", id)
      .eq("company_id", ctx.companyId)
      .single();

    if (error || !property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    return NextResponse.json(property);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();
    const ctx = await getCurrentUserCompany(supabase);

    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify the property belongs to the user's company
    const { data: existing } = await supabase
      .from("properties")
      .select("id")
      .eq("id", id)
      .eq("company_id", ctx.companyId)
      .single();

    if (!existing) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    const body = await request.json();

    // Allow only specific updatable fields
    const allowedFields = [
      "name",
      "property_type",
      "address_line1",
      "city",
      "state",
      "zip",
      "year_built",
      "total_sqft",
      "total_units",
      "purchase_price",
      "current_value",
      "monthly_revenue",
      "monthly_expenses",
      "manager_id",
      "photos",
      "metadata",
    ];

    const updates: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (body[key] !== undefined) {
        updates[key] = body[key];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid fields provided for update." },
        { status: 400 }
      );
    }

    const { data: updated, error } = await supabase
      .from("properties")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(updated);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();
    const ctx = await getCurrentUserCompany(supabase);

    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify the property belongs to the user's company
    const { data: existing } = await supabase
      .from("properties")
      .select("id")
      .eq("id", id)
      .eq("company_id", ctx.companyId)
      .single();

    if (!existing) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    const { error } = await supabase.from("properties").delete().eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
