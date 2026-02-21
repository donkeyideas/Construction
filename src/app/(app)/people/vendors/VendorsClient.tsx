"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import {
  Upload,
  Mail,
  Phone,
  Building2,
  X,
  Edit3,
  Trash2,
  Truck,
  Plus,
  Shield,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  XCircle,
  FileText,
  CreditCard,
  DollarSign,
  Settings,
  KeyRound,
  Check,
  Loader2,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils/format";
import { GATEWAY_PROVIDERS } from "@/lib/payments/gateway";
import ImportModal from "@/components/ImportModal";
import PrequalificationChecklist from "@/components/PrequalificationChecklist";
import type { ImportColumn } from "@/lib/utils/csv-parser";
import "@/styles/financial.css";

const IMPORT_SAMPLE: Record<string, string>[] = [
  { company_name: "ABC Supply Co", first_name: "Mike", last_name: "Johnson", email: "mike@abcsupply.com", phone: "555-0200", job_title: "Sales Manager" },
  { company_name: "ProBuild Materials", first_name: "Sarah", last_name: "Williams", email: "sarah@probuild.com", phone: "555-0300", job_title: "Account Rep" },
  { company_name: "TrueValue Equipment Rental", first_name: "David", last_name: "Chen", email: "dchen@truevalue.com", phone: "555-0400", job_title: "Branch Manager" },
];

interface Contact {
  id: string;
  contact_type: string;
  first_name: string;
  last_name: string;
  company_name: string;
  email: string;
  phone: string;
  job_title: string;
  city?: string | null;
  state?: string | null;
  notes?: string | null;
  emr_rate?: number | null;
  bonding_capacity?: number | null;
  prequalification_score?: number | null;
  prequalification_notes?: string | null;
}

interface VendorContract {
  id: string;
  vendor_id: string;
  project_id: string | null;
  contract_number: string;
  title: string;
  contract_type: string;
  amount: number;
  status: string;
  start_date: string;
  end_date: string;
  scope_of_work: string | null;
  retention_pct: number | null;
  insurance_required: boolean | null;
  insurance_expiry: string | null;
  contacts?: { first_name: string; last_name: string; company_name: string };
}

interface Project {
  id: string;
  name: string;
  code: string | null;
  status: string;
}

interface PayableInvoice {
  id: string;
  invoice_number: string;
  vendor_name: string | null;
  total_amount: number;
  balance_due: number;
  status: string;
  due_date: string;
  invoice_date: string;
  projects: { name: string } | null;
}

const TYPE_BADGE_CLASS: Record<string, string> = {
  vendor: "contact-type-vendor",
  subcontractor: "contact-type-subcontractor",
};

const EMPTY_CONTRACT_FORM = {
  vendor_id: "",
  project_id: "",
  contract_number: "",
  title: "",
  contract_type: "subcontract",
  amount: "",
  status: "active",
  start_date: "",
  end_date: "",
  scope_of_work: "",
  retention_pct: "",
  insurance_required: true,
  insurance_expiry: "",
};

