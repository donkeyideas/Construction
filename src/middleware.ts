import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** Map a protected path to the correct login URL */
function getLoginUrlForPath(pathname: string): string {
  if (pathname.startsWith("/tenant")) return "/login/tenant";
  if (pathname.startsWith("/vendor")) return "/login/vendor";
  if (pathname.startsWith("/admin-panel")) return "/login/admin";
  return "/login";
}

/** Check if path is a login page */
function isLoginPage(pathname: string): boolean {
  return (
    pathname === "/login" ||
    pathname === "/login/tenant" ||
    pathname === "/login/vendor" ||
    pathname === "/login/admin" ||
    pathname === "/register"
  );
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Public routes that don't require auth
  const publicRoutes = [
    "/",
    "/login",
    "/login/tenant",
    "/login/vendor",
    "/login/admin",
    "/register",
    "/forgot-password",
  ];
  const isPublicRoute =
    publicRoutes.some((route) => pathname === route) ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/seed") ||
    pathname.startsWith("/api/stripe/webhook");

  // If no user and trying to access protected route, redirect to correct login
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = getLoginUrlForPath(pathname);
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // If user is logged in and trying to access a login page, redirect to their dashboard
  if (user && isLoginPage(pathname)) {
    const url = request.nextUrl.clone();

    // Determine where to send the user based on portal type
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("portal_type, is_platform_admin")
      .eq("id", user.id)
      .single();

    if (profile?.is_platform_admin) {
      url.pathname = "/super-admin";
    } else if (profile?.portal_type === "tenant") {
      url.pathname = "/tenant";
    } else if (profile?.portal_type === "vendor") {
      url.pathname = "/vendor";
    } else if (profile?.portal_type === "admin") {
      url.pathname = "/admin-panel";
    } else {
      // For company_members, check role
      const { data: membership } = await supabase
        .from("company_members")
        .select("role")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .limit(1)
        .single();

      if (membership?.role === "admin") {
        url.pathname = "/admin-panel";
      } else {
        url.pathname = "/dashboard";
      }
    }

    return NextResponse.redirect(url);
  }

  // Admin routes guard: only owner/admin roles can access /admin/*
  if (user && pathname.startsWith("/admin/") && !pathname.startsWith("/admin-panel")) {
    const { data: membership } = await supabase
      .from("company_members")
      .select("role")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .limit(1)
      .single();

    if (membership && membership.role !== "owner" && membership.role !== "admin") {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  // Portal access guard: ensure user can only access their designated portal
  if (user && !isPublicRoute && !pathname.startsWith("/api/")) {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("portal_type, is_platform_admin")
      .eq("id", user.id)
      .single();

    // Platform admins can go anywhere
    if (profile?.is_platform_admin) {
      return supabaseResponse;
    }

    const portalType = profile?.portal_type;

    // Tenant users can ONLY access /tenant/* — redirect everything else
    if (portalType === "tenant" && !pathname.startsWith("/tenant")) {
      const url = request.nextUrl.clone();
      url.pathname = "/tenant";
      return NextResponse.redirect(url);
    }

    // Vendor users can ONLY access /vendor/* — redirect everything else
    if (portalType === "vendor" && !pathname.startsWith("/vendor")) {
      const url = request.nextUrl.clone();
      url.pathname = "/vendor";
      return NextResponse.redirect(url);
    }

    // Internal staff cannot access tenant/vendor portals
    if (
      !portalType ||
      portalType === "executive" ||
      portalType === "admin"
    ) {
      if (
        pathname.startsWith("/tenant") ||
        pathname.startsWith("/vendor")
      ) {
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard";
        return NextResponse.redirect(url);
      }
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
