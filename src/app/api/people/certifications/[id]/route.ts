import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: certification, error } = await supabase
      .from("certifications")
      .select("*")
      .eq("id", id)
      .eq("company_id", userCtx.companyId)
      .single();

    if (error || !certification) {
      return NextResponse.json({ error: "Certification not found" }, { status: 404 });
    }

    return NextResponse.json(certification);
  } catch (err) {
    console.error("GET /api/people/certifications/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: existing } = await supabase
      .from("certifications")
      .select("id, company_id")
      .eq("id", id)
      .single();

    if (!existing || existing.company_id !== userCtx.companyId) {
      return NextResponse.json({ error: "Certification not found" }, { status: 404 });
    }

    const body = await request.json();
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (body.cert_name !== undefined) updateData.cert_name = body.cert_name;
    if (body.cert_type !== undefined) updateData.cert_type = body.cert_type;
    if (body.issuing_authority !== undefined) updateData.issuing_authority = body.issuing_authority;
    if (body.cert_number !== undefined) updateData.cert_number = body.cert_number;
    if (body.issued_date !== undefined) updateData.issued_date = body.issued_date;
    if (body.expiry_date !== undefined) updateData.expiry_date = body.expiry_date;
    if (body.status !== undefined) updateData.status = body.status;

    const { data: updated, error } = await supabase
      .from("certifications")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(updated);
  } catch (err) {
    console.error("PATCH /api/people/certifications/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: existing } = await supabase
      .from("certifications")
      .select("id, company_id")
      .eq("id", id)
      .single();

    if (!existing || existing.company_id !== userCtx.companyId) {
      return NextResponse.json({ error: "Certification not found" }, { status: 404 });
    }

    const { error } = await supabase
      .from("certifications")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/people/certifications/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
