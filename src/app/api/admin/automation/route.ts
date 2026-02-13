import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getAutomationRules, createRule } from "@/lib/queries/automation";

// ---------------------------------------------------------------------------
// GET /api/admin/automation - List all automation rules for company
// ---------------------------------------------------------------------------

export async function GET() {
  try {
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rules = await getAutomationRules(supabase, userCtx.companyId);
    return NextResponse.json(rules);
  } catch (err) {
    console.error("GET /api/admin/automation error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/admin/automation - Create a new automation rule
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (userCtx.role !== "owner" && userCtx.role !== "admin") {
      return NextResponse.json(
        { error: "Insufficient permissions. Only owners and admins can manage automation rules." },
        { status: 403 }
      );
    }

    const body = await request.json();

    if (!body.name || !body.trigger_type || !body.trigger_entity) {
      return NextResponse.json(
        { error: "Name, trigger type, and trigger entity are required." },
        { status: 400 }
      );
    }

    const { rule, error } = await createRule(
      supabase,
      userCtx.companyId,
      userCtx.userId,
      {
        name: body.name,
        description: body.description,
        trigger_type: body.trigger_type,
        trigger_entity: body.trigger_entity,
        trigger_config: body.trigger_config,
        conditions: body.conditions || [],
        actions: body.actions || [],
      }
    );

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    return NextResponse.json(rule, { status: 201 });
  } catch (err) {
    console.error("POST /api/admin/automation error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
