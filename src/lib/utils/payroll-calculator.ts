/**
 * Payroll Calculator — Comprehensive federal/state tax engine for Buildwrk
 *
 * Supports:
 *  - 2025 federal income tax brackets (Single, MFJ, HoH)
 *  - State income tax for CA, NY, IL, PA, no-income-tax states, and configurable flat rates
 *  - FICA (Social Security + Medicare + Additional Medicare)
 *  - FUTA / SUTA employer taxes
 *  - Pre-tax and post-tax deductions
 *  - Hourly + salaried employees with overtime
 *  - YTD wage-base tracking for SS/FUTA/SUTA caps
 */

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface PayrollTaxConfig {
  social_security_rate: number;           // e.g. 0.062
  social_security_wage_base: number;      // e.g. 168600
  medicare_rate: number;                  // e.g. 0.0145
  additional_medicare_rate: number;       // e.g. 0.009
  additional_medicare_threshold: number;  // e.g. 200000
  futa_rate: number;                      // e.g. 0.006 (after 5.4% credit)
  futa_wage_base: number;                 // e.g. 7000
  state_unemployment_rate: number;        // company-specific SUTA rate
  state_unemployment_wage_base: number;   // state-specific SUTA wage base
  state_code: string;                     // default state for employees without one
}

export interface EmployeePayInfo {
  user_id: string;
  pay_type: "hourly" | "salary";
  hourly_rate: number;
  overtime_rate: number;
  salary_amount: number;                  // per-period salary
  filing_status: string;                  // "single" | "married" | "head_of_household"
  federal_allowances: number;
  state_code: string;                     // two-letter state abbreviation
}

export interface EmployeeDeduction {
  deduction_type: string;                 // e.g. "401k", "health_insurance", "union_dues"
  label: string;                          // display label
  amount: number;                         // dollar amount or percentage (0-100)
  is_percentage: boolean;                 // true = percentage of gross, false = flat dollar
  is_pretax: boolean;                     // pre-tax reduces taxable income for federal/state
}

export interface TimeEntryGroup {
  user_id: string;
  regular_hours: number;
  overtime_hours: number;
  time_entry_ids: string[];
}

export interface PayrollItemCalc {
  user_id: string;
  regular_hours: number;
  overtime_hours: number;
  hourly_rate: number;
  overtime_rate: number;
  gross_pay: number;
  federal_income_tax: number;
  state_income_tax: number;
  social_security_employee: number;
  medicare_employee: number;
  social_security_employer: number;
  medicare_employer: number;
  futa_employer: number;
  suta_employer: number;
  pretax_deductions: number;
  posttax_deductions: number;
  total_employee_deductions: number;
  total_employer_taxes: number;
  net_pay: number;
  ytd_gross: number;
  deduction_details: { label: string; amount: number; is_pretax: boolean }[];
  time_entry_ids: string[];
}

// ---------------------------------------------------------------------------
// Tax bracket type
// ---------------------------------------------------------------------------

interface TaxBracket {
  min: number;
  max: number;       // Infinity for the top bracket
  rate: number;
}

// ---------------------------------------------------------------------------
// 2025 Federal Income Tax Brackets
// ---------------------------------------------------------------------------

const FEDERAL_BRACKETS: Record<string, TaxBracket[]> = {
  single: [
    { min: 0,       max: 11925,   rate: 0.10 },
    { min: 11925,   max: 48475,   rate: 0.12 },
    { min: 48475,   max: 103350,  rate: 0.22 },
    { min: 103350,  max: 197300,  rate: 0.24 },
    { min: 197300,  max: 250525,  rate: 0.32 },
    { min: 250525,  max: 626350,  rate: 0.35 },
    { min: 626350,  max: Infinity, rate: 0.37 },
  ],
  married: [
    { min: 0,       max: 23850,   rate: 0.10 },
    { min: 23850,   max: 96950,   rate: 0.12 },
    { min: 96950,   max: 206700,  rate: 0.22 },
    { min: 206700,  max: 394600,  rate: 0.24 },
    { min: 394600,  max: 501050,  rate: 0.32 },
    { min: 501050,  max: 751600,  rate: 0.35 },
    { min: 751600,  max: Infinity, rate: 0.37 },
  ],
  head_of_household: [
    { min: 0,       max: 17000,   rate: 0.10 },
    { min: 17000,   max: 64850,   rate: 0.12 },
    { min: 64850,   max: 103350,  rate: 0.22 },
    { min: 103350,  max: 197300,  rate: 0.24 },
    { min: 197300,  max: 250500,  rate: 0.32 },
    { min: 250500,  max: 626350,  rate: 0.35 },
    { min: 626350,  max: Infinity, rate: 0.37 },
  ],
};

