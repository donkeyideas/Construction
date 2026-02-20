import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserCompany } from "@/lib/queries/user";

// ---------------------------------------------------------------------------
// POST /api/people/create-login
// Create a Supabase Auth login account for an employee/vendor contact
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    // Step 1: Authenticate caller and verify owner/admin role
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!["owner", "admin"].includes(userCtx.role)) {
      return NextResponse.json(
        { error: "Only owners and admins can create login accounts." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { contact_id, email, password } = body as {
      contact_id?: string;
      email?: string;
      password?: string;
    };

    // Validate required fields
    if (!contact_id || !email || !password) {
      return NextResponse.json(
        { error: "Missing required fields: contact_id, email, password" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    // Step 2: Fetch the contact and verify it belongs to the company
    const { data: contact, error: contactError } = await supabase
      .from("contacts")
      .select("*")
      .eq("id", contact_id)
      .eq("company_id", userCtx.companyId)
      .single();

    if (contactError || !contact) {
      return NextResponse.json(
        { error: "Contact not found." },
        { status: 404 }
      );
    }

    if (contact.user_id) {
      return NextResponse.json(
        { error: "Contact already has a login account." },
        { status: 400 }
      );
    }

    // Step 3: Determine portal_type based on contact_type
    let portalType: string | null = null;
    if (contact.contact_type === "employee") {
      portalType = "employee";
    } else if (
      contact.contact_type === "vendor" ||
      contact.contact_type === "subcontractor"
    ) {
      portalType = "vendor";
    }

    // Build display name from contact fields
    const fullName =
      `${contact.first_name || ""} ${contact.last_name || ""}`.trim() ||
      contact.company_name ||
      email;

    const admin = createAdminClient();

    // Step 4: Create Supabase Auth user
    const { data: authData, error: authError } =
      await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
        },
      });

    if (authError) {
      // Handle duplicate email
      if (
        authError.message?.includes("already been registered") ||
        authError.message?.includes("already exists")
      ) {
        return NextResponse.json(
          { error: "An account with this email already exists." },
          { status: 409 }
        );
      }
      console.error("Create auth user error:", authError);
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      );
    }

    const userId = authData.user.id;

    // Step 5: Create user_profiles record (admin client bypasses RLS)
    const { error: profileError } = await admin
      .from("user_profiles")
      .insert({
        id: userId,
        full_name: fullName || "",
        email,
        portal_type: portalType,
      });

    if (profileError) {
      // Cleanup: remove auth user on failure
      console.error("user_profiles insert error:", profileError);
      await admin.auth.admin.deleteUser(userId);
      return NextResponse.json(
        { error: "Failed to create user profile. Please try again." },
        { status: 500 }
      );
    }

    // Step 6: For employees, create company_members record
    if (portalType === "employee") {
      const { error: memberError } = await admin
        .from("company_members")
        .insert({
          company_id: userCtx.companyId,
          user_id: userId,
          role: "field_worker",
        });

      if (memberError) {
        console.error("company_members insert error:", memberError);
        // Cleanup: remove profile and auth user
        await admin.from("user_profiles").delete().eq("id", userId);
        await admin.auth.admin.deleteUser(userId);
        return NextResponse.json(
          {
            error:
              "Failed to create company membership. Please try again.",
          },
          { status: 500 }
        );
      }
    }

    // Step 7: Update the contact's user_id
    const { error: updateError } = await admin
      .from("contacts")
      .update({ user_id: userId })
      .eq("id", contact_id);

    if (updateError) {
      console.error("contacts update error:", updateError);
      // Cleanup: remove membership, profile, and auth user
      if (portalType === "employee") {
        await admin
          .from("company_members")
          .delete()
          .eq("user_id", userId)
          .eq("company_id", userCtx.companyId);
      }
      await admin.from("user_profiles").delete().eq("id", userId);
      await admin.auth.admin.deleteUser(userId);
      return NextResponse.json(
        { error: "Failed to link contact to account. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { userId: authData.user.id, email },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST /api/people/create-login error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
