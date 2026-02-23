// ---------------------------------------------------------------------------
// Subscription State Utility
//
// Pure function to compute subscription access level from company DB fields.
// No database queries — just date math.
// ---------------------------------------------------------------------------

export type SubscriptionAccess = "full" | "read_only" | "suspended";

export interface SubscriptionState {
  access: SubscriptionAccess;
  status: string;
  graceDaysLeft: number | null;
  graceEndsAt: string | null;
}

/**
 * Compute subscription access level from company database fields.
 *
 * - active / trialing / canceling / past_due → full access
 * - grace_period + grace_period_ends_at > now → read-only (with days remaining)
 * - grace_period + expired, or suspended/canceled → suspended
 */
export function getSubscriptionState(company: {
  subscription_status: string | null;
  grace_period_ends_at: string | null;
}): SubscriptionState {
  const status = company.subscription_status || "active";

  // Active statuses — full access
  if (["active", "trialing", "canceling", "past_due"].includes(status)) {
    return { access: "full", status, graceDaysLeft: null, graceEndsAt: null };
  }

  // Grace period
  if (status === "grace_period" && company.grace_period_ends_at) {
    const endsAt = new Date(company.grace_period_ends_at);
    const now = new Date();
    const daysLeft = Math.ceil(
      (endsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysLeft > 0) {
      return {
        access: "read_only",
        status,
        graceDaysLeft: daysLeft,
        graceEndsAt: company.grace_period_ends_at,
      };
    }

    // Grace period has expired — suspended
    return {
      access: "suspended",
      status: "suspended",
      graceDaysLeft: 0,
      graceEndsAt: company.grace_period_ends_at,
    };
  }

  // Canceled or suspended without grace period
  if (status === "canceled" || status === "suspended") {
    return {
      access: "suspended",
      status,
      graceDaysLeft: null,
      graceEndsAt: null,
    };
  }

  // Default: full access (unknown status treated permissively)
  return { access: "full", status, graceDaysLeft: null, graceEndsAt: null };
}