const FEDERAL_STANDARD_DEDUCTION: Record<string, number> = {
  single: 15000,
  married: 30000,
  head_of_household: 22500,
};

// Per-allowance withholding reduction (approximate IRS value for 2025)
const ALLOWANCE_VALUE = 4400;

// ---------------------------------------------------------------------------
// State Income Tax Brackets (2025 approximations)
// ---------------------------------------------------------------------------

const NO_INCOME_TAX_STATES = new Set([
  "TX", "FL", "NV", "WA", "WY", "SD", "NH", "TN", "AK",
]);

// California 2025 brackets (single filer — simplified; MFJ doubles thresholds)
const CA_BRACKETS: TaxBracket[] = [
  { min: 0,       max: 10412,   rate: 0.01 },
  { min: 10412,   max: 24684,   rate: 0.02 },
  { min: 24684,   max: 38959,   rate: 0.04 },
  { min: 38959,   max: 54081,   rate: 0.06 },
  { min: 54081,   max: 68350,   rate: 0.08 },
  { min: 68350,   max: 349137,  rate: 0.093 },
  { min: 349137,  max: 418961,  rate: 0.103 },
  { min: 418961,  max: 698271,  rate: 0.113 },
  { min: 698271,  max: Infinity, rate: 0.123 },
];

// California standard deduction (single)
const CA_STANDARD_DEDUCTION = 5540;

// New York 2025 brackets (single filer)
const NY_BRACKETS: TaxBracket[] = [
  { min: 0,       max: 8500,    rate: 0.04 },
  { min: 8500,    max: 11700,   rate: 0.045 },
  { min: 11700,   max: 13900,   rate: 0.0525 },
  { min: 13900,   max: 80650,   rate: 0.055 },
  { min: 80650,   max: 215400,  rate: 0.06 },
  { min: 215400,  max: 1077550, rate: 0.0685 },
  { min: 1077550, max: 5000000, rate: 0.0965 },
  { min: 5000000, max: 25000000, rate: 0.103 },
  { min: 25000000, max: Infinity, rate: 0.109 },
];

// New York standard deduction (single)
const NY_STANDARD_DEDUCTION = 8000;

// Flat-rate states
const FLAT_RATE_STATES: Record<string, number> = {
  IL: 0.0495,
  PA: 0.0307,
  CO: 0.044,
  MI: 0.0425,
  IN: 0.0305,
  NC: 0.0475,
  UT: 0.0485,
  MA: 0.05,
  AZ: 0.025,
  KY: 0.04,
};

// ---------------------------------------------------------------------------
// Default 2025 Tax Config
// ---------------------------------------------------------------------------

export const DEFAULT_2025_TAX_CONFIG: PayrollTaxConfig = {
  social_security_rate: 0.062,
  social_security_wage_base: 168600,
  medicare_rate: 0.0145,
  additional_medicare_rate: 0.009,
  additional_medicare_threshold: 200000,
  futa_rate: 0.006,
  futa_wage_base: 7000,
  state_unemployment_rate: 0.027,      // typical new-employer rate
  state_unemployment_wage_base: 9000,  // varies by state
  state_code: "TX",
};

// ---------------------------------------------------------------------------
// Helper: apply progressive brackets
// ---------------------------------------------------------------------------

function applyBrackets(taxableIncome: number, brackets: TaxBracket[]): number {
  if (taxableIncome <= 0) return 0;

  let tax = 0;
  for (const bracket of brackets) {
    if (taxableIncome <= bracket.min) break;
    const taxableInBracket = Math.min(taxableIncome, bracket.max) - bracket.min;
    tax += taxableInBracket * bracket.rate;
  }
  return tax;
}

