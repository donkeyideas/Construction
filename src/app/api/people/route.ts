import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";

// ---------------------------------------------------------------------------
// POST /api/people - Create a new contact
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Validate required fields
    if (!body.first_name || typeof body.first_name !== "string" || !body.first_name.trim()) {
      return NextResponse.json(
        { error: "First name is required." },
        { status: 400 }
      );
    }

    if (!body.last_name || typeof body.last_name !== "string" || !body.last_name.trim()) {
      return NextResponse.json(
        { error: "Last name is required." },
        { status: 400 }
      );
    }

    const validTypes = ["employee", "subcontractor", "vendor", "client", "tenant", "inspector"];
    const contactType = body.contact_type || "employee";
    if (!validTypes.includes(contactType)) {
      return NextResponse.json(
        { error: "Invalid contact type." },
        { status: 400 }
      );
    }

    const { data: contact, error } = await supabase
      .from("contacts")
      .insert({
        company_id: userCtx.companyId,
        contact_type: contactType,
        first_name: body.first_name.trim(),
        last_name: body.last_name.trim(),
        email: body.email?.trim() || null,
        phone: body.phone?.trim() || null,
        company_name: body.company_name?.trim() || null,
        job_title: body.job_title?.trim() || null,
        notes: body.notes?.trim() || null,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error("Create contact error:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(contact, { status: 201 });
  } catch (err) {
    console.error("POST /api/people error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
