"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { getLocalToday } from "@/lib/utils/timezone";
import {
  ArrowLeft,
  Pencil,
  X,
  Trash2,
  Grid3x3,
  Building2,
  ImageIcon,
  Upload,
  Loader2,
  Plus,
  KeyRound,
  Check,
  Copy,
  DollarSign,
  Megaphone,
  CreditCard,
  CheckCircle2,
} from "lucide-react";
import { GATEWAY_PROVIDERS } from "@/lib/payments/gateway";
import type {
  PropertyRow,
  UnitRow,
  LeaseRow,
  MaintenanceRequestRow,
  PropertyFinancials,
  AnnouncementRow,
  PropertyRentPayment,
} from "@/lib/queries/properties";
import type { SectionTransactionSummary } from "@/lib/queries/section-transactions";
import SectionTransactions from "@/components/SectionTransactions";
import { formatCurrency, formatPercent, formatDateSafe } from "@/lib/utils/format";
import {
  getDefaultUsefulLife,
  getDepreciableBasis,
  getMonthlyDepreciation,
  getEstimatedLandValue,
  buildYearlySchedule,
} from "@/lib/utils/property-depreciation";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface PropertyDetailClientProps {
  property: PropertyRow;
  units: UnitRow[];
  leases: LeaseRow[];
  maintenanceRequests: MaintenanceRequestRow[];
  financials: PropertyFinancials;
  announcements: AnnouncementRow[];
  rentPayments: PropertyRentPayment[];
  transactions: SectionTransactionSummary;
  depreciationAccumulated: number;
}

/* ------------------------------------------------------------------ */
/*  Helper Functions                                                    */
/* ------------------------------------------------------------------ */

function toInputDate(d: string | null | undefined): string {
  if (!d) return "";
  return d.slice(0, 10);
}

/* ------------------------------------------------------------------ */
/*  Badge Components                                                    */
/* ------------------------------------------------------------------ */

function PropertyTypeBadge({ type }: { type: string }) {
  const t = useTranslations("app");
  const labels: Record<string, string> = {
    residential: t("propTypeResidential"),
    commercial: t("propTypeCommercial"),
    industrial: t("propTypeIndustrial"),
    mixed_use: t("propTypeMixedUse"),
  };
  const variants: Record<string, string> = {
    residential: "badge-green",
    commercial: "badge-blue",
    industrial: "badge-amber",
    mixed_use: "badge-red",
  };
  return (
    <span className={`badge ${variants[type] ?? "badge-blue"}`}>
      {labels[type] ?? type}
    </span>
  );
}

function UnitStatusBadge({ status }: { status: string }) {
  const t = useTranslations("app");
  const map: Record<string, { label: string; cls: string }> = {
    occupied: { label: t("unitStatusOccupied"), cls: "badge-green" },
    vacant: { label: t("unitStatusVacant"), cls: "badge-amber" },
    maintenance: { label: t("unitStatusMaintenance"), cls: "badge-red" },
    reserved: { label: t("unitStatusReserved"), cls: "badge-blue" },
  };
  const m = map[status] ?? { label: status, cls: "badge-blue" };
  return <span className={`badge ${m.cls}`}>{m.label}</span>;
}

function LeaseStatusBadge({ status }: { status: string }) {
  const t = useTranslations("app");
  const map: Record<string, { label: string; cls: string }> = {
    active: { label: t("statusActive"), cls: "badge-green" },
    expired: { label: t("statusExpired"), cls: "badge-red" },
    terminated: { label: t("statusTerminated"), cls: "badge-red" },
    pending: { label: t("statusPending"), cls: "badge-amber" },
  };
  const m = map[status] ?? { label: status, cls: "badge-blue" };
  return <span className={`badge ${m.cls}`}>{m.label}</span>;
}

function PriorityBadge({ priority }: { priority: string }) {
  const t = useTranslations("app");
  const map: Record<string, { label: string; cls: string }> = {
    low: { label: t("priorityLow"), cls: "badge-green" },
    medium: { label: t("priorityMedium"), cls: "badge-blue" },
    high: { label: t("priorityHigh"), cls: "badge-amber" },
    emergency: { label: t("priorityEmergency"), cls: "badge-red" },
  };
  const m = map[priority] ?? { label: priority, cls: "badge-blue" };
  return <span className={`badge ${m.cls}`}>{m.label}</span>;
}

function MaintenanceStatusBadge({ status }: { status: string }) {
  const t = useTranslations("app");
  const map: Record<string, { label: string; cls: string }> = {
    submitted: { label: t("maintStatusSubmitted"), cls: "badge-amber" },
    assigned: { label: t("maintStatusAssigned"), cls: "badge-blue" },
    in_progress: { label: t("maintStatusInProgress"), cls: "badge-blue" },
    completed: { label: t("maintStatusCompleted"), cls: "badge-green" },
    closed: { label: t("maintStatusClosed"), cls: "badge-green" },
  };
  const m = map[status] ?? { label: status, cls: "badge-blue" };
  return <span className={`badge ${m.cls}`}>{m.label}</span>;
}

/* ------------------------------------------------------------------ */
/*  Tab Definitions                                                     */
/* ------------------------------------------------------------------ */

const TAB_KEYS = ["overview", "units", "leases", "maintenance", "payments", "financials", "announcements", "transactions", "depreciation"] as const;
type TabKey = (typeof TAB_KEYS)[number];

/* ------------------------------------------------------------------ */
/*  Main Component                                                      */
/* ------------------------------------------------------------------ */

