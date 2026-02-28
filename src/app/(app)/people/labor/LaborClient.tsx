"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { getLocalToday } from "@/lib/utils/timezone";
import {
  Calendar,
  Clock,
  Users,
  CheckCircle2,
  X,
  Plus,
  Edit3,
  BarChart3,
  Activity,
  ClipboardList,
  List,
  DollarSign,
  Briefcase,
} from "lucide-react";
import type { EmployeePayRate } from "@/lib/queries/payroll";
import type { TimeEntry } from "@/lib/queries/people";
import ActivityTab from "./ActivityTab";
import type { EmployeeActivity } from "./ActivityTab";
import TimeTab from "./TimeTab";
import { formatDateSafe } from "@/lib/utils/format";

/* ------------------------------------------------------------------
   Types
   ------------------------------------------------------------------ */

interface LaborOverview {
  pendingHours: number;
  approvedHours: number;
  activeEmployees: number;
  totalLaborCost: number;
}

interface UserProfile {
  id: string;
  full_name: string | null;
  email: string | null;
}

interface EmployeeContact {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  job_title: string | null;
  user_id: string | null;
  contact_type: string;
}

interface TimeUserGroup {
  userId: string;
  name: string;
  email: string;
  entries: TimeEntry[];
}

interface LaborClientProps {
  payRates: EmployeePayRate[];
  userProfiles: UserProfile[];
  overview: LaborOverview;
  companyId: string;
  userRole: string;
  employeeContacts: EmployeeContact[];
  // Activity data
  activities: EmployeeActivity[];
  todayISO: string;
  rateMap: Record<string, number>;
  // Time data
  timeUsers: TimeUserGroup[];
  timeEntries: TimeEntry[];
  allTimeEntries: TimeEntry[];
  timePendingCount: number;
  weekDates: string[];
  weekStartISO: string;
  weekEndISO: string;
  prevWeekISO: string;
  nextWeekISO: string;
  // Tab control
  defaultTab: string;
}

type TabKey = "dashboard" | "activity" | "weekly" | "allEntries" | "rates";

/* ------------------------------------------------------------------
   Helpers
   ------------------------------------------------------------------ */

function fmt(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(n);
}

function fmtDate(d: string | null): string {
  if (!d) return "--";
  return formatDateSafe(d + "T00:00:00");
}

