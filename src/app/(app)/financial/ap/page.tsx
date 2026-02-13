import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { Receipt } from "lucide-react";

export const metadata = {
  title: "Accounts Payable - ConstructionERP",
};

export default async function AccountsPayablePage() {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    return (
      <div className="fin-empty">
        <div className="fin-empty-icon"><Receipt size={48} /></div>
        <div className="fin-empty-title">No Company Found</div>
        <div className="fin-empty-desc">Please complete registration to access accounts payable.</div>
      </div>
    );
  }

  return (
    <div>
      <div className="fin-header">
        <div>
          <h2>Accounts Payable</h2>
          <p className="fin-header-sub">Manage vendor bills, subcontractor payments, and retainage</p>
        </div>
      </div>
      <div className="fin-empty">
        <div className="fin-empty-icon"><Receipt size={48} /></div>
        <div className="fin-empty-title">Accounts Payable Coming Soon</div>
        <div className="fin-empty-desc">
          Vendor bill management, payment scheduling, retainage tracking,
          and 1099 reporting are under development.
        </div>
      </div>
    </div>
  );
}
