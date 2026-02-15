import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next"); // null when no explicit redirect

  if (code) {
    const supabase = await createClient();
    const { error, data } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // If an explicit redirect was provided, use it
      if (next) {
        return NextResponse.redirect(`${origin}${next}`);
      }

      // Otherwise determine the correct dashboard from user profile
      if (data?.user) {
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("portal_type, is_platform_admin")
          .eq("id", data.user.id)
          .single();

        if (profile?.is_platform_admin) {
          return NextResponse.redirect(`${origin}/super-admin`);
        }
        if (profile?.portal_type === "tenant") {
          return NextResponse.redirect(`${origin}/tenant`);
        }
        if (profile?.portal_type === "vendor") {
          return NextResponse.redirect(`${origin}/vendor`);
        }
        if (profile?.portal_type === "admin") {
          return NextResponse.redirect(`${origin}/admin-panel`);
        }
      }

      return NextResponse.redirect(`${origin}/dashboard`);
    }
  }
  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
