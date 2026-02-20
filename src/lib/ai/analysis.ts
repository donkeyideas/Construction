/**
 * Core Analysis Engine — Pure Data Analysis Functions
 *
 * All functions in this module are deterministic algorithms that compute
 * scores, forecasts, and anomaly detection from structured database data.
 * No LLM calls are made here.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Input for budget overrun prediction */
export interface BudgetOverrunInput {
  budget: number;
  actualCost: number;
  completionPct: number;
}

/** Result of budget overrun prediction */
export interface BudgetOverrunResult {
  predictedFinalCost: number;
  variance: number;
  variancePct: number;
  risk: "low" | "medium" | "high" | "critical";
}

/** Aging buckets for AR or AP */
export interface AgingBuckets {
  current: number;
  days30: number;
  days60: number;
  days90plus: number;
}

/** Input for cash flow forecast */
export interface CashFlowForecastInput {
  currentCash: number;
  arAging: AgingBuckets;
  apAging: AgingBuckets;
  monthlyBurnRate: number;
}

/** A single period in the cash flow forecast */
export interface CashFlowPeriod {
  period: string;
  projectedCash: number;
  expectedCollections: number;
  expectedPayments: number;
  netChange: number;
}

/** Input for safety risk scoring */
export interface SafetyRiskInput {
  incidentCount: number;
  severeIncidentCount: number;
  avgInspectionScore: number;
  certGapCount: number;
  daysSinceLastIncident: number;
  projectCount: number;
}

/** A single factor contributing to a safety risk score */
export interface SafetyRiskFactor {
  name: string;
  value: number;
  impact: string;
}

/** Result of safety risk scoring */
export interface SafetyRiskResult {
  score: number;
  level: "low" | "medium" | "high" | "critical";
  factors: SafetyRiskFactor[];
}

/** Input for vendor performance scoring */
export interface VendorPerformanceInput {
  onTimeDeliveryPct: number;
  changeOrderCount: number;
  totalContracts: number;
  safetyIncidents: number;
  invoiceAccuracyPct: number;
  avgResponseDays: number;
}

/** A single factor contributing to a vendor performance score */
export interface VendorScoreFactor {
  name: string;
  score: number;
  weight: number;
}

/** Result of vendor performance scoring */
export interface VendorPerformanceResult {
  score: number;
  grade: "A" | "B" | "C" | "D" | "F";
  factors: VendorScoreFactor[];
}

/** Input for equipment failure prediction */
export interface EquipmentFailureInput {
  ageMonths: number;
  usageHours: number;
  maintenanceCount: number;
  daysSinceLastService: number;
  expectedServiceIntervalDays: number;
}

/** Result of equipment failure prediction */
export interface EquipmentFailureResult {
  risk: "low" | "medium" | "high";
  probability: number;
  recommendation: string;
  daysUntilRecommendedService: number;
}

/** Input for anomaly detection */
export interface AnomalyDetectionInput {
  invoicesWithoutJE: {
    id: string;
    invoice_number: string;
    total_amount: number;
  }[];
  budgetsOver90Pct: {
    projectName: string;
    budgeted: number;
    actual: number;
    pct: number;
  }[];
  unpostedJEs: {
    id: string;
    entry_number: string;
    entry_date: string;
    total_debit: number;
    daysInDraft: number;
  }[];
  expiringCerts: {
    personName: string;
    certName: string;
    expiresAt: string;
  }[];
  overdueRFIs: {
    id: string;
    rfi_number: string;
    subject: string;
    daysPending: number;
  }[];
  pendingCOs: {
    id: string;
    co_number: string;
    amount: number;
    daysPending: number;
  }[];
  overdueEquipment: {
    id: string;
    name: string;
    daysPastDue: number;
  }[];
  overdueTasks: {
    id: string;
    taskName: string;
    projectName: string;
    daysOverdue: number;
  }[];
}

/** A categorised alert item emitted by anomaly detection */
export interface AlertItem {
  id: string;
  category: "financial" | "safety" | "project" | "equipment";
  severity: "info" | "warning" | "critical";
  title: string;
  description: string;
  metric?: string;
  actionUrl?: string;
}

/** Input for bid win probability calculation */
export interface BidWinProbabilityInput {
  bidAmount: number;
  estimatedCost: number;
  historicalWinRate: number;
  competitorCount: number;
  relationshipScore: number;
}

