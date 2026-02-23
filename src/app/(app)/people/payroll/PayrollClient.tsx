"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  DollarSign,
  Calendar,
  Clock,
  Users,
  Play,
  CheckCircle2,
  Eye,
  X,
  Plus,
  Edit3,
  FileText,
  AlertTriangle,
  Settings,
  BarChart3,
  Banknote,
  Shield,
  Activity,
  ClipboardList,
  List,
} from "lucide-react";
import type {
  PayrollRun,
  EmployeePayRate,
  PayrollDeduction,
  PayrollTaxConfig,
  PayrollItem,
} from "@/lib/queries/payroll";
import type { TimeEntry } from "@/lib/queries/people";
import ActivityTab from "./ActivityTab";
import type { EmployeeActivity } from "./ActivityTab";
import TimeTab from "./TimeTab";

/* ------------------------------------------------------------------
   Types
   ------------------------------------------------------------------ */

interface PayrollOverview {
  ytdTotalPayroll: number;
  lastRunDate: string | null;
  pendingApprovedHours: number;
  activeEmployees: number;
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

interface PayrollClientProps {
  payrollRuns: PayrollRun[];
  payRates: EmployeePayRate[];
  deductions: PayrollDeduction[];
  taxConfig: PayrollTaxConfig | null;
  userProfiles: UserProfile[];
  overview: PayrollOverview;
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

type TabKey = "dashboard" | "activity" | "weekly" | "allEntries" | "run" | "employees" | "tax" | "reports";

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
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
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

export default function PayrollClient({
  payrollRuns,
  payRates,
  deductions,
  taxConfig,
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
}: PayrollClientProps) {
  const router = useRouter();
  const isAdmin = ["owner", "admin"].includes(userRole);

  const validTabs: TabKey[] = ["dashboard", "activity", "weekly", "allEntries", "run", "employees", "tax", "reports"];
  const initialTab = validTabs.includes(defaultTab as TabKey) ? (defaultTab as TabKey) : "dashboard";
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);

  // Run Payroll state
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [payDate, setPayDate] = useState("");
  const [calculating, setCalculating] = useState(false);
  const [calculatedItems, setCalculatedItems] = useState<PayrollItem[]>([]);
  const [calculatedRunId, setCalculatedRunId] = useState<string | null>(null);
  const [runError, setRunError] = useState("");
  const [approving, setApproving] = useState(false);

