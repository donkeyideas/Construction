import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { revokeToken } from "@/lib/integrations/quickbooks/auth";

/**
 * POST /api/integrations/quickbooks/disconnect
 * Revokes QB tokens and marks integration as disconnected.
 */
export async function POST() {
  try {
    const supabase = await createClient();
    const userCompany = await getCurrentUserCompany(supabase);

    if (!userCompany) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (userCompany.role !== "owner" && userCompany.role !== "admin") {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    // Get current connection to revoke tokens
    const { data: integration } = await supabase
      .from("integrations")
      .select("config")
      .eq("company_id", userCompany.companyId)
      .eq("provider", "quickbooks")
      .single();

    if (integration?.config?.access_token) {
      // Revoke token at Intuit (best effort)
      await revokeToken(integration.config.access_token as string).catch(() => {});
    }

    // Mark as disconnected in DB
    const { error: dbError } = await supabase
      .from("integrations")
      .update({
        is_connected: false,
        status: "disconnected",
        config: {},
        updated_at: new Date().toISOString(),
      })
      .eq("company_id", userCompany.companyId)
      .eq("provider", "quickbooks");

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("QB disconnect error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
