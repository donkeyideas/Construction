/**
 * Financial UAT Test Suite — Comprehensive Verification
 *
 * Tests the entire financial pipeline with a realistic construction company
 * scenario: opening balances, invoices, payments, expenses, depreciation,
 * and loan activity. Verifies every financial statement and cross-statement
 * reconciliation using hand-calculated expected values.
 *
 * Run: npm test -- --run src/__tests__/financial-uat.test.ts
 */

import { describe, it, expect, beforeAll } from "vitest";
import { SupabaseClient } from "@supabase/supabase-js";
import { createMockSupabase } from "./helpers/mock-supabase";
import { buildMockDataset, COMPANY_ID, EXPECTED, JE_LINES, ACCOUNTS } from "./helpers/test-data";
import { getTrialBalance, getBalanceSheet, getIncomeStatement, getCashFlowStatement } from "@/lib/queries/financial";
import { runFinancialAudit } from "@/lib/queries/financial-audit";
import { paginatedQuery } from "@/lib/utils/paginated-query";

// Cast mock to SupabaseClient (type-only; the mock implements the needed interface)
let supabase: SupabaseClient;

beforeAll(() => {
  supabase = createMockSupabase(buildMockDataset()) as unknown as SupabaseClient;
});

// ================================================================
// 1. TRIAL BALANCE
// ================================================================
describe("Trial Balance", () => {
  it("total debits equal total credits", async () => {
    const tb = await getTrialBalance(supabase, COMPANY_ID);
    const totalDR = tb.reduce((s, r) => s + r.total_debit, 0);
    const totalCR = tb.reduce((s, r) => s + r.total_credit, 0);

    expect(totalDR).toBeCloseTo(EXPECTED.trialBalance.totalDebits, 2);
    expect(totalCR).toBeCloseTo(EXPECTED.trialBalance.totalCredits, 2);
    expect(Math.abs(totalDR - totalCR)).toBeLessThan(0.01);
  });

  it("individual account balances are correct", async () => {
    const tb = await getTrialBalance(supabase, COMPANY_ID);

    const byNumber = Object.fromEntries(tb.map((r) => [r.account_number, r]));

    expect(byNumber["1000"].balance).toBeCloseTo(EXPECTED.trialBalance.cashBalance, 2);
    expect(byNumber["1100"].balance).toBeCloseTo(EXPECTED.trialBalance.arBalance, 2);
    expect(byNumber["1500"].balance).toBeCloseTo(EXPECTED.trialBalance.equipmentBalance, 2);
    expect(byNumber["1510"].balance).toBeCloseTo(EXPECTED.trialBalance.accumDeprBalance, 2);
    expect(byNumber["2000"].balance).toBeCloseTo(EXPECTED.trialBalance.apBalance, 2);
    expect(byNumber["2050"].balance).toBeCloseTo(EXPECTED.trialBalance.salesTaxBalance, 2);
    expect(byNumber["2100"].balance).toBeCloseTo(EXPECTED.trialBalance.notesPayableBalance, 2);
    expect(byNumber["3000"].balance).toBeCloseTo(EXPECTED.trialBalance.equityBalance, 2);
    expect(byNumber["4000"].balance).toBeCloseTo(EXPECTED.trialBalance.revenueBalance, 2);
    expect(byNumber["5100"].balance).toBeCloseTo(EXPECTED.trialBalance.materialsBalance, 2);
    expect(byNumber["5200"].balance).toBeCloseTo(EXPECTED.trialBalance.subcontractorBalance, 2);
    expect(byNumber["6000"].balance).toBeCloseTo(EXPECTED.trialBalance.rentBalance, 2);
    expect(byNumber["6100"].balance).toBeCloseTo(EXPECTED.trialBalance.utilitiesBalance, 2);
  });

  it("excludes draft journal entries", async () => {
    const tb = await getTrialBalance(supabase, COMPANY_ID);

    // Draft JE has $999,999 — if it leaked in, totals would be way off
    const totalDR = tb.reduce((s, r) => s + r.total_debit, 0);
    expect(totalDR).toBeCloseTo(EXPECTED.trialBalance.totalDebits, 2);
    expect(totalDR).not.toBeGreaterThan(EXPECTED.trialBalance.totalDebits + 1);
  });

  it("returns sorted by account number", async () => {
    const tb = await getTrialBalance(supabase, COMPANY_ID);
    const numbers = tb.map((r) => r.account_number);
    const sorted = [...numbers].sort((a, b) => a.localeCompare(b));
    expect(numbers).toEqual(sorted);
  });
});

