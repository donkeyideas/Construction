"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";
import { FileText, Plus, AlertTriangle, X, Edit3, Trash2, Upload } from "lucide-react";
import { formatCurrency, formatPercent, formatDateSafe } from "@/lib/utils/format";
import ImportModal from "@/components/ImportModal";
import type { ImportColumn } from "@/lib/utils/csv-parser";

export type BidStatus =
  | "in_progress"
  | "submitted"
  | "won"
  | "lost"
  | "no_bid";

export interface Bid {
  id: string;
  bid_number: string;
  project_name: string;
  client_name: string | null;
  bid_amount: number | null;
  estimated_cost: number | null;
  margin_pct: number | null;
  status: BidStatus;
  due_date: string | null;
  scope_description: string | null;
  created_at: string;
}

interface BidsClientProps {
  bids: Bid[];
  statusFilter: string | undefined;
  dueSoonCount: number;
}

const IMPORT_SAMPLE: Record<string, string>[] = [
  { project_name: "Downtown Office Renovation", client_name: "Metro Corp", bid_amount: "1500000", due_date: "2026-02-28", bid_type: "competitive", notes: "Pre-qualified, strong relationship" },
  { project_name: "Highway Bridge Repair", client_name: "State DOT", bid_amount: "3200000", due_date: "2026-03-15", bid_type: "public", notes: "Prevailing wage required" },
  { project_name: "Retail Storefront Build-Out", client_name: "Sunrise Shops LLC", bid_amount: "425000", due_date: "2026-04-01", bid_type: "negotiated", notes: "Repeat client, design-build" },
];

