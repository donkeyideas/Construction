import { redirect } from "next/navigation";
import Link from "next/link";
import { Monitor, Settings, LogOut, ChevronRight, BarChart3 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getUserDisplayName } from "@/lib/queries/user";

export const metadata = {
  title: "Profile - ConstructionERP",
};

export default async function ProfilePage() {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    redirect("/login");
  }

  const { userId, companyId, role, companyName } = userCompany;
  const fullName = await getUserDisplayName(supabase, userId);

  const today = new Date().toISOString().slice(0, 10);

  // Calculate start of current week (Monday)
  const now = new Date();
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  const weekStart = monday.toISOString().slice(0, 10);

  // Fetch data in parallel
  const [todayEntriesRes, weekEntriesRes, projectsRes] = await Promise.all([
    // Today's hours
    supabase
      .from("time_entries")
      .select("hours")
      .eq("company_id", companyId)
      .eq("user_id", userId)
      .eq("entry_date", today),

    // Week's hours
    supabase
      .from("time_entries")
      .select("hours")
      .eq("company_id", companyId)
      .eq("user_id", userId)
      .gte("entry_date", weekStart)
      .lte("entry_date", today),

    // Current project assignments (where user is PM or superintendent)
    supabase
      .from("projects")
      .select("id, name")
      .eq("company_id", companyId)
      .in("status", ["active", "pre_construction"])
      .or(`project_manager_id.eq.${userId},superintendent_id.eq.${userId}`)
      .limit(3),
  ]);

  const todayHours = (todayEntriesRes.data ?? []).reduce(
    (sum: number, e: { hours: number | null }) => sum + (e.hours ?? 0),
    0
  );

  const weekHours = (weekEntriesRes.data ?? []).reduce(
    (sum: number, e: { hours: number | null }) => sum + (e.hours ?? 0),
    0
  );

  const assignedProjects = (projectsRes.data ?? []) as Array<{
    id: string;
    name: string;
  }>;

  // Get user initials for avatar
  const initials = fullName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div>
      {/* Profile Header */}
      <div className="mobile-profile-header">
        <div className="mobile-avatar">{initials}</div>
        <div className="mobile-profile-name">{fullName}</div>
        <div className="mobile-profile-role">
          {role.charAt(0).toUpperCase() + role.slice(1)} at {companyName}
        </div>
      </div>

      {/* Stats */}
      <div className="mobile-profile-stats">
        <div className="mobile-kpi">
          <div className="mobile-kpi-label">Today</div>
          <div className="mobile-kpi-value">{todayHours.toFixed(1)}h</div>
        </div>
        <div className="mobile-kpi">
          <div className="mobile-kpi-label">This Week</div>
          <div className="mobile-kpi-value">{weekHours.toFixed(1)}h</div>
        </div>
      </div>

      {/* Current Assignments */}
      {assignedProjects.length > 0 && (
        <>
          <div className="mobile-section-title">Your Projects</div>
          <div className="mobile-card">
            {assignedProjects.map((project) => (
              <div
                key={project.id}
                style={{
                  padding: "8px 0",
                  borderBottom: "1px solid var(--border)",
                  fontSize: "0.85rem",
                  fontWeight: 500,
                }}
              >
                {project.name}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Menu */}
      <div className="mobile-section-title">Options</div>
      <div className="mobile-menu">
        <Link href="/dashboard" className="mobile-menu-item">
          <Monitor size={18} />
          <span style={{ flex: 1 }}>Switch to Desktop View</span>
          <ChevronRight size={16} style={{ color: "var(--muted)" }} />
        </Link>
        {(role === "admin" || role === "owner") && (
          <Link href="/mobile/executive" className="mobile-menu-item">
            <BarChart3 size={18} />
            <span style={{ flex: 1 }}>Executive Dashboard</span>
            <ChevronRight size={16} style={{ color: "var(--muted)" }} />
          </Link>
        )}
        <Link href="/admin" className="mobile-menu-item">
          <Settings size={18} />
          <span style={{ flex: 1 }}>Settings</span>
          <ChevronRight size={16} style={{ color: "var(--muted)" }} />
        </Link>
        <SignOutButton />
      </div>

      {/* Version */}
      <div className="mobile-version">ConstructionERP v1.0.0</div>
    </div>
  );
}

function SignOutButton() {
  return (
    <form action="/api/auth/signout" method="POST">
      <button
        type="submit"
        className="mobile-menu-item mobile-menu-item-danger"
        style={{
          width: "100%",
          border: "none",
          cursor: "pointer",
          fontFamily: "var(--font-sans)",
        }}
      >
        <LogOut size={18} />
        <span style={{ flex: 1, textAlign: "left" }}>Sign Out</span>
      </button>
    </form>
  );
}
