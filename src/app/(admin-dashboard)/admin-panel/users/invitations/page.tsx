import { Mail } from "lucide-react";

export const metadata = { title: "Invitations - ConstructionERP" };

export default function InvitationsPage() {
  return (
    <div>
      <div className="fin-header">
        <div>
          <h2>Invitations</h2>
          <p className="fin-header-sub">Manage pending team member invitations.</p>
        </div>
      </div>
      <div className="fin-chart-card">
        <div className="fin-empty">
          <div className="fin-empty-icon"><Mail size={48} /></div>
          <div className="fin-empty-title">No Pending Invitations</div>
          <div className="fin-empty-desc">No pending invitations.</div>
        </div>
      </div>
    </div>
  );
}
