"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, ChevronDown, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface CompanyOption {
  id: string;
  name: string;
  role: string;
  logo_url: string | null;
}

export default function CompanySwitcher() {
  const router = useRouter();
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: memberships } = await supabase
        .from("company_members")
        .select("company_id, role, companies(name, logo_url)")
        .eq("user_id", user.id)
        .eq("is_active", true);

      if (!memberships || memberships.length <= 1) return;

      const options: CompanyOption[] = memberships.map((m) => {
        const company = m.companies as unknown as { name: string; logo_url: string | null } | null;
        return {
          id: m.company_id,
          name: company?.name || "Unknown",
          role: m.role,
          logo_url: company?.logo_url || null,
        };
      });

      setCompanies(options);

      // Read active company from cookie
      const match = document.cookie.match(/active_company=([^;]+)/);
      if (match) {
        setActiveId(match[1]);
      } else if (options.length > 0) {
        setActiveId(options[0].id);
      }
    }
    load();
  }, []);

  async function switchCompany(companyId: string) {
    // Set cookie (expires in 1 year)
    document.cookie = `active_company=${companyId};path=/;max-age=${365 * 24 * 60 * 60};samesite=lax`;
    setActiveId(companyId);
    setOpen(false);
    router.refresh();
  }

  // Don't render if user only belongs to one company
  if (companies.length <= 1) return null;

  const active = companies.find((c) => c.id === activeId);

  return (
    <div style={{ position: "relative", margin: "0 12px 8px" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%",
          padding: "8px 10px",
          borderRadius: "8px",
          border: "1px solid var(--border)",
          background: "var(--surface)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          color: "var(--foreground)",
          fontSize: "0.78rem",
        }}
      >
        {active?.logo_url ? (
          <img src={active.logo_url} alt="" style={{ width: "20px", height: "20px", borderRadius: "4px", objectFit: "contain" }} />
        ) : (
          <Building2 size={16} style={{ color: "var(--muted)" }} />
        )}
        <span style={{ flex: 1, textAlign: "left", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {active?.name || "Select Company"}
        </span>
        <ChevronDown size={14} style={{ color: "var(--muted)", flexShrink: 0 }} />
      </button>

      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 99 }} />
          <div style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
            zIndex: 100,
            overflow: "hidden",
          }}>
            <div style={{ padding: "6px 10px", fontSize: "0.68rem", fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Switch Company
            </div>
            {companies.map((c) => (
              <button
                key={c.id}
                onClick={() => switchCompany(c.id)}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  border: "none",
                  borderTop: "1px solid var(--border)",
                  background: c.id === activeId ? "rgba(59, 130, 246, 0.05)" : "transparent",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  color: "var(--foreground)",
                  fontSize: "0.8rem",
                  textAlign: "left",
                }}
              >
                {c.logo_url ? (
                  <img src={c.logo_url} alt="" style={{ width: "18px", height: "18px", borderRadius: "3px", objectFit: "contain" }} />
                ) : (
                  <Building2 size={14} style={{ color: "var(--muted)" }} />
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500 }}>{c.name}</div>
                  <div style={{ fontSize: "0.65rem", color: "var(--muted)", textTransform: "capitalize" }}>{c.role.replace("_", " ")}</div>
                </div>
                {c.id === activeId && <Check size={14} style={{ color: "var(--color-blue)" }} />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
