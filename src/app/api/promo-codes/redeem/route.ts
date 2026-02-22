import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { validatePromoCode, redeemPromoCode } from "@/lib/queries/promo-codes";
import { logAuditEvent } from "@/lib/utils/audit-logger";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // User must be authenticated
    const userCompany = await getCurrentUserCompany(supabase);
    if (!userCompany) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { code } = body;

    if (!code || typeof code !== "string") {
      return NextResponse.json(
        { error: "Promo code is required." },
        { status: 400 }
      );
    }

    // Validate the code
    const promo = await validatePromoCode(code);
    if (!promo) {
      return NextResponse.json(
        { error: "Invalid or expired promo code." },
        { status: 400 }
      );
    }

    // Check if this company has already redeemed this code
    const admin = createAdminClient();
    const { data: existing } = await admin
      .from("promo_code_redemptions")
      .select("id")
      .eq("promo_code_id", promo.id)
      .eq("company_id", userCompany.companyId)
      .limit(1)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: "Your company has already redeemed this promo code." },
        { status: 409 }
      );
    }

    // Redeem
    const result = await redeemPromoCode(
      promo.id,
      userCompany.companyId,
      userCompany.userId,
      promo.duration_days,
      promo.plan_granted
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to redeem promo code." },
        { status: 500 }
      );
    }

    logAuditEvent({
      supabase,
      companyId: userCompany.companyId,
      userId: userCompany.userId,
      action: "promo_code_redeemed",
      entityType: "promo_code",
      details: { code, plan_granted: promo.plan_granted, duration_days: promo.duration_days },
    });

    return NextResponse.json({
      message: "Promo code redeemed successfully.",
      plan: promo.plan_granted,
      duration_days: promo.duration_days,
    });
  } catch {
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
