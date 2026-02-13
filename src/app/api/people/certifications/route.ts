import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";

// ---------------------------------------------------------------------------
// POST /api/people/certifications - Create a new certification
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
    if (!body.contact_id) {
      return NextResponse.json(
        { error: "Contact is required." },
        { status: 400 }
      );
    }

    if (!body.cert_name || typeof body.cert_name !== "string" || !body.cert_name.trim()) {
      return NextResponse.json(
        { error: "Certification name is required." },
        { status: 400 }
      );
    }

    if (!body.issuing_authority || typeof body.issuing_authority !== "string" || !body.issuing_authority.trim()) {
      return NextResponse.json(
        { error: "Issuing authority is required." },
        { status: 400 }
      );
    }

    if (!body.issued_date) {
      return NextResponse.json(
        { error: "Issued date is required." },
        { status: 400 }
      );
    }

    if (!body.expiry_date) {
      return NextResponse.json(
        { error: "Expiry date is required." },
        { status: 400 }
      );
    }

    const validStatuses = ["active", "expired", "pending_renewal"];
    const status = body.status || "active";
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: "Invalid status value." },
        { status: 400 }
      );
    }

    const { data: cert, error } = await supabase
      .from("certifications")
      .insert({
        company_id: userCtx.companyId,
        contact_id: body.contact_id,
        cert_name: body.cert_name.trim(),
        cert_type: "license", // default type
        issuing_authority: body.issuing_authority.trim(),
        cert_number: body.cert_number?.trim() || null,
        issued_date: body.issued_date,
        expiry_date: body.expiry_date,
        status,
      })
      .select()
      .single();

    if (error) {
      console.error("Create certification error:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(cert, { status: 201 });
  } catch (err) {
    console.error("POST /api/people/certifications error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
