import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPublicPricingTiers } from "@/lib/queries/pricing";

// ---------------------------------------------------------------------------
// GET /api/pricing - Public endpoint returning pricing tiers (no auth)
// ---------------------------------------------------------------------------

export async function GET() {
  try {
    const supabase = createAdminClient();
    const tiers = await getPublicPricingTiers(supabase);
    return NextResponse.json(tiers);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch pricing tiers." },
      { status: 500 },
    );
  }
}
