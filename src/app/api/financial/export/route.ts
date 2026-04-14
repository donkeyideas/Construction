import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import {
  getTrialBalance,
  getIncomeStatement,
  getBalanceSheet,
  getCashFlowStatement,
} from "@/lib/queries/financial";
import { logAuditEvent, extractRequestMeta } from "@/lib/utils/audit-logger";

type ReportType = "trial-balance" | "income-statement" | "balance-sheet" | "cash-flow";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const userCompany = await getCurrentUserCompany(supabase);

    if (!userCompany) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const report = searchParams.get("report") as ReportType | null;
    const format = searchParams.get("format") || "csv";
    const from = searchParams.get("from") || undefined;
    const to = searchParams.get("to") || undefined;

    if (!report) {
      return NextResponse.json(
        { error: "Missing required param: report (trial-balance|income-statement|balance-sheet|cash-flow)" },
        { status: 400 }
      );
    }

    if (format !== "csv" && format !== "xlsx") {
      return NextResponse.json(
        { error: "format must be 'csv' or 'xlsx'" },
        { status: 400 }
      );
    }

    const validReports: ReportType[] = ["trial-balance", "income-statement", "balance-sheet", "cash-flow"];
    if (!validReports.includes(report)) {
      return NextResponse.json(
        { error: `Invalid report type. Use: ${validReports.join(", ")}` },
        { status: 400 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let rows: Array<Record<string, any>> = [];
    let fileName = "";

    const today = new Date().toISOString().split("T")[0];
    const startOfYear = `${new Date().getFullYear()}-01-01`;

    if (report === "trial-balance") {
      const data = await getTrialBalance(supabase, userCompany.companyId, to);
      rows = data.map((row) => ({
        "Account Number": row.account_number,
        "Account Name": row.account_name,
        "Account Type": row.account_type,
        "Debit": row.total_debit?.toFixed(2) ?? "0.00",
        "Credit": row.total_credit?.toFixed(2) ?? "0.00",
        "Balance": row.balance?.toFixed(2) ?? "0.00",
      }));
      fileName = "trial-balance";
    } else if (report === "income-statement") {
      const startDate = from || startOfYear;
      const endDate = to || today;
      const data = await getIncomeStatement(supabase, userCompany.companyId, startDate, endDate);
      const allRows: Array<Record<string, string>> = [];
      for (const item of data.revenue.accounts) {
        allRows.push({ Section: "Revenue", Account: item.name, Amount: item.amount?.toFixed(2) ?? "0.00" });
      }
      allRows.push({ Section: "Revenue", Account: "Total Revenue", Amount: data.revenue.total?.toFixed(2) ?? "0.00" });
      for (const item of data.costOfConstruction.accounts) {
        allRows.push({ Section: "Cost of Construction", Account: item.name, Amount: item.amount?.toFixed(2) ?? "0.00" });
      }
      allRows.push({ Section: "Cost of Construction", Account: "Total COGS", Amount: data.costOfConstruction.total?.toFixed(2) ?? "0.00" });
      allRows.push({ Section: "Summary", Account: "Gross Profit", Amount: data.grossProfit?.toFixed(2) ?? "0.00" });
      for (const item of data.operatingExpenses.accounts) {
        allRows.push({ Section: "Operating Expenses", Account: item.name, Amount: item.amount?.toFixed(2) ?? "0.00" });
      }
      allRows.push({ Section: "Operating Expenses", Account: "Total OpEx", Amount: data.operatingExpenses.total?.toFixed(2) ?? "0.00" });
      allRows.push({ Section: "Summary", Account: "Net Income", Amount: data.netIncome?.toFixed(2) ?? "0.00" });
      rows = allRows;
      fileName = "income-statement";
    } else if (report === "balance-sheet") {
      const asOfDate = to || today;
      const data = await getBalanceSheet(supabase, userCompany.companyId, asOfDate);
      const allRows: Array<Record<string, string>> = [];
      for (const item of data.assets.accounts) {
        allRows.push({ Section: "Assets", Account: item.name, Amount: item.amount?.toFixed(2) ?? "0.00" });
      }
      allRows.push({ Section: "Assets", Account: "Total Assets", Amount: data.assets.total?.toFixed(2) ?? "0.00" });
      for (const item of data.liabilities.accounts) {
        allRows.push({ Section: "Liabilities", Account: item.name, Amount: item.amount?.toFixed(2) ?? "0.00" });
      }
      allRows.push({ Section: "Liabilities", Account: "Total Liabilities", Amount: data.liabilities.total?.toFixed(2) ?? "0.00" });
      for (const item of data.equity.accounts) {
        allRows.push({ Section: "Equity", Account: item.name, Amount: item.amount?.toFixed(2) ?? "0.00" });
      }
      allRows.push({ Section: "Equity", Account: "Total Equity", Amount: data.equity.total?.toFixed(2) ?? "0.00" });
      allRows.push({ Section: "Check", Account: "Total L+E", Amount: data.totalLiabilitiesAndEquity?.toFixed(2) ?? "0.00" });
      allRows.push({ Section: "Check", Account: "Balanced", Amount: data.isBalanced ? "Yes" : "No" });
      rows = allRows;
      fileName = "balance-sheet";
    } else if (report === "cash-flow") {
      const startDate = from || startOfYear;
      const endDate = to || today;
      const data = await getCashFlowStatement(supabase, userCompany.companyId, startDate, endDate);
      const allRows: Array<Record<string, string>> = [];
      for (const item of data.operating) {
        allRows.push({ Section: "Operating", Item: item.label, Amount: item.amount?.toFixed(2) ?? "0.00" });
      }
      allRows.push({ Section: "Operating", Item: "Net Operating", Amount: data.netOperating?.toFixed(2) ?? "0.00" });
      for (const item of data.investing) {
        allRows.push({ Section: "Investing", Item: item.label, Amount: item.amount?.toFixed(2) ?? "0.00" });
      }
      allRows.push({ Section: "Investing", Item: "Net Investing", Amount: data.netInvesting?.toFixed(2) ?? "0.00" });
      for (const item of data.financing) {
        allRows.push({ Section: "Financing", Item: item.label, Amount: item.amount?.toFixed(2) ?? "0.00" });
      }
      allRows.push({ Section: "Financing", Item: "Net Financing", Amount: data.netFinancing?.toFixed(2) ?? "0.00" });
      allRows.push({ Section: "Summary", Item: "Net Change in Cash", Amount: data.netChange?.toFixed(2) ?? "0.00" });
      allRows.push({ Section: "Summary", Item: "Beginning Cash", Amount: data.beginningCash?.toFixed(2) ?? "0.00" });
      allRows.push({ Section: "Summary", Item: "Ending Cash", Amount: data.endingCash?.toFixed(2) ?? "0.00" });
      rows = allRows;
      fileName = "cash-flow";
    }

    // Audit log the export
    const meta = extractRequestMeta(request);
    logAuditEvent({
      supabase,
      companyId: userCompany.companyId,
      userId: userCompany.userId,
      action: "export",
      entityType: "financial_report",
      details: { report, format, from, to, row_count: rows.length },
      ipAddress: meta.ipAddress,
    });

    const dateStr = new Date().toISOString().split("T")[0];
    const fullFileName = `${fileName}_${dateStr}`;

    if (format === "csv") {
      const csv = rowsToCsv(rows);
      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="${fullFileName}.csv"`,
        },
      });
    }

    // XLSX format
    try {
      const XLSX = await import("xlsx");
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, report);
      const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

      return new NextResponse(buf, {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${fullFileName}.xlsx"`,
        },
      });
    } catch (xlsxErr) {
      console.error("XLSX generation failed, falling back to CSV:", xlsxErr);
      const csv = rowsToCsv(rows);
      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="${fullFileName}.csv"`,
        },
      });
    }
  } catch (error) {
    console.error("GET /api/financial/export error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowsToCsv(rows: Array<Record<string, any>>): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];
  for (const row of rows) {
    const values = headers.map((h) => {
      const val = row[h] ?? "";
      const str = String(val);
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    });
    lines.push(values.join(","));
  }
  return lines.join("\n");
}
