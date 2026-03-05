import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);
  if (!userCompany) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;

  const { data, error } = await supabase
    .from("projects")
    .select(
      "id, name, code, project_type, address_line1, city, state, zip, client_name, client_contact, client_email, contract_amount, estimated_cost, start_date, estimated_end_date, completion_pct"
    )
    .eq("id", id)
    .eq("company_id", userCompany.companyId)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(data);
}