  // Employee Setup state
  const [editingEmployee, setEditingEmployee] = useState<EmployeePayRate | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    pay_type: "hourly" as "hourly" | "salary",
    hourly_rate: "",
    overtime_rate: "",
    salary_amount: "",
    filing_status: "single",
    state_code: "",
    federal_allowances: "0",
  });
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState("");

  // Deduction modal state
  const [showDeductionModal, setShowDeductionModal] = useState(false);
  const [deductionUserId, setDeductionUserId] = useState("");
  const [deductionForm, setDeductionForm] = useState({
    deduction_type: "health_insurance",
    label: "",
    amount: "",
    is_percentage: false,
    is_pretax: true,
  });
  const [savingDeduction, setSavingDeduction] = useState(false);
  const [deductionError, setDeductionError] = useState("");

  // Tax Config state
  const [taxForm, setTaxForm] = useState({
    social_security_rate: String(taxConfig?.social_security_rate ?? 6.2),
    social_security_wage_base: String(taxConfig?.social_security_wage_base ?? 168600),
    medicare_rate: String(taxConfig?.medicare_rate ?? 1.45),
    additional_medicare_rate: String(taxConfig?.additional_medicare_rate ?? 0.9),
    additional_medicare_threshold: String(taxConfig?.additional_medicare_threshold ?? 200000),
    futa_rate: String(taxConfig?.futa_rate ?? 0.6),
    futa_wage_base: String(taxConfig?.futa_wage_base ?? 7000),
    state_unemployment_rate: String(taxConfig?.state_unemployment_rate ?? 2.7),
    state_unemployment_wage_base: String(taxConfig?.state_unemployment_wage_base ?? 7000),
    state_code: taxConfig?.state_code ?? "",
  });
  const [savingTax, setSavingTax] = useState(false);
  const [taxError, setTaxError] = useState("");
  const [taxSuccess, setTaxSuccess] = useState(false);

  // Reports state
  const [reportStart, setReportStart] = useState("");
  const [reportEnd, setReportEnd] = useState("");

  // View Run Detail state
  const [viewingRun, setViewingRun] = useState<PayrollRun | null>(null);
  const [viewItems, setViewItems] = useState<PayrollItem[]>([]);
  const [loadingView, setLoadingView] = useState(false);

  /* ----------------------------------------------------------------
     Tab definitions
     ---------------------------------------------------------------- */
  const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: "dashboard", label: "Dashboard", icon: <BarChart3 size={16} /> },
    { key: "activity", label: "Activity", icon: <Activity size={16} /> },
    { key: "weekly", label: "Timesheet", icon: <ClipboardList size={16} /> },
    { key: "allEntries", label: "All Entries", icon: <List size={16} /> },
    { key: "run", label: "Run Payroll", icon: <Play size={16} /> },
    { key: "employees", label: "Employee Setup", icon: <Users size={16} /> },
    { key: "tax", label: "Tax Config", icon: <Settings size={16} /> },
    { key: "reports", label: "Reports", icon: <FileText size={16} /> },
  ];

  /* ----------------------------------------------------------------
     Handlers
     ---------------------------------------------------------------- */

  async function handleCalculatePayroll() {
    if (!periodStart || !periodEnd) {
      setRunError("Please select both period start and end dates.");
      return;
    }
    setCalculating(true);
    setRunError("");
    setCalculatedItems([]);
    setCalculatedRunId(null);

    try {
      const res = await fetch("/api/payroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          period_start: periodStart,
          period_end: periodEnd,
          pay_date: payDate || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to calculate payroll.");
      }

      setCalculatedItems(data.items ?? []);
      setCalculatedRunId(data.run_id ?? null);
    } catch (err: unknown) {
      setRunError(err instanceof Error ? err.message : "Failed to calculate payroll.");
    } finally {
      setCalculating(false);
    }
  }

  async function handleApprovePay() {
    if (!calculatedRunId) return;
    setApproving(true);
    setRunError("");

    try {
      const res = await fetch(`/api/payroll/${calculatedRunId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "paid" }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to approve payroll.");
      }

      // Reset and refresh
      setCalculatedItems([]);
      setCalculatedRunId(null);
      setPeriodStart("");
      setPeriodEnd("");
      setPayDate("");
      router.refresh();
    } catch (err: unknown) {
      setRunError(err instanceof Error ? err.message : "Failed to approve payroll.");
    } finally {
      setApproving(false);
    }
  }

  function openEditEmployee(emp: EmployeePayRate) {
    setEditingEmployee(emp);
    setEditForm({
      pay_type: emp.pay_type,
      hourly_rate: String(emp.hourly_rate ?? ""),
      overtime_rate: String(emp.overtime_rate ?? ""),
      salary_amount: String(emp.salary_amount ?? ""),
      filing_status: emp.filing_status ?? "single",
      state_code: emp.state_code ?? "",
      federal_allowances: String(emp.federal_allowances ?? 0),
    });
    setEditError("");
    setShowEditModal(true);
  }

  function openSetUpEmployee(contact: EmployeeContact) {
    // Create a synthetic EmployeePayRate for the modal with defaults
    const syntheticPayRate: EmployeePayRate = {
      id: "", // empty = new record
      company_id: companyId,
      user_id: contact.user_id!,
      pay_type: "hourly",
      hourly_rate: null,
      overtime_rate: null,
      salary_amount: null,
      filing_status: "single",
      federal_allowances: 0,
      state_code: "",
      effective_date: new Date().toISOString().slice(0, 10),
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
      filing_status: "single",
      state_code: "",
      federal_allowances: "0",
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
          filing_status: editForm.filing_status,
          state_code: editForm.state_code,
          federal_allowances: Number(editForm.federal_allowances),
          effective_date: new Date().toISOString().slice(0, 10),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save.");

      setShowEditModal(false);
      setEditingEmployee(null);
      router.refresh();
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : "Failed to save employee pay rate.");
    } finally {
      setSaving(false);
    }
  }

  function openAddDeduction(userId: string) {
    setDeductionUserId(userId);
    setDeductionForm({
      deduction_type: "health_insurance",
      label: "",
      amount: "",
      is_percentage: false,
      is_pretax: true,
    });
    setDeductionError("");
    setShowDeductionModal(true);
  }

  async function handleSaveDeduction() {
    if (!deductionUserId) return;
    setSavingDeduction(true);
    setDeductionError("");

    try {
      const res = await fetch("/api/payroll/deductions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: deductionUserId,
          deduction_type: deductionForm.deduction_type,
          label: deductionForm.label,
          amount: Number(deductionForm.amount),
          is_percentage: deductionForm.is_percentage,
          is_pretax: deductionForm.is_pretax,
          effective_date: new Date().toISOString().slice(0, 10),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create deduction.");

      setShowDeductionModal(false);
      router.refresh();
    } catch (err: unknown) {
      setDeductionError(err instanceof Error ? err.message : "Failed to save deduction.");
    } finally {
      setSavingDeduction(false);
    }
  }

  async function handleSaveTax(e: React.FormEvent) {
    e.preventDefault();
    setSavingTax(true);
    setTaxError("");
    setTaxSuccess(false);

    try {
      const res = await fetch("/api/payroll/tax-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tax_year: new Date().getFullYear(),
          social_security_rate: Number(taxForm.social_security_rate),
          social_security_wage_base: Number(taxForm.social_security_wage_base),
          medicare_rate: Number(taxForm.medicare_rate),
          additional_medicare_rate: Number(taxForm.additional_medicare_rate),
          additional_medicare_threshold: Number(taxForm.additional_medicare_threshold),
          futa_rate: Number(taxForm.futa_rate),
          futa_wage_base: Number(taxForm.futa_wage_base),
          state_unemployment_rate: Number(taxForm.state_unemployment_rate),
          state_unemployment_wage_base: Number(taxForm.state_unemployment_wage_base),
          state_code: taxForm.state_code,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save tax config.");

      setTaxSuccess(true);
      router.refresh();
    } catch (err: unknown) {
      setTaxError(err instanceof Error ? err.message : "Failed to save tax configuration.");
    } finally {
      setSavingTax(false);
    }
  }

  async function handleViewRun(run: PayrollRun) {
    setViewingRun(run);
    setLoadingView(true);
    setViewItems([]);

    try {
      const res = await fetch(`/api/payroll/${run.id}`);
      const data = await res.json();
      if (res.ok && data.items) {
        setViewItems(data.items);
      }
    } catch {
      // Silently fail - show empty table
    } finally {
      setLoadingView(false);
    }
  }

  async function handleApproveRun(run: PayrollRun) {
    try {
      const res = await fetch(`/api/payroll/${run.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "approved" }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to approve.");
        return;
      }
      router.refresh();
    } catch {
      alert("Failed to approve payroll run.");
    }
  }

  async function handlePayRun(run: PayrollRun) {
    try {
      const res = await fetch(`/api/payroll/${run.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "paid" }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to process payment.");
        return;
      }
      router.refresh();
    } catch {
      alert("Failed to process payroll payment.");
    }
  }

  /* ----------------------------------------------------------------
     Computed
     ---------------------------------------------------------------- */

  // Calculated run totals
  const calcTotals = calculatedItems.reduce(
    (acc, item) => ({
      regHrs: acc.regHrs + (item.regular_hours ?? 0),
      otHrs: acc.otHrs + (item.overtime_hours ?? 0),
      gross: acc.gross + (item.gross_pay ?? 0),
      fedTax: acc.fedTax + (item.federal_income_tax ?? 0),
      stateTax: acc.stateTax + (item.state_income_tax ?? 0),
      ss: acc.ss + (item.social_security_employee ?? 0),
      med: acc.med + (item.medicare_employee ?? 0),
      deductions: acc.deductions + (item.pretax_deductions ?? 0) + (item.posttax_deductions ?? 0),
      net: acc.net + (item.net_pay ?? 0),
      empSS: acc.empSS + (item.social_security_employer ?? 0),
      empMed: acc.empMed + (item.medicare_employer ?? 0),
      empFUTA: acc.empFUTA + (item.futa_employer ?? 0),
      empSUTA: acc.empSUTA + (item.suta_employer ?? 0),
    }),
    {
      regHrs: 0,
      otHrs: 0,
      gross: 0,
      fedTax: 0,
      stateTax: 0,
      ss: 0,
      med: 0,
      deductions: 0,
      net: 0,
      empSS: 0,
      empMed: 0,
      empFUTA: 0,
      empSUTA: 0,
    }
  );

  // Filtered payroll runs for reports tab
  const reportRuns = payrollRuns.filter((r) => {
    if (reportStart && r.pay_date < reportStart) return false;
    if (reportEnd && r.pay_date > reportEnd) return false;
    return r.status === "paid";
  });

  /* ----------------------------------------------------------------
     Render
     ---------------------------------------------------------------- */

  return (
    <div>
      {/* Header */}
      <div className="fin-header">
        <div>
          <h2>Payroll</h2>
          <p className="fin-header-sub">
            Manage payroll runs, employee compensation, tax withholdings, and reports
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

      {/* ── Dashboard Tab ── */}
      {activeTab === "dashboard" && (
        <>
          {/* KPI Row */}
          <div className="payroll-kpi-row">
            <div className="payroll-kpi">
              <div className="payroll-kpi-icon blue">
                <DollarSign size={20} />
              </div>
              <div className="payroll-kpi-label">YTD Total Payroll</div>
              <div className="payroll-kpi-value">{fmt(overview.ytdTotalPayroll)}</div>
            </div>
            <div className="payroll-kpi">
              <div className="payroll-kpi-icon green">
                <Calendar size={20} />
              </div>
              <div className="payroll-kpi-label">Last Run Date</div>
              <div className="payroll-kpi-value" style={{ fontSize: "1.2rem" }}>
                {fmtDate(overview.lastRunDate)}
              </div>
            </div>
            <div className="payroll-kpi">
              <div className="payroll-kpi-icon amber">
                <Clock size={20} />
              </div>
              <div className="payroll-kpi-label">Pending Approved Hours</div>
              <div className="payroll-kpi-value">
                {fmtNum(overview.pendingApprovedHours, 1)}h
              </div>
            </div>
            <div className="payroll-kpi">
              <div className="payroll-kpi-icon blue">
                <Users size={20} />
              </div>
              <div className="payroll-kpi-label">Active Employees</div>
              <div className="payroll-kpi-value">{overview.activeEmployees}</div>
            </div>
          </div>

          {/* Payroll Runs History */}
          <div className="fin-chart-card">
            <div className="fin-chart-title">
              <Banknote size={18} />
              Payroll Runs History
            </div>

            {payrollRuns.length === 0 ? (
              <div className="fin-empty">
                <div className="fin-empty-icon">
                  <DollarSign size={48} />
                </div>
                <div className="fin-empty-title">No Payroll Runs Yet</div>
                <p className="fin-empty-desc">
                  Run your first payroll by going to the &quot;Run Payroll&quot; tab.
                </p>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="payroll-review-table">
                  <thead>
                    <tr>
                      <th>Pay Period</th>
                      <th>Pay Date</th>
                      <th>Status</th>
                      <th className="num-col">Employees</th>
                      <th className="num-col">Gross</th>
                      <th className="num-col">Net</th>
                      <th>JE #</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payrollRuns.map((run) => (
                      <tr key={run.id}>
                        <td>
                          {fmtDate(run.period_start)} - {fmtDate(run.period_end)}
                        </td>
                        <td>{fmtDate(run.pay_date)}</td>
                        <td>
                          <span className={`payroll-status payroll-status-${run.status}`}>
                            {run.status}
                          </span>
                        </td>
                        <td className="num-col">{run.employee_count ?? 0}</td>
                        <td className="num-col">{fmt(run.total_gross ?? 0)}</td>
                        <td className="num-col">{fmt(run.total_net ?? 0)}</td>
                        <td>
                          {run.journal_entry_number ?? (run.journal_entry_id ? "Posted" : "--")}
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button
                              className="ui-btn ui-btn-sm ui-btn-ghost"
                              onClick={() => handleViewRun(run)}
                              title="View details"
                            >
                              <Eye size={14} />
                            </button>
                            {run.status === "draft" && isAdmin && (
                              <button
                                className="ui-btn ui-btn-sm ui-btn-outline"
                                onClick={() => handleApproveRun(run)}
                                title="Approve"
                              >
                                <CheckCircle2 size={14} />
                              </button>
                            )}
                            {run.status === "approved" && isAdmin && (
                              <button
                                className="ui-btn ui-btn-sm ui-btn-primary"
                                onClick={() => handlePayRun(run)}
                                title="Process payment"
                              >
                                <DollarSign size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
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

      {/* ── Run Payroll Tab ── */}
      {activeTab === "run" && (
        <>
          {/* Step 1: Select Pay Period */}
          <div className="payroll-step">
            <div className="payroll-step-header">
              <div className={`payroll-step-number ${calculatedItems.length > 0 ? "completed" : ""}`}>
                1
              </div>
              <div className="payroll-step-title">Select Pay Period</div>
            </div>
            <div className="payroll-step-content">
              <div className="payroll-form-grid">
                <div className="payroll-form-group">
                  <label className="payroll-form-label">Period Start</label>
                  <input
                    type="date"
                    className="payroll-form-input"
                    value={periodStart}
                    onChange={(e) => setPeriodStart(e.target.value)}
                  />
                </div>
                <div className="payroll-form-group">
                  <label className="payroll-form-label">Period End</label>
                  <input
                    type="date"
                    className="payroll-form-input"
                    value={periodEnd}
                    onChange={(e) => setPeriodEnd(e.target.value)}
                  />
                </div>
                <div className="payroll-form-group">
                  <label className="payroll-form-label">Pay Date (optional)</label>
                  <input
                    type="date"
                    className="payroll-form-input"
                    value={payDate}
                    onChange={(e) => setPayDate(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Step 2: Calculate */}
          <div className="payroll-step">
            <div className="payroll-step-header">
              <div className={`payroll-step-number ${calculatedItems.length > 0 ? "completed" : ""}`}>
                2
              </div>
              <div className="payroll-step-title">Calculate Payroll</div>
            </div>
            <div className="payroll-step-content">
              {runError && (
                <div style={{ color: "var(--color-red)", marginBottom: 12, fontSize: "0.88rem", display: "flex", alignItems: "center", gap: 6 }}>
                  <AlertTriangle size={16} />
                  {runError}
                </div>
              )}
              <button
                className="ui-btn ui-btn-md ui-btn-primary"
                onClick={handleCalculatePayroll}
                disabled={calculating || !periodStart || !periodEnd}
              >
                <Play size={16} />
                {calculating ? "Calculating..." : "Calculate Payroll"}
              </button>
            </div>
          </div>

          {/* Step 3: Review */}
          {calculatedItems.length > 0 && (
            <div className="payroll-step">
              <div className="payroll-step-header">
                <div className="payroll-step-number">3</div>
                <div className="payroll-step-title">Review & Approve</div>
              </div>
              <div className="payroll-step-content">
                <div className="fin-chart-card" style={{ padding: 0 }}>
                  <div style={{ overflowX: "auto" }}>
                    <table className="payroll-review-table">
                      <thead>
                        <tr>
                          <th>Employee</th>
                          <th className="num-col">Reg Hrs</th>
                          <th className="num-col">OT Hrs</th>
                          <th className="num-col">Rate</th>
                          <th className="num-col">Gross</th>
                          <th className="num-col">Fed Tax</th>
                          <th className="num-col">State Tax</th>
                          <th className="num-col">SS</th>
                          <th className="num-col">Medicare</th>
                          <th className="num-col">Deductions</th>
                          <th className="num-col">Net Pay</th>
                        </tr>
                      </thead>
                      <tbody>
                        {calculatedItems.map((item) => (
                          <tr key={item.id || item.user_id}>
                            <td style={{ fontWeight: 500 }}>
                              {item.employee_name ?? "Employee"}
                            </td>
                            <td className="num-col">{fmtNum(item.regular_hours ?? 0)}</td>
                            <td className="num-col">{fmtNum(item.overtime_hours ?? 0)}</td>
                            <td className="num-col">{fmt(item.hourly_rate ?? 0)}</td>
                            <td className="num-col">{fmt(item.gross_pay ?? 0)}</td>
                            <td className="num-col">{fmt(item.federal_income_tax ?? 0)}</td>
                            <td className="num-col">{fmt(item.state_income_tax ?? 0)}</td>
                            <td className="num-col">{fmt(item.social_security_employee ?? 0)}</td>
                            <td className="num-col">{fmt(item.medicare_employee ?? 0)}</td>
                            <td className="num-col">
                              {fmt((item.pretax_deductions ?? 0) + (item.posttax_deductions ?? 0))}
                            </td>
                            <td className="num-col" style={{ fontWeight: 700 }}>
                              {fmt(item.net_pay ?? 0)}
                            </td>
                          </tr>
                        ))}
                        {/* Totals row */}
                        <tr className="summary-row">
                          <td style={{ fontWeight: 700 }}>TOTALS</td>
                          <td className="num-col">{fmtNum(calcTotals.regHrs)}</td>
                          <td className="num-col">{fmtNum(calcTotals.otHrs)}</td>
                          <td className="num-col">--</td>
                          <td className="num-col">{fmt(calcTotals.gross)}</td>
                          <td className="num-col">{fmt(calcTotals.fedTax)}</td>
                          <td className="num-col">{fmt(calcTotals.stateTax)}</td>
                          <td className="num-col">{fmt(calcTotals.ss)}</td>
                          <td className="num-col">{fmt(calcTotals.med)}</td>
                          <td className="num-col">{fmt(calcTotals.deductions)}</td>
                          <td className="num-col" style={{ fontWeight: 700 }}>{fmt(calcTotals.net)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Employer Taxes Summary */}
                <div className="payroll-summary-box">
                  <div className="payroll-summary-title">Employer Tax Summary</div>
                  <div className="payroll-summary-row">
                    <span className="payroll-summary-label">Social Security (Employer)</span>
                    <span className="payroll-summary-value">{fmt(calcTotals.empSS)}</span>
                  </div>
                  <div className="payroll-summary-row">
                    <span className="payroll-summary-label">Medicare (Employer)</span>
                    <span className="payroll-summary-value">{fmt(calcTotals.empMed)}</span>
                  </div>
                  <div className="payroll-summary-row">
                    <span className="payroll-summary-label">FUTA</span>
                    <span className="payroll-summary-value">{fmt(calcTotals.empFUTA)}</span>
                  </div>
                  <div className="payroll-summary-row">
                    <span className="payroll-summary-label">SUTA</span>
                    <span className="payroll-summary-value">{fmt(calcTotals.empSUTA)}</span>
                  </div>
                  <div className="payroll-summary-divider" />
                  <div className="payroll-summary-row payroll-summary-total">
                    <span className="payroll-summary-label">Total Employer Taxes</span>
                    <span className="payroll-summary-value">
                      {fmt(calcTotals.empSS + calcTotals.empMed + calcTotals.empFUTA + calcTotals.empSUTA)}
                    </span>
                  </div>
                </div>

                {/* Approve & Pay */}
                <div className="payroll-actions-bar">
                  <button
                    className="ui-btn ui-btn-md ui-btn-outline"
                    onClick={() => {
                      setCalculatedItems([]);
                      setCalculatedRunId(null);
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    className="ui-btn ui-btn-md ui-btn-primary"
                    onClick={handleApprovePay}
                    disabled={approving}
                  >
                    <CheckCircle2 size={16} />
                    {approving ? "Processing..." : "Approve & Pay"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Employee Setup Tab ── */}
      {activeTab === "employees" && (
        <>
          {/* All Employee Contacts Table */}
          <div className="fin-chart-card">
            <div className="fin-chart-title">
              <Users size={18} />
              All Employees ({employeeContacts.length})
            </div>

            {employeeContacts.length === 0 ? (
              <div className="fin-empty">
                <div className="fin-empty-icon">
                  <Users size={48} />
                </div>
                <div className="fin-empty-title">No Employee Contacts Found</div>
                <p className="fin-empty-desc">
                  Add employees as contacts in the People section first, then configure their payroll here.
                </p>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="payroll-review-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Job Title</th>
                      <th>Pay Status</th>
                      <th>Actions</th>
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
                            Configured
                          </span>
                        );
                      } else if (hasUserId) {
                        statusBadge = (
                          <span className="payroll-status payroll-status-draft">
                            Not Set Up
                          </span>
                        );
                      } else {
                        statusBadge = (
                          <span className="payroll-status payroll-status-approved">
                            Needs Login
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
                                  title="Edit pay rate"
                                >
                                  <Edit3 size={14} />
                                  Edit
                                </button>
                              )}
                              {!isConfigured && hasUserId && isAdmin && (
                                <button
                                  className="ui-btn ui-btn-sm ui-btn-primary"
                                  onClick={() => openSetUpEmployee(contact)}
                                  title="Set up payroll for this employee"
                                >
                                  <Plus size={14} />
                                  Set Up
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
                                  No login account
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

          {/* Configured Employee Detail Cards */}
          {payRates.length > 0 && (
            <>
              <div style={{ marginTop: 24, marginBottom: 12 }}>
                <h3 style={{ fontSize: "1.05rem", fontWeight: 600, color: "var(--foreground)" }}>
                  Configured Pay Rates ({payRates.length})
                </h3>
              </div>
              <div className="payroll-employee-grid">
                {payRates.map((emp) => {
                  const empDeductions = deductions.filter((d) => d.user_id === emp.user_id);
                  const displayName = emp.employee_name ?? "Unknown";

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
                            Edit
                          </button>
                        )}
                      </div>

                      <div className="payroll-employee-card-details">
                        <div className="payroll-employee-card-row">
                          <span className="payroll-employee-card-label">Pay Type</span>
                          <span style={{ fontWeight: 600, textTransform: "capitalize" }}>
                            {emp.pay_type}
                          </span>
                        </div>
                        {emp.pay_type === "hourly" ? (
                          <>
                            <div className="payroll-employee-card-row">
                              <span className="payroll-employee-card-label">Hourly Rate</span>
                              <span className="payroll-employee-card-value">
                                {fmt(emp.hourly_rate ?? 0)}/hr
                              </span>
                            </div>
                            <div className="payroll-employee-card-row">
                              <span className="payroll-employee-card-label">Overtime Rate</span>
                              <span className="payroll-employee-card-value">
                                {fmt(emp.overtime_rate ?? 0)}/hr
                              </span>
                            </div>
                          </>
                        ) : (
                          <div className="payroll-employee-card-row">
                            <span className="payroll-employee-card-label">Annual Salary</span>
                            <span className="payroll-employee-card-value">
                              {fmt(emp.salary_amount ?? 0)}
                            </span>
                          </div>
                        )}
                        <div className="payroll-employee-card-row">
                          <span className="payroll-employee-card-label">Filing Status</span>
                          <span style={{ textTransform: "capitalize" }}>
                            {(emp.filing_status ?? "single").replace(/_/g, " ")}
                          </span>
                        </div>
                        {emp.state_code && (
                          <div className="payroll-employee-card-row">
                            <span className="payroll-employee-card-label">State</span>
                            <span>{emp.state_code}</span>
                          </div>
                        )}
                      </div>

                      {/* Deductions */}
                      {empDeductions.length > 0 && (
                        <div style={{ marginTop: 12 }}>
                          <div style={{ fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.03em", color: "var(--muted)", marginBottom: 6 }}>
                            Deductions
                          </div>
                          {empDeductions.map((ded) => (
                            <div key={ded.id} className="payroll-deduction-row">
                              <div className="payroll-deduction-label">
                                <span>{ded.label}</span>
                                <span className="payroll-deduction-type">{ded.deduction_type.replace(/_/g, " ")}</span>
                                <span className={`payroll-deduction-badge ${ded.is_pretax ? "pretax" : "posttax"}`}>
                                  {ded.is_pretax ? "Pre-tax" : "Post-tax"}
                                </span>
                              </div>
                              <span className="payroll-deduction-amount">
                                {ded.is_percentage ? `${ded.amount}%` : fmt(ded.amount)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {isAdmin && (
                        <div className="payroll-employee-card-actions">
                          <button
                            className="ui-btn ui-btn-sm ui-btn-outline"
                            onClick={() => openAddDeduction(emp.user_id)}
                            style={{ flex: 1 }}
                          >
                            <Plus size={14} />
                            Add Deduction
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}

      {/* ── Tax Config Tab ── */}
      {activeTab === "tax" && (
        <div className="payroll-tax-form">
          <form onSubmit={handleSaveTax}>
            {taxError && (
              <div style={{ color: "var(--color-red)", marginBottom: 16, fontSize: "0.88rem", display: "flex", alignItems: "center", gap: 6 }}>
                <AlertTriangle size={16} />
                {taxError}
              </div>
            )}
            {taxSuccess && (
              <div style={{ color: "var(--color-green)", marginBottom: 16, fontSize: "0.88rem", display: "flex", alignItems: "center", gap: 6 }}>
                <CheckCircle2 size={16} />
                Tax configuration saved successfully.
              </div>
            )}

            {/* Social Security */}
            <div className="payroll-tax-section">
              <div className="payroll-tax-section-title">
                <Shield size={18} />
                Social Security (FICA)
              </div>
              <div className="payroll-tax-grid">
                <div className="payroll-form-group">
                  <label className="payroll-form-label">SS Rate (%)</label>
                  <input
                    type="number"
                    className="payroll-form-input"
                    value={taxForm.social_security_rate}
                    onChange={(e) => setTaxForm({ ...taxForm, social_security_rate: e.target.value })}
                    step="0.01"
                  />
                </div>
                <div className="payroll-form-group">
                  <label className="payroll-form-label">SS Wage Base ($)</label>
                  <input
                    type="number"
                    className="payroll-form-input"
                    value={taxForm.social_security_wage_base}
                    onChange={(e) => setTaxForm({ ...taxForm, social_security_wage_base: e.target.value })}
                    step="100"
                  />
                </div>
              </div>
            </div>

            {/* Medicare */}
            <div className="payroll-tax-section">
              <div className="payroll-tax-section-title">
                <Shield size={18} />
                Medicare
              </div>
              <div className="payroll-tax-grid">
                <div className="payroll-form-group">
                  <label className="payroll-form-label">Medicare Rate (%)</label>
                  <input
                    type="number"
                    className="payroll-form-input"
                    value={taxForm.medicare_rate}
                    onChange={(e) => setTaxForm({ ...taxForm, medicare_rate: e.target.value })}
                    step="0.01"
                  />
                </div>
                <div className="payroll-form-group">
                  <label className="payroll-form-label">Additional Medicare Rate (%)</label>
                  <input
                    type="number"
                    className="payroll-form-input"
                    value={taxForm.additional_medicare_rate}
                    onChange={(e) => setTaxForm({ ...taxForm, additional_medicare_rate: e.target.value })}
                    step="0.01"
                  />
                </div>
                <div className="payroll-form-group">
                  <label className="payroll-form-label">Additional Medicare Threshold ($)</label>
                  <input
                    type="number"
                    className="payroll-form-input"
                    value={taxForm.additional_medicare_threshold}
                    onChange={(e) => setTaxForm({ ...taxForm, additional_medicare_threshold: e.target.value })}
                    step="1000"
                  />
                </div>
              </div>
            </div>

            {/* FUTA */}
            <div className="payroll-tax-section">
              <div className="payroll-tax-section-title">
                <Shield size={18} />
                FUTA (Federal Unemployment)
              </div>
              <div className="payroll-tax-grid">
                <div className="payroll-form-group">
                  <label className="payroll-form-label">FUTA Rate (%)</label>
                  <input
                    type="number"
                    className="payroll-form-input"
                    value={taxForm.futa_rate}
                    onChange={(e) => setTaxForm({ ...taxForm, futa_rate: e.target.value })}
                    step="0.01"
                  />
                </div>
                <div className="payroll-form-group">
                  <label className="payroll-form-label">FUTA Wage Base ($)</label>
                  <input
                    type="number"
                    className="payroll-form-input"
                    value={taxForm.futa_wage_base}
                    onChange={(e) => setTaxForm({ ...taxForm, futa_wage_base: e.target.value })}
                    step="100"
                  />
                </div>
              </div>
            </div>

            {/* SUTA */}
            <div className="payroll-tax-section">
              <div className="payroll-tax-section-title">
                <Shield size={18} />
                SUTA (State Unemployment)
              </div>
              <div className="payroll-tax-grid">
                <div className="payroll-form-group">
                  <label className="payroll-form-label">SUTA Rate (%)</label>
                  <input
                    type="number"
                    className="payroll-form-input"
                    value={taxForm.state_unemployment_rate}
                    onChange={(e) => setTaxForm({ ...taxForm, state_unemployment_rate: e.target.value })}
                    step="0.01"
                  />
                </div>
                <div className="payroll-form-group">
                  <label className="payroll-form-label">SUTA Wage Base ($)</label>
                  <input
                    type="number"
                    className="payroll-form-input"
                    value={taxForm.state_unemployment_wage_base}
                    onChange={(e) => setTaxForm({ ...taxForm, state_unemployment_wage_base: e.target.value })}
                    step="100"
                  />
                </div>
                <div className="payroll-form-group">
                  <label className="payroll-form-label">State Code</label>
                  <input
                    type="text"
                    className="payroll-form-input"
                    value={taxForm.state_code}
                    onChange={(e) => setTaxForm({ ...taxForm, state_code: e.target.value.toUpperCase() })}
                    placeholder="e.g. CA, TX, NY"
                    maxLength={2}
                  />
                </div>
              </div>
            </div>

            <div className="payroll-actions-bar">
              <button
                type="submit"
                className="ui-btn ui-btn-md ui-btn-primary"
                disabled={savingTax}
              >
                {savingTax ? "Saving..." : "Save Tax Configuration"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Reports Tab ── */}
      {activeTab === "reports" && (
        <>
          {/* Payroll Register */}
          <div className="payroll-report-card">
            <div className="payroll-report-title">Payroll Register</div>
            <div className="payroll-report-controls">
              <div className="payroll-form-group">
                <label className="payroll-form-label">Start Date</label>
                <input
                  type="date"
                  className="payroll-form-input"
                  value={reportStart}
                  onChange={(e) => setReportStart(e.target.value)}
                />
              </div>
              <div className="payroll-form-group">
                <label className="payroll-form-label">End Date</label>
                <input
                  type="date"
                  className="payroll-form-input"
                  value={reportEnd}
                  onChange={(e) => setReportEnd(e.target.value)}
                />
              </div>
            </div>

            {reportRuns.length === 0 ? (
              <div style={{ textAlign: "center", padding: "32px 16px", color: "var(--muted)", fontSize: "0.88rem" }}>
                No paid payroll runs found in the selected date range.
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="payroll-review-table">
                  <thead>
                    <tr>
                      <th>Pay Date</th>
                      <th>Period</th>
                      <th className="num-col">Employees</th>
                      <th className="num-col">Gross Pay</th>
                      <th className="num-col">Employee Taxes</th>
                      <th className="num-col">Employer Taxes</th>
                      <th className="num-col">Deductions</th>
                      <th className="num-col">Net Pay</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportRuns.map((run) => (
                      <tr key={run.id}>
                        <td>{fmtDate(run.pay_date)}</td>
                        <td style={{ fontSize: "0.82rem" }}>
                          {fmtDate(run.period_start)} - {fmtDate(run.period_end)}
                        </td>
                        <td className="num-col">{run.employee_count ?? 0}</td>
                        <td className="num-col">{fmt(run.total_gross ?? 0)}</td>
                        <td className="num-col">{fmt(run.total_employee_taxes ?? 0)}</td>
                        <td className="num-col">{fmt(run.total_employer_taxes ?? 0)}</td>
                        <td className="num-col">{fmt(run.total_deductions ?? 0)}</td>
                        <td className="num-col" style={{ fontWeight: 700 }}>{fmt(run.total_net ?? 0)}</td>
                      </tr>
                    ))}
                    {/* Summary row */}
                    <tr className="summary-row">
                      <td colSpan={2} style={{ fontWeight: 700 }}>TOTALS</td>
                      <td className="num-col">
                        {reportRuns.reduce((s, r) => s + (r.employee_count ?? 0), 0)}
                      </td>
                      <td className="num-col">
                        {fmt(reportRuns.reduce((s, r) => s + (r.total_gross ?? 0), 0))}
                      </td>
                      <td className="num-col">
                        {fmt(reportRuns.reduce((s, r) => s + (r.total_employee_taxes ?? 0), 0))}
                      </td>
                      <td className="num-col">
                        {fmt(reportRuns.reduce((s, r) => s + (r.total_employer_taxes ?? 0), 0))}
                      </td>
                      <td className="num-col">
                        {fmt(reportRuns.reduce((s, r) => s + (r.total_deductions ?? 0), 0))}
                      </td>
                      <td className="num-col" style={{ fontWeight: 700 }}>
                        {fmt(reportRuns.reduce((s, r) => s + (r.total_net ?? 0), 0))}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Tax Liability Summary */}
          <div className="payroll-report-card">
            <div className="payroll-report-title">Tax Liability Summary (YTD)</div>
            {(() => {
              const ytdRuns = payrollRuns.filter((r) => r.status === "paid");
              if (ytdRuns.length === 0) {
                return (
                  <div style={{ textAlign: "center", padding: "32px 16px", color: "var(--muted)", fontSize: "0.88rem" }}>
                    No paid payroll runs to generate tax liability data.
                  </div>
                );
              }

              const totalGross = ytdRuns.reduce((s, r) => s + (r.total_gross ?? 0), 0);
              const totalEmployeeTax = ytdRuns.reduce((s, r) => s + (r.total_employee_taxes ?? 0), 0);
              const totalEmployerTax = ytdRuns.reduce((s, r) => s + (r.total_employer_taxes ?? 0), 0);

              return (
                <div>
                  <div className="payroll-summary-row">
                    <span className="payroll-summary-label">Total Gross Payroll</span>
                    <span className="payroll-summary-value">{fmt(totalGross)}</span>
                  </div>
                  <div className="payroll-summary-divider" />
                  <div className="payroll-summary-row">
                    <span className="payroll-summary-label">Employee Taxes Withheld</span>
                    <span className="payroll-summary-value">{fmt(totalEmployeeTax)}</span>
                  </div>
                  <div className="payroll-summary-row">
                    <span className="payroll-summary-label" style={{ paddingLeft: 16 }}>
                      Federal Income Tax
                    </span>
                    <span className="payroll-summary-value" style={{ color: "var(--muted)" }}>
                      (Included above)
                    </span>
                  </div>
                  <div className="payroll-summary-row">
                    <span className="payroll-summary-label" style={{ paddingLeft: 16 }}>
                      State Income Tax
                    </span>
                    <span className="payroll-summary-value" style={{ color: "var(--muted)" }}>
                      (Included above)
                    </span>
                  </div>
                  <div className="payroll-summary-row">
                    <span className="payroll-summary-label" style={{ paddingLeft: 16 }}>
                      Employee SS + Medicare
                    </span>
                    <span className="payroll-summary-value" style={{ color: "var(--muted)" }}>
                      (Included above)
                    </span>
                  </div>
                  <div className="payroll-summary-divider" />
                  <div className="payroll-summary-row">
                    <span className="payroll-summary-label">Employer Taxes</span>
                    <span className="payroll-summary-value">{fmt(totalEmployerTax)}</span>
                  </div>
                  <div className="payroll-summary-row">
                    <span className="payroll-summary-label" style={{ paddingLeft: 16 }}>
                      Employer SS + Medicare
                    </span>
                    <span className="payroll-summary-value" style={{ color: "var(--muted)" }}>
                      (Included above)
                    </span>
                  </div>
                  <div className="payroll-summary-row">
                    <span className="payroll-summary-label" style={{ paddingLeft: 16 }}>
                      FUTA + SUTA
                    </span>
                    <span className="payroll-summary-value" style={{ color: "var(--muted)" }}>
                      (Included above)
                    </span>
                  </div>
                  <div className="payroll-summary-divider" />
                  <div className="payroll-summary-row payroll-summary-total">
                    <span className="payroll-summary-label">Total Tax Liability</span>
                    <span className="payroll-summary-value">
                      {fmt(totalEmployeeTax + totalEmployerTax)}
                    </span>
                  </div>
                </div>
              );
            })()}
          </div>
        </>
      )}

      {/* ── View Run Detail Modal ── */}
      {viewingRun && (
        <div className="fin-modal-overlay" onClick={() => setViewingRun(null)}>
          <div
            className="fin-modal"
            style={{ maxWidth: 900 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="fin-modal-header">
              <h3>
                Payroll Run: {fmtDate(viewingRun.period_start)} - {fmtDate(viewingRun.period_end)}
              </h3>
              <button
                className="ui-btn ui-btn-sm ui-btn-ghost"
                onClick={() => setViewingRun(null)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="fin-modal-body">
              {/* Summary */}
              <div style={{ display: "flex", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 120 }}>
                  <div style={{ fontSize: "0.75rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.03em" }}>Status</div>
                  <span className={`payroll-status payroll-status-${viewingRun.status}`}>
                    {viewingRun.status}
                  </span>
                </div>
                <div style={{ flex: 1, minWidth: 120 }}>
                  <div style={{ fontSize: "0.75rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.03em" }}>Pay Date</div>
                  <div style={{ fontWeight: 600 }}>{fmtDate(viewingRun.pay_date)}</div>
                </div>
                <div style={{ flex: 1, minWidth: 120 }}>
                  <div style={{ fontSize: "0.75rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.03em" }}>Employees</div>
                  <div style={{ fontWeight: 600 }}>{viewingRun.employee_count ?? 0}</div>
                </div>
                <div style={{ flex: 1, minWidth: 120 }}>
                  <div style={{ fontSize: "0.75rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.03em" }}>Total Gross</div>
                  <div style={{ fontWeight: 600, fontFamily: "var(--font-serif)" }}>
                    {fmt(viewingRun.total_gross ?? 0)}
                  </div>
                </div>
                <div style={{ flex: 1, minWidth: 120 }}>
                  <div style={{ fontSize: "0.75rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.03em" }}>Total Net</div>
                  <div style={{ fontWeight: 600, fontFamily: "var(--font-serif)" }}>
                    {fmt(viewingRun.total_net ?? 0)}
                  </div>
                </div>
              </div>

              {/* Items table */}
              {loadingView ? (
                <div style={{ textAlign: "center", padding: 32, color: "var(--muted)" }}>
                  Loading payroll details...
                </div>
              ) : viewItems.length === 0 ? (
                <div style={{ textAlign: "center", padding: 32, color: "var(--muted)" }}>
                  No payroll items found for this run.
                </div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table className="payroll-review-table">
                    <thead>
                      <tr>
                        <th>Employee</th>
                        <th className="num-col">Reg Hrs</th>
                        <th className="num-col">OT Hrs</th>
                        <th className="num-col">Gross</th>
                        <th className="num-col">Taxes</th>
                        <th className="num-col">Deductions</th>
                        <th className="num-col">Net Pay</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewItems.map((item) => (
                        <tr key={item.id}>
                          <td style={{ fontWeight: 500 }}>{item.employee_name ?? "Employee"}</td>
                          <td className="num-col">{fmtNum(item.regular_hours ?? 0)}</td>
                          <td className="num-col">{fmtNum(item.overtime_hours ?? 0)}</td>
                          <td className="num-col">{fmt(item.gross_pay ?? 0)}</td>
                          <td className="num-col">
                            {fmt(
                              (item.federal_income_tax ?? 0) +
                              (item.state_income_tax ?? 0) +
                              (item.social_security_employee ?? 0) +
                              (item.medicare_employee ?? 0)
                            )}
                          </td>
                          <td className="num-col">
                            {fmt((item.pretax_deductions ?? 0) + (item.posttax_deductions ?? 0))}
                          </td>
                          <td className="num-col" style={{ fontWeight: 700 }}>
                            {fmt(item.net_pay ?? 0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Employee Modal ── */}
      {showEditModal && editingEmployee && (
        <div className="fin-modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="fin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="fin-modal-header">
              <h3>Edit Pay Rate: {editingEmployee.employee_name}</h3>
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
                  Hourly
                </button>
                <button
                  type="button"
                  className={`payroll-pay-type-option ${editForm.pay_type === "salary" ? "active" : ""}`}
                  onClick={() => setEditForm({ ...editForm, pay_type: "salary" })}
                >
                  <Banknote size={16} />
                  Salary
                </button>
              </div>

              {/* Rate Fields */}
              {editForm.pay_type === "hourly" ? (
                <div className="fin-form-row" style={{ marginBottom: 16 }}>
                  <div className="fin-form-group">
                    <label className="fin-form-label">Hourly Rate ($)</label>
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
                    <label className="fin-form-label">Overtime Rate ($)</label>
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
                  <label className="fin-form-label">Annual Salary ($)</label>
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

              {/* Filing Status */}
              <div className="fin-form-group" style={{ marginBottom: 16 }}>
                <label className="fin-form-label">Filing Status</label>
                <select
                  className="fin-form-select"
                  value={editForm.filing_status}
                  onChange={(e) => setEditForm({ ...editForm, filing_status: e.target.value })}
                >
                  <option value="single">Single</option>
                  <option value="married_jointly">Married Filing Jointly</option>
                  <option value="married_separately">Married Filing Separately</option>
                  <option value="head_of_household">Head of Household</option>
                </select>
              </div>

              {/* State Code */}
              <div className="fin-form-row" style={{ marginBottom: 16 }}>
                <div className="fin-form-group">
                  <label className="fin-form-label">State Code</label>
                  <input
                    type="text"
                    className="fin-form-input"
                    value={editForm.state_code}
                    onChange={(e) => setEditForm({ ...editForm, state_code: e.target.value.toUpperCase() })}
                    placeholder="e.g. CA"
                    maxLength={2}
                  />
                </div>
                <div className="fin-form-group">
                  <label className="fin-form-label">Federal Allowances</label>
                  <input
                    type="number"
                    className="fin-form-input"
                    value={editForm.federal_allowances}
                    onChange={(e) => setEditForm({ ...editForm, federal_allowances: e.target.value })}
                    min="0"
                    step="1"
                  />
                </div>
              </div>
            </div>
            <div className="fin-modal-footer">
              <button
                className="ui-btn ui-btn-md ui-btn-outline"
                onClick={() => setShowEditModal(false)}
              >
                Cancel
              </button>
              <button
                className="ui-btn ui-btn-md ui-btn-primary"
                onClick={handleSaveEmployee}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Deduction Modal ── */}
      {showDeductionModal && (
        <div className="fin-modal-overlay" onClick={() => setShowDeductionModal(false)}>
          <div className="fin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="fin-modal-header">
              <h3>Add Deduction</h3>
              <button
                className="ui-btn ui-btn-sm ui-btn-ghost"
                onClick={() => setShowDeductionModal(false)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="fin-modal-body">
              {deductionError && (
                <div style={{ color: "var(--color-red)", marginBottom: 12, fontSize: "0.88rem" }}>
                  {deductionError}
                </div>
              )}

              <div className="fin-form-group" style={{ marginBottom: 16 }}>
                <label className="fin-form-label">Deduction Type</label>
                <select
                  className="fin-form-select"
                  value={deductionForm.deduction_type}
                  onChange={(e) => setDeductionForm({ ...deductionForm, deduction_type: e.target.value })}
                >
                  <option value="health_insurance">Health Insurance</option>
                  <option value="dental_insurance">Dental Insurance</option>
                  <option value="vision_insurance">Vision Insurance</option>
                  <option value="life_insurance">Life Insurance</option>
                  <option value="401k">401(k)</option>
                  <option value="roth_401k">Roth 401(k)</option>
                  <option value="hsa">HSA</option>
                  <option value="fsa">FSA</option>
                  <option value="union_dues">Union Dues</option>
                  <option value="garnishment">Garnishment</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="fin-form-group" style={{ marginBottom: 16 }}>
                <label className="fin-form-label">Label</label>
                <input
                  type="text"
                  className="fin-form-input"
                  value={deductionForm.label}
                  onChange={(e) => setDeductionForm({ ...deductionForm, label: e.target.value })}
                  placeholder="e.g. Medical PPO, 401k Match"
                />
              </div>

              <div className="fin-form-row" style={{ marginBottom: 16 }}>
                <div className="fin-form-group">
                  <label className="fin-form-label">Amount</label>
                  <input
                    type="number"
                    className="fin-form-input"
                    value={deductionForm.amount}
                    onChange={(e) => setDeductionForm({ ...deductionForm, amount: e.target.value })}
                    step="0.01"
                    min="0"
                    placeholder={deductionForm.is_percentage ? "e.g. 6" : "e.g. 250.00"}
                  />
                </div>
              </div>

              {/* Toggles */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
                <div
                  className="payroll-toggle"
                  onClick={() => setDeductionForm({ ...deductionForm, is_percentage: !deductionForm.is_percentage })}
                >
                  <div className={`payroll-toggle-track ${deductionForm.is_percentage ? "on" : ""}`}>
                    <div className="payroll-toggle-thumb" />
                  </div>
                  <span className="payroll-toggle-label">
                    Amount is a percentage of gross pay
                  </span>
                </div>

                <div
                  className="payroll-toggle"
                  onClick={() => setDeductionForm({ ...deductionForm, is_pretax: !deductionForm.is_pretax })}
                >
                  <div className={`payroll-toggle-track ${deductionForm.is_pretax ? "on" : ""}`}>
                    <div className="payroll-toggle-thumb" />
                  </div>
                  <span className="payroll-toggle-label">
                    Pre-tax deduction (reduces taxable income)
                  </span>
                </div>
              </div>
            </div>
            <div className="fin-modal-footer">
              <button
                className="ui-btn ui-btn-md ui-btn-outline"
                onClick={() => setShowDeductionModal(false)}
              >
                Cancel
              </button>
              <button
                className="ui-btn ui-btn-md ui-btn-primary"
                onClick={handleSaveDeduction}
                disabled={savingDeduction || !deductionForm.label || !deductionForm.amount}
              >
                {savingDeduction ? "Saving..." : "Add Deduction"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