// ---------------------------------------------------------------------------
// Helper: round to cents
// ---------------------------------------------------------------------------

function roundCents(value: number): number {
  return Math.round(value * 100) / 100;
}

// ---------------------------------------------------------------------------
// Helper: normalize filing status to internal key
// ---------------------------------------------------------------------------

function normalizeFilingStatus(status: string): string {
  const s = status.toLowerCase().replace(/[\s_-]+/g, "_");
  if (s.includes("married") || s === "mfj") return "married";
  if (s.includes("head") || s === "hoh") return "head_of_household";
  return "single";
}

// ---------------------------------------------------------------------------
// Federal Income Tax
// ---------------------------------------------------------------------------

/**
 * Calculate annual federal income tax for a given annualized taxable income
 * and filing status. Applies the 2025 standard deduction and progressive brackets.
 *
 * @param annualizedIncome - Total annualized income AFTER pre-tax deductions
 * @param filingStatus - "single", "married", "head_of_household" (or variants)
 * @returns Annual federal income tax amount
 */
export function calculateFederalIncomeTax(
  annualizedIncome: number,
  filingStatus: string,
): number {
  const status = normalizeFilingStatus(filingStatus);
  const brackets = FEDERAL_BRACKETS[status] ?? FEDERAL_BRACKETS.single;
  const standardDeduction = FEDERAL_STANDARD_DEDUCTION[status] ?? FEDERAL_STANDARD_DEDUCTION.single;

  const taxableIncome = Math.max(0, annualizedIncome - standardDeduction);
  return roundCents(applyBrackets(taxableIncome, brackets));
}

/**
 * Calculate annual federal income tax with allowances.
 * Each allowance reduces taxable income by ALLOWANCE_VALUE.
 */
export function calculateFederalIncomeTaxWithAllowances(
  annualizedIncome: number,
  filingStatus: string,
  allowances: number,
): number {
  const status = normalizeFilingStatus(filingStatus);
  const brackets = FEDERAL_BRACKETS[status] ?? FEDERAL_BRACKETS.single;
  const standardDeduction = FEDERAL_STANDARD_DEDUCTION[status] ?? FEDERAL_STANDARD_DEDUCTION.single;

  const totalDeduction = standardDeduction + (allowances * ALLOWANCE_VALUE);
  const taxableIncome = Math.max(0, annualizedIncome - totalDeduction);
  return roundCents(applyBrackets(taxableIncome, brackets));
}

// ---------------------------------------------------------------------------
// State Income Tax
// ---------------------------------------------------------------------------

/**
 * Calculate annual state income tax for a given annualized taxable income
 * and state code. Supports progressive brackets (CA, NY), flat rates
 * (IL, PA, CO, MI, IN, NC, UT, MA, AZ, KY), no-income-tax states, and
 * a configurable fallback.
 *
 * @param annualizedIncome - Total annualized income AFTER pre-tax deductions
 * @param stateCode - Two-letter state abbreviation (e.g. "CA", "TX")
 * @param customRate - Optional flat rate for states not built in (e.g. 0.05 for 5%)
 * @returns Annual state income tax amount
 */
export function calculateStateIncomeTax(
  annualizedIncome: number,
  stateCode: string,
  customRate?: number,
): number {
  const code = stateCode.toUpperCase().trim();

  // No income tax states
  if (NO_INCOME_TAX_STATES.has(code)) return 0;

  // California — progressive
  if (code === "CA") {
    const taxable = Math.max(0, annualizedIncome - CA_STANDARD_DEDUCTION);
    return roundCents(applyBrackets(taxable, CA_BRACKETS));
  }

  // New York — progressive
  if (code === "NY") {
    const taxable = Math.max(0, annualizedIncome - NY_STANDARD_DEDUCTION);
    return roundCents(applyBrackets(taxable, NY_BRACKETS));
  }

  // Built-in flat rate states
  if (FLAT_RATE_STATES[code] !== undefined) {
    return roundCents(Math.max(0, annualizedIncome) * FLAT_RATE_STATES[code]);
  }

  // Custom/configurable flat rate
  if (customRate !== undefined && customRate > 0) {
    return roundCents(Math.max(0, annualizedIncome) * customRate);
  }

  // Unknown state with no custom rate — return 0 and let caller handle
  return 0;
}

