import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getVendorInvoiceDetail } from "@/lib/queries/vendor-portal";
import InvoiceDetailClient from "./InvoiceDetailClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  return { title: `Invoice ${id.substring(0, 8)} - Buildwrk` };
}

export default async function InvoiceDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login/vendor");

  const admin = createAdminClient();
  const invoice = await getVendorInvoiceDetail(admin, user.id, id);

  if (!invoice) notFound();

  return <InvoiceDetailClient invoice={invoice} />;
}
