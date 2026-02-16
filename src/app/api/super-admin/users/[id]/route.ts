import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isPlatformAdmin } from "@/lib/queries/super-admin";
import { NextResponse } from "next/server";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const isAdmin = await isPlatformAdmin(supabase);

    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    const updateData: Record<string, unknown> = {};
    if (typeof body.is_platform_admin === "boolean") {
      updateData.is_platform_admin = body.is_platform_admin;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update." },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("user_profiles")
      .update(updateData)
      .eq("id", id);

    if (error) {
      return NextResponse.json(
        { error: "Failed to update user." },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: "User updated." });
  } catch {
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const isAdmin = await isPlatformAdmin(supabase);

    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;

    // Prevent deleting yourself
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user?.id === id) {
      return NextResponse.json(
        { error: "You cannot delete your own account." },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // 1. Delete company_members
    await admin.from("company_members").delete().eq("user_id", id);

    // 2. Check if user is the sole owner of any company — delete those companies
    const { data: ownedCompanies } = await admin
      .from("companies")
      .select("id")
      .eq("created_by", id);

    if (ownedCompanies) {
      for (const company of ownedCompanies) {
        // Check if anyone else is a member
        const { count } = await admin
          .from("company_members")
          .select("*", { count: "exact", head: true })
          .eq("company_id", company.id);

        if (!count || count === 0) {
          // No other members — delete the company
          await admin.from("companies").delete().eq("id", company.id);
        }
      }
    }

    // 3. Delete user_profile
    await admin.from("user_profiles").delete().eq("id", id);

    // 4. Delete auth user
    const { error: authError } = await admin.auth.admin.deleteUser(id);
    if (authError) {
      return NextResponse.json(
        { error: "Failed to delete auth user: " + authError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: "User deleted." });
  } catch {
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
