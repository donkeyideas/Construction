import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getIntegrations, createIntegration } from "@/lib/queries/integrations";

// ---------------------------------------------------------------------------
// GET /api/admin/integrations - List all integrations for company
// ---------------------------------------------------------------------------

export async function GET() {
  try {
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const integrations = await getIntegrations(supabase, userCtx.companyId);
    return NextResponse.json(integrations);
  } catch (err) {
    console.error("GET /api/admin/integrations error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/admin/integrations - Create a new integration
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
        { error: "Insufficient permissions. Only owners and admins can manage integrations." },
        { status: 403 }
      );
    }

    const body = await request.json();

    if (!body.provider_key || !body.provider_name) {
      return NextResponse.json(
        { error: "Provider key and name are required." },
        { status: 400 }
      );
    }

    const { integration, error } = await createIntegration(
      supabase,
      userCtx.companyId,
      userCtx.userId,
      {
        provider_key: body.provider_key,
        provider_name: body.provider_name,
        description: body.description || "",
        category: body.category || "communication",
        auth_type: body.auth_type || "api_key",
        config: body.config || {},
      }
    );

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    return NextResponse.json(integration, { status: 201 });
  } catch (err) {
    console.error("POST /api/admin/integrations error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