/** A single factor influencing bid win probability */
export interface BidProbabilityFactor {
  name: string;
  impact: number;
}

/** Result of bid win probability calculation */
export interface BidWinProbabilityResult {
  probability: number;
  confidence: "low" | "medium" | "high";
  factors: BidProbabilityFactor[];
}

/** Input for change order impact analysis */
export interface ChangeOrderImpactInput {
  coAmount: number;
  currentBudget: number;
  currentActualCost: number;
  completionPct: number;
  scheduleImpactDays: number;
  originalContractValue: number;
  totalCOsToDate: number;
}

/** Result of change order impact analysis */
export interface ChangeOrderImpactResult {
  budgetImpact: {
    newBudget: number;
    newVariance: number;
    newVariancePct: number;
  };
  scheduleImpact: {
    newEndDateDelta: number;
    criticalPathAffected: boolean;
  };
  marginImpact: {
    currentMargin: number;
    projectedMargin: number;
    marginChange: number;
  };
  cumulativeCOPct: number;
  recommendation: string;
}

// ---------------------------------------------------------------------------
// Helper utilities
// ---------------------------------------------------------------------------

/** Clamp a number between a minimum and maximum value. */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Format a dollar amount with commas and two decimals. */
function fmtUSD(amount: number): string {
  return `$${Math.abs(amount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ---------------------------------------------------------------------------
// 1. predictBudgetOverrun
// ---------------------------------------------------------------------------

/**
 * Predict whether a project will exceed its budget based on the current
 * actual cost and completion percentage.
 *
 * Uses a simple Estimate at Completion (EAC) extrapolation:
 *   `predictedFinalCost = actualCost + (actualCost / completionPct) * (1 - completionPct)`
 *
 * Risk thresholds (based on absolute variance %):
 * - low:      < 5 %
 * - medium:   5 – 10 %
 * - high:     10 – 20 %
 * - critical: > 20 %
 */
export function predictBudgetOverrun(
  project: BudgetOverrunInput
): BudgetOverrunResult {
  const { budget, actualCost, completionPct } = project;

  const safePct = Math.max(completionPct, 0.01);
  const predictedFinalCost =
    actualCost + (actualCost / safePct) * (1 - safePct);
  const variance = predictedFinalCost - budget;
  const variancePct = budget !== 0 ? (variance / budget) * 100 : 0;

  const absVariancePct = Math.abs(variancePct);
  let risk: BudgetOverrunResult["risk"];
  if (absVariancePct < 5) {
    risk = "low";
  } else if (absVariancePct < 10) {
    risk = "medium";
  } else if (absVariancePct < 20) {
    risk = "high";
  } else {
    risk = "critical";
  }

  return {
    predictedFinalCost: Math.round(predictedFinalCost * 100) / 100,
    variance: Math.round(variance * 100) / 100,
    variancePct: Math.round(variancePct * 100) / 100,
    risk,
  };
}

// ---------------------------------------------------------------------------
// 2. forecastCashFlow
// ---------------------------------------------------------------------------

/**
 * Produce a 30 / 60 / 90-day cash-flow forecast based on AR & AP aging
 * buckets and a monthly burn rate.
 *
 * Collection-rate assumptions for AR:
 * - Current  : 95 %
 * - 30 days  : 85 %
 * - 60 days  : 70 %
 * - 90+ days : 50 %
 *
 * Payment-rate assumptions for AP:
 * - Current  : 100 %
 * - 30 days  : 95 %
 * - 60 days  : 90 %
 * - 90+ days : 80 %
 */
export function forecastCashFlow(
  params: CashFlowForecastInput
): CashFlowPeriod[] {
  const { currentCash, arAging, apAging, monthlyBurnRate } = params;

  // Collection rates (AR — money coming in)
  const arRates = { current: 0.95, days30: 0.85, days60: 0.70, days90plus: 0.50 };
  // Payment rates (AP — money going out)
  const apRates = { current: 1.00, days30: 0.95, days60: 0.90, days90plus: 0.80 };

  // Each period defines what portion of each aging bucket is expected to be
  // collected / paid within that cumulative horizon. The approach is
  // incremental: "30 Days" gets the first tranche, "60 Days" picks up more,
  // and "90 Days" picks up the remainder allowed by the collection rates.

  // --- 30-Day collections & payments ---
  const collections30 =
    arAging.current * arRates.current +
    arAging.days30 * arRates.days30 * 0.5; // half of 30-day bucket collected within 30 days

  const payments30 =
    apAging.current * apRates.current +
    apAging.days30 * apRates.days30 * 0.5;

  // --- 60-Day collections & payments (incremental from 30-day) ---
  const collections60 =
    arAging.days30 * arRates.days30 * 0.5 + // remainder of 30-day bucket
    arAging.days60 * arRates.days60 * 0.5;

  const payments60 =
    apAging.days30 * apRates.days30 * 0.5 +
    apAging.days60 * apRates.days60 * 0.5;

  // --- 90-Day collections & payments (incremental from 60-day) ---
  const collections90 =
    arAging.days60 * arRates.days60 * 0.5 +
    arAging.days90plus * arRates.days90plus;

  const payments90 =
    apAging.days60 * apRates.days60 * 0.5 +
    apAging.days90plus * apRates.days90plus;

  // Build cumulative forecast
  const periods: CashFlowPeriod[] = [];
  let runningCash = currentCash;

  const increments: {
    label: string;
    collections: number;
    payments: number;
    months: number;
  }[] = [
    { label: "30 Days", collections: collections30, payments: payments30, months: 1 },
    { label: "60 Days", collections: collections60, payments: payments60, months: 1 },
    { label: "90 Days", collections: collections90, payments: payments90, months: 1 },
  ];

  for (const inc of increments) {
    const burnForPeriod = monthlyBurnRate * inc.months;
    const netChange = inc.collections - inc.payments - burnForPeriod;
    runningCash += netChange;

    periods.push({
      period: inc.label,
      projectedCash: Math.round(runningCash * 100) / 100,
      expectedCollections: Math.round(inc.collections * 100) / 100,
      expectedPayments: Math.round(inc.payments * 100) / 100,
      netChange: Math.round(netChange * 100) / 100,
    });
  }

  return periods;
}

// ---------------------------------------------------------------------------
// 3. calculateSafetyRiskScore
// ---------------------------------------------------------------------------

/**
 * Compute a safety risk score from 0 – 100 (higher = riskier).
 *
 * Weighted components:
 * - Incident rate per project : 30 %
 * - Severity ratio            : 25 %
 * - Inspection score (inverse): 20 %
 * - Certification gaps        : 15 %
 * - Recency of last incident  : 10 %
 *
 * Level thresholds:
 * - low:      0 – 25
 * - medium:  26 – 50
 * - high:    51 – 75
 * - critical: 76 – 100
 */
export function calculateSafetyRiskScore(
  params: SafetyRiskInput
): SafetyRiskResult {
  const {
    incidentCount,
    severeIncidentCount,
    avgInspectionScore,
    certGapCount,
    daysSinceLastIncident,
    projectCount,
  } = params;

  const safeProjectCount = Math.max(projectCount, 1);

  // --- Incident rate per project (0–100, capped) ---
  // 0 incidents → 0 risk, >=3 incidents/project → 100 risk
  const incidentRate = incidentCount / safeProjectCount;
  const incidentRateScore = clamp((incidentRate / 3) * 100, 0, 100);

  // --- Severity ratio (0–100) ---
  const severityRatio =
    incidentCount > 0 ? severeIncidentCount / incidentCount : 0;
  const severityScore = clamp(severityRatio * 100, 0, 100);

  // --- Inspection score inverse (0–100) ---
  // avgInspectionScore assumed 0–100 where 100 = perfect. Invert for risk.
  const inspectionRiskScore = clamp(100 - avgInspectionScore, 0, 100);

  // --- Certification gaps (0–100, capped at 10 gaps → 100) ---
  const certGapScore = clamp((certGapCount / 10) * 100, 0, 100);

  // --- Recency (0–100) — more recent incident → higher risk ---
  // 0 days ago → 100 risk, >=365 days → 0 risk
  let recencyScore: number;
  if (incidentCount === 0) {
    recencyScore = 0; // no incidents at all
  } else {
    recencyScore = clamp(((365 - daysSinceLastIncident) / 365) * 100, 0, 100);
  }

  // --- Weighted sum ---
  const score = clamp(
    Math.round(
      incidentRateScore * 0.3 +
        severityScore * 0.25 +
        inspectionRiskScore * 0.2 +
        certGapScore * 0.15 +
        recencyScore * 0.1
    ),
    0,
    100
  );

  // --- Level ---
  let level: SafetyRiskResult["level"];
  if (score <= 25) {
    level = "low";
  } else if (score <= 50) {
    level = "medium";
  } else if (score <= 75) {
    level = "high";
  } else {
    level = "critical";
  }

  // --- Factors ---
  const factors: SafetyRiskFactor[] = [
    {
      name: "Incident Rate",
      value: Math.round(incidentRateScore * 100) / 100,
      impact:
        incidentRateScore > 60
          ? "High incident frequency relative to project count"
          : incidentRateScore > 30
            ? "Moderate incident frequency"
            : "Incident frequency within acceptable range",
    },
    {
      name: "Severity Ratio",
      value: Math.round(severityScore * 100) / 100,
      impact:
        severityScore > 50
          ? "High proportion of severe incidents"
          : "Severity levels manageable",
    },
    {
      name: "Inspection Scores",
      value: Math.round(inspectionRiskScore * 100) / 100,
      impact:
        inspectionRiskScore > 40
          ? "Below-average inspection results indicate safety gaps"
          : "Inspection scores adequate",
    },
    {
      name: "Certification Gaps",
      value: Math.round(certGapScore * 100) / 100,
      impact:
        certGapCount > 0
          ? `${certGapCount} certification gap(s) need attention`
          : "All certifications current",
    },
    {
      name: "Incident Recency",
      value: Math.round(recencyScore * 100) / 100,
      impact:
        recencyScore > 60
          ? "Recent incident(s) elevate risk profile"
          : "No recent incidents",
    },
  ];

  return { score, level, factors };
}

// ---------------------------------------------------------------------------
// 4. scoreVendorPerformance
// ---------------------------------------------------------------------------

/**
 * Score a vendor's overall performance on a 0–100 scale (higher = better).
 *
 * Weighted components:
 * - On-time delivery  : 30 %
 * - CO frequency (inv): 20 %
 * - Safety (inverse)  : 20 %
 * - Invoice accuracy  : 15 %
 * - Responsiveness     : 15 %
 *
 * Grades: A (90+), B (80–89), C (70–79), D (60–69), F (<60)
 */
export function scoreVendorPerformance(
  params: VendorPerformanceInput
): VendorPerformanceResult {
  const {
    onTimeDeliveryPct,
    changeOrderCount,
    totalContracts,
    safetyIncidents,
    invoiceAccuracyPct,
    avgResponseDays,
  } = params;

  // --- On-time delivery score (direct percentage, capped at 100) ---
  const onTimeScore = clamp(onTimeDeliveryPct, 0, 100);

  // --- Change-order frequency (inverse) ---
  // 0 COs per contract → 100, >=1 CO per contract → 0
  const safeContracts = Math.max(totalContracts, 1);
  const coRate = changeOrderCount / safeContracts;
  const coScore = clamp((1 - coRate) * 100, 0, 100);

  // --- Safety (inverse) ---
  // 0 incidents → 100, >=5 → 0
  const safetyScore = clamp((1 - safetyIncidents / 5) * 100, 0, 100);

  // --- Invoice accuracy (direct percentage) ---
  const accuracyScore = clamp(invoiceAccuracyPct, 0, 100);

  // --- Responsiveness (inverse of avg response days) ---
  // 0 days → 100, >=14 days → 0
  const responsivenessScore = clamp(
    ((14 - avgResponseDays) / 14) * 100,
    0,
    100
  );

  // --- Weighted sum ---
  const score = clamp(
    Math.round(
      onTimeScore * 0.3 +
        coScore * 0.2 +
        safetyScore * 0.2 +
        accuracyScore * 0.15 +
        responsivenessScore * 0.15
    ),
    0,
    100
  );

  // --- Grade ---
  let grade: VendorPerformanceResult["grade"];
  if (score >= 90) {
    grade = "A";
  } else if (score >= 80) {
    grade = "B";
  } else if (score >= 70) {
    grade = "C";
  } else if (score >= 60) {
    grade = "D";
  } else {
    grade = "F";
  }

  // --- Factors ---
  const factors: VendorScoreFactor[] = [
    { name: "On-Time Delivery", score: Math.round(onTimeScore * 100) / 100, weight: 0.3 },
    { name: "Change Order Frequency", score: Math.round(coScore * 100) / 100, weight: 0.2 },
    { name: "Safety Record", score: Math.round(safetyScore * 100) / 100, weight: 0.2 },
    { name: "Invoice Accuracy", score: Math.round(accuracyScore * 100) / 100, weight: 0.15 },
    { name: "Responsiveness", score: Math.round(responsivenessScore * 100) / 100, weight: 0.15 },
  ];

  return { score, grade, factors };
}

// ---------------------------------------------------------------------------
// 5. predictEquipmentFailure
// ---------------------------------------------------------------------------

/**
 * Predict the likelihood of equipment failure and recommend service timing.
 *
 * The probability is derived from:
 * - Age factor: older equipment has higher baseline risk
 * - Usage factor: more hours of use increase wear risk
 * - Maintenance debt: ratio of daysSinceLastService to expectedServiceIntervalDays
 * - Maintenance history: fewer historical services increase risk
 *
 * Risk thresholds on final probability:
 * - low:    < 0.3
 * - medium: 0.3 – 0.6
 * - high:   > 0.6
 */
export function predictEquipmentFailure(
  params: EquipmentFailureInput
): EquipmentFailureResult {
  const {
    ageMonths,
    usageHours,
    maintenanceCount,
    daysSinceLastService,
    expectedServiceIntervalDays,
  } = params;

  // --- Age factor (0–1): 0 months → 0, >=120 months (10 yrs) → 1 ---
  const ageFactor = clamp(ageMonths / 120, 0, 1);

  // --- Usage factor (0–1): 0 hours → 0, >=10000 hours → 1 ---
  const usageFactor = clamp(usageHours / 10000, 0, 1);

  // --- Service overdue ratio (0–2 capped) ---
  const safeInterval = Math.max(expectedServiceIntervalDays, 1);
  const overdueRatio = daysSinceLastService / safeInterval;
  const overdueFactor = clamp(overdueRatio, 0, 2);

  // --- Maintenance history factor ---
  // More maintenance events = lower risk. 0 events → 1.0, >=10 → 0.2
  const maintenanceFactor = clamp(1 - (maintenanceCount / 10) * 0.8, 0.2, 1);

  // --- Combined probability ---
  const rawProbability =
    ageFactor * 0.2 +
    usageFactor * 0.2 +
    (overdueFactor / 2) * 0.35 + // normalise 0–2 to 0–1 then weight
    maintenanceFactor * 0.25;

  const probability = clamp(Math.round(rawProbability * 100) / 100, 0, 1);

  // --- Risk level ---
  let risk: EquipmentFailureResult["risk"];
  if (probability < 0.3) {
    risk = "low";
  } else if (probability <= 0.6) {
    risk = "medium";
  } else {
    risk = "high";
  }

  // --- Days until recommended service ---
  const daysUntilRecommendedService = Math.max(
    Math.round(safeInterval - daysSinceLastService),
    0
  );

  // --- Recommendation ---
  let recommendation: string;
  if (overdueRatio > 1.5) {
    recommendation =
      "Service is critically overdue. Schedule maintenance immediately to avoid unplanned downtime.";
  } else if (overdueRatio > 1) {
    recommendation =
      "Equipment has exceeded its service interval. Schedule maintenance within the next 7 days.";
  } else if (overdueRatio > 0.8) {
    recommendation =
      "Service interval approaching. Plan maintenance within the next 2 weeks.";
  } else if (probability > 0.5) {
    recommendation =
      "Age and usage levels are elevated. Consider an early preventive inspection.";
  } else {
    recommendation =
      "Equipment is within normal operating parameters. Continue routine maintenance schedule.";
  }

  return { risk, probability, recommendation, daysUntilRecommendedService };
}

// ---------------------------------------------------------------------------
// 6. detectAnomalies
// ---------------------------------------------------------------------------

/**
 * Convert raw anomaly data from various domains into a unified list of
 * categorised, severity-ranked alert items.
 *
 * Categories:
 * - financial  : invoices without JEs, budgets over 90 %, unposted JEs
 * - safety     : expiring certifications
 * - project    : overdue RFIs, pending change orders, overdue tasks
 * - equipment  : overdue equipment maintenance
 */
export function detectAnomalies(params: AnomalyDetectionInput): AlertItem[] {
  const alerts: AlertItem[] = [];

  // --- Invoices without journal entries ---
  for (const inv of params.invoicesWithoutJE) {
    alerts.push({
      id: `inv-no-je-${inv.id}`,
      category: "financial",
      severity: inv.total_amount > 50000 ? "critical" : "warning",
      title: `Invoice ${inv.invoice_number} has no journal entry`,
      description: `Invoice ${inv.invoice_number} (${fmtUSD(inv.total_amount)}) is not backed by a journal entry. This will cause discrepancies in financial statements.`,
      metric: fmtUSD(inv.total_amount),
      actionUrl: `/invoices/${inv.id}`,
    });
  }

  // --- Budgets over 90 % ---
  for (const b of params.budgetsOver90Pct) {
    const severity: AlertItem["severity"] =
      b.pct >= 100 ? "critical" : b.pct >= 95 ? "warning" : "info";
    alerts.push({
      id: `budget-over-${b.projectName.replace(/\s+/g, "-").toLowerCase()}`,
      category: "financial",
      severity,
      title: `${b.projectName} budget at ${b.pct.toFixed(1)}%`,
      description: `Project "${b.projectName}" has spent ${fmtUSD(b.actual)} of its ${fmtUSD(b.budgeted)} budget (${b.pct.toFixed(1)}%).`,
      metric: `${b.pct.toFixed(1)}%`,
    });
  }

  // --- Unposted journal entries ---
  for (const je of params.unpostedJEs) {
    const severity: AlertItem["severity"] =
      je.daysInDraft > 30 ? "critical" : "warning";
    alerts.push({
      id: `unposted-je-${je.id}`,
      category: "financial",
      severity,
      title: `Journal entry ${je.entry_number} is unposted`,
      description: `JE ${je.entry_number} dated ${je.entry_date} has been in draft for ${je.daysInDraft} days.`,
      metric: `${je.daysInDraft} days in draft`,
      actionUrl: `/journal-entries/${je.id}`,
    });
  }

  // --- Expiring certifications ---
  for (const cert of params.expiringCerts) {
    const expiresDate = new Date(cert.expiresAt);
    const now = new Date();
    const daysUntilExpiry = Math.ceil(
      (expiresDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    const severity: AlertItem["severity"] =
      daysUntilExpiry <= 0
        ? "critical"
        : daysUntilExpiry <= 14
          ? "warning"
          : "info";
    alerts.push({
      id: `cert-expiring-${cert.personName.replace(/\s+/g, "-").toLowerCase()}-${cert.certName.replace(/\s+/g, "-").toLowerCase()}`,
      category: "safety",
      severity,
      title: `${cert.personName}'s ${cert.certName} ${daysUntilExpiry <= 0 ? "has expired" : "expiring soon"}`,
      description:
        daysUntilExpiry <= 0
          ? `${cert.personName}'s ${cert.certName} certification expired on ${cert.expiresAt}. Immediate action required.`
          : `${cert.personName}'s ${cert.certName} certification expires on ${cert.expiresAt} (${daysUntilExpiry} day${daysUntilExpiry === 1 ? "" : "s"} remaining).`,
      metric: `${daysUntilExpiry} days`,
    });
  }

  // --- Overdue RFIs ---
  for (const rfi of params.overdueRFIs) {
    const severity: AlertItem["severity"] =
      rfi.daysPending > 30
        ? "critical"
        : rfi.daysPending > 14
          ? "warning"
          : "info";
    alerts.push({
      id: `overdue-rfi-${rfi.id}`,
      category: "project",
      severity,
      title: `RFI ${rfi.rfi_number} pending ${rfi.daysPending} days`,
      description: `RFI ${rfi.rfi_number} "${rfi.subject}" has been pending for ${rfi.daysPending} days without response.`,
      metric: `${rfi.daysPending} days`,
      actionUrl: `/rfis/${rfi.id}`,
    });
  }

  // --- Pending change orders ---
  for (const co of params.pendingCOs) {
    const severity: AlertItem["severity"] =
      co.daysPending > 30 || co.amount > 100000
        ? "critical"
        : co.daysPending > 14
          ? "warning"
          : "info";
    alerts.push({
      id: `pending-co-${co.id}`,
      category: "project",
      severity,
      title: `Change order ${co.co_number} pending approval`,
      description: `CO ${co.co_number} (${fmtUSD(co.amount)}) has been pending for ${co.daysPending} days.`,
      metric: fmtUSD(co.amount),
      actionUrl: `/change-orders/${co.id}`,
    });
  }

  // --- Overdue equipment maintenance ---
  for (const eq of params.overdueEquipment) {
    const severity: AlertItem["severity"] =
      eq.daysPastDue > 30
        ? "critical"
        : eq.daysPastDue > 7
          ? "warning"
          : "info";
    alerts.push({
      id: `overdue-equip-${eq.id}`,
      category: "equipment",
      severity,
      title: `${eq.name} maintenance overdue`,
      description: `${eq.name} is ${eq.daysPastDue} day${eq.daysPastDue === 1 ? "" : "s"} past its scheduled maintenance date.`,
      metric: `${eq.daysPastDue} days overdue`,
      actionUrl: `/equipment/${eq.id}`,
    });
  }

  // --- Overdue tasks ---
  for (const task of params.overdueTasks) {
    const severity: AlertItem["severity"] =
      task.daysOverdue > 14
        ? "critical"
        : task.daysOverdue > 7
          ? "warning"
          : "info";
    alerts.push({
      id: `overdue-task-${task.id}`,
      category: "project",
      severity,
      title: `Task "${task.taskName}" overdue by ${task.daysOverdue} days`,
      description: `Task "${task.taskName}" on project "${task.projectName}" is ${task.daysOverdue} day${task.daysOverdue === 1 ? "" : "s"} past its due date.`,
      metric: `${task.daysOverdue} days overdue`,
    });
  }

  // Sort by severity: critical first, then warning, then info
  const severityOrder: Record<AlertItem["severity"], number> = {
    critical: 0,
    warning: 1,
    info: 2,
  };
  alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return alerts;
}

