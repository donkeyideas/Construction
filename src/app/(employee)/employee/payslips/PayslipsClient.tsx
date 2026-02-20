"use client";

import { useState } from "react";
import {
  DollarSign,
  ChevronDown,
  ChevronRight,
  Receipt,
  Landmark,
  Minus,
} from "lucide-react";
import type { EmployeePayslip } from "@/lib/queries/employee-portal";
import { formatCurrency } from "@/lib/utils/format";

interface PayslipsClientProps {
  payslips: EmployeePayslip[];
}

export default function PayslipsClient({ payslips }: PayslipsClientProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function formatPeriod(start: string, end: string): string {
    const s = new Date(start + "T00:00:00").toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    const e = new Date(end + "T00:00:00").toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    return `${s} - ${e}`;
  }

  // Compute totals
  const totalNetPay = payslips.reduce((sum, p) => sum + p.net_pay, 0);
  const totalGross = payslips.reduce((sum, p) => sum + p.gross_pay, 0);

  return (
    <div>
      {/* Header */}
      <div className="fin-header">
        <div>
          <h2>Payslips</h2>
          <p className="fin-header-sub">View your pay history and breakdowns</p>
        </div>
      </div>

      {/* Summary Cards */}
      {payslips.length > 0 && (
        <div className="emp-payslip-summary">
          <div className="fin-chart-card emp-summary-card">
            <div className="emp-summary-label">
              <DollarSign size={14} />
              Year-to-Date Net
            </div>
            <div className="emp-summary-value">{formatCurrency(totalNetPay)}</div>
          </div>
          <div className="fin-chart-card emp-summary-card">
            <div className="emp-summary-label">
              <Landmark size={14} />
              Year-to-Date Gross
            </div>
            <div className="emp-summary-value">{formatCurrency(totalGross)}</div>
          </div>
          <div className="fin-chart-card emp-summary-card">
            <div className="emp-summary-label">
              <Receipt size={14} />
              Pay Stubs
            </div>
            <div className="emp-summary-value">{payslips.length}</div>
          </div>
        </div>
      )}

      {payslips.length > 0 ? (
        <div className="fin-chart-card" style={{ padding: 0 }}>
          <div style={{ overflowX: "auto" }}>
            <table className="invoice-table">
              <thead>
                <tr>
                  <th style={{ width: 30 }}></th>
                  <th>Pay Period</th>
                  <th>Pay Date</th>
                  <th className="amount-col">Gross Pay</th>
                  <th className="amount-col">Taxes</th>
                  <th className="amount-col">Deductions</th>
                  <th className="amount-col">Net Pay</th>
                </tr>
              </thead>
              <tbody>
                {payslips.map((slip) => {
                  const isExpanded = expandedId === slip.id;
                  return (
                    <>
                      <tr
                        key={slip.id}
                        onClick={() => toggleExpand(slip.id)}
                        style={{ cursor: "pointer" }}
                      >
                        <td>
                          {isExpanded ? (
                            <ChevronDown size={16} style={{ color: "var(--muted)" }} />
                          ) : (
                            <ChevronRight size={16} style={{ color: "var(--muted)" }} />
                          )}
                        </td>
                        <td style={{ fontWeight: 600, whiteSpace: "nowrap" }}>
                          {formatPeriod(slip.period_start, slip.period_end)}
                        </td>
                        <td style={{ whiteSpace: "nowrap" }}>
                          {formatDate(slip.pay_date)}
                        </td>
                        <td className="amount-col">{formatCurrency(slip.gross_pay)}</td>
                        <td className="amount-col" style={{ color: "var(--color-red)" }}>
                          -{formatCurrency(slip.total_taxes)}
                        </td>
                        <td className="amount-col" style={{ color: "var(--color-red)" }}>
                          -{formatCurrency(slip.total_deductions)}
                        </td>
                        <td className="amount-col" style={{ fontWeight: 700 }}>
                          {formatCurrency(slip.net_pay)}
                        </td>
                      </tr>

                      {/* Expanded breakdown */}
                      {isExpanded && (
                        <tr key={`${slip.id}-detail`} className="emp-payslip-detail-row">
                          <td colSpan={7} style={{ padding: 0 }}>
                            <div className="emp-payslip-breakdown">
                              <div className="emp-breakdown-section">
                                <h4 className="emp-breakdown-title">
                                  <Landmark size={14} />
                                  Tax Withholdings
                                </h4>
                                <div className="emp-breakdown-lines">
                                  <div className="emp-breakdown-line">
                                    <span>Federal Income Tax</span>
                                    <span>
                                      <Minus size={10} /> {formatCurrency(slip.federal_income_tax)}
                                    </span>
                                  </div>
                                  <div className="emp-breakdown-line">
                                    <span>State Income Tax</span>
                                    <span>
                                      <Minus size={10} /> {formatCurrency(slip.state_income_tax)}
                                    </span>
                                  </div>
                                  <div className="emp-breakdown-line">
                                    <span>Social Security</span>
                                    <span>
                                      <Minus size={10} /> {formatCurrency(slip.social_security_employee)}
                                    </span>
                                  </div>
                                  <div className="emp-breakdown-line">
                                    <span>Medicare</span>
                                    <span>
                                      <Minus size={10} /> {formatCurrency(slip.medicare_employee)}
                                    </span>
                                  </div>
                                  <div className="emp-breakdown-line emp-breakdown-total">
                                    <span>Total Taxes</span>
                                    <span>{formatCurrency(slip.total_taxes)}</span>
                                  </div>
                                </div>
                              </div>

                              {(slip.pretax_deductions > 0 || slip.posttax_deductions > 0) && (
                                <div className="emp-breakdown-section">
                                  <h4 className="emp-breakdown-title">
                                    <Receipt size={14} />
                                    Deductions
                                  </h4>
                                  <div className="emp-breakdown-lines">
                                    {slip.pretax_deductions > 0 && (
                                      <div className="emp-breakdown-line">
                                        <span>Pre-tax Deductions</span>
                                        <span>
                                          <Minus size={10} /> {formatCurrency(slip.pretax_deductions)}
                                        </span>
                                      </div>
                                    )}
                                    {slip.posttax_deductions > 0 && (
                                      <div className="emp-breakdown-line">
                                        <span>Post-tax Deductions</span>
                                        <span>
                                          <Minus size={10} /> {formatCurrency(slip.posttax_deductions)}
                                        </span>
                                      </div>
                                    )}
                                    <div className="emp-breakdown-line emp-breakdown-total">
                                      <span>Total Deductions</span>
                                      <span>{formatCurrency(slip.total_deductions)}</span>
                                    </div>
                                  </div>
                                </div>
                              )}

                              <div className="emp-breakdown-section emp-breakdown-net">
                                <div className="emp-breakdown-line emp-breakdown-total">
                                  <span>Net Pay</span>
                                  <span style={{ fontSize: "1.1rem" }}>
                                    {formatCurrency(slip.net_pay)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="fin-chart-card">
          <div className="fin-empty">
            <div className="fin-empty-icon">
              <DollarSign size={48} />
            </div>
            <div className="fin-empty-title">No Payslips Yet</div>
            <div className="fin-empty-desc">
              Your pay stubs will appear here after your first payroll is processed.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
