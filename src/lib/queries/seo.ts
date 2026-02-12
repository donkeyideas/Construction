import type { SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SeoOverview {
  totalPages: number;
  pagesWithMetaTitle: number;
  pagesWithMetaDescription: number;
  missingMetaTitle: number;
  missingMetaDescription: number;
  avgMetaDescriptionLength: number;
  seoScore: number;
}

export interface SeoIssue {
  pageId: string;
  pageTitle: string;
  pageSlug: string;
  issueType: string;
  severity: "critical" | "warning";
  recommendation: string;
}

export interface GeoLocation {
  city: string;
  state: string;
  projectCount: number;
  propertyCount: number;
  totalValue: number;
}

export interface GeoPresence {
  locations: GeoLocation[];
  totalCities: number;
  totalStates: number;
  totalProjects: number;
  totalProperties: number;
}

// ---------------------------------------------------------------------------
// getSeoOverview - aggregate SEO stats from CMS pages
// ---------------------------------------------------------------------------

export async function getSeoOverview(
  supabase: SupabaseClient,
  companyId: string
): Promise<SeoOverview> {
  const { data: pages, error } = await supabase
    .from("cms_pages")
    .select("id, meta_title, meta_description")
    .eq("company_id", companyId);

  if (error) {
    console.error("getSeoOverview error:", error);
    return {
      totalPages: 0,
      pagesWithMetaTitle: 0,
      pagesWithMetaDescription: 0,
      missingMetaTitle: 0,
      missingMetaDescription: 0,
      avgMetaDescriptionLength: 0,
      seoScore: 0,
    };
  }

  const allPages = pages ?? [];
  const totalPages = allPages.length;

  if (totalPages === 0) {
    return {
      totalPages: 0,
      pagesWithMetaTitle: 0,
      pagesWithMetaDescription: 0,
      missingMetaTitle: 0,
      missingMetaDescription: 0,
      avgMetaDescriptionLength: 0,
      seoScore: 0,
    };
  }

  const pagesWithMetaTitle = allPages.filter(
    (p) => p.meta_title && p.meta_title.trim().length > 0
  ).length;

  const pagesWithMetaDescription = allPages.filter(
    (p) => p.meta_description && p.meta_description.trim().length > 0
  ).length;

  const missingMetaTitle = totalPages - pagesWithMetaTitle;
  const missingMetaDescription = totalPages - pagesWithMetaDescription;

  // Average meta description length (only for pages that have one)
  const descLengths = allPages
    .filter((p) => p.meta_description && p.meta_description.trim().length > 0)
    .map((p) => p.meta_description!.length);

  const avgMetaDescriptionLength =
    descLengths.length > 0
      ? Math.round(descLengths.reduce((s, l) => s + l, 0) / descLengths.length)
      : 0;

  // SEO score: 50% weight on meta titles, 50% on meta descriptions
  const titleScore = totalPages > 0 ? (pagesWithMetaTitle / totalPages) * 50 : 0;
  const descScore = totalPages > 0 ? (pagesWithMetaDescription / totalPages) * 50 : 0;
  const seoScore = Math.round(titleScore + descScore);

  return {
    totalPages,
    pagesWithMetaTitle,
    pagesWithMetaDescription,
    missingMetaTitle,
    missingMetaDescription,
    avgMetaDescriptionLength,
    seoScore,
  };
}

// ---------------------------------------------------------------------------
// getPagesWithSeoIssues - find pages missing meta title/description
// ---------------------------------------------------------------------------

export async function getPagesWithSeoIssues(
  supabase: SupabaseClient,
  companyId: string
): Promise<SeoIssue[]> {
  const { data: pages, error } = await supabase
    .from("cms_pages")
    .select("id, title, slug, meta_title, meta_description")
    .eq("company_id", companyId)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("getPagesWithSeoIssues error:", error);
    return [];
  }

  const issues: SeoIssue[] = [];

  for (const page of pages ?? []) {
    const hasTitle = page.meta_title && page.meta_title.trim().length > 0;
    const hasDesc = page.meta_description && page.meta_description.trim().length > 0;

    if (!hasTitle) {
      issues.push({
        pageId: page.id,
        pageTitle: page.title,
        pageSlug: page.slug,
        issueType: "Missing Meta Title",
        severity: "critical",
        recommendation:
          "Add a unique meta title (50-60 characters) to improve search rankings.",
      });
    }

    if (!hasDesc) {
      issues.push({
        pageId: page.id,
        pageTitle: page.title,
        pageSlug: page.slug,
        issueType: "Missing Meta Description",
        severity: "critical",
        recommendation:
          "Add a meta description (150-160 characters) to improve click-through rates.",
      });
    }

    if (hasTitle && page.meta_title!.length < 20) {
      issues.push({
        pageId: page.id,
        pageTitle: page.title,
        pageSlug: page.slug,
        issueType: "Short Meta Title",
        severity: "warning",
        recommendation:
          "Meta title is too short. Aim for 50-60 characters for best results.",
      });
    }

    if (hasTitle && page.meta_title!.length > 70) {
      issues.push({
        pageId: page.id,
        pageTitle: page.title,
        pageSlug: page.slug,
        issueType: "Long Meta Title",
        severity: "warning",
        recommendation:
          "Meta title exceeds 70 characters and may be truncated in search results.",
      });
    }

    if (hasDesc && page.meta_description!.length < 70) {
      issues.push({
        pageId: page.id,
        pageTitle: page.title,
        pageSlug: page.slug,
        issueType: "Short Meta Description",
        severity: "warning",
        recommendation:
          "Meta description is too short. Aim for 150-160 characters.",
      });
    }

    if (hasDesc && page.meta_description!.length > 170) {
      issues.push({
        pageId: page.id,
        pageTitle: page.title,
        pageSlug: page.slug,
        issueType: "Long Meta Description",
        severity: "warning",
        recommendation:
          "Meta description exceeds 170 characters and may be truncated.",
      });
    }
  }

  return issues;
}

