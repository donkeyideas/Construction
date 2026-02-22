import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import {
  updateMemberRole,
  deactivateMember,
  type MemberRole,
} from "@/lib/queries/admin";
import { logAuditEvent } from "@/lib/utils/audit-logger";

const VALID_ROLES: MemberRole[] = [
  "admin",
  "project_manager",
  "superintendent",
  "accountant",
  "field_worker",
  "viewer",
];

// ---------------------------------------------------------------------------
// PATCH /api/admin/members/[id] - Update member role
// ---------------------------------------------------------------------------

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Only owner and admin can change roles
    if (userCtx.role !== "owner" && userCtx.role !== "admin") {
      return NextResponse.json(
        { error: "Insufficient permissions." },
        { status: 403 }
      );
    }

    // Verify the member belongs to the same company
    const { data: member } = await supabase
      .from("company_members")
      .select("id, company_id, role")
      .eq("id", id)
      .single();

    if (!member || member.company_id !== userCtx.companyId) {
      return NextResponse.json(
        { error: "Member not found." },
        { status: 404 }
      );
    }

    // Cannot change owner role
    if (member.role === "owner") {
      return NextResponse.json(
        { error: "Cannot change the owner's role." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const role = body.role as MemberRole;

    if (!role || !VALID_ROLES.includes(role)) {
      return NextResponse.json(
        { error: "Invalid role." },
        { status: 400 }
      );
    }

    const { error } = await updateMemberRole(supabase, id, role);

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    logAuditEvent({
      supabase,
      companyId: userCtx.companyId,
      userId: userCtx.userId,
      action: "member_role_changed",
      entityType: "company_member",
      entityId: id,
      details: { from_role: member.role, to_role: role },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("PATCH /api/admin/members/[id] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/admin/members/[id] - Deactivate member (soft delete)
// ---------------------------------------------------------------------------

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Only owner and admin can deactivate members
    if (userCtx.role !== "owner" && userCtx.role !== "admin") {
      return NextResponse.json(
        { error: "Insufficient permissions." },
        { status: 403 }
      );
    }

    // Verify the member belongs to the same company
    const { data: member } = await supabase
      .from("company_members")
      .select("id, company_id, role")
      .eq("id", id)
      .single();

    if (!member || member.company_id !== userCtx.companyId) {
      return NextResponse.json(
        { error: "Member not found." },
        { status: 404 }
      );
    }

    // Cannot deactivate owner
    if (member.role === "owner") {
      return NextResponse.json(
        { error: "Cannot deactivate the company owner." },
        { status: 400 }
      );
    }

    // Prevent self-deactivation
    if (member.id === userCtx.userId) {
      return NextResponse.json(
        { error: "Cannot deactivate your own account." },
        { status: 400 }
      );
    }

    const { error } = await deactivateMember(supabase, id);

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    logAuditEvent({
      supabase,
      companyId: userCtx.companyId,
      userId: userCtx.userId,
      action: "member_deactivated",
      entityType: "company_member",
      entityId: id,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/admin/members/[id] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
