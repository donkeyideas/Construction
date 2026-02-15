import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isPlatformAdmin } from "@/lib/queries/super-admin";
import {
  getPlatformSeoOverview,
  getCmsPagesSeoAudit,
  getTechnicalSeoChecks,
  getContentAnalysis,
  getKeywordsByIntent,
  getKeywordPositionDistribution,
  getPlatformGeoPresence,
  generateSeoRecommendations,
} from "@/lib/queries/super-admin-seo";
import SeoClient from "./SeoClient";

export const metadata = {
  title: "SEO & GEO - Super Admin - Buildwrk",
};

export default async function SuperAdminSeoPage() {
  const supabase = await createClient();
  const isAdmin = await isPlatformAdmin(supabase);
  if (!isAdmin) redirect("/dashboard");

  // Also fetch raw keywords for the Overview keyword table
  const { data: keywords } = await supabase
    .from("seo_keywords")
    .select("*")
    .order("search_volume", { ascending: false });

  const [overview, pages, technical, content, intentData, positionData, geo, recommendations] =
    await Promise.all([
      getPlatformSeoOverview(supabase),
      getCmsPagesSeoAudit(supabase),
      getTechnicalSeoChecks(supabase),
      getContentAnalysis(supabase),
      getKeywordsByIntent(supabase),
      getKeywordPositionDistribution(supabase),
      getPlatformGeoPresence(supabase),
      generateSeoRecommendations(supabase),
    ]);

  return (
    <SeoClient
      overview={overview}
      pages={pages}
      technical={technical}
      content={content}
      intentData={intentData}
      positionData={positionData}
      geo={geo}
      recommendations={recommendations}
      keywords={keywords ?? []}
    />
  );
}
