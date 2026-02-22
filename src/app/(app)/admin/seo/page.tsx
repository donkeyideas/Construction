import { Search } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import {
  getSeoOverview,
  getPagesWithSeoIssues,
  getGeoPresence,
} from "@/lib/queries/seo";
import SeoClient from "./SeoClient";

export const metadata = {
  title: "Search & AI Management - Buildwrk",
};

export default async function SeoGeoPage() {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    return (
      <div className="content-empty">
        <div className="content-empty-icon">
          <Search size={48} />
        </div>
        <h3>Set Up Your Company</h3>
        <p>
          Complete your company registration to access SEO and geographic
          management tools.
        </p>
      </div>
    );
  }

  const { companyId } = userCompany;

  const [seoOverview, seoIssues, geoPresence] = await Promise.all([
    getSeoOverview(supabase, companyId),
    getPagesWithSeoIssues(supabase, companyId),
    getGeoPresence(supabase, companyId),
  ]);

  return (
    <div>
      {/* Header */}
      <div className="content-header">
        <div>
          <h2>Search & AI Management</h2>
          <p className="content-header-sub">
            Audit your search engine optimization and track geographic presence.
          </p>
        </div>
      </div>

      <SeoClient
        seoOverview={seoOverview}
        seoIssues={seoIssues}
        geoPresence={geoPresence}
      />
    </div>
  );
}