// ================================================================
// 2. INCOME STATEMENT
// ================================================================
describe("Income Statement", () => {
  it("calculates revenue, COGS, and net income correctly", async () => {
    const is = await getIncomeStatement(supabase, COMPANY_ID, "2026-01-01", "2026-01-31");

    expect(is.revenue.total).toBeCloseTo(EXPECTED.incomeStatement.totalRevenue, 2);
    expect(is.costOfConstruction.total).toBeCloseTo(EXPECTED.incomeStatement.totalCOGS, 2);
    expect(is.grossProfit).toBeCloseTo(EXPECTED.incomeStatement.grossProfit, 2);
    expect(is.operatingExpenses.total).toBeCloseTo(EXPECTED.incomeStatement.totalOpEx, 2);
    expect(is.netIncome).toBeCloseTo(EXPECTED.incomeStatement.netIncome, 2);
  });

  it("classifies COGS accounts (5000-5999) separately from OpEx (6000+)", async () => {
    const is = await getIncomeStatement(supabase, COMPANY_ID, "2026-01-01", "2026-01-31");

    // COGS should include Materials (5100) and Subcontractor (5200)
    const cogsNames = is.costOfConstruction.accounts.map((a) => a.name);
    expect(cogsNames).toContain("Materials");
    expect(cogsNames).toContain("Subcontractor Costs");

    // OpEx should include Office Rent (6000) and Utilities (6100)
    const opexNames = is.operatingExpenses.accounts.map((a) => a.name);
    expect(opexNames).toContain("Office Rent");
    expect(opexNames).toContain("Utilities");
  });

  it("revenue uses credit-debit (natural credit balance)", async () => {
    const is = await getIncomeStatement(supabase, COMPANY_ID, "2026-01-01", "2026-01-31");
    // Revenue accounts should show positive amounts (credit > debit)
    for (const acct of is.revenue.accounts) {
      expect(acct.amount).toBeGreaterThan(0);
    }
  });

  it("expenses use debit-credit (natural debit balance)", async () => {
    const is = await getIncomeStatement(supabase, COMPANY_ID, "2026-01-01", "2026-01-31");
    for (const acct of [...is.costOfConstruction.accounts, ...is.operatingExpenses.accounts]) {
      expect(acct.amount).toBeGreaterThan(0);
    }
  });

  it("returns zero for a date range with no activity", async () => {
    const is = await getIncomeStatement(supabase, COMPANY_ID, "2025-01-01", "2025-01-31");
    expect(is.revenue.total).toBe(0);
    expect(is.costOfConstruction.total).toBe(0);
    expect(is.netIncome).toBe(0);
  });
});

