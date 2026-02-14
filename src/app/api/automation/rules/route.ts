import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);
    if (!userCtx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, trigger_type, trigger_entity, conditions, actions } = body;

    if (!name?.trim() || !trigger_type) {
      return NextResponse.json(
        { error: "Name and trigger type are required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("automation_rules")
      .insert({
        company_id: userCtx.companyId,
        name: name.trim(),
        description: description?.trim() || null,
        trigger_type,
        trigger_entity: trigger_entity || null,
        conditions: conditions || [],
        actions: actions || [],
        is_enabled: true,
        created_by: userCtx.userId,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error("POST /api/automation/rules error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
