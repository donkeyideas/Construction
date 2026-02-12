import type { SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CmsPageRow {
  id: string;
  company_id: string;
  slug: string;
  title: string;
  content: Record<string, unknown>;
  meta_title: string | null;
  meta_description: string | null;
  is_published: boolean;
  published_at: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateCmsPageData {
  slug: string;
  title: string;
  content?: Record<string, unknown>;
  meta_title?: string;
  meta_description?: string;
  is_published?: boolean;
}

export interface UpdateCmsPageData {
  title?: string;
  slug?: string;
  content?: Record<string, unknown>;
  meta_title?: string;
  meta_description?: string;
  is_published?: boolean;
}

// ---------------------------------------------------------------------------
// getCmsPages - list all CMS pages for a company
// ---------------------------------------------------------------------------

export async function getCmsPages(
  supabase: SupabaseClient,
  companyId: string
): Promise<CmsPageRow[]> {
  const { data, error } = await supabase
    .from("cms_pages")
    .select("*")
    .eq("company_id", companyId)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("getCmsPages error:", error);
    return [];
  }

  return (data ?? []) as CmsPageRow[];
}

// ---------------------------------------------------------------------------
// getCmsPageBySlug - get single page by slug
// ---------------------------------------------------------------------------

export async function getCmsPageBySlug(
  supabase: SupabaseClient,
  companyId: string,
  slug: string
): Promise<CmsPageRow | null> {
  const { data, error } = await supabase
    .from("cms_pages")
    .select("*")
    .eq("company_id", companyId)
    .eq("slug", slug)
    .single();

  if (error) {
    console.error("getCmsPageBySlug error:", error);
    return null;
  }

  return data as CmsPageRow;
}

// ---------------------------------------------------------------------------
// createCmsPage - insert a new CMS page
// ---------------------------------------------------------------------------

export async function createCmsPage(
  supabase: SupabaseClient,
  companyId: string,
  userId: string,
  data: CreateCmsPageData
) {
  const { data: page, error } = await supabase
    .from("cms_pages")
    .insert({
      company_id: companyId,
      slug: data.slug,
      title: data.title,
      content: data.content ?? {},
      meta_title: data.meta_title ?? null,
      meta_description: data.meta_description ?? null,
      is_published: data.is_published ?? false,
      published_at: data.is_published ? new Date().toISOString() : null,
      created_by: userId,
      updated_by: userId,
    })
    .select()
    .single();

  if (error) {
    console.error("createCmsPage error:", error);
    return { page: null, error: error.message };
  }

  return { page: page as CmsPageRow, error: null };
}

// ---------------------------------------------------------------------------
// updateCmsPage - update an existing CMS page by ID
// ---------------------------------------------------------------------------

export async function updateCmsPage(
  supabase: SupabaseClient,
  pageId: string,
  userId: string,
  data: UpdateCmsPageData
) {
  const updatePayload: Record<string, unknown> = {
    ...data,
    updated_by: userId,
    updated_at: new Date().toISOString(),
  };

  // If publishing for the first time, set published_at
  if (data.is_published === true) {
    updatePayload.published_at = new Date().toISOString();
  }

  const { data: page, error } = await supabase
    .from("cms_pages")
    .update(updatePayload)
    .eq("id", pageId)
    .select()
    .single();

  if (error) {
    console.error("updateCmsPage error:", error);
    return { page: null, error: error.message };
  }

  return { page: page as CmsPageRow, error: null };
}

// ---------------------------------------------------------------------------
// deleteCmsPage - delete a CMS page by ID
// ---------------------------------------------------------------------------

export async function deleteCmsPage(
  supabase: SupabaseClient,
  pageId: string
) {
  const { error } = await supabase
    .from("cms_pages")
    .delete()
    .eq("id", pageId);

  if (error) {
    console.error("deleteCmsPage error:", error);
    return { error: error.message };
  }

  return { error: null };
}

// ---------------------------------------------------------------------------
// togglePagePublish - toggle publish status for a CMS page
// ---------------------------------------------------------------------------

export async function togglePagePublish(
  supabase: SupabaseClient,
  pageId: string,
  isPublished: boolean
) {
  const updateData: Record<string, unknown> = {
    is_published: isPublished,
    updated_at: new Date().toISOString(),
  };

  if (isPublished) {
    updateData.published_at = new Date().toISOString();
  }

  const { data: page, error } = await supabase
    .from("cms_pages")
    .update(updateData)
    .eq("id", pageId)
    .select()
    .single();

  if (error) {
    console.error("togglePagePublish error:", error);
    return { page: null, error: error.message };
  }

  return { page: page as CmsPageRow, error: null };
}
