/**
 * Realistic test data for a small construction company — one month of activity.
 *
 * Hand-calculated expected results are documented alongside the data so
 * every assertion in the test suite has a verifiable paper trail.
 */

export const COMPANY_ID = "test-company-001";

// ──────────────────────────────────────────────────────────────────
// Chart of Accounts
// ──────────────────────────────────────────────────────────────────
export const ACCOUNTS = [
  { id: "acct-1000", account_number: "1000", name: "Cash",                   account_type: "asset",     sub_type: "current_asset",       normal_balance: "debit",  is_active: true, company_id: COMPANY_ID },
  { id: "acct-1100", account_number: "1100", name: "Accounts Receivable",    account_type: "asset",     sub_type: "current_asset",       normal_balance: "debit",  is_active: true, company_id: COMPANY_ID },
  { id: "acct-1200", account_number: "1200", name: "Retainage Receivable",   account_type: "asset",     sub_type: "current_asset",       normal_balance: "debit",  is_active: true, company_id: COMPANY_ID },
  { id: "acct-1500", account_number: "1500", name: "Equipment",              account_type: "asset",     sub_type: "fixed_asset",         normal_balance: "debit",  is_active: true, company_id: COMPANY_ID },
  { id: "acct-1510", account_number: "1510", name: "Accumulated Depreciation", account_type: "asset",   sub_type: "contra_asset",        normal_balance: "credit", is_active: true, company_id: COMPANY_ID },
  { id: "acct-2000", account_number: "2000", name: "Accounts Payable",       account_type: "liability", sub_type: "current_liability",   normal_balance: "credit", is_active: true, company_id: COMPANY_ID },
  { id: "acct-2050", account_number: "2050", name: "Sales Tax Payable",      account_type: "liability", sub_type: "current_liability",   normal_balance: "credit", is_active: true, company_id: COMPANY_ID },
  { id: "acct-2100", account_number: "2100", name: "Notes Payable",          account_type: "liability", sub_type: "long_term_liability", normal_balance: "credit", is_active: true, company_id: COMPANY_ID },
  { id: "acct-3000", account_number: "3000", name: "Owner's Equity",         account_type: "equity",    sub_type: null,                  normal_balance: "credit", is_active: true, company_id: COMPANY_ID },
  { id: "acct-4000", account_number: "4000", name: "Construction Revenue",   account_type: "revenue",   sub_type: null,                  normal_balance: "credit", is_active: true, company_id: COMPANY_ID },
  { id: "acct-5100", account_number: "5100", name: "Materials",              account_type: "expense",   sub_type: null,                  normal_balance: "debit",  is_active: true, company_id: COMPANY_ID },
  { id: "acct-5200", account_number: "5200", name: "Subcontractor Costs",    account_type: "expense",   sub_type: null,                  normal_balance: "debit",  is_active: true, company_id: COMPANY_ID },
  { id: "acct-6000", account_number: "6000", name: "Office Rent",            account_type: "expense",   sub_type: null,                  normal_balance: "debit",  is_active: true, company_id: COMPANY_ID },
  { id: "acct-6100", account_number: "6100", name: "Utilities",              account_type: "expense",   sub_type: null,                  normal_balance: "debit",  is_active: true, company_id: COMPANY_ID },
] as const;

// Helper to look up account by id
const acct = (id: string) => {
  const a = ACCOUNTS.find((a) => a.id === id);
  if (!a) throw new Error(`Account ${id} not found`);
  return a;
};

// ──────────────────────────────────────────────────────────────────
// Journal Entries & Lines — January 2026
// ──────────────────────────────────────────────────────────────────

// Opening Balances (excluded from cash flow)
const JE_OB = {
  id: "je-ob-001", entry_number: "MBG-OB-001", entry_date: "2026-01-01",
  description: "Opening Balances", reference: "opening_balance:initial",
  status: "posted", company_id: COMPANY_ID,
};

// Client Invoice #1: $105,000 (subtotal $100k + tax $5k)
const JE_INV1 = {
  id: "je-inv-001", entry_number: "JE-INV-001", entry_date: "2026-01-05",
  description: "Invoice INV-001", reference: "invoice:inv-001",
  status: "posted", company_id: COMPANY_ID,
};

// Vendor Invoice #2: Materials $30,000
const JE_INV2 = {
  id: "je-inv-002", entry_number: "JE-INV-002", entry_date: "2026-01-10",
  description: "Invoice INV-002", reference: "invoice:inv-002",
  status: "posted", company_id: COMPANY_ID,
};