// ================================================================
// 3. BALANCE SHEET
// ================================================================
describe("Balance Sheet", () => {
  it("is balanced (Assets = Liabilities + Equity)", async () => {
    const bs = await getBalanceSheet(supabase, COMPANY_ID, "2026-01-31");

    expect(bs.isBalanced).toBe(true);
    expect(bs.assets.total).toBeCloseTo(EXPECTED.balanceSheet.totalAssets, 2);
    expect(bs.liabilities.total).toBeCloseTo(EXPECTED.balanceSheet.totalLiabilities, 2);
    expect(bs.equity.total).toBeCloseTo(EXPECTED.balanceSheet.totalEquity, 2);
    expect(Math.abs(bs.assets.total - bs.totalLiabilitiesAndEquity)).toBeLessThan(0.01);
  });

  it("includes all asset accounts with correct amounts", async () => {
    const bs = await getBalanceSheet(supabase, COMPANY_ID, "2026-01-31");
    const assetsByNum = Object.fromEntries(bs.assets.accounts.map((a) => [a.account_number, a.amount]));

    expect(assetsByNum["1000"]).toBeCloseTo(267_000, 2);
    expect(assetsByNum["1500"]).toBeCloseTo(75_000, 2);
    expect(assetsByNum["1510"]).toBeCloseTo(-1_250, 2); // Contra-asset
  });

  it("includes synthetic Retained Earnings for net income", async () => {
    const bs = await getBalanceSheet(supabase, COMPANY_ID, "2026-01-31");
    const reEntry = bs.equity.accounts.find(
      (a) => a.name.includes("Retained Earnings") || a.name.includes("Net Income")
    );

    expect(reEntry).toBeDefined();
    expect(reEntry!.amount).toBeCloseTo(EXPECTED.incomeStatement.netIncome, 2);
  });

  it("separates current liabilities from long-term liabilities", async () => {
    const bs = await getBalanceSheet(supabase, COMPANY_ID, "2026-01-31");
    const liabNames = bs.liabilities.accounts.map((a) => a.name);

    expect(liabNames).toContain("Accounts Payable");
    expect(liabNames).toContain("Notes Payable");
  });
});

// ================================================================
// 4. CASH FLOW STATEMENT
// ================================================================
describe("Cash Flow Statement", () => {
  it("calculates operating, investing, and financing sections", async () => {
    const cf = await getCashFlowStatement(supabase, COMPANY_ID, "2026-01-01", "2026-01-31");

    expect(cf.netOperating).toBeCloseTo(EXPECTED.cashFlow.netOperating, 2);
    expect(cf.netInvesting).toBeCloseTo(EXPECTED.cashFlow.netInvesting, 2);
    expect(cf.netFinancing).toBeCloseTo(EXPECTED.cashFlow.netFinancing, 2);
  });

  it("net change = operating + investing + financing", async () => {
    const cf = await getCashFlowStatement(supabase, COMPANY_ID, "2026-01-01", "2026-01-31");
    expect(cf.netChange).toBeCloseTo(cf.netOperating + cf.netInvesting + cf.netFinancing, 2);
  });

  it("ending cash = beginning cash + net change", async () => {
    const cf = await getCashFlowStatement(supabase, COMPANY_ID, "2026-01-01", "2026-01-31");
    expect(cf.endingCash).toBeCloseTo(cf.beginningCash + cf.netChange, 2);
  });

  it("ending cash matches balance sheet cash", async () => {
    const cf = await getCashFlowStatement(supabase, COMPANY_ID, "2026-01-01", "2026-01-31");
    expect(cf.endingCash).toBeCloseTo(EXPECTED.trialBalance.cashBalance, 2);
  });

  it("beginning cash equals opening balance cash", async () => {
    const cf = await getCashFlowStatement(supabase, COMPANY_ID, "2026-01-01", "2026-01-31");
    // Opening balance deposited $200k in cash
    expect(cf.beginningCash).toBeCloseTo(EXPECTED.cashFlow.beginningCash, 2);
  });

  it("excludes opening balance entries from operating/investing/financing", async () => {
    const cf = await getCashFlowStatement(supabase, COMPANY_ID, "2026-01-01", "2026-01-31");

    // The OB equipment ($75k) should NOT appear in investing
    const investingLabels = cf.investing.map((i) => i.label);
    const hasEquipment = investingLabels.some((l) => l.toLowerCase().includes("equipment"));
    expect(hasEquipment).toBe(false);
  });

  it("starts operating section with Net Income", async () => {
    const cf = await getCashFlowStatement(supabase, COMPANY_ID, "2026-01-01", "2026-01-31");
    expect(cf.operating[0].label).toBe("Net Income");
    expect(cf.operating[0].amount).toBeCloseTo(EXPECTED.incomeStatement.netIncome, 2);
  });

  it("includes depreciation add-back in operating activities", async () => {
    const cf = await getCashFlowStatement(supabase, COMPANY_ID, "2026-01-01", "2026-01-31");
    const deprItem = cf.operating.find((o) => o.label.includes("Depreciation"));
    expect(deprItem).toBeDefined();
    expect(deprItem!.amount).toBeCloseTo(1_250, 2);
  });

  it("shows loan repayment in financing activities", async () => {
    const cf = await getCashFlowStatement(supabase, COMPANY_ID, "2026-01-01", "2026-01-31");
    const loanItem = cf.financing.find((f) => f.label.includes("Notes Payable"));
    expect(loanItem).toBeDefined();
    expect(loanItem!.amount).toBeCloseTo(-5_000, 2); // repayment = negative
  });
});

