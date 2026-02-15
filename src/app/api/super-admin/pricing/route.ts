import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isPlatformAdmin } from "@/lib/queries/super-admin";

/**
 * GET /api/super-admin/pricing - Fetch platform pricing tiers
 * POST /api/super-admin/pricing - Save pricing tiers (platform admin only)
 */

export async function GET() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("pricing_tiers")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ tiers: data ?? [] });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  const isAdmin = await isPlatformAdmin(supabase);
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized - platform admin required" }, { status: 403 });
  }

  const body = await req.json();
  const { tiers } = body as { tiers: PricingTierInput[] };

  if (!Array.isArray(tiers)) {
    return NextResponse.json({ error: "tiers must be an array" }, { status: 400 });
  }

  // Delete all existing tiers, then insert new ones
  const { error: delError } = await supabase
    .from("pricing_tiers")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000"); // delete all rows

  if (delError) {
    return NextResponse.json({ error: delError.message }, { status: 500 });
  }

  const rows = tiers.map((t, i) => ({
    name: t.name,
    monthly_price: t.monthly_price,
    annual_price: t.annual_price,
    features: t.features,
    is_popular: t.is_popular ?? false,
    sort_order: i,
    max_users: t.max_users,
    max_projects: t.max_projects,
    max_properties: t.max_properties,
    max_storage_gb: t.max_storage_gb,
    stripe_price_id_monthly: t.stripe_price_id_monthly ?? null,
    stripe_price_id_annual: t.stripe_price_id_annual ?? null,
  }));

  const { data, error: insError } = await supabase
    .from("pricing_tiers")
    .insert(rows)
    .select();

  if (insError) {
    return NextResponse.json({ error: insError.message }, { status: 500 });
  }

  return NextResponse.json({ tiers: data });
}

interface PricingTierInput {
  name: string;
  monthly_price: number;
  annual_price: number;
  features: string[];
  is_popular?: boolean;
  max_users: number | null;
  max_projects: number | null;
  max_properties: number | null;
  max_storage_gb: number | null;
  stripe_price_id_monthly?: string | null;
  stripe_price_id_annual?: string | null;
}