// Vendor Invoice #3: Subcontractor $45,000
const JE_INV3 = {
  id: "je-inv-003", entry_number: "JE-INV-003", entry_date: "2026-01-15",
  description: "Invoice INV-003", reference: "invoice:inv-003",
  status: "posted", company_id: COMPANY_ID,
};

// Client Payment Received $105,000
const JE_PMT1 = {
  id: "je-pmt-001", entry_number: "JE-PMT-001", entry_date: "2026-01-20",
  description: "Payment PMT-001", reference: "payment:pmt-001",
  status: "posted", company_id: COMPANY_ID,
};

// Vendor Payment $30,000
const JE_PMT2 = {
  id: "je-pmt-002", entry_number: "JE-PMT-002", entry_date: "2026-01-22",
  description: "Payment PMT-002", reference: "payment:pmt-002",
  status: "posted", company_id: COMPANY_ID,
};

// Office Rent $3,000
const JE_RENT = {
  id: "je-005", entry_number: "JE-005", entry_date: "2026-01-25",
  description: "Office Rent Jan 2026", reference: null,
  status: "posted", company_id: COMPANY_ID,
};

// Utility Bill $800
const JE_UTIL = {
  id: "je-006", entry_number: "JE-006", entry_date: "2026-01-28",
  description: "Utility Bill Jan 2026", reference: null,
  status: "posted", company_id: COMPANY_ID,
};

// Loan Repayment $5,000
const JE_LOAN = {
  id: "je-007", entry_number: "JE-007", entry_date: "2026-01-30",
  description: "Loan Repayment Jan 2026", reference: null,
  status: "posted", company_id: COMPANY_ID,
};

// Depreciation $1,250
const JE_DEPR = {
  id: "je-008", entry_number: "JE-008", entry_date: "2026-01-31",
  description: "Depreciation Jan 2026", reference: null,
  status: "posted", company_id: COMPANY_ID,
};

// Draft entry (should NOT appear in financial statements)
const JE_DRAFT = {
  id: "je-draft", entry_number: "JE-DRAFT-001", entry_date: "2026-01-31",
  description: "Draft entry", reference: null,
  status: "draft", company_id: COMPANY_ID,
};

export const JOURNAL_ENTRIES = [JE_OB, JE_INV1, JE_INV2, JE_INV3, JE_PMT1, JE_PMT2, JE_RENT, JE_UTIL, JE_LOAN, JE_DEPR, JE_DRAFT];

// Helper to build a JE line with nested join data (matches Supabase response shape)
function jeLine(
  je: typeof JE_OB,
  accountId: string,
  debit: number,
  credit: number,
  description = ""
) {
  const a = acct(accountId);
  return {
    account_id: accountId,
    debit,
    credit,
    description,
    company_id: COMPANY_ID,
    chart_of_accounts: {
      account_number: a.account_number,
      name: a.name,
      account_type: a.account_type,
      sub_type: a.sub_type,
    },
    journal_entries: {
      id: je.id,
      status: je.status,
      entry_date: je.entry_date,
      entry_number: je.entry_number,
      reference: je.reference,
    },
  };
}

