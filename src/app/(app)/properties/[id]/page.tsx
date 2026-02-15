import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import {
  getPropertyById,
  getPropertyFinancials,
} from "@/lib/queries/properties";
import PropertyDetailClient from "./PropertyDetailClient";

export const metadata = {
  title: "Property Detail - Buildwrk",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PropertyDetailPage({ params }: PageProps) {
  const { id } = await params;

  const supabase = await createClient();
  const ctx = await getCurrentUserCompany(supabase);

  if (!ctx) {
    return (
      <div className="properties-empty">
        <div className="properties-empty-title">Not Authorized</div>
        <div className="properties-empty-desc">
          Please log in and join a company to view property details.
        </div>
      </div>
    );
  }

  const result = await getPropertyById(supabase, id);
  if (!result) {
    notFound();
  }

  const { property, units, leases, maintenanceRequests } = result;

  // Only allow access to properties in the user's company
  if (property.company_id !== ctx.companyId) {
    notFound();
  }

  const financials = await getPropertyFinancials(supabase, id);

  return (
    <PropertyDetailClient
      property={property}
      units={units}
      leases={leases}
      maintenanceRequests={maintenanceRequests}
      financials={financials}
    />
  );
}
