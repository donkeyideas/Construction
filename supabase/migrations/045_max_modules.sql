-- Add max_modules limit to pricing tiers
ALTER TABLE pricing_tiers ADD COLUMN IF NOT EXISTS max_modules int;

-- Set default module limits per tier
UPDATE pricing_tiers SET max_modules = 3 WHERE LOWER(name) = 'starter';
UPDATE pricing_tiers SET max_modules = 6 WHERE LOWER(name) = 'professional';
UPDATE pricing_tiers SET max_modules = NULL WHERE LOWER(name) = 'enterprise';
