import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { exchangeCodeForTokens } from "@/lib/integrations/quickbooks/auth";

/**
 * GET /api/integrations/quickbooks/callback
 * OAuth2 callback from QuickBooks. Exchanges code for tokens and stores connection.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const realmId = searchParams.get("realmId");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(new URL("/admin/integrations?error=denied", req.url));
  }

  if (!code || !realmId) {
    return NextResponse.redirect(new URL("/admin/integrations?error=missing_params", req.url));
  }

  try {
    const supabase = await createClient();
    const userCompany = await getCurrentUserCompany(supabase);

    if (!userCompany) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    // Verify state matches (CSRF protection)
    if (state !== userCompany.companyId) {
      return NextResponse.redirect(new URL("/admin/integrations?error=invalid_state", req.url));
    }

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code, realmId);

    // Store connection in database
    const { error: dbError } = await supabase.from("integrations").upsert(
      {
        company_id: userCompany.companyId,
        provider: "quickbooks",
        status: "connected",
        credentials: {
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          realm_id: realmId,
          expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        },
        connected_at: new Date().toISOString(),
        connected_by: userCompany.userId,
      },
      { onConflict: "company_id,provider" }
    );

    if (dbError) {
      console.error("Failed to store QB connection:", dbError);
      return NextResponse.redirect(new URL("/admin/integrations?error=storage_failed", req.url));
    }

    return NextResponse.redirect(new URL("/admin/integrations?success=quickbooks", req.url));
  } catch (e) {
    console.error("QB OAuth callback error:", e);
    return NextResponse.redirect(new URL("/admin/integrations?error=exchange_failed", req.url));
  }
}
