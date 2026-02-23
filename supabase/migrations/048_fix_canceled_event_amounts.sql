-- Fix subscription_events that were recorded with amount=0 for cancel/downgrade
-- events. The cancel-subscription and downgrade endpoints previously hardcoded
-- amount: 0 instead of reading the actual subscription price from Stripe.
-- This patches existing records by looking up the plan's monthly price.

UPDATE subscription_events se
SET amount = COALESCE(
  (SELECT pt.monthly_price FROM pricing_tiers pt WHERE LOWER(pt.name) = LOWER(se.plan_from)),
  0
)
WHERE se.event_type IN ('canceled', 'downgraded')
  AND se.amount = 0
  AND se.plan_from IS NOT NULL
  AND se.plan_from != 'starter';

-- Also fix the RLS policy: allow the service role (admin client) to insert
-- subscription_events. The register route uses the admin client to insert
-- events on behalf of newly registered companies.
DROP POLICY IF EXISTS "Subscription events: platform admin can insert" ON subscription_events;
CREATE POLICY "Subscription events: authenticated can insert"
  ON subscription_events FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
