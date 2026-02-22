-- ==========================================================================
-- Migration 044: Add stripe_product_id to pricing_tiers
-- ==========================================================================

ALTER TABLE pricing_tiers ADD COLUMN IF NOT EXISTS stripe_product_id text;