// ---------------------------------------------------------------------------
// FICA Calculations
// ---------------------------------------------------------------------------

export interface FicaResult {
  social_security_employee: number;
  social_security_employer: number;
  medicare_employee: number;
  medicare_employer: number;
}

/**
 * Calculate FICA taxes for a single pay period, respecting YTD wage-base caps.
 *
 * Social Security stops at the wage base. Medicare has no cap, but Additional
 * Medicare Tax (0.9%) kicks in above $200,000 (employee only).
 *
 * @param currentGross - Gross pay for this period (FICA taxable — NOT reduced by pre-tax deductions)
 * @param ytdGross - Year-to-date gross BEFORE this period
 * @param config - Tax configuration with rates and thresholds
 */
export function calculateFICA(
  currentGross: number,
  ytdGross: number,
  config: PayrollTaxConfig,
): FicaResult {
  // --- Social Security ---
  const ssWageBase = config.social_security_wage_base;
  const ssRate = config.social_security_rate;

  let ssTaxableWages = 0;
  if (ytdGross < ssWageBase) {
    // How much room is left under the cap
    const remaining = ssWageBase - ytdGross;
    ssTaxableWages = Math.min(currentGross, remaining);
  }

  const ssEmployee = roundCents(ssTaxableWages * ssRate);
  const ssEmployer = roundCents(ssTaxableWages * ssRate);

  // --- Medicare ---
  const medicareRate = config.medicare_rate;
  const medicareEmployee = roundCents(currentGross * medicareRate);
  const medicareEmployer = roundCents(currentGross * medicareRate);

  // --- Additional Medicare Tax (employee only, over threshold) ---
  const additionalThreshold = config.additional_medicare_threshold;
  const additionalRate = config.additional_medicare_rate;

  let additionalMedicare = 0;
  const totalYtd = ytdGross + currentGross;
  if (totalYtd > additionalThreshold) {
    // The portion of currentGross that pushes total compensation above the threshold.
    // If YTD was already over, all of currentGross is subject.
    // If YTD was under, only the portion above the threshold is subject.
    const subjectWages = Math.max(
      0,
      Math.min(currentGross, totalYtd - additionalThreshold),
    );
    additionalMedicare = roundCents(subjectWages * additionalRate);
  }

  return {
    social_security_employee: ssEmployee,
    social_security_employer: ssEmployer,
    medicare_employee: roundCents(medicareEmployee + additionalMedicare),
    medicare_employer: medicareEmployer,  // employer does NOT pay additional Medicare
  };
}

// ---------------------------------------------------------------------------
// FUTA / SUTA
// ---------------------------------------------------------------------------

/**
 * Calculate employer FUTA tax for a period, respecting YTD wage-base cap.
 */
export function calculateFUTA(
  currentGross: number,
  ytdGross: number,
  futaRate: number,
  futaWageBase: number,
): number {
  if (ytdGross >= futaWageBase) return 0;

  const remaining = futaWageBase - ytdGross;
  const taxableWages = Math.min(currentGross, remaining);
  return roundCents(taxableWages * futaRate);
}

/**
 * Calculate employer SUTA tax for a period, respecting YTD wage-base cap.
 */
export function calculateSUTA(
  currentGross: number,
  ytdGross: number,
  sutaRate: number,
  sutaWageBase: number,
): number {
  if (ytdGross >= sutaWageBase) return 0;

  const remaining = sutaWageBase - ytdGross;
  const taxableWages = Math.min(currentGross, remaining);
  return roundCents(taxableWages * sutaRate);
}

// ---------------------------------------------------------------------------
// Deductions
// ---------------------------------------------------------------------------

interface DeductionResult {
  pretax_total: number;
  posttax_total: number;
  details: { label: string; amount: number; is_pretax: boolean }[];
}

/**
 * Compute all deductions for an employee based on their gross pay.
 * Percentage-based deductions are computed as (amount / 100) * grossPay.
 */
