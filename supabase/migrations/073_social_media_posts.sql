-- ============================================================
-- 073: Social Media Posts
-- Platform-admin feature for AI-generated social media content
-- ============================================================

CREATE TABLE IF NOT EXISTS social_media_posts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  platform text NOT NULL CHECK (platform IN ('twitter', 'linkedin', 'facebook', 'instagram', 'tiktok')),
  content text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published', 'failed', 'cancelled')),
  hashtags text[] DEFAULT '{}',
  image_prompt text,
  image_url text,
  tone text DEFAULT 'professional',
  scheduled_at timestamptz,
  published_at timestamptz,
  external_post_id text,
  error_message text,
  created_by uuid REFERENCES user_profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Performance indexes
CREATE INDEX idx_social_posts_status ON social_media_posts(status);
CREATE INDEX idx_social_posts_scheduled ON social_media_posts(scheduled_at) WHERE status = 'scheduled';
CREATE INDEX idx_social_posts_platform ON social_media_posts(platform);
CREATE INDEX idx_social_posts_created ON social_media_posts(created_at DESC);

-- RLS: platform admins only
ALTER TABLE social_media_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "social_media_posts_select" ON social_media_posts FOR SELECT
  USING (public.is_platform_admin());

CREATE POLICY "social_media_posts_insert" ON social_media_posts FOR INSERT
  WITH CHECK (public.is_platform_admin());

CREATE POLICY "social_media_posts_update" ON social_media_posts FOR UPDATE
  USING (public.is_platform_admin());

CREATE POLICY "social_media_posts_delete" ON social_media_posts FOR DELETE
  USING (public.is_platform_admin());