// ---------------------------------------------------------------------------
// 7. calculateBidWinProbability
// ---------------------------------------------------------------------------

/**
 * Estimate the probability of winning a bid.
 *
 * Algorithm:
 * 1. Start with the historical win rate as the base probability.
 * 2. Adjust for bid margin (bid / estimated cost ratio):
 *    - A very tight margin (< 1.05) gives a positive boost.
 *    - A wide margin (> 1.25) penalises the probability.
 * 3. Adjust for competition: each additional competitor reduces probability.
 * 4. Adjust for relationship score (0–100): strong relationships boost probability.
 *
 * Confidence is based on the amount of historical data implied by the
 * win-rate precision and relationship score availability.
 */
export function calculateBidWinProbability(
  params: BidWinProbabilityInput
): BidWinProbabilityResult {
  const {
    bidAmount,
    estimatedCost,
    historicalWinRate,
    competitorCount,
    relationshipScore,
  } = params;

  const safeCost = Math.max(estimatedCost, 1);
  const margin = bidAmount / safeCost;

  // --- Base probability ---
  let probability = clamp(historicalWinRate, 0, 1);

  // --- Margin adjustment ---
  // Ideal margin zone: 1.05 – 1.15 (5 % – 15 % markup).
  // Below 1.05: aggressive pricing, small boost.
  // Above 1.25: expensive, significant penalty.
  let marginImpact: number;
  if (margin < 1.05) {
    marginImpact = 0.08; // aggressive pricing boost
  } else if (margin <= 1.15) {
    marginImpact = 0.05; // sweet-spot pricing
  } else if (margin <= 1.25) {
    marginImpact = -0.05; // slightly expensive
  } else {
    marginImpact = -0.15; // significantly expensive
  }
  probability += marginImpact;

  // --- Competition adjustment ---
  // Each competitor beyond 1 reduces probability by ~5 %, capped at -0.3
  const competitionPenalty = clamp((competitorCount - 1) * 0.05, 0, 0.3);
  probability -= competitionPenalty;

  // --- Relationship adjustment ---
  // relationshipScore 0–100 → 0–0.1 boost
  const relationshipBoost = (clamp(relationshipScore, 0, 100) / 100) * 0.1;
  probability += relationshipBoost;

  // --- Clamp final probability ---
  probability = clamp(Math.round(probability * 100) / 100, 0.01, 0.99);

  // --- Confidence ---
  // Higher historical win-rate data quality + strong relationship = higher confidence
  let confidence: BidWinProbabilityResult["confidence"];
  if (historicalWinRate > 0 && relationshipScore >= 50 && competitorCount <= 5) {
    confidence = "high";
  } else if (historicalWinRate > 0 || relationshipScore >= 30) {
    confidence = "medium";
  } else {
    confidence = "low";
  }

  // --- Factors ---
  const factors: BidProbabilityFactor[] = [
    {
      name: "Bid Margin",
      impact: Math.round(marginImpact * 100) / 100,
    },
    {
      name: "Competition",
      impact: Math.round(-competitionPenalty * 100) / 100,
    },
    {
      name: "Relationship",
      impact: Math.round(relationshipBoost * 100) / 100,
    },
    {
      name: "Historical Win Rate",
      impact: Math.round(historicalWinRate * 100) / 100,
    },
  ];

  return { probability, confidence, factors };
}

