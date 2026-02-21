import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";

// ---------------------------------------------------------------------------
// /api/properties/payment-methods
// CRUD for property payment method configuration
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);
    if (!userCtx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const propertyId = request.nextUrl.searchParams.get("property_id");
    if (!propertyId) {
      return NextResponse.json(
        { error: "property_id is required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("property_payment_methods")
      .select("*")
      .eq("property_id", propertyId)
      .eq("company_id", userCtx.companyId)
      .order("display_order", { ascending: true });

    if (error) {
      console.error("Fetch payment methods error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("GET /api/properties/payment-methods error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);
    if (!userCtx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!["owner", "admin"].includes(userCtx.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { property_id, method_type, label, instructions, recipient_info } =
      body;

    if (!property_id || !method_type || !label || !instructions) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: property_id, method_type, label, instructions",
        },
        { status: 400 }
      );
    }

    // Verify property belongs to company
    const { data: prop, error: propErr } = await supabase
      .from("properties")
      .select("id")
      .eq("id", property_id)
      .eq("company_id", userCtx.companyId)
      .single();

    if (propErr || !prop) {
      return NextResponse.json(
        { error: "Property not found" },
        { status: 404 }
      );
    }

    const { data, error } = await supabase
      .from("property_payment_methods")
      .insert({
        company_id: userCtx.companyId,
        property_id,
        method_type,
        label,
        instructions,
        recipient_info: recipient_info || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Insert payment method error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error("POST /api/properties/payment-methods error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);
    if (!userCtx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!["owner", "admin"].includes(userCtx.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    // Only allow safe fields
    const allowed: Record<string, unknown> = {};
    for (const key of [
      "label",
      "instructions",
      "recipient_info",
      "is_enabled",
      "display_order",
      "method_type",
    ]) {
      if (updates[key] !== undefined) allowed[key] = updates[key];
    }
    allowed.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("property_payment_methods")
      .update(allowed)
      .eq("id", id)
      .eq("company_id", userCtx.companyId)
      .select()
      .single();

    if (error) {
      console.error("Update payment method error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("PATCH /api/properties/payment-methods error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);
    if (!userCtx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!["owner", "admin"].includes(userCtx.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const { error } = await supabase
      .from("property_payment_methods")
      .delete()
      .eq("id", id)
      .eq("company_id", userCtx.companyId);

    if (error) {
      console.error("Delete payment method error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/properties/payment-methods error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
