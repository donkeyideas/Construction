"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { VendorProjectDetail } from "@/lib/queries/vendor-portal";
import "@/styles/vendor-detail.css";

export default function ProjectDetailClient({ project }: { project: VendorProjectDetail }) {
  const locale = useLocale();
  const t = useTranslations("vendor");
  const dateLocale = locale === "es" ? "es" : "en-US";

  const fmt = (n: number) =>
    new Intl.NumberFormat(dateLocale, { style: "currency", currency: "USD" }).format(n);

  const fmtDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString(dateLocale) : "\u2014";

  const totalInvoiced = project.invoices.reduce((sum, inv) => sum + inv.total_amount, 0);
  const totalOwed = project.invoices.reduce((sum, inv) => sum + inv.balance_due, 0);

  return (
    <div>
      <Link href="/vendor/projects" className="vd-back">
        <ArrowLeft size={16} /> {t("projectDetail.backToProjects")}
      </Link>

      <div className="vd-header">
        <div className="vd-header-left">
          <h2>{project.name}</h2>
          <span className="vd-header-sub">
            {project.project_number || t("projectDetail.noProjectNumber")}
          </span>
        </div>
        <span className={`vd-badge vd-badge-${project.status}`}>{project.status.replace(/_/g, " ")}</span>
      </div>

      {/* Summary Cards */}
      <div className="vd-cards">
        <div className="vd-card">
          <div className="vd-card-label">{t("projectDetail.contractValue")}</div>
          <div className="vd-card-value">{project.contract ? fmt(project.contract.amount) : "\u2014"}</div>
        </div>
        <div className="vd-card">
          <div className="vd-card-label">{t("projectDetail.totalInvoiced")}</div>
          <div className="vd-card-value">{fmt(totalInvoiced)}</div>
        </div>
        <div className="vd-card">
          <div className="vd-card-label">{t("projectDetail.outstanding")}</div>
          <div className="vd-card-value" style={{ color: totalOwed > 0 ? "var(--color-amber)" : "var(--color-green)" }}>
            {fmt(totalOwed)}
          </div>
        </div>
        <div className="vd-card">
          <div className="vd-card-label">{t("projectDetail.invoicesCount")}</div>
          <div className="vd-card-value">{project.invoices.length}</div>
        </div>
      </div>

      {/* Project Details */}
      <div className="vd-section">
        <div className="vd-section-title">{t("projectDetail.detailsTitle")}</div>
        <div className="vd-grid">
          <div>
            <div className="vd-field-label">{t("thStartDate")}</div>
            <div className="vd-field-value">{fmtDate(project.start_date)}</div>
          </div>
          <div>
            <div className="vd-field-label">{t("thEndDate")}</div>
            <div className="vd-field-value">{fmtDate(project.end_date)}</div>
          </div>
          <div>
            <div className="vd-field-label">{t("thStatus")}</div>
            <div className="vd-field-value" style={{ textTransform: "capitalize" }}>{project.status.replace(/_/g, " ")}</div>
          </div>
        </div>
      </div>

      {/* Contract Info */}
      {project.contract && (
        <div className="vd-section">
          <div className="vd-section-title">{t("projectDetail.yourContract")}</div>
          <div className="vd-grid">
            <div>
              <div className="vd-field-label">{t("projectDetail.title")}</div>
              <div className="vd-field-value">
                <Link href={`/vendor/contracts/${project.contract.id}`} className="vd-table-link">
                  {project.contract.title}
                </Link>
              </div>
            </div>
            <div>
              <div className="vd-field-label">{t("projectDetail.contractNumber")}</div>
              <div className="vd-field-value">{project.contract.contract_number || "\u2014"}</div>
            </div>
            <div>
              <div className="vd-field-label">{t("thAmount")}</div>
              <div className="vd-field-value">{fmt(project.contract.amount)}</div>
            </div>
            <div>
              <div className="vd-field-label">{t("thStatus")}</div>
              <div className="vd-field-value">
                <span className={`vd-badge vd-badge-${project.contract.status}`}>{project.contract.status}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invoices */}
      <div className="vd-section">
        <div className="vd-section-title">{t("projectDetail.invoicesForProject")}</div>
        {project.invoices.length === 0 ? (
          <div className="vd-table-empty">{t("projectDetail.noInvoicesYet")}</div>
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
              {project.invoices.map((inv) => (
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