function computeDeductions(
  grossPay: number,
  deductions: EmployeeDeduction[],
): DeductionResult {
  let pretaxTotal = 0;
  let posttaxTotal = 0;
  const details: { label: string; amount: number; is_pretax: boolean }[] = [];

  for (const d of deductions) {
    const deductionAmount = d.is_percentage
      ? roundCents((d.amount / 100) * grossPay)
      : roundCents(d.amount);

    if (d.is_pretax) {
      pretaxTotal += deductionAmount;
    } else {
      posttaxTotal += deductionAmount;
    }

    details.push({
      label: d.label,
      amount: deductionAmount,
      is_pretax: d.is_pretax,
    });
  }

  return {
    pretax_total: roundCents(pretaxTotal),
    posttax_total: roundCents(posttaxTotal),
    details,
  };
}

// ---------------------------------------------------------------------------
// Gross Pay
// ---------------------------------------------------------------------------

/**
 * Calculate gross pay from hours/rates or salary.
 */
function calculateGrossPay(
  entry: TimeEntryGroup,
  payInfo: EmployeePayInfo,
): { gross: number; hourlyRate: number; overtimeRate: number } {
  if (payInfo.pay_type === "salary") {
    // Salaried employees: salary_amount is their per-period amount.
    // Hours are tracked for record-keeping but don't change pay.
    return {
      gross: roundCents(payInfo.salary_amount),
      hourlyRate: payInfo.hourly_rate || 0,
      overtimeRate: payInfo.overtime_rate || 0,
    };
  }

  // Hourly employees
  const regularPay = entry.regular_hours * payInfo.hourly_rate;
  const overtimePay = entry.overtime_hours * payInfo.overtime_rate;
  return {
    gross: roundCents(regularPay + overtimePay),
    hourlyRate: payInfo.hourly_rate,
    overtimeRate: payInfo.overtime_rate,
  };
}

// ---------------------------------------------------------------------------
// Main Payroll Calculator
// ---------------------------------------------------------------------------

/**
 * Calculate payroll for a batch of employees for a single pay period.
 *
 * This is the primary entry point for the payroll engine. It orchestrates:
 *  1. Gross pay calculation (hours x rates or salary)
 *  2. Pre-tax deduction application
 *  3. Federal income tax (annualized, then pro-rated for the period)
 *  4. State income tax (annualized, then pro-rated for the period)
 *  5. FICA taxes (Social Security with wage-base cap, Medicare, Additional Medicare)
 *  6. Employer FUTA and SUTA (with wage-base caps)
 *  7. Post-tax deduction application
 *  8. Net pay calculation
 *
 * @param entries - Time entry groups per employee for this period
 * @param payRates - Map of user_id -> EmployeePayInfo
 * @param deductions - Map of user_id -> array of deductions
 * @param ytdGross - Map of user_id -> year-to-date gross pay BEFORE this period
 * @param taxConfig - Payroll tax configuration (rates, wage bases, etc.)
 * @param periodsPerYear - Number of pay periods per year (e.g. 26 for biweekly, 52 for weekly)
 * @returns Array of PayrollItemCalc, one per employee
 */
