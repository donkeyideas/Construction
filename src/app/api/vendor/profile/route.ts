import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// ---------------------------------------------------------------------------
// GET /api/vendor/profile — Fetch vendor contact profile
// PATCH /api/vendor/profile — Update vendor contact profile
// ---------------------------------------------------------------------------

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();

    const { data: contact } = await admin
      .from("contacts")
      .select("id, company_name, contact_type, first_name, last_name, email, phone, job_title, company_id")
      .eq("user_id", user.id)
      .in("contact_type", ["vendor", "subcontractor"])
      .limit(1)
      .single();

    if (!contact) {
      return NextResponse.json(
        { error: "No vendor profile found." },
        { status: 404 }
      );
    }

    return NextResponse.json(contact);
  } catch (err) {
    console.error("GET /api/vendor/profile error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();

    // Look up vendor contact
    const { data: contact } = await admin
      .from("contacts")
      .select("id")
      .eq("user_id", user.id)
      .in("contact_type", ["vendor", "subcontractor"])
      .limit(1)
      .single();

    if (!contact) {
      return NextResponse.json(
        { error: "No vendor profile found." },
        { status: 404 }
      );
    }

    const body = await request.json();
    const allowedFields = ["company_name", "first_name", "last_name", "email", "phone", "job_title"];
    const updates: Record<string, string> = {};

    for (const field of allowedFields) {
      if (field in body && typeof body[field] === "string") {
        updates[field] = body[field].trim();
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update." },
        { status: 400 }
      );
    }

    const { data: updated, error: updateError } = await admin
      .from("contacts")
      .update(updates)
      .eq("id", contact.id)
      .select("id, company_name, contact_type, first_name, last_name, email, phone, job_title, company_id")
      .single();

    if (updateError) {
      console.error("Profile update error:", updateError);
      return NextResponse.json(
        { error: "Failed to update profile." },
        { status: 500 }
      );
    }

    return NextResponse.json(updated);
  } catch (err) {
    console.error("PATCH /api/vendor/profile error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
