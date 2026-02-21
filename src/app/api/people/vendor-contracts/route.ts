import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";

// POST /api/people/vendor-contracts - Create a vendor contract
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    if (!body.vendor_id || !body.title?.trim()) {
      return NextResponse.json(
        { error: "Vendor and title are required." },
        { status: 400 }
      );
    }

    // Validate vendor belongs to this company
    const { data: vendor } = await supabase
      .from("contacts")
      .select("id")
      .eq("id", body.vendor_id)
      .eq("company_id", userCtx.companyId)
      .in("contact_type", ["vendor", "subcontractor"])
      .single();

    if (!vendor) {
      return NextResponse.json(
        { error: "Vendor not found in your company." },
        { status: 400 }
      );
    }

    // Validate project if provided
    if (body.project_id) {
      const { data: project } = await supabase
        .from("projects")
        .select("id")
        .eq("id", body.project_id)
        .eq("company_id", userCtx.companyId)
        .single();

      if (!project) {
        return NextResponse.json(
          { error: "Project not found in your company." },
          { status: 400 }
        );
      }
    }

    const insertData: Record<string, unknown> = {
      company_id: userCtx.companyId,
      vendor_id: body.vendor_id,
      title: body.title.trim(),
    };

    if (body.project_id) insertData.project_id = body.project_id;
    if (body.contract_number) insertData.contract_number = body.contract_number.trim();
    if (body.contract_type) insertData.contract_type = body.contract_type;
    if (body.amount != null) insertData.amount = Number(body.amount);
    if (body.status) insertData.status = body.status;
    if (body.start_date) insertData.start_date = body.start_date;
    if (body.end_date) insertData.end_date = body.end_date;
    if (body.scope_of_work) insertData.scope_of_work = body.scope_of_work.trim();
    if (body.retention_pct != null) insertData.retention_pct = Number(body.retention_pct);
    if (body.insurance_required != null) insertData.insurance_required = body.insurance_required;
    if (body.insurance_expiry) insertData.insurance_expiry = body.insurance_expiry;

    const { data: contract, error } = await supabase
      .from("vendor_contracts")
      .insert(insertData)
      .select("*, contacts(first_name, last_name, company_name)")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(contract, { status: 201 });
  } catch (err) {
    console.error("POST /api/people/vendor-contracts error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
