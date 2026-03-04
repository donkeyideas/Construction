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
 * - active / canceling / past_due → full access
 * - trialing + trial_ends_at > now → full access
 * - trialing + trial_ends_at expired → suspended (must subscribe)
 * - grace_period + grace_period_ends_at > now → read-only (with days remaining)
 * - grace_period + expired, or suspended/canceled → suspended
 */
export function getSubscriptionState(company: {
  subscription_status: string | null;
  grace_period_ends_at: string | null;
  trial_ends_at?: string | null;
}): SubscriptionState {
  const status = company.subscription_status || "active";

  // Trialing — check if trial has expired
  if (status === "trialing") {
    if (company.trial_ends_at) {
      const trialEnd = new Date(company.trial_ends_at);
      const now = new Date();
      if (trialEnd.getTime() < now.getTime()) {
        // Trial expired — suspended, must subscribe
        return {
          access: "suspended",
          status: "trial_expired",
          graceDaysLeft: null,
          graceEndsAt: null,
        };
      }
    }
    // Trial still active
    return { access: "full", status, graceDaysLeft: null, graceEndsAt: null };
  }

  // Active statuses — full access
  if (["active", "canceling", "past_due"].includes(status)) {
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
