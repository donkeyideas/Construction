import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserCompany } from "@/lib/queries/user";

// ---------------------------------------------------------------------------
// POST /api/leases/create-login
// Create a Supabase Auth login for a tenant linked to a lease
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
    const { lease_id, email, password } = body as {
      lease_id?: string;
      email?: string;
      password?: string;
    };

    // Validate required fields
    if (!lease_id || !email || !password) {
      return NextResponse.json(
        { error: "Missing required fields: lease_id, email, password" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    // Step 2: Fetch the lease and verify it belongs to the company
    const { data: lease, error: leaseError } = await supabase
      .from("leases")
      .select("id, tenant_name, tenant_email, tenant_user_id, company_id")
      .eq("id", lease_id)
      .eq("company_id", userCtx.companyId)
      .single();

    if (leaseError || !lease) {
      return NextResponse.json(
        { error: "Lease not found." },
        { status: 404 }
      );
    }

    if (lease.tenant_user_id) {
      return NextResponse.json(
        { error: "This tenant already has a login account." },
        { status: 400 }
      );
    }

    const fullName = lease.tenant_name || email;
    const admin = createAdminClient();

    // Step 3: Create Supabase Auth user
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

    // Step 4: Create user_profiles record with portal_type = "tenant"
    const { error: profileError } = await admin
      .from("user_profiles")
      .insert({
        id: userId,
        full_name: fullName || "",
        email,
        portal_type: "tenant",
      });

    if (profileError) {
      console.error("user_profiles insert error:", profileError);
      await admin.auth.admin.deleteUser(userId);
      return NextResponse.json(
        { error: "Failed to create user profile. Please try again." },
        { status: 500 }
      );
    }

    // Step 5: Update the lease's tenant_user_id
    const { error: updateError } = await admin
      .from("leases")
      .update({ tenant_user_id: userId })
      .eq("id", lease_id);

    if (updateError) {
      console.error("lease update error:", updateError);
      // Cleanup: remove profile and auth user
      await admin.from("user_profiles").delete().eq("id", userId);
      await admin.auth.admin.deleteUser(userId);
      return NextResponse.json(
        { error: "Failed to link tenant to lease. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { userId: authData.user.id, email },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST /api/leases/create-login error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