export function calculatePayrollItems(
  entries: TimeEntryGroup[],
  payRates: Map<string, EmployeePayInfo>,
  deductions: Map<string, EmployeeDeduction[]>,
  ytdGross: Map<string, number>,
  taxConfig: PayrollTaxConfig,
  periodsPerYear: number,
): PayrollItemCalc[] {
  const results: PayrollItemCalc[] = [];

  for (const entry of entries) {
    const payInfo = payRates.get(entry.user_id);
    if (!payInfo) {
      // Skip employees without pay rate configuration
      continue;
    }

    // 1. Gross pay
    const { gross, hourlyRate, overtimeRate } = calculateGrossPay(entry, payInfo);

    // 2. Deductions
    const employeeDeductions = deductions.get(entry.user_id) ?? [];
    const deductionResult = computeDeductions(gross, employeeDeductions);

    // 3. Federal income tax
    //    Annualize: (gross - pretax deductions) * periodsPerYear
    //    Pre-tax deductions (401k, health insurance) reduce federal/state taxable income
    //    but NOT FICA taxable income.
    const federalTaxablePerPeriod = Math.max(0, gross - deductionResult.pretax_total);
    const annualizedFederalIncome = federalTaxablePerPeriod * periodsPerYear;

    const annualFederalTax = calculateFederalIncomeTaxWithAllowances(
      annualizedFederalIncome,
      payInfo.filing_status,
      payInfo.federal_allowances,
    );
    const periodFederalTax = roundCents(annualFederalTax / periodsPerYear);

    // 4. State income tax
    const stateCode = payInfo.state_code || taxConfig.state_code;
    const annualizedStateIncome = federalTaxablePerPeriod * periodsPerYear;
    const annualStateTax = calculateStateIncomeTax(annualizedStateIncome, stateCode);
    const periodStateTax = roundCents(annualStateTax / periodsPerYear);

    // 5. FICA
    //    FICA is calculated on gross pay (pre-tax deductions do NOT reduce FICA wages)
    const employeeYtd = ytdGross.get(entry.user_id) ?? 0;
    const fica = calculateFICA(gross, employeeYtd, taxConfig);

    // 6. Employer FUTA & SUTA
    const futa = calculateFUTA(
      gross,
      employeeYtd,
      taxConfig.futa_rate,
      taxConfig.futa_wage_base,
    );
    const suta = calculateSUTA(
      gross,
      employeeYtd,
      taxConfig.state_unemployment_rate,
      taxConfig.state_unemployment_wage_base,
    );

    // 7. Totals
    const totalEmployeeDeductions = roundCents(
      periodFederalTax +
      periodStateTax +
      fica.social_security_employee +
      fica.medicare_employee +
      deductionResult.pretax_total +
      deductionResult.posttax_total
    );

    const totalEmployerTaxes = roundCents(
      fica.social_security_employer +
      fica.medicare_employer +
      futa +
      suta
    );

    // 8. Net pay
    const netPay = roundCents(
      gross -
      periodFederalTax -
      periodStateTax -
      fica.social_security_employee -
      fica.medicare_employee -
      deductionResult.pretax_total -
      deductionResult.posttax_total
    );

    // 9. Updated YTD gross (for informational purposes in the result)
    const updatedYtdGross = roundCents(employeeYtd + gross);

    results.push({
      user_id: entry.user_id,
      regular_hours: entry.regular_hours,
      overtime_hours: entry.overtime_hours,
      hourly_rate: hourlyRate,
      overtime_rate: overtimeRate,
      gross_pay: gross,
      federal_income_tax: periodFederalTax,
      state_income_tax: periodStateTax,
      social_security_employee: fica.social_security_employee,
      medicare_employee: fica.medicare_employee,
      social_security_employer: fica.social_security_employer,
      medicare_employer: fica.medicare_employer,
      futa_employer: futa,
      suta_employer: suta,
      pretax_deductions: deductionResult.pretax_total,
      posttax_deductions: deductionResult.posttax_total,
      total_employee_deductions: totalEmployeeDeductions,
      total_employer_taxes: totalEmployerTaxes,
      net_pay: netPay,
      ytd_gross: updatedYtdGross,
      deduction_details: deductionResult.details,
      time_entry_ids: entry.time_entry_ids,
    });
  }

  return results;
}

// ---------------------------------------------------------------------------
// Summary utilities
// ---------------------------------------------------------------------------

export interface PayrollSummary {
  total_gross: number;
  total_federal_tax: number;
  total_state_tax: number;
  total_social_security_employee: number;
  total_medicare_employee: number;
  total_social_security_employer: number;
  total_medicare_employer: number;
  total_futa: number;
  total_suta: number;
  total_pretax_deductions: number;
  total_posttax_deductions: number;
  total_employee_deductions: number;
  total_employer_taxes: number;
  total_net_pay: number;
  employee_count: number;
}

/**
 * Aggregate all payroll items into a payroll run summary.
 */
