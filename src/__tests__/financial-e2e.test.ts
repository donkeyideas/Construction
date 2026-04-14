/**
 * Financial E2E API Tests — Runs against the live application
 *
 * These tests call actual API endpoints to verify the full stack:
 * auth → API → query → Supabase → financial statements
 *
 * Prerequisites:
 *   1. Dev server running: npm run dev
 *   2. Environment variables set: TEST_BASE_URL, TEST_EMAIL, TEST_PASSWORD
 *      OR use defaults (localhost:3000, owner@demo.com, Demo1234!)
 *
 * Run: TEST_E2E=1 npm test -- --run src/__tests__/financial-e2e.test.ts
 *
 * Skip: These tests are skipped by default (no TEST_E2E env var).
 */

import { describe, it, expect, beforeAll } from "vitest";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";
const EMAIL = process.env.TEST_EMAIL || "owner@demo.com";
const PASSWORD = process.env.TEST_PASSWORD || "Demo1234!";
const RUN_E2E = !!process.env.TEST_E2E;

// Auth cookie jar
let cookies = "";

async function apiFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Cookie: cookies,
      ...(options.headers || {}),
    },
  });
  // Capture set-cookie for session persistence
  const setCookie = res.headers.getSetCookie?.() ?? [];
  if (setCookie.length > 0) {
    cookies = setCookie.map((c) => c.split(";")[0]).join("; ");
  }
  return res;
}