export default function VendorsClient({
  contacts,
  contracts,
  projects,
  payableInvoices = [],
}: {
  contacts: Contact[];
  contracts: VendorContract[];
  projects: Project[];
  payableInvoices?: PayableInvoice[];
}) {
  const router = useRouter();
  const t = useTranslations("people");
  const locale = useLocale();
  const dateLocale = locale === "es" ? "es" : "en-US";

  const IMPORT_COLUMNS: ImportColumn[] = [
    { key: "company_name", label: t("companyName"), required: true },
    { key: "first_name", label: t("contactFirstName"), required: false },
    { key: "last_name", label: t("contactLastName"), required: false },
    { key: "email", label: t("email"), required: false, type: "email" },
    { key: "phone", label: t("phone"), required: false },
    { key: "job_title", label: t("jobTitle"), required: false },
  ];

  const [tab, setTab] = useState<"directory" | "contracts" | "payments">("directory");
  const [showImport, setShowImport] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createFormData, setCreateFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    company_name: "",
    job_title: "",
    contact_type: "vendor",
    notes: "",
  });
  const [selectedVendor, setSelectedVendor] = useState<Contact | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editError, setEditError] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [editFormData, setEditFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    company_name: "",
    job_title: "",
    contact_type: "vendor",
    notes: "",
  });

  // Contract CRUD state
  const [showContractModal, setShowContractModal] = useState(false);
  const [contractEditing, setContractEditing] = useState<VendorContract | null>(null);
  const [contractSaving, setContractSaving] = useState(false);
  const [contractError, setContractError] = useState("");
  const [contractForm, setContractForm] = useState(EMPTY_CONTRACT_FORM);
  const [showContractDelete, setShowContractDelete] = useState(false);
  const [contractDeleting, setContractDeleting] = useState(false);

  // Payment gateway state
  const [gatewayStatus, setGatewayStatus] = useState<{
    hasGateway: boolean;
    provider: string | null;
    isActive: boolean;
    onboardedAt: string | null;
    accountName: string | null;
    accountStatus: { connected: boolean; accountName: string | null } | null;
  } | null>(null);
  const [gatewayLoading, setGatewayLoading] = useState(true);
  const [gatewaySaving, setGatewaySaving] = useState(false);
  const [gatewayError, setGatewayError] = useState("");
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [gatewayFields, setGatewayFields] = useState<Record<string, string>>({});
  const [checkingOut, setCheckingOut] = useState<string | null>(null);
  const [verifyMessage, setVerifyMessage] = useState<{ type: "success" | "info"; text: string } | null>(null);

  useEffect(() => {
    async function fetchGatewayStatus() {
      try {
        const res = await fetch("/api/payments/gateway/status", { method: "POST" });
        if (res.ok) setGatewayStatus(await res.json());
      } catch { /* ignore */ }
      setGatewayLoading(false);
    }
    fetchGatewayStatus();
  }, []);

  // Auto-verify payment on return from checkout
  useEffect(() => {
    const url = new URL(window.location.href);
    const paymentStatus = url.searchParams.get("payment");
    const invoiceId = url.searchParams.get("invoice");

    if (paymentStatus === "success" && invoiceId) {
      url.searchParams.delete("payment");
      url.searchParams.delete("invoice");
      window.history.replaceState({}, "", url.pathname + url.search);
      setTab("payments");

      (async () => {
        try {
          const res = await fetch("/api/financial/vendor-payments/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ invoice_id: invoiceId }),
          });
          const data = await res.json();
          if (data.recorded) {
            setVerifyMessage({ type: "success", text: "Payment recorded successfully! Journal entry auto-generated." });
            router.refresh();
          } else {
            setVerifyMessage({ type: "info", text: data.message || "Payment pending verification." });
          }
        } catch {
          setVerifyMessage({ type: "info", text: "Payment may have been processed. Refresh to check." });
        }
        setTimeout(() => setVerifyMessage(null), 8000);
      })();
    } else if (paymentStatus === "canceled") {
      url.searchParams.delete("payment");
      window.history.replaceState({}, "", url.pathname + url.search);
      setTab("payments");
      setVerifyMessage({ type: "info", text: "Payment was canceled." });
      setTimeout(() => setVerifyMessage(null), 5000);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSaveGateway() {
    if (!selectedProvider) return;
    const providerInfo = GATEWAY_PROVIDERS.find((p) => p.key === selectedProvider);
    if (!providerInfo) return;
    if (!gatewayFields.secret_key?.trim() && !gatewayFields.client_id?.trim()) {
      setGatewayError("API key is required");
      return;
    }
    setGatewaySaving(true);
    setGatewayError("");
    try {
      const res = await fetch("/api/payments/gateway/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: selectedProvider, credentials: gatewayFields }),
      });
      const data = await res.json();
      if (!res.ok) { setGatewayError(data.error || "Failed to save"); return; }
      setGatewayStatus({
        hasGateway: true, provider: selectedProvider, isActive: true,
        onboardedAt: new Date().toISOString(),
        accountName: data.accountName || selectedProvider,
        accountStatus: { connected: true, accountName: data.accountName },
      });
      setSelectedProvider(null);
      setGatewayFields({});
    } catch { setGatewayError("Network error"); } finally { setGatewaySaving(false); }
  }

  async function handleDisconnectGateway() {
    if (!confirm("Disconnect payment provider? This will disable online vendor payments.")) return;
    try {
      const res = await fetch("/api/payments/gateway/disconnect", { method: "POST" });
      if (res.ok) {
        setGatewayStatus({ hasGateway: false, provider: null, isActive: false, onboardedAt: null, accountName: null, accountStatus: null });
      }
    } catch { /* ignore */ }
  }

  async function handlePayOnline(inv: PayableInvoice) {
    setCheckingOut(inv.id);
    try {
      const res = await fetch("/api/financial/vendor-payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoice_id: inv.id, return_path: "/people/vendors" }),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error || "Failed to create checkout session"); return; }
      if (data.url) window.location.href = data.url;
    } catch { alert("Network error creating checkout session"); } finally { setCheckingOut(null); }
  }

  async function handleImport(rows: Record<string, string>[]) {
    const res = await fetch("/api/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entity: "vendors", rows }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || t("importFailed"));
    router.refresh();
    return { success: data.success, errors: data.errors };
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError("");

    try {
      const res = await fetch("/api/people/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: createFormData.first_name.trim(),
          last_name: createFormData.last_name.trim(),
          email: createFormData.email || undefined,
          phone: createFormData.phone || undefined,
          company_name: createFormData.company_name || undefined,
          job_title: createFormData.job_title || undefined,
          contact_type: createFormData.contact_type,
          notes: createFormData.notes || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t("failedToCreateVendor"));
      }

      setCreateFormData({
        first_name: "",
        last_name: "",
        email: "",
        phone: "",
        company_name: "",
        job_title: "",
        contact_type: "vendor",
        notes: "",
      });
      setShowCreate(false);
      router.refresh();
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : t("failedToCreateVendor"));
    } finally {
      setCreating(false);
    }
  }

  function handleCardClick(vendor: Contact) {
    setSelectedVendor(vendor);
    setIsEditing(false);
    setShowDeleteConfirm(false);
    setEditError("");
    setEditFormData({
      first_name: vendor.first_name,
      last_name: vendor.last_name,
      email: vendor.email || "",
      phone: vendor.phone || "",
      company_name: vendor.company_name || "",
      job_title: vendor.job_title || "",
      contact_type: vendor.contact_type,
      notes: vendor.notes || "",
    });
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedVendor) return;
    setUpdating(true);
    setEditError("");

    try {
      const res = await fetch(`/api/people/contacts/${selectedVendor.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: editFormData.first_name,
          last_name: editFormData.last_name,
          email: editFormData.email || undefined,
          phone: editFormData.phone || undefined,
          company_name: editFormData.company_name || undefined,
          job_title: editFormData.job_title || undefined,
          contact_type: editFormData.contact_type,
          notes: editFormData.notes || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t("failedToUpdate"));
      }
      setSelectedVendor(null);
      setIsEditing(false);
      router.refresh();
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : t("failedToUpdate"));
    } finally {
      setUpdating(false);
    }
  }

  async function handleDelete() {
    if (!selectedVendor) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/people/contacts/${selectedVendor.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t("failedToDelete"));
      }
      setSelectedVendor(null);
      setShowDeleteConfirm(false);
      router.refresh();
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : t("failedToDelete"));
      setShowDeleteConfirm(false);
    } finally {
      setDeleting(false);
    }
  }

  function closeModal() {
    setSelectedVendor(null);
    setIsEditing(false);
    setShowDeleteConfirm(false);
    setEditError("");
  }

  // ---- Contract modal helpers ----
  function openCreateContract() {
    setContractEditing(null);
    setContractForm(EMPTY_CONTRACT_FORM);
    setContractError("");
    setShowContractDelete(false);
    setShowContractModal(true);
  }

  function openEditContract(c: VendorContract) {
    setContractEditing(c);
    setContractForm({
      vendor_id: c.vendor_id || "",
      project_id: c.project_id || "",
      contract_number: c.contract_number || "",
      title: c.title || "",
      contract_type: c.contract_type || "subcontract",
      amount: c.amount ? String(c.amount) : "",
      status: c.status || "active",
      start_date: c.start_date || "",
      end_date: c.end_date || "",
      scope_of_work: c.scope_of_work || "",
      retention_pct: c.retention_pct != null ? String(c.retention_pct) : "",
      insurance_required: c.insurance_required ?? true,
      insurance_expiry: c.insurance_expiry || "",
    });
    setContractError("");
    setShowContractDelete(false);
    setShowContractModal(true);
  }

  function closeContractModal() {
    setShowContractModal(false);
    setContractEditing(null);
    setContractError("");
    setShowContractDelete(false);
  }

  async function handleContractSave(e: React.FormEvent) {
    e.preventDefault();
    setContractSaving(true);
    setContractError("");

    const payload: Record<string, unknown> = {
      vendor_id: contractForm.vendor_id,
      project_id: contractForm.project_id || null,
      contract_number: contractForm.contract_number || null,
      title: contractForm.title,
      contract_type: contractForm.contract_type,
      amount: contractForm.amount ? Number(contractForm.amount) : 0,
      status: contractForm.status,
      start_date: contractForm.start_date || null,
      end_date: contractForm.end_date || null,
      scope_of_work: contractForm.scope_of_work || null,
      retention_pct: contractForm.retention_pct ? Number(contractForm.retention_pct) : 0,
      insurance_required: contractForm.insurance_required,
      insurance_expiry: contractForm.insurance_expiry || null,
    };

    try {
      const url = contractEditing
        ? `/api/people/vendor-contracts/${contractEditing.id}`
        : "/api/people/vendor-contracts";
      const method = contractEditing ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save contract");
      }

      closeContractModal();
      router.refresh();
    } catch (err: unknown) {
      setContractError(err instanceof Error ? err.message : "Failed to save contract");
    } finally {
      setContractSaving(false);
    }
  }

  async function handleContractDelete() {
    if (!contractEditing) return;
    setContractDeleting(true);
    try {
      const res = await fetch(`/api/people/vendor-contracts/${contractEditing.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete contract");
      }
      closeContractModal();
      router.refresh();
    } catch (err: unknown) {
      setContractError(err instanceof Error ? err.message : "Failed to delete contract");
      setShowContractDelete(false);
    } finally {
      setContractDeleting(false);
    }
  }

  const fmt = (n: number) =>
    new Intl.NumberFormat(dateLocale, {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(n);

  return (
    <div>
      {/* Header */}
      <div className="people-header">
        <div>
          <h2>{t("vendorsAndSubcontractors")}</h2>
          <p className="people-header-sub">
            {t("vendorsSummary", { vendorCount: contacts.length, contractCount: contracts.length })}
          </p>
        </div>
        <div className="people-header-actions">
          <button className="btn-secondary" onClick={() => setShowImport(true)}>
            <Upload size={16} />
            {t("importCsv")}
          </button>
          <button className="btn-primary" onClick={() => { setShowCreate(true); setCreateError(""); }}>
            <Plus size={16} />
            {t("addVendor")}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="people-tab-bar">
        <button
          className={`people-tab ${tab === "directory" ? "active" : ""}`}
          onClick={() => setTab("directory")}
        >
          {t("directory")} ({contacts.length})
        </button>
        <button
          className={`people-tab ${tab === "contracts" ? "active" : ""}`}
          onClick={() => setTab("contracts")}
        >
          {t("contracts")} ({contracts.length})
        </button>
        <button
          className={`people-tab ${tab === "payments" ? "active" : ""}`}
          onClick={() => setTab("payments")}
        >
          <CreditCard size={14} style={{ verticalAlign: "middle", marginRight: 4 }} />
          {t("tabPaymentSettings") ?? "Payments"}
        </button>
      </div>

      {/* Directory Tab */}
      {tab === "directory" && (
        contacts.length === 0 ? (
          <div className="people-empty">
            <div className="people-empty-icon"><Truck size={48} /></div>
            <div className="people-empty-title">{t("noVendorsFound")}</div>
            <p className="people-empty-desc">
              {t("noVendorsDescription")}
            </p>
          </div>
        ) : (
          <div className="people-grid">
            {contacts.map((v) => (
              <div
                key={v.id}
                className="contact-card"
                onClick={() => handleCardClick(v)}
              >
                <div className="contact-card-top">
                  <div className="contact-card-avatar">
                    {(v.company_name?.[0] || v.first_name?.[0] || "?").toUpperCase()}
                  </div>
                  <div className="contact-card-info">
                    <div className="contact-card-name">
                      {v.company_name || `${v.first_name} ${v.last_name}`}
                    </div>
                    <div className="contact-card-title">
                      {v.first_name} {v.last_name}
                      {v.job_title ? ` \u00b7 ${v.job_title}` : ""}
                    </div>
                  </div>
                  <div className="contact-card-type">
                    <span className={`badge ${TYPE_BADGE_CLASS[v.contact_type] || ""}`}>
                      {v.contact_type === "subcontractor" ? t("typeSubcontractor") : t("typeVendor")}
                    </span>
                  </div>
                </div>

                <div className="contact-card-details">
                  {v.email && (
                    <div className="contact-card-detail">
                      <Mail size={14} />
                      <a href={`mailto:${v.email}`} onClick={(e) => e.stopPropagation()}>
                        {v.email}
                      </a>
                    </div>
                  )}
                  {v.phone && (
                    <div className="contact-card-detail">
                      <Phone size={14} />
                      <a href={`tel:${v.phone}`} onClick={(e) => e.stopPropagation()}>
                        {v.phone}
                      </a>
                    </div>
                  )}
                </div>

                {/* Prequalification Score */}
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  borderTop: "1px solid var(--border)",
                  paddingTop: "10px",
                  marginTop: "10px",
                  fontSize: "0.8rem",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--muted)" }}>
                    <Shield size={13} />
                    <span>{t("prequalification")}</span>
                  </div>
                  {v.prequalification_score != null ? (
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                      fontWeight: 600,
                      color: v.prequalification_score >= 80
                        ? "var(--color-green)"
                        : v.prequalification_score >= 60
                          ? "var(--color-amber)"
                          : "var(--color-red)",
                    }}>
                      {v.prequalification_score >= 80 ? (
                        <CheckCircle2 size={13} />
                      ) : v.prequalification_score >= 60 ? (
                        <AlertTriangle size={13} />
                      ) : (
                        <XCircle size={13} />
                      )}
                      {v.prequalification_score}/100
                    </div>
                  ) : (
                    <span style={{ color: "var(--muted)", fontStyle: "italic", fontSize: "0.75rem" }}>
                      {t("notEvaluated")}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Contracts Tab */}
      {tab === "contracts" && (
        <div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "16px" }}>
            <button className="btn-primary" onClick={openCreateContract}>
              <FileText size={16} />
              {t("createContract") ?? "Create Contract"}
            </button>
          </div>

          <div className="fin-chart-card" style={{ padding: 0 }}>
            <div style={{ overflowX: "auto" }}>
              <table className="invoice-table">
                <thead>
                  <tr>
                    <th>{t("contractNumber")}</th>
                    <th>{t("title")}</th>
                    <th>{t("typeVendor")}</th>
                    <th>{t("type")}</th>
                    <th>{t("project") ?? "Project"}</th>
                    <th style={{ textAlign: "right" }}>{t("amount")}</th>
                    <th>{t("status")}</th>
                    <th>{t("start")}</th>
                    <th>{t("end")}</th>
                  </tr>
                </thead>
                <tbody>
                  {contracts.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ textAlign: "center", padding: "48px 24px", color: "var(--muted)" }}>
                        {t("noContractsFound")}
                      </td>
                    </tr>
                  ) : (
                    contracts.map((c) => {
                      const proj = projects.find((p) => p.id === c.project_id);
                      return (
                        <tr
                          key={c.id}
                          style={{ cursor: "pointer" }}
                          onClick={() => openEditContract(c)}
                        >
                          <td style={{ fontWeight: 600, color: "var(--color-blue)" }}>{c.contract_number || "\u2014"}</td>
                          <td style={{ fontWeight: 500 }}>{c.title}</td>
                          <td>{c.contacts?.company_name ?? "\u2014"}</td>
                          <td style={{ textTransform: "capitalize" }}>
                            {c.contract_type?.replace(/_/g, " ")}
                          </td>
                          <td style={{ color: "var(--muted)", fontSize: "0.82rem" }}>{proj?.name ?? "\u2014"}</td>
                          <td className="amount-col">{fmt(c.amount)}</td>
                          <td>
                            <span className={`inv-status inv-status-${c.status}`}>
                              {c.status}
                            </span>
                          </td>
                          <td>{c.start_date ? new Date(c.start_date).toLocaleDateString(dateLocale) : "\u2014"}</td>
                          <td>{c.end_date ? new Date(c.end_date).toLocaleDateString(dateLocale) : "\u2014"}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Payments Tab */}
      {tab === "payments" && (
        <div>
          {/* Payment verification banner */}
          {verifyMessage && (
            <div style={{
              padding: "12px 18px", borderRadius: 10, marginBottom: 20,
              display: "flex", alignItems: "center", gap: 10,
              fontSize: "0.88rem", fontWeight: 500,
              background: verifyMessage.type === "success"
                ? "color-mix(in srgb, var(--color-green) 10%, transparent)"
                : "color-mix(in srgb, var(--color-blue) 10%, transparent)",
              color: verifyMessage.type === "success" ? "var(--color-green)" : "var(--color-blue)",
              border: `1px solid ${verifyMessage.type === "success" ? "color-mix(in srgb, var(--color-green) 25%, transparent)" : "color-mix(in srgb, var(--color-blue) 25%, transparent)"}`,
            }}>
              {verifyMessage.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
              {verifyMessage.text}
              <button
                style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "inherit", padding: 4 }}
                onClick={() => setVerifyMessage(null)}
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* Gateway Connection Card */}
          <div className="fin-chart-card" style={{ marginBottom: 20 }}>
            <div style={{ marginBottom: 16 }}>
              <h3 style={{ fontFamily: "var(--font-serif)", fontSize: "1.05rem", fontWeight: 700, marginBottom: 4 }}>
                Payment Provider
              </h3>
              <p style={{ fontSize: "0.82rem", color: "var(--muted)", margin: 0 }}>
                Connect a payment provider to pay vendors online directly from this page.
              </p>
            </div>

            {gatewayLoading ? (
              <p style={{ color: "var(--muted)", textAlign: "center", padding: "16px 0", fontSize: "0.85rem" }}>
                <Loader2 size={14} className="spin" style={{ display: "inline-block", marginRight: 6 }} />
                Checking connection...
              </p>
            ) : gatewayStatus?.isActive && gatewayStatus.accountStatus?.connected ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderRadius: 10, background: "color-mix(in srgb, var(--color-green) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--color-green) 20%, transparent)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <CheckCircle2 size={20} style={{ color: "var(--color-green)" }} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "0.92rem" }}>
                      {GATEWAY_PROVIDERS.find((p) => p.key === gatewayStatus.provider)?.name || gatewayStatus.provider}
                      <span style={{ marginLeft: 8, fontSize: "0.73rem", padding: "2px 8px", borderRadius: 12, background: "color-mix(in srgb, var(--color-green) 15%, transparent)", color: "var(--color-green)" }}>
                        Connected
                      </span>
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "var(--muted)", marginTop: 2 }}>
                      {gatewayStatus.accountName || "Active"}
                    </div>
                  </div>
                </div>
                <button
                  className="ui-btn ui-btn-sm ui-btn-outline"
                  style={{ color: "var(--color-red)", borderColor: "var(--color-red)" }}
                  onClick={handleDisconnectGateway}
                >
                  Disconnect
                </button>
              </div>
            ) : selectedProvider ? (
              (() => {
                const providerInfo = GATEWAY_PROVIDERS.find((p) => p.key === selectedProvider);
                if (!providerInfo) return null;
                return (
                  <div style={{ border: "1px solid var(--border)", borderRadius: 10, padding: 18 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                      <div style={{ fontWeight: 600, fontSize: "0.92rem" }}>
                        {providerInfo.name} — Enter API Keys
                      </div>
                      <button
                        className="ui-btn ui-btn-sm ui-btn-ghost"
                        onClick={() => { setSelectedProvider(null); setGatewayFields({}); setGatewayError(""); }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                    {providerInfo.fields.map((field) => (
                      <div key={field.key} style={{ marginBottom: 12 }}>
                        <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 500, marginBottom: 4 }}>
                          {field.label}
                        </label>
                        <input
                          type={field.type}
                          placeholder={field.placeholder}
                          value={gatewayFields[field.key] || ""}
                          onChange={(e) => setGatewayFields((prev) => ({ ...prev, [field.key]: e.target.value }))}
                          style={{
                            width: "100%", padding: "8px 12px", borderRadius: 8,
                            border: "1px solid var(--border)", background: "var(--bg)",
                            color: "var(--text)", fontSize: "0.85rem", fontFamily: "monospace",
                          }}
                        />
                      </div>
                    ))}
                    {gatewayError && (
                      <p style={{ color: "var(--color-red)", fontSize: "0.82rem", margin: "0 0 10px 0" }}>{gatewayError}</p>
                    )}
                    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                      <button className="btn-secondary" onClick={() => { setSelectedProvider(null); setGatewayFields({}); setGatewayError(""); }}>
                        {t("cancel")}
                      </button>
                      <button
                        className="btn-primary"
                        disabled={gatewaySaving}
                        onClick={handleSaveGateway}
                        style={{ display: "flex", alignItems: "center", gap: 6 }}
                      >
                        {gatewaySaving ? <Loader2 size={14} className="spin" /> : <Check size={14} />}
                        Save & Connect
                      </button>
                    </div>
                  </div>
                );
              })()
            ) : (
              <div>
                <p style={{ fontSize: "0.82rem", color: "var(--muted)", marginBottom: 14 }}>
                  Select a payment provider to enable online vendor payments:
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
                  {GATEWAY_PROVIDERS.map((gp) => (
                    <div
                      key={gp.key}
                      style={{
                        padding: "16px 18px", borderRadius: 10,
                        border: "1px solid var(--border)", background: "var(--bg)",
                        opacity: gp.available ? 1 : 0.5,
                      }}
                    >
                      <div style={{ fontWeight: 600, fontSize: "0.92rem", marginBottom: 4 }}>{gp.name}</div>
                      <div style={{ fontSize: "0.78rem", color: "var(--muted)", marginBottom: 10 }}>{gp.description}</div>
                      {gp.available ? (
                        <button
                          className="btn-primary"
                          style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: "0.82rem", padding: "6px 12px" }}
                          onClick={() => { setSelectedProvider(gp.key); setGatewayFields({}); setGatewayError(""); }}
                        >
                          <KeyRound size={14} />
                          Connect
                        </button>
                      ) : (
                        <span style={{ fontSize: "0.78rem", color: "var(--muted)", fontStyle: "italic" }}>
                          Coming Soon
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Outstanding Invoices Table */}
          <div style={{ marginBottom: 12 }}>
            <h3 style={{ fontFamily: "var(--font-serif)", fontSize: "1.05rem", fontWeight: 700, marginBottom: 4 }}>
              Outstanding Invoices
            </h3>
            <p style={{ fontSize: "0.82rem", color: "var(--muted)", margin: 0 }}>
              {payableInvoices.length} unpaid invoice{payableInvoices.length !== 1 ? "s" : ""} totaling{" "}
              {formatCurrency(payableInvoices.reduce((s, i) => s + (i.balance_due || 0), 0))}
            </p>
          </div>

          {payableInvoices.length > 0 ? (
            <div className="fin-chart-card" style={{ padding: 0 }}>
              <div style={{ overflowX: "auto" }}>
                <table className="invoice-table">
                  <thead>
                    <tr>
                      <th>{t("invoiceNumber") ?? "Invoice #"}</th>
                      <th>Vendor</th>
                      <th>{t("project") ?? "Project"}</th>
                      <th>Due Date</th>
                      <th style={{ textAlign: "right" }}>{t("amount") ?? "Amount"}</th>
                      <th style={{ textAlign: "right" }}>Balance Due</th>
                      <th>{t("status")}</th>
                      <th>{t("actions") ?? "Actions"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payableInvoices.map((inv) => {
                      const now = new Date();
                      const dueDate = new Date(inv.due_date);
                      const isPastDue = dueDate < now && inv.status !== "paid" && inv.status !== "voided";

                      return (
                        <tr key={inv.id}>
                          <td>
                            <Link
                              href={`/financial/ap?status=${inv.status}`}
                              style={{ fontWeight: 600, color: "var(--color-blue)", textDecoration: "none" }}
                            >
                              {inv.invoice_number}
                            </Link>
                          </td>
                          <td>{inv.vendor_name ?? "—"}</td>
                          <td style={{ color: "var(--muted)", fontSize: "0.82rem" }}>{inv.projects?.name ?? "—"}</td>
                          <td>
                            <span style={{
                              color: isPastDue ? "var(--color-red)" : "var(--text)",
                              fontWeight: isPastDue ? 600 : 400,
                            }}>
                              {new Date(inv.due_date).toLocaleDateString(dateLocale, { month: "short", day: "numeric", year: "numeric" })}
                              {isPastDue && <AlertCircle size={12} style={{ marginLeft: 4, verticalAlign: "middle" }} />}
                            </span>
                          </td>
                          <td className="amount-col">{formatCurrency(inv.total_amount)}</td>
                          <td className={`amount-col ${isPastDue ? "overdue" : ""}`}>
                            {formatCurrency(inv.balance_due)}
                          </td>
                          <td>
                            <span className={`inv-status inv-status-${inv.status}`}>{inv.status}</span>
                          </td>
                          <td>
                            <div style={{ display: "flex", gap: 4 }}>
                              <Link
                                href={`/financial/ap`}
                                className="ui-btn ui-btn-primary ui-btn-sm"
                                style={{ fontSize: "0.75rem", padding: "4px 10px", display: "inline-flex", alignItems: "center", gap: 3 }}
                              >
                                <DollarSign size={12} />
                                Pay
                              </Link>
                              {gatewayStatus?.isActive && (
                                <button
                                  className="ui-btn ui-btn-sm"
                                  onClick={() => handlePayOnline(inv)}
                                  disabled={checkingOut === inv.id}
                                  style={{
                                    fontSize: "0.75rem", padding: "4px 10px",
                                    background: "var(--color-green)", color: "#fff",
                                    border: "none", borderRadius: 6,
                                    cursor: checkingOut === inv.id ? "wait" : "pointer",
                                    display: "inline-flex", alignItems: "center", gap: 3,
                                  }}
                                >
                                  {checkingOut === inv.id ? <Loader2 size={12} className="spin" /> : <CreditCard size={12} />}
                                  Online
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="fin-chart-card">
              <div className="fin-empty">
                <div className="fin-empty-icon"><CreditCard size={48} /></div>
                <div className="fin-empty-title">No Outstanding Invoices</div>
                <div className="fin-empty-desc">All vendor invoices are paid or no payable invoices exist yet.</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create Vendor Modal */}
      {showCreate && (
        <div className="ticket-modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="ticket-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ticket-modal-header">
              <h3>{t("addVendor")}</h3>
              <button className="ticket-modal-close" onClick={() => setShowCreate(false)}>
                <X size={18} />
              </button>
            </div>

            {createError && <div className="ticket-form-error">{createError}</div>}

            <form onSubmit={handleCreate} className="ticket-form">
              <div className="ticket-form-group">
                <label className="ticket-form-label">{t("type")}</label>
                <select
                  className="ticket-form-select"
                  value={createFormData.contact_type}
                  onChange={(e) => setCreateFormData({ ...createFormData, contact_type: e.target.value })}
                >
                  <option value="vendor">{t("typeVendor")}</option>
                  <option value="subcontractor">{t("typeSubcontractor")}</option>
                </select>
              </div>

              <div className="ticket-form-group">
                <label className="ticket-form-label">{t("companyName")}</label>
                <input
                  type="text"
                  className="ticket-form-input"
                  value={createFormData.company_name}
                  onChange={(e) => setCreateFormData({ ...createFormData, company_name: e.target.value })}
                  placeholder={t("companyNameExamplePlaceholder")}
                />
              </div>

              <div className="ticket-form-row">
                <div className="ticket-form-group">
                  <label className="ticket-form-label">{t("contactFirstNameRequired")}</label>
                  <input
                    type="text"
                    className="ticket-form-input"
                    value={createFormData.first_name}
                    onChange={(e) => setCreateFormData({ ...createFormData, first_name: e.target.value })}
                    required
                  />
                </div>
                <div className="ticket-form-group">
                  <label className="ticket-form-label">{t("contactLastNameRequired")}</label>
                  <input
                    type="text"
                    className="ticket-form-input"
                    value={createFormData.last_name}
                    onChange={(e) => setCreateFormData({ ...createFormData, last_name: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="ticket-form-row">
                <div className="ticket-form-group">
                  <label className="ticket-form-label">{t("email")}</label>
                  <input
                    type="email"
                    className="ticket-form-input"
                    value={createFormData.email}
                    onChange={(e) => setCreateFormData({ ...createFormData, email: e.target.value })}
                    placeholder={t("vendorEmailPlaceholder")}
                  />
                </div>
                <div className="ticket-form-group">
                  <label className="ticket-form-label">{t("phone")}</label>
                  <input
                    type="text"
                    className="ticket-form-input"
                    value={createFormData.phone}
                    onChange={(e) => setCreateFormData({ ...createFormData, phone: e.target.value })}
                    placeholder={t("vendorPhonePlaceholder")}
                  />
                </div>
              </div>

              <div className="ticket-form-group">
                <label className="ticket-form-label">{t("jobTitle")}</label>
                <input
                  type="text"
                  className="ticket-form-input"
                  value={createFormData.job_title}
                  onChange={(e) => setCreateFormData({ ...createFormData, job_title: e.target.value })}
                  placeholder={t("jobTitleExamplePlaceholder")}
                />
              </div>

              <div className="ticket-form-group">
                <label className="ticket-form-label">{t("notes")}</label>
                <textarea
                  className="ticket-form-textarea"
                  value={createFormData.notes}
                  onChange={(e) => setCreateFormData({ ...createFormData, notes: e.target.value })}
                  rows={3}
                  placeholder={t("additionalNotesPlaceholder")}
                />
              </div>

              <div className="ticket-form-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowCreate(false)}>
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={creating || !createFormData.first_name.trim() || !createFormData.last_name.trim()}
                >
                  {creating ? t("creating") : t("addVendor")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImport && (
        <ImportModal
          entityName={t("vendorsEntity")}
          columns={IMPORT_COLUMNS}
          sampleData={IMPORT_SAMPLE}
          onImport={handleImport}
          onClose={() => setShowImport(false)}
        />
      )}

      {/* Vendor Detail Modal */}
      {selectedVendor && (
        <div className="ticket-modal-overlay" onClick={closeModal}>
          <div className="ticket-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ticket-modal-header">
              <h3>
                {isEditing
                  ? t("editVendor")
                  : selectedVendor.company_name || `${selectedVendor.first_name} ${selectedVendor.last_name}`}
              </h3>
              <button className="ticket-modal-close" onClick={closeModal}>
                <X size={18} />
              </button>
            </div>

            {editError && <div className="ticket-form-error">{editError}</div>}

            {showDeleteConfirm ? (
              <div className="ticket-delete-confirm">
                <p>
                  {t("deleteVendorConfirm", { name: selectedVendor.company_name || `${selectedVendor.first_name} ${selectedVendor.last_name}` })}
                </p>
                <div className="ticket-delete-actions">
                  <button className="btn-secondary" onClick={() => setShowDeleteConfirm(false)} disabled={deleting}>{t("cancel")}</button>
                  <button className="btn-danger" onClick={handleDelete} disabled={deleting}>
                    {deleting ? t("deleting") : t("delete")}
                  </button>
                </div>
              </div>
            ) : isEditing ? (
              <form onSubmit={handleUpdate} className="ticket-form">
                <div className="ticket-form-group">
                  <label className="ticket-form-label">{t("type")}</label>
                  <select className="ticket-form-select" value={editFormData.contact_type} onChange={(e) => setEditFormData({ ...editFormData, contact_type: e.target.value })}>
                    <option value="vendor">{t("typeVendor")}</option>
                    <option value="subcontractor">{t("typeSubcontractor")}</option>
                  </select>
                </div>

                <div className="ticket-form-group">
                  <label className="ticket-form-label">{t("companyName")}</label>
                  <input type="text" className="ticket-form-input" value={editFormData.company_name} onChange={(e) => setEditFormData({ ...editFormData, company_name: e.target.value })} />
                </div>

                <div className="ticket-form-row">
                  <div className="ticket-form-group">
                    <label className="ticket-form-label">{t("contactFirstName")}</label>
                    <input type="text" className="ticket-form-input" value={editFormData.first_name} onChange={(e) => setEditFormData({ ...editFormData, first_name: e.target.value })} />
                  </div>
                  <div className="ticket-form-group">
                    <label className="ticket-form-label">{t("contactLastName")}</label>
                    <input type="text" className="ticket-form-input" value={editFormData.last_name} onChange={(e) => setEditFormData({ ...editFormData, last_name: e.target.value })} />
                  </div>
                </div>

                <div className="ticket-form-row">
                  <div className="ticket-form-group">
                    <label className="ticket-form-label">{t("email")}</label>
                    <input type="email" className="ticket-form-input" value={editFormData.email} onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })} />
                  </div>
                  <div className="ticket-form-group">
                    <label className="ticket-form-label">{t("phone")}</label>
                    <input type="text" className="ticket-form-input" value={editFormData.phone} onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })} />
                  </div>
                </div>

                <div className="ticket-form-group">
                  <label className="ticket-form-label">{t("jobTitle")}</label>
                  <input type="text" className="ticket-form-input" value={editFormData.job_title} onChange={(e) => setEditFormData({ ...editFormData, job_title: e.target.value })} />
                </div>

                <div className="ticket-form-group">
                  <label className="ticket-form-label">{t("notes")}</label>
                  <textarea className="ticket-form-textarea" value={editFormData.notes} onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })} rows={3} />
                </div>

                <div className="ticket-form-actions">
                  <button type="button" className="btn-secondary" onClick={() => setIsEditing(false)}>{t("cancel")}</button>
                  <button type="submit" className="btn-primary" disabled={updating}>
                    {updating ? t("saving") : t("saveChanges")}
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div className="ticket-detail-body">
                  <div className="people-detail-header">
                    <div className="people-detail-avatar">
                      {(selectedVendor.company_name?.[0] || selectedVendor.first_name?.[0] || "?").toUpperCase()}
                    </div>
                    <div>
                      <div className="people-detail-name">
                        {selectedVendor.company_name || `${selectedVendor.first_name} ${selectedVendor.last_name}`}
                      </div>
                      <div className="people-detail-title">
                        {selectedVendor.first_name} {selectedVendor.last_name}
                        {selectedVendor.job_title ? ` \u00b7 ${selectedVendor.job_title}` : ""}
                      </div>
                    </div>
                    <span className={`badge ${TYPE_BADGE_CLASS[selectedVendor.contact_type] || ""}`}>
                      {selectedVendor.contact_type === "subcontractor" ? t("typeSubcontractor") : t("typeVendor")}
                    </span>
                  </div>

                  <div className="people-detail-section">
                    {selectedVendor.email && (
                      <div className="people-detail-row">
                        <Mail size={16} />
                        <a href={`mailto:${selectedVendor.email}`}>{selectedVendor.email}</a>
                      </div>
                    )}
                    {selectedVendor.phone && (
                      <div className="people-detail-row">
                        <Phone size={16} />
                        <a href={`tel:${selectedVendor.phone}`}>{selectedVendor.phone}</a>
                      </div>
                    )}
                    {selectedVendor.company_name && (
                      <div className="people-detail-row">
                        <Building2 size={16} />
                        <span>{selectedVendor.company_name}</span>
                      </div>
                    )}
                    {(selectedVendor.city || selectedVendor.state) && (
                      <div className="people-detail-row">
                        <Building2 size={16} />
                        <span>{[selectedVendor.city, selectedVendor.state].filter(Boolean).join(", ")}</span>
                      </div>
                    )}
                  </div>

                  {selectedVendor.notes && (
                    <div className="people-detail-notes">
                      <label>{t("notes")}</label>
                      <p>{selectedVendor.notes}</p>
                    </div>
                  )}

                  {/* Prequalification Checklist */}
                  {(selectedVendor.contact_type === "vendor" || selectedVendor.contact_type === "subcontractor") && (
                    <div style={{ borderTop: "1px solid var(--border)", paddingTop: "16px", marginTop: "16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                        <Shield size={16} style={{ color: "var(--color-blue)" }} />
                        <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>{t("prequalification")}</span>
                      </div>
                      <PrequalificationChecklist
                        contactId={selectedVendor.id}
                        data={{
                          emr_rate: selectedVendor.emr_rate ?? null,
                          bonding_capacity: selectedVendor.bonding_capacity ?? null,
                          prequalification_score: selectedVendor.prequalification_score ?? null,
                          prequalification_notes: selectedVendor.prequalification_notes ?? null,
                        }}
                        onSave={async (data) => {
                          try {
                            await fetch(`/api/people/contacts/${selectedVendor.id}`, {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify(data),
                            });
                            router.refresh();
                          } catch { /* ignore */ }
                        }}
                      />
                    </div>
                  )}
                </div>

                <div className="ticket-form-actions">
                  <button className="ui-btn ui-btn-sm ui-btn-danger" onClick={() => setShowDeleteConfirm(true)}>
                    <Trash2 size={15} />
                    {t("delete")}
                  </button>
                  <button className="ui-btn ui-btn-sm ui-btn-primary" onClick={() => { setIsEditing(true); setEditError(""); }}>
                    <Edit3 size={15} />
                    {t("edit")}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Contract Create/Edit Modal */}
      {showContractModal && (
        <div className="ticket-modal-overlay" onClick={closeContractModal}>
          <div className="ticket-modal" style={{ maxWidth: "640px" }} onClick={(e) => e.stopPropagation()}>
            <div className="ticket-modal-header">
              <h3>{contractEditing ? (t("editContract") ?? "Edit Contract") : (t("createContract") ?? "Create Contract")}</h3>
              <button className="ticket-modal-close" onClick={closeContractModal}>
                <X size={18} />
              </button>
            </div>

            {contractError && <div className="ticket-form-error">{contractError}</div>}

            {showContractDelete ? (
              <div className="ticket-delete-confirm">
                <p>Are you sure you want to delete contract &ldquo;{contractEditing?.title}&rdquo;? This action cannot be undone.</p>
                <div className="ticket-delete-actions">
                  <button className="btn-secondary" onClick={() => setShowContractDelete(false)} disabled={contractDeleting}>{t("cancel")}</button>
                  <button className="btn-danger" onClick={handleContractDelete} disabled={contractDeleting}>
                    {contractDeleting ? t("deleting") : t("delete")}
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleContractSave} className="ticket-form">
                <div className="ticket-form-row">
                  <div className="ticket-form-group">
                    <label className="ticket-form-label">{t("typeVendor")} *</label>
                    <select
                      className="ticket-form-select"
                      value={contractForm.vendor_id}
                      onChange={(e) => setContractForm({ ...contractForm, vendor_id: e.target.value })}
                      required
                    >
                      <option value="">{t("selectVendor") ?? "-- Select Vendor --"}</option>
                      {contacts.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.company_name || `${c.first_name} ${c.last_name}`}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="ticket-form-group">
                    <label className="ticket-form-label">{t("project") ?? "Project"}</label>
                    <select
                      className="ticket-form-select"
                      value={contractForm.project_id}
                      onChange={(e) => setContractForm({ ...contractForm, project_id: e.target.value })}
                    >
                      <option value="">{t("selectProject") ?? "-- Select Project --"}</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.code ? `${p.code} - ` : ""}{p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="ticket-form-row">
                  <div className="ticket-form-group">
                    <label className="ticket-form-label">{t("title")} *</label>
                    <input
                      type="text"
                      className="ticket-form-input"
                      value={contractForm.title}
                      onChange={(e) => setContractForm({ ...contractForm, title: e.target.value })}
                      placeholder="e.g. Structural Steel Package"
                      required
                    />
                  </div>
                  <div className="ticket-form-group">
                    <label className="ticket-form-label">{t("contractNumber")}</label>
                    <input
                      type="text"
                      className="ticket-form-input"
                      value={contractForm.contract_number}
                      onChange={(e) => setContractForm({ ...contractForm, contract_number: e.target.value })}
                      placeholder="e.g. SC-2026-001"
                    />
                  </div>
                </div>

                <div className="ticket-form-row">
                  <div className="ticket-form-group">
                    <label className="ticket-form-label">{t("type")}</label>
                    <select
                      className="ticket-form-select"
                      value={contractForm.contract_type}
                      onChange={(e) => setContractForm({ ...contractForm, contract_type: e.target.value })}
                    >
                      <option value="subcontract">{t("subcontract") ?? "Subcontract"}</option>
                      <option value="purchase_order">{t("purchaseOrder") ?? "Purchase Order"}</option>
                      <option value="service_agreement">{t("serviceAgreement") ?? "Service Agreement"}</option>
                    </select>
                  </div>
                  <div className="ticket-form-group">
                    <label className="ticket-form-label">{t("status")}</label>
                    <select
                      className="ticket-form-select"
                      value={contractForm.status}
                      onChange={(e) => setContractForm({ ...contractForm, status: e.target.value })}
                    >
                      <option value="draft">Draft</option>
                      <option value="active">Active</option>
                      <option value="completed">Completed</option>
                      <option value="terminated">Terminated</option>
                    </select>
                  </div>
                </div>

                <div className="ticket-form-row">
                  <div className="ticket-form-group">
                    <label className="ticket-form-label">{t("amount")}</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="ticket-form-input"
                      value={contractForm.amount}
                      onChange={(e) => setContractForm({ ...contractForm, amount: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="ticket-form-group">
                    <label className="ticket-form-label">{t("retentionPct") ?? "Retention %"}</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      className="ticket-form-input"
                      value={contractForm.retention_pct}
                      onChange={(e) => setContractForm({ ...contractForm, retention_pct: e.target.value })}
                      placeholder="10"
                    />
                  </div>
                </div>

                <div className="ticket-form-row">
                  <div className="ticket-form-group">
                    <label className="ticket-form-label">{t("start")}</label>
                    <input
                      type="date"
                      className="ticket-form-input"
                      value={contractForm.start_date}
                      onChange={(e) => setContractForm({ ...contractForm, start_date: e.target.value })}
                    />
                  </div>
                  <div className="ticket-form-group">
                    <label className="ticket-form-label">{t("end")}</label>
                    <input
                      type="date"
                      className="ticket-form-input"
                      value={contractForm.end_date}
                      onChange={(e) => setContractForm({ ...contractForm, end_date: e.target.value })}
                    />
                  </div>
                </div>

                <div className="ticket-form-row">
                  <div className="ticket-form-group" style={{ flex: "0 0 auto" }}>
                    <label className="ticket-form-label" style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={contractForm.insurance_required}
                        onChange={(e) => setContractForm({ ...contractForm, insurance_required: e.target.checked })}
                      />
                      {t("insuranceRequired") ?? "Insurance Required"}
                    </label>
                  </div>
                  {contractForm.insurance_required && (
                    <div className="ticket-form-group">
                      <label className="ticket-form-label">{t("insuranceExpiry") ?? "Insurance Expiry"}</label>
                      <input
                        type="date"
                        className="ticket-form-input"
                        value={contractForm.insurance_expiry}
                        onChange={(e) => setContractForm({ ...contractForm, insurance_expiry: e.target.value })}
                      />
                    </div>
                  )}
                </div>

                <div className="ticket-form-group">
                  <label className="ticket-form-label">{t("scopeOfWork") ?? "Scope of Work"}</label>
                  <textarea
                    className="ticket-form-textarea"
                    value={contractForm.scope_of_work}
                    onChange={(e) => setContractForm({ ...contractForm, scope_of_work: e.target.value })}
                    rows={3}
                    placeholder="Describe the scope of work..."
                  />
                </div>

                <div className="ticket-form-actions">
                  {contractEditing && (
                    <button type="button" className="btn-danger" onClick={() => setShowContractDelete(true)}>
                      <Trash2 size={15} />
                      {t("delete")}
                    </button>
                  )}
                  <div style={{ marginLeft: "auto", display: "flex", gap: "8px" }}>
                    <button type="button" className="btn-secondary" onClick={closeContractModal}>
                      {t("cancel")}
                    </button>
                    <button
                      type="submit"
                      className="btn-primary"
                      disabled={contractSaving || !contractForm.vendor_id || !contractForm.title.trim()}
                    >
                      {contractSaving ? t("saving") : contractEditing ? (t("saveChanges")) : (t("createContract") ?? "Create Contract")}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
