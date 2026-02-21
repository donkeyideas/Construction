import { redirect } from "next/navigation";
import { DollarSign } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getVendorPaymentDashboard } from "@/lib/queries/vendor-portal";
import { getTranslations } from "next-intl/server";
import PaymentHistoryClient from "./PaymentHistoryClient";

export const metadata = { title: "Payment History - Buildwrk" };

export default async function PaymentHistoryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { redirect("/login/vendor"); }

  const t = await getTranslations("vendor");
  const admin = createAdminClient();
  const dashboard = await getVendorPaymentDashboard(admin, user.id);

  return (
    <PaymentHistoryClient
      payments={dashboard.payments}
      pendingInvoices={dashboard.pendingInvoices}
      stats={dashboard.stats}
    />
  );
}
