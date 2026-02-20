import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";

// POST /api/employee/certifications — Employee adds their own certification
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    if (!body.cert_name || typeof body.cert_name !== "string" || !body.cert_name.trim()) {
      return NextResponse.json(
        { error: "Certification name is required." },
        { status: 400 }
      );
    }

    // Find the employee's contact record
    const { data: contact } = await supabase
      .from("contacts")
      .select("id")
      .eq("user_id", userCtx.userId)
      .eq("company_id", userCtx.companyId)
      .maybeSingle();

    if (!contact) {
      return NextResponse.json(
        { error: "Employee contact record not found." },
        { status: 404 }
      );
    }

    const { data: cert, error } = await supabase
      .from("certifications")
      .insert({
        company_id: userCtx.companyId,
        contact_id: contact.id,
        cert_name: body.cert_name.trim(),
        cert_type: body.cert_type?.trim() || null,
        issuing_authority: body.issuing_authority?.trim() || null,
        cert_number: body.cert_number?.trim() || null,
        issued_date: body.issued_date || null,
        expiry_date: body.expiry_date || null,
        status: "active",
      })
      .select()
      .single();

    if (error) {
      console.error("Employee create certification error:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(cert, { status: 201 });
  } catch (err) {
    console.error("POST /api/employee/certifications error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
