import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

/** Map a protected path to the correct login URL */
function getLoginUrlForPath(pathname: string): string {
  if (pathname.startsWith("/tenant")) return "/login/tenant";
  if (pathname.startsWith("/vendor")) return "/login/vendor";
  if (pathname.startsWith("/employee")) return "/login/employee";
  if (pathname.startsWith("/admin-panel")) return "/login/admin";
  return "/login";
}

/** Check if path is a login page */
function isLoginPage(pathname: string): boolean {
  return (
    pathname === "/login" ||
    pathname === "/login/tenant" ||
    pathname === "/login/vendor" ||
    pathname === "/login/employee" ||
    pathname === "/login/admin" ||
    pathname === "/register"
  );
}

/* ─── Platform settings cache (60s TTL) ─── */
let cachedFlags: { maintenance_mode: boolean; registration_enabled: boolean } | null = null;
let cacheTs = 0;
const CACHE_TTL = 60_000;

async function getPlatformFlags(): Promise<{ maintenance_mode: boolean; registration_enabled: boolean }> {
  const now = Date.now();
  if (cachedFlags && now - cacheTs < CACHE_TTL) return cachedFlags;

  try {
    const admin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data } = await admin
      .from("platform_settings")
      .select("key, value")
      .in("key", ["maintenance_mode", "company_registration_enabled"]);

    const map: Record<string, string> = {};
    for (const row of data || []) map[row.key] = row.value;

    cachedFlags = {
      maintenance_mode: map.maintenance_mode === "true",
      registration_enabled: map.company_registration_enabled !== "false",
    };
    cacheTs = now;
    return cachedFlags;
  } catch {
    return { maintenance_mode: false, registration_enabled: true };
  }
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
    "/login/employee",
    "/login/admin",
    "/register",
    "/forgot-password",
    "/maintenance",
  ];
  const isPublicRoute =
    publicRoutes.some((route) => pathname === route) ||
    pathname.startsWith("/p/") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/seed") ||
    pathname.startsWith("/api/locale") ||
    pathname.startsWith("/api/stripe/webhook") ||
    pathname.startsWith("/api/payments/webhook");

  // ─── Platform flags: maintenance mode + registration gate ───
  const flags = await getPlatformFlags();

  if (flags.maintenance_mode) {
    // Allow: maintenance page itself, login pages, super-admin, and API routes
    const maintenanceAllowed =
      pathname === "/maintenance" ||
      pathname.startsWith("/login") ||
      pathname.startsWith("/super-admin") ||
      pathname.startsWith("/api/");

    if (!maintenanceAllowed) {
      // If user is logged in, check if they're a platform admin
      if (user) {
        const { data: adminCheck } = await supabase
          .from("user_profiles")
          .select("is_platform_admin")
          .eq("id", user.id)
          .single();

        if (!adminCheck?.is_platform_admin) {
          const url = request.nextUrl.clone();
          url.pathname = "/maintenance";
          return NextResponse.redirect(url);
        }
      } else {
        // Not logged in → maintenance page
        const url = request.nextUrl.clone();
        url.pathname = "/maintenance";
        return NextResponse.redirect(url);
      }
    }
  }

  // Registration gate: block /register when disabled
  if (!flags.registration_enabled && pathname === "/register") {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("registration", "closed");
    return NextResponse.redirect(url);
  }

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
    } else if (profile?.portal_type === "employee") {
      url.pathname = "/employee";
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

    // Employee users can ONLY access /employee/* — redirect everything else
    if (portalType === "employee" && !pathname.startsWith("/employee")) {
      const url = request.nextUrl.clone();
      url.pathname = "/employee";
      return NextResponse.redirect(url);
    }

    // Internal staff cannot access tenant/vendor/employee portals
    if (
      !portalType ||
      portalType === "executive" ||
      portalType === "admin"
    ) {
      if (
        pathname.startsWith("/tenant") ||
        pathname.startsWith("/vendor") ||
        pathname.startsWith("/employee")
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
    "/((?!_next/static|_next/image|favicon.ico|manifest\\.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
