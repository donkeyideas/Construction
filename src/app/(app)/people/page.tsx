import { redirect } from "next/navigation";
import Link from "next/link";
import { Search } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import {
  getContactsWithCertAlerts,
  type ContactType,
} from "@/lib/queries/people";
import PeopleClient from "./PeopleClient";

export const metadata = {
  title: "People Directory - ConstructionERP",
};

const TYPE_LABELS: Record<ContactType, string> = {
  employee: "Employee",
  subcontractor: "Subcontractor",
  vendor: "Vendor",
  client: "Client",
  tenant: "Tenant",
};

export default async function PeopleDirectoryPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; search?: string }>;
}) {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    redirect("/register");
  }

  const params = await searchParams;
  const { companyId } = userCompany;

  const typeFilter = params.type as ContactType | undefined;
  const searchFilter = params.search;

  const contacts = await getContactsWithCertAlerts(supabase, companyId, {
    type: typeFilter,
    search: searchFilter,
  });

  return (
    <PeopleClient
      contacts={contacts}
      typeFilter={typeFilter}
      searchFilter={searchFilter}
      typeLabels={TYPE_LABELS}
    />
  );
}
