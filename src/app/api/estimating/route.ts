import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";

export async function GET() {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("estimates")
    .select("*, estimate_line_items(count)")
    .eq("company_id", userCompany.companyId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ estimates: data });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();

    const { data, error } = await supabase
      .from("estimates")
      .insert({
        company_id: userCompany.companyId,
        estimate_number: body.estimate_number,
        title: body.title,
        description: body.description || null,
        project_id: body.project_id || null,
        opportunity_id: body.opportunity_id || null,
        status: body.status || "draft",
        tax_pct: body.tax_pct ?? 0,
        total_cost: body.total_cost ?? 0,
        total_price: body.total_price ?? 0,
        margin_pct: body.margin_pct ?? 0,
        overhead_pct: body.overhead_pct ?? 10,
        profit_pct: body.profit_pct ?? 10,
        created_by: userCompany.userId,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