export const JE_LINES = [
  // OB: DR Cash $200k, DR Equipment $75k, CR Notes Payable $50k, CR Owner's Equity $225k
  jeLine(JE_OB, "acct-1000", 200_000, 0, "Opening cash"),
  jeLine(JE_OB, "acct-1500", 75_000, 0, "Opening equipment"),
  jeLine(JE_OB, "acct-2100", 0, 50_000, "Opening loan balance"),
  jeLine(JE_OB, "acct-3000", 0, 225_000, "Opening equity"),

  // INV-001: DR AR $105k / CR Revenue $100k / CR Sales Tax $5k
  jeLine(JE_INV1, "acct-1100", 105_000, 0, "Client invoice"),
  jeLine(JE_INV1, "acct-4000", 0, 100_000, "Construction revenue"),
  jeLine(JE_INV1, "acct-2050", 0, 5_000, "Sales tax"),

  // INV-002: DR Materials $30k / CR AP $30k
  jeLine(JE_INV2, "acct-5100", 30_000, 0, "Materials purchase"),
  jeLine(JE_INV2, "acct-2000", 0, 30_000, "AP - materials"),

  // INV-003: DR Subcontractor $45k / CR AP $45k
  jeLine(JE_INV3, "acct-5200", 45_000, 0, "Subcontractor"),
  jeLine(JE_INV3, "acct-2000", 0, 45_000, "AP - subcontractor"),

  // PMT-001: DR Cash $105k / CR AR $105k
  jeLine(JE_PMT1, "acct-1000", 105_000, 0, "Client payment received"),
  jeLine(JE_PMT1, "acct-1100", 0, 105_000, "AR reduced"),

  // PMT-002: DR AP $30k / CR Cash $30k
  jeLine(JE_PMT2, "acct-2000", 30_000, 0, "Vendor payment"),
  jeLine(JE_PMT2, "acct-1000", 0, 30_000, "Cash paid"),

  // Office Rent: DR 6000 $3k / CR Cash $3k
  jeLine(JE_RENT, "acct-6000", 3_000, 0, "Office rent"),
  jeLine(JE_RENT, "acct-1000", 0, 3_000, "Rent paid"),

  // Utility Bill: DR 6100 $800 / CR AP $800
  jeLine(JE_UTIL, "acct-6100", 800, 0, "Utility bill"),
  jeLine(JE_UTIL, "acct-2000", 0, 800, "AP - utilities"),

  // Loan Repayment: DR Notes Payable $5k / CR Cash $5k
  jeLine(JE_LOAN, "acct-2100", 5_000, 0, "Loan repayment"),
  jeLine(JE_LOAN, "acct-1000", 0, 5_000, "Loan payment"),

  // Depreciation: DR Utilities $1,250 / CR Accum Depr $1,250
  // (Using a proper depreciation entry)
  jeLine(JE_DEPR, "acct-6100", 1_250, 0, "Depreciation expense"),
  jeLine(JE_DEPR, "acct-1510", 0, 1_250, "Accumulated depreciation"),

  // Draft entry (should be filtered out by status=posted)
  jeLine(JE_DRAFT, "acct-1000", 999_999, 0, "Should not appear"),
  jeLine(JE_DRAFT, "acct-3000", 0, 999_999, "Should not appear"),
];

// ──────────────────────────────────────────────────────────────────
// Invoices (for subledger checks)
// ──────────────────────────────────────────────────────────────────
export const INVOICES = [
  {
    id: "inv-001", invoice_number: "INV-001", invoice_type: "receivable",
    vendor_name: null, client_name: "ABC Corp", project_id: null,
    invoice_date: "2026-01-05", due_date: "2026-02-05",
    subtotal: 100_000, tax_amount: 5_000, total_amount: 105_000,
    amount_paid: 105_000, balance_due: 0, status: "paid",
    notes: null, company_id: COMPANY_ID, gl_account_id: "acct-4000",
  },
  {
    id: "inv-002", invoice_number: "INV-002", invoice_type: "payable",
    vendor_name: "Steel Supply Co", client_name: null, project_id: null,
    invoice_date: "2026-01-10", due_date: "2026-02-10",
    subtotal: 30_000, tax_amount: 0, total_amount: 30_000,
    amount_paid: 30_000, balance_due: 0, status: "paid",
    notes: null, company_id: COMPANY_ID, gl_account_id: "acct-5100",
  },
  {
    id: "inv-003", invoice_number: "INV-003", invoice_type: "payable",
    vendor_name: "Premier Concrete Inc", client_name: null, project_id: null,
    invoice_date: "2026-01-15", due_date: "2026-02-15",
    subtotal: 45_000, tax_amount: 0, total_amount: 45_000,
    amount_paid: 0, balance_due: 45_000, status: "approved",
    notes: null, company_id: COMPANY_ID, gl_account_id: "acct-5200",
  },
];

// ──────────────────────────────────────────────────────────────────
// Payments (for subledger checks)
// ──────────────────────────────────────────────────────────────────
export const PAYMENTS = [
  {
    id: "pmt-001", invoice_id: "inv-001", payment_date: "2026-01-20",
    amount: 105_000, method: "check", reference_number: "CHK-1001",
    bank_account_id: "bank-001", notes: null, company_id: COMPANY_ID,
  },
  {
    id: "pmt-002", invoice_id: "inv-002", payment_date: "2026-01-22",
    amount: 30_000, method: "ach", reference_number: "ACH-5001",
    bank_account_id: "bank-001", notes: null, company_id: COMPANY_ID,
  },
];

// ──────────────────────────────────────────────────────────────────
// Bank Accounts (for bank reconciliation)
// ──────────────────────────────────────────────────────────────────
export const BANK_ACCOUNTS = [
  {
    id: "bank-001", name: "Operating Account", current_balance: 265_750,
    gl_account_id: "acct-1000", company_id: COMPANY_ID,
  },
];

// ──────────────────────────────────────────────────────────────────
// EXPECTED RESULTS (hand-calculated)
// ──────────────────────────────────────────────────────────────────

