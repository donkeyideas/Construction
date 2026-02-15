import { Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getTeamMembers } from "@/lib/queries/admin-dashboard";

export const metadata = { title: "Team Members - Buildwrk" };

export default async function TeamMembersPage() {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    return (
      <div className="fin-empty">
        <div className="fin-empty-icon"><Users size={48} /></div>
        <div className="fin-empty-title">No Company Found</div>
        <div className="fin-empty-desc">Complete your company registration first.</div>
      </div>
    );
  }

  const members = await getTeamMembers(supabase, userCompany.companyId);

  return (
    <div>
      <div className="fin-header">
        <div>
          <h2>Team Members</h2>
          <p className="fin-header-sub">Manage your company team members and their roles.</p>
        </div>
      </div>

      {members.length > 0 ? (
        <div className="members-table-wrap">
          <table className="members-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member: Record<string, unknown>) => {
                const profile = member.user_profiles as { full_name: string | null; email: string | null; avatar_url: string | null } | null;
                return (
                  <tr key={member.id as string}>
                    <td>
                      <div className="member-info">
                        <div className="member-avatar">
                          {(profile?.full_name ?? "U").charAt(0).toUpperCase()}
                        </div>
                        <span className="member-name">{profile?.full_name ?? "Unknown"}</span>
                      </div>
                    </td>
                    <td className="member-email">{profile?.email ?? "--"}</td>
                    <td>
                      <span className={`role-badge role-badge-${member.role}`}>
                        {(member.role as string).replace(/_/g, " ")}
                      </span>
                    </td>
                    <td>
                      <span className="member-status">
                        <span className={`member-status-dot ${member.is_active ? "active" : "inactive"}`} />
                        {member.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td style={{ fontSize: "0.82rem", color: "var(--muted)" }}>
                      {member.joined_at
                        ? new Date(member.joined_at as string).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "--"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="fin-chart-card">
          <div className="fin-empty">
            <div className="fin-empty-icon"><Users size={48} /></div>
            <div className="fin-empty-title">No Team Members</div>
            <div className="fin-empty-desc">Invite team members to start collaborating.</div>
          </div>
        </div>
      )}
    </div>
  );
}
