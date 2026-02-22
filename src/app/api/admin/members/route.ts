import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { inviteMember, type MemberRole } from "@/lib/queries/admin";
import { logAuditEvent } from "@/lib/utils/audit-logger";

// ---------------------------------------------------------------------------
// POST /api/admin/members - Invite a new member to the company
// ---------------------------------------------------------------------------

const VALID_ROLES: MemberRole[] = [
  "admin",
  "project_manager",
  "superintendent",
  "accountant",
  "field_worker",
  "viewer",
];

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Only owner and admin can invite members
    if (userCtx.role !== "owner" && userCtx.role !== "admin") {
      return NextResponse.json(
        { error: "Insufficient permissions. Only owners and admins can invite members." },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Validate email
    if (!body.email || typeof body.email !== "string" || !body.email.trim()) {
      return NextResponse.json(
        { error: "Email is required." },
        { status: 400 }
      );
    }

    // Basic email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email.trim())) {
      return NextResponse.json(
        { error: "Invalid email format." },
        { status: 400 }
      );
    }

    // Validate role
    const role = body.role as MemberRole;
    if (!role || !VALID_ROLES.includes(role)) {
      return NextResponse.json(
        { error: "Invalid role. Must be one of: " + VALID_ROLES.join(", ") },
        { status: 400 }
      );
    }

    const { member, error } = await inviteMember(
      supabase,
      userCtx.companyId,
      body.email.trim(),
      role
    );

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    logAuditEvent({
      supabase,
      companyId: userCtx.companyId,
      userId: userCtx.userId,
      action: "member_invited",
      entityType: "company_member",
      details: { email: body.email.trim(), role },
    });

    return NextResponse.json(member, { status: 201 });
  } catch (err) {
    console.error("POST /api/admin/members error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
