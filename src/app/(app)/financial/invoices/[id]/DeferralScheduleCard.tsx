"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarRange, CheckCircle2, Clock, ChevronLeft, ChevronRight, TrendingUp } from "lucide-react";
import { formatCurrency, formatDateLong } from "@/lib/utils/format";

interface ScheduleRow {
  id: string;
  schedule_date: string;
  monthly_amount: number;
  status: string;
}

interface Props {
  invoiceId: string;
  deferralStartDate?: string | null;
  deferralEndDate?: string | null;
  schedule: ScheduleRow[];
  totalAmount: number;
}

const PAGE_SIZE = 6;

function formatDateSafe(val: string | null | undefined): string {
  if (!val) return "--";
  try { return formatDateLong(val); } catch { return val; }
}

export default function DeferralScheduleCard({
  invoiceId,
  deferralStartDate,
  deferralEndDate,
  schedule,
  totalAmount,
}: Props) {
  const [page, setPage] = useState(0);

  const hasDates = !!(deferralStartDate && deferralEndDate);
  const totalPages = Math.ceil(schedule.length / PAGE_SIZE);
  const pageRows = schedule.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const recognizedCount = schedule.filter((r) => r.status === "recognized").length;
  const recognizedTotal = schedule
    .filter((r) => r.status === "recognized")
    .reduce((s, r) => s + Number(r.monthly_amount), 0);
  const scheduledTotal = schedule
    .filter((r) => r.status !== "recognized")
    .reduce((s, r) => s + Number(r.monthly_amount), 0);
  const scheduleSum = schedule.reduce((s, r) => s + Number(r.monthly_amount), 0);
  const pctRecognized = scheduleSum > 0 ? Math.round((recognizedTotal / scheduleSum) * 100) : 0;

  return (
    <div className="fin-chart-card" style={{ padding: 0, marginBottom: 24 }}>
      {/* Header */}
      <div style={{
        padding: "16px 20px",
        borderBottom: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}>
        <CalendarRange size={16} style={{ color: "var(--color-blue)" }} />
        <div className="card-title" style={{ marginBottom: 0 }}>Deferred Revenue Schedule</div>
        {hasDates ? (
          <span style={{ marginLeft: "auto", fontSize: "0.78rem", color: "var(--muted)" }}>
            {formatDateSafe(deferralStartDate)} — {formatDateSafe(deferralEndDate)}
          </span>
        ) : (
          <Link
            href={`/financial/invoices/${invoiceId}/edit`}
            style={{ marginLeft: "auto", fontSize: "0.78rem", color: "var(--color-blue)", textDecoration: "none", fontWeight: 500 }}
          >
            Enable on Edit →
          </Link>
        )}
      </div>

      {schedule.length > 0 ? (
        <>
          {/* KPI summary row */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 0,
            borderBottom: "1px solid var(--border)",
          }}>
            {[
              {
                label: "Total Deferred",
                value: formatCurrency(scheduleSum),
                sub: `${schedule.length} months`,
                color: "var(--fg)",
              },
              {
                label: "Recognized",
                value: formatCurrency(recognizedTotal),
                sub: `${recognizedCount} of ${schedule.length} months`,
                color: "var(--color-green)",
              },
              {
                label: "Remaining",
                value: formatCurrency(scheduledTotal),
                sub: `${schedule.length - recognizedCount} months left`,
                color: "var(--color-amber)",
              },
            ].map((kpi, i) => (
              <div
                key={kpi.label}
                style={{
                  padding: "14px 20px",
                  borderRight: i < 2 ? "1px solid var(--border)" : "none",
                }}
              >
                <div style={{ fontSize: "0.72rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
                  {kpi.label}
                </div>
                <div style={{ fontSize: "1.1rem", fontWeight: 700, color: kpi.color }}>{kpi.value}</div>
                <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: 2 }}>{kpi.sub}</div>
              </div>
            ))}
          </div>

          {/* Progress bar */}
          <div style={{ padding: "10px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10 }}>
            <TrendingUp size={13} style={{ color: "var(--color-green)", flexShrink: 0 }} />
            <div style={{ flex: 1, height: 6, borderRadius: 3, background: "var(--border)", overflow: "hidden" }}>
              <div style={{
                height: "100%",
                width: `${pctRecognized}%`,
                background: "var(--color-green)",
                borderRadius: 3,
                transition: "width 0.3s ease",
              }} />
            </div>
            <span style={{ fontSize: "0.75rem", color: "var(--muted)", whiteSpace: "nowrap" }}>
              {pctRecognized}% recognized
            </span>
          </div>

          {/* Table */}
          <div style={{ overflowX: "auto" }}>
            <table className="invoice-table">
              <thead>
                <tr>
                  <th style={{ width: 32, textAlign: "center" }}>#</th>
                  <th>Month</th>
                  <th style={{ textAlign: "right" }}>Amount</th>
                  <th style={{ textAlign: "center" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row, i) => {
                  const globalIdx = page * PAGE_SIZE + i + 1;
                  const isRecognized = row.status === "recognized";
                  return (
                    <tr key={row.id} style={{ opacity: isRecognized ? 0.7 : 1 }}>
                      <td style={{ textAlign: "center", color: "var(--muted)", fontSize: "0.78rem" }}>
                        {globalIdx}
                      </td>
                      <td style={{ fontWeight: 500 }}>{formatDateSafe(row.schedule_date)}</td>
                      <td style={{ textAlign: "right", fontWeight: 600 }}>
                        {formatCurrency(row.monthly_amount)}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        {isRecognized ? (
                          <span style={{
                            display: "inline-flex", alignItems: "center", gap: 4,
                            color: "var(--color-green)", fontSize: "0.8rem", fontWeight: 600,
                            background: "rgba(34,197,94,0.08)", padding: "2px 8px", borderRadius: 20,
                          }}>
                            <CheckCircle2 size={12} />
                            Recognized
                          </span>
                        ) : (
                          <span style={{
                            display: "inline-flex", alignItems: "center", gap: 4,
                            color: "var(--color-amber)", fontSize: "0.8rem",
                            background: "rgba(245,158,11,0.08)", padding: "2px 8px", borderRadius: 20,
                          }}>
                            <Clock size={12} />
                            Scheduled
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {/* Footer totals row */}
              <tfoot>
                <tr style={{ borderTop: "2px solid var(--border)" }}>
                  <td />
                  <td style={{ fontWeight: 600, fontSize: "0.82rem" }}>
                    Total — {schedule.length} months
                  </td>
                  <td style={{ textAlign: "right", fontWeight: 700 }}>
                    {formatCurrency(scheduleSum)}
                  </td>
                  <td style={{ textAlign: "center", fontSize: "0.75rem", color: "var(--muted)" }}>
                    {recognizedCount}/{schedule.length} done
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{
              padding: "12px 20px",
              borderTop: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}>
              <span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>
                Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, schedule.length)} of {schedule.length} months
              </span>
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 4,
                    padding: "4px 10px", borderRadius: 6, border: "1px solid var(--border)",
                    background: "transparent", cursor: page === 0 ? "not-allowed" : "pointer",
                    fontSize: "0.78rem", color: page === 0 ? "var(--muted)" : "var(--fg)",
                    opacity: page === 0 ? 0.5 : 1,
                  }}
                >
                  <ChevronLeft size={13} /> Prev
                </button>
                {/* Page number pills */}
                {Array.from({ length: totalPages }, (_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setPage(i)}
                    style={{
                      width: 28, height: 28, borderRadius: 6,
                      border: i === page ? "1px solid var(--color-blue)" : "1px solid var(--border)",
                      background: i === page ? "var(--color-blue)" : "transparent",
                      color: i === page ? "#fff" : "var(--fg)",
                      fontSize: "0.78rem", fontWeight: i === page ? 700 : 400,
                      cursor: "pointer",
                    }}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page === totalPages - 1}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 4,
                    padding: "4px 10px", borderRadius: 6, border: "1px solid var(--border)",
                    background: "transparent", cursor: page === totalPages - 1 ? "not-allowed" : "pointer",
                    fontSize: "0.78rem", color: page === totalPages - 1 ? "var(--muted)" : "var(--fg)",
                    opacity: page === totalPages - 1 ? 0.5 : 1,
                  }}
                >
                  Next <ChevronRight size={13} />
                </button>
              </div>
            </div>
          )}
        </>
      ) : hasDates ? (
        <div style={{ padding: "24px 20px", textAlign: "center", color: "var(--muted)", fontSize: "0.85rem" }}>
          Deferral dates are set but no schedule has been generated yet. Edit and save the invoice to generate the schedule.
        </div>
      ) : (
        <div style={{ padding: "20px", display: "flex", alignItems: "flex-start", gap: 12, background: "rgba(59,130,246,0.04)", borderRadius: "0 0 8px 8px" }}>
          <CalendarRange size={20} style={{ color: "var(--color-blue)", flexShrink: 0, marginTop: 2 }} />
          <div>
            <div style={{ fontSize: "0.85rem", fontWeight: 600, marginBottom: 4 }}>Deferred Revenue Treatment Not Enabled</div>
            <div style={{ fontSize: "0.82rem", color: "var(--muted)", lineHeight: 1.5 }}>
              This invoice posts revenue immediately. To spread recognition over time (e.g., retainers, prepaid contracts),{" "}
              <Link href={`/financial/invoices/${invoiceId}/edit`} style={{ color: "var(--color-blue)", textDecoration: "none", fontWeight: 500 }}>
                edit the invoice
              </Link>
              {" "}and check <strong>Deferred Revenue</strong>, then set start and end dates.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
