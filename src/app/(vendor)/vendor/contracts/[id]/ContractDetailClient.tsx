"use client";

import Link from "next/link";
import { ArrowLeft, ShieldCheck, ShieldAlert } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { VendorContractDetail } from "@/lib/queries/vendor-portal";
import "@/styles/vendor-detail.css";

export default function ContractDetailClient({ contract }: { contract: VendorContractDetail }) {
  const locale = useLocale();
  const t = useTranslations("vendor");
  const dateLocale = locale === "es" ? "es" : "en-US";

  const fmt = (n: number) =>
    new Intl.NumberFormat(dateLocale, { style: "currency", currency: "USD" }).format(n);

  const fmtDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString(dateLocale) : "\u2014";

  const totalInvoiced = contract.invoices.reduce((sum, inv) => sum + inv.total_amount, 0);
  const remaining = contract.amount - totalInvoiced;

  return (
    <div>
      <Link href="/vendor/contracts" className="vd-back">
        <ArrowLeft size={16} /> {t("contractDetail.backToContracts")}
      </Link>

      <div className="vd-header">
        <div className="vd-header-left">
          <h2>{contract.title}</h2>
          <span className="vd-header-sub">
            {contract.contract_number || t("contractDetail.noContractNumber")}
            {contract.project_name ? ` \u00b7 ${contract.project_name}` : ""}
          </span>
        </div>
        <span className={`vd-badge vd-badge-${contract.status}`}>{contract.status}</span>
      </div>

      {/* Summary Cards */}
      <div className="vd-cards">
        <div className="vd-card">
          <div className="vd-card-label">{t("thContractAmount")}</div>
          <div className="vd-card-value">{fmt(contract.amount)}</div>
        </div>
        <div className="vd-card">
          <div className="vd-card-label">{t("contractDetail.retention")}</div>
          <div className="vd-card-value">{contract.retention_pct}%</div>
        </div>
        <div className="vd-card">
          <div className="vd-card-label">{t("contractDetail.invoiced")}</div>
          <div className="vd-card-value">{fmt(totalInvoiced)}</div>
        </div>
        <div className="vd-card">
          <div className="vd-card-label">{t("contractDetail.remaining")}</div>
          <div className="vd-card-value" style={{ color: remaining > 0 ? "var(--color-blue)" : "var(--color-green)" }}>
            {fmt(remaining)}
          </div>
        </div>
      </div>

      {/* Contract Details */}
      <div className="vd-section">
        <div className="vd-section-title">{t("contractDetail.detailsTitle")}</div>
        <div className="vd-grid">
          <div>
            <div className="vd-field-label">{t("thType")}</div>
            <div className="vd-field-value" style={{ textTransform: "capitalize" }}>
              {contract.contract_type?.replace(/_/g, " ") || "\u2014"}
            </div>
          </div>
          <div>
            <div className="vd-field-label">{t("thProject")}</div>
            <div className="vd-field-value">{contract.project_name || "\u2014"}</div>
          </div>
          <div>
            <div className="vd-field-label">{t("thStartDate")}</div>
            <div className="vd-field-value">{fmtDate(contract.start_date)}</div>
          </div>
          <div>
            <div className="vd-field-label">{t("thEndDate")}</div>
            <div className="vd-field-value">{fmtDate(contract.end_date)}</div>
          </div>
          <div>
            <div className="vd-field-label">{t("contractDetail.insurance")}</div>
            <div className="vd-field-value" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              {contract.insurance_required ? (
                <>
                  <ShieldCheck size={14} style={{ color: "var(--color-green)" }} />
                  {t("contractDetail.insuranceRequired")} {contract.insurance_expiry ? `(${t("contractDetail.expires")} ${fmtDate(contract.insurance_expiry)})` : ""}
                </>
              ) : (
                <>
                  <ShieldAlert size={14} style={{ color: "var(--muted)" }} />
                  {t("contractDetail.insuranceNotRequired")}
                </>
              )}
            </div>
          </div>
          {contract.scope_of_work && (
            <div style={{ gridColumn: "1 / -1" }}>
              <div className="vd-field-label">{t("contractDetail.scopeOfWork")}</div>
              <div className="vd-field-value" style={{ whiteSpace: "pre-wrap" }}>{contract.scope_of_work}</div>
            </div>
          )}
        </div>
      </div>

      {/* Related Invoices */}
      <div className="vd-section">
        <div className="vd-section-title">{t("contractDetail.invoicesSection")}</div>
        {contract.invoices.length === 0 ? (
          <div className="vd-table-empty">{t("contractDetail.noInvoicesYet")}</div>
        ) : (
          <table className="vd-table">
            <thead>
              <tr>
                <th>{t("thInvoiceNumber")}</th>
                <th>{t("thDate")}</th>
                <th>{t("thAmount")}</th>
                <th>{t("thBalanceDue")}</th>
                <th>{t("thStatus")}</th>
              </tr>
            </thead>
            <tbody>
              {contract.invoices.map((inv) => (
                <tr key={inv.id}>
                  <td>
                    <Link href={`/vendor/invoices/${inv.id}`} className="vd-table-link">
                      {inv.invoice_number}
                    </Link>
                  </td>
                  <td>{fmtDate(inv.invoice_date)}</td>
                  <td>{fmt(inv.total_amount)}</td>
                  <td>{fmt(inv.balance_due)}</td>
                  <td><span className={`vd-badge vd-badge-${inv.status}`}>{inv.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
