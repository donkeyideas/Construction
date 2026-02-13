import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Users,
  Plus,
  Mail,
  Phone,
  Building2,
  Search,
  AlertCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import {
  getContactsWithCertAlerts,
  type Contact,
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

const TYPE_BADGE_CLASS: Record<ContactType, string> = {
  employee: "contact-type-employee",
  subcontractor: "contact-type-subcontractor",
  vendor: "contact-type-vendor",
  client: "contact-type-client",
  tenant: "contact-type-tenant",
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
          <PeopleClient />
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

      {/* Contact Grid */}
      {isEmpty ? (
        <div className="people-empty">
          <div className="people-empty-icon">
            <Users size={48} />
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
      ) : (
        <div className="people-grid">
          {contacts.map((contact) => (
            <ContactCard key={contact.id} contact={contact} />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ContactCard({ contact }: { contact: Contact }) {
  const initials =
    (contact.first_name?.[0] || "") + (contact.last_name?.[0] || "");
  const fullName = `${contact.first_name} ${contact.last_name}`.trim();
  const hasCertWarning =
    (contact.expiring_certs_count ?? 0) > 0;

  return (
    <div className="contact-card">
      <div className="contact-card-top">
        <div className="contact-card-avatar">
          {initials.toUpperCase() || "?"}
        </div>
        <div className="contact-card-info">
          <div className="contact-card-name">
            {fullName || "Unnamed Contact"}
            {hasCertWarning && <span className="cert-warning" />}
          </div>
          {contact.job_title && (
            <div className="contact-card-title">{contact.job_title}</div>
          )}
          {contact.company_name && (
            <div className="contact-card-company">{contact.company_name}</div>
          )}
        </div>
        <div className="contact-card-type">
          <span
            className={`badge ${TYPE_BADGE_CLASS[contact.contact_type] || ""}`}
          >
            {TYPE_LABELS[contact.contact_type] || contact.contact_type}
          </span>
        </div>
      </div>

      <div className="contact-card-details">
        {contact.email && (
          <div className="contact-card-detail">
            <Mail size={14} />
            <a href={`mailto:${contact.email}`}>{contact.email}</a>
          </div>
        )}
        {contact.phone && (
          <div className="contact-card-detail">
            <Phone size={14} />
            <a href={`tel:${contact.phone}`}>{contact.phone}</a>
          </div>
        )}
        {(contact.city || contact.state) && (
          <div className="contact-card-detail">
            <Building2 size={14} />
            <span>
              {[contact.city, contact.state].filter(Boolean).join(", ")}
            </span>
          </div>
        )}
      </div>

      {hasCertWarning && (
        <div className="cert-warning-text">
          <AlertCircle size={12} />
          {contact.expiring_certs_count} certification
          {(contact.expiring_certs_count ?? 0) !== 1 ? "s" : ""} expiring soon
        </div>
      )}
    </div>
  );
}