// ---------------------------------------------------------------------------
// getGeoPresence - aggregate geographic data from projects and properties
// ---------------------------------------------------------------------------

export async function getGeoPresence(
  supabase: SupabaseClient,
  companyId: string
): Promise<GeoPresence> {
  // Fetch projects with city/state
  const { data: projects, error: projectsError } = await supabase
    .from("projects")
    .select("id, city, state, contract_amount")
    .eq("company_id", companyId);

  if (projectsError) {
    console.error("getGeoPresence projects error:", projectsError);
  }

  // Fetch properties with city/state
  const { data: properties, error: propertiesError } = await supabase
    .from("properties")
    .select("id, city, state, current_value")
    .eq("company_id", companyId);

  if (propertiesError) {
    console.error("getGeoPresence properties error:", propertiesError);
  }

  const allProjects = projects ?? [];
  const allProperties = properties ?? [];

  // Build a map of city+state -> aggregated data
  const locationMap = new Map<
    string,
    { city: string; state: string; projectCount: number; propertyCount: number; totalValue: number }
  >();

  for (const proj of allProjects) {
    if (!proj.city || !proj.state) continue;
    const key = `${proj.city.toLowerCase()}|${proj.state.toLowerCase()}`;
    const existing = locationMap.get(key) || {
      city: proj.city,
      state: proj.state,
      projectCount: 0,
      propertyCount: 0,
      totalValue: 0,
    };
    existing.projectCount += 1;
    existing.totalValue += proj.contract_amount ?? 0;
    locationMap.set(key, existing);
  }

  for (const prop of allProperties) {
    if (!prop.city || !prop.state) continue;
    const key = `${prop.city.toLowerCase()}|${prop.state.toLowerCase()}`;
    const existing = locationMap.get(key) || {
      city: prop.city,
      state: prop.state,
      projectCount: 0,
      propertyCount: 0,
      totalValue: 0,
    };
    existing.propertyCount += 1;
    existing.totalValue += prop.current_value ?? 0;
    locationMap.set(key, existing);
  }

  const locations = Array.from(locationMap.values()).sort(
    (a, b) => b.totalValue - a.totalValue
  );

  const uniqueStates = new Set(locations.map((l) => l.state.toLowerCase()));

  return {
    locations,
    totalCities: locations.length,
    totalStates: uniqueStates.size,
    totalProjects: allProjects.length,
    totalProperties: allProperties.length,
  };
}
