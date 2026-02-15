import { redirect } from "next/navigation";
import Link from "next/link";
import { FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getVendorContracts } from "@/lib/queries/vendor-portal";
import { formatCurrency } from "@/lib/utils/format";
import { getTranslations, getLocale } from "next-intl/server";

export const metadata = { title: "My Contracts - Buildwrk" };

export default async function VendorContractsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { redirect("/login/vendor"); }

  const contracts = await getVendorContracts(supabase, user.id);
  const t = await getTranslations("vendor");
  const locale = await getLocale();
  const dateLocale = locale === "es" ? "es" : "en-US";

  return (
    <div>
      <div className="fin-header">
        <div>
          <h2>{t("contractsTitle")}</h2>
          <p className="fin-header-sub">{t("contractsSubtitle")}</p>
        </div>
      </div>

      {contracts.length > 0 ? (
        <div className="fin-chart-card" style={{ padding: 0 }}>
          <div style={{ overflowX: "auto" }}>
            <table className="invoice-table">
              <thead>
                <tr>
                  <th>{t("thProject")}</th>
                  <th style={{ textAlign: "right" }}>{t("thContractAmount")}</th>
                  <th>{t("thStatus")}</th>
                  <th>{t("thStartDate")}</th>
                </tr>
              </thead>
              <tbody>
                {contracts.map((contract: Record<string, unknown>) => {
                  const project = contract.projects as { name: string } | null;
                  return (
                    <tr key={contract.id as string}>
                      <td style={{ fontWeight: 600 }}>
                        <Link
                          href={`/vendor/contracts/${contract.id}`}
                          style={{ color: "var(--color-blue)", textDecoration: "none" }}
                        >
                          {project?.name ?? t("unknownProject")}
                        </Link>
                      </td>
                      <td className="amount-col">
                        {formatCurrency((contract.amount as number) ?? 0)}
                      </td>
                      <td>
                        <span className={`inv-status inv-status-${contract.status}`}>
                          {contract.status as string}
                        </span>
                      </td>
                      <td>
                        {contract.start_date
                          ? new Date(contract.start_date as string).toLocaleDateString(dateLocale, {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })
                          : "--"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="fin-chart-card">
          <div className="fin-empty">
            <div className="fin-empty-icon"><FileText size={48} /></div>
            <div className="fin-empty-title">{t("noContractsFound")}</div>
            <div className="fin-empty-desc">{t("noContractsDesc")}</div>
          </div>
        </div>
      )}
    </div>
  );
}
