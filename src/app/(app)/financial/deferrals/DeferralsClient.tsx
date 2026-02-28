"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  CalendarRange,
  CheckCircle2,
  Clock,
  DollarSign,
  Play,
  ArrowRight,
  Filter,
} from "lucide-react";

/* ───── types ───── */
interface DeferralScheduleRow {
  id: string;
  invoice_id: string;
  schedule_date: string;
  monthly_amount: number;
  status: string;
  invoice?: {
    invoice_number: string;
    invoice_type: string;
    vendor_name: string | null;
    client_name: string | null;
    total_amount: number;
    deferral_start_date: string | null;
    deferral_end_date: string | null;
  };
}

interface DeferredInvoice {
  id: string;
  invoice_number: string;
  invoice_type: string;
  vendor_name: string | null;
  client_name: string | null;
  total_amount: number;
  deferral_start_date: string | null;
  deferral_end_date: string | null;
}

interface DeferralsClientProps {
  schedule: DeferralScheduleRow[];
  deferredInvoices: DeferredInvoice[];
}

/* ───── helpers ───── */
function monthKey(d: string) {
  return d.slice(0, 7); // "YYYY-MM"
}

function fmtMonth(ym: string) {
  const [y, m] = ym.split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[parseInt(m, 10) - 1]} ${y}`;
}

function fmtCurrency(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}

/* ───── component ───── */
export default function DeferralsClient({ schedule, deferredInvoices }: DeferralsClientProps) {
  const router = useRouter();
  const t = useTranslations("financial");
  const [recognizing, setRecognizing] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "revenue" | "expense">("all");

  /* Build waterfall data: group schedule rows by invoice, columns = months */
  const { invoiceMap, monthColumns, kpis } = useMemo(() => {
    // Collect all unique months across all schedule rows
    const monthSet = new Set<string>();
    const byInvoice = new Map<string, { invoice: DeferralScheduleRow["invoice"]; rows: Map<string, DeferralScheduleRow> }>();

    for (const row of schedule) {
      const mk = monthKey(row.schedule_date);
      monthSet.add(mk);

      if (!byInvoice.has(row.invoice_id)) {
        byInvoice.set(row.invoice_id, { invoice: row.invoice, rows: new Map() });
      }
      byInvoice.get(row.invoice_id)!.rows.set(mk, row);
    }

    // Also include deferred invoices without schedule rows yet
    for (const inv of deferredInvoices) {
      if (!byInvoice.has(inv.id)) {
        byInvoice.set(inv.id, {
          invoice: {
            invoice_number: inv.invoice_number,
            invoice_type: inv.invoice_type,
            vendor_name: inv.vendor_name,
            client_name: inv.client_name,
            total_amount: inv.total_amount,
            deferral_start_date: inv.deferral_start_date,
            deferral_end_date: inv.deferral_end_date,
          },
          rows: new Map(),
        });
      }
    }

    const months = Array.from(monthSet).sort();

    // KPIs
    let totalDeferred = 0;
    let totalRecognized = 0;
    let totalPending = 0;

    for (const row of schedule) {
      totalDeferred += row.monthly_amount;
      if (row.status === "recognized") {
        totalRecognized += row.monthly_amount;
      } else {
        totalPending += row.monthly_amount;
      }
    }

    return {
      invoiceMap: byInvoice,
      monthColumns: months,
      kpis: { totalDeferred, totalRecognized, totalPending, invoiceCount: byInvoice.size },
    };
  }, [schedule, deferredInvoices]);

  /* Filter invoices by type */
  const filteredInvoices = useMemo(() => {
    const entries = Array.from(invoiceMap.entries());
    if (filter === "all") return entries;
    return entries.filter(([, data]) => {
      if (filter === "revenue") return data.invoice?.invoice_type === "receivable";
      return data.invoice?.invoice_type === "payable";
    });
  }, [invoiceMap, filter]);

  /* Recognize a single month */
  async function handleRecognize(rowId: string) {
    setRecognizing(rowId);
    try {
      const res = await fetch("/api/financial/deferrals/recognize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schedule_id: rowId }),
      });
      if (res.ok) {
        router.refresh();
      }
    } catch {
      // silent
    } finally {
      setRecognizing(null);
    }
  }

  /* Determine visible month window (show ±3 months from current) */
  const currentMonth = new Date().toISOString().slice(0, 7);
  const visibleMonths = useMemo(() => {
    if (monthColumns.length <= 12) return monthColumns;
    const idx = monthColumns.indexOf(currentMonth);
    const center = idx >= 0 ? idx : Math.floor(monthColumns.length / 2);
    const start = Math.max(0, center - 5);
    const end = Math.min(monthColumns.length, start + 12);
    return monthColumns.slice(start, end);
  }, [monthColumns, currentMonth]);

  return (
    <div>
      {/* Header */}
      <div className="fin-header">
        <div>
          <h2>{t("deferrals.title")}</h2>
          <p className="fin-header-sub">{t("deferrals.subtitle")}</p>
        </div>
      </div>

      {/* KPI Cards — matches Transactions page pattern */}
      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: 20 }}>
        <div className="card kpi">
          <div className="kpi-info">
            <span className="kpi-label">{t("deferrals.deferredInvoices")}</span>
            <span className="kpi-value">{kpis.invoiceCount}</span>
          </div>
          <div className="kpi-icon" style={{ color: "var(--color-blue)" }}>
            <CalendarRange size={22} />
          </div>
        </div>
        <div className="card kpi">
          <div className="kpi-info">
            <span className="kpi-label">{t("deferrals.totalScheduled")}</span>
            <span className="kpi-value" style={{ color: "var(--color-amber)", fontSize: "1.4rem" }}>
              {fmtCurrency(kpis.totalDeferred)}
            </span>
          </div>
          <div className="kpi-icon" style={{ color: "var(--color-amber)" }}>
            <DollarSign size={22} />
          </div>
        </div>
        <div className="card kpi">
          <div className="kpi-info">
            <span className="kpi-label">{t("deferrals.recognized")}</span>
            <span className="kpi-value" style={{ color: "var(--color-green)", fontSize: "1.4rem" }}>
              {fmtCurrency(kpis.totalRecognized)}
            </span>
          </div>
          <div className="kpi-icon" style={{ color: "var(--color-green)" }}>
            <CheckCircle2 size={22} />
          </div>
        </div>
        <div className="card kpi">
          <div className="kpi-info">
            <span className="kpi-label">{t("deferrals.pending")}</span>
            <span className="kpi-value" style={{ color: "var(--color-amber)", fontSize: "1.4rem" }}>
              {fmtCurrency(kpis.totalPending)}
            </span>
          </div>
          <div className="kpi-icon" style={{ color: "var(--color-amber)" }}>
            <Clock size={22} />
          </div>
        </div>
      </div>

      {/* Waterfall Table — wrapped in card like Transactions page */}
      <div className="card" style={{ padding: 0 }}>
        <div className="section-txn-header">
          <div className="card-title" style={{ marginBottom: 0 }}>
            <CalendarRange size={16} style={{ color: "var(--color-blue)" }} />
            {t("deferrals.scheduleTitle")}
          </div>
          <div className="section-txn-filter">
            <Filter size={13} />
            <select
              className="section-txn-select"
              value={filter}
              onChange={(e) => setFilter(e.target.value as "all" | "revenue" | "expense")}
            >
              <option value="all">{t("deferrals.allTypes")}</option>
              <option value="revenue">{t("deferrals.revenueOnly")}</option>
              <option value="expense">{t("deferrals.expenseOnly")}</option>
            </select>
          </div>
        </div>

        {filteredInvoices.length === 0 ? (
          <div className="section-txn-empty">
            <CalendarRange size={40} style={{ color: "var(--muted)", marginBottom: 12 }} />
            <p style={{ margin: 0 }}>{t("deferrals.emptyDesc")}</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="invoice-table section-txn-table" style={{ minWidth: visibleMonths.length * 100 + 320 }}>
              <thead>
                <tr>
                  <th style={{ position: "sticky", left: 0, background: "var(--bg)", zIndex: 2, minWidth: 200 }}>{t("deferrals.invoice")}</th>
                  <th style={{ position: "sticky", left: 200, background: "var(--bg)", zIndex: 2, minWidth: 120 }}>{t("deferrals.total")}</th>
                  {visibleMonths.map((m) => (
                    <th
                      key={m}
                      style={{
                        textAlign: "center",
                        minWidth: 100,
                        background: m === currentMonth ? "rgba(29, 78, 216, 0.08)" : undefined,
                      }}
                    >
                      {fmtMonth(m)}
                      {m === currentMonth && <ArrowRight size={12} style={{ marginLeft: 4, verticalAlign: "middle" }} />}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map(([invoiceId, data]) => {
                  const inv = data.invoice;
                  const name = inv?.invoice_type === "receivable" ? inv.client_name : inv?.vendor_name;
                  return (
                    <tr key={invoiceId}>
                      <td style={{ position: "sticky", left: 0, background: "var(--bg)", zIndex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>{inv?.invoice_number ?? "\u2014"}</div>
                        <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                          {name ?? "\u2014"}
                          <span
                            className="section-txn-source-badge"
                            style={{ marginLeft: 6, fontSize: "0.65rem" }}
                          >
                            {inv?.invoice_type === "receivable" ? t("deferrals.revenue") : t("deferrals.expense")}
                          </span>
                        </div>
                      </td>
                      <td style={{ position: "sticky", left: 200, background: "var(--bg)", zIndex: 1, fontWeight: 600 }}>
                        {fmtCurrency(inv?.total_amount ?? 0)}
                      </td>
                      {visibleMonths.map((m) => {
                        const cell = data.rows.get(m);
                        if (!cell) {
                          return <td key={m} style={{ textAlign: "center", color: "var(--muted)", fontSize: "0.8rem" }}>{"\u2014"}</td>;
                        }

                        const isRecognized = cell.status === "recognized";
                        const isCurrent = m === currentMonth && !isRecognized;

                        return (
                          <td
                            key={m}
                            style={{
                              textAlign: "center",
                              background: isRecognized
                                ? "rgba(22, 163, 74, 0.08)"
                                : isCurrent
                                  ? "rgba(180, 83, 9, 0.08)"
                                  : undefined,
                              borderRadius: 4,
                            }}
                          >
                            <div style={{ fontSize: "0.85rem", fontWeight: 500 }}>
                              {fmtCurrency(cell.monthly_amount)}
                            </div>
                            {isRecognized ? (
                              <CheckCircle2 size={13} style={{ color: "var(--color-green)", marginTop: 2 }} />
                            ) : isCurrent ? (
                              <button
                                className="ui-btn ui-btn-primary ui-btn-sm"
                                style={{
                                  fontSize: "0.65rem",
                                  padding: "2px 8px",
                                  marginTop: 2,
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 3,
                                }}
                                disabled={recognizing === cell.id}
                                onClick={() => handleRecognize(cell.id)}
                              >
                                <Play size={10} />
                                {recognizing === cell.id ? "..." : t("deferrals.recognize")}
                              </button>
                            ) : (
                              <Clock size={11} style={{ color: "var(--muted)", marginTop: 2 }} />
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
