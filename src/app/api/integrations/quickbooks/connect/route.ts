import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getAuthorizationUrl } from "@/lib/integrations/quickbooks/auth";

/**
 * GET /api/integrations/quickbooks/connect
 * Redirects the user to QuickBooks OAuth2 authorization page.
 * Uses companyId as the state parameter for CSRF protection.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const userCompany = await getCurrentUserCompany(supabase);

    if (!userCompany) {
      return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"));
    }

    // Only owners and admins can connect integrations
    if (userCompany.role !== "owner" && userCompany.role !== "admin") {
      return NextResponse.redirect(
        new URL("/admin/integrations?error=insufficient_permissions", process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000")
      );
    }

    const authUrl = getAuthorizationUrl(userCompany.companyId);
    return NextResponse.redirect(authUrl);
  } catch (e) {
    console.error("QB connect error:", e);
    return NextResponse.redirect(
      new URL("/admin/integrations?error=connect_failed", process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000")
    );
  }
}
