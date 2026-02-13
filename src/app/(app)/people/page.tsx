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

  const isEmpty = contacts.length === 0;

  return (
    <div>
      {/* Header */}
      <div className="people-header">
        <div>
          <h2>People Directory</h2>
          <p className="people-header-sub">
            Manage employees, subcontractors, vendors, and contacts.
          </p>
        </div>
        <div className="people-header-actions">
          <Link
            href="/people/time"
            className="ui-btn ui-btn-md ui-btn-secondary"
          >
            Time & Attendance
          </Link>
          <PeopleClient contacts={contacts} />
        </div>
      </div>

      {/* Search Bar */}
      <div className="people-search-bar">
        <div className="people-search-wrap">
          <div className="people-search-icon">
            <Search size={16} />
          </div>
          <form method="GET">
            {typeFilter && (
              <input type="hidden" name="type" value={typeFilter} />
            )}
            <input
              type="text"
              name="search"
              className="people-search-input"
              placeholder="Search by name, email, or company..."
              defaultValue={searchFilter || ""}
            />
          </form>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="people-tab-bar">
        <Link
          href="/people"
          className={`people-tab ${!typeFilter ? "active" : ""}`}
        >
          All
        </Link>
        <Link
          href="/people?type=employee"
          className={`people-tab ${typeFilter === "employee" ? "active" : ""}`}
        >
          Employees
        </Link>
        <Link
          href="/people?type=subcontractor"
          className={`people-tab ${typeFilter === "subcontractor" ? "active" : ""}`}
        >
          Subcontractors
        </Link>
        <Link
          href="/people?type=vendor"
          className={`people-tab ${typeFilter === "vendor" ? "active" : ""}`}
        >
          Vendors
        </Link>
        <Link
          href="/people?type=client"
          className={`people-tab ${typeFilter === "client" ? "active" : ""}`}
        >
          Clients
        </Link>
      </div>

      {/* Empty State or Contact Grid (rendered by PeopleClient) */}
      {isEmpty && (
        <div className="people-empty">
          <div className="people-empty-icon">
            <Search size={48} />
          </div>
          <div className="people-empty-title">No contacts found</div>
          <p className="people-empty-desc">
            {searchFilter
              ? `No results for "${searchFilter}". Try a different search term.`
              : typeFilter
                ? `No ${TYPE_LABELS[typeFilter].toLowerCase()}s in your directory yet.`
                : "Start building your directory by adding team members, subcontractors, and vendors."}
          </p>
        </div>
      )}
    </div>
  );
}
