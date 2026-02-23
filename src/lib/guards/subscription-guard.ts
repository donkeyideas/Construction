// ---------------------------------------------------------------------------
// API Subscription Guard
//
// Checks company subscription status and blocks mutations during grace period
// or blocks all access (except settings) when fully suspended.
//
// Uses an in-memory cache with 60s TTL (same pattern as middleware platform
// flags cache) to avoid hitting the database on every API request.
// ---------------------------------------------------------------------------

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getSubscriptionState,
  type SubscriptionAccess,
} from "@/lib/subscription";

// Cache: companyId → { access, fetchedAt }
const cache = new Map<
  string,
  { access: SubscriptionAccess; fetchedAt: number }
>();
const CACHE_TTL = 60_000; // 60 seconds

/**
 * Check if the request should be blocked based on subscription status.
 * Returns null if allowed, or a NextResponse if blocked.
 *
 * @param companyId  - The company's UUID
 * @param method     - HTTP method (GET, POST, PATCH, DELETE)
 * @param isExempt   - True for settings/stripe/auth routes that always work
 */
export async function checkSubscriptionAccess(
  companyId: string,
  method: string,
  isExempt: boolean = false
): Promise<NextResponse | null> {
  const access = await getCompanyAccess(companyId);

  // Full access — always allowed
  if (access === "full") return null;

  // Exempt routes always allowed (settings, stripe, auth, exports)
  if (isExempt) return null;

  // Read-only (grace period): block mutations, allow reads
  if (access === "read_only") {
    if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
      return null;
    }

    return NextResponse.json(
      {
        error:
          "Your subscription has expired. Your account is in a 30-day read-only grace period. Please resubscribe to make changes.",
        code: "SUBSCRIPTION_GRACE_PERIOD",
      },
      { status: 403 }
    );
  }

  // Suspended: block everything
  if (access === "suspended") {
    return NextResponse.json(
      {
        error:
          "Your subscription grace period has ended. Please resubscribe to restore access.",
        code: "SUBSCRIPTION_SUSPENDED",
      },
      { status: 403 }
    );
  }

  return null;
}

async function getCompanyAccess(
  companyId: string
): Promise<SubscriptionAccess> {
  const now = Date.now();
  const cached = cache.get(companyId);
  if (cached && now - cached.fetchedAt < CACHE_TTL) {
    return cached.access;
  }

  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("companies")
      .select("subscription_status, grace_period_ends_at")
      .eq("id", companyId)
      .single();

    const state = getSubscriptionState(
      data || { subscription_status: "active", grace_period_ends_at: null }
    );
    cache.set(companyId, { access: state.access, fetchedAt: now });
    return state.access;
  } catch {
    // On error, default to full access (fail-open)
    return "full";
  }
}
