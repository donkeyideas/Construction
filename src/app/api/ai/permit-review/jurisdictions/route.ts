import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";

export async function GET(req: Request) {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);
  if (!userCompany) return new Response("Unauthorized", { status: 401 });

  const url = new URL(req.url);
  const search = url.searchParams.get("search") || "";

  let query = supabase
    .from("jurisdiction_rulesets")
    .select(
      "id, jurisdiction_name, state, city, county, building_codes, portal_name, portal_url, portal_submission_type, portal_contact_info, typical_review_days"
    )
    .eq("is_active", true)
    .order("jurisdiction_name");

  // Show both global (company_id IS NULL) and company-specific rulesets
  if (search.length >= 2) {
    query = query.ilike("jurisdiction_name", `%${search}%`);
  }

  const { data, error } = await query.limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ jurisdictions: data || [] });
}
