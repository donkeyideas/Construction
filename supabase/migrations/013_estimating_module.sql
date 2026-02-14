-- ============================================================
-- 013: Estimating / Takeoff Module
-- ============================================================

-- Estimates table
CREATE TABLE IF NOT EXISTS estimates (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id),
  bid_id uuid,
  estimate_number text NOT NULL,
  title text NOT NULL,
  description text,
  status text DEFAULT 'draft', -- draft, in_review, approved, rejected
  total_cost numeric(14,2) DEFAULT 0,
  total_price numeric(14,2) DEFAULT 0,
  margin_pct numeric(5,2) DEFAULT 0,
  overhead_pct numeric(5,2) DEFAULT 10,
  profit_pct numeric(5,2) DEFAULT 10,
  tax_pct numeric(5,2) DEFAULT 0,
  created_by uuid REFERENCES auth.users(id),
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Estimate line items
CREATE TABLE IF NOT EXISTS estimate_line_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  estimate_id uuid NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  csi_code text,
  description text NOT NULL,
  quantity numeric(12,3) DEFAULT 1,
  unit text DEFAULT 'ea', -- ea, sf, lf, cy, hr, ls
  unit_cost numeric(12,4) DEFAULT 0,
  total_cost numeric(14,2) GENERATED ALWAYS AS (quantity * unit_cost) STORED,
  markup_pct numeric(5,2) DEFAULT 0,
  category text DEFAULT 'material', -- material, labor, equipment, subcontractor, other
  assembly_id uuid,
  sort_order int DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Reusable assemblies (templates)
CREATE TABLE IF NOT EXISTS estimate_assemblies (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  category text,
  items jsonb DEFAULT '[]', -- [{description, quantity, unit, unit_cost, category}]
  total_cost numeric(14,2) DEFAULT 0,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Triggers
CREATE TRIGGER set_estimates_updated_at
  BEFORE UPDATE ON estimates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_estimate_assemblies_updated_at
  BEFORE UPDATE ON estimate_assemblies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- RLS Policies
-- ============================================================

ALTER TABLE estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimate_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimate_assemblies ENABLE ROW LEVEL SECURITY;

-- Estimates
CREATE POLICY "estimates_select" ON estimates FOR SELECT
  USING (company_id IN (SELECT public.get_company_ids()));

CREATE POLICY "estimates_insert" ON estimates FOR INSERT
  WITH CHECK (company_id IN (SELECT public.get_company_ids()));

CREATE POLICY "estimates_update" ON estimates FOR UPDATE
  USING (company_id IN (SELECT public.get_company_ids()));

CREATE POLICY "estimates_delete" ON estimates FOR DELETE
  USING (company_id IN (SELECT public.get_company_ids())
    AND public.has_role(company_id, ARRAY['owner','admin','project_manager']));

-- Line Items
CREATE POLICY "estimate_line_items_select" ON estimate_line_items FOR SELECT
  USING (company_id IN (SELECT public.get_company_ids()));

CREATE POLICY "estimate_line_items_insert" ON estimate_line_items FOR INSERT
  WITH CHECK (company_id IN (SELECT public.get_company_ids()));

CREATE POLICY "estimate_line_items_update" ON estimate_line_items FOR UPDATE
  USING (company_id IN (SELECT public.get_company_ids()));

CREATE POLICY "estimate_line_items_delete" ON estimate_line_items FOR DELETE
  USING (company_id IN (SELECT public.get_company_ids()));

-- Assemblies
CREATE POLICY "estimate_assemblies_select" ON estimate_assemblies FOR SELECT
  USING (company_id IN (SELECT public.get_company_ids()));

CREATE POLICY "estimate_assemblies_insert" ON estimate_assemblies FOR INSERT
  WITH CHECK (company_id IN (SELECT public.get_company_ids()));

CREATE POLICY "estimate_assemblies_update" ON estimate_assemblies FOR UPDATE
  USING (company_id IN (SELECT public.get_company_ids()));

CREATE POLICY "estimate_assemblies_delete" ON estimate_assemblies FOR DELETE
  USING (company_id IN (SELECT public.get_company_ids()));

-- ============================================================
-- Indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_estimates_company ON estimates(company_id);
CREATE INDEX IF NOT EXISTS idx_estimates_project ON estimates(project_id);
CREATE INDEX IF NOT EXISTS idx_estimate_items_estimate ON estimate_line_items(estimate_id);
CREATE INDEX IF NOT EXISTS idx_estimate_assemblies_company ON estimate_assemblies(company_id);