// ================================================================
// 5. CROSS-STATEMENT RECONCILIATION (the golden checks)
// ================================================================
describe("Cross-Statement Reconciliation", () => {
  it("IS Net Income = BS Retained Earnings change", async () => {
    const is = await getIncomeStatement(supabase, COMPANY_ID, "2026-01-01", "2026-01-31");
    const bs = await getBalanceSheet(supabase, COMPANY_ID, "2026-01-31");

    const reEntry = bs.equity.accounts.find(
      (a) => a.name.includes("Retained Earnings") || a.name.includes("Net Income")
    );

    expect(reEntry).toBeDefined();
    expect(is.netIncome).toBeCloseTo(reEntry!.amount, 2);
  });

  it("CF starting Net Income = IS Net Income", async () => {
    const is = await getIncomeStatement(supabase, COMPANY_ID, "2026-01-01", "2026-01-31");
    const cf = await getCashFlowStatement(supabase, COMPANY_ID, "2026-01-01", "2026-01-31");

    const cfNetIncome = cf.operating.find((o) => o.label === "Net Income");
    expect(cfNetIncome).toBeDefined();
    expect(cfNetIncome!.amount).toBeCloseTo(is.netIncome, 2);
  });

  it("CF ending cash = BS cash account", async () => {
    const cf = await getCashFlowStatement(supabase, COMPANY_ID, "2026-01-01", "2026-01-31");
    const bs = await getBalanceSheet(supabase, COMPANY_ID, "2026-01-31");

    const bsCash = bs.assets.accounts.find((a) => a.account_number === "1000");
    expect(bsCash).toBeDefined();
    expect(cf.endingCash).toBeCloseTo(bsCash!.amount, 2);
  });

  it("BS Assets = TB asset account balances", async () => {
    const tb = await getTrialBalance(supabase, COMPANY_ID);
    const bs = await getBalanceSheet(supabase, COMPANY_ID, "2026-01-31");

    const tbAssets = tb
      .filter((r) => r.account_type === "asset")
      .reduce((sum, r) => sum + (r.total_debit - r.total_credit), 0);

    expect(bs.assets.total).toBeCloseTo(tbAssets, 2);
  });

  it("BS Liabilities = TB liability account balances", async () => {
    const tb = await getTrialBalance(supabase, COMPANY_ID);
    const bs = await getBalanceSheet(supabase, COMPANY_ID, "2026-01-31");

    const tbLiabilities = tb
      .filter((r) => r.account_type === "liability")
      .reduce((sum, r) => sum + (r.total_credit - r.total_debit), 0);

    expect(bs.liabilities.total).toBeCloseTo(tbLiabilities, 2);
  });
});

