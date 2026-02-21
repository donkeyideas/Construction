import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCompanyGateway } from "@/lib/payments";

/**
 * POST /api/tenant/payments/checkout
 * Create a checkout session for a tenant to pay rent online.
 * Body: { amount?: number } — optional override, defaults to lease monthly_rent
 * Returns: { url } for redirect to payment provider
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Use admin client because tenant RLS doesn't cover properties join
    const admin = createAdminClient();

    // Get tenant's active lease with property + unit info
    const { data: lease } = await admin
      .from("leases")
      .select(
        "id, company_id, property_id, monthly_rent, tenant_name, units(unit_number, properties(name))"
      )
      .eq("tenant_user_id", user.id)
      .eq("status", "active")
      .limit(1)
      .single();

    if (!lease) {
      return NextResponse.json(
        { error: "No active lease found" },
        { status: 404 }
      );
    }

    const companyId = lease.company_id as string;
    const unit = lease.units as unknown as {
      unit_number: string;
      properties: { name: string };
    } | null;

    // Verify company has an active payment gateway
    const result = await getCompanyGateway(companyId);
    if (!result) {
      return NextResponse.json(
        { error: "Online payments not configured for this property" },
        { status: 400 }
      );
    }

    // Verify property has online_payment enabled
    const { data: onlineMethod } = await admin
      .from("property_payment_methods")
      .select("id")
      .eq("property_id", lease.property_id)
      .eq("method_type", "online_payment")
      .eq("is_enabled", true)
      .limit(1)
      .single();

    if (!onlineMethod) {
      return NextResponse.json(
        { error: "Online payments not enabled for this property" },
        { status: 400 }
      );
    }

    // Determine amount
    const body = await request.json().catch(() => ({}));
    const amount =
      typeof body.amount === "number" && body.amount > 0
        ? body.amount
        : lease.monthly_rent;

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: "Invalid payment amount" },
        { status: 400 }
      );
    }

    const propertyName = unit?.properties?.name || "Property";
    const unitName = unit?.unit_number || "Unit";
    const dueDate = new Date().toISOString().slice(0, 10);

    const origin = request.headers.get("origin") || "";

    const session = await result.gateway.createCheckoutSession(
      result.credentials,
      {
        leaseId: lease.id,
        companyId,
        tenantUserId: user.id,
        amount,
        description: `Rent Payment — ${propertyName}, Unit ${unitName}`,
        dueDate,
        successUrl: `${origin}/tenant?payment=success`,
        cancelUrl: `${origin}/tenant?payment=canceled`,
      }
    );

    if (!session) {
      return NextResponse.json(
        { error: "Failed to create checkout session" },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Tenant checkout error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
