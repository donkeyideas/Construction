"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { AlertTriangle, CreditCard } from "lucide-react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";

export function GracePeriodBanner() {
  const router = useRouter();
  const t = useTranslations("common");
  const pathname = usePathname();
  const isPortal =
    pathname.startsWith("/employee") ||
    pathname.startsWith("/vendor") ||
    pathname.startsWith("/tenant") ||
    pathname.startsWith("/super-admin");

  const [state, setState] = useState<{
    type: "grace_period" | "suspended" | null;
    daysLeft: number;
  }>({ type: null, daysLeft: 0 });

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return;
      supabase
        .from("company_members")
        .select("company_id")
        .eq("user_id", data.user.id)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle()
        .then(({ data: member }) => {
          if (!member) return;
          supabase
            .from("companies")
            .select("subscription_status, grace_period_ends_at")
            .eq("id", member.company_id)
            .single()
            .then(({ data: company }) => {
              if (!company) return;
              if (
                company.subscription_status === "grace_period" &&
                company.grace_period_ends_at
              ) {
                const graceEnd = new Date(
                  company.grace_period_ends_at
                ).getTime();
                const daysLeft = Math.max(
                  0,
                  Math.ceil(
                    (graceEnd - Date.now()) / (1000 * 60 * 60 * 24)
                  )
                );
                setState({
                  type: daysLeft > 0 ? "grace_period" : "suspended",
                  daysLeft,
                });
              } else if (company.subscription_status === "suspended") {
                setState({ type: "suspended", daysLeft: 0 });
              }
            });
        });
    });
  }, []);

  if (!state.type || isPortal) return null;

  const isGrace = state.type === "grace_period";

  return (
    <div
      style={{
        padding: "10px 20px",
        background: isGrace
          ? "rgba(180, 83, 9, 0.08)"
          : "rgba(220, 38, 38, 0.08)",
        borderBottom: `2px solid ${isGrace ? "var(--color-amber)" : "var(--color-red)"}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "12px",
        fontSize: "0.85rem",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1 }}>
        <AlertTriangle
          size={16}
          style={{
            color: isGrace ? "var(--color-amber)" : "var(--color-red)",
            flexShrink: 0,
          }}
        />
        <div>
          <span
            style={{
              fontWeight: 600,
              color: isGrace ? "var(--color-amber)" : "var(--color-red)",
            }}
          >
            {isGrace
              ? t("gracePeriod.expired", { days: state.daysLeft })
              : t("gracePeriod.suspended")}
          </span>
          {isGrace && (
            <span style={{ color: "var(--muted)", marginLeft: "6px" }}>
              {t("gracePeriod.readOnlyDesc")}
            </span>
          )}
        </div>
      </div>
      <button
        onClick={() => router.push("/admin/settings?tab=subscription")}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "6px 16px",
          borderRadius: "6px",
          border: "none",
          background: "var(--color-blue)",
          color: "#fff",
          fontWeight: 600,
          fontSize: "0.82rem",
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
      >
        <CreditCard size={14} />
        {t("gracePeriod.resubscribeNow")}
      </button>
    </div>
  );
}