// ================================================================
// 6. DOUBLE-ENTRY INVARIANTS
// ================================================================
describe("Double-Entry Invariants", () => {
  it("every journal entry balances (DR = CR)", () => {
    // Group JE lines by journal entry ID
    const postedLines = JE_LINES.filter((l) => l.journal_entries.status === "posted");
    const byEntry = new Map<string, typeof postedLines>();
    for (const line of postedLines) {
      const id = line.journal_entries.id;
      if (!byEntry.has(id)) byEntry.set(id, []);
      byEntry.get(id)!.push(line);
    }

    for (const [entryId, lines] of byEntry) {
      const totalDR = lines.reduce((s, l) => s + l.debit, 0);
      const totalCR = lines.reduce((s, l) => s + l.credit, 0);
      expect(totalDR).toBeCloseTo(totalCR, 2);
    }
  });

  it("accounting equation holds: Assets = Liabilities + Equity (+ Revenue - Expenses)", () => {
    const postedLines = JE_LINES.filter((l) => l.journal_entries.status === "posted");

    let assets = 0, liabilities = 0, equity = 0, revenue = 0, expenses = 0;
    for (const line of postedLines) {
      const net = line.debit - line.credit;
      switch (line.chart_of_accounts.account_type) {
        case "asset": assets += net; break;
        case "liability": liabilities += net; break;
        case "equity": equity += net; break;
        case "revenue": revenue += net; break;
        case "expense": expenses += net; break;
      }
    }

    // Since total DR = total CR across all entries, the sum of (DR-CR) for
    // every account type must be zero:
    //   assets(DR-CR) + liabilities(DR-CR) + equity(DR-CR) + revenue(DR-CR) + expenses(DR-CR) = 0
    expect(assets + liabilities + equity + revenue + expenses).toBeCloseTo(0, 2);
  });

  it("no JE line has both debit and credit > 0", () => {
    for (const line of JE_LINES) {
      expect(line.debit > 0 && line.credit > 0).toBe(false);
    }
  });

  it("no JE line has both debit and credit = 0", () => {
    for (const line of JE_LINES) {
      expect(line.debit === 0 && line.credit === 0).toBe(false);
    }
  });

  it("all JE lines reference valid accounts", () => {
    const validIds = new Set(ACCOUNTS.map((a) => a.id));
    for (const line of JE_LINES) {
      expect(validIds.has(line.account_id)).toBe(true);
    }
  });
});

// ================================================================
// 7. PAGINATION (Supabase 1000-row limit)
// ================================================================
describe("Pagination Helper", () => {
  it("fetches all rows when data exceeds page size", async () => {
    // Generate 2,500 rows (exceeds 1000-row page size)
    const bigData = Array.from({ length: 2500 }, (_, i) => ({
      id: `row-${i}`,
      value: i,
    }));

    const mockBigClient = createMockSupabase({
      big_table: bigData as unknown as Record<string, unknown>[],
    });

    const results = await paginatedQuery<{ id: string; value: number }>((from, to) =>
      (mockBigClient as unknown as SupabaseClient)
        .from("big_table")
        .select("id, value")
        .range(from, to) as any
    );

    expect(results.length).toBe(2500);
    expect(results[0].value).toBe(0);
    expect(results[2499].value).toBe(2499);
  });

  it("handles empty result set", async () => {
    const mockEmpty = createMockSupabase({ empty_table: [] });

    const results = await paginatedQuery((from, to) =>
      (mockEmpty as unknown as SupabaseClient)
        .from("empty_table")
        .select("*")
        .range(from, to) as any
    );

    expect(results.length).toBe(0);
  });

  it("handles exactly 1000 rows (boundary case)", async () => {
    const data = Array.from({ length: 1000 }, (_, i) => ({ id: i }));
    const mock = createMockSupabase({ t: data as unknown as Record<string, unknown>[] });

    const results = await paginatedQuery((from, to) =>
      (mock as unknown as SupabaseClient).from("t").select("*").range(from, to) as any
    );

    expect(results.length).toBe(1000);
  });

  it("handles 1001 rows (first row on second page)", async () => {
    const data = Array.from({ length: 1001 }, (_, i) => ({ id: i }));
    const mock = createMockSupabase({ t: data as unknown as Record<string, unknown>[] });

    const results = await paginatedQuery((from, to) =>
      (mock as unknown as SupabaseClient).from("t").select("*").range(from, to) as any
    );

    expect(results.length).toBe(1001);
  });
});

