import { redirect } from "next/navigation";
import { Camera } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getTranslations, getLocale } from "next-intl/server";
import PhotosClient from "./PhotosClient";

export const metadata = {
  title: "Photos - Buildwrk",
};

export default async function PhotosPage() {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    redirect("/login");
  }

  const { companyId } = userCompany;
  const t = await getTranslations("mobile.photos");
  const locale = await getLocale();
  const dateLocale = locale === "es" ? "es" : "en-US";

  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, code")
    .eq("company_id", companyId)
    .in("status", ["active", "pre_construction"])
    .order("name", { ascending: true });

  const { data: photos } = await supabase
    .from("documents")
    .select(
      "id, name, file_path, file_type, created_at, project_id, projects(name)"
    )
    .eq("company_id", companyId)
    .eq("category", "photo")
    .order("created_at", { ascending: false })
    .limit(30);

  const projectList = (projects ?? []) as Array<{
    id: string;
    name: string;
    code: string;
  }>;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const photoList = (photos ?? []).map((photo: any) => ({
    id: photo.id as string,
    name: photo.name as string,
    filePath: photo.file_path as string,
    fileType: photo.file_type as string,
    createdAt: photo.created_at as string,
    projectName:
      (photo.projects as { name: string } | null)?.name ?? null,
  }));

  return (
    <div>
      <div className="mobile-header">
        <div>
          <h2>{t("title")}</h2>
          <div className="mobile-header-date">
            {new Date().toLocaleDateString(dateLocale, {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </div>
        </div>
      </div>

      <PhotosClient projects={projectList} />

      <div className="mobile-section-title">
        {t("recentPhotos", { count: photoList.length })}
      </div>

      {photoList.length === 0 ? (
        <div className="mobile-card">
          <div className="mobile-empty">
            <Camera
              size={32}
              style={{ marginBottom: "8px", color: "var(--muted)" }}
            />
            <div>{t("noPhotosYet")}</div>
            <div style={{ fontSize: "0.75rem", marginTop: "4px" }}>
              {t("captureHint")}
            </div>
          </div>
        </div>
      ) : (
        <div className="photo-grid">
          {photoList.map(
            (photo: {
              id: string;
              name: string;
              filePath: string;
              createdAt: string;
              projectName: string | null;
            }) => (
              <div key={photo.id} className="photo-thumb">
                <div style={{ padding: "4px", textAlign: "center" }}>
                  <Camera size={16} style={{ marginBottom: "2px" }} />
                  <div className="photo-thumb-meta">
                    {photo.projectName
                      ? photo.projectName.slice(0, 12)
                      : t("untagged")}
                  </div>
                  <div className="photo-thumb-meta">
                    {new Date(photo.createdAt).toLocaleDateString(dateLocale, {
                      month: "short",
                      day: "numeric",
                    })}
                  </div>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
