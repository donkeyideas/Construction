import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import {
  getPropertyById,
  getPropertyFinancials,
  getPropertyAnnouncements,
  getPropertyRentPayments,
} from "@/lib/queries/properties";
import {
  buildCompanyAccountMap,
  generateRentPaymentJournalEntry,
} from "@/lib/utils/invoice-accounting";
import PropertyDetailClient from "./PropertyDetailClient";
import { getPropertyTransactionsById } from "@/lib/queries/section-transactions";

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

  let [financials, announcements, rentPayments, rawTransactions] = await Promise.all([
    getPropertyFinancials(supabase, id),
    getPropertyAnnouncements(supabase, id),
    getPropertyRentPayments(supabase, id),
    getPropertyTransactionsById(supabase, ctx.companyId, id).catch((err) => {
      console.error("getPropertyTransactionsById failed:", err);
      return { totalTransactions: 0, totalDebits: 0, totalCredits: 0, netAmount: 0, transactions: [] };
    }),
  ]);
  let transactions = rawTransactions;

  // Fetch accumulated depreciation to date for this property
  let depreciationAccumulated = 0;
  try {
    const { data: depLines } = await supabase
      .from("journal_entry_lines")
      .select("credit, journal_entries!inner(company_id, reference, entry_date)")
      .eq("journal_entries.company_id", ctx.companyId)
      .like("journal_entries.reference", `depreciation:${id}:%`)
      .lte("journal_entries.entry_date", new Date().toISOString().slice(0, 10));
    depreciationAccumulated = (depLines ?? []).reduce((sum, row) => sum + (Number(row.credit) || 0), 0);
  } catch {
    depreciationAccumulated = 0;
  }

  // Auto-backfill: generate missing JEs for rent payments that don't have one
  const paymentsWithoutJE = rentPayments.filter((p) => !p.je_id && p.amount > 0);
  if (paymentsWithoutJE.length > 0) {
    try {
      const accountMap = await buildCompanyAccountMap(supabase, ctx.companyId);
      for (const pmt of paymentsWithoutJE) {
        await generateRentPaymentJournalEntry(supabase, ctx.companyId, ctx.userId, {
          id: pmt.id,
          amount: pmt.amount,
          payment_date: pmt.payment_date ?? new Date().toISOString().slice(0, 10),
          lease_id: pmt.lease_id,
          property_id: id,
          tenant_name: pmt.tenant_name ?? "Tenant",
          gateway_provider: pmt.gateway_provider ?? undefined,
        }, accountMap);
      }
      // Re-fetch payments to include the newly created JE references
      rentPayments = await getPropertyRentPayments(supabase, id);
    } catch (err) {
      console.warn("Auto-backfill rent payment JEs warning:", err);
    }
  }

  return (
    <PropertyDetailClient
      property={property}
      units={units}
      leases={leases}
      maintenanceRequests={maintenanceRequests}
      financials={financials}
      announcements={announcements}
      rentPayments={rentPayments}
      transactions={transactions}
      depreciationAccumulated={depreciationAccumulated}
    />
  );
}
