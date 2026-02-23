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

    // 1. Delete company_members (has ON DELETE CASCADE but clean up explicitly)
    await admin.from("company_members").delete().eq("user_id", id);

    // 2. Check if user is the sole owner of any company — delete those companies
    const { data: ownedCompanies } = await admin
      .from("companies")
      .select("id")
      .eq("created_by", id);

    if (ownedCompanies) {
      for (const company of ownedCompanies) {
        const { count } = await admin
          .from("company_members")
          .select("*", { count: "exact", head: true })
          .eq("company_id", company.id);

        if (!count || count === 0) {
          await admin.from("companies").delete().eq("id", company.id);
        }
      }
    }

    // 3. NULL out ALL nullable FK references to auth.users across every table.
    //    Without this, Postgres blocks auth.users deletion due to FK constraints.
    //    Tables with ON DELETE CASCADE (user_profiles, company_members,
    //    employee_pay_rates, payroll_deductions, clock_events, messages,
    //    tickets.created_by) are handled automatically.
    const nullifyOps = [
      // Core business tables (001_schema.sql)
      admin.from("companies").update({ created_by: null }).eq("created_by", id),
      admin.from("contacts").update({ user_id: null }).eq("user_id", id),
      admin.from("projects").update({ project_manager_id: null }).eq("project_manager_id", id),
      admin.from("projects").update({ superintendent_id: null }).eq("superintendent_id", id),
      admin.from("project_tasks").update({ assigned_to: null }).eq("assigned_to", id),
      admin.from("rfis").update({ assigned_to: null }).eq("assigned_to", id),
      admin.from("rfis").update({ answered_by: null }).eq("answered_by", id),
      admin.from("change_orders").update({ requested_by: null }).eq("requested_by", id),
      admin.from("change_orders").update({ approved_by: null }).eq("approved_by", id),
      admin.from("change_orders").update({ signed_by: null }).eq("signed_by", id),
      admin.from("submittals").update({ reviewer_id: null }).eq("reviewer_id", id),
      admin.from("submittals").update({ signed_by: null }).eq("signed_by", id),
      admin.from("punch_list_items").update({ assigned_to: null }).eq("assigned_to", id),
      admin.from("punch_list_items").update({ verified_by: null }).eq("verified_by", id),
      admin.from("equipment").update({ assigned_to: null }).eq("assigned_to", id),
      admin.from("leases").update({ tenant_user_id: null }).eq("tenant_user_id", id),
      admin.from("maintenance_requests").update({ requested_by: null }).eq("requested_by", id),
      admin.from("maintenance_requests").update({ assigned_to: null }).eq("assigned_to", id),
      admin.from("properties").update({ manager_id: null }).eq("manager_id", id),
      admin.from("documents").update({ uploaded_by: null }).eq("uploaded_by", id),
      admin.from("audit_log").update({ user_id: null }).eq("user_id", id),
      // Financial (001_schema.sql + 039)
      admin.from("journal_entries").update({ posted_by: null }).eq("posted_by", id),
      admin.from("journal_entries").update({ created_by: null }).eq("created_by", id),
      admin.from("invoices").update({ approved_by: null }).eq("approved_by", id),
      admin.from("invoices").update({ submitted_by: null }).eq("submitted_by", id),
      admin.from("time_entries").update({ approved_by: null }).eq("approved_by", id),
      admin.from("payments").update({ approved_by: null }).eq("approved_by", id),
      // Portal access (005)
      admin.from("tenant_announcements").update({ created_by: null }).eq("created_by", id),
      admin.from("portal_invitations").update({ invited_by: null }).eq("invited_by", id),
      admin.from("tenant_documents").update({ shared_with_tenant_user_id: null }).eq("shared_with_tenant_user_id", id),
      // Inbox/tickets (007)
      admin.from("tickets").update({ assigned_to: null }).eq("assigned_to", id),
      admin.from("tickets").update({ resolved_by: null }).eq("resolved_by", id),
      // Safety & equipment (008)
      admin.from("safety_incidents").update({ assigned_to: null }).eq("assigned_to", id),
      admin.from("safety_incidents").update({ closed_by: null }).eq("closed_by", id),
      admin.from("equipment_maintenance_logs").update({ performed_by_user_id: null }).eq("performed_by_user_id", id),
      admin.from("equipment_assignments").update({ assigned_to: null }).eq("assigned_to", id),
      admin.from("equipment_assignments").update({ assigned_by: null }).eq("assigned_by", id),
      // Banking (008)
      admin.from("bank_transactions").update({ reconciled_by: null }).eq("reconciled_by", id),
      admin.from("bank_reconciliations").update({ reconciled_by: null }).eq("reconciled_by", id),
      // Contracts (008 + 012)
      admin.from("contracts").update({ created_by: null }).eq("created_by", id),
      admin.from("contracts").update({ approved_by: null }).eq("approved_by", id),
      admin.from("contracts").update({ terminated_by: null }).eq("terminated_by", id),
      admin.from("contracts").update({ signed_by: null }).eq("signed_by", id),
      admin.from("contract_milestones").update({ completed_by: null }).eq("completed_by", id),
      // Misc (008)
      admin.from("integrations").update({ connected_by: null }).eq("connected_by", id),
      admin.from("security_settings").update({ updated_by: null }).eq("updated_by", id),
      admin.from("automation_rules").update({ created_by: null }).eq("created_by", id),
      // Plan room (009, 028)
      admin.from("drawing_sets").update({ created_by: null }).eq("created_by", id),
      admin.from("document_folders").update({ created_by: null }).eq("created_by", id),
      admin.from("asset_library").update({ uploaded_by: null }).eq("uploaded_by", id),
      // Estimating (013)
      admin.from("estimates").update({ approved_by: null }).eq("approved_by", id),
      admin.from("estimate_templates").update({ created_by: null }).eq("created_by", id),
      admin.from("estimate_templates").update({ approved_by: null }).eq("approved_by", id),
      admin.from("cost_estimate_templates").update({ created_by: null }).eq("created_by", id),
      // Import tracking (026)
      admin.from("import_batches").update({ created_by: null }).eq("created_by", id),
      admin.from("import_runs").update({ created_by: null }).eq("created_by", id),
      // Payroll (027)
      admin.from("payroll_runs").update({ approved_by: null }).eq("approved_by", id),
      admin.from("payroll_runs").update({ created_by: null }).eq("created_by", id),
    ];
    await Promise.allSettled(nullifyOps);

    // 4. Delete rows from tables with NOT NULL FK refs to auth.users.
    //    These records cannot exist without the user.
    const deleteOps = [
      admin.from("daily_logs").delete().eq("created_by", id),
      admin.from("rfis").delete().eq("submitted_by", id),
      admin.from("submittals").delete().eq("submitted_by", id),
      admin.from("safety_inspections").delete().eq("inspector_id", id),
      admin.from("safety_incidents").delete().eq("reported_by", id),
      admin.from("toolbox_talks").delete().eq("conducted_by", id),
      admin.from("time_entries").delete().eq("user_id", id),
      admin.from("messages").delete().eq("sender_id", id),
      admin.from("messages").delete().eq("recipient_id", id),
      admin.from("tickets").delete().eq("created_by", id),
      admin.from("support_tickets").delete().eq("created_by", id),
      admin.from("markup_annotations").delete().eq("created_by", id),
      admin.from("payroll_items").delete().eq("user_id", id),
      admin.from("login_history").delete().eq("user_id", id),
      admin.from("active_sessions").delete().eq("user_id", id),
      admin.from("estimate_line_items").delete().eq("created_by", id),
      admin.from("employment_contracts").delete().eq("created_by", id),
    ];
    await Promise.allSettled(deleteOps);

    // 5. Delete user_profile (has ON DELETE CASCADE from auth.users,
    //    but delete explicitly so step 6 doesn't cascade unexpectedly)
    await admin.from("user_profiles").delete().eq("id", id);

    // 6. Delete auth user — all FK references are now cleared
    const { error: authError } = await admin.auth.admin.deleteUser(id);
    if (authError) {
      console.error("Failed to delete auth user:", authError);
      return NextResponse.json(
        { error: "Failed to delete user account. Please try again." },
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