export default function PropertyDetailClient({
  property,
  units,
  leases,
  maintenanceRequests,
  financials,
  announcements,
  rentPayments,
  transactions,
  depreciationAccumulated,
}: PropertyDetailClientProps) {
  const t = useTranslations("app");
  const locale = useLocale();
  const dateLocale = locale === "es" ? "es" : "en-US";

  const router = useRouter();

  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [saving, setSaving] = useState(false);

  // Delete property
  const [deletePropertyConfirm, setDeletePropertyConfirm] = useState(false);
  const [deletingProperty, setDeletingProperty] = useState(false);

  // Edit property modal
  const [editPropertyOpen, setEditPropertyOpen] = useState(false);

  // Unit modal
  const [selectedUnit, setSelectedUnit] = useState<UnitRow | null>(null);
  const [unitEditMode, setUnitEditMode] = useState(false);

  // Lease modal
  const [selectedLease, setSelectedLease] = useState<LeaseRow | null>(null);
  const [leaseEditMode, setLeaseEditMode] = useState(false);

  // Maintenance modal
  const [selectedMaint, setSelectedMaint] = useState<MaintenanceRequestRow | null>(null);
  const [maintEditMode, setMaintEditMode] = useState(false);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<{
    type: string;
    id: string;
    name: string;
  } | null>(null);

  // Create tenant login modal
  const [loginLease, setLoginLease] = useState<LeaseRow | null>(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [creatingLogin, setCreatingLogin] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [loginSuccess, setLoginSuccess] = useState<{ email: string; password: string } | null>(null);
  const [copiedLoginField, setCopiedLoginField] = useState<string | null>(null);

  // Depreciation schedule setup
  const [depLandValue, setDepLandValue] = useState(
    property.land_value != null ? String(property.land_value) : ""
  );
  const [depUsefulLife, setDepUsefulLife] = useState(
    property.useful_life_years != null
      ? String(property.useful_life_years)
      : String(getDefaultUsefulLife(property.property_type))
  );
  const [depStartDate, setDepStartDate] = useState(
    property.depreciation_start_date || new Date().toISOString().slice(0, 10)
  );
  const [depGenerating, setDepGenerating] = useState(false);
  const [depError, setDepError] = useState("");
  const [depResult, setDepResult] = useState<{ created: number; skipped: number; monthlyAmount: number } | null>(null);
  const [depResetting, setDepResetting] = useState(false);
  const [depIsSetUp, setDepIsSetUp] = useState(!!property.depreciation_start_date);

  async function handleGenerateDepreciation() {
    setDepGenerating(true);
    setDepError("");
    setDepResult(null);
    try {
      const res = await fetch(`/api/properties/${property.id}/depreciation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          land_value: depLandValue !== "" ? Number(depLandValue) : null,
          useful_life_years: Number(depUsefulLife),
          depreciation_start_date: depStartDate,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setDepError(data.error || "Failed to generate depreciation schedule.");
      } else {
        setDepResult({ created: data.created, skipped: data.skipped, monthlyAmount: data.monthlyAmount });
        setDepIsSetUp(true);
        router.refresh();
      }
    } catch {
      setDepError("Network error — please try again.");
    } finally {
      setDepGenerating(false);
    }
  }

  async function handleResetDepreciation() {
    if (!confirm(`Delete all ${Math.round(Number(depUsefulLife) * 12)} depreciation JEs and reset the schedule? This cannot be undone.`)) return;
    setDepResetting(true);
    setDepError("");
    try {
      const res = await fetch(`/api/properties/${property.id}/depreciation`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setDepError(data.error || "Failed to reset depreciation schedule.");
      } else {
        setDepIsSetUp(false);
        setDepResult(null);
        setDepLandValue("");
        setDepUsefulLife(String(getDefaultUsefulLife(property.property_type)));
        setDepStartDate(new Date().toISOString().slice(0, 10));
        router.refresh();
      }
    } catch {
      setDepError("Network error — please try again.");
    } finally {
      setDepResetting(false);
    }
  }

  // Depreciation preview calculations (live, for setup form)
  const depPurchasePrice = Number(property.purchase_price) || 0;
  const depLandNum = depLandValue !== "" ? Number(depLandValue) : null;
  const depBasis = getDepreciableBasis(depPurchasePrice, depLandNum);
  const depLifeNum = Number(depUsefulLife) || getDefaultUsefulLife(property.property_type);
  const depMonthly = getMonthlyDepreciation(depBasis, depLifeNum);
  const depTotalMonths = Math.round(depLifeNum * 12);

  // Purchase JE backfill
  const [jeGenerating, setJeGenerating] = useState(false);
  const [jeError, setJeError] = useState("");
  const [jeSuccess, setJeSuccess] = useState(false);

  async function handleGenerateJE(financingMethod: "cash" | "mortgage") {
    setJeGenerating(true);
    setJeError("");
    setJeSuccess(false);
    try {
      const res = await fetch(`/api/properties/${property.id}/backfill-je`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ financing_method: financingMethod }),
      });
      const data = await res.json();
      if (!res.ok) {
        setJeError(data.error || "Failed to generate journal entry.");
      } else {
        setJeSuccess(true);
        router.refresh();
      }
    } catch {
      setJeError("Network error — please try again.");
    } finally {
      setJeGenerating(false);
    }
  }

  // Record payment modal
  const [paymentLease, setPaymentLease] = useState<LeaseRow | null>(null);
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    payment_date: getLocalToday(),
    due_date: "",
    method: "ach",
    reference_number: "",
    notes: "",
    late_fee: "",
  });
  const [recordingPayment, setRecordingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState("");

  // Derived data
  const activeLeases = leases.filter((l) => l.status === "active");
  const openMaint = maintenanceRequests.filter(
    (m) => m.status !== "completed" && m.status !== "closed"
  );

  const occupancy =
    property.occupancy_rate ??
    (property.total_units > 0
      ? (property.occupied_units / property.total_units) * 100
      : 0);

  // Helper
  function formatDate(d: string | null | undefined): string {
    if (!d) return "--";
    return formatDateSafe(d);
  }

  function unitTypeLabel(ut: string): string {
    const map: Record<string, string> = {
      studio: t("unitTypeStudio"),
      "1br": t("unitType1br"),
      "2br": t("unitType2br"),
      "3br": t("unitType3br"),
      office: t("unitTypeOffice"),
      retail: t("unitTypeRetail"),
      warehouse: t("unitTypeWarehouse"),
    };
    return map[ut] ?? ut;
  }

  // Create Tenant Login
  function openCreateLogin(lease: LeaseRow) {
    setLoginLease(lease);
    setLoginEmail(lease.tenant_email || "");
    setLoginPassword("");
    setLoginError("");
    setLoginSuccess(null);
  }

  async function handleCreateLogin() {
    if (!loginLease) return;
    if (loginPassword.length < 8) {
      setLoginError(t("passwordMinLength"));
      return;
    }
    setCreatingLogin(true);
    setLoginError("");
    try {
      const res = await fetch("/api/leases/create-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lease_id: loginLease.id,
          email: loginEmail,
          password: loginPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLoginError(data.error || "Failed to create login");
        return;
      }
      setLoginSuccess({ email: loginEmail, password: loginPassword });
    } catch {
      setLoginError(t("networkError"));
    } finally {
      setCreatingLogin(false);
    }
  }

  function copyLoginField(field: string, value: string) {
    navigator.clipboard.writeText(value);
    setCopiedLoginField(field);
    setTimeout(() => setCopiedLoginField(null), 2000);
  }

  // Record Rent Payment
  function openRecordPayment(lease: LeaseRow) {
    setPaymentLease(lease);
    const now = new Date();
    const dueDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    setPaymentForm({
      amount: String(lease.monthly_rent || ""),
      payment_date: getLocalToday(),
      due_date: dueDate,
      method: "ach",
      reference_number: "",
      notes: "",
      late_fee: "",
    });
    setPaymentError("");
  }

  async function handleRecordPayment() {
    if (!paymentLease) return;
    if (!paymentForm.amount || parseFloat(paymentForm.amount) <= 0) {
      setPaymentError(t("amountRequired"));
      return;
    }
    setRecordingPayment(true);
    setPaymentError("");
    try {
      const res = await fetch("/api/properties/rent-payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lease_id: paymentLease.id,
          amount: paymentForm.amount,
          payment_date: paymentForm.payment_date,
          due_date: paymentForm.due_date || paymentForm.payment_date,
          method: paymentForm.method,
          reference_number: paymentForm.reference_number || null,
          notes: paymentForm.notes || null,
          late_fee: paymentForm.late_fee || null,
        }),
      });
      if (res.ok) {
        window.location.reload();
      } else {
        const data = await res.json();
        setPaymentError(data.error || "Failed to record payment");
      }
    } catch {
      setPaymentError(t("networkError"));
    } finally {
      setRecordingPayment(false);
    }
  }

  // Delete property
  async function handleDeleteProperty() {
    setDeletingProperty(true);
    try {
      const res = await fetch(`/api/properties/${property.id}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/properties");
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Failed to delete property.");
        setDeletePropertyConfirm(false);
      }
    } catch {
      alert("Failed to delete property.");
      setDeletePropertyConfirm(false);
    } finally {
      setDeletingProperty(false);
    }
  }

  // Tab labels with counts
  const TABS = [
    { key: "overview" as TabKey, label: t("propTabOverview") },
    { key: "units" as TabKey, label: t("propTabUnitsCount", { count: units.length }) },
    { key: "leases" as TabKey, label: t("propTabLeasesCount", { count: leases.length }) },
    { key: "maintenance" as TabKey, label: t("propTabMaintenanceCount", { count: maintenanceRequests.length }) },
    { key: "payments" as TabKey, label: t("propTabPaymentsCount", { count: rentPayments.length }) },
    { key: "financials" as TabKey, label: t("propTabFinancials") },
    { key: "announcements" as TabKey, label: t("propTabAnnouncementsCount", { count: announcements.length }) },
    { key: "transactions" as TabKey, label: "Transactions" },
    { key: "depreciation" as TabKey, label: "Depreciation" },
  ];

  return (
    <div>
      {/* ===== Header ===== */}
      <div className="property-detail-header">
        <div className="property-detail-title">
          <div style={{ marginBottom: "8px" }}>
            <Link
              href="/properties"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "0.82rem",
                color: "var(--muted)",
                textDecoration: "none",
              }}
            >
              <ArrowLeft size={14} />
              {t("backToProperties")}
            </Link>
          </div>
          <h2>
            {property.name}
            <PropertyTypeBadge type={property.property_type} />
          </h2>
          <div className="property-detail-address">
            {property.address_line1}, {property.city}, {property.state}{" "}
            {property.zip}
          </div>
        </div>
        <div className="property-detail-actions">
          <button
            className="ui-btn ui-btn-md ui-btn-outline"
            onClick={() => setEditPropertyOpen(true)}
          >
            <Pencil size={14} />
            {t("editProperty")}
          </button>
          <button
            className="ui-btn ui-btn-md ui-btn-outline"
            style={{ color: "var(--color-red)", borderColor: "var(--color-red)" }}
            onClick={() => setDeletePropertyConfirm(true)}
          >
            <Trash2 size={14} />
            Delete Property
          </button>
        </div>
      </div>

      {/* ===== Tabs ===== */}
      <div className="property-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            className={`property-tab ${activeTab === tab.key ? "active" : ""}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ===== Tab Content ===== */}
      {activeTab === "overview" && (
        <OverviewTabContent
          property={property}
          units={units}
          leases={leases}
          financials={financials}
          occupancy={occupancy}
          activeLeaseCount={activeLeases.length}
          openMaintCount={openMaint.length}
          onTabSwitch={setActiveTab}
          onSelectUnit={(u) => {
            setSelectedUnit(u);
            setUnitEditMode(false);
          }}
          onSelectLease={(l) => {
            setSelectedLease(l);
            setLeaseEditMode(false);
          }}
        />
      )}

      {activeTab === "units" && (
        <UnitsTabContent
          units={units}
          leases={leases}
          propertyId={property.id}
          onSelectUnit={(u) => {
            setSelectedUnit(u);
            setUnitEditMode(false);
          }}
          onEditUnit={(u) => {
            setSelectedUnit(u);
            setUnitEditMode(true);
          }}
        />
      )}

      {activeTab === "leases" && (
        <LeasesTabContent
          propertyId={property.id}
          leases={leases}
          unitCount={units.length}
          onSwitchToUnits={() => setActiveTab("units")}
          onSelectLease={(l) => {
            setSelectedLease(l);
            setLeaseEditMode(false);
          }}
        />
      )}

      {activeTab === "maintenance" && (
        <MaintenanceTabContent
          requests={maintenanceRequests}
          onSelectMaint={(m) => {
            setSelectedMaint(m);
            setMaintEditMode(false);
          }}
        />
      )}

      {activeTab === "payments" && (
        <PaymentsTabContent payments={rentPayments} />
      )}

      {activeTab === "financials" && (
        <FinancialsTabContent financials={financials} propertyId={property.id} />
      )}

      {activeTab === "announcements" && (
        <AnnouncementsTabContent
          announcements={announcements}
          propertyId={property.id}
        />
      )}

      {activeTab === "transactions" && (
        <div style={{ marginTop: "24px" }}>
          {/* Show backfill prompt when no JE exists yet for a property with a purchase price */}
          {transactions.totalTransactions === 0 && Number(property.purchase_price) > 0 && !jeSuccess && (
            <div
              style={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                padding: "20px 24px",
                marginBottom: "20px",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              <div style={{ fontWeight: 600, color: "var(--text)" }}>
                No purchase journal entry found
              </div>
              <div style={{ fontSize: "14px", color: "var(--text-muted)" }}>
                This property has a purchase price of{" "}
                <strong>{formatCurrency(Number(property.purchase_price))}</strong>{" "}
                but no accounting entry has been recorded yet. Generate the journal entry to have it appear on the Balance Sheet and Cash Flow statement.
              </div>
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <button
                  onClick={() => handleGenerateJE("mortgage")}
                  disabled={jeGenerating}
                  className="btn btn-primary"
                  style={{ fontSize: "14px" }}
                >
                  {jeGenerating ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite", display: "inline" }} /> : null}
                  {jeGenerating ? " Generating…" : "Generate JE — Mortgage / Financed"}
                </button>
                <button
                  onClick={() => handleGenerateJE("cash")}
                  disabled={jeGenerating}
                  className="btn btn-secondary"
                  style={{ fontSize: "14px" }}
                >
                  Generate JE — Cash Purchase
                </button>
              </div>
              {jeError && (
                <div style={{ color: "var(--color-danger, #ef4444)", fontSize: "14px" }}>
                  {jeError}
                </div>
              )}
            </div>
          )}
          {jeSuccess && (
            <div
              style={{
                background: "var(--color-success-bg, rgba(34,197,94,0.1))",
                border: "1px solid var(--color-success, #22c55e)",
                borderRadius: "8px",
                padding: "12px 16px",
                marginBottom: "16px",
                color: "var(--color-success, #22c55e)",
                fontSize: "14px",
              }}
            >
              Journal entry generated successfully. Refreshing transactions…
            </div>
          )}
          <SectionTransactions data={transactions} sectionName="Property" />
        </div>
      )}

      {activeTab === "depreciation" && (
        <div style={{ marginTop: "24px" }}>
          {depError && (
            <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid #ef4444", borderRadius: "8px", padding: "12px 16px", marginBottom: "16px", color: "#ef4444", fontSize: "14px" }}>
              {depError}
            </div>
          )}

          {!depIsSetUp ? (
            /* ── Setup Form ── */
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", padding: "24px" }}>
                <div style={{ fontWeight: 700, fontSize: "16px", marginBottom: "4px", color: "var(--text)" }}>Set Up Depreciation Schedule</div>
                <div style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "20px" }}>
                  GAAP straight-line depreciation. All monthly journal entries (DR Depreciation Expense / CR Accumulated Depreciation) will be generated upfront for the full useful life.
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "20px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px", color: "var(--text)" }}>
                      Land Value (optional)
                    </label>
                    <input
                      type="number"
                      placeholder={`Auto-estimate: ${formatCurrency(getEstimatedLandValue(depPurchasePrice))} (20%)`}
                      value={depLandValue}
                      onChange={(e) => setDepLandValue(e.target.value)}
                      style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)", fontSize: "14px" }}
                    />
                    <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>Non-depreciable land portion. Leave blank to auto-estimate 20%.</div>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px", color: "var(--text)" }}>
                      Useful Life (years)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={depUsefulLife}
                      onChange={(e) => setDepUsefulLife(e.target.value)}
                      style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)", fontSize: "14px" }}
                    />
                    <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>GAAP default: Residential 27.5yr, Commercial/Industrial 39yr, Mixed-Use 30yr</div>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px", color: "var(--text)" }}>
                      Depreciation Start Date
                    </label>
                    <input
                      type="date"
                      value={depStartDate}
                      onChange={(e) => setDepStartDate(e.target.value)}
                      style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)", fontSize: "14px" }}
                    />
                  </div>
                </div>

                {/* Live preview */}
                <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "6px", padding: "16px", marginBottom: "20px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "12px" }}>
                  {[
                    { label: "Cost Basis", value: formatCurrency(depPurchasePrice) },
                    { label: depLandNum != null ? "Land Value" : "Land (estimated 20%)", value: formatCurrency(depLandNum ?? getEstimatedLandValue(depPurchasePrice)) },
                    { label: "Depreciable Basis", value: formatCurrency(depBasis) },
                    { label: "Monthly Depreciation", value: formatCurrency(depMonthly) },
                    { label: "Annual Depreciation", value: formatCurrency(depMonthly * 12) },
                    { label: "Total JEs to Generate", value: `${depTotalMonths} months` },
                  ].map((item) => (
                    <div key={item.label}>
                      <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "2px" }}>{item.label}</div>
                      <div style={{ fontSize: "15px", fontWeight: 600, color: "var(--text)" }}>{item.value}</div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleGenerateDepreciation}
                  disabled={depGenerating || depPurchasePrice <= 0}
                  className="btn btn-primary"
                  style={{ fontSize: "14px" }}
                >
                  {depGenerating
                    ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite", display: "inline", marginRight: "6px" }} />Generating {depTotalMonths} JEs…</>
                    : `Generate Full Depreciation Schedule (${depTotalMonths} months)`}
                </button>
                {depPurchasePrice <= 0 && (
                  <div style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "8px" }}>Add a purchase price to this property to enable depreciation.</div>
                )}
              </div>
            </div>
          ) : (
            /* ── Schedule Summary (set up) ── */
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {depResult && (
                <div style={{ background: "rgba(34,197,94,0.1)", border: "1px solid #22c55e", borderRadius: "8px", padding: "12px 16px", color: "#22c55e", fontSize: "14px" }}>
                  Schedule generated: {depResult.created} JEs created, {depResult.skipped} skipped. Monthly amount: {formatCurrency(depResult.monthlyAmount)}.
                </div>
              )}

              {/* Summary cards */}
              {(() => {
                const purchasePrice = Number(property.purchase_price) || 0;
                const landVal = property.land_value;
                const basis = getDepreciableBasis(purchasePrice, landVal);
                const usefulLife = Number(property.useful_life_years) || getDefaultUsefulLife(property.property_type);
                const monthly = getMonthlyDepreciation(basis, usefulLife);
                const netBookValue = Math.max(0, basis - depreciationAccumulated);
                const monthsElapsed = depreciationAccumulated > 0 && monthly > 0 ? Math.round(depreciationAccumulated / monthly) : 0;
                const yearsRemaining = Math.max(0, usefulLife - monthsElapsed / 12);
                const startDate = property.depreciation_start_date || "";

                const summaryItems = [
                  { label: "Cost Basis", value: formatCurrency(purchasePrice) },
                  { label: landVal != null ? "Land Value" : "Land Value (est. 20%)", value: formatCurrency(landVal ?? purchasePrice * 0.2) },
                  { label: "Depreciable Basis", value: formatCurrency(basis) },
                  { label: "Monthly Depreciation", value: formatCurrency(monthly) },
                  { label: "Annual Depreciation", value: formatCurrency(monthly * 12) },
                  { label: "Accumulated to Date", value: formatCurrency(depreciationAccumulated) },
                  { label: "Net Book Value", value: formatCurrency(netBookValue), highlight: true },
                  { label: "Useful Life", value: `${usefulLife} years` },
                  { label: "Years Remaining", value: yearsRemaining.toFixed(1) },
                  { label: "Method", value: (property.depreciation_method || "straight_line").replace(/_/g, "-").replace(/\b\w/g, (c) => c.toUpperCase()) },
                  { label: "Start Date", value: startDate ? formatDateSafe(startDate) : "—" },
                ];

                const yearlyRows = startDate ? buildYearlySchedule(basis, usefulLife, startDate) : [];

                return (
                  <>
                    <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", padding: "24px" }}>
                      <div style={{ fontWeight: 700, fontSize: "16px", marginBottom: "16px", color: "var(--text)" }}>Depreciation Summary</div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px" }}>
                        {summaryItems.map((item) => (
                          <div key={item.label} style={{ padding: "12px", background: item.highlight ? "rgba(99,102,241,0.08)" : "var(--bg)", borderRadius: "6px", border: `1px solid ${item.highlight ? "var(--color-primary, #6366f1)" : "var(--border)"}` }}>
                            <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "4px" }}>{item.label}</div>
                            <div style={{ fontSize: "16px", fontWeight: 700, color: item.highlight ? "var(--color-primary, #6366f1)" : "var(--text)" }}>{item.value}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {yearlyRows.length > 0 && (
                      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", padding: "24px" }}>
                        <div style={{ fontWeight: 700, fontSize: "16px", marginBottom: "16px", color: "var(--text)" }}>Year-by-Year Schedule</div>
                        <div style={{ overflowX: "auto" }}>
                          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                            <thead>
                              <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--text-muted)", textAlign: "left" }}>
                                {["Year", "Annual Depreciation", "Cumulative Depreciation", "Net Book Value"].map((h) => (
                                  <th key={h} style={{ padding: "8px 12px", fontWeight: 600 }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {yearlyRows.map((row, idx) => (
                                <tr key={row.year} style={{ borderBottom: "1px solid var(--border)", background: idx % 2 === 0 ? "transparent" : "var(--bg)" }}>
                                  <td style={{ padding: "8px 12px", color: "var(--text)", fontWeight: 600 }}>{row.year}</td>
                                  <td style={{ padding: "8px 12px", color: "var(--text-muted)" }}>{formatCurrency(row.annualAmount)}</td>
                                  <td style={{ padding: "8px 12px", color: "var(--text-muted)" }}>{formatCurrency(row.cumulative)}</td>
                                  <td style={{ padding: "8px 12px", color: "var(--text)" }}>{formatCurrency(row.bookValue)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    <div>
                      <button
                        onClick={handleResetDepreciation}
                        disabled={depResetting}
                        className="btn btn-secondary"
                        style={{ fontSize: "13px", color: "var(--color-danger, #ef4444)", borderColor: "var(--color-danger, #ef4444)" }}
                      >
                        {depResetting ? "Resetting…" : "Reset Depreciation Schedule"}
                      </button>
                      <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "6px" }}>
                        Deletes all {Math.round(Number(property.useful_life_years || 39) * 12)} depreciation JEs and clears the setup so you can reconfigure.
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* ===== MODALS ===== */}

      {/* Edit Property Modal */}
      {editPropertyOpen && (
        <EditPropertyModal
          property={property}
          saving={saving}
          setSaving={setSaving}
          onClose={() => setEditPropertyOpen(false)}
        />
      )}

      {/* Unit Detail/Edit Modal */}
      {selectedUnit && (
        <UnitModal
          unit={selectedUnit}
          propertyId={property.id}
          leases={leases}
          editMode={unitEditMode}
          saving={saving}
          setSaving={setSaving}
          onClose={() => {
            setSelectedUnit(null);
            setUnitEditMode(false);
          }}
          onToggleEdit={() => setUnitEditMode(!unitEditMode)}
          onDelete={(id, name) =>
            setDeleteTarget({ type: "unit", id, name })
          }
          onSelectLease={(l) => {
            setSelectedUnit(null);
            setUnitEditMode(false);
            setSelectedLease(l);
            setLeaseEditMode(false);
          }}
        />
      )}

      {/* Lease Detail/Edit Modal */}
      {selectedLease && (
        <LeaseModal
          lease={selectedLease}
          propertyId={property.id}
          editMode={leaseEditMode}
          saving={saving}
          setSaving={setSaving}
          rentPayments={rentPayments.filter((p) => p.lease_id === selectedLease.id)}
          onClose={() => {
            setSelectedLease(null);
            setLeaseEditMode(false);
          }}
          onToggleEdit={() => setLeaseEditMode(!leaseEditMode)}
          onDelete={(id, name) =>
            setDeleteTarget({ type: "lease", id, name })
          }
          onCreateLogin={openCreateLogin}
          onRecordPayment={openRecordPayment}
        />
      )}

      {/* Maintenance Detail/Edit Modal */}
      {selectedMaint && (
        <MaintenanceModal
          maint={selectedMaint}
          propertyId={property.id}
          editMode={maintEditMode}
          saving={saving}
          setSaving={setSaving}
          onClose={() => {
            setSelectedMaint(null);
            setMaintEditMode(false);
          }}
          onToggleEdit={() => setMaintEditMode(!maintEditMode)}
          onDelete={(id, name) =>
            setDeleteTarget({ type: "maintenance", id, name })
          }
        />
      )}

      {/* Delete Property Confirmation */}
      {deletePropertyConfirm && (
        <div className="modal-overlay" onClick={() => setDeletePropertyConfirm(false)}>
          <div className="modal-content" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Delete Property</h3>
              <button className="modal-close" onClick={() => setDeletePropertyConfirm(false)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: "0.88rem", marginBottom: 12 }}>
                Are you sure you want to delete <strong>{property.name}</strong>?
              </p>
              <p style={{ fontSize: "0.82rem", color: "var(--color-red)" }}>
                This will permanently delete the property and all associated units, leases, and data. This action cannot be undone.
              </p>
            </div>
            <div className="modal-footer">
              <button className="ui-btn ui-btn-md ui-btn-secondary" onClick={() => setDeletePropertyConfirm(false)}>
                Cancel
              </button>
              <button
                className="ui-btn ui-btn-md"
                style={{ background: "var(--color-red)", color: "#fff", border: "none" }}
                onClick={handleDeleteProperty}
                disabled={deletingProperty}
              >
                <Trash2 size={14} />
                {deletingProperty ? "Deleting..." : "Delete Property"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <DeleteConfirmModal
          target={deleteTarget}
          propertyId={property.id}
          saving={saving}
          setSaving={setSaving}
          onClose={() => setDeleteTarget(null)}
        />
      )}

      {/* Create Tenant Login Modal */}
      {loginLease && !loginSuccess && (
        <div className="modal-overlay" onClick={() => setLoginLease(null)}>
          <div className="modal-content" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{t("createTenantLogin")}</h3>
              <button className="modal-close" onClick={() => setLoginLease(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: "0.85rem", color: "var(--muted)", margin: "0 0 16px 0" }}>
                {t("createTenantLoginDesc", { name: loginLease.tenant_name })}
              </p>
              {loginError && <div className="form-error">{loginError}</div>}
              <div className="ticket-form-group">
                <label className="ticket-form-label">{t("email")} *</label>
                <input
                  type="email"
                  className="ticket-form-input"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                />
              </div>
              <div className="ticket-form-group">
                <label className="ticket-form-label">{t("temporaryPassword")} *</label>
                <input
                  type="text"
                  className="ticket-form-input"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder={t("minChars", { count: 8 })}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setLoginLease(null)}>
                {t("cancel")}
              </button>
              <button className="btn-primary" onClick={handleCreateLogin} disabled={creatingLogin}>
                {creatingLogin ? t("creating") : t("createLogin")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Login Created Success Modal */}
      {loginSuccess && (
        <div className="modal-overlay" onClick={() => { setLoginSuccess(null); setLoginLease(null); window.location.reload(); }}>
          <div className="modal-content" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{t("loginCreated")}</h3>
              <button className="modal-close" onClick={() => { setLoginSuccess(null); setLoginLease(null); window.location.reload(); }}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: "0.85rem", color: "var(--muted)", margin: "0 0 16px 0" }}>
                {t("shareCredentials")}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", borderRadius: 8, background: "var(--bg-secondary)" }}>
                  <div>
                    <div style={{ fontSize: "0.75rem", color: "var(--muted)", textTransform: "uppercase" }}>{t("email")}</div>
                    <div style={{ fontWeight: 600 }}>{loginSuccess.email}</div>
                  </div>
                  <button className="ui-btn ui-btn-sm ui-btn-outline" onClick={() => copyLoginField("email", loginSuccess.email)}>
                    {copiedLoginField === "email" ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", borderRadius: 8, background: "var(--bg-secondary)" }}>
                  <div>
                    <div style={{ fontSize: "0.75rem", color: "var(--muted)", textTransform: "uppercase" }}>{t("password")}</div>
                    <div style={{ fontWeight: 600 }}>{loginSuccess.password}</div>
                  </div>
                  <button className="ui-btn ui-btn-sm ui-btn-outline" onClick={() => copyLoginField("password", loginSuccess.password)}>
                    {copiedLoginField === "password" ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-primary" onClick={() => { setLoginSuccess(null); setLoginLease(null); window.location.reload(); }}>
                {t("done")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Record Rent Payment Modal */}
      {paymentLease && (
        <div className="modal-overlay" onClick={() => setPaymentLease(null)}>
          <div className="modal-content" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{t("recordPayment")}</h3>
              <button className="modal-close" onClick={() => setPaymentLease(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: "0.85rem", color: "var(--muted)", margin: "0 0 16px 0" }}>
                {t("recordPaymentDesc", { tenant: paymentLease.tenant_name })}
              </p>
              {paymentError && <div className="form-error">{paymentError}</div>}
              <div className="modal-form-grid">
                <div className="form-group">
                  <label className="form-label">{t("amount")} *</label>
                  <input
                    type="number"
                    className="form-input"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                    step="0.01"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">{t("paymentDate")} *</label>
                  <input
                    type="date"
                    className="form-input"
                    value={paymentForm.payment_date}
                    onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">{t("dueDate")}</label>
                  <input
                    type="date"
                    className="form-input"
                    value={paymentForm.due_date}
                    onChange={(e) => setPaymentForm({ ...paymentForm, due_date: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">{t("paymentMethodLabel")} *</label>
                  <select
                    className="form-select"
                    value={paymentForm.method}
                    onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}
                  >
                    <option value="ach">ACH / Bank Transfer</option>
                    <option value="check">{t("check")}</option>
                    <option value="zelle">Zelle</option>
                    <option value="cashapp">Cash App</option>
                    <option value="venmo">Venmo</option>
                    <option value="paypal">PayPal</option>
                    <option value="wire">{t("wireTransfer")}</option>
                    <option value="cash">{t("cash")}</option>
                    <option value="credit_card">{t("creditCard")}</option>
                    <option value="other">{t("other")}</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">{t("referenceNumber")}</label>
                  <input
                    type="text"
                    className="form-input"
                    value={paymentForm.reference_number}
                    onChange={(e) => setPaymentForm({ ...paymentForm, reference_number: e.target.value })}
                    placeholder={t("referenceNumberPlaceholder")}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">{t("lateFee")}</label>
                  <input
                    type="number"
                    className="form-input"
                    value={paymentForm.late_fee}
                    onChange={(e) => setPaymentForm({ ...paymentForm, late_fee: e.target.value })}
                    step="0.01"
                    placeholder="0.00"
                  />
                </div>
                <div className="form-group full-width">
                  <label className="form-label">{t("notes")}</label>
                  <textarea
                    className="form-input"
                    rows={2}
                    value={paymentForm.notes}
                    onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setPaymentLease(null)}>
                {t("cancel")}
              </button>
              <button className="btn-primary" onClick={handleRecordPayment} disabled={recordingPayment}>
                {recordingPayment ? t("saving") : t("recordPayment")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ==================================================================== */
/*  Photo Gallery                                                        */
/* ==================================================================== */

interface PhotoItem {
  id: string;
  name: string;
  file_type: string;
  file_size: number;
  created_at: string;
  url: string | null;
}

function PhotoGallery({ propertyId }: { propertyId: string }) {
  const t = useTranslations("app");
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<PhotoItem | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchPhotos = useCallback(async () => {
    try {
      const res = await fetch(`/api/properties/${propertyId}/photos`);
      if (res.ok) {
        const data = await res.json();
        setPhotos(data);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files?.length) return;

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch(`/api/properties/${propertyId}/photos`, {
          method: "POST",
          body: fd,
        });
        if (res.ok) {
          const photo = await res.json();
          setPhotos((prev) => [photo, ...prev]);
        }
      }
    } catch {
      // silent
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleDelete(docId: string) {
    setDeleting(docId);
    try {
      const res = await fetch(
        `/api/properties/${propertyId}/photos?docId=${docId}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        setPhotos((prev) => prev.filter((p) => p.id !== docId));
        if (lightbox?.id === docId) setLightbox(null);
      }
    } catch {
      // silent
    } finally {
      setDeleting(null);
    }
  }

  return (
    <>
      <div className="card">
        <div className="card-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <ImageIcon size={18} style={{ color: "var(--muted)" }} />
            {t("photos")} {photos.length > 0 && `(${photos.length})`}
          </span>
          <label
            className="btn-primary"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "0.8rem",
              padding: "6px 12px",
              cursor: uploading ? "wait" : "pointer",
            }}
          >
            {uploading ? (
              <Loader2 size={14} className="spin-icon" />
            ) : (
              <Upload size={14} />
            )}
            {uploading ? t("uploading") : t("upload")}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleUpload}
              disabled={uploading}
              style={{ display: "none" }}
            />
          </label>
        </div>

        {loading ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "120px",
              color: "var(--muted)",
              fontSize: "0.85rem",
            }}
          >
            {t("loadingPhotos")}
          </div>
        ) : photos.length === 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "160px",
              border: "2px dashed var(--border)",
              borderRadius: "8px",
              color: "var(--muted)",
              fontSize: "0.85rem",
              gap: "8px",
              cursor: "pointer",
            }}
            onClick={() => fileRef.current?.click()}
          >
            <ImageIcon size={24} />
            {t("clickToUploadPhotos")}
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
              gap: "8px",
            }}
          >
            {photos.map((photo) => (
              <div
                key={photo.id}
                style={{
                  position: "relative",
                  aspectRatio: "1",
                  borderRadius: "8px",
                  overflow: "hidden",
                  cursor: "pointer",
                  border: "1px solid var(--border)",
                  background: "var(--surface)",
                }}
                onClick={() => setLightbox(photo)}
              >
                {photo.url ? (
                  <img
                    src={photo.url}
                    alt={photo.name}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "var(--muted)",
                    }}
                  >
                    <ImageIcon size={32} />
                  </div>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(photo.id);
                  }}
                  disabled={deleting === photo.id}
                  style={{
                    position: "absolute",
                    top: "4px",
                    right: "4px",
                    background: "rgba(0,0,0,0.6)",
                    border: "none",
                    borderRadius: "50%",
                    width: "24px",
                    height: "24px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    color: "#fff",
                    opacity: 0,
                    transition: "opacity 0.15s",
                  }}
                  className="photo-delete-btn"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.85)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
          onClick={() => setLightbox(null)}
        >
          <button
            onClick={() => setLightbox(null)}
            style={{
              position: "absolute",
              top: "16px",
              right: "16px",
              background: "rgba(255,255,255,0.15)",
              border: "none",
              borderRadius: "50%",
              width: "36px",
              height: "36px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "#fff",
            }}
          >
            <X size={20} />
          </button>
          {lightbox.url && (
            <img
              src={lightbox.url}
              alt={lightbox.name}
              onClick={(e) => e.stopPropagation()}
              style={{
                maxWidth: "90vw",
                maxHeight: "90vh",
                objectFit: "contain",
                borderRadius: "8px",
                cursor: "default",
              }}
            />
          )}
          <div
            style={{
              position: "absolute",
              bottom: "16px",
              left: "50%",
              transform: "translateX(-50%)",
              color: "#fff",
              fontSize: "0.85rem",
              background: "rgba(0,0,0,0.5)",
              padding: "6px 14px",
              borderRadius: "6px",
            }}
          >
            {lightbox.name}
          </div>
        </div>
      )}
    </>
  );
}

/* ==================================================================== */
/*  Overview Tab                                                         */
/* ==================================================================== */

function OverviewTabContent({
  property,
  units,
  leases,
  financials,
  occupancy,
  activeLeaseCount,
  openMaintCount,
  onTabSwitch,
  onSelectUnit,
  onSelectLease,
}: {
  property: PropertyRow;
  units: UnitRow[];
  leases: LeaseRow[];
  financials: PropertyFinancials;
  occupancy: number;
  activeLeaseCount: number;
  openMaintCount: number;
  onTabSwitch: (tab: TabKey) => void;
  onSelectUnit: (u: UnitRow) => void;
  onSelectLease: (l: LeaseRow) => void;
}) {
  const t = useTranslations("app");
  const locale = useLocale();
  const dateLocale = locale === "es" ? "es" : "en-US";

  function formatDate(d: string | null | undefined): string {
    if (!d) return "--";
    return formatDateSafe(d);
  }

  // Upcoming lease expirations within 120 days
  const upcomingExpirations = leases
    .filter((l) => l.status === "active" && l.lease_end)
    .filter((l) => {
      const days = Math.ceil(
        (new Date(l.lease_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      return days > 0 && days <= 120;
    })
    .sort(
      (a, b) =>
        new Date(a.lease_end).getTime() - new Date(b.lease_end).getTime()
    );

  return (
    <>
      {/* KPI Row */}
      <div className="property-kpi-row">
        <div className="card property-kpi">
          <span className="property-kpi-label">{t("occupancyRate")}</span>
          <span
            className={`property-kpi-value ${
              occupancy >= 90 ? "green" : occupancy >= 70 ? "amber" : "red"
            }`}
          >
            {formatPercent(occupancy)}
          </span>
        </div>
        <div className="card property-kpi">
          <span className="property-kpi-label">{t("monthlyRevenue")}</span>
          <span className="property-kpi-value">
            {formatCurrency(financials.monthlyRevenue)}
          </span>
        </div>
        <div className="card property-kpi">
          <span className="property-kpi-label">{t("monthlyExpenses")}</span>
          <span className="property-kpi-value">
            {formatCurrency(financials.monthlyExpenses)}
          </span>
        </div>
        <div className="card property-kpi">
          <span className="property-kpi-label">{t("noi")}</span>
          <span
            className={`property-kpi-value ${
              financials.noi >= 0 ? "green" : "red"
            }`}
          >
            {formatCurrency(financials.noi)}
          </span>
        </div>
        <div className="card property-kpi">
          <span className="property-kpi-label">{t("activeLeases")}</span>
          <span className="property-kpi-value">{activeLeaseCount}</span>
        </div>
        <div className="card property-kpi">
          <span className="property-kpi-label">{t("openMaintenance")}</span>
          <span
            className={`property-kpi-value ${openMaintCount > 0 ? "amber" : ""}`}
          >
            {openMaintCount}
          </span>
        </div>
      </div>

      {/* Unit Status Grid + Lease Expirations */}
      <div className="overview-grid-row">
        <div className="card unit-status-grid-section">
          <div className="card-title-row">
            <span className="card-title">{t("unitStatusGrid")}</span>
            <button
              className="link-btn"
              onClick={() => onTabSwitch("units")}
            >
              {t("viewAllUnits")} &rarr;
            </button>
          </div>
          {units.length > 0 ? (
            <>
              <div className="unit-grid">
                {units.map((unit) => (
                  <div
                    key={unit.id}
                    className={`unit-grid-cell ${unit.status}`}
                    title={t("unitStatusTitle", { number: unit.unit_number, status: unit.status })}
                    onClick={() => onSelectUnit(unit)}
                  >
                    {unit.unit_number}
                  </div>
                ))}
              </div>
              <div className="unit-grid-legend">
                <span className="legend-item">
                  <span className="legend-dot occupied" />
                  {t("unitStatusOccupied")} (
                  {units.filter((u) => u.status === "occupied").length})
                </span>
                <span className="legend-item">
                  <span className="legend-dot vacant" />
                  {t("unitStatusVacant")} ({units.filter((u) => u.status === "vacant").length})
                </span>
                <span className="legend-item">
                  <span className="legend-dot maintenance" />
                  {t("unitStatusMaintenance")} (
                  {units.filter((u) => u.status === "maintenance").length})
                </span>
                <span className="legend-item">
                  <span className="legend-dot reserved" />
                  {t("unitStatusReserved")} (
                  {units.filter((u) => u.status === "reserved").length})
                </span>
              </div>
            </>
          ) : (
            <div
              style={{
                textAlign: "center",
                padding: "40px 20px",
                color: "var(--muted)",
                fontSize: "0.85rem",
              }}
            >
              {t("noUnitsAddedYet")}
            </div>
          )}
        </div>

        <div className="card lease-expirations-section">
          <div className="card-title-row">
            <span className="card-title">{t("upcomingLeaseExpirations")}</span>
            <button
              className="link-btn"
              onClick={() => onTabSwitch("leases")}
            >
              {t("viewAllLeases")} &rarr;
            </button>
          </div>
          {upcomingExpirations.length > 0 ? (
            <div className="lease-expiry-list">
              {upcomingExpirations.map((l) => {
                const daysLeft = Math.ceil(
                  (new Date(l.lease_end).getTime() - Date.now()) /
                    (1000 * 60 * 60 * 24)
                );
                return (
                  <div
                    key={l.id}
                    className="lease-expiry-item"
                    onClick={() => onSelectLease(l)}
                  >
                    <div className="lease-expiry-header">
                      <span className="lease-expiry-unit">
                        {t("unitLabel", { number: l.units?.unit_number ?? "--" })}
                      </span>
                      {daysLeft < 30 && (
                        <span className="badge badge-red">{t("priorityUrgent")}</span>
                      )}
                    </div>
                    <div className="lease-expiry-tenant">{l.tenant_name}</div>
                    <div className="lease-expiry-footer">
                      <span className="lease-expiry-date">
                        {formatDate(l.lease_end)}
                      </span>
                      <span
                        className={`lease-expiry-days ${
                          daysLeft < 30
                            ? "urgent"
                            : daysLeft < 60
                              ? "warning"
                              : ""
                        }`}
                      >
                        {t("daysCount", { count: daysLeft })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="lease-expiry-empty">
              {t("noLeasesExpiringWithin120Days")}
            </div>
          )}
        </div>
      </div>

      {/* Property Info */}
      <div className="card" style={{ marginBottom: "24px" }}>
        <div className="card-title">{t("propertyInformation")}</div>
        <div className="property-info-grid">
          <div className="property-info-item">
            <span className="property-info-label">{t("propertyType")}</span>
            <span
              className="property-info-value"
              style={{ textTransform: "capitalize" }}
            >
              {property.property_type.replace("_", " ")}
            </span>
          </div>
          <div className="property-info-item">
            <span className="property-info-label">{t("address")}</span>
            <span className="property-info-value">
              {property.address_line1}, {property.city}, {property.state}{" "}
              {property.zip}
            </span>
          </div>
          <div className="property-info-item">
            <span className="property-info-label">{t("yearBuilt")}</span>
            <span className="property-info-value">
              {property.year_built ?? "--"}
            </span>
          </div>
          <div className="property-info-item">
            <span className="property-info-label">{t("totalSqFt")}</span>
            <span className="property-info-value">
              {property.total_sqft
                ? property.total_sqft.toLocaleString()
                : "--"}
            </span>
          </div>
          <div className="property-info-item">
            <span className="property-info-label">{t("purchasePrice")}</span>
            <span className="property-info-value">
              {property.purchase_price
                ? formatCurrency(property.purchase_price)
                : "--"}
            </span>
          </div>
          <div className="property-info-item">
            <span className="property-info-label">{t("currentValue")}</span>
            <span className="property-info-value">
              {property.current_value
                ? formatCurrency(property.current_value)
                : "--"}
            </span>
          </div>
        </div>
      </div>

      {/* Photo Gallery */}
      <PhotoGallery propertyId={property.id} />
    </>
  );
}

/* ==================================================================== */
/*  Units Tab                                                            */
/* ==================================================================== */

function UnitsTabContent({
  units,
  leases,
  propertyId,
  onSelectUnit,
  onEditUnit,
}: {
  units: UnitRow[];
  leases: LeaseRow[];
  propertyId: string;
  onSelectUnit: (u: UnitRow) => void;
  onEditUnit: (u: UnitRow) => void;
}) {
  const t = useTranslations("app");
  const [showAddForm, setShowAddForm] = useState(false);
  const [addingSaving, setAddingSaving] = useState(false);
  const [addError, setAddError] = useState("");
  const [addForm, setAddForm] = useState({
    unit_number: "",
    unit_type: "1br",
    sqft: "",
    bedrooms: "1",
    bathrooms: "1",
    floor_number: "",
    market_rent: "",
  });
  const csvInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: number; errors: string[] } | null>(null);

  function resetAddForm() {
    setAddForm({ unit_number: "", unit_type: "1br", sqft: "", bedrooms: "1", bathrooms: "1", floor_number: "", market_rent: "" });
    setAddError("");
  }

  async function handleCsvImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    setAddError("");

    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      if (lines.length < 2) {
        setAddError("CSV file is empty or has no data rows.");
        setImporting(false);
        return;
      }

      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
      const rows = lines.slice(1).map((line) => {
        const vals = line.split(",");
        const row: Record<string, string> = {};
        headers.forEach((h, i) => { row[h] = (vals[i] || "").trim(); });
        return row;
      });

      let success = 0;
      const errors: string[] = [];

      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const unitNum = r.unit_number || r.unit || r.number || "";
        if (!unitNum) { errors.push(`Row ${i + 2}: missing unit_number`); continue; }

        const res = await fetch(`/api/properties/${propertyId}/units`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            unit_number: unitNum,
            unit_type: r.unit_type || r.type || "1br",
            sqft: r.sqft ? Number(r.sqft) : null,
            bedrooms: r.bedrooms ? Number(r.bedrooms) : null,
            bathrooms: r.bathrooms ? Number(r.bathrooms) : null,
            floor_number: r.floor_number || r.floor ? Number(r.floor_number || r.floor) : null,
            market_rent: r.market_rent || r.rent ? Number(r.market_rent || r.rent) : null,
            status: r.status || "vacant",
          }),
        });
        if (res.ok) { success++; } else {
          const data = await res.json().catch(() => ({ error: "Unknown error" }));
          errors.push(`Row ${i + 2} (${unitNum}): ${data.error}`);
        }
      }

      setImportResult({ success, errors });
      if (success > 0) {
        setTimeout(() => window.location.reload(), 1500);
      }
    } catch {
      setAddError("Failed to read CSV file.");
    } finally {
      setImporting(false);
      if (csvInputRef.current) csvInputRef.current.value = "";
    }
  }

  async function handleAddUnit() {
    if (!addForm.unit_number.trim()) {
      setAddError(t("unitNumberRequired"));
      return;
    }
    setAddingSaving(true);
    setAddError("");
    try {
      const res = await fetch(`/api/properties/${propertyId}/units`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unit_number: addForm.unit_number.trim(),
          unit_type: addForm.unit_type,
          sqft: addForm.sqft ? Number(addForm.sqft) : null,
          bedrooms: addForm.bedrooms ? Number(addForm.bedrooms) : null,
          bathrooms: addForm.bathrooms ? Number(addForm.bathrooms) : null,
          floor_number: addForm.floor_number ? Number(addForm.floor_number) : null,
          market_rent: addForm.market_rent ? Number(addForm.market_rent) : null,
          status: "vacant",
        }),
      });
      if (res.ok) {
        window.location.reload();
      } else {
        const data = await res.json();
        setAddError(data.error || t("failedToCreateUnit"));
      }
    } catch {
      setAddError(t("networkError"));
    } finally {
      setAddingSaving(false);
    }
  }

  function unitTypeLabel(ut: string): string {
    const map: Record<string, string> = {
      studio: t("unitTypeStudio"),
      "1br": t("unitType1br"),
      "2br": t("unitType2br"),
      "3br": t("unitType3br"),
      office: t("unitTypeOffice"),
      retail: t("unitTypeRetail"),
      warehouse: t("unitTypeWarehouse"),
    };
    return map[ut] ?? ut;
  }

  // Build a map of unit_id -> active lease tenant name
  const tenantByUnit = new Map<string, string>();
  for (const l of leases) {
    if (l.status === "active" && l.unit_id) {
      tenantByUnit.set(l.unit_id, l.tenant_name);
    }
  }

  // Sort: vacant/maintenance first, then occupied
  const statusOrder: Record<string, number> = {
    vacant: 0,
    maintenance: 1,
    reserved: 2,
    occupied: 3,
  };
  const sorted = [...units].sort(
    (a, b) => (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9)
  );

  const addUnitFormUI = showAddForm ? (
    <div style={{ padding: "16px", marginBottom: "16px", background: "rgba(var(--color-blue-rgb, 29, 78, 216), 0.05)", borderRadius: "8px", border: "1px solid rgba(var(--color-blue-rgb, 29, 78, 216), 0.2)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
        <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>{t("addNewUnit")}</span>
        <button className="ui-btn ui-btn-sm ui-btn-ghost" onClick={() => { setShowAddForm(false); resetAddForm(); }}><X size={14} /></button>
      </div>
      {addError && <div className="form-error" style={{ marginBottom: "12px" }}>{addError}</div>}
      <div className="modal-form-grid">
        <div className="form-group"><label className="form-label">{t("unitNumber")} *</label><input className="form-input" value={addForm.unit_number} onChange={(e) => setAddForm({ ...addForm, unit_number: e.target.value })} placeholder="101, A1, etc." /></div>
        <div className="form-group"><label className="form-label">{t("unitType")}</label><select className="form-select" value={addForm.unit_type} onChange={(e) => setAddForm({ ...addForm, unit_type: e.target.value })}><option value="studio">{t("unitTypeStudio")}</option><option value="1br">{t("unitType1br")}</option><option value="2br">{t("unitType2br")}</option><option value="3br">{t("unitType3br")}</option><option value="office">{t("unitTypeOffice")}</option><option value="retail">{t("unitTypeRetail")}</option><option value="warehouse">{t("unitTypeWarehouse")}</option></select></div>
        <div className="form-group"><label className="form-label">{t("sqFt")}</label><input className="form-input" type="number" value={addForm.sqft} onChange={(e) => setAddForm({ ...addForm, sqft: e.target.value })} placeholder="0" /></div>
        <div className="form-group"><label className="form-label">{t("marketRent")}</label><input className="form-input" type="number" value={addForm.market_rent} onChange={(e) => setAddForm({ ...addForm, market_rent: e.target.value })} placeholder="0" /></div>
        <div className="form-group"><label className="form-label">{t("bedrooms")}</label><input className="form-input" type="number" value={addForm.bedrooms} onChange={(e) => setAddForm({ ...addForm, bedrooms: e.target.value })} placeholder="0" /></div>
        <div className="form-group"><label className="form-label">{t("bathrooms")}</label><input className="form-input" type="number" value={addForm.bathrooms} onChange={(e) => setAddForm({ ...addForm, bathrooms: e.target.value })} placeholder="0" /></div>
        <div className="form-group"><label className="form-label">{t("floorNumber")}</label><input className="form-input" type="number" value={addForm.floor_number} onChange={(e) => setAddForm({ ...addForm, floor_number: e.target.value })} placeholder="0" /></div>
      </div>
      <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "12px" }}>
        <button className="ui-btn ui-btn-md ui-btn-secondary" onClick={() => { setShowAddForm(false); resetAddForm(); }} disabled={addingSaving}>{t("cancel")}</button>
        <button className="ui-btn ui-btn-md ui-btn-primary" onClick={handleAddUnit} disabled={addingSaving}>{addingSaving ? <><Loader2 size={14} className="spin" /> {t("saving")}</> : <><Plus size={14} /> {t("addUnit")}</>}</button>
      </div>
    </div>
  ) : null;

  const importFeedbackUI = (
    <>
      <input ref={csvInputRef} type="file" accept=".csv" style={{ display: "none" }} onChange={handleCsvImport} />
      {importing && (
        <div style={{ padding: "12px 16px", marginBottom: "12px", background: "rgba(var(--color-blue-rgb, 29, 78, 216), 0.08)", borderRadius: "8px", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "8px" }}>
          <Loader2 size={14} className="spin" /> {t("importingUnits")}
        </div>
      )}
      {importResult && (
        <div style={{ padding: "12px 16px", marginBottom: "12px", background: importResult.errors.length ? "rgba(var(--color-amber-rgb, 245, 158, 11), 0.08)" : "rgba(var(--color-green-rgb, 34, 197, 94), 0.08)", borderRadius: "8px", fontSize: "0.85rem" }}>
          <strong>{importResult.success}</strong> {t("unitsImported")}{importResult.errors.length > 0 && `, ${importResult.errors.length} ${t("errors")}`}
          {importResult.errors.length > 0 && (
            <ul style={{ margin: "8px 0 0", paddingLeft: "20px", fontSize: "0.8rem", color: "var(--muted)" }}>
              {importResult.errors.slice(0, 5).map((err, i) => <li key={i}>{err}</li>)}
              {importResult.errors.length > 5 && <li>...and {importResult.errors.length - 5} more</li>}
            </ul>
          )}
        </div>
      )}
      {addError && !showAddForm && <div className="form-error" style={{ marginBottom: "12px" }}>{addError}</div>}
    </>
  );

  if (units.length === 0) {
    return (
      <div style={{ padding: "20px" }}>
        {importFeedbackUI}
        {addUnitFormUI}
        {!showAddForm && (
          <div className="properties-empty" style={{ padding: "40px 20px" }}>
            <div className="properties-empty-title">{t("noUnits")}</div>
            <div className="properties-empty-desc">{t("addUnitsDesc")}</div>
            <div style={{ display: "flex", gap: "8px", marginTop: "16px", justifyContent: "center" }}>
              <button className="ui-btn ui-btn-md ui-btn-primary" onClick={() => setShowAddForm(true)}><Plus size={14} /> {t("addUnit")}</button>
              <button className="ui-btn ui-btn-md ui-btn-secondary" onClick={() => csvInputRef.current?.click()} disabled={importing}><Upload size={14} /> {t("importCSV")}</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  const vacantCount = units.filter((u) => u.status === "vacant").length;
  const occupiedCount = units.filter((u) => u.status === "occupied").length;
  const occupancyRate = units.length > 0 ? Math.round((occupiedCount / units.length) * 100) : 0;

  return (
    <>
      {/* Summary Cards + Actions */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", flex: 1, marginRight: "16px" }}>
          <div className="card" style={{ padding: "14px 18px", margin: 0 }}>
            <div style={{ fontSize: "0.75rem", color: "var(--muted)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.03em" }}>{t("totalUnits")}</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--foreground)", marginTop: "4px" }}>{units.length}</div>
          </div>
          <div className="card" style={{ padding: "14px 18px", margin: 0 }}>
            <div style={{ fontSize: "0.75rem", color: "var(--muted)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.03em" }}>{t("vacant")}</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 700, color: vacantCount > 0 ? "var(--color-amber, #f59e0b)" : "var(--foreground)", marginTop: "4px" }}>{vacantCount}</div>
          </div>
          <div className="card" style={{ padding: "14px 18px", margin: 0 }}>
            <div style={{ fontSize: "0.75rem", color: "var(--muted)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.03em" }}>{t("occupancyRate")}</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 700, color: occupancyRate >= 90 ? "var(--color-green, #22c55e)" : occupancyRate >= 70 ? "var(--color-amber, #f59e0b)" : "var(--color-red, #ef4444)", marginTop: "4px" }}>{occupancyRate}%</div>
          </div>
        </div>
        {!showAddForm && (
          <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
            <button className="ui-btn ui-btn-sm ui-btn-secondary" onClick={() => csvInputRef.current?.click()} disabled={importing}><Upload size={14} /> {t("importCSV")}</button>
            <button className="ui-btn ui-btn-sm ui-btn-primary" onClick={() => setShowAddForm(true)}><Plus size={14} /> {t("addUnit")}</button>
          </div>
        )}
      </div>
      {importFeedbackUI}
      {addUnitFormUI}
      <div className="units-grid">
        {sorted.map((unit) => {
          const tenant = tenantByUnit.get(unit.id);
          const isVacant = unit.status === "vacant";
          return (
            <div
              key={unit.id}
              className="card unit-card clickable"
              onClick={() => onSelectUnit(unit)}
              style={
                isVacant
                  ? {
                      borderColor: "rgba(var(--color-amber-rgb, 245, 158, 11), 0.4)",
                      background: "rgba(var(--color-amber-rgb, 245, 158, 11), 0.05)",
                    }
                  : undefined
              }
            >
              <span className={`unit-status-dot ${unit.status}`} />
              <div className="unit-card-info">
                <div className="unit-card-number">{t("unitLabel", { number: unit.unit_number })}</div>
                <div className="unit-card-meta">
                  {unitTypeLabel(unit.unit_type)}
                  {unit.sqft ? ` -- ${unit.sqft.toLocaleString()} sqft` : ""}
                  {unit.floor_number ? ` -- ${t("floorLabel", { number: unit.floor_number })}` : ""}
                </div>
                {tenant && (
                  <div style={{ fontSize: "0.78rem", color: "var(--muted)", marginTop: "2px" }}>
                    {t("tenantLabel", { name: tenant })}
                  </div>
                )}
              </div>
              <div className="unit-card-right">
                <div className="unit-card-rent">
                  {unit.market_rent ? formatCurrency(unit.market_rent) : "--"}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "flex-end" }}>
                  <UnitStatusBadge status={unit.status} />
                  <button
                    className="ui-btn ui-btn-sm ui-btn-ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditUnit(unit);
                    }}
                    title={t("editUnit")}
                  >
                    <Pencil size={13} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

/* ==================================================================== */
/*  Leases Tab                                                           */
/* ==================================================================== */

function LeasesTabContent({
  propertyId,
  leases,
  unitCount,
  onSwitchToUnits,
  onSelectLease,
}: {
  propertyId: string;
  leases: LeaseRow[];
  unitCount: number;
  onSwitchToUnits: () => void;
  onSelectLease: (l: LeaseRow) => void;
}) {
  const t = useTranslations("app");
  const locale = useLocale();
  const dateLocale = locale === "es" ? "es" : "en-US";

  const activeLeases = leases.filter((l) => l.status === "active" || l.status === "expired");

  // Silently backfill any missing rent accrual JEs when the Leases tab mounts.
  // This handles leases created before auto-generation was added. Fire-and-forget.
  const accrualBackfillRan = useRef(false);
  useEffect(() => {
    if (activeLeases.length > 0 && !accrualBackfillRan.current) {
      accrualBackfillRan.current = true;
      fetch(`/api/properties/${propertyId}/rent-accrual`, { method: "POST" })
        .catch(() => {});
    }
  }, [activeLeases.length, propertyId]);

  function formatDate(d: string | null | undefined): string {
    if (!d) return "--";
    return formatDateSafe(d);
  }

  if (leases.length === 0) {
    return (
      <div className="properties-empty" style={{ padding: "40px 20px" }}>
        <div className="properties-empty-title">{t("noLeases")}</div>
        <div className="properties-empty-desc">
          {unitCount === 0 ? t("addUnitsFirstForLeases") : t("leasesWillAppearHere")}
        </div>
        {unitCount === 0 && (
          <button className="ui-btn ui-btn-md ui-btn-primary" style={{ marginTop: "16px" }} onClick={onSwitchToUnits}>
            <Plus size={14} /> {t("addUnitsFirst")}
          </button>
        )}
      </div>
    );
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table className="lease-table">
        <thead>
          <tr>
            <th>{t("unit")}</th>
            <th>{t("tenant")}</th>
            <th>{t("monthlyRent")}</th>
            <th>{t("start")}</th>
            <th>{t("end")}</th>
            <th>{t("status")}</th>
          </tr>
        </thead>
        <tbody>
          {leases.map((lease) => {
            const expiring =
              lease.status === "active" &&
              lease.lease_end &&
              (() => {
                const end = new Date(lease.lease_end).getTime();
                const now = Date.now();
                const ninetyDays = 90 * 24 * 60 * 60 * 1000;
                return end > now && end - now <= ninetyDays;
              })();

            return (
              <tr
                key={lease.id}
                className={`clickable-row ${expiring ? "expiring-soon" : ""}`}
                onClick={() => onSelectLease(lease)}
              >
                <td>{lease.units?.unit_number ?? "--"}</td>
                <td>
                  <div style={{ fontWeight: 500 }}>{lease.tenant_name}</div>
                  {lease.tenant_email && (
                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--muted)",
                      }}
                    >
                      {lease.tenant_email}
                    </div>
                  )}
                </td>
                <td>{formatCurrency(lease.monthly_rent)}</td>
                <td>{formatDate(lease.lease_start)}</td>
                <td>
                  {formatDate(lease.lease_end)}
                  {expiring && (
                    <span
                      className="badge badge-amber"
                      style={{ marginLeft: "8px" }}
                    >
                      {t("expiringSoon")}
                    </span>
                  )}
                </td>
                <td>
                  <LeaseStatusBadge status={lease.status} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ==================================================================== */
/*  Maintenance Tab (Kanban)                                             */
/* ==================================================================== */

function MaintenanceTabContent({
  requests,
  onSelectMaint,
}: {
  requests: MaintenanceRequestRow[];
  onSelectMaint: (m: MaintenanceRequestRow) => void;
}) {
  const t = useTranslations("app");
  const locale = useLocale();
  const dateLocale = locale === "es" ? "es" : "en-US";

  function formatDate(d: string | null | undefined): string {
    if (!d) return "--";
    return formatDateSafe(d);
  }

  const columns: { key: string; label: string }[] = [
    { key: "submitted", label: t("maintStatusSubmitted") },
    { key: "assigned", label: t("maintStatusAssigned") },
    { key: "in_progress", label: t("maintStatusInProgress") },
    { key: "completed", label: t("maintStatusCompleted") },
  ];

  const grouped = new Map<string, MaintenanceRequestRow[]>();
  for (const col of columns) {
    grouped.set(col.key, []);
  }
  for (const req of requests) {
    // Map legacy "open" status to "submitted"
    const status = (req.status as string) === "open" ? "submitted" : req.status;
    const bucket = grouped.get(status);
    if (bucket) {
      bucket.push(req);
    }
  }

  return (
    <div className="maintenance-board">
      {columns.map((col) => {
        const items = grouped.get(col.key) ?? [];
        return (
          <div key={col.key} className="maintenance-column">
            <div className="maintenance-column-header">
              <span className="maintenance-column-title">{col.label}</span>
              <span className="maintenance-column-count">{items.length}</span>
            </div>
            {items.map((req) => (
              <div
                key={req.id}
                className="maintenance-card clickable"
                onClick={() => onSelectMaint(req)}
              >
                <div className={`maintenance-card-stripe ${req.priority}`} />
                <div className="maintenance-card-title">{req.title}</div>
                <div className="maintenance-card-meta">
                  {req.units?.unit_number && (
                    <span>{t("unitLabel", { number: req.units.unit_number })}</span>
                  )}
                  <span style={{ textTransform: "capitalize" }}>
                    {req.category}
                  </span>
                  <span>{formatDate(req.created_at)}</span>
                </div>
                <div className="maintenance-card-footer">
                  <PriorityBadge priority={req.priority} />
                  {req.estimated_cost != null && (
                    <span
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--muted)",
                      }}
                    >
                      {t("estAbbr")} {formatCurrency(req.estimated_cost)}
                    </span>
                  )}
                </div>
              </div>
            ))}
            {items.length === 0 && (
              <div
                style={{
                  fontSize: "0.78rem",
                  color: "var(--muted)",
                  textAlign: "center",
                  padding: "20px 0",
                }}
              >
                {t("noRequests")}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ==================================================================== */
/*  Financials Tab                                                       */
/* ==================================================================== */

const EXPENSE_TYPE_LABELS: Record<string, string> = {
  maintenance: "Repairs & Maintenance",
  cam: "Common Area Maintenance",
  property_tax: "Property Taxes",
  insurance: "Insurance",
  utilities: "Utilities",
  management_fee: "Management Fees",
  capital_expense: "Capital Expenditures",
  hoa_fee: "HOA / Association Fees",
  marketing: "Leasing & Marketing",
  legal: "Legal & Professional",
  other: "Other",
};

interface PaymentMethodItem {
  id: string;
  method_type: string;
  label: string;
  instructions: string;
  recipient_info: string | null;
  is_enabled: boolean;
}

/* ------------------------------------------------------------------ */
/*  Payments Tab                                                       */
/* ------------------------------------------------------------------ */

function PaymentsTabContent({ payments }: { payments: PropertyRentPayment[] }) {
  const t = useTranslations("app");
  const locale = useLocale();
  const dateLocale = locale === "es" ? "es" : "en-US";

  const totalReceived = payments
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + p.amount, 0);

  const paidCount = payments.filter((p) => p.status === "paid").length;

  function getStatusBadge(status: string) {
    switch (status) {
      case "paid": return "badge badge-green";
      case "pending": return "badge badge-amber";
      case "overdue": case "late": case "failed": return "badge badge-red";
      default: return "badge badge-blue";
    }
  }

  function getMethodLabel(method: string | null, provider: string | null) {
    if (method === "online" && provider) {
      return `Online (${provider.charAt(0).toUpperCase() + provider.slice(1)})`;
    }
    if (method) {
      return method.charAt(0).toUpperCase() + method.slice(1);
    }
    return "--";
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Summary cards */}
      <div className="property-stats-grid">
        <div className="stat-card">
          <span className="stat-label">{t("totalReceived")}</span>
          <span className="stat-value" style={{ color: "var(--color-green)" }}>
            {formatCurrency(totalReceived)}
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-label">{t("paymentCount")}</span>
          <span className="stat-value">{paidCount}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">{t("totalTransactions")}</span>
          <span className="stat-value">{payments.length}</span>
        </div>
      </div>

      {/* Payments table */}
      {payments.length > 0 ? (
        <div className="card" style={{ padding: 0 }}>
          <div style={{ overflowX: "auto" }}>
            <table className="invoice-table">
              <thead>
                <tr>
                  <th>{t("thDate")}</th>
                  <th>{t("tenant")}</th>
                  <th>{t("unit")}</th>
                  <th style={{ textAlign: "right" }}>{t("thAmount")}</th>
                  <th>{t("thStatus")}</th>
                  <th>{t("thMethod")}</th>
                  <th>{t("journalEntry")}</th>
                  <th>{t("notes")}</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td>
                      {p.payment_date
                        ? formatDateSafe(p.payment_date)
                        : "--"}
                    </td>
                    <td>{p.tenant_name || "--"}</td>
                    <td>{p.unit_number || "--"}</td>
                    <td className="amount-col">{formatCurrency(p.amount)}</td>
                    <td>
                      <span className={getStatusBadge(p.status)}>{p.status}</span>
                    </td>
                    <td>{getMethodLabel(p.method, p.gateway_provider)}</td>
                    <td>
                      {p.je_number ? (
                        <span className="badge badge-blue">{p.je_number}</span>
                      ) : (
                        <span style={{ color: "var(--muted)", fontSize: "0.82rem" }}>--</span>
                      )}
                    </td>
                    <td style={{ fontSize: "0.82rem", color: "var(--muted)", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {p.notes || "--"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="card">
          <div style={{ textAlign: "center", padding: "40px 20px" }}>
            <CreditCard size={48} style={{ color: "var(--muted)", marginBottom: 12 }} />
            <div style={{ fontWeight: 600, fontSize: "1rem", marginBottom: 4 }}>
              {t("noPaymentsReceived")}
            </div>
            <div style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
              {t("noPaymentsReceivedDesc")}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Financials Tab                                                     */
/* ------------------------------------------------------------------ */

function FinancialsTabContent({
  financials,
  propertyId,
}: {
  financials: PropertyFinancials;
  propertyId: string;
}) {
  const t = useTranslations("app");

  // Payment methods state
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodItem[]>([]);
  const [loadingMethods, setLoadingMethods] = useState(true);
  const [showAddMethod, setShowAddMethod] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethodItem | null>(null);
  const [methodForm, setMethodForm] = useState({
    method_type: "zelle",
    label: "Zelle",
    instructions: "",
    recipient_info: "",
  });
  const [methodSaving, setMethodSaving] = useState(false);
  const [methodError, setMethodError] = useState("");

  // Online payments gateway state
  const [gatewayStatus, setGatewayStatus] = useState<{
    hasGateway: boolean;
    provider: string | null;
    isActive: boolean;
    onboardedAt: string | null;
    accountName: string | null;
    accountStatus: {
      connected: boolean;
      accountName: string | null;
    } | null;
  } | null>(null);
  const [gatewayLoading, setGatewayLoading] = useState(true);
  const [gatewaySaving, setGatewaySaving] = useState(false);
  const [gatewayError, setGatewayError] = useState("");
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [gatewayFields, setGatewayFields] = useState<Record<string, string>>({});

  const METHOD_TYPES = [
    { value: "zelle", label: "Zelle" },
    { value: "cashapp", label: "Cash App" },
    { value: "venmo", label: "Venmo" },
    { value: "paypal", label: "PayPal" },
    { value: "wire", label: t("wireTransfer") },
    { value: "check", label: t("checkByMail") },
    { value: "other", label: t("other") },
  ];

  useEffect(() => {
    async function fetchMethods() {
      try {
        const res = await fetch(`/api/properties/payment-methods?property_id=${propertyId}`);
        if (res.ok) {
          setPaymentMethods(await res.json());
        }
      } catch { /* ignore */ }
      setLoadingMethods(false);
    }
    async function fetchGatewayStatus() {
      try {
        const res = await fetch("/api/payments/gateway/status", { method: "POST" });
        if (res.ok) {
          setGatewayStatus(await res.json());
        }
      } catch { /* ignore */ }
      setGatewayLoading(false);
    }
    fetchMethods();
    fetchGatewayStatus();
  }, [propertyId]);

  function openAddMethod() {
    setEditingMethod(null);
    setMethodForm({ method_type: "zelle", label: "Zelle", instructions: "", recipient_info: "" });
    setMethodError("");
    setShowAddMethod(true);
  }

  function openEditMethod(m: PaymentMethodItem) {
    setEditingMethod(m);
    setMethodForm({
      method_type: m.method_type,
      label: m.label,
      instructions: m.instructions,
      recipient_info: m.recipient_info || "",
    });
    setMethodError("");
    setShowAddMethod(true);
  }

  async function handleSaveMethod() {
    if (!methodForm.instructions.trim()) {
      setMethodError(t("instructionsRequired"));
      return;
    }
    setMethodSaving(true);
    setMethodError("");
    try {
      const isEdit = !!editingMethod;
      const res = await fetch("/api/properties/payment-methods", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isEdit
            ? { id: editingMethod!.id, ...methodForm }
            : { property_id: propertyId, ...methodForm }
        ),
      });
      if (!res.ok) {
        const data = await res.json();
        setMethodError(data.error || "Failed");
        return;
      }
      const saved = await res.json();
      if (isEdit) {
        setPaymentMethods((prev) => prev.map((m) => (m.id === saved.id ? saved : m)));
      } else {
        setPaymentMethods((prev) => [...prev, saved]);
      }
      setShowAddMethod(false);
    } catch {
      setMethodError("Network error");
    } finally {
      setMethodSaving(false);
    }
  }

  async function handleDeleteMethod(id: string) {
    try {
      const res = await fetch("/api/properties/payment-methods", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setPaymentMethods((prev) => prev.filter((m) => m.id !== id));
      }
    } catch { /* ignore */ }
  }

  async function handleToggleMethod(id: string, enabled: boolean) {
    try {
      const res = await fetch("/api/properties/payment-methods", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, is_enabled: enabled }),
      });
      if (res.ok) {
        const saved = await res.json();
        setPaymentMethods((prev) => prev.map((m) => (m.id === saved.id ? saved : m)));
      }
    } catch { /* ignore */ }
  }

  async function handleSaveGateway() {
    if (!selectedProvider) return;
    const providerInfo = GATEWAY_PROVIDERS.find((p) => p.key === selectedProvider);
    if (!providerInfo) return;

    // Validate required field
    if (!gatewayFields.secret_key?.trim()) {
      setGatewayError(t("secretKeyRequired"));
      return;
    }

    setGatewaySaving(true);
    setGatewayError("");
    try {
      const res = await fetch("/api/payments/gateway/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: selectedProvider,
          credentials: gatewayFields,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setGatewayError(data.error || "Failed to save");
        return;
      }
      // Success — update local state
      setGatewayStatus({
        hasGateway: true,
        provider: selectedProvider,
        isActive: true,
        onboardedAt: new Date().toISOString(),
        accountName: data.accountName || selectedProvider,
        accountStatus: { connected: true, accountName: data.accountName },
      });
      setSelectedProvider(null);
      setGatewayFields({});
    } catch {
      setGatewayError("Network error");
    } finally {
      setGatewaySaving(false);
    }
  }

  async function handleDisconnectGateway() {
    if (!confirm(t("disconnectConfirm"))) return;
    try {
      const res = await fetch("/api/payments/gateway/disconnect", { method: "POST" });
      if (res.ok) {
        setGatewayStatus({ hasGateway: false, provider: null, isActive: false, onboardedAt: null, accountName: null, accountStatus: null });
      }
    } catch { /* ignore */ }
  }

  const maxVal = Math.max(
    financials.monthlyRevenue,
    financials.monthlyExpenses,
    1
  );

  return (
    <div className="financials-grid">
      {/* Revenue vs Expenses */}
      <div className="card">
        <div className="card-title">{t("revenueVsExpenses")}</div>
        <div className="financials-bar-row">
          <span className="financials-bar-label">{t("revenue")}</span>
          <div className="financials-bar-track">
            <div
              className="financials-bar-fill"
              style={{
                width: `${(financials.monthlyRevenue / maxVal) * 100}%`,
                background: "var(--color-green)",
              }}
            />
          </div>
          <span className="financials-bar-value">
            {formatCurrency(financials.monthlyRevenue)}
          </span>
        </div>
        <div className="financials-bar-row">
          <span className="financials-bar-label">{t("expenses")}</span>
          <div className="financials-bar-track">
            <div
              className="financials-bar-fill"
              style={{
                width: `${(financials.monthlyExpenses / maxVal) * 100}%`,
                background: "var(--color-red)",
              }}
            />
          </div>
          <span className="financials-bar-value">
            {formatCurrency(financials.monthlyExpenses)}
          </span>
        </div>
        <div className="financials-bar-row">
          <span className="financials-bar-label" style={{ fontWeight: 600 }}>
            {t("noi")}
          </span>
          <div className="financials-bar-track">
            <div
              className="financials-bar-fill"
              style={{
                width: `${(Math.abs(financials.noi) / maxVal) * 100}%`,
                background:
                  financials.noi >= 0
                    ? "var(--color-blue)"
                    : "var(--color-red)",
              }}
            />
          </div>
          <span
            className="financials-bar-value"
            style={{ fontWeight: 700 }}
          >
            {formatCurrency(financials.noi)}
          </span>
        </div>
      </div>

      {/* Rent Collection */}
      <div className="card">
        <div className="card-title">{t("rentCollectionCurrentMonth")}</div>
        <div
          style={{ display: "flex", flexDirection: "column", gap: "16px" }}
        >
          <div className="property-info-item">
            <span className="property-info-label">{t("collectionRate")}</span>
            <span
              className="property-info-value"
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: "1.5rem",
                fontWeight: 700,
                color:
                  financials.rentCollectionRate >= 95
                    ? "var(--color-green)"
                    : financials.rentCollectionRate >= 80
                      ? "var(--color-amber)"
                      : "var(--color-red)",
              }}
            >
              {formatPercent(financials.rentCollectionRate)}
            </span>
          </div>
          <div className="financials-bar-track" style={{ height: "12px" }}>
            <div
              className="financials-bar-fill"
              style={{
                width: `${Math.min(financials.rentCollectionRate, 100)}%`,
                background:
                  financials.rentCollectionRate >= 95
                    ? "var(--color-green)"
                    : financials.rentCollectionRate >= 80
                      ? "var(--color-amber)"
                      : "var(--color-red)",
                height: "12px",
              }}
            />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div className="property-info-item">
              <span className="property-info-label">{t("collected")}</span>
              <span
                className="property-info-value"
                style={{ color: "var(--color-green)" }}
              >
                {formatCurrency(financials.totalPaid)}
              </span>
            </div>
            <div
              className="property-info-item"
              style={{ textAlign: "right" }}
            >
              <span className="property-info-label">{t("totalDue")}</span>
              <span className="property-info-value">
                {formatCurrency(financials.totalDue)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Operating Expense Breakdown */}
      {financials.expenseBreakdown && financials.expenseBreakdown.length > 0 && (
        <div className="card" style={{ gridColumn: "1 / -1" }}>
          <div className="card-title">Operating Expense Breakdown (Monthly)</div>
          <div style={{ overflowX: "auto" }}>
            <table className="lease-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th style={{ textAlign: "right" }}>Monthly Amount</th>
                  <th style={{ textAlign: "right" }}>% of Total</th>
                </tr>
              </thead>
              <tbody>
                {financials.expenseBreakdown.map((item) => (
                  <tr key={item.type}>
                    <td>{EXPENSE_TYPE_LABELS[item.type] ?? item.type}</td>
                    <td style={{ textAlign: "right", fontFamily: "var(--font-serif)", fontWeight: 600 }}>
                      {formatCurrency(item.monthlyAmount)}
                    </td>
                    <td style={{ textAlign: "right", fontFamily: "var(--font-serif)" }}>
                      {financials.monthlyExpenses > 0
                        ? `${((item.monthlyAmount / financials.monthlyExpenses) * 100).toFixed(1)}%`
                        : "—"}
                    </td>
                  </tr>
                ))}
                <tr>
                  <td style={{ borderTop: "2px solid var(--border)", paddingTop: 12, fontWeight: 700 }}>
                    Total Expenses
                  </td>
                  <td style={{ textAlign: "right", fontFamily: "var(--font-serif)", fontWeight: 700, borderTop: "2px solid var(--border)", paddingTop: 12 }}>
                    {formatCurrency(financials.monthlyExpenses)}
                  </td>
                  <td style={{ textAlign: "right", fontFamily: "var(--font-serif)", fontWeight: 700, borderTop: "2px solid var(--border)", paddingTop: 12 }}>
                    100%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Online Payments (Gateway) */}
      <div className="card" style={{ gridColumn: "1 / -1" }}>
        <div className="card-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <CreditCard size={18} />
          <span>{t("onlinePaymentsTitle")}</span>
        </div>
        <p style={{ fontSize: "0.82rem", color: "var(--muted)", margin: "0 0 16px 0" }}>
          {t("onlinePaymentsDesc")}
        </p>

        {gatewayLoading ? (
          <p style={{ color: "var(--muted)", textAlign: "center", padding: "16px 0", fontSize: "0.85rem" }}>
            <Loader2 size={14} className="doc-spinner" style={{ display: "inline-block", marginRight: 6 }} />
            {t("checkingConnection")}
          </p>
        ) : gatewayStatus?.isActive && gatewayStatus.accountStatus?.connected ? (
          /* Connected state */
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderRadius: 8, background: "color-mix(in srgb, var(--color-green) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--color-green) 20%, transparent)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <CheckCircle2 size={18} style={{ color: "var(--color-green)" }} />
              <div>
                <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>
                  {GATEWAY_PROVIDERS.find((p) => p.key === gatewayStatus.provider)?.name || gatewayStatus.provider}
                  <span style={{ marginLeft: 8, fontSize: "0.75rem", padding: "2px 8px", borderRadius: 12, background: "color-mix(in srgb, var(--color-green) 15%, transparent)", color: "var(--color-green)" }}>
                    {t("providerConnected")}
                  </span>
                </div>
                <div style={{ fontSize: "0.82rem", color: "var(--muted)", marginTop: 2 }}>
                  {gatewayStatus.accountName || t("providerActive")}
                </div>
              </div>
            </div>
            <button
              className="ui-btn ui-btn-sm ui-btn-outline"
              style={{ color: "var(--color-red)", borderColor: "var(--color-red)" }}
              onClick={handleDisconnectGateway}
            >
              {t("disconnectProvider")}
            </button>
          </div>
        ) : selectedProvider ? (
          /* API key input form */
          (() => {
            const providerInfo = GATEWAY_PROVIDERS.find((p) => p.key === selectedProvider);
            if (!providerInfo) return null;
            return (
              <div style={{ border: "1px solid var(--border)", borderRadius: 8, padding: 16 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                  <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>
                    {providerInfo.name} — {t("enterApiKeys")}
                  </div>
                  <button
                    className="ui-btn ui-btn-sm ui-btn-ghost"
                    onClick={() => { setSelectedProvider(null); setGatewayFields({}); setGatewayError(""); }}
                  >
                    <X size={14} />
                  </button>
                </div>
                <p style={{ fontSize: "0.82rem", color: "var(--muted)", margin: "0 0 14px 0" }}>
                  {t("apiKeyInstructions")}
                </p>
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
                        width: "100%",
                        padding: "8px 12px",
                        borderRadius: 6,
                        border: "1px solid var(--border)",
                        background: "var(--bg)",
                        color: "var(--text)",
                        fontSize: "0.85rem",
                        fontFamily: "monospace",
                      }}
                    />
                  </div>
                ))}
                {gatewayError && (
                  <p style={{ color: "var(--color-red)", fontSize: "0.82rem", margin: "0 0 10px 0" }}>
                    {gatewayError}
                  </p>
                )}
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <button
                    className="ui-btn ui-btn-sm ui-btn-outline"
                    onClick={() => { setSelectedProvider(null); setGatewayFields({}); setGatewayError(""); }}
                  >
                    {t("cancel")}
                  </button>
                  <button
                    className="ui-btn ui-btn-sm ui-btn-primary"
                    disabled={gatewaySaving}
                    onClick={handleSaveGateway}
                    style={{ display: "flex", alignItems: "center", gap: 6 }}
                  >
                    {gatewaySaving ? <Loader2 size={14} className="doc-spinner" /> : <Check size={14} />}
                    {t("saveAndConnect")}
                  </button>
                </div>
              </div>
            );
          })()
        ) : (
          /* No gateway — show provider selection */
          <div>
            <p style={{ fontSize: "0.82rem", color: "var(--muted)", marginBottom: 12 }}>
              {t("selectPaymentProvider")}
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
              {GATEWAY_PROVIDERS.map((gp) => (
                <div
                  key={gp.key}
                  style={{
                    padding: "14px 16px",
                    borderRadius: 8,
                    border: "1px solid var(--border)",
                    background: "var(--bg-secondary)",
                    opacity: gp.available ? 1 : 0.5,
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: 2 }}>{gp.name}</div>
                  <div style={{ fontSize: "0.78rem", color: "var(--muted)", marginBottom: 10 }}>{gp.description}</div>
                  {gp.available ? (
                    <button
                      className="ui-btn ui-btn-sm ui-btn-primary"
                      style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                      onClick={() => { setSelectedProvider(gp.key); setGatewayFields({}); setGatewayError(""); }}
                    >
                      <KeyRound size={14} />
                      {t("setupProvider")}
                    </button>
                  ) : (
                    <span style={{ fontSize: "0.78rem", color: "var(--muted)", fontStyle: "italic" }}>
                      {t("comingSoon")}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Payment Methods for Tenant Portal */}
      <div className="card" style={{ gridColumn: "1 / -1" }}>
        <div className="card-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>{t("paymentMethodsTitle")}</span>
          <button className="ui-btn ui-btn-sm ui-btn-primary" onClick={openAddMethod}>
            <Plus size={14} />
            {t("addPaymentMethod")}
          </button>
        </div>
        <p style={{ fontSize: "0.82rem", color: "var(--muted)", margin: "0 0 16px 0" }}>
          {t("paymentMethodsDesc")}
        </p>

        {loadingMethods ? (
          <p style={{ color: "var(--muted)", textAlign: "center", padding: "16px 0" }}>
            {t("loading")}...
          </p>
        ) : paymentMethods.length === 0 ? (
          <p style={{ fontSize: "0.85rem", color: "var(--muted)", textAlign: "center", padding: "16px 0" }}>
            {t("noPaymentMethodsConfigured")}
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {paymentMethods.map((m) => (
              <div
                key={m.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px",
                  borderRadius: 8,
                  background: "var(--bg-secondary)",
                  opacity: m.is_enabled ? 1 : 0.5,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{m.label}</div>
                  <div style={{ fontSize: "0.82rem", color: "var(--muted)", marginTop: 2 }}>
                    {m.instructions}
                  </div>
                  {m.recipient_info && (
                    <div style={{ fontSize: "0.8rem", color: "var(--color-primary)", marginTop: 2 }}>
                      {m.recipient_info}
                    </div>
                  )}
                </div>
                <label style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer", fontSize: "0.8rem" }}>
                  <input
                    type="checkbox"
                    checked={m.is_enabled}
                    onChange={(e) => handleToggleMethod(m.id, e.target.checked)}
                  />
                  {t("enabled")}
                </label>
                <button
                  className="ui-btn ui-btn-sm ui-btn-outline"
                  onClick={() => openEditMethod(m)}
                >
                  <Pencil size={12} />
                </button>
                <button
                  className="ui-btn ui-btn-sm ui-btn-outline"
                  style={{ color: "var(--color-red)" }}
                  onClick={() => handleDeleteMethod(m.id)}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Payment Method Modal */}
      {showAddMethod && (
        <div className="modal-overlay" onClick={() => setShowAddMethod(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {editingMethod ? t("editPaymentMethod") : t("addPaymentMethod")}
              </h3>
              <button className="modal-close" onClick={() => setShowAddMethod(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              {methodError && (
                <div className="tenant-alert tenant-alert-error" style={{ marginBottom: 12 }}>
                  {methodError}
                </div>
              )}
              <div className="ticket-form-group">
                <label className="ticket-form-label">{t("methodType")}</label>
                <select
                  className="ticket-form-input"
                  value={methodForm.method_type}
                  onChange={(e) => {
                    const type = e.target.value;
                    const found = METHOD_TYPES.find((mt) => mt.value === type);
                    setMethodForm({
                      ...methodForm,
                      method_type: type,
                      label: found?.label || type,
                    });
                  }}
                >
                  {METHOD_TYPES.map((mt) => (
                    <option key={mt.value} value={mt.value}>
                      {mt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="ticket-form-group">
                <label className="ticket-form-label">{t("displayLabel")}</label>
                <input
                  type="text"
                  className="ticket-form-input"
                  value={methodForm.label}
                  onChange={(e) => setMethodForm({ ...methodForm, label: e.target.value })}
                  placeholder="e.g. Zelle"
                />
              </div>
              <div className="ticket-form-group">
                <label className="ticket-form-label">{t("paymentInstructions")}</label>
                <textarea
                  className="ticket-form-input"
                  rows={3}
                  value={methodForm.instructions}
                  onChange={(e) => setMethodForm({ ...methodForm, instructions: e.target.value })}
                  placeholder={t("paymentInstructionsPlaceholder")}
                />
              </div>
              <div className="ticket-form-group">
                <label className="ticket-form-label">{t("recipientInfo")}</label>
                <input
                  type="text"
                  className="ticket-form-input"
                  value={methodForm.recipient_info}
                  onChange={(e) => setMethodForm({ ...methodForm, recipient_info: e.target.value })}
                  placeholder={t("recipientInfoPlaceholder")}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowAddMethod(false)}>
                {t("cancel")}
              </button>
              <button className="btn-primary" onClick={handleSaveMethod} disabled={methodSaving}>
                {methodSaving ? t("saving") : t("save")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ==================================================================== */
/*  Announcements Tab                                                     */
/* ==================================================================== */

function AnnouncementsTabContent({
  announcements,
  propertyId,
}: {
  announcements: AnnouncementRow[];
  propertyId: string;
}) {
  const t = useTranslations("app");
  const locale = useLocale();
  const dateLocale = locale === "es" ? "es" : "en-US";
  const router = useRouter();

  const [showCreate, setShowCreate] = useState(false);
  const [createTitle, setCreateTitle] = useState("");
  const [createContent, setCreateContent] = useState("");
  const [createCategory, setCreateCategory] = useState("general");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  function openCreate() {
    setCreateTitle("");
    setCreateContent("");
    setCreateCategory("general");
    setCreateError("");
    setShowCreate(true);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!createTitle.trim() || !createContent.trim()) {
      setCreateError(t("annTitleContentRequired"));
      return;
    }
    setCreating(true);
    setCreateError("");
    try {
      const res = await fetch(`/api/properties/${propertyId}/announcements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: createTitle,
          content: createContent,
          category: createCategory,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create");
      setShowCreate(false);
      router.refresh();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(
        `/api/properties/${propertyId}/announcements/${deleteId}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete");
      }
      setDeleteId(null);
      router.refresh();
    } catch {
      alert("Failed to delete announcement");
    } finally {
      setDeleting(false);
    }
  }

  function getCategoryBadge(cat: string) {
    switch (cat) {
      case "emergency":
        return "badge badge-red";
      case "maintenance":
        return "badge badge-amber";
      case "event":
        return "badge badge-blue";
      default:
        return "badge badge-green";
    }
  }

  function formatDate(d: string) {
    return formatDateSafe(d);
  }

  const CATEGORIES = [
    { value: "general", label: t("annCatGeneral") },
    { value: "maintenance", label: t("annCatMaintenance") },
    { value: "emergency", label: t("annCatEmergency") },
    { value: "event", label: t("annCatEvent") },
  ];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 600 }}>
            {t("annTitle")}
          </h3>
          <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginTop: 2 }}>
            {t("annSubtitle")}
          </p>
        </div>
        <button
          className="ui-btn ui-btn-md ui-btn-primary"
          onClick={openCreate}
          style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
        >
          <Plus size={15} />
          {t("annCreate")}
        </button>
      </div>

      {announcements.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {announcements.map((ann) => (
            <div key={ann.id} className="card" style={{ padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span className={getCategoryBadge(ann.category)}>
                      {ann.category.charAt(0).toUpperCase() + ann.category.slice(1)}
                    </span>
                    {!ann.is_active && (
                      <span className="badge" style={{ opacity: 0.6 }}>{t("annInactive")}</span>
                    )}
                  </div>
                  <div style={{ fontWeight: 600, fontSize: "0.95rem", marginBottom: 4 }}>
                    {ann.title}
                  </div>
                  <div style={{ fontSize: "0.85rem", color: "var(--muted)", marginBottom: 8, whiteSpace: "pre-wrap" }}>
                    {ann.content.length > 300 ? ann.content.slice(0, 300) + "..." : ann.content}
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "var(--muted)" }}>
                    {t("annPublished", { date: formatDate(ann.published_at) })}
                    {ann.expires_at && (
                      <> {"\u2014"} {t("annExpires", { date: formatDate(ann.expires_at) })}</>
                    )}
                  </div>
                </div>
                <button
                  className="ui-btn ui-btn-sm ui-btn-outline"
                  onClick={() => setDeleteId(ann.id)}
                  style={{ display: "inline-flex", alignItems: "center", gap: 4, flexShrink: 0, color: "var(--color-red)" }}
                >
                  <Trash2 size={13} />
                  {t("delete")}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card" style={{ padding: 48, textAlign: "center" }}>
          <Megaphone size={48} style={{ color: "var(--muted)", marginBottom: 12 }} />
          <div style={{ fontSize: "1rem", fontWeight: 600, marginBottom: 6 }}>
            {t("annEmpty")}
          </div>
          <div style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
            {t("annEmptyDesc")}
          </div>
        </div>
      )}

      {/* Create Announcement Modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal-content" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{t("annCreateTitle")}</h3>
              <button className="modal-close" onClick={() => setShowCreate(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: "0.85rem", color: "var(--muted)", margin: "0 0 16px 0" }}>
                {t("annCreateDesc")}
              </p>

              {createError && (
                <div className="form-error">{createError}</div>
              )}

              <form onSubmit={handleCreate}>
                <div className="ticket-form-group">
                  <label className="ticket-form-label">{t("annFieldTitle")}</label>
                  <input
                    type="text"
                    className="ticket-form-input"
                    value={createTitle}
                    onChange={(e) => setCreateTitle(e.target.value)}
                    placeholder={t("annTitlePlaceholder")}
                    required
                    disabled={creating}
                  />
                </div>

                <div className="ticket-form-group">
                  <label className="ticket-form-label">{t("annFieldCategory")}</label>
                  <select
                    className="ticket-form-input"
                    value={createCategory}
                    onChange={(e) => setCreateCategory(e.target.value)}
                    disabled={creating}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>

                <div className="ticket-form-group">
                  <label className="ticket-form-label">{t("annFieldContent")}</label>
                  <textarea
                    className="ticket-form-input"
                    value={createContent}
                    onChange={(e) => setCreateContent(e.target.value)}
                    placeholder={t("annContentPlaceholder")}
                    rows={5}
                    style={{ resize: "vertical" }}
                    required
                    disabled={creating}
                  />
                </div>

                <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 8 }}>
                  <button
                    type="button"
                    className="ui-btn ui-btn-md ui-btn-outline"
                    onClick={() => setShowCreate(false)}
                    disabled={creating}
                  >
                    {t("cancel")}
                  </button>
                  <button
                    type="submit"
                    className="ui-btn ui-btn-md ui-btn-primary"
                    disabled={creating}
                    style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                  >
                    <Megaphone size={15} />
                    {creating ? t("annPublishing") : t("annPublish")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Announcement Confirmation */}
      {deleteId && (
        <div className="modal-overlay" onClick={() => setDeleteId(null)}>
          <div className="modal-content" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-body">
              <h3 style={{ margin: "0 0 12px 0", fontSize: "1.05rem" }}>{t("annDeleteTitle")}</h3>
              <p style={{ fontSize: "0.85rem", color: "var(--muted)", margin: "0 0 20px 0" }}>
                {t("annDeleteDesc")}
              </p>
              <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
                <button
                  className="ui-btn ui-btn-md ui-btn-outline"
                  onClick={() => setDeleteId(null)}
                  disabled={deleting}
                >
                  {t("cancel")}
                </button>
                <button
                  className="ui-btn ui-btn-md ui-btn-primary"
                  onClick={handleDelete}
                  disabled={deleting}
                  style={{ background: "var(--color-red)" }}
                >
                  {deleting ? t("annDeleting") : t("annDeleteConfirm")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ==================================================================== */
/*  Edit Property Modal                                                  */
/* ==================================================================== */

function EditPropertyModal({
  property,
  saving,
  setSaving,
  onClose,
}: {
  property: PropertyRow;
  saving: boolean;
  setSaving: (v: boolean) => void;
  onClose: () => void;
}) {
  const t = useTranslations("app");
  const [form, setForm] = useState({
    name: property.name,
    property_type: property.property_type,
    address_line1: property.address_line1,
    city: property.city,
    state: property.state,
    zip: property.zip,
    year_built: property.year_built ?? "",
    total_sqft: property.total_sqft ?? "",
    purchase_price: property.purchase_price ?? "",
    current_value: property.current_value ?? "",
  });
  const [error, setError] = useState("");

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/properties/${property.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          property_type: form.property_type,
          address_line1: form.address_line1,
          city: form.city,
          state: form.state,
          zip: form.zip,
          year_built: form.year_built !== "" ? Number(form.year_built) : null,
          total_sqft: form.total_sqft !== "" ? Number(form.total_sqft) : null,
          purchase_price:
            form.purchase_price !== "" ? Number(form.purchase_price) : null,
          current_value:
            form.current_value !== "" ? Number(form.current_value) : null,
        }),
      });
      if (res.ok) {
        window.location.reload();
      } else {
        const data = await res.json();
        setError(data.error || t("failedToUpdateProperty"));
      }
    } catch {
      setError(t("networkError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content modal-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3>{t("editProperty")}</h3>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className="modal-body">
          {error && <div className="form-error">{error}</div>}
          <div className="modal-form-grid">
            <div className="form-group full-width">
              <label className="form-label">{t("propertyName")}</label>
              <input
                className="form-input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">{t("propertyType")}</label>
              <select
                className="form-select"
                value={form.property_type}
                onChange={(e) =>
                  setForm({ ...form, property_type: e.target.value as PropertyRow["property_type"] })
                }
              >
                <option value="residential">{t("propTypeResidential")}</option>
                <option value="commercial">{t("propTypeCommercial")}</option>
                <option value="industrial">{t("propTypeIndustrial")}</option>
                <option value="mixed_use">{t("propTypeMixedUse")}</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">{t("yearBuilt")}</label>
              <input
                className="form-input"
                type="number"
                value={form.year_built}
                onChange={(e) =>
                  setForm({ ...form, year_built: e.target.value })
                }
                placeholder={t("yearBuiltPlaceholder")}
              />
            </div>
            <div className="form-group full-width">
              <label className="form-label">{t("address")}</label>
              <input
                className="form-input"
                value={form.address_line1}
                onChange={(e) =>
                  setForm({ ...form, address_line1: e.target.value })
                }
              />
            </div>
            <div className="form-group">
              <label className="form-label">{t("city")}</label>
              <input
                className="form-input"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">{t("state")}</label>
              <input
                className="form-input"
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">{t("zip")}</label>
              <input
                className="form-input"
                value={form.zip}
                onChange={(e) => setForm({ ...form, zip: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">{t("totalSqFt")}</label>
              <input
                className="form-input"
                type="number"
                value={form.total_sqft}
                onChange={(e) =>
                  setForm({ ...form, total_sqft: e.target.value })
                }
                placeholder="0"
              />
            </div>
            <div className="form-group">
              <label className="form-label">{t("purchasePrice")}</label>
              <input
                className="form-input"
                type="number"
                value={form.purchase_price}
                onChange={(e) =>
                  setForm({ ...form, purchase_price: e.target.value })
                }
                placeholder="0"
              />
            </div>
            <div className="form-group">
              <label className="form-label">{t("currentValue")}</label>
              <input
                className="form-input"
                type="number"
                value={form.current_value}
                onChange={(e) =>
                  setForm({ ...form, current_value: e.target.value })
                }
                placeholder="0"
              />
            </div>
          </div>
          <div className="modal-footer" style={{ border: "none", padding: "20px 0 0" }}>
            <button
              className="ui-btn ui-btn-md ui-btn-secondary"
              onClick={onClose}
              disabled={saving}
            >
              {t("cancel")}
            </button>
            <button
              className="ui-btn ui-btn-md ui-btn-primary"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? t("saving") : t("saveChanges")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ==================================================================== */
/*  Unit Detail/Edit Modal                                               */
/* ==================================================================== */

function UnitModal({
  unit,
  propertyId,
  leases,
  editMode,
  saving,
  setSaving,
  onClose,
  onToggleEdit,
  onDelete,
  onSelectLease,
}: {
  unit: UnitRow;
  propertyId: string;
  leases: LeaseRow[];
  editMode: boolean;
  saving: boolean;
  setSaving: (v: boolean) => void;
  onClose: () => void;
  onToggleEdit: () => void;
  onDelete: (id: string, name: string) => void;
  onSelectLease: (l: LeaseRow) => void;
}) {
  const t = useTranslations("app");
  const locale = useLocale();
  const dateLocale = locale === "es" ? "es" : "en-US";

  function formatDate(d: string | null | undefined): string {
    if (!d) return "--";
    return formatDateSafe(d);
  }

  function unitTypeLabel(ut: string): string {
    const map: Record<string, string> = {
      studio: t("unitTypeStudio"),
      "1br": t("unitType1br"),
      "2br": t("unitType2br"),
      "3br": t("unitType3br"),
      office: t("unitTypeOffice"),
      retail: t("unitTypeRetail"),
      warehouse: t("unitTypeWarehouse"),
    };
    return map[ut] ?? ut;
  }

  // Find the active lease for this unit
  const activeLease = leases.find(
    (l) => l.unit_id === unit.id && l.status === "active"
  );

  // Lease creation form for vacant units
  const [showLeaseForm, setShowLeaseForm] = useState(false);
  const [leaseCreating, setLeaseCreating] = useState(false);
  const [leaseError, setLeaseError] = useState("");
  const todayISO = getLocalToday();
  const oneYearDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
  const oneYearISO = `${oneYearDate.getFullYear()}-${String(oneYearDate.getMonth() + 1).padStart(2, "0")}-${String(oneYearDate.getDate()).padStart(2, "0")}`;
  const [leaseForm, setLeaseForm] = useState({
    tenant_name: "",
    tenant_email: "",
    tenant_phone: "",
    monthly_rent: unit.market_rent ? String(unit.market_rent) : "",
    security_deposit: "",
    lease_start: todayISO,
    lease_end: oneYearISO,
    auto_renew: false,
  });

  async function handleCreateLease() {
    setLeaseCreating(true);
    setLeaseError("");
    try {
      const res = await fetch("/api/properties/leases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unit_id: unit.id,
          tenant_name: leaseForm.tenant_name,
          tenant_email: leaseForm.tenant_email || null,
          tenant_phone: leaseForm.tenant_phone || null,
          monthly_rent: Number(leaseForm.monthly_rent),
          security_deposit: leaseForm.security_deposit ? Number(leaseForm.security_deposit) : null,
          lease_start: leaseForm.lease_start,
          lease_end: leaseForm.lease_end,
          auto_renew: leaseForm.auto_renew,
        }),
      });
      if (res.ok) {
        window.location.reload();
      } else {
        const data = await res.json();
        setLeaseError(data.error || t("failedToCreateLease"));
      }
    } catch {
      setLeaseError(t("networkError"));
    } finally {
      setLeaseCreating(false);
    }
  }

  const [form, setForm] = useState({
    unit_number: unit.unit_number,
    unit_type: unit.unit_type,
    sqft: unit.sqft ?? "",
    bedrooms: unit.bedrooms ?? "",
    bathrooms: unit.bathrooms ?? "",
    floor_number: unit.floor_number ?? "",
    market_rent: unit.market_rent ?? "",
    status: unit.status,
  });
  const [error, setError] = useState("");

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/properties/${propertyId}/units`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: unit.id,
          unit_number: form.unit_number,
          unit_type: form.unit_type,
          sqft: form.sqft !== "" ? Number(form.sqft) : null,
          bedrooms: form.bedrooms !== "" ? Number(form.bedrooms) : null,
          bathrooms: form.bathrooms !== "" ? Number(form.bathrooms) : null,
          floor_number:
            form.floor_number !== "" ? Number(form.floor_number) : null,
          market_rent:
            form.market_rent !== "" ? Number(form.market_rent) : null,
          status: form.status,
        }),
      });
      if (res.ok) {
        window.location.reload();
      } else {
        const data = await res.json();
        setError(data.error || t("failedToUpdateUnit"));
      }
    } catch {
      setError(t("networkError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="modal-overlay"
      onClick={() => onClose()}
    >
      <div
        className="modal-content modal-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3>{t("unitLabel", { number: unit.unit_number })}</h3>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              className="ui-btn ui-btn-sm ui-btn-outline"
              onClick={onToggleEdit}
            >
              {editMode ? t("cancel") : t("edit")}
            </button>
            <button
              className="ui-btn ui-btn-sm ui-btn-danger"
              onClick={() => onDelete(unit.id, t("unitLabel", { number: unit.unit_number }))}
            >
              <Trash2 size={13} />
            </button>
            <button className="modal-close" onClick={onClose}>
              <X size={20} />
            </button>
          </div>
        </div>
        <div className="modal-body">
          {error && <div className="form-error">{error}</div>}

          {editMode ? (
            /* ---- Edit Mode ---- */
            <>
              <div className="modal-form-grid">
                <div className="form-group">
                  <label className="form-label">{t("unitNumber")}</label>
                  <input
                    className="form-input"
                    value={form.unit_number}
                    onChange={(e) =>
                      setForm({ ...form, unit_number: e.target.value })
                    }
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">{t("unitType")}</label>
                  <select
                    className="form-select"
                    value={form.unit_type}
                    onChange={(e) =>
                      setForm({ ...form, unit_type: e.target.value as UnitRow["unit_type"] })
                    }
                  >
                    <option value="studio">{t("unitTypeStudio")}</option>
                    <option value="1br">{t("unitType1br")}</option>
                    <option value="2br">{t("unitType2br")}</option>
                    <option value="3br">{t("unitType3br")}</option>
                    <option value="office">{t("unitTypeOffice")}</option>
                    <option value="retail">{t("unitTypeRetail")}</option>
                    <option value="warehouse">{t("unitTypeWarehouse")}</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">{t("sqFt")}</label>
                  <input
                    className="form-input"
                    type="number"
                    value={form.sqft}
                    onChange={(e) =>
                      setForm({ ...form, sqft: e.target.value })
                    }
                    placeholder="0"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">{t("bedrooms")}</label>
                  <input
                    className="form-input"
                    type="number"
                    value={form.bedrooms}
                    onChange={(e) =>
                      setForm({ ...form, bedrooms: e.target.value })
                    }
                    placeholder="0"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">{t("bathrooms")}</label>
                  <input
                    className="form-input"
                    type="number"
                    value={form.bathrooms}
                    onChange={(e) =>
                      setForm({ ...form, bathrooms: e.target.value })
                    }
                    placeholder="0"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">{t("floorNumber")}</label>
                  <input
                    className="form-input"
                    type="number"
                    value={form.floor_number}
                    onChange={(e) =>
                      setForm({ ...form, floor_number: e.target.value })
                    }
                    placeholder="0"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">{t("marketRent")}</label>
                  <input
                    className="form-input"
                    type="number"
                    value={form.market_rent}
                    onChange={(e) =>
                      setForm({ ...form, market_rent: e.target.value })
                    }
                    placeholder="0"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">{t("status")}</label>
                  <select
                    className="form-select"
                    value={form.status}
                    onChange={(e) =>
                      setForm({ ...form, status: e.target.value as UnitRow["status"] })
                    }
                  >
                    <option value="vacant">{t("unitStatusVacant")}</option>
                    <option value="occupied">{t("unitStatusOccupied")}</option>
                    <option value="maintenance">{t("unitStatusMaintenance")}</option>
                    <option value="reserved">{t("unitStatusReserved")}</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer" style={{ border: "none", padding: "20px 0 0" }}>
                <button
                  className="ui-btn ui-btn-md ui-btn-secondary"
                  onClick={onToggleEdit}
                  disabled={saving}
                >
                  {t("cancel")}
                </button>
                <button
                  className="ui-btn ui-btn-md ui-btn-primary"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? t("saving") : t("saveChanges")}
                </button>
              </div>
            </>
          ) : (
            /* ---- View Mode ---- */
            <div style={{ padding: "1.25rem" }}>
              <div className="detail-row">
                <div className="detail-group">
                  <label className="detail-label">{t("unitNumber")}</label>
                  <div className="detail-value">{unit.unit_number}</div>
                </div>
                <div className="detail-group">
                  <label className="detail-label">{t("unitType")}</label>
                  <div className="detail-value">{unitTypeLabel(unit.unit_type)}</div>
                </div>
              </div>
              <div className="detail-row">
                <div className="detail-group">
                  <label className="detail-label">{t("sqFt")}</label>
                  <div className="detail-value">{unit.sqft ? unit.sqft.toLocaleString() : "--"}</div>
                </div>
                <div className="detail-group">
                  <label className="detail-label">{t("bedrooms")}</label>
                  <div className="detail-value">{unit.bedrooms ?? "--"}</div>
                </div>
              </div>
              <div className="detail-row">
                <div className="detail-group">
                  <label className="detail-label">{t("bathrooms")}</label>
                  <div className="detail-value">{unit.bathrooms ?? "--"}</div>
                </div>
                <div className="detail-group">
                  <label className="detail-label">{t("floorNumber")}</label>
                  <div className="detail-value">{unit.floor_number ?? "--"}</div>
                </div>
              </div>
              <div className="detail-row">
                <div className="detail-group">
                  <label className="detail-label">{t("marketRent")}</label>
                  <div className="detail-value">{unit.market_rent ? formatCurrency(unit.market_rent) : "--"}</div>
                </div>
                <div className="detail-group">
                  <label className="detail-label">{t("status")}</label>
                  <div className="detail-value"><UnitStatusBadge status={unit.status} /></div>
                </div>
              </div>

              {/* Tenant / Lease Info */}
              {activeLease ? (
                <div
                  style={{
                    marginTop: "16px",
                    padding: "14px 16px",
                    background: "rgba(var(--color-green-rgb, 34, 197, 94), 0.08)",
                    borderRadius: "8px",
                    border: "1px solid rgba(var(--color-green-rgb, 34, 197, 94), 0.2)",
                  }}
                >
                  <label className="detail-label" style={{ marginBottom: "8px", display: "block" }}>
                    {t("currentTenant")}
                  </label>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>
                        {activeLease.tenant_name}
                      </div>
                      {activeLease.tenant_email && (
                        <div style={{ fontSize: "0.8rem", color: "var(--muted)", marginTop: "2px" }}>
                          {activeLease.tenant_email}
                        </div>
                      )}
                      {activeLease.tenant_phone && (
                        <div style={{ fontSize: "0.8rem", color: "var(--muted)", marginTop: "1px" }}>
                          {activeLease.tenant_phone}
                        </div>
                      )}
                      <div style={{ fontSize: "0.78rem", color: "var(--muted)", marginTop: "4px" }}>
                        {formatCurrency(activeLease.monthly_rent)}/{t("moAbbr")} &middot; {t("leaseEnds")} {formatDate(activeLease.lease_end)}
                      </div>
                    </div>
                    <button
                      className="ui-btn ui-btn-sm ui-btn-outline"
                      onClick={() => onSelectLease(activeLease)}
                    >
                      {t("viewLease")}
                    </button>
                  </div>
                </div>
              ) : showLeaseForm ? (
                /* ---- Create Lease Form ---- */
                <div
                  style={{
                    marginTop: "16px",
                    padding: "16px",
                    background: "rgba(var(--color-blue-rgb, 29, 78, 216), 0.05)",
                    borderRadius: "8px",
                    border: "1px solid rgba(var(--color-blue-rgb, 29, 78, 216), 0.2)",
                  }}
                >
                  <label className="detail-label" style={{ marginBottom: "12px", display: "block" }}>
                    {t("createNewLease")}
                  </label>
                  {leaseError && <div className="form-error" style={{ marginBottom: "10px" }}>{leaseError}</div>}
                  <div className="modal-form-grid">
                    <div className="form-group">
                      <label className="form-label">{t("tenantNameRequired")}</label>
                      <input
                        className="form-input"
                        value={leaseForm.tenant_name}
                        onChange={(e) => setLeaseForm({ ...leaseForm, tenant_name: e.target.value })}
                        placeholder={t("fullNameOfTenant")}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">{t("monthlyRentRequired")}</label>
                      <input
                        className="form-input"
                        type="number"
                        value={leaseForm.monthly_rent}
                        onChange={(e) => setLeaseForm({ ...leaseForm, monthly_rent: e.target.value })}
                        placeholder="0"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">{t("tenantEmail")}</label>
                      <input
                        className="form-input"
                        type="email"
                        value={leaseForm.tenant_email}
                        onChange={(e) => setLeaseForm({ ...leaseForm, tenant_email: e.target.value })}
                        placeholder="tenant@email.com"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">{t("tenantPhone")}</label>
                      <input
                        className="form-input"
                        value={leaseForm.tenant_phone}
                        onChange={(e) => setLeaseForm({ ...leaseForm, tenant_phone: e.target.value })}
                        placeholder="(555) 123-4567"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">{t("leaseStart")}</label>
                      <input
                        className="form-input"
                        type="date"
                        value={leaseForm.lease_start}
                        onChange={(e) => setLeaseForm({ ...leaseForm, lease_start: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">{t("leaseEnd")}</label>
                      <input
                        className="form-input"
                        type="date"
                        value={leaseForm.lease_end}
                        onChange={(e) => setLeaseForm({ ...leaseForm, lease_end: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">{t("securityDeposit")}</label>
                      <input
                        className="form-input"
                        type="number"
                        value={leaseForm.security_deposit}
                        onChange={(e) => setLeaseForm({ ...leaseForm, security_deposit: e.target.value })}
                        placeholder="0"
                      />
                    </div>
                    <div className="form-group" style={{ display: "flex", alignItems: "center", gap: "8px", paddingTop: "20px" }}>
                      <input
                        type="checkbox"
                        id="unit-lease-auto-renew"
                        checked={leaseForm.auto_renew}
                        onChange={(e) => setLeaseForm({ ...leaseForm, auto_renew: e.target.checked })}
                      />
                      <label htmlFor="unit-lease-auto-renew" className="form-label" style={{ margin: 0 }}>
                        {t("autoRenew")}
                      </label>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "12px" }}>
                    <button
                      className="ui-btn ui-btn-sm ui-btn-secondary"
                      onClick={() => setShowLeaseForm(false)}
                      disabled={leaseCreating}
                    >
                      {t("cancel")}
                    </button>
                    <button
                      className="ui-btn ui-btn-sm ui-btn-primary"
                      onClick={handleCreateLease}
                      disabled={leaseCreating || !leaseForm.tenant_name || !leaseForm.monthly_rent}
                    >
                      {leaseCreating ? t("creating") : t("createLease")}
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    marginTop: "16px",
                    padding: "14px 16px",
                    background: "rgba(var(--color-amber-rgb, 245, 158, 11), 0.08)",
                    borderRadius: "8px",
                    border: "1px solid rgba(var(--color-amber-rgb, 245, 158, 11), 0.2)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span style={{ fontSize: "0.85rem", color: "var(--color-amber, #f59e0b)" }}>
                    {t("noActiveLeaseForUnit")}
                  </span>
                  <button
                    className="ui-btn ui-btn-sm ui-btn-primary"
                    onClick={() => setShowLeaseForm(true)}
                  >
                    {t("createLease")}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ==================================================================== */
/*  Lease Detail/Edit Modal                                              */
/* ==================================================================== */

function LeaseModal({
  lease,
  propertyId,
  editMode,
  saving,
  setSaving,
  rentPayments,
  onClose,
  onToggleEdit,
  onDelete,
  onCreateLogin,
  onRecordPayment,
}: {
  lease: LeaseRow;
  propertyId: string;
  editMode: boolean;
  saving: boolean;
  setSaving: (v: boolean) => void;
  rentPayments: PropertyRentPayment[];
  onClose: () => void;
  onToggleEdit: () => void;
  onDelete: (id: string, name: string) => void;
  onCreateLogin: (lease: LeaseRow) => void;
  onRecordPayment: (lease: LeaseRow) => void;
}) {
  const t = useTranslations("app");
  const locale = useLocale();
  const dateLocale = locale === "es" ? "es" : "en-US";
  const [modalTab, setModalTab] = useState<"details" | "payments">("details");

  function formatDate(d: string | null | undefined): string {
    if (!d) return "--";
    return formatDateSafe(d);
  }

  const [form, setForm] = useState({
    tenant_name: lease.tenant_name,
    tenant_email: lease.tenant_email ?? "",
    tenant_phone: lease.tenant_phone ?? "",
    monthly_rent: lease.monthly_rent,
    security_deposit: lease.security_deposit ?? "",
    lease_start: toInputDate(lease.lease_start),
    lease_end: toInputDate(lease.lease_end),
    status: lease.status,
    auto_renew: lease.auto_renew,
  });
  const [error, setError] = useState("");

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/properties/leases", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: lease.id,
          tenant_name: form.tenant_name,
          tenant_email: form.tenant_email || null,
          tenant_phone: form.tenant_phone || null,
          monthly_rent: Number(form.monthly_rent),
          security_deposit:
            form.security_deposit !== ""
              ? Number(form.security_deposit)
              : null,
          lease_start: form.lease_start || null,
          lease_end: form.lease_end || null,
          status: form.status,
          auto_renew: form.auto_renew,
        }),
      });
      if (res.ok) {
        window.location.reload();
      } else {
        const data = await res.json();
        setError(data.error || t("failedToUpdateLease"));
      }
    } catch {
      setError(t("networkError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content modal-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3>
            {t("leaseFor", { tenant: lease.tenant_name })}
            {lease.units?.unit_number && (
              <span
                style={{
                  fontSize: "0.85rem",
                  color: "var(--muted)",
                  fontWeight: 400,
                  marginLeft: "8px",
                }}
              >
                ({t("unitLabel", { number: lease.units.unit_number })})
              </span>
            )}
          </h3>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            {!editMode && !lease.tenant_user_id && lease.tenant_email && (
              <button
                className="ui-btn ui-btn-sm ui-btn-outline"
                onClick={() => onCreateLogin(lease)}
                title={t("createTenantLogin")}
              >
                <KeyRound size={13} />
                {t("createLogin")}
              </button>
            )}
            {!editMode && lease.tenant_user_id && (
              <span className="badge badge-green" style={{ fontSize: "0.75rem" }}>
                <Check size={12} /> {t("loginActive")}
              </span>
            )}
            {!editMode && (
              <button
                className="ui-btn ui-btn-sm ui-btn-outline"
                onClick={() => onRecordPayment(lease)}
                title={t("recordPayment")}
              >
                <DollarSign size={13} />
                {t("recordPayment")}
              </button>
            )}
            <button
              className="ui-btn ui-btn-sm ui-btn-outline"
              onClick={onToggleEdit}
            >
              {editMode ? t("cancel") : t("edit")}
            </button>
            <button
              className="ui-btn ui-btn-sm ui-btn-danger"
              onClick={() =>
                onDelete(lease.id, t("leaseFor", { tenant: lease.tenant_name }))
              }
            >
              <Trash2 size={13} />
            </button>
            <button className="modal-close" onClick={onClose}>
              <X size={20} />
            </button>
          </div>
        </div>
        <div className="modal-body">
          {error && <div className="form-error">{error}</div>}

          {editMode ? (
            /* ---- Edit Mode ---- */
            <>
              <div className="modal-form-grid">
                <div className="form-group full-width">
                  <label className="form-label">{t("tenantName")}</label>
                  <input
                    className="form-input"
                    value={form.tenant_name}
                    onChange={(e) =>
                      setForm({ ...form, tenant_name: e.target.value })
                    }
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">{t("tenantEmail")}</label>
                  <input
                    className="form-input"
                    type="email"
                    value={form.tenant_email}
                    onChange={(e) =>
                      setForm({ ...form, tenant_email: e.target.value })
                    }
                    placeholder="email@example.com"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">{t("tenantPhone")}</label>
                  <input
                    className="form-input"
                    value={form.tenant_phone}
                    onChange={(e) =>
                      setForm({ ...form, tenant_phone: e.target.value })
                    }
                    placeholder="(555) 123-4567"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">{t("monthlyRent")}</label>
                  <input
                    className="form-input"
                    type="number"
                    value={form.monthly_rent}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        monthly_rent: Number(e.target.value),
                      })
                    }
                    placeholder="0"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">{t("securityDeposit")}</label>
                  <input
                    className="form-input"
                    type="number"
                    value={form.security_deposit}
                    onChange={(e) =>
                      setForm({ ...form, security_deposit: e.target.value })
                    }
                    placeholder="0"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">{t("leaseStart")}</label>
                  <input
                    className="form-input"
                    type="date"
                    value={form.lease_start}
                    onChange={(e) =>
                      setForm({ ...form, lease_start: e.target.value })
                    }
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">{t("leaseEnd")}</label>
                  <input
                    className="form-input"
                    type="date"
                    value={form.lease_end}
                    onChange={(e) =>
                      setForm({ ...form, lease_end: e.target.value })
                    }
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">{t("status")}</label>
                  <select
                    className="form-select"
                    value={form.status}
                    onChange={(e) =>
                      setForm({ ...form, status: e.target.value as LeaseRow["status"] })
                    }
                  >
                    <option value="active">{t("statusActive")}</option>
                    <option value="expired">{t("statusExpired")}</option>
                    <option value="terminated">{t("statusTerminated")}</option>
                    <option value="pending">{t("statusPending")}</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">{t("autoRenew")}</label>
                  <select
                    className="form-select"
                    value={form.auto_renew ? "true" : "false"}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        auto_renew: e.target.value === "true",
                      })
                    }
                  >
                    <option value="true">{t("yes")}</option>
                    <option value="false">{t("no")}</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer" style={{ border: "none", padding: "20px 0 0" }}>
                <button
                  className="ui-btn ui-btn-md ui-btn-secondary"
                  onClick={onToggleEdit}
                  disabled={saving}
                >
                  {t("cancel")}
                </button>
                <button
                  className="ui-btn ui-btn-md ui-btn-primary"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? t("saving") : t("saveChanges")}
                </button>
              </div>
            </>
          ) : (
            /* ---- View Mode with tabs ---- */
            <div>
              {/* Tab bar */}
              <div style={{ display: "flex", gap: "0", borderBottom: "1px solid var(--border)", padding: "0 1.25rem" }}>
                {(["details", "payments"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setModalTab(tab)}
                    style={{
                      padding: "10px 16px",
                      fontSize: "13px",
                      fontWeight: 600,
                      background: "none",
                      border: "none",
                      borderBottom: `2px solid ${modalTab === tab ? "var(--color-primary, #6366f1)" : "transparent"}`,
                      color: modalTab === tab ? "var(--color-primary, #6366f1)" : "var(--text-muted)",
                      cursor: "pointer",
                      marginBottom: "-1px",
                    }}
                  >
                    {tab === "details" ? "Details" : `Payments (${rentPayments.length})`}
                  </button>
                ))}
              </div>

              {/* Details tab */}
              {modalTab === "details" && (
                <div style={{ padding: "1.25rem" }}>
                  <div className="detail-row">
                    <div className="detail-group">
                      <label className="detail-label">{t("unit")}</label>
                      <div className="detail-value">{lease.units?.unit_number ? t("unitLabel", { number: lease.units.unit_number }) : "--"}</div>
                    </div>
                    <div className="detail-group">
                      <label className="detail-label">{t("tenantName")}</label>
                      <div className="detail-value">{lease.tenant_name}</div>
                    </div>
                  </div>
                  <div className="detail-row">
                    <div className="detail-group">
                      <label className="detail-label">{t("email")}</label>
                      <div className="detail-value">{lease.tenant_email ?? "--"}</div>
                    </div>
                    <div className="detail-group">
                      <label className="detail-label">{t("phone")}</label>
                      <div className="detail-value">{lease.tenant_phone ?? "--"}</div>
                    </div>
                  </div>
                  <div className="detail-row">
                    <div className="detail-group">
                      <label className="detail-label">{t("monthlyRent")}</label>
                      <div className="detail-value">{formatCurrency(lease.monthly_rent)}</div>
                    </div>
                    <div className="detail-group">
                      <label className="detail-label">{t("securityDeposit")}</label>
                      <div className="detail-value">{lease.security_deposit ? formatCurrency(lease.security_deposit) : "--"}</div>
                    </div>
                  </div>
                  <div className="detail-row">
                    <div className="detail-group">
                      <label className="detail-label">{t("leaseStart")}</label>
                      <div className="detail-value">{formatDate(lease.lease_start)}</div>
                    </div>
                    <div className="detail-group">
                      <label className="detail-label">{t("leaseEnd")}</label>
                      <div className="detail-value">{formatDate(lease.lease_end)}</div>
                    </div>
                  </div>
                  <div className="detail-row">
                    <div className="detail-group">
                      <label className="detail-label">{t("status")}</label>
                      <div className="detail-value"><LeaseStatusBadge status={lease.status} /></div>
                    </div>
                    <div className="detail-group">
                      <label className="detail-label">{t("autoRenew")}</label>
                      <div className="detail-value">{lease.auto_renew ? t("yes") : t("no")}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Payments tab */}
              {modalTab === "payments" && (
                <div style={{ padding: "1.25rem" }}>
                  {rentPayments.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "32px 0", color: "var(--text-muted)", fontSize: "14px" }}>
                      No payments recorded yet.{" "}
                      <button
                        style={{ background: "none", border: "none", color: "var(--color-primary, #6366f1)", cursor: "pointer", fontSize: "14px", textDecoration: "underline" }}
                        onClick={() => onRecordPayment(lease)}
                      >
                        Record a payment
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* Summary row */}
                      <div style={{ display: "flex", gap: "16px", marginBottom: "16px", flexWrap: "wrap" }}>
                        {[
                          { label: "Total Collected", value: formatCurrency(rentPayments.filter((p) => p.status === "paid").reduce((s, p) => s + p.amount, 0)), color: "var(--color-success, #22c55e)" },
                          { label: "Payments", value: String(rentPayments.filter((p) => p.status === "paid").length) },
                          { label: "Pending / Late", value: String(rentPayments.filter((p) => p.status === "pending" || p.status === "late").length), color: rentPayments.some((p) => p.status === "late") ? "#f59e0b" : undefined },
                        ].map((item) => (
                          <div key={item.label} style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "6px", padding: "10px 14px", minWidth: "120px" }}>
                            <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "2px" }}>{item.label}</div>
                            <div style={{ fontSize: "16px", fontWeight: 700, color: item.color ?? "var(--text)" }}>{item.value}</div>
                          </div>
                        ))}
                      </div>

                      {/* Payments table */}
                      <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                          <thead>
                            <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--text-muted)" }}>
                              {["Payment Date", "Due Date", "Amount", "Method", "Status", "JE"].map((h) => (
                                <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {[...rentPayments].sort((a, b) => {
                              const da = a.payment_date ?? a.due_date;
                              const db = b.payment_date ?? b.due_date;
                              return db.localeCompare(da);
                            }).map((pmt, idx) => {
                              const statusColors: Record<string, string> = {
                                paid: "badge-green",
                                pending: "badge-amber",
                                late: "badge-red",
                                failed: "badge-red",
                              };
                              return (
                                <tr key={pmt.id} style={{ borderBottom: "1px solid var(--border)", background: idx % 2 === 0 ? "transparent" : "var(--bg)" }}>
                                  <td style={{ padding: "8px 10px", color: "var(--text)" }}>{pmt.payment_date ? formatDateSafe(pmt.payment_date) : "—"}</td>
                                  <td style={{ padding: "8px 10px", color: "var(--text-muted)" }}>{formatDateSafe(pmt.due_date)}</td>
                                  <td style={{ padding: "8px 10px", color: "var(--text)", fontWeight: 600 }}>{formatCurrency(pmt.amount)}</td>
                                  <td style={{ padding: "8px 10px", color: "var(--text-muted)", textTransform: "capitalize" }}>{pmt.method ?? "—"}</td>
                                  <td style={{ padding: "8px 10px" }}><span className={`badge ${statusColors[pmt.status] ?? "badge-blue"}`}>{pmt.status}</span></td>
                                  <td style={{ padding: "8px 10px" }}>
                                    {pmt.je_number
                                      ? <span style={{ fontSize: "12px", color: "var(--color-primary, #6366f1)", fontFamily: "monospace" }}>{pmt.je_number}</span>
                                      : <span style={{ color: "var(--text-muted)" }}>—</span>}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                          <tfoot>
                            <tr style={{ borderTop: "2px solid var(--border)", background: "var(--bg)", fontWeight: 700 }}>
                              <td colSpan={2} style={{ padding: "8px 10px", color: "var(--text)" }}>Total</td>
                              <td style={{ padding: "8px 10px", color: "var(--text)" }}>{formatCurrency(rentPayments.reduce((s, p) => s + p.amount, 0))}</td>
                              <td colSpan={3} />
                            </tr>
                          </tfoot>
                        </table>
                      </div>

                      <div style={{ marginTop: "14px" }}>
                        <button
                          className="ui-btn ui-btn-sm ui-btn-outline"
                          onClick={() => onRecordPayment(lease)}
                        >
                          <DollarSign size={13} />
                          Record Payment
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ==================================================================== */
/*  Maintenance Detail/Edit Modal                                        */
/* ==================================================================== */

function MaintenanceModal({
  maint,
  propertyId,
  editMode,
  saving,
  setSaving,
  onClose,
  onToggleEdit,
  onDelete,
}: {
  maint: MaintenanceRequestRow;
  propertyId: string;
  editMode: boolean;
  saving: boolean;
  setSaving: (v: boolean) => void;
  onClose: () => void;
  onToggleEdit: () => void;
  onDelete: (id: string, name: string) => void;
}) {
  const t = useTranslations("app");
  const locale = useLocale();
  const dateLocale = locale === "es" ? "es" : "en-US";

  function formatDate(d: string | null | undefined): string {
    if (!d) return "--";
    return formatDateSafe(d);
  }

  const [form, setForm] = useState({
    title: maint.title,
    description: maint.description ?? "",
    category: maint.category,
    priority: maint.priority,
    status: maint.status,
    estimated_cost: maint.estimated_cost ?? "",
    actual_cost: maint.actual_cost ?? "",
    scheduled_date: toInputDate(maint.scheduled_date),
    notes: maint.notes ?? "",
  });
  const [error, setError] = useState("");

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(
        `/api/properties/${propertyId}/maintenance`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: maint.id,
            title: form.title,
            description: form.description || null,
            category: form.category,
            priority: form.priority,
            status: form.status,
            estimated_cost:
              form.estimated_cost !== ""
                ? Number(form.estimated_cost)
                : null,
            actual_cost:
              form.actual_cost !== "" ? Number(form.actual_cost) : null,
            scheduled_date: form.scheduled_date || null,
            notes: form.notes || null,
          }),
        }
      );
      if (res.ok) {
        window.location.reload();
      } else {
        const data = await res.json();
        setError(data.error || t("failedToUpdateMaintenance"));
      }
    } catch {
      setError(t("networkError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content modal-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3>{maint.title}</h3>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              className="ui-btn ui-btn-sm ui-btn-outline"
              onClick={onToggleEdit}
            >
              {editMode ? t("cancel") : t("edit")}
            </button>
            <button
              className="ui-btn ui-btn-sm ui-btn-danger"
              onClick={() => onDelete(maint.id, maint.title)}
            >
              <Trash2 size={13} />
            </button>
            <button className="modal-close" onClick={onClose}>
              <X size={20} />
            </button>
          </div>
        </div>
        <div className="modal-body">
          {error && <div className="form-error">{error}</div>}

          {editMode ? (
            /* ---- Edit Mode ---- */
            <>
              <div className="modal-form-grid">
                <div className="form-group full-width">
                  <label className="form-label">{t("title")}</label>
                  <input
                    className="form-input"
                    value={form.title}
                    onChange={(e) =>
                      setForm({ ...form, title: e.target.value })
                    }
                  />
                </div>
                <div className="form-group full-width">
                  <label className="form-label">{t("description")}</label>
                  <textarea
                    className="form-textarea"
                    value={form.description}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                    rows={3}
                    placeholder={t("describeTheIssue")}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">{t("category")}</label>
                  <select
                    className="form-select"
                    value={form.category}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        category: e.target.value as MaintenanceRequestRow["category"],
                      })
                    }
                  >
                    <option value="plumbing">{t("categoryPlumbing")}</option>
                    <option value="electrical">{t("categoryElectrical")}</option>
                    <option value="hvac">{t("categoryHvac")}</option>
                    <option value="appliance">{t("categoryAppliance")}</option>
                    <option value="structural">{t("categoryStructural")}</option>
                    <option value="general">{t("categoryGeneral")}</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">{t("priority")}</label>
                  <select
                    className="form-select"
                    value={form.priority}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        priority: e.target.value as MaintenanceRequestRow["priority"],
                      })
                    }
                  >
                    <option value="low">{t("priorityLow")}</option>
                    <option value="medium">{t("priorityMedium")}</option>
                    <option value="high">{t("priorityHigh")}</option>
                    <option value="emergency">{t("priorityEmergency")}</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">{t("status")}</label>
                  <select
                    className="form-select"
                    value={form.status}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        status: e.target.value as MaintenanceRequestRow["status"],
                      })
                    }
                  >
                    <option value="submitted">{t("maintStatusSubmitted")}</option>
                    <option value="assigned">{t("maintStatusAssigned")}</option>
                    <option value="in_progress">{t("maintStatusInProgress")}</option>
                    <option value="completed">{t("maintStatusCompleted")}</option>
                    <option value="closed">{t("maintStatusClosed")}</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">{t("estimatedCost")}</label>
                  <input
                    className="form-input"
                    type="number"
                    value={form.estimated_cost}
                    onChange={(e) =>
                      setForm({ ...form, estimated_cost: e.target.value })
                    }
                    placeholder="0"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">{t("actualCost")}</label>
                  <input
                    className="form-input"
                    type="number"
                    value={form.actual_cost}
                    onChange={(e) =>
                      setForm({ ...form, actual_cost: e.target.value })
                    }
                    placeholder="0"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">{t("scheduledDate")}</label>
                  <input
                    className="form-input"
                    type="date"
                    value={form.scheduled_date}
                    onChange={(e) =>
                      setForm({ ...form, scheduled_date: e.target.value })
                    }
                  />
                </div>
                <div className="form-group full-width">
                  <label className="form-label">{t("notes")}</label>
                  <textarea
                    className="form-textarea"
                    value={form.notes}
                    onChange={(e) =>
                      setForm({ ...form, notes: e.target.value })
                    }
                    rows={3}
                    placeholder={t("additionalNotes")}
                  />
                </div>
              </div>
              <div className="modal-footer" style={{ border: "none", padding: "20px 0 0" }}>
                <button
                  className="ui-btn ui-btn-md ui-btn-secondary"
                  onClick={onToggleEdit}
                  disabled={saving}
                >
                  {t("cancel")}
                </button>
                <button
                  className="ui-btn ui-btn-md ui-btn-primary"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? t("saving") : t("saveChanges")}
                </button>
              </div>
            </>
          ) : (
            /* ---- View Mode ---- */
            <div style={{ padding: "1.25rem" }}>
              <div className="detail-row">
                <div className="detail-group">
                  <label className="detail-label">{t("title")}</label>
                  <div className="detail-value">{maint.title}</div>
                </div>
                <div className="detail-group">
                  <label className="detail-label">{t("unit")}</label>
                  <div className="detail-value">{maint.units?.unit_number ? t("unitLabel", { number: maint.units.unit_number }) : "--"}</div>
                </div>
              </div>
              <div className="detail-row">
                <div className="detail-group">
                  <label className="detail-label">{t("category")}</label>
                  <div className="detail-value" style={{ textTransform: "capitalize" }}>{maint.category}</div>
                </div>
                <div className="detail-group">
                  <label className="detail-label">{t("priority")}</label>
                  <div className="detail-value"><PriorityBadge priority={maint.priority} /></div>
                </div>
              </div>
              <div className="detail-row">
                <div className="detail-group">
                  <label className="detail-label">{t("status")}</label>
                  <div className="detail-value"><MaintenanceStatusBadge status={maint.status} /></div>
                </div>
                <div className="detail-group">
                  <label className="detail-label">{t("estimatedCost")}</label>
                  <div className="detail-value">{maint.estimated_cost != null ? formatCurrency(maint.estimated_cost) : "--"}</div>
                </div>
              </div>
              <div className="detail-row">
                <div className="detail-group">
                  <label className="detail-label">{t("actualCost")}</label>
                  <div className="detail-value">{maint.actual_cost != null ? formatCurrency(maint.actual_cost) : "--"}</div>
                </div>
                <div className="detail-group">
                  <label className="detail-label">{t("scheduledDate")}</label>
                  <div className="detail-value">{formatDate(maint.scheduled_date)}</div>
                </div>
              </div>
              <div className="detail-row">
                <div className="detail-group">
                  <label className="detail-label">{t("created")}</label>
                  <div className="detail-value">{formatDate(maint.created_at)}</div>
                </div>
                <div className="detail-group">
                  <label className="detail-label">{t("maintCompleted")}</label>
                  <div className="detail-value">{formatDate(maint.completed_at)}</div>
                </div>
              </div>
              {maint.description && (
                <div className="detail-group">
                  <label className="detail-label">{t("description")}</label>
                  <div className="detail-value--multiline">{maint.description}</div>
                </div>
              )}
              {maint.notes && (
                <div className="detail-group">
                  <label className="detail-label">{t("notes")}</label>
                  <div className="detail-value--multiline">{maint.notes}</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ==================================================================== */
/*  Delete Confirmation Modal                                            */
/* ==================================================================== */

function DeleteConfirmModal({
  target,
  propertyId,
  saving,
  setSaving,
  onClose,
}: {
  target: { type: string; id: string; name: string };
  propertyId: string;
  saving: boolean;
  setSaving: (v: boolean) => void;
  onClose: () => void;
}) {
  const t = useTranslations("app");
  const [error, setError] = useState("");

  async function handleDelete() {
    setSaving(true);
    setError("");
    try {
      let url = "";
      let options: RequestInit = { method: "DELETE" };

      if (target.type === "unit") {
        url = `/api/properties/${propertyId}/units?unitId=${target.id}`;
      } else if (target.type === "lease") {
        url = "/api/properties/leases";
        options = {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: target.id }),
        };
      } else if (target.type === "maintenance") {
        url = `/api/properties/${propertyId}/maintenance?requestId=${target.id}`;
      }

      const res = await fetch(url, options);
      if (res.ok) {
        window.location.reload();
      } else {
        const data = await res.json();
        setError(data.error || t("failedToDeleteItem", { type: target.type }));
      }
    } catch {
      setError(t("networkError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content modal-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3>{t("confirmDelete")}</h3>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className="modal-body">
          {error && <div className="form-error">{error}</div>}
          <div className="delete-confirm-text">
            {t("confirmDeleteTypeAndName", { type: target.type, name: target.name })}
            <br />
            <span
              style={{
                fontSize: "0.82rem",
                color: "var(--muted)",
                marginTop: "8px",
                display: "inline-block",
              }}
            >
              {t("cannotBeUndone")}
            </span>
          </div>
          <div className="modal-footer" style={{ border: "none", padding: "16px 0 0" }}>
            <button
              className="ui-btn ui-btn-md ui-btn-secondary"
              onClick={onClose}
              disabled={saving}
            >
              {t("cancel")}
            </button>
            <button
              className="ui-btn ui-btn-md ui-btn-danger"
              onClick={handleDelete}
              disabled={saving}
            >
              {saving ? t("deleting") : t("delete")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