// ---------------------------------------------------------------------------
// 8. analyzeChangeOrderImpact
// ---------------------------------------------------------------------------

/**
 * Analyse the budget, schedule, and margin impact of a proposed change order.
 *
 * Returns a comprehensive breakdown of how the CO affects the project and
 * generates a text recommendation based on cumulative CO percentage.
 */
export function analyzeChangeOrderImpact(
  params: ChangeOrderImpactInput
): ChangeOrderImpactResult {
  const {
    coAmount,
    currentBudget,
    currentActualCost,
    completionPct,
    scheduleImpactDays,
    originalContractValue,
    totalCOsToDate,
  } = params;

  // --- Budget impact ---
  const newBudget = currentBudget + coAmount;
  const safePct = Math.max(completionPct, 0.01);
  const projectedFinalCost =
    currentActualCost +
    (currentActualCost / safePct) * (1 - safePct) +
    coAmount;
  const newVariance = projectedFinalCost - newBudget;
  const newVariancePct =
    newBudget !== 0 ? (newVariance / newBudget) * 100 : 0;

  // --- Schedule impact ---
  const newEndDateDelta = scheduleImpactDays;
  // Critical path is affected if the schedule pushes out by more than 5 days
  // or if the project is more than 50 % complete (late-stage changes ripple)
  const criticalPathAffected =
    scheduleImpactDays > 5 || (scheduleImpactDays > 0 && completionPct > 0.5);

  // --- Margin impact ---
  const currentMargin =
    currentBudget !== 0
      ? ((currentBudget - currentActualCost) / currentBudget) * 100
      : 0;
  const projectedMargin =
    newBudget !== 0 ? ((newBudget - projectedFinalCost) / newBudget) * 100 : 0;
  const marginChange = projectedMargin - currentMargin;

  // --- Cumulative CO percentage ---
  const safeOriginal = Math.max(originalContractValue, 1);
  const cumulativeCOPct =
    ((totalCOsToDate + coAmount) / safeOriginal) * 100;

  // --- Recommendation ---
  let recommendation: string;
  if (cumulativeCOPct > 25) {
    recommendation =
      "Cumulative change orders exceed 25% of the original contract value. " +
      "This level of scope change warrants a comprehensive project re-baseline " +
      "and stakeholder review. Consider negotiating a contract amendment.";
  } else if (cumulativeCOPct > 15) {
    recommendation =
      "Cumulative change orders are between 15-25% of contract value. " +
      "Monitor scope creep closely and ensure adequate contingency reserves remain. " +
      "Discuss trend with the project owner.";
  } else if (cumulativeCOPct > 10) {
    recommendation =
      "Cumulative change orders are approaching 10-15% of contract value. " +
      "Review change order causes to identify any systemic issues in the " +
      "original scope or design documents.";
  } else if (scheduleImpactDays > 14) {
    recommendation =
      "While the cost impact is manageable, the schedule delay of " +
      `${scheduleImpactDays} days is significant. Evaluate acceleration options ` +
      "and update the critical path analysis.";
  } else {
    recommendation =
      "This change order is within acceptable parameters. Proceed with standard " +
      "approval workflow and update the project budget accordingly.";
  }

  return {
    budgetImpact: {
      newBudget: Math.round(newBudget * 100) / 100,
      newVariance: Math.round(newVariance * 100) / 100,
      newVariancePct: Math.round(newVariancePct * 100) / 100,
    },
    scheduleImpact: {
      newEndDateDelta,
      criticalPathAffected,
    },
    marginImpact: {
      currentMargin: Math.round(currentMargin * 100) / 100,
      projectedMargin: Math.round(projectedMargin * 100) / 100,
      marginChange: Math.round(marginChange * 100) / 100,
    },
    cumulativeCOPct: Math.round(cumulativeCOPct * 100) / 100,
    recommendation,
  };
}
