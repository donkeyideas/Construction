import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isPlatformAdmin } from "@/lib/queries/super-admin";
import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

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

// ---------------------------------------------------------------------------
// Comprehensive cleanup of all FK references to auth.users and user_profiles.
// Uses Promise.allSettled so individual table failures don't block others.
// ---------------------------------------------------------------------------
async function cleanupAllUserReferences(
  admin: SupabaseClient,
  userId: string
) {
  // --- Phase 1: Delete rows from join/per-user tables (NOT NULL FKs) ---
  await Promise.allSettled([
    admin.from("company_members").delete().eq("user_id", userId),
    admin.from("messages").delete().eq("sender_id", userId),
    admin.from("messages").delete().eq("recipient_id", userId),
    admin.from("user_notifications").delete().eq("user_id", userId),
    admin.from("notification_preferences").delete().eq("user_id", userId),
    admin.from("login_history").delete().eq("user_id", userId),
    admin.from("active_sessions").delete().eq("user_id", userId),
    admin.from("markup_annotations").delete().eq("created_by", userId),
    admin.from("support_tickets").delete().eq("user_id", userId),
    admin.from("promo_redemptions").delete().eq("user_id", userId),
    // ON DELETE CASCADE tables — clean up explicitly to be safe
    admin.from("clock_events").delete().eq("user_id", userId),
    admin.from("employee_profiles").delete().eq("user_id", userId),
    admin.from("time_off_requests").delete().eq("user_id", userId),
  ]);

  // --- Phase 2: Nullify nullable FK columns across all tables ---
  await Promise.allSettled([
    // companies
    admin.from("companies").update({ created_by: null }).eq("created_by", userId),
    // projects
    admin.from("projects").update({ project_manager_id: null }).eq("project_manager_id", userId),
    admin.from("projects").update({ superintendent_id: null }).eq("superintendent_id", userId),
    // project_tasks
    admin.from("project_tasks").update({ assigned_to: null }).eq("assigned_to", userId),
    // daily_logs
    admin.from("daily_logs").update({ created_by: null }).eq("created_by", userId),
    // rfis
    admin.from("rfis").update({ assigned_to: null }).eq("assigned_to", userId),
    // documents
    admin.from("documents").update({ uploaded_by: null }).eq("uploaded_by", userId),
    // time_entries
    admin.from("time_entries").update({ user_id: null }).eq("user_id", userId),
    admin.from("time_entries").update({ updated_by: null }).eq("updated_by", userId),
    // audit_log (original from migration 001)
    admin.from("audit_log").update({ user_id: null }).eq("user_id", userId),
    // audit_logs (super-admin from migration 022)
    admin.from("audit_logs").update({ user_id: null }).eq("user_id", userId),
    // comments
    admin.from("comments").update({ user_id: null }).eq("user_id", userId),
    // opportunities
    admin.from("opportunities").update({ assigned_to: null }).eq("assigned_to", userId),
    // safety_incidents
    admin.from("safety_incidents").update({ reported_by: null }).eq("reported_by", userId),
    admin.from("safety_incidents").update({ assigned_to: null }).eq("assigned_to", userId),
    admin.from("safety_incidents").update({ closed_by: null }).eq("closed_by", userId),
    // toolbox_talks
    admin.from("toolbox_talks").update({ conducted_by: null }).eq("conducted_by", userId),
    // equipment
    admin.from("equipment").update({ assigned_to: null }).eq("assigned_to", userId),
    // equipment_maintenance_logs
    admin.from("equipment_maintenance_logs").update({ performed_by_user_id: null }).eq("performed_by_user_id", userId),
    // equipment_assignments
    admin.from("equipment_assignments").update({ assigned_to: null }).eq("assigned_to", userId),
    admin.from("equipment_assignments").update({ assigned_by: null }).eq("assigned_by", userId),
    // bank_transactions
    admin.from("bank_transactions").update({ reconciled_by: null }).eq("reconciled_by", userId),
    // bank_reconciliations
    admin.from("bank_reconciliations").update({ reconciled_by: null }).eq("reconciled_by", userId),
    // contracts
    admin.from("contracts").update({ created_by: null }).eq("created_by", userId),
    admin.from("contracts").update({ approved_by: null }).eq("approved_by", userId),
    admin.from("contracts").update({ terminated_by: null }).eq("terminated_by", userId),
    admin.from("contracts").update({ signed_by: null }).eq("signed_by", userId),
    // contract_milestones
    admin.from("contract_milestones").update({ completed_by: null }).eq("completed_by", userId),
    // integrations
    admin.from("integrations").update({ connected_by: null }).eq("connected_by", userId),
    // security_settings
    admin.from("security_settings").update({ updated_by: null }).eq("updated_by", userId),
    // automation_rules
    admin.from("automation_rules").update({ created_by: null }).eq("created_by", userId),
    // change_orders
    admin.from("change_orders").update({ signed_by: null }).eq("signed_by", userId),
    // submittals
    admin.from("submittals").update({ signed_by: null }).eq("signed_by", userId),
    // invoices
    admin.from("invoices").update({ submitted_by: null }).eq("submitted_by", userId),
    // payments
    admin.from("payments").update({ approved_by: null }).eq("approved_by", userId),
    // tickets
    admin.from("tickets").update({ created_by: null }).eq("created_by", userId),
    admin.from("tickets").update({ assigned_to: null }).eq("assigned_to", userId),
    admin.from("tickets").update({ resolved_by: null }).eq("resolved_by", userId),
    // portal_documents
    admin.from("portal_documents").update({ created_by: null }).eq("created_by", userId),
    admin.from("portal_documents").update({ shared_with_tenant_user_id: null }).eq("shared_with_tenant_user_id", userId),
    // portal_invitations
    admin.from("portal_invitations").update({ invited_by: null }).eq("invited_by", userId),
    // drawing_sets
    admin.from("drawing_sets").update({ created_by: null }).eq("created_by", userId),
    // estimates / cost_estimates
    admin.from("estimates").update({ created_by: null }).eq("created_by", userId),
    admin.from("estimates").update({ approved_by: null }).eq("approved_by", userId),
    admin.from("cost_estimates").update({ created_by: null }).eq("created_by", userId),
    // import_batches
    admin.from("import_batches").update({ created_by: null }).eq("created_by", userId),
    // plan_room
    admin.from("plan_room_projects").update({ created_by: null }).eq("created_by", userId),
    admin.from("plan_room_documents").update({ uploaded_by: null }).eq("uploaded_by", userId),
    // payroll
    admin.from("payroll_runs").update({ approved_by: null }).eq("approved_by", userId),
    admin.from("payroll_runs").update({ created_by: null }).eq("created_by", userId),
    admin.from("payroll_items").update({ user_id: null }).eq("user_id", userId),
    // subscription_events
    admin.from("subscription_events").update({ user_id: null }).eq("user_id", userId),
    // platform_settings
    admin.from("platform_settings").update({ updated_by: null }).eq("updated_by", userId),
    // promo_codes
    admin.from("promo_codes").update({ created_by: null }).eq("created_by", userId),
    // leases
    admin.from("leases").update({ created_by: null }).eq("created_by", userId),
    admin.from("leases").update({ approved_by: null }).eq("approved_by", userId),
    admin.from("leases").update({ terminated_by: null }).eq("terminated_by", userId),
    // maintenance_requests
    admin.from("maintenance_requests").update({ completed_by: null }).eq("completed_by", userId),
    // quickbooks_connections
    admin.from("quickbooks_connections").update({ connected_by: null }).eq("connected_by", userId),
  ]);

  // --- Phase 3: Clean up storage objects owned by this user ---
  try {
    await admin.schema("storage").from("objects").update({ owner: null }).eq("owner", userId);
  } catch { /* storage schema may not be accessible via client */ }
  try {
    await admin.schema("storage").from("objects").update({ owner_id: null }).eq("owner_id", userId);
  } catch { /* owner_id column may not exist in older Supabase versions */ }
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

    // 1. Comprehensive cleanup of all FK references (works without the RPC)
    await cleanupAllUserReferences(admin, id);

    // 2. Try the dynamic RPC as a safety net for any tables we missed
    const { error: rpcError } = await admin.rpc("cleanup_user_references", {
      p_user_id: id,
    });
    if (rpcError) {
      console.warn("cleanup_user_references RPC unavailable:", rpcError.message);
    }

    // 3. Delete user_profile (clears the user_profiles → auth.users FK)
    const { error: profileError } = await admin
      .from("user_profiles")
      .delete()
      .eq("id", id);
    if (profileError) {
      console.error("user_profiles delete failed:", profileError.message);
      return NextResponse.json(
        {
          error: `Failed to remove user profile: ${profileError.message}`,
        },
        { status: 500 }
      );
    }

    // 4. Delete the auth user — all FK references should now be cleared
    const { error: authError } = await admin.auth.admin.deleteUser(id);
    if (authError) {
      console.error("Failed to delete auth user:", authError);
      return NextResponse.json(
        {
          error: `Failed to delete auth user: ${authError.message}`,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: "User deleted." });
  } catch (err) {
    console.error("User deletion error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
