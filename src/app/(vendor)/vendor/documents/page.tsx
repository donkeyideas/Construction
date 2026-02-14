import { redirect } from "next/navigation";
import { FolderOpen } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getVendorDocuments } from "@/lib/queries/vendor-portal";

export const metadata = { title: "Documents - ConstructionERP" };

export default async function VendorDocumentsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { redirect("/login/vendor"); }

  const vendorDocs = await getVendorDocuments(supabase, user.id);

  return (
    <div>
      <div className="fin-header">
        <div>
          <h2>Documents</h2>
          <p className="fin-header-sub">Documents shared with you by the company.</p>
        </div>
      </div>

      {vendorDocs.length > 0 ? (
        <div className="fin-chart-card" style={{ padding: 0 }}>
          <div style={{ overflowX: "auto" }}>
            <table className="invoice-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Date Shared</th>
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
                            {document.name ?? "Untitled"}
                          </a>
                        ) : (
                          document?.name ?? "Untitled"
                        )}
                      </td>
                      <td style={{ color: "var(--muted)", fontSize: "0.82rem" }}>
                        {document?.file_type ?? "--"}
                      </td>
                      <td>
                        {doc.shared_at
                          ? new Date(doc.shared_at as string).toLocaleDateString("en-US", {
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
            <div className="fin-empty-icon"><FolderOpen size={48} /></div>
            <div className="fin-empty-title">No Documents Found</div>
            <div className="fin-empty-desc">No documents have been shared with you yet.</div>
          </div>
        </div>
      )}
    </div>
  );
}
