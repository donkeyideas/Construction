import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { HandCoins } from "lucide-react";

export const metadata = {
  title: "Accounts Receivable - ConstructionERP",
};

export default async function AccountsReceivablePage() {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    return (
      <div className="fin-empty">
        <div className="fin-empty-icon"><HandCoins size={48} /></div>
        <div className="fin-empty-title">No Company Found</div>
        <div className="fin-empty-desc">Please complete registration to access accounts receivable.</div>
      </div>
    );
  }

  return (
    <div>
      <div className="fin-header">
        <div>
          <h2>Accounts Receivable</h2>
          <p className="fin-header-sub">Track client invoices, payments, and retainage receivable</p>
        </div>
      </div>
      <div className="fin-empty">
        <div className="fin-empty-icon"><HandCoins size={48} /></div>
        <div className="fin-empty-title">Accounts Receivable Coming Soon</div>
        <div className="fin-empty-desc">
          Client invoice management, AIA billing, payment tracking,
          retainage receivable, and aging reports are under development.
        </div>
      </div>
    </div>
  );
}
