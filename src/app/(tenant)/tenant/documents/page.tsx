import { redirect } from "next/navigation";
import { FolderOpen, FileText, Download } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getTenantDocuments } from "@/lib/queries/tenant-portal";

export const metadata = {
  title: "Documents - ConstructionERP",
};

export default async function TenantDocumentsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login/tenant");
  }

  const documents = await getTenantDocuments(supabase, user.id);

  function formatFileSize(bytes: number | null): string {
    if (!bytes) return "--";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <div>
      {/* Header */}
      <div className="fin-header">
        <div>
          <h2>Documents</h2>
          <p className="fin-header-sub">
            Access documents shared with you by your property manager.
          </p>
        </div>
      </div>

      {documents.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {documents.map((doc) => {
            const docInfo = doc.documents as {
              name: string;
              file_path: string;
              file_type: string;
              file_size: number;
              created_at: string;
            } | null;

            return (
              <div key={doc.id} className="card" style={{ padding: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
                    <div style={{
                      width: 40,
                      height: 40,
                      borderRadius: 8,
                      background: "var(--surface)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "var(--color-blue)",
                      flexShrink: 0,
                    }}>
                      <FileText size={20} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>
                        {docInfo?.name ?? "Untitled Document"}
                      </div>
                      <div style={{ fontSize: "0.78rem", color: "var(--muted)", display: "flex", gap: 12 }}>
                        <span>{docInfo?.file_type ?? "Unknown"}</span>
                        <span>{formatFileSize(docInfo?.file_size ?? null)}</span>
                        <span>
                          Shared{" "}
                          {doc.shared_at
                            ? new Date(doc.shared_at).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })
                            : "--"}
                        </span>
                      </div>
                    </div>
                  </div>
                  {docInfo?.file_path && (
                    <a
                      href={docInfo.file_path}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ui-btn ui-btn-sm ui-btn-outline"
                      style={{ textDecoration: "none" }}
                    >
                      <Download size={14} />
                      Download
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="fin-chart-card">
          <div className="fin-empty">
            <div className="fin-empty-icon"><FolderOpen size={48} /></div>
            <div className="fin-empty-title">No Documents</div>
            <div className="fin-empty-desc">
              No documents have been shared with you yet. Documents from your property manager will appear here.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