export function summarizePayroll(items: PayrollItemCalc[]): PayrollSummary {
  const summary: PayrollSummary = {
    total_gross: 0,
    total_federal_tax: 0,
    total_state_tax: 0,
    total_social_security_employee: 0,
    total_medicare_employee: 0,
    total_social_security_employer: 0,
    total_medicare_employer: 0,
    total_futa: 0,
    total_suta: 0,
    total_pretax_deductions: 0,
    total_posttax_deductions: 0,
    total_employee_deductions: 0,
    total_employer_taxes: 0,
    total_net_pay: 0,
    employee_count: items.length,
  };

  for (const item of items) {
    summary.total_gross += item.gross_pay;
    summary.total_federal_tax += item.federal_income_tax;
    summary.total_state_tax += item.state_income_tax;
    summary.total_social_security_employee += item.social_security_employee;
    summary.total_medicare_employee += item.medicare_employee;
    summary.total_social_security_employer += item.social_security_employer;
    summary.total_medicare_employer += item.medicare_employer;
    summary.total_futa += item.futa_employer;
    summary.total_suta += item.suta_employer;
    summary.total_pretax_deductions += item.pretax_deductions;
    summary.total_posttax_deductions += item.posttax_deductions;
    summary.total_employee_deductions += item.total_employee_deductions;
    summary.total_employer_taxes += item.total_employer_taxes;
    summary.total_net_pay += item.net_pay;
  }

  // Round all summary totals
  for (const key of Object.keys(summary) as (keyof PayrollSummary)[]) {
    if (typeof summary[key] === "number") {
      (summary as unknown as Record<string, number>)[key] = roundCents(summary[key] as number);
    }
  }

  return summary;
}

// ---------------------------------------------------------------------------
// Validation utilities
// ---------------------------------------------------------------------------

export interface PayrollValidationError {
  user_id: string;
  field: string;
  message: string;
}

/**
 * Validate payroll inputs before calculation.
 * Returns an array of validation errors (empty if everything is valid).
 */
export function validatePayrollInputs(
  entries: TimeEntryGroup[],
  payRates: Map<string, EmployeePayInfo>,
): PayrollValidationError[] {
  const errors: PayrollValidationError[] = [];

  for (const entry of entries) {
    const payInfo = payRates.get(entry.user_id);

    if (!payInfo) {
      errors.push({
        user_id: entry.user_id,
        field: "pay_info",
        message: "No pay rate configuration found for employee.",
      });
      continue;
    }

    if (payInfo.pay_type === "hourly") {
      if (payInfo.hourly_rate <= 0) {
        errors.push({
          user_id: entry.user_id,
          field: "hourly_rate",
          message: "Hourly rate must be greater than zero.",
        });
      }
      if (payInfo.overtime_rate <= 0) {
        errors.push({
          user_id: entry.user_id,
          field: "overtime_rate",
          message: "Overtime rate must be greater than zero.",
        });
      }
      if (entry.regular_hours < 0) {
        errors.push({
          user_id: entry.user_id,
          field: "regular_hours",
          message: "Regular hours cannot be negative.",
        });
      }
      if (entry.overtime_hours < 0) {
        errors.push({
          user_id: entry.user_id,
          field: "overtime_hours",
          message: "Overtime hours cannot be negative.",
        });
      }
    }

    if (payInfo.pay_type === "salary" && payInfo.salary_amount <= 0) {
      errors.push({
        user_id: entry.user_id,
        field: "salary_amount",
        message: "Salary amount must be greater than zero.",
      });
    }

    if (!payInfo.filing_status) {
      errors.push({
        user_id: entry.user_id,
        field: "filing_status",
        message: "Filing status is required for tax withholding.",
      });
    }

    if (!payInfo.state_code) {
      errors.push({
        user_id: entry.user_id,
        field: "state_code",
        message: "State code is required for state tax withholding.",
      });
    }
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Annualized salary helper
// ---------------------------------------------------------------------------

/**
 * Estimate the per-period salary amount from an annual salary and pay frequency.
 */
export function annualToPerPeriod(annualSalary: number, periodsPerYear: number): number {
  return roundCents(annualSalary / periodsPerYear);
}

/**
 * Estimate the effective hourly rate from a salary, assuming 2080 work hours per year.
 */
export function salaryToHourlyRate(annualSalary: number, annualHours: number = 2080): number {
  return roundCents(annualSalary / annualHours);
}

/**
 * Calculate standard overtime rate (1.5x base hourly rate).
 */
export function standardOvertimeRate(hourlyRate: number, multiplier: number = 1.5): number {
  return roundCents(hourlyRate * multiplier);
}