export default function BidsClient({
  bids,
  statusFilter,
  dueSoonCount,
}: BidsClientProps) {
  const router = useRouter();
  const t = useTranslations("app");
  const locale = useLocale();
  const dateLocale = locale === "es" ? "es" : "en-US";

  const STATUS_LABELS: Record<BidStatus, string> = {
    in_progress: t("bidStatusInProgress"),
    submitted: t("bidStatusSubmitted"),
    won: t("bidStatusWon"),
    lost: t("bidStatusLost"),
    no_bid: t("bidStatusNoBid"),
  };

  const IMPORT_COLUMNS: ImportColumn[] = [
    { key: "project_name", label: t("projectName"), required: true },
    { key: "client_name", label: t("clientName"), required: false },
    { key: "bid_amount", label: t("bidAmountDollar"), required: false, type: "number" },
    { key: "due_date", label: t("dueDate"), required: false, type: "date" },
    { key: "bid_type", label: t("bidType"), required: false },
    { key: "notes", label: t("notes"), required: false },
  ];

  const [selectedBid, setSelectedBid] = useState<Bid | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Bid>>({});
  const [showImport, setShowImport] = useState(false);

  const now = new Date();
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  function isDueSoon(bid: Bid): boolean {
    if (!bid.due_date) return false;
    const dueDate = new Date(bid.due_date);
    return dueDate >= now && dueDate <= sevenDaysFromNow;
  }

  function getMarginClass(marginPct: number | null): string {
    if (marginPct == null) return "";
    if (marginPct >= 15) return "margin-positive";
    if (marginPct >= 5) return "margin-low";
    return "margin-negative";
  }

  function handleRowClick(bid: Bid) {
    setSelectedBid(bid);
    setIsEditing(false);
    setIsDeleting(false);
    setError(null);
  }

  function handleEdit() {
    if (!selectedBid) return;
    setFormData({
      project_name: selectedBid.project_name,
      client_name: selectedBid.client_name,
      bid_amount: selectedBid.bid_amount,
      estimated_cost: selectedBid.estimated_cost,
      margin_pct: selectedBid.margin_pct,
      status: selectedBid.status,
      due_date: selectedBid.due_date,
      scope_description: selectedBid.scope_description,
    });
    setIsEditing(true);
    setError(null);
  }

  function handleClose() {
    setSelectedBid(null);
    setIsEditing(false);
    setIsDeleting(false);
    setError(null);
    setFormData({});
  }

  async function handleSave() {
    if (!selectedBid) return;

    try {
      const response = await fetch(`/api/crm/bids/${selectedBid.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || t("failedToUpdateBid"));
      }

      router.refresh();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("failedToUpdateBid"));
    }
  }

  async function handleDelete() {
    if (!selectedBid) return;

    try {
      const response = await fetch(`/api/crm/bids/${selectedBid.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || t("failedToDeleteBid"));
      }

      router.refresh();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("failedToDeleteBid"));
    }
  }

  async function handleImport(rows: Record<string, string>[]) {
    const res = await fetch("/api/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entity: "bids", rows }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || t("importFailed"));
    router.refresh();
    return { success: data.success, errors: data.errors };
  }

  const isEmpty = bids.length === 0;

  return (
    <div>
      {/* Header */}
      <div className="crm-header">
        <div>
          <h2>{t("bidManagement")}</h2>
          <p className="crm-header-sub">
            {t("trackBidsFromPreparationThroughAward")}
          </p>
        </div>
        <div className="crm-header-actions">
          <Link href="/crm" className="ui-btn ui-btn-md ui-btn-secondary">
            {t("pipeline")}
          </Link>
          <button className="btn-secondary" onClick={() => setShowImport(true)}>
            <Upload size={16} />
            {t("importCsv")}
          </button>
          <Link
            href="/crm/bids/new"
            className="ui-btn ui-btn-md ui-btn-primary"
          >
            <Plus size={16} />
            {t("newBid")}
          </Link>
        </div>
      </div>

      {/* Due Soon Alert */}
      {dueSoonCount > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "12px 18px",
            background: "color-mix(in srgb, var(--color-amber) 12%, var(--bg))",
            border: "1px solid var(--color-amber)",
            borderRadius: 10,
            marginBottom: 20,
            fontSize: "0.85rem",
            fontWeight: 500,
            color: "var(--text)",
          }}
        >
          <AlertTriangle size={18} style={{ color: "var(--color-amber)" }} />
          <span>
            {t("bidsDueSoon", { count: dueSoonCount })}
          </span>
        </div>
      )}

      {/* Status Filter Tabs */}
      <div className="people-tab-bar">
        <Link
          href="/crm/bids"
          className={`people-tab ${!statusFilter ? "active" : ""}`}
        >
          {t("all")}
        </Link>
        <Link
          href="/crm/bids?status=in_progress"
          className={`people-tab ${statusFilter === "in_progress" ? "active" : ""}`}
        >
          {t("bidStatusInProgress")}
        </Link>
        <Link
          href="/crm/bids?status=submitted"
          className={`people-tab ${statusFilter === "submitted" ? "active" : ""}`}
        >
          {t("bidStatusSubmitted")}
        </Link>
        <Link
          href="/crm/bids?status=won"
          className={`people-tab ${statusFilter === "won" ? "active" : ""}`}
        >
          {t("bidStatusWon")}
        </Link>
        <Link
          href="/crm/bids?status=lost"
          className={`people-tab ${statusFilter === "lost" ? "active" : ""}`}
        >
          {t("bidStatusLost")}
        </Link>
      </div>

      {/* Bids Table */}
      {isEmpty ? (
        <div className="card" style={{ textAlign: "center", padding: "64px 24px" }}>
          <div style={{ marginBottom: 16, color: "var(--border)" }}>
            <FileText size={48} />
          </div>
          <div
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "1.15rem",
              fontWeight: 600,
              marginBottom: 8,
            }}
          >
            {t("noBidsFound")}
          </div>
          <p
            style={{
              color: "var(--muted)",
              fontSize: "0.85rem",
              maxWidth: 400,
              margin: "0 auto 20px",
              lineHeight: 1.5,
            }}
          >
            {statusFilter
              ? t("noBidsWithStatus", { status: STATUS_LABELS[statusFilter as BidStatus] })
              : t("createYourFirstBid")}
          </p>
          {!statusFilter && (
            <Link
              href="/crm/bids/new"
              className="ui-btn ui-btn-md ui-btn-primary"
            >
              <Plus size={16} />
              {t("createBid")}
            </Link>
          )}
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table className="bid-table">
              <thead>
                <tr>
                  <th>{t("bidNumber")}</th>
                  <th>{t("projectName")}</th>
                  <th>{t("client")}</th>
                  <th style={{ textAlign: "right" }}>{t("bidAmount")}</th>
                  <th style={{ textAlign: "right" }}>{t("estimatedCost")}</th>
                  <th style={{ textAlign: "right" }}>{t("margin")}</th>
                  <th>{t("status")}</th>
                  <th>{t("dueDate")}</th>
                </tr>
              </thead>
              <tbody>
                {bids.map((bid) => {
                  const dueSoon = isDueSoon(bid);
                  const marginClass = getMarginClass(bid.margin_pct);

                  return (
                    <tr
                      key={bid.id}
                      className={dueSoon ? "bid-due-soon" : ""}
                      onClick={() => handleRowClick(bid)}
                      style={{ cursor: "pointer" }}
                    >
                      <td style={{ fontWeight: 600, fontSize: "0.82rem" }}>
                        {bid.bid_number}
                      </td>
                      <td>{bid.project_name}</td>
                      <td style={{ color: "var(--muted)" }}>
                        {bid.client_name || "--"}
                      </td>
                      <td className="amount-col">
                        {bid.bid_amount != null
                          ? formatCurrency(bid.bid_amount)
                          : "--"}
                      </td>
                      <td className="amount-col" style={{ color: "var(--muted)" }}>
                        {bid.estimated_cost != null
                          ? formatCurrency(bid.estimated_cost)
                          : "--"}
                      </td>
                      <td className={`margin-col ${marginClass}`}>
                        {bid.margin_pct != null
                          ? formatPercent(bid.margin_pct)
                          : "--"}
                      </td>
                      <td>
                        <span
                          className={`bid-status bid-status-${bid.status}`}
                        >
                          {STATUS_LABELS[bid.status]}
                        </span>
                      </td>
                      <td>
                        {bid.due_date ? (
                          <span
                            style={{
                              color: dueSoon
                                ? "var(--color-amber)"
                                : "var(--text)",
                              fontWeight: dueSoon ? 600 : 400,
                            }}
                          >
                            {formatDateSafe(bid.due_date)}
                          </span>
                        ) : (
                          "--"
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showImport && (
        <ImportModal
          entityName={t("bids")}
          columns={IMPORT_COLUMNS}
          sampleData={IMPORT_SAMPLE}
          onImport={handleImport}
          onClose={() => { setShowImport(false); router.refresh(); }}
        />
      )}

      {/* Detail/Edit Modal */}
      {selectedBid && (
        <div className="ticket-modal-overlay" onClick={handleClose}>
          <div
            className="ticket-modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 600 }}
          >
            {/* Header */}
            <div className="ticket-modal-header">
              <div>
                <h3 style={{ fontSize: "1.1rem", marginBottom: 4 }}>
                  {isEditing ? t("editBid") : selectedBid.bid_number}
                </h3>
                {!isEditing && (
                  <p style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
                    {selectedBid.project_name}
                  </p>
                )}
              </div>
              <button
                className="ticket-modal-close"
                onClick={handleClose}
                aria-label={t("close")}
              >
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            {isDeleting ? (
              <div className="ticket-delete-confirm">
                <p>
                  {t("confirmDeleteBid", { number: selectedBid.bid_number })}
                </p>
                {error && <div className="ticket-form-error">{error}</div>}
                <div className="ticket-delete-actions">
                  <button
                    className="btn-secondary"
                    onClick={() => {
                      setIsDeleting(false);
                      setError(null);
                    }}
                  >
                    {t("cancel")}
                  </button>
                  <button className="btn-danger" onClick={handleDelete}>
                    {t("deleteBid")}
                  </button>
                </div>
              </div>
            ) : isEditing ? (
              <form
                className="ticket-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSave();
                }}
              >
                {error && <div className="ticket-form-error">{error}</div>}

                <div className="ticket-form-group">
                  <label className="ticket-form-label">{t("projectName")}</label>
                  <input
                    type="text"
                    className="ticket-form-input"
                    value={formData.project_name || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, project_name: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="ticket-form-group">
                  <label className="ticket-form-label">{t("clientName")}</label>
                  <input
                    type="text"
                    className="ticket-form-input"
                    value={formData.client_name || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, client_name: e.target.value })
                    }
                  />
                </div>

                <div className="ticket-form-row">
                  <div className="ticket-form-group">
                    <label className="ticket-form-label">{t("bidAmount")}</label>
                    <input
                      type="number"
                      step="0.01"
                      className="ticket-form-input"
                      value={formData.bid_amount ?? ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          bid_amount: e.target.value
                            ? parseFloat(e.target.value)
                            : null,
                        })
                      }
                    />
                  </div>

                  <div className="ticket-form-group">
                    <label className="ticket-form-label">{t("estimatedCost")}</label>
                    <input
                      type="number"
                      step="0.01"
                      className="ticket-form-input"
                      value={formData.estimated_cost ?? ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          estimated_cost: e.target.value
                            ? parseFloat(e.target.value)
                            : null,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="ticket-form-row">
                  <div className="ticket-form-group">
                    <label className="ticket-form-label">{t("marginPercent")}</label>
                    <input
                      type="number"
                      step="0.1"
                      className="ticket-form-input"
                      value={formData.margin_pct ?? ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          margin_pct: e.target.value
                            ? parseFloat(e.target.value)
                            : null,
                        })
                      }
                    />
                  </div>

                  <div className="ticket-form-group">
                    <label className="ticket-form-label">{t("status")}</label>
                    <select
                      className="ticket-form-select"
                      value={formData.status || "in_progress"}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          status: e.target.value as BidStatus,
                        })
                      }
                    >
                      <option value="in_progress">{t("bidStatusInProgress")}</option>
                      <option value="submitted">{t("bidStatusSubmitted")}</option>
                      <option value="won">{t("bidStatusWon")}</option>
                      <option value="lost">{t("bidStatusLost")}</option>
                      <option value="no_bid">{t("bidStatusNoBid")}</option>
                    </select>
                  </div>
                </div>

                <div className="ticket-form-group">
                  <label className="ticket-form-label">{t("dueDate")}</label>
                  <input
                    type="date"
                    className="ticket-form-input"
                    value={formData.due_date || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, due_date: e.target.value })
                    }
                  />
                </div>

                <div className="ticket-form-group">
                  <label className="ticket-form-label">{t("scopeDescription")}</label>
                  <textarea
                    className="ticket-form-textarea"
                    rows={4}
                    value={formData.scope_description || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, scope_description: e.target.value })
                    }
                  />
                </div>

                <div className="ticket-form-actions">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      setIsEditing(false);
                      setError(null);
                    }}
                  >
                    {t("cancel")}
                  </button>
                  <button type="submit" className="btn-primary">
                    {t("saveChanges")}
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div className="ticket-detail-body">
                  <div className="ticket-detail-row">
                    <span className="ticket-detail-label">{t("bidNumber")}</span>
                    <span>{selectedBid.bid_number}</span>
                  </div>
                  <div className="ticket-detail-row">
                    <span className="ticket-detail-label">{t("projectName")}</span>
                    <span>{selectedBid.project_name}</span>
                  </div>
                  <div className="ticket-detail-row">
                    <span className="ticket-detail-label">{t("client")}</span>
                    <span>{selectedBid.client_name || "--"}</span>
                  </div>
                  <div className="ticket-detail-row">
                    <span className="ticket-detail-label">{t("bidAmount")}</span>
                    <span>
                      {selectedBid.bid_amount != null
                        ? formatCurrency(selectedBid.bid_amount)
                        : "--"}
                    </span>
                  </div>
                  <div className="ticket-detail-row">
                    <span className="ticket-detail-label">{t("estimatedCost")}</span>
                    <span>
                      {selectedBid.estimated_cost != null
                        ? formatCurrency(selectedBid.estimated_cost)
                        : "--"}
                    </span>
                  </div>
                  <div className="ticket-detail-row">
                    <span className="ticket-detail-label">{t("margin")}</span>
                    <span>
                      {selectedBid.margin_pct != null
                        ? formatPercent(selectedBid.margin_pct)
                        : "--"}
                    </span>
                  </div>
                  <div className="ticket-detail-row">
                    <span className="ticket-detail-label">{t("status")}</span>
                    <span
                      className={`bid-status bid-status-${selectedBid.status}`}
                    >
                      {STATUS_LABELS[selectedBid.status]}
                    </span>
                  </div>
                  <div className="ticket-detail-row">
                    <span className="ticket-detail-label">{t("dueDate")}</span>
                    <span>
                      {selectedBid.due_date
                        ? formatDateSafe(selectedBid.due_date)
                        : "--"}
                    </span>
                  </div>
                  {selectedBid.scope_description && (
                    <div className="ticket-detail-row">
                      <span className="ticket-detail-label">{t("scopeDescription")}</span>
                      <span style={{ whiteSpace: "pre-wrap" }}>
                        {selectedBid.scope_description}
                      </span>
                    </div>
                  )}
                  <div className="ticket-detail-row">
                    <span className="ticket-detail-label">{t("created")}</span>
                    <span>
                      {formatDateSafe(selectedBid.created_at)}
                    </span>
                  </div>
                </div>

                <div className="ticket-form-actions">
                  <button
                    className="btn-danger-outline"
                    onClick={() => setIsDeleting(true)}
                  >
                    <Trash2 size={16} />
                    {t("delete")}
                  </button>
                  <button className="btn-primary" onClick={handleEdit}>
                    <Edit3 size={16} />
                    {t("editBid")}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
