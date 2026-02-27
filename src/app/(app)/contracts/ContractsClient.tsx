"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import {
  Search,
  Plus,
  X,
  FileText,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  Edit3,
  Trash2,
  Upload,
} from "lucide-react";
import ImportModal from "@/components/ImportModal";
import type { ImportColumn } from "@/lib/utils/csv-parser";
import type {
  ContractRow,
  ContractStats,
  ContractStatus,
  ContractType,
} from "@/lib/queries/contracts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDateWithLocale(dateStr: string | null, dateLocale: string) {
  if (!dateStr) return "--";
  return new Date(dateStr).toLocaleDateString(dateLocale, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateShortWithLocale(dateStr: string | null, dateLocale: string) {
  if (!dateStr) return "--";
  return new Date(dateStr).toLocaleDateString(dateLocale, {
    month: "short",
    day: "numeric",
  });
}

function formatCurrency(amount: number | null) {
  if (amount === null || amount === undefined) return "--";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

const IMPORT_SAMPLE: Record<string, string>[] = [
  { title: "Concrete subcontract", contract_type: "subcontractor", party_name: "ABC Concrete", party_email: "info@abcconcrete.com", contract_amount: "250000", start_date: "2026-01-01", end_date: "2026-06-30", payment_terms: "net_30" },
  { title: "Electrical rough-in", contract_type: "subcontractor", party_name: "Spark Electric Inc", party_email: "bids@sparkelectric.com", contract_amount: "185000", start_date: "2026-02-01", end_date: "2026-08-31", payment_terms: "net_45" },
  { title: "Architectural services", contract_type: "professional_services", party_name: "Modern Design Group", party_email: "pm@moderndesign.com", contract_amount: "75000", start_date: "2025-10-01", end_date: "2026-12-31", payment_terms: "net_30" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface ContractsClientProps {
  contracts: ContractRow[];
  stats: ContractStats;
  projects: { id: string; name: string }[];
  userId: string;
  companyId: string;
  linkedJEs?: Record<string, { id: string; entry_number: string }[]>;
}

export default function ContractsClient({
  contracts,
  stats,
  projects,
  userId,
  companyId,
  linkedJEs = {},
}: ContractsClientProps) {
  const router = useRouter();
  const t = useTranslations("app");
  const locale = useLocale();
  const dateLocale = locale === "es" ? "es" : "en-US";

  const STATUS_LABELS: Record<ContractStatus, string> = {
    draft: t("contractStatusDraft"),
    pending_approval: t("contractStatusPendingApproval"),
    active: t("contractStatusActive"),
    expired: t("contractStatusExpired"),
    terminated: t("contractStatusTerminated"),
    completed: t("contractStatusCompleted"),
  };

  const TYPE_LABELS: Record<ContractType, string> = {
    subcontractor: t("contractTypeSubcontractor"),
    vendor: t("contractTypeVendor"),
    client: t("contractTypeClient"),
    lease: t("contractTypeLease"),
  };

  const PAYMENT_TERMS_LABELS: Record<string, string> = {
    net_30: t("paymentTermsNet30"),
    net_60: t("paymentTermsNet60"),
    net_90: t("paymentTermsNet90"),
    upon_completion: t("paymentTermsUponCompletion"),
  };

  const IMPORT_COLUMNS: ImportColumn[] = [
    { key: "title", label: t("title"), required: true },
    { key: "contract_type", label: t("type"), required: false },
    { key: "party_name", label: t("partyName"), required: false },
    { key: "party_email", label: t("partyEmail"), required: false, type: "email" },
    { key: "contract_amount", label: t("amountDollar"), required: false, type: "number" },
    { key: "start_date", label: t("startDate"), required: false, type: "date" },
    { key: "end_date", label: t("endDate"), required: false, type: "date" },
    { key: "payment_terms", label: t("paymentTerms"), required: false },
  ];

  // Filters
  const [statusFilter, setStatusFilter] = useState<ContractStatus | "all">("all");
  const [typeFilter, setTypeFilter] = useState<ContractType | "all">("all");
  const [search, setSearch] = useState("");

  const [showImport, setShowImport] = useState(false);

  // Create modal state
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [formData, setFormData] = useState({
    title: "",
    contract_type: "subcontractor" as ContractType,
    party_name: "",
    party_email: "",
    contract_amount: "",
    start_date: "",
    end_date: "",
    payment_terms: "",
    scope_of_work: "",
    insurance_required: false,
    project_id: "",
  });

  // Detail / Edit / Delete modal state
  const [selectedContract, setSelectedContract] = useState<ContractRow | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editData, setEditData] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Filtered contracts
  const filtered = useMemo(() => {
    let result = contracts;

    if (statusFilter !== "all") {
      result = result.filter((c) => c.status === statusFilter);
    }

    if (typeFilter !== "all") {
      result = result.filter((c) => c.contract_type === typeFilter);
    }

    if (search.trim()) {
      const term = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.title.toLowerCase().includes(term) ||
          c.contract_number.toLowerCase().includes(term) ||
          (c.party_name && c.party_name.toLowerCase().includes(term))
      );
    }

    return result;
  }, [contracts, statusFilter, typeFilter, search]);

  async function handleImport(rows: Record<string, string>[]) {
    const res = await fetch("/api/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entity: "contracts", rows }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || t("importFailed"));
    router.refresh();
    return { success: data.success, errors: data.errors };
  }

  // Create contract handler
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError("");

    try {
      const res = await fetch("/api/contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          contract_type: formData.contract_type,
          party_name: formData.party_name || undefined,
          party_email: formData.party_email || undefined,
          contract_amount: formData.contract_amount
            ? Number(formData.contract_amount)
            : undefined,
          start_date: formData.start_date || undefined,
          end_date: formData.end_date || undefined,
          payment_terms: formData.payment_terms || undefined,
          scope_of_work: formData.scope_of_work || undefined,
          insurance_required: formData.insurance_required,
          project_id: formData.project_id || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t("failedToCreateContract"));
      }

      // Reset form and close modal
      setFormData({
        title: "",
        contract_type: "subcontractor",
        party_name: "",
        party_email: "",
        contract_amount: "",
        start_date: "",
        end_date: "",
        payment_terms: "",
        scope_of_work: "",
        insurance_required: false,
        project_id: "",
      });
      setShowCreate(false);
      router.refresh();
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : t("failedToCreateContract"));
    } finally {
      setCreating(false);
    }
  }

  // Open detail modal
  function openDetail(contract: ContractRow) {
    setSelectedContract(contract);
    setIsEditing(false);
    setShowDeleteConfirm(false);
    setSaveError("");
    setEditData({});
  }

  // Close detail modal
  function closeDetail() {
    setSelectedContract(null);
    setIsEditing(false);
    setShowDeleteConfirm(false);
    setSaveError("");
    setEditData({});
  }

  // Enter edit mode
  function startEditing() {
    if (!selectedContract) return;
    setEditData({
      title: selectedContract.title,
      description: selectedContract.description || "",
      status: selectedContract.status,
      contract_type: selectedContract.contract_type,
      party_name: selectedContract.party_name || "",
      party_email: selectedContract.party_email || "",
      contract_amount: selectedContract.contract_amount ?? "",
      start_date: selectedContract.start_date || "",
      end_date: selectedContract.end_date || "",
      payment_terms: selectedContract.payment_terms || "",
      scope_of_work: selectedContract.scope_of_work || "",
      insurance_required: selectedContract.insurance_required ?? false,
      bond_required: selectedContract.bond_required ?? false,
      project_id: selectedContract.project_id || "",
    });
    setIsEditing(true);
    setSaveError("");
  }

  // Cancel edit mode
  function cancelEditing() {
    setIsEditing(false);
    setEditData({});
    setSaveError("");
  }

  // Save edits via PATCH
  async function handleSave() {
    if (!selectedContract) return;
    setSaving(true);
    setSaveError("");

    try {
      // Build payload with only changed fields
      const payload: Record<string, unknown> = {};
      if (editData.title !== selectedContract.title) payload.title = editData.title;
      if (editData.description !== (selectedContract.description || ""))
        payload.description = editData.description;
      if (editData.status !== selectedContract.status) payload.status = editData.status;
      if (editData.contract_type !== selectedContract.contract_type)
        payload.contract_type = editData.contract_type;
      if (editData.party_name !== (selectedContract.party_name || ""))
        payload.party_name = editData.party_name || null;
      if (editData.party_email !== (selectedContract.party_email || ""))
        payload.party_email = editData.party_email || null;

      const existingAmount = selectedContract.contract_amount ?? "";
      if (String(editData.contract_amount) !== String(existingAmount))
        payload.contract_amount = editData.contract_amount ? Number(editData.contract_amount) : null;

      if (editData.start_date !== (selectedContract.start_date || ""))
        payload.start_date = editData.start_date || null;
      if (editData.end_date !== (selectedContract.end_date || ""))
        payload.end_date = editData.end_date || null;
      if (editData.payment_terms !== (selectedContract.payment_terms || ""))
        payload.payment_terms = editData.payment_terms || null;
      if (editData.scope_of_work !== (selectedContract.scope_of_work || ""))
        payload.scope_of_work = editData.scope_of_work || null;
      if (editData.insurance_required !== selectedContract.insurance_required)
        payload.insurance_required = editData.insurance_required;
      if (editData.bond_required !== selectedContract.bond_required)
        payload.bond_required = editData.bond_required;
      if (editData.project_id !== (selectedContract.project_id || ""))
        payload.project_id = editData.project_id || null;

      if (Object.keys(payload).length === 0) {
        // Nothing changed
        setIsEditing(false);
        return;
      }

      const res = await fetch(`/api/contracts/${selectedContract.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t("failedToUpdateContract"));
      }

      closeDetail();
      router.refresh();
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : t("failedToUpdateContract"));
    } finally {
      setSaving(false);
    }
  }

  // Delete contract via DELETE
  async function handleDelete() {
    if (!selectedContract) return;
    setSaving(true);
    setSaveError("");

    try {
      const res = await fetch(`/api/contracts/${selectedContract.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t("failedToDeleteContract"));
      }

      closeDetail();
      router.refresh();
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : t("failedToDeleteContract"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="contracts-page">
      {/* Header */}
      <div className="contracts-header">
        <div>
          <h2>{t("contracts")}</h2>
          <p className="contracts-header-sub">
            {t("contractsTotal", { count: stats.total })}
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button className="btn-secondary" onClick={() => setShowImport(true)}>
            <Upload size={16} />
            {t("importCsv")}
          </button>
          <button className="btn-primary" onClick={() => setShowCreate(true)}>
            <Plus size={16} />
            {t("newContract")}
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="contracts-stats">
        <div className="contracts-stat-card stat-total">
          <div className="contracts-stat-icon">
            <FileText size={20} />
          </div>
          <div className="contracts-stat-info">
            <span className="contracts-stat-value">{stats.total}</span>
            <span className="contracts-stat-label">{t("totalContracts")}</span>
          </div>
        </div>
        <div className="contracts-stat-card stat-active">
          <div className="contracts-stat-icon">
            <CheckCircle2 size={20} />
          </div>
          <div className="contracts-stat-info">
            <span className="contracts-stat-value">{stats.active}</span>
            <span className="contracts-stat-label">{t("contractStatusActive")}</span>
          </div>
        </div>
        <div className="contracts-stat-card stat-expired">
          <div className="contracts-stat-icon">
            <AlertCircle size={20} />
          </div>
          <div className="contracts-stat-info">
            <span className="contracts-stat-value">{stats.expired}</span>
            <span className="contracts-stat-label">{t("contractStatusExpired")}</span>
          </div>
        </div>
        <div className="contracts-stat-card stat-value">
          <div className="contracts-stat-icon">
            <DollarSign size={20} />
          </div>
          <div className="contracts-stat-info">
            <span className="contracts-stat-value">
              {formatCurrency(stats.total_value)}
            </span>
            <span className="contracts-stat-label">{t("totalValue")}</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="contracts-filters">
        <div className="contracts-search">
          <Search size={16} className="contracts-search-icon" />
          <input
            type="text"
            placeholder={t("searchContractsPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="contracts-filter-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ContractStatus | "all")}
        >
          <option value="all">{t("allStatus")}</option>
          {(Object.keys(STATUS_LABELS) as ContractStatus[]).map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>

        <select
          className="contracts-filter-select"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as ContractType | "all")}
        >
          <option value="all">{t("allTypes")}</option>
          {(Object.keys(TYPE_LABELS) as ContractType[]).map((ct) => (
            <option key={ct} value={ct}>
              {TYPE_LABELS[ct]}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="contracts-empty">
          <div className="contracts-empty-icon">
            <FileText size={28} />
          </div>
          {contracts.length === 0 ? (
            <>
              <h3>{t("noContractsYet")}</h3>
              <p>{t("createYourFirstContract")}</p>
              <button className="btn-primary" onClick={() => setShowCreate(true)}>
                <Plus size={16} />
                {t("newContract")}
              </button>
            </>
          ) : (
            <>
              <h3>{t("noMatchingContracts")}</h3>
              <p>{t("tryAdjustingSearch")}</p>
            </>
          )}
        </div>
      ) : (
        <div className="contracts-table-wrap">
          <table className="contracts-table">
            <thead>
              <tr>
                <th>{t("contractNumber")}</th>
                <th>{t("title")}</th>
                <th>{t("type")}</th>
                <th>{t("party")}</th>
                <th>{t("amount")}</th>
                <th>{t("status")}</th>
                <th>{t("startDate")}</th>
                <th>{t("endDate")}</th>
                <th>{t("jeColumnHeader")}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((contract) => (
                <tr
                  key={contract.id}
                  onClick={() => openDetail(contract)}
                  className="contracts-table-row"
                >
                  <td className="contracts-number-cell">{contract.contract_number}</td>
                  <td className="contracts-title-cell">{contract.title}</td>
                  <td>
                    <span className="contracts-type-badge">
                      {TYPE_LABELS[contract.contract_type] ?? contract.contract_type}
                    </span>
                  </td>
                  <td className="contracts-party-cell">
                    {contract.party_name || "--"}
                  </td>
                  <td className="contracts-amount-cell">
                    {formatCurrency(contract.contract_amount)}
                  </td>
                  <td>
                    <span className={`contracts-status-badge status-${contract.status}`}>
                      {STATUS_LABELS[contract.status] ?? contract.status}
                    </span>
                  </td>
                  <td className="contracts-date-cell">
                    {formatDateShortWithLocale(contract.start_date, dateLocale)}
                  </td>
                  <td className="contracts-date-cell">
                    {formatDateShortWithLocale(contract.end_date, dateLocale)}
                  </td>
                  <td>
                    {linkedJEs[contract.id]?.length ? (
                      linkedJEs[contract.id].map((je) => (
                        <Link
                          key={je.id}
                          href={`/financial/general-ledger?entry=${je.entry_number}`}
                          className="je-link"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {je.entry_number}
                        </Link>
                      ))
                    ) : (
                      <span style={{ color: "var(--muted)" }}>--</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Contract Modal */}
      {showCreate && (
        <div className="contracts-modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="contracts-modal" onClick={(e) => e.stopPropagation()}>
            <div className="contracts-modal-header">
              <h3>{t("createNewContract")}</h3>
              <button
                className="contracts-modal-close"
                onClick={() => setShowCreate(false)}
              >
                <X size={18} />
              </button>
            </div>

            {createError && (
              <div className="contracts-form-error">{createError}</div>
            )}

            <form onSubmit={handleCreate} className="contracts-form">
              <div className="contracts-form-group">
                <label className="contracts-form-label">{t("titleRequired")}</label>
                <input
                  type="text"
                  className="contracts-form-input"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder={t("contractTitlePlaceholder")}
                  required
                />
              </div>

              <div className="contracts-form-row">
                <div className="contracts-form-group">
                  <label className="contracts-form-label">{t("contractType")}</label>
                  <select
                    className="contracts-form-select"
                    value={formData.contract_type}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        contract_type: e.target.value as ContractType,
                      })
                    }
                  >
                    {(Object.keys(TYPE_LABELS) as ContractType[]).map((ct) => (
                      <option key={ct} value={ct}>
                        {TYPE_LABELS[ct]}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="contracts-form-group">
                  <label className="contracts-form-label">{t("project")}</label>
                  <select
                    className="contracts-form-select"
                    value={formData.project_id}
                    onChange={(e) =>
                      setFormData({ ...formData, project_id: e.target.value })
                    }
                  >
                    <option value="">{t("noProject")}</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="contracts-form-row">
                <div className="contracts-form-group">
                  <label className="contracts-form-label">{t("partyName")}</label>
                  <input
                    type="text"
                    className="contracts-form-input"
                    value={formData.party_name}
                    onChange={(e) =>
                      setFormData({ ...formData, party_name: e.target.value })
                    }
                    placeholder={t("companyOrIndividualNamePlaceholder")}
                  />
                </div>

                <div className="contracts-form-group">
                  <label className="contracts-form-label">{t("partyEmail")}</label>
                  <input
                    type="email"
                    className="contracts-form-input"
                    value={formData.party_email}
                    onChange={(e) =>
                      setFormData({ ...formData, party_email: e.target.value })
                    }
                    placeholder="contact@example.com"
                  />
                </div>
              </div>

              <div className="contracts-form-row">
                <div className="contracts-form-group">
                  <label className="contracts-form-label">{t("contractAmount")}</label>
                  <input
                    type="number"
                    className="contracts-form-input"
                    value={formData.contract_amount}
                    onChange={(e) =>
                      setFormData({ ...formData, contract_amount: e.target.value })
                    }
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                  />
                </div>

                <div className="contracts-form-group">
                  <label className="contracts-form-label">{t("paymentTerms")}</label>
                  <select
                    className="contracts-form-select"
                    value={formData.payment_terms}
                    onChange={(e) =>
                      setFormData({ ...formData, payment_terms: e.target.value })
                    }
                  >
                    <option value="">{t("selectTermsPlaceholder")}</option>
                    {Object.entries(PAYMENT_TERMS_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="contracts-form-row">
                <div className="contracts-form-group">
                  <label className="contracts-form-label">{t("startDate")}</label>
                  <input
                    type="date"
                    className="contracts-form-input"
                    value={formData.start_date}
                    onChange={(e) =>
                      setFormData({ ...formData, start_date: e.target.value })
                    }
                  />
                </div>

                <div className="contracts-form-group">
                  <label className="contracts-form-label">{t("endDate")}</label>
                  <input
                    type="date"
                    className="contracts-form-input"
                    value={formData.end_date}
                    onChange={(e) =>
                      setFormData({ ...formData, end_date: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="contracts-form-group">
                <label className="contracts-form-label">{t("scopeOfWork")}</label>
                <textarea
                  className="contracts-form-textarea"
                  value={formData.scope_of_work}
                  onChange={(e) =>
                    setFormData({ ...formData, scope_of_work: e.target.value })
                  }
                  placeholder={t("describeScopeOfWorkPlaceholder")}
                  rows={4}
                />
              </div>

              <div className="contracts-form-group">
                <label className="contracts-form-checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.insurance_required}
                    onChange={(e) =>
                      setFormData({ ...formData, insurance_required: e.target.checked })
                    }
                  />
                  {t("insuranceRequired")}
                </label>
              </div>

              <div className="contracts-form-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowCreate(false)}
                >
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={creating || !formData.title.trim()}
                >
                  {creating ? t("creating") : t("createContract")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail / Edit / Delete Modal */}
      {selectedContract && (
        <div className="contracts-modal-overlay" onClick={closeDetail}>
          <div className="contracts-modal" onClick={(e) => e.stopPropagation()}>
            <div className="contracts-modal-header">
              <h3>
                {isEditing
                  ? t("editContractNumber", { number: selectedContract.contract_number })
                  : selectedContract.contract_number}
              </h3>
              <button className="contracts-modal-close" onClick={closeDetail}>
                <X size={18} />
              </button>
            </div>

            {saveError && (
              <div className="contracts-form-error">{saveError}</div>
            )}

            {/* Delete Confirmation */}
            {showDeleteConfirm && (
              <div
                className="contracts-modal-overlay"
                onClick={() => setShowDeleteConfirm(false)}
                style={{
                  position: "absolute",
                  zIndex: 1000,
                  borderRadius: "inherit",
                }}
              >
                <div
                  className="contracts-modal"
                  onClick={(e) => e.stopPropagation()}
                  style={{ maxWidth: 440 }}
                >
                  <div className="contracts-modal-header">
                    <h3>{t("deleteContract")}</h3>
                    <button
                      className="contracts-modal-close"
                      onClick={() => setShowDeleteConfirm(false)}
                    >
                      <X size={18} />
                    </button>
                  </div>
                  <div style={{ padding: "1rem 1.5rem" }}>
                    <p>
                      {t("confirmDeleteContract", { number: selectedContract.contract_number })}
                    </p>
                  </div>
                  <div className="contracts-form-actions">
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setShowDeleteConfirm(false)}
                      disabled={saving}
                    >
                      {t("cancel")}
                    </button>
                    <button
                      type="button"
                      className="btn-primary"
                      style={{ backgroundColor: "var(--color-danger, #dc2626)" }}
                      onClick={handleDelete}
                      disabled={saving}
                    >
                      {saving ? t("deleting") : t("delete")}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Read-only detail view */}
            {!isEditing && (
              <div className="contracts-form" style={{ pointerEvents: showDeleteConfirm ? "none" : "auto" }}>
                <div className="contracts-form-group">
                  <label className="contracts-form-label">{t("title")}</label>
                  <div className="contracts-detail-value">
                    {selectedContract.title}
                  </div>
                </div>

                <div className="contracts-form-row">
                  <div className="contracts-form-group">
                    <label className="contracts-form-label">{t("status")}</label>
                    <div className="contracts-detail-value">
                      <span className={`contracts-status-badge status-${selectedContract.status}`}>
                        {STATUS_LABELS[selectedContract.status] ?? selectedContract.status}
                      </span>
                    </div>
                  </div>
                  <div className="contracts-form-group">
                    <label className="contracts-form-label">{t("type")}</label>
                    <div className="contracts-detail-value">
                      <span className="contracts-type-badge">
                        {TYPE_LABELS[selectedContract.contract_type] ?? selectedContract.contract_type}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="contracts-form-row">
                  <div className="contracts-form-group">
                    <label className="contracts-form-label">{t("partyName")}</label>
                    <div className={`contracts-detail-value${!selectedContract.party_name ? " contracts-detail-value--empty" : ""}`}>
                      {selectedContract.party_name || t("notSet")}
                    </div>
                  </div>
                  <div className="contracts-form-group">
                    <label className="contracts-form-label">{t("partyEmail")}</label>
                    <div className={`contracts-detail-value${!selectedContract.party_email ? " contracts-detail-value--empty" : ""}`}>
                      {selectedContract.party_email || t("notSet")}
                    </div>
                  </div>
                </div>

                <div className="contracts-form-row">
                  <div className="contracts-form-group">
                    <label className="contracts-form-label">{t("amount")}</label>
                    <div className="contracts-detail-value">
                      {formatCurrency(selectedContract.contract_amount)}
                    </div>
                  </div>
                  <div className="contracts-form-group">
                    <label className="contracts-form-label">{t("paymentTerms")}</label>
                    <div className={`contracts-detail-value${!selectedContract.payment_terms ? " contracts-detail-value--empty" : ""}`}>
                      {selectedContract.payment_terms
                        ? PAYMENT_TERMS_LABELS[selectedContract.payment_terms] || selectedContract.payment_terms
                        : t("notSet")}
                    </div>
                  </div>
                </div>

                <div className="contracts-form-row">
                  <div className="contracts-form-group">
                    <label className="contracts-form-label">{t("startDate")}</label>
                    <div className="contracts-detail-value">
                      {formatDateWithLocale(selectedContract.start_date, dateLocale)}
                    </div>
                  </div>
                  <div className="contracts-form-group">
                    <label className="contracts-form-label">{t("endDate")}</label>
                    <div className="contracts-detail-value">
                      {formatDateWithLocale(selectedContract.end_date, dateLocale)}
                    </div>
                  </div>
                </div>

                {selectedContract.scope_of_work && (
                  <div className="contracts-form-group">
                    <label className="contracts-form-label">{t("scopeOfWork")}</label>
                    <div className="contracts-detail-value--multiline">
                      {selectedContract.scope_of_work}
                    </div>
                  </div>
                )}

                <div className="contracts-form-row">
                  <div className="contracts-form-group">
                    <label className="contracts-form-label">{t("insuranceRequired")}</label>
                    <div className="contracts-detail-value">
                      {selectedContract.insurance_required ? t("yes") : t("no")}
                    </div>
                  </div>
                  <div className="contracts-form-group">
                    <label className="contracts-form-label">{t("bondRequired")}</label>
                    <div className="contracts-detail-value">
                      {selectedContract.bond_required ? t("yes") : t("no")}
                    </div>
                  </div>
                </div>

                {selectedContract.project && (
                  <div className="contracts-form-group">
                    <label className="contracts-form-label">{t("project")}</label>
                    <div className="contracts-detail-value">
                      {selectedContract.project.name}
                    </div>
                  </div>
                )}

                <div className="contracts-form-row">
                  <div className="contracts-form-group">
                    <label className="contracts-form-label">{t("created")}</label>
                    <div className="contracts-detail-value">
                      {formatDateWithLocale(selectedContract.created_at, dateLocale)}
                    </div>
                  </div>
                  <div className="contracts-form-group">
                    <label className="contracts-form-label">{t("updated")}</label>
                    <div className="contracts-detail-value">
                      {formatDateWithLocale(selectedContract.updated_at, dateLocale)}
                    </div>
                  </div>
                </div>

                <div className="contracts-form-actions">
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ color: "var(--color-danger, #dc2626)" }}
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    <Trash2 size={16} />
                    {t("delete")}
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={closeDetail}
                  >
                    {t("close")}
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={startEditing}
                  >
                    <Edit3 size={16} />
                    {t("edit")}
                  </button>
                </div>
              </div>
            )}

            {/* Edit view */}
            {isEditing && (
              <div className="contracts-form">
                <div className="contracts-form-group">
                  <label className="contracts-form-label">{t("titleRequired")}</label>
                  <input
                    type="text"
                    className="contracts-form-input"
                    value={(editData.title as string) || ""}
                    onChange={(e) =>
                      setEditData({ ...editData, title: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="contracts-form-group">
                  <label className="contracts-form-label">{t("description")}</label>
                  <textarea
                    className="contracts-form-textarea"
                    value={(editData.description as string) || ""}
                    onChange={(e) =>
                      setEditData({ ...editData, description: e.target.value })
                    }
                    rows={3}
                  />
                </div>

                <div className="contracts-form-row">
                  <div className="contracts-form-group">
                    <label className="contracts-form-label">{t("status")}</label>
                    <select
                      className="contracts-form-select"
                      value={(editData.status as string) || "draft"}
                      onChange={(e) =>
                        setEditData({ ...editData, status: e.target.value })
                      }
                    >
                      {(Object.keys(STATUS_LABELS) as ContractStatus[]).map((s) => (
                        <option key={s} value={s}>
                          {STATUS_LABELS[s]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="contracts-form-group">
                    <label className="contracts-form-label">{t("type")}</label>
                    <select
                      className="contracts-form-select"
                      value={(editData.contract_type as string) || "subcontractor"}
                      onChange={(e) =>
                        setEditData({ ...editData, contract_type: e.target.value })
                      }
                    >
                      {(Object.keys(TYPE_LABELS) as ContractType[]).map((ct) => (
                        <option key={ct} value={ct}>
                          {TYPE_LABELS[ct]}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="contracts-form-row">
                  <div className="contracts-form-group">
                    <label className="contracts-form-label">{t("partyName")}</label>
                    <input
                      type="text"
                      className="contracts-form-input"
                      value={(editData.party_name as string) || ""}
                      onChange={(e) =>
                        setEditData({ ...editData, party_name: e.target.value })
                      }
                    />
                  </div>
                  <div className="contracts-form-group">
                    <label className="contracts-form-label">{t("partyEmail")}</label>
                    <input
                      type="email"
                      className="contracts-form-input"
                      value={(editData.party_email as string) || ""}
                      onChange={(e) =>
                        setEditData({ ...editData, party_email: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="contracts-form-row">
                  <div className="contracts-form-group">
                    <label className="contracts-form-label">{t("amount")}</label>
                    <input
                      type="number"
                      className="contracts-form-input"
                      value={editData.contract_amount as string ?? ""}
                      onChange={(e) =>
                        setEditData({ ...editData, contract_amount: e.target.value })
                      }
                      step="0.01"
                      min="0"
                    />
                  </div>
                  <div className="contracts-form-group">
                    <label className="contracts-form-label">{t("paymentTerms")}</label>
                    <select
                      className="contracts-form-select"
                      value={(editData.payment_terms as string) || ""}
                      onChange={(e) =>
                        setEditData({ ...editData, payment_terms: e.target.value })
                      }
                    >
                      <option value="">{t("selectTermsPlaceholder")}</option>
                      {Object.entries(PAYMENT_TERMS_LABELS).map(([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="contracts-form-row">
                  <div className="contracts-form-group">
                    <label className="contracts-form-label">{t("startDate")}</label>
                    <input
                      type="date"
                      className="contracts-form-input"
                      value={(editData.start_date as string) || ""}
                      onChange={(e) =>
                        setEditData({ ...editData, start_date: e.target.value })
                      }
                    />
                  </div>
                  <div className="contracts-form-group">
                    <label className="contracts-form-label">{t("endDate")}</label>
                    <input
                      type="date"
                      className="contracts-form-input"
                      value={(editData.end_date as string) || ""}
                      onChange={(e) =>
                        setEditData({ ...editData, end_date: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="contracts-form-group">
                  <label className="contracts-form-label">{t("scopeOfWork")}</label>
                  <textarea
                    className="contracts-form-textarea"
                    value={(editData.scope_of_work as string) || ""}
                    onChange={(e) =>
                      setEditData({ ...editData, scope_of_work: e.target.value })
                    }
                    rows={4}
                  />
                </div>

                <div className="contracts-form-group">
                  <label className="contracts-form-label">{t("project")}</label>
                  <select
                    className="contracts-form-select"
                    value={(editData.project_id as string) || ""}
                    onChange={(e) =>
                      setEditData({ ...editData, project_id: e.target.value })
                    }
                  >
                    <option value="">{t("noProject")}</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="contracts-form-row">
                  <div className="contracts-form-group">
                    <label className="contracts-form-checkbox-label">
                      <input
                        type="checkbox"
                        checked={(editData.insurance_required as boolean) ?? false}
                        onChange={(e) =>
                          setEditData({ ...editData, insurance_required: e.target.checked })
                        }
                      />
                      {t("insuranceRequired")}
                    </label>
                  </div>
                  <div className="contracts-form-group">
                    <label className="contracts-form-checkbox-label">
                      <input
                        type="checkbox"
                        checked={(editData.bond_required as boolean) ?? false}
                        onChange={(e) =>
                          setEditData({ ...editData, bond_required: e.target.checked })
                        }
                      />
                      {t("bondRequired")}
                    </label>
                  </div>
                </div>

                <div className="contracts-form-actions">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={cancelEditing}
                    disabled={saving}
                  >
                    {t("cancel")}
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={handleSave}
                    disabled={saving || !(editData.title as string)?.trim()}
                  >
                    {saving ? t("saving") : t("saveChanges")}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showImport && (
        <ImportModal
          entityName={t("contracts")}
          columns={IMPORT_COLUMNS}
          sampleData={IMPORT_SAMPLE}
          onImport={handleImport}
          onClose={() => setShowImport(false)}
        />
      )}
    </div>
  );
}
