import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isPlatformAdmin } from "@/lib/queries/super-admin";

/* ─── POST /api/beta — Public form submission ─── */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, company_name, company_type, company_size, role, biggest_pain, phone, website } = body;

    // Honeypot: if filled, silently succeed
    if (website) {
      return NextResponse.json({ id: "ok" }, { status: 201 });
    }

    // Validate required fields
    if (!name || !email || !company_name || !company_type) {
      return NextResponse.json({ error: "Name, email, company name, and company type are required." }, { status: 400 });
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }

    const admin = createAdminClient();

    // Check for duplicate email
    const { data: existing } = await admin
      .from("beta_applications")
      .select("id")
      .eq("email", email.toLowerCase().trim())
      .limit(1)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: "An application with this email already exists." }, { status: 409 });
    }

    const { data, error } = await admin.from("beta_applications").insert({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      company_name: company_name.trim(),
      company_type,
      company_size: company_size || null,
      role: role?.trim() || null,
      biggest_pain: biggest_pain?.trim() || null,
      phone: phone?.trim() || null,
      status: "pending",
    }).select("id").single();

    if (error) {
      console.error("Beta application insert error:", error);
      return NextResponse.json({ error: "Failed to submit application." }, { status: 500 });
    }

    return NextResponse.json({ id: data.id }, { status: 201 });
  } catch (err) {
    console.error("Beta POST error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

/* ─── GET /api/beta — Super-admin: fetch all applications ─── */
export async function GET() {
  try {
    const supabase = await createClient();
    const isAdmin = await isPlatformAdmin(supabase);
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("beta_applications")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: "Failed to fetch applications." }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

/* ─── PATCH /api/beta — Super-admin: approve/reject/waitlist ─── */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const isAdmin = await isPlatformAdmin(supabase);
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { id, status, notes } = body;

    if (!id || !status) {
      return NextResponse.json({ error: "id and status are required." }, { status: 400 });
    }

    const validStatuses = ["pending", "approved", "rejected", "waitlisted"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: `Status must be one of: ${validStatuses.join(", ")}` }, { status: 400 });
    }

    const admin = createAdminClient();
    const { error } = await admin
      .from("beta_applications")
      .update({
        status,
        notes: notes || null,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: "Failed to update application." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
