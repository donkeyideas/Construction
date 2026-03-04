import { createAdminClient } from "@/lib/supabase/admin";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SocialPlatform =
  | "twitter"
  | "linkedin"
  | "facebook"
  | "instagram"
  | "tiktok";

export type SocialPostStatus =
  | "draft"
  | "scheduled"
  | "published"
  | "failed"
  | "cancelled";

export interface SocialPost {
  id: string;
  platform: SocialPlatform;
  content: string;
  status: SocialPostStatus;
  hashtags: string[];
  image_prompt: string | null;
  image_url: string | null;
  tone: string;
  scheduled_at: string | null;
  published_at: string | null;
  external_post_id: string | null;
  error_message: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateSocialPostInput {
  platform: SocialPlatform;
  content: string;
  hashtags?: string[];
  image_prompt?: string;
  tone?: string;
  scheduled_at?: string;
  status?: SocialPostStatus;
  created_by?: string;
}

export interface SocialPostStats {
  total: number;
  drafts: number;
  scheduled: number;
  published: number;
  failed: number;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export async function getSocialPosts(filters?: {
  status?: SocialPostStatus;
  platform?: SocialPlatform;
}): Promise<SocialPost[]> {
  const admin = createAdminClient();

  let query = admin
    .from("social_media_posts")
    .select("*")
    .order("created_at", { ascending: false });

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }
  if (filters?.platform) {
    query = query.eq("platform", filters.platform);
  }

  const { data, error } = await query;

  if (error) {
    console.error("getSocialPosts error:", error);
    return [];
  }

  return data ?? [];
}

export async function getSocialPostById(
  id: string
): Promise<SocialPost | null> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("social_media_posts")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return data;
}

export async function createSocialPost(
  input: CreateSocialPostInput
): Promise<{ data: SocialPost | null; error: string | null }> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("social_media_posts")
    .insert({
      platform: input.platform,
      content: input.content,
      hashtags: input.hashtags ?? [],
      image_prompt: input.image_prompt ?? null,
      tone: input.tone ?? "professional",
      scheduled_at: input.scheduled_at ?? null,
      status: input.status ?? "draft",
      created_by: input.created_by ?? null,
    })
    .select()
    .single();

  if (error) {
    console.error("createSocialPost error:", error);
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

export async function updateSocialPost(
  id: string,
  updates: Partial<
    Pick<
      SocialPost,
      | "content"
      | "hashtags"
      | "image_prompt"
      | "tone"
      | "scheduled_at"
      | "status"
      | "published_at"
      | "external_post_id"
      | "error_message"
    >
  >
): Promise<{ error: string | null }> {
  const admin = createAdminClient();

  const { error } = await admin
    .from("social_media_posts")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    console.error("updateSocialPost error:", error);
    return { error: error.message };
  }

  return { error: null };
}

export async function deleteSocialPost(
  id: string
): Promise<{ error: string | null }> {
  const admin = createAdminClient();

  const { error } = await admin
    .from("social_media_posts")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("deleteSocialPost error:", error);
    return { error: error.message };
  }

  return { error: null };
}

export async function getSocialPostStats(): Promise<SocialPostStats> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("social_media_posts")
    .select("status");

  if (error || !data) {
    return { total: 0, drafts: 0, scheduled: 0, published: 0, failed: 0 };
  }

  return {
    total: data.length,
    drafts: data.filter((p) => p.status === "draft").length,
    scheduled: data.filter((p) => p.status === "scheduled").length,
    published: data.filter((p) => p.status === "published").length,
    failed: data.filter((p) => p.status === "failed").length,
  };
}

export async function getScheduledPostsDue(): Promise<SocialPost[]> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("social_media_posts")
    .select("*")
    .eq("status", "scheduled")
    .lte("scheduled_at", new Date().toISOString())
    .order("scheduled_at", { ascending: true });

  if (error) {
    console.error("getScheduledPostsDue error:", error);
    return [];
  }

  return data ?? [];
}
