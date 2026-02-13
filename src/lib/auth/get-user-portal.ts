import type { SupabaseClient } from "@supabase/supabase-js";

export type PortalType =
  | "executive"
  | "admin"
  | "tenant"
  | "vendor"
  | "platform_admin";

export interface UserPortalInfo {
  portalType: PortalType;
  companyId?: string;
  role?: string;
}

/**
 * Determines which portal/dashboard a user belongs to.
 * Checks user_profiles.portal_type first for fast resolution,
 * then falls back to checking company_members, leases, contacts.
 */
export async function getUserPortalType(
  supabase: SupabaseClient,
  userId: string
): Promise<UserPortalInfo> {
  // 1. Check user_profiles for explicit portal_type (fast path)
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("portal_type, is_platform_admin")
    .eq("id", userId)
    .single();

  if (profile?.is_platform_admin) {
    return { portalType: "platform_admin" };
  }

  if (profile?.portal_type) {
    return { portalType: profile.portal_type as PortalType };
  }

  // 2. Check company_members for internal staff
  const { data: membership } = await supabase
    .from("company_members")
    .select("company_id, role")
    .eq("user_id", userId)
    .eq("is_active", true)
    .limit(1)
    .single();

  if (membership) {
    if (membership.role === "admin") {
      return {
        portalType: "admin",
        companyId: membership.company_id,
        role: membership.role,
      };
    }
    return {
      portalType: "executive",
      companyId: membership.company_id,
      role: membership.role,
    };
  }

  // 3. Check if tenant (linked via leases.tenant_user_id)
  const { data: lease } = await supabase
    .from("leases")
    .select("id")
    .eq("tenant_user_id", userId)
    .eq("status", "active")
    .limit(1)
    .single();

  if (lease) {
    return { portalType: "tenant" };
  }

  // 4. Check if vendor (linked via contacts.user_id)
  const { data: contact } = await supabase
    .from("contacts")
    .select("id")
    .eq("user_id", userId)
    .in("contact_type", ["vendor", "subcontractor"])
    .limit(1)
    .single();

  if (contact) {
    return { portalType: "vendor" };
  }

  // 5. Default fallback
  return { portalType: "executive" };
}

/** Map portal type to its dashboard home URL */
export function getPortalHomeUrl(portalType: PortalType): string {
  switch (portalType) {
    case "platform_admin":
      return "/super-admin";
    case "admin":
      return "/admin-panel";
    case "tenant":
      return "/tenant";
    case "vendor":
      return "/vendor";
    case "executive":
    default:
      return "/dashboard";
  }
}

/** Map a protected path to the correct login URL */
export function getLoginUrlForPath(pathname: string): string {
  if (pathname.startsWith("/tenant")) return "/login/tenant";
  if (pathname.startsWith("/vendor")) return "/login/vendor";
  if (pathname.startsWith("/admin-panel")) return "/login/admin";
  if (pathname.startsWith("/super-admin")) return "/login";
  return "/login";
}

/** Check if a portal type can access a given path */
export function canAccessPath(
  portalType: PortalType,
  pathname: string
): boolean {
  // Platform admins can access everything
  if (portalType === "platform_admin") return true;

  // Owner/executive can access executive + admin dashboards
  if (portalType === "executive") {
    if (pathname.startsWith("/tenant") || pathname.startsWith("/vendor")) {
      return false;
    }
    return true;
  }

  // Admin can access admin + executive dashboards
  if (portalType === "admin") {
    if (pathname.startsWith("/tenant") || pathname.startsWith("/vendor")) {
      return false;
    }
    return true;
  }

  // Tenant can only access /tenant/*
  if (portalType === "tenant") {
    return pathname.startsWith("/tenant");
  }

  // Vendor can only access /vendor/*
  if (portalType === "vendor") {
    return pathname.startsWith("/vendor");
  }

  return false;
}