/**
 * Trial Balance (all posted JE lines):
 *
 * | Account        | Total DR  | Total CR  | Balance (DR-CR) |
 * |----------------|-----------|-----------|-----------------|
 * | 1000 Cash      | 305,000   | 38,000    | +267,000        |
 * | 1100 AR        | 105,000   | 105,000   |       0         |
 * | 1500 Equipment | 75,000    | 0         | +75,000         |
 * | 1510 Acc Depr  | 0         | 1,250     | -1,250          |
 * | 2000 AP        | 30,000    | 75,800    | -45,800         |
 * | 2050 Tax Pay   | 0         | 5,000     | -5,000          |
 * | 2100 Notes Pay | 5,000     | 50,000    | -45,000         |
 * | 3000 Equity    | 0         | 225,000   | -225,000        |
 * | 4000 Revenue   | 0         | 100,000   | -100,000        |
 * | 5100 Materials | 30,000    | 0         | +30,000         |
 * | 5200 Subcontr  | 45,000    | 0         | +45,000         |
 * | 6000 Rent      | 3,000     | 0         | +3,000          |
 * | 6100 Utilities | 2,050     | 0         | +2,050          |
 * |                | 600,050   | 600,050   | 0               |
 */
export const EXPECTED = {
  trialBalance: {
    totalDebits: 600_050,
    totalCredits: 600_050,
    cashBalance: 267_000,
    arBalance: 0,
    equipmentBalance: 75_000,
    accumDeprBalance: -1_250,
    apBalance: -45_800,
    salesTaxBalance: -5_000,
    notesPayableBalance: -45_000,
    equityBalance: -225_000,
    revenueBalance: -100_000,
    materialsBalance: 30_000,
    subcontractorBalance: 45_000,
    rentBalance: 3_000,
    utilitiesBalance: 2_050,
  },

  /**
   * Income Statement (Jan 2026, non-OB posted entries only):
   * Revenue: $100,000
   * COGS (5000-5999): $30,000 + $45,000 = $75,000
   * Gross Profit: $25,000
   * OpEx (6000+): $3,000 + $2,050 = $5,050
   * Net Income: $19,950
   */
  incomeStatement: {
    totalRevenue: 100_000,
    totalCOGS: 75_000,
    grossProfit: 25_000,
    totalOpEx: 5_050,
    netIncome: 19_950,
  },

  /**
   * Balance Sheet (Jan 31, 2026):
   * Assets: Cash $267k + AR $0 + Equipment $75k + AccDepr -$1,250 = $340,750
   * Liabilities: AP $45,800 + Tax $5,000 + NP $45,000 = $95,800
   * Equity: Owner's $225,000 + Net Income $19,950 = $244,950
   * L+E: $340,750 (balanced!)
   */
  balanceSheet: {
    totalAssets: 340_750,
    totalLiabilities: 95_800,
    totalEquity: 244_950,
    isBalanced: true,
  },

  /**
   * Cash Flow Statement (Jan 2026, OB entries excluded):
   * Operating:
   *   Net Income: $19,950
   *   Depreciation add-back: +$1,250  (CR to contra-asset)
   *   Changes in AR: $0  (DR $105k, CR $105k = net 0)
   *   Changes in AP: +$45,800  (increase in payables)
   *   Changes in Sales Tax Payable: +$5,000  (increase)
   *   Net Operating: $72,000
   *
   * Investing: -$0  (equipment was OB, excluded)
   *
   * Financing:
   *   Notes Payable: -$5,000  (loan repayment)
   *   Net Financing: -$5,000
   *
   * Net Change: $67,000
   * Beginning Cash: $200,000  (from OB)
   * Ending Cash: $267,000
   */
  cashFlow: {
    netOperating: 72_000,
    netInvesting: 0,
    netFinancing: -5_000,
    netChange: 67_000,
    beginningCash: 200_000,
    endingCash: 267_000,
  },
} as const;

// ──────────────────────────────────────────────────────────────────
// Build the full mock dataset for createMockSupabase()
// ──────────────────────────────────────────────────────────────────
export function buildMockDataset() {
  return {
    journal_entry_lines: JE_LINES as unknown as Record<string, unknown>[],
    chart_of_accounts: ACCOUNTS as unknown as Record<string, unknown>[],
    journal_entries: JOURNAL_ENTRIES as unknown as Record<string, unknown>[],
    invoices: INVOICES as unknown as Record<string, unknown>[],
    payments: PAYMENTS as unknown as Record<string, unknown>[],
    bank_accounts: BANK_ACCOUNTS as unknown as Record<string, unknown>[],
  };
}