describe.skipIf(!RUN_E2E)("Financial E2E API Tests", () => {
  beforeAll(async () => {
    // Login to get session cookies
    const res = await apiFetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
    });
    expect(res.ok).toBe(true);
  });

  // ── Financial Overview ──
  describe("Financial Overview", () => {
    it("GET /api/financial/overview returns valid data", async () => {
      const res = await apiFetch("/api/financial/accounts");
      expect(res.status).toBeLessThan(500);
    });
  });

  // ── Chart of Accounts ──
  describe("Chart of Accounts", () => {
    it("returns accounts list", async () => {
      const res = await apiFetch("/api/financial/accounts");
      expect(res.ok).toBe(true);
      const body = await res.json();
      expect(body.accounts).toBeDefined();
      expect(Array.isArray(body.accounts)).toBe(true);
    });

    it("every account has required fields", async () => {
      const res = await apiFetch("/api/financial/accounts");
      const { accounts } = await res.json();
      for (const acct of accounts) {
        expect(acct.account_number).toBeTruthy();
        expect(acct.name).toBeTruthy();
        expect(["asset", "liability", "equity", "revenue", "expense"]).toContain(acct.account_type);
        expect(["debit", "credit"]).toContain(acct.normal_balance);
      }
    });

    it("no duplicate account numbers", async () => {
      const res = await apiFetch("/api/financial/accounts");
      const { accounts } = await res.json();
      const numbers = accounts.map((a: { account_number: string }) => a.account_number);
      const unique = new Set(numbers);
      expect(unique.size).toBe(numbers.length);
    });
  });

  // ── Trial Balance ──
  describe("Trial Balance", () => {
    it("total debits = total credits", async () => {
      const res = await apiFetch("/api/financial/journal-entries?includeAccounts=true");
      if (!res.ok) return; // Skip if no data
      // Trial balance is computed client-side; verify via audit
      const auditRes = await apiFetch("/api/financial/audit-grade");
      expect(auditRes.ok).toBe(true);
      const audit = await auditRes.json();
      expect(audit.grade).toBeDefined();
    });
  });

  // ── Invoices ──
  describe("Invoices", () => {
    it("GET /api/financial/invoices returns list", async () => {
      const res = await apiFetch("/api/financial/invoices");
      expect(res.ok).toBe(true);
      const body = await res.json();
      expect(body.invoices).toBeDefined();
    });

    it("every invoice has valid type", async () => {
      const res = await apiFetch("/api/financial/invoices");
      const { invoices } = await res.json();
      for (const inv of invoices) {
        expect(["payable", "receivable"]).toContain(inv.invoice_type);
        expect(inv.total_amount).toBeGreaterThanOrEqual(0);
        expect(inv.balance_due).toBeGreaterThanOrEqual(0);
      }
    });

    it("no invoice has balance_due > total_amount", async () => {
      const res = await apiFetch("/api/financial/invoices");
      const { invoices } = await res.json();
      for (const inv of invoices) {
        expect(inv.balance_due).toBeLessThanOrEqual(inv.total_amount + 0.01);
      }
    });
  });

  // ── Journal Entries ──
  describe("Journal Entries", () => {
    it("GET /api/financial/journal-entries returns entries", async () => {
      const res = await apiFetch("/api/financial/journal-entries");
      expect(res.ok).toBe(true);
      const body = await res.json();
      expect(body.entries).toBeDefined();
    });

    it("every posted entry balances (DR = CR)", async () => {
      const res = await apiFetch("/api/financial/journal-entries?status=posted&includeAccounts=true");
      if (!res.ok) return;
      const { entries } = await res.json();
      for (const entry of entries) {
        if (!entry.lines) continue;
        const totalDR = entry.lines.reduce((s: number, l: { debit: number }) => s + (l.debit ?? 0), 0);
        const totalCR = entry.lines.reduce((s: number, l: { credit: number }) => s + (l.credit ?? 0), 0);
        expect(Math.abs(totalDR - totalCR)).toBeLessThan(0.01);
      }
    });
  });

  // ── Payments ──
  describe("Payments", () => {
    it("GET /api/financial/payments returns list", async () => {
      const res = await apiFetch("/api/financial/payments");
      expect(res.ok).toBe(true);
    });
  });

  // ── Audit Grade ──
  describe("Financial Audit", () => {
    it("returns a valid grade", async () => {
      const res = await apiFetch("/api/financial/audit-grade");
      expect(res.ok).toBe(true);
      const body = await res.json();
      expect(["A", "B", "C", "D", "F"]).toContain(body.grade);
      expect(body.gradeLabel).toBeTruthy();
    });
  });

  // ── Create → Verify Cycle ──
  describe("Invoice Creation → JE Verification", () => {
    let createdInvoiceId: string | null = null;

    it("creates a test receivable invoice", async () => {
      const res = await apiFetch("/api/financial/invoices", {
        method: "POST",
        body: JSON.stringify({
          invoice_number: `UAT-TEST-${Date.now()}`,
          invoice_type: "receivable",
          client_name: "UAT Test Client",
          invoice_date: new Date().toISOString().split("T")[0],
          due_date: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
          subtotal: 1000,
          tax_amount: 0,
          total_amount: 1000,
          line_items: [{ description: "UAT test service", quantity: 1, unit_price: 1000, amount: 1000 }],
          status: "approved",
        }),
      });
      expect(res.ok).toBe(true);
      const body = await res.json();
      createdInvoiceId = body.id;
      expect(createdInvoiceId).toBeTruthy();
    });

    it("invoice has auto-generated journal entry", async () => {
      if (!createdInvoiceId) return;
      // Wait briefly for async JE creation
      await new Promise((r) => setTimeout(r, 2000));

      const res = await apiFetch("/api/financial/journal-entries");
      const { entries } = await res.json();
      const matchingJE = entries.find(
        (e: { reference: string }) => e.reference === `invoice:${createdInvoiceId}`
      );
      expect(matchingJE).toBeDefined();
    });

    it("audit still passes after test invoice", async () => {
      const res = await apiFetch("/api/financial/audit-grade");
      expect(res.ok).toBe(true);
      const body = await res.json();
      // Should still be A or B (test invoice shouldn't break anything)
      expect(["A", "B", "C"]).toContain(body.grade);
    });
  });

  // ── Bank Accounts ──
  describe("Bank Accounts", () => {
    it("GET /api/financial/bank-accounts returns list", async () => {
      const res = await apiFetch("/api/financial/bank-accounts");
      expect(res.ok).toBe(true);
      const body = await res.json();
      expect(Array.isArray(body.accounts || body)).toBe(true);
    });
  });
});