function fmtNum(n: number, decimals = 1): string {
  return n.toFixed(decimals);
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/* ------------------------------------------------------------------
   Component
   ------------------------------------------------------------------ */

export default function LaborClient({
  payRates,
  userProfiles,
  overview,
  companyId,
  userRole,
  employeeContacts,
  activities,
  todayISO,
  rateMap,
  timeUsers,
  timeEntries,
  allTimeEntries,
  timePendingCount,
  weekDates,
  weekStartISO,
  weekEndISO,
  prevWeekISO,
  nextWeekISO,
  defaultTab,
}: LaborClientProps) {
  const router = useRouter();
  const t = useTranslations("people");
  const isAdmin = ["owner", "admin"].includes(userRole);

  const validTabs: TabKey[] = ["dashboard", "activity", "weekly", "allEntries", "rates"];
  const initialTab = validTabs.includes(defaultTab as TabKey) ? (defaultTab as TabKey) : "dashboard";
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);

  // Employee Pay Rate edit state
  const [editingEmployee, setEditingEmployee] = useState<EmployeePayRate | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    pay_type: "hourly" as "hourly" | "salary",
    hourly_rate: "",
    overtime_rate: "",
    salary_amount: "",
  });
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState("");

  /* ----------------------------------------------------------------
     Tab definitions
     ---------------------------------------------------------------- */
  const tabs = useMemo(() => [
    { key: "dashboard" as TabKey, label: t("labor.tabOverview"), icon: <BarChart3 size={16} /> },
    { key: "activity" as TabKey, label: t("labor.tabActivity"), icon: <Activity size={16} /> },
    { key: "weekly" as TabKey, label: t("labor.tabTimesheet"), icon: <ClipboardList size={16} /> },
    { key: "allEntries" as TabKey, label: t("labor.tabAllEntries"), icon: <List size={16} /> },
    { key: "rates" as TabKey, label: t("labor.tabPayRates"), icon: <Users size={16} /> },
  ], [t]);

  /* ----------------------------------------------------------------
     Handlers
     ---------------------------------------------------------------- */

  function openEditEmployee(emp: EmployeePayRate) {
    setEditingEmployee(emp);
    setEditForm({
      pay_type: emp.pay_type,
      hourly_rate: String(emp.hourly_rate ?? ""),
      overtime_rate: String(emp.overtime_rate ?? ""),
      salary_amount: String(emp.salary_amount ?? ""),
    });
    setEditError("");
    setShowEditModal(true);
  }

  function openSetUpEmployee(contact: EmployeeContact) {
    const syntheticPayRate: EmployeePayRate = {
      id: "",
      company_id: companyId,
      user_id: contact.user_id!,
      pay_type: "hourly",
      hourly_rate: null,
      overtime_rate: null,
      salary_amount: null,
      filing_status: "single",
      federal_allowances: 0,
      state_code: "",
      effective_date: getLocalToday(),
      end_date: null,
      employee_name: `${contact.first_name} ${contact.last_name}`,
      employee_email: contact.email ?? "",
    };
    setEditingEmployee(syntheticPayRate);
    setEditForm({
      pay_type: "hourly",
      hourly_rate: "",
      overtime_rate: "",
      salary_amount: "",
    });
    setEditError("");
    setShowEditModal(true);
  }

  async function handleSaveEmployee() {
    if (!editingEmployee) return;
    setSaving(true);
    setEditError("");

    const isNew = !editingEmployee.id;

    try {
      const res = await fetch("/api/payroll/pay-rates", {
        method: isNew ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(isNew ? {} : { id: editingEmployee.id }),
          user_id: editingEmployee.user_id,
          pay_type: editForm.pay_type,
          hourly_rate: editForm.pay_type === "hourly" ? Number(editForm.hourly_rate) : null,
          overtime_rate: editForm.pay_type === "hourly" ? Number(editForm.overtime_rate) : null,
          salary_amount: editForm.pay_type === "salary" ? Number(editForm.salary_amount) : null,
          filing_status: "single",
          state_code: "",
          federal_allowances: 0,
          effective_date: getLocalToday(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("labor.failedToSave"));

      setShowEditModal(false);
      setEditingEmployee(null);
      router.refresh();
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : t("labor.failedToSavePayRate"));
    } finally {
      setSaving(false);
    }
  }

  /* ----------------------------------------------------------------
     Computed — labor cost by project
     ---------------------------------------------------------------- */
  const projectCosts = (() => {
    const map = new Map<string, { name: string; hours: number; cost: number }>();
    for (const entry of allTimeEntries) {
      if (entry.status !== "approved") continue;
      const projectName = entry.project?.name || t("labor.unassigned");
      const projectId = entry.project_id || "unassigned";
      if (!map.has(projectId)) {
        map.set(projectId, { name: projectName, hours: 0, cost: 0 });
      }
      const p = map.get(projectId)!;
      const hours = entry.hours ?? 0;
      const rate = rateMap[entry.user_id] ?? 0;
      p.hours += hours;
      p.cost += hours * rate;
    }
    return Array.from(map.values())
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 10);
  })();

  // Recent time entries (last 10)
  const recentEntries = [...allTimeEntries]
    .sort((a, b) => (b.entry_date || "").localeCompare(a.entry_date || ""))
    .slice(0, 10);

  /* ----------------------------------------------------------------
     Render
     ---------------------------------------------------------------- */

  return (
    <div>
      {/* Header */}
      <div className="fin-header">
        <div>
          <h2>{t("labor.title")}</h2>
          <p className="fin-header-sub">
            {t("labor.subtitle")}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="payroll-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`payroll-tab ${activeTab === tab.key ? "active" : ""}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Overview Tab ── */}
      {activeTab === "dashboard" && (
        <>
          {/* KPI Row */}
          <div className="payroll-kpi-row">
            <div className="payroll-kpi">
              <div className="payroll-kpi-icon amber">
                <Clock size={20} />
              </div>
              <div className="payroll-kpi-label">{t("labor.pendingHours")}</div>
              <div className="payroll-kpi-value">{fmtNum(overview.pendingHours)}h</div>
            </div>
            <div className="payroll-kpi">
              <div className="payroll-kpi-icon green">
                <CheckCircle2 size={20} />
              </div>
              <div className="payroll-kpi-label">{t("labor.approvedHours")}</div>
              <div className="payroll-kpi-value">{fmtNum(overview.approvedHours)}h</div>
            </div>
            <div className="payroll-kpi">
              <div className="payroll-kpi-icon blue">
                <Users size={20} />
              </div>
              <div className="payroll-kpi-label">{t("labor.activeEmployees")}</div>
              <div className="payroll-kpi-value">{overview.activeEmployees}</div>
            </div>
            <div className="payroll-kpi">
              <div className="payroll-kpi-icon blue">
                <DollarSign size={20} />
              </div>
              <div className="payroll-kpi-label">{t("labor.estLaborCost")}</div>
              <div className="payroll-kpi-value">{fmt(overview.totalLaborCost)}</div>
            </div>
          </div>

          {/* Labor Cost by Project */}
          <div className="fin-chart-card">
            <div className="fin-chart-title">
              <Briefcase size={18} />
              {t("labor.laborCostByProject")}
            </div>

            {projectCosts.length === 0 ? (
              <div className="fin-empty">
                <div className="fin-empty-icon">
                  <Briefcase size={48} />
                </div>
                <div className="fin-empty-title">{t("labor.noLaborDataTitle")}</div>
                <p className="fin-empty-desc">
                  {t("labor.noLaborDataDesc")}
                </p>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="payroll-review-table">
                  <thead>
                    <tr>
                      <th>{t("labor.project")}</th>
                      <th className="num-col">{t("labor.hours")}</th>
                      <th className="num-col">{t("labor.estCost")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projectCosts.map((p) => (
                      <tr key={p.name}>
                        <td style={{ fontWeight: 500 }}>{p.name}</td>
                        <td className="num-col">{fmtNum(p.hours)}</td>
                        <td className="num-col">{fmt(p.cost)}</td>
                      </tr>
                    ))}
                    <tr className="summary-row">
                      <td style={{ fontWeight: 700 }}>{t("labor.total")}</td>
                      <td className="num-col">
                        {fmtNum(projectCosts.reduce((s, p) => s + p.hours, 0))}
                      </td>
                      <td className="num-col">
                        {fmt(projectCosts.reduce((s, p) => s + p.cost, 0))}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Recent Time Entries */}
          <div className="fin-chart-card">
            <div className="fin-chart-title">
              <Calendar size={18} />
              {t("labor.recentTimeEntries")}
            </div>

            {recentEntries.length === 0 ? (
              <div style={{ textAlign: "center", padding: "32px 16px", color: "var(--muted)", fontSize: "0.88rem" }}>
                {t("labor.noTimeEntriesYet")}
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="payroll-review-table">
                  <thead>
                    <tr>
                      <th>{t("labor.employee")}</th>
                      <th>{t("labor.date")}</th>
                      <th className="num-col">{t("labor.hours")}</th>
                      <th className="num-col">{t("labor.rate")}</th>
                      <th className="num-col">{t("labor.cost")}</th>
                      <th>{t("labor.status")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentEntries.map((entry) => {
                      const rate = rateMap[entry.user_id] ?? 0;
                      const cost = (entry.hours ?? 0) * rate;
                      const empName =
                        entry.user_profile?.full_name ||
                        entry.user_profile?.email ||
                        t("labor.unknown");
                      return (
                        <tr key={entry.id}>
                          <td style={{ fontWeight: 500 }}>{empName}</td>
                          <td>{fmtDate(entry.entry_date)}</td>
                          <td className="num-col">{fmtNum(entry.hours ?? 0)}</td>
                          <td className="num-col">{rate > 0 ? fmt(rate) + "/hr" : "--"}</td>
                          <td className="num-col">{rate > 0 ? fmt(cost) : "--"}</td>
                          <td>
                            <span className={`payroll-status payroll-status-${entry.status === "approved" ? "paid" : entry.status === "pending" ? "draft" : "approved"}`}>
                              {entry.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Activity Tab ── */}
      {activeTab === "activity" && (
        <ActivityTab
          activities={activities}
          todayISO={todayISO}
          rateMap={rateMap}
        />
      )}

      {/* ── Timesheet (Weekly) Tab ── */}
      {activeTab === "weekly" && (
        <TimeTab
          view="weekly"
          users={timeUsers}
          entries={timeEntries}
          allEntries={allTimeEntries}
          pendingCount={timePendingCount}
          weekDates={weekDates}
          weekStartISO={weekStartISO}
          weekEndISO={weekEndISO}
          prevWeekISO={prevWeekISO}
          nextWeekISO={nextWeekISO}
          userRole={userRole}
          rateMap={rateMap}
        />
      )}

      {/* ── All Entries Tab ── */}
      {activeTab === "allEntries" && (
        <TimeTab
          view="all"
          users={timeUsers}
          entries={timeEntries}
          allEntries={allTimeEntries}
          pendingCount={timePendingCount}
          weekDates={weekDates}
          weekStartISO={weekStartISO}
          weekEndISO={weekEndISO}
          prevWeekISO={prevWeekISO}
          nextWeekISO={nextWeekISO}
          userRole={userRole}
          rateMap={rateMap}
        />
      )}

      {/* ── Pay Rates Tab ── */}
      {activeTab === "rates" && (
        <>
          {/* All Employee Contacts Table */}
          <div className="fin-chart-card">
            <div className="fin-chart-title">
              <Users size={18} />
              {t("labor.allEmployees", { count: employeeContacts.length })}
            </div>

            {employeeContacts.length === 0 ? (
              <div className="fin-empty">
                <div className="fin-empty-icon">
                  <Users size={48} />
                </div>
                <div className="fin-empty-title">{t("labor.noEmployeeContactsTitle")}</div>
                <p className="fin-empty-desc">
                  {t("labor.noEmployeeContactsDesc")}
                </p>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="payroll-review-table">
                  <thead>
                    <tr>
                      <th>{t("labor.name")}</th>
                      <th>{t("labor.email")}</th>
                      <th>{t("labor.jobTitle")}</th>
                      <th>{t("labor.payStatus")}</th>
                      <th>{t("labor.actions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employeeContacts.map((contact) => {
                      const matchedPayRate = payRates.find(
                        (pr) => pr.user_id === contact.user_id
                      );
                      const hasUserId = !!contact.user_id;
                      const isConfigured = !!matchedPayRate;

                      let statusBadge: React.ReactNode;
                      if (isConfigured) {
                        statusBadge = (
                          <span className="payroll-status payroll-status-paid">
                            {t("labor.configured")}
                          </span>
                        );
                      } else if (hasUserId) {
                        statusBadge = (
                          <span className="payroll-status payroll-status-draft">
                            {t("labor.notSetUp")}
                          </span>
                        );
                      } else {
                        statusBadge = (
                          <span className="payroll-status payroll-status-approved">
                            {t("labor.needsLogin")}
                          </span>
                        );
                      }

                      return (
                        <tr key={contact.id}>
                          <td style={{ fontWeight: 500 }}>
                            {contact.first_name} {contact.last_name}
                          </td>
                          <td>{contact.email ?? "--"}</td>
                          <td>{contact.job_title ?? "--"}</td>
                          <td>{statusBadge}</td>
                          <td>
                            <div style={{ display: "flex", gap: 6 }}>
                              {isConfigured && isAdmin && (
                                <button
                                  className="ui-btn ui-btn-sm ui-btn-outline"
                                  onClick={() => openEditEmployee(matchedPayRate)}
                                  title={t("labor.editPayRate")}
                                >
                                  <Edit3 size={14} />
                                  {t("labor.edit")}
                                </button>
                              )}
                              {!isConfigured && hasUserId && isAdmin && (
                                <button
                                  className="ui-btn ui-btn-sm ui-btn-primary"
                                  onClick={() => openSetUpEmployee(contact)}
                                  title={t("labor.setUpPayRate")}
                                >
                                  <Plus size={14} />
                                  {t("labor.setUp")}
                                </button>
                              )}
                              {!hasUserId && (
                                <span
                                  style={{
                                    fontSize: "0.8rem",
                                    color: "var(--muted)",
                                    fontStyle: "italic",
                                  }}
                                >
                                  {t("labor.noLoginAccount")}
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Configured Pay Rate Cards */}
          {payRates.length > 0 && (
            <>
              <div style={{ marginTop: 24, marginBottom: 12 }}>
                <h3 style={{ fontSize: "1.05rem", fontWeight: 600, color: "var(--foreground)" }}>
                  {t("labor.configuredPayRates", { count: payRates.length })}
                </h3>
              </div>
              <div className="payroll-employee-grid">
                {payRates.map((emp) => {
                  const displayName = emp.employee_name ?? t("labor.unknown");

                  return (
                    <div key={emp.id} className="payroll-employee-card">
                      <div className="payroll-employee-card-top">
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <div className="payroll-employee-card-avatar">
                            {getInitials(displayName)}
                          </div>
                          <div className="payroll-employee-card-info">
                            <div className="payroll-employee-card-name">{displayName}</div>
                            <div className="payroll-employee-card-email">
                              {emp.employee_email ?? ""}
                            </div>
                          </div>
                        </div>
                        {isAdmin && (
                          <button
                            className="ui-btn ui-btn-sm ui-btn-outline"
                            onClick={() => openEditEmployee(emp)}
                          >
                            <Edit3 size={14} />
                            {t("labor.edit")}
                          </button>
                        )}
                      </div>

                      <div className="payroll-employee-card-details">
                        <div className="payroll-employee-card-row">
                          <span className="payroll-employee-card-label">{t("labor.payType")}</span>
                          <span style={{ fontWeight: 600, textTransform: "capitalize" }}>
                            {emp.pay_type}
                          </span>
                        </div>
                        {emp.pay_type === "hourly" ? (
                          <>
                            <div className="payroll-employee-card-row">
                              <span className="payroll-employee-card-label">{t("labor.hourlyRate")}</span>
                              <span className="payroll-employee-card-value">
                                {fmt(emp.hourly_rate ?? 0)}/hr
                              </span>
                            </div>
                            <div className="payroll-employee-card-row">
                              <span className="payroll-employee-card-label">{t("labor.overtimeRate")}</span>
                              <span className="payroll-employee-card-value">
                                {fmt(emp.overtime_rate ?? 0)}/hr
                              </span>
                            </div>
                          </>
                        ) : (
                          <div className="payroll-employee-card-row">
                            <span className="payroll-employee-card-label">{t("labor.annualSalary")}</span>
                            <span className="payroll-employee-card-value">
                              {fmt(emp.salary_amount ?? 0)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}

      {/* ── Edit Pay Rate Modal ── */}
      {showEditModal && editingEmployee && (
        <div className="fin-modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="fin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="fin-modal-header">
              <h3>{t("labor.editPayRateTitle", { name: editingEmployee.employee_name ?? "" })}</h3>
              <button
                className="ui-btn ui-btn-sm ui-btn-ghost"
                onClick={() => setShowEditModal(false)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="fin-modal-body">
              {editError && (
                <div style={{ color: "var(--color-red)", marginBottom: 12, fontSize: "0.88rem" }}>
                  {editError}
                </div>
              )}

              {/* Pay Type */}
              <div className="payroll-pay-type-toggle">
                <button
                  type="button"
                  className={`payroll-pay-type-option ${editForm.pay_type === "hourly" ? "active" : ""}`}
                  onClick={() => setEditForm({ ...editForm, pay_type: "hourly" })}
                >
                  <Clock size={16} />
                  {t("labor.hourly")}
                </button>
                <button
                  type="button"
                  className={`payroll-pay-type-option ${editForm.pay_type === "salary" ? "active" : ""}`}
                  onClick={() => setEditForm({ ...editForm, pay_type: "salary" })}
                >
                  <DollarSign size={16} />
                  {t("labor.salary")}
                </button>
              </div>

              {/* Rate Fields */}
              {editForm.pay_type === "hourly" ? (
                <div className="fin-form-row" style={{ marginBottom: 16 }}>
                  <div className="fin-form-group">
                    <label className="fin-form-label">{t("labor.hourlyRateLabel")}</label>
                    <input
                      type="number"
                      className="fin-form-input"
                      value={editForm.hourly_rate}
                      onChange={(e) => setEditForm({ ...editForm, hourly_rate: e.target.value })}
                      step="0.01"
                      min="0"
                    />
                  </div>
                  <div className="fin-form-group">
                    <label className="fin-form-label">{t("labor.overtimeRateLabel")}</label>
                    <input
                      type="number"
                      className="fin-form-input"
                      value={editForm.overtime_rate}
                      onChange={(e) => setEditForm({ ...editForm, overtime_rate: e.target.value })}
                      step="0.01"
                      min="0"
                    />
                  </div>
                </div>
              ) : (
                <div className="fin-form-group" style={{ marginBottom: 16 }}>
                  <label className="fin-form-label">{t("labor.annualSalaryLabel")}</label>
                  <input
                    type="number"
                    className="fin-form-input"
                    value={editForm.salary_amount}
                    onChange={(e) => setEditForm({ ...editForm, salary_amount: e.target.value })}
                    step="100"
                    min="0"
                  />
                </div>
              )}
            </div>
            <div className="fin-modal-footer">
              <button
                className="ui-btn ui-btn-md ui-btn-outline"
                onClick={() => setShowEditModal(false)}
              >
                {t("cancel")}
              </button>
              <button
                className="ui-btn ui-btn-md ui-btn-primary"
                onClick={handleSaveEmployee}
                disabled={saving}
              >
                {saving ? t("saving") : t("saveChanges")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
