-- Add subscription_ends_at to companies so we can store when a canceling
-- subscription actually ends (from Stripe current_period_end) without
-- relying on a real-time Stripe API fetch every page load.
ALTER TABLE companies ADD COLUMN IF NOT EXISTS subscription_ends_at timestamptz;
