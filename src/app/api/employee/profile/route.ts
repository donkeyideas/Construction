import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { NextResponse } from "next/server";

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { full_name, phone, job_title } = body as {
      full_name?: string;
      phone?: string;
      job_title?: string;
    };

    // Update user_profiles
    const profileUpdates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (full_name !== undefined) profileUpdates.full_name = full_name?.trim() || null;
    if (phone !== undefined) profileUpdates.phone = phone?.trim() || null;

    const { error: profileError } = await supabase
      .from("user_profiles")
      .update(profileUpdates)
      .eq("id", userCtx.userId);

    if (profileError) {
      console.error("Error updating employee profile:", profileError);
      return NextResponse.json(
        { error: "Failed to update profile" },
        { status: 500 }
      );
    }

    // Also update contact record if it exists
    const contactUpdates: Record<string, unknown> = {};
    if (full_name !== undefined) contactUpdates.name = full_name?.trim() || null;
    if (phone !== undefined) contactUpdates.phone = phone?.trim() || null;
    if (job_title !== undefined) contactUpdates.job_title = job_title?.trim() || null;

    if (Object.keys(contactUpdates).length > 0) {
      await supabase
        .from("contacts")
        .update(contactUpdates)
        .eq("user_id", userCtx.userId)
        .eq("company_id", userCtx.companyId);
      // Non-critical: ignore contact update errors
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Employee profile update error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
