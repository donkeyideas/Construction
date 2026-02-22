import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getCompanyDetails, updateCompanySettings } from "@/lib/queries/admin";
import { logAuditEvent, extractRequestMeta } from "@/lib/utils/audit-logger";

// ---------------------------------------------------------------------------
// GET /api/admin/settings - Get company settings
// ---------------------------------------------------------------------------

export async function GET() {
  try {
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const company = await getCompanyDetails(supabase, userCtx.companyId);

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    return NextResponse.json({ company });
  } catch (err) {
    console.error("GET /api/admin/settings error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/admin/settings - Update company settings
// ---------------------------------------------------------------------------

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Only owner and admin can change company settings
    if (userCtx.role !== "owner" && userCtx.role !== "admin") {
      return NextResponse.json(
        { error: "Insufficient permissions. Only owners and admins can modify company settings." },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Validate company name if provided
    if (body.name !== undefined) {
      if (typeof body.name !== "string" || !body.name.trim()) {
        return NextResponse.json(
          { error: "Company name is required and cannot be empty." },
          { status: 400 }
        );
      }
    }

    // Build the update payload - only include fields that are provided
    const updatePayload: Record<string, unknown> = {};

    const allowedFields = [
      "name",
      "industry",
      "address",
      "city",
      "state",
      "zip",
      "phone",
      "website",
      "logo_url",
      "settings",
      "selected_modules",
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updatePayload[field] = body[field];
      }
    }

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json(
        { error: "No valid fields provided for update." },
        { status: 400 }
      );
    }

    const { company, error } = await updateCompanySettings(
      supabase,
      userCtx.companyId,
      updatePayload
    );

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    // Audit log (fire-and-forget)
    const { ipAddress } = extractRequestMeta(request);
    logAuditEvent({
      supabase,
      companyId: userCtx.companyId,
      userId: userCtx.userId,
      action: "update_company_settings",
      entityType: "company",
      entityId: userCtx.companyId,
      details: { fields_changed: Object.keys(updatePayload) },
      ipAddress,
    });

    return NextResponse.json(company);
  } catch (err) {
    console.error("PATCH /api/admin/settings error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
