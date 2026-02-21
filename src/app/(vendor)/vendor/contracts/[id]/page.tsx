import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getVendorContractDetail } from "@/lib/queries/vendor-portal";
import ContractDetailClient from "./ContractDetailClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  return { title: `Contract ${id.substring(0, 8)} - Buildwrk` };
}

export default async function ContractDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login/vendor");

  const admin = createAdminClient();
  const contract = await getVendorContractDetail(admin, user.id, id);

  if (!contract) notFound();

  return <ContractDetailClient contract={contract} />;
}
