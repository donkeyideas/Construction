import { redirect } from "next/navigation";
import { FolderOpen } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getVendorDocuments } from "@/lib/queries/vendor-portal";
import { getTranslations, getLocale } from "next-intl/server";
import { formatDateSafe } from "@/lib/utils/format";

export const metadata = { title: "Documents - Buildwrk" };

export default async function VendorDocumentsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { redirect("/login/vendor"); }

  const admin = createAdminClient();
  const vendorDocs = await getVendorDocuments(admin, user.id);
  const t = await getTranslations("vendor");
  const locale = await getLocale();
  const dateLocale = locale === "es" ? "es" : "en-US";

  return (
    <div>
      <div className="fin-header">
        <div>
          <h2>{t("documentsTitle")}</h2>
          <p className="fin-header-sub">{t("documentsSubtitle")}</p>
        </div>
      </div>

      {vendorDocs.length > 0 ? (
        <div className="fin-chart-card" style={{ padding: 0 }}>
          <div style={{ overflowX: "auto" }}>
            <table className="invoice-table">
              <thead>
                <tr>
                  <th>{t("thName")}</th>
                  <th>{t("thType")}</th>
                  <th>{t("thDateShared")}</th>
                </tr>
              </thead>
              <tbody>
                {vendorDocs.map((doc: Record<string, unknown>) => {
                  const document = doc.documents as {
                    name: string;
                    file_path: string | null;
                    file_type: string | null;
                    file_size: number | null;
                    created_at: string | null;
                  } | null;

                  return (
                    <tr key={doc.id as string}>
                      <td style={{ fontWeight: 600 }}>
                        {document?.file_path ? (
                          <a
                            href={document.file_path}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: "var(--color-blue)", textDecoration: "none" }}
                          >
                            {document.name ?? t("untitled")}
                          </a>
                        ) : (
                          document?.name ?? t("untitled")
                        )}
                      </td>
                      <td style={{ color: "var(--muted)", fontSize: "0.82rem" }}>
                        {document?.file_type ?? "--"}
                      </td>
                      <td>
                        {doc.shared_at
                          ? formatDateSafe(doc.shared_at as string)
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
            <div className="fin-empty-icon"><FolderOpen size={48} /></div>
            <div className="fin-empty-title">{t("noDocumentsFound")}</div>
            <div className="fin-empty-desc">{t("noDocumentsDesc")}</div>
          </div>
        </div>
      )}
    </div>
  );
}
