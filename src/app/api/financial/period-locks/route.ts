import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { logAuditEvent, extractRequestMeta } from "@/lib/utils/audit-logger";

export async function GET() {
  try {
    const supabase = await createClient();
    const userCompany = await getCurrentUserCompany(supabase);

    if (!userCompany) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: locks, error } = await supabase
      .from("fiscal_period_locks")
      .select("id, year, month, locked_by, locked_at, notes")
      .eq("company_id", userCompany.companyId)
      .order("year", { ascending: false })
      .order("month", { ascending: false });

    if (error) {
      console.error("GET /api/financial/period-locks error:", error);
      return NextResponse.json({ error: "Failed to fetch period locks" }, { status: 500 });
    }

    return NextResponse.json({ locks: locks ?? [] });
  } catch (error) {
    console.error("GET /api/financial/period-locks error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const userCompany = await getCurrentUserCompany(supabase);

    if (!userCompany) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can lock periods
    if (userCompany.role !== "owner" && userCompany.role !== "admin") {
      return NextResponse.json({ error: "Only admins can lock fiscal periods" }, { status: 403 });
    }

    const body = await request.json();

    if (!body.year || !body.month) {
      return NextResponse.json({ error: "Missing required fields: year, month" }, { status: 400 });
    }

    const year = Number(body.year);
    const month = Number(body.month);

    if (month < 1 || month > 12) {
      return NextResponse.json({ error: "Month must be between 1 and 12" }, { status: 400 });
    }

    const { data: lock, error } = await supabase
      .from("fiscal_period_locks")
      .insert({
        company_id: userCompany.companyId,
        year,
        month,
        locked_by: userCompany.userId,
        notes: body.notes || null,
      })
      .select("id")
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: `Period ${month}/${year} is already locked` }, { status: 409 });
      }
      console.error("POST /api/financial/period-locks error:", error);
      return NextResponse.json({ error: "Failed to lock period" }, { status: 500 });
    }

    const meta = extractRequestMeta(request);
    logAuditEvent({
      supabase,
      companyId: userCompany.companyId,
      userId: userCompany.userId,
      action: "lock_period",
      entityType: "fiscal_period",
      entityId: lock.id,
      details: { year, month, notes: body.notes },
      ipAddress: meta.ipAddress,
    });

    return NextResponse.json({ id: lock.id, year, month }, { status: 201 });
  } catch (error) {
    console.error("POST /api/financial/period-locks error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const userCompany = await getCurrentUserCompany(supabase);

    if (!userCompany) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can unlock periods
    if (userCompany.role !== "owner" && userCompany.role !== "admin") {
      return NextResponse.json({ error: "Only admins can unlock fiscal periods" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const year = searchParams.get("year");
    const month = searchParams.get("month");

    if (!year || !month) {
      return NextResponse.json({ error: "Missing required query params: year, month" }, { status: 400 });
    }

    const { data: deleted, error } = await supabase
      .from("fiscal_period_locks")
      .delete()
      .eq("company_id", userCompany.companyId)
      .eq("year", Number(year))
      .eq("month", Number(month))
      .select("id")
      .single();

    if (error || !deleted) {
      return NextResponse.json({ error: "Period lock not found" }, { status: 404 });
    }

    const meta = extractRequestMeta(request);
    logAuditEvent({
      supabase,
      companyId: userCompany.companyId,
      userId: userCompany.userId,
      action: "unlock_period",
      entityType: "fiscal_period",
      entityId: deleted.id,
      details: { year: Number(year), month: Number(month) },
      ipAddress: meta.ipAddress,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/financial/period-locks error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
