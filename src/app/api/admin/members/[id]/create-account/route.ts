import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserCompany } from "@/lib/queries/user";

// ---------------------------------------------------------------------------
// POST /api/admin/members/[id]/create-account
// Create a Supabase Auth account for an invited member
// ---------------------------------------------------------------------------

export async function POST(
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

    if (userCtx.role !== "owner" && userCtx.role !== "admin") {
      return NextResponse.json(
        { error: "Only owners and admins can create user accounts." },
        { status: 403 }
      );
    }

    // Verify the member belongs to the same company
    const { data: member } = await supabase
      .from("company_members")
      .select("id, company_id, user_id, invited_email, role, is_active")
      .eq("id", id)
      .single();

    if (!member || member.company_id !== userCtx.companyId) {
      return NextResponse.json({ error: "Member not found." }, { status: 404 });
    }

    if (member.user_id) {
      return NextResponse.json(
        { error: "This member already has an account." },
        { status: 400 }
      );
    }

    if (!member.invited_email) {
      return NextResponse.json(
        { error: "No email address associated with this member." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const fullName = body.full_name?.trim() || "";
    const tempPassword = body.password?.trim();

    if (!tempPassword || tempPassword.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // Check if a user with this email already exists in auth
    const { data: existingUsers } = await admin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u) => u.email === member.invited_email
    );

    let userId: string;

    if (existingUser) {
      // User exists in auth but wasn't linked — link them
      userId = existingUser.id;
    } else {
      // Create the auth user
      const { data: newUser, error: createError } =
        await admin.auth.admin.createUser({
          email: member.invited_email,
          password: tempPassword,
          email_confirm: true,
        });

      if (createError) {
        console.error("Create auth user error:", createError);
        return NextResponse.json(
          { error: createError.message },
          { status: 400 }
        );
      }

      userId = newUser.user.id;
    }

    // Create or update user_profiles
    const { error: profileError } = await admin
      .from("user_profiles")
      .upsert(
        {
          id: userId,
          email: member.invited_email,
          full_name: fullName || null,
          portal_type: "executive",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );

    if (profileError) {
      console.error("user_profiles upsert error:", profileError);
    }

    // Link user to company_members and activate
    const { error: linkError } = await admin
      .from("company_members")
      .update({
        user_id: userId,
        is_active: true,
        joined_at: new Date().toISOString(),
      })
      .eq("id", member.id);

    if (linkError) {
      console.error("Link member error:", linkError);
      return NextResponse.json(
        { error: "Account created but failed to link: " + linkError.message },
        { status: 500 }
      );
    }

    // Log in audit
    await admin.from("audit_logs").insert({
      company_id: userCtx.companyId,
      user_id: userCtx.userId,
      action: "create",
      entity_type: "user_account",
      entity_id: userId,
      details: {
        email: member.invited_email,
        role: member.role,
        full_name: fullName || null,
      },
    });

    return NextResponse.json({
      success: true,
      user_id: userId,
      email: member.invited_email,
    });
  } catch (err) {
    console.error("POST /api/admin/members/[id]/create-account error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