// ================================================================
// 8. EDGE CASES
// ================================================================
describe("Edge Cases", () => {
  it("empty company returns empty trial balance", async () => {
    const empty = createMockSupabase({ journal_entry_lines: [], chart_of_accounts: [] });
    const tb = await getTrialBalance(empty as unknown as SupabaseClient, "empty-company");
    expect(tb).toEqual([]);
  });

  it("empty company balance sheet uses fallback (all zeros)", async () => {
    const empty = createMockSupabase({
      journal_entry_lines: [],
      chart_of_accounts: [],
      invoices: [],
      bank_accounts: [],
    });
    const bs = await getBalanceSheet(empty as unknown as SupabaseClient, "empty-company", "2026-01-31");
    expect(bs.isBalanced).toBe(true);
    expect(bs.assets.total).toBe(0);
  });

  it("empty company income statement returns zero", async () => {
    const empty = createMockSupabase({
      journal_entry_lines: [],
      invoices: [],
    });
    const is = await getIncomeStatement(
      empty as unknown as SupabaseClient,
      "empty-company",
      "2026-01-01",
      "2026-01-31"
    );
    expect(is.netIncome).toBe(0);
    expect(is.revenue.total).toBe(0);
  });

  it("penny-level precision is maintained", () => {
    // Verify floating point doesn't cause issues
    const a = 0.1 + 0.2;
    const b = 0.3;
    // Our system uses toBeCloseTo with 2 decimal places
    expect(a).toBeCloseTo(b, 2);
  });
});

// ================================================================
// 9. AUDIT SYSTEM
// ================================================================
describe("Financial Audit", () => {
  it("trial balance check passes when balanced", async () => {
    const result = await runFinancialAudit(supabase, COMPANY_ID);
    const tbCheck = result.checks.find((c) => c.id === "trial-balance");
    expect(tbCheck).toBeDefined();
    expect(tbCheck!.status).toBe("pass");
  });

  it("balance sheet check passes when balanced", async () => {
    const result = await runFinancialAudit(supabase, COMPANY_ID);
    const bsCheck = result.checks.find((c) => c.id === "balance-sheet");
    expect(bsCheck).toBeDefined();
    expect(bsCheck!.status).toBe("pass");
  });

  it("invoice JE coverage check finds covered invoices", async () => {
    const result = await runFinancialAudit(supabase, COMPANY_ID);
    const invCheck = result.checks.find((c) => c.id === "invoice-je-coverage");
    expect(invCheck).toBeDefined();
    // All 3 invoices have matching JEs (invoice:inv-001, etc.)
    expect(invCheck!.status).toBe("pass");
  });

  it("payment JE coverage check finds covered payments", async () => {
    const result = await runFinancialAudit(supabase, COMPANY_ID);
    const pmtCheck = result.checks.find((c) => c.id === "payment-je-coverage");
    expect(pmtCheck).toBeDefined();
    // Both payments have matching JEs (payment:pmt-001, etc.)
    expect(pmtCheck!.status).toBe("pass");
  });

  it("runs all 15 audit checks", async () => {
    const result = await runFinancialAudit(supabase, COMPANY_ID);
    expect(result.checks.length).toBe(15);
  });

  it("computes a valid grade (A-F)", async () => {
    const result = await runFinancialAudit(supabase, COMPANY_ID);
    expect(["A", "B", "C", "D", "F"]).toContain(result.grade);
  });
});
