-- ============================================================
-- 076: Permit Review Enhancements
-- PDF upload tracking, provider selection, checklists,
-- jurisdiction rulesets with AHJ portal info
-- ============================================================

-- New columns on permit_reviews
ALTER TABLE permit_reviews
  ADD COLUMN IF NOT EXISTS uploaded_files jsonb DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS selected_provider_id uuid,
  ADD COLUMN IF NOT EXISTS submission_checklist jsonb DEFAULT NULL;

-- ============================================================
-- Jurisdiction Rulesets (Features 2 + 6)
-- ============================================================

CREATE TABLE IF NOT EXISTS jurisdiction_rulesets (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  jurisdiction_name text NOT NULL,
  state text NOT NULL,
  city text,
  county text,
  rules jsonb DEFAULT '[]',
  building_codes text[] DEFAULT '{}',
  notes text,
  portal_name text,
  portal_url text,
  portal_submission_type text CHECK (portal_submission_type IN ('online', 'in_person', 'both')),
  portal_contact_info jsonb,
  typical_review_days integer,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_jurisdiction_rulesets_company ON jurisdiction_rulesets(company_id);
CREATE INDEX IF NOT EXISTS idx_jurisdiction_rulesets_state ON jurisdiction_rulesets(state);
CREATE INDEX IF NOT EXISTS idx_jurisdiction_rulesets_name ON jurisdiction_rulesets(jurisdiction_name);

ALTER TABLE jurisdiction_rulesets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "jurisdiction_rulesets_select" ON jurisdiction_rulesets FOR SELECT
  USING (company_id IS NULL OR company_id IN (SELECT public.get_company_ids()));

CREATE POLICY "jurisdiction_rulesets_insert" ON jurisdiction_rulesets FOR INSERT
  WITH CHECK (company_id IN (SELECT public.get_company_ids()));

CREATE POLICY "jurisdiction_rulesets_update" ON jurisdiction_rulesets FOR UPDATE
  USING (company_id IN (SELECT public.get_company_ids()));

CREATE POLICY "jurisdiction_rulesets_delete" ON jurisdiction_rulesets FOR DELETE
  USING (company_id IN (SELECT public.get_company_ids()));

-- ============================================================
-- Seed major US jurisdictions
-- ============================================================

INSERT INTO jurisdiction_rulesets (jurisdiction_name, state, city, county, building_codes, rules, portal_name, portal_url, portal_submission_type, typical_review_days, portal_contact_info, notes)
VALUES
  ('Miami-Dade County, FL', 'FL', 'Miami', 'Miami-Dade',
   ARRAY['FBC 2023 (8th Edition)', 'Miami-Dade County Amendments', 'HVHZ Requirements'],
   '[{"code":"FBC 2023","section":"1620","amendment":"High-Velocity Hurricane Zone (HVHZ) requirements apply to all structures","category":"structural"},{"code":"FBC 2023","section":"1626","amendment":"Impact-resistant glazing or approved shutters required for all openings","category":"structural"},{"code":"FBC 2023","section":"R609","amendment":"Enhanced roof-to-wall connections required in HVHZ","category":"structural"},{"code":"FBC 2023","section":"553.73","amendment":"All products must have Miami-Dade NOA (Notice of Acceptance)","category":"structural"},{"code":"FBC 2023","section":"1612","amendment":"Flood zone compliance per FEMA maps, freeboard requirements","category":"environmental"}]'::jsonb,
   'Miami-Dade iBuild', 'https://www.miamidade.gov/global/economy/building/home.page', 'online', 15,
   '{"phone":"(786) 315-2000","email":"building@miamidade.gov","address":"11805 SW 26th St, Miami, FL 33175","hours":"Mon-Fri 8AM-5PM"}'::jsonb,
   'High-Velocity Hurricane Zone. All products must be Miami-Dade NOA approved. FBC 8th Edition with local amendments. 40% plan review surcharge for expedited review.'),

  ('New York City, NY', 'NY', 'New York', NULL,
   ARRAY['NYC Building Code 2022', 'NYC Zoning Resolution', 'NYC Energy Conservation Code'],
   '[{"code":"NYC BC","section":"28-104.2","amendment":"DOB NOW required for all permit applications — no paper submissions","category":"administrative"},{"code":"NYC BC","section":"3304","amendment":"Site safety plans required for buildings over 15 stories or 150 feet","category":"safety"},{"code":"NYC ZR","section":"23-00","amendment":"Floor area ratio calculations per NYC Zoning Resolution, not IBC","category":"zoning"},{"code":"NYC BC","section":"903.2","amendment":"Sprinklers required in all new buildings regardless of occupancy type","category":"fire_safety"},{"code":"NYC BC","section":"1607","amendment":"Special wind load provisions for buildings over 75 feet","category":"structural"}]'::jsonb,
   'DOB NOW', 'https://www.nyc.gov/site/buildings/index.page', 'online', 30,
   '{"phone":"(212) 393-2550","email":"","address":"280 Broadway, New York, NY 10007","hours":"Mon-Fri 8AM-4:30PM"}'::jsonb,
   'NYC-specific codes differ significantly from IBC. DOB NOW portal is required. Professional certification required for most work types. Special inspections agency required.'),

  ('City of Los Angeles, CA', 'CA', 'Los Angeles', 'Los Angeles',
   ARRAY['LABC 2022', 'California Building Code 2022', 'LAMC Chapter IX'],
   '[{"code":"LABC","section":"1613A","amendment":"Seismic Design Category D/E requirements. Mandatory seismic instrumentation for buildings over 6 stories","category":"structural"},{"code":"LAMC","section":"91.7006","amendment":"Mandatory soft-story retrofit for pre-1978 wood-frame buildings with 5+ units","category":"structural"},{"code":"LABC","section":"1505A","amendment":"Fire-retardant roofing required in Very High Fire Hazard Severity Zones (VHFHSZ)","category":"fire_safety"},{"code":"CALGreen","section":"5.106","amendment":"CalGreen mandatory measures for all new construction — EV charging, water efficiency, recycling","category":"environmental"},{"code":"Title 24","section":"Part 6","amendment":"California Energy Code (Title 24 Part 6) — stricter than IECC","category":"environmental"}]'::jsonb,
   'LADBS e-Permit', 'https://www.ladbs.org/', 'online', 20,
   '{"phone":"(213) 482-6800","email":"ladbs.help@lacity.org","address":"201 N Figueroa St, Los Angeles, CA 90012","hours":"Mon-Fri 7:30AM-4:30PM"}'::jsonb,
   'LADBS requires plan check appointments. Seismic and fire zones heavily influence requirements. CalGreen mandatory measures apply to all new construction.'),

  ('City of Chicago, IL', 'IL', 'Chicago', 'Cook',
   ARRAY['Chicago Building Code', 'Municipal Code Title 13', 'Illinois Energy Code'],
   '[{"code":"CBC","section":"13-160","amendment":"Chicago aisle and exit requirements differ from IBC — wider corridors required","category":"fire_safety"},{"code":"CBC","section":"13-72","amendment":"Sprinklers required for all buildings over 80 feet in height","category":"fire_safety"},{"code":"CBC","section":"13-196","amendment":"Chicago-specific electrical code requirements — different from NEC in some areas","category":"electrical"},{"code":"CBC","section":"13-32","amendment":"Ventilation requirements exceed IMC minimums for commercial kitchens","category":"mechanical"}]'::jsonb,
   'Chicago E-Plan', 'https://www.chicago.gov/city/en/depts/bldgs.html', 'both', 25,
   '{"phone":"(312) 744-3449","email":"","address":"121 N LaSalle St, Room 900, Chicago, IL 60602","hours":"Mon-Fri 8:30AM-4:30PM"}'::jsonb,
   'Chicago uses its own building code, NOT IBC. Significant differences in fire safety, egress, and electrical requirements. Aldermanic approval may be required for zoning changes.'),

  ('City of Houston, TX', 'TX', 'Houston', 'Harris',
   ARRAY['IBC 2021 with Houston Amendments', 'NEC 2020', 'IRC 2021'],
   '[{"code":"Local","section":"N/A","amendment":"NO citywide zoning code. Land use regulated by deed restrictions and city ordinances only","category":"zoning"},{"code":"IBC 2021","section":"1612","amendment":"Flood zone compliance per FEMA maps critical — large portions of city in floodplain","category":"environmental"},{"code":"Local","section":"Chapter 19","amendment":"Houston amendments to IBC for wind design — 130 mph basic wind speed","category":"structural"},{"code":"Local","section":"Energy","amendment":"Houston Energy Code based on IECC 2015 with local amendments","category":"environmental"}]'::jsonb,
   'Houston Permitting Center', 'https://www.houstonpermittingcenter.org/', 'online', 10,
   '{"phone":"(832) 394-8880","email":"hpermit@houstontx.gov","address":"1002 Washington Ave, Houston, TX 77002","hours":"Mon-Fri 8AM-5PM"}'::jsonb,
   'Houston has NO zoning code — unique among major US cities. Flood zone requirements are critical. Uses IBC with local amendments. Fastest permitting among major cities (~10 business days).'),

  ('City of Denver, CO', 'CO', 'Denver', 'Denver',
   ARRAY['Denver Building Code 2021', 'Denver Zoning Code', 'IECC 2021'],
   '[{"code":"DBC","section":"1608","amendment":"Snow load requirements: 30 PSF minimum ground snow load for Denver metro area","category":"structural"},{"code":"DBC","section":"Local","amendment":"Green roof requirements for buildings over 25,000 SF","category":"environmental"},{"code":"DZC","section":"Article 10","amendment":"Denver zoning allows ADUs citywide as of 2024","category":"zoning"}]'::jsonb,
   'Denver Development Services', 'https://www.denvergov.org/Government/Agencies-Departments-Offices/Community-Planning-and-Development', 'online', 18,
   '{"phone":"(720) 865-2705","email":"dsd@denvergov.org","address":"201 W Colfax Ave, Denver, CO 80202","hours":"Mon-Fri 7:30AM-4:30PM"}'::jsonb,
   'Denver has its own building code based on IBC. Snow load and energy code requirements are notable. Green building requirements for larger projects.'),

  ('City of Seattle, WA', 'WA', 'Seattle', 'King',
   ARRAY['Seattle Building Code 2021', 'Seattle Energy Code', 'Seattle Stormwater Code'],
   '[{"code":"SBC","section":"1613","amendment":"Seismic Design Category D requirements for all structures","category":"structural"},{"code":"SEC","section":"C401.2","amendment":"Seattle Energy Code exceeds state code — net-zero ready for large commercial by 2030","category":"environmental"},{"code":"SMC","section":"22.800","amendment":"Stormwater management required for all projects disturbing 750+ SF","category":"environmental"}]'::jsonb,
   'Seattle SDCI', 'https://www.seattle.gov/sdci', 'online', 22,
   '{"phone":"(206) 684-8600","email":"sdci@seattle.gov","address":"700 5th Ave, Suite 2000, Seattle, WA 98104","hours":"Mon-Fri 8AM-5PM"}'::jsonb,
   'Seattle has aggressive energy code and stormwater requirements. Seismic considerations for all structures. Design review required for projects in designated zones.'),

  ('City of Phoenix, AZ', 'AZ', 'Phoenix', 'Maricopa',
   ARRAY['IBC 2018 with Phoenix Amendments', 'NEC 2017', 'IECC 2018'],
   '[{"code":"IBC 2018","section":"Local","amendment":"Dust control permits required for all ground-disturbing activities over 0.1 acre","category":"environmental"},{"code":"IBC 2018","section":"1612","amendment":"Flood zone compliance in FEMA-designated areas along Salt River and canals","category":"environmental"},{"code":"Local","section":"Energy","amendment":"Pool barrier requirements exceed IBC minimums","category":"safety"}]'::jsonb,
   'Phoenix PDD', 'https://www.phoenix.gov/pdd', 'online', 12,
   '{"phone":"(602) 262-7811","email":"pdd@phoenix.gov","address":"200 W Washington St, 2nd Floor, Phoenix, AZ 85003","hours":"Mon-Fri 7AM-4PM"}'::jsonb,
   'Phoenix uses IBC 2018 with local amendments. Fast permitting process. Dust control is a significant requirement for construction.'),

  ('City of Atlanta, GA', 'GA', 'Atlanta', 'Fulton',
   ARRAY['Georgia State Building Code 2020', 'IBC 2018', 'IECC 2015'],
   '[{"code":"GA SBC","section":"Local","amendment":"City of Atlanta requires sustainability performance standards for buildings over 25,000 SF","category":"environmental"},{"code":"IBC 2018","section":"Local","amendment":"Beltline overlay district has additional setback and design requirements","category":"zoning"},{"code":"GA SBC","section":"3107","amendment":"Georgia amendments to IBC for manufactured housing","category":"structural"}]'::jsonb,
   'Atlanta ACE', 'https://www.atlantaga.gov/government/departments/city-planning/office-of-buildings', 'both', 20,
   '{"phone":"(404) 330-6200","email":"","address":"55 Trinity Ave SW, Suite 3900, Atlanta, GA 30303","hours":"Mon-Fri 8:30AM-5PM"}'::jsonb,
   'Atlanta uses Georgia State Building Code (based on IBC 2018). Beltline and special overlay districts have additional requirements. Sustainability standards for larger buildings.'),

  ('City of Dallas, TX', 'TX', 'Dallas', 'Dallas',
   ARRAY['Dallas Building Code 2021', 'IBC 2021', 'NEC 2020'],
   '[{"code":"DBC","section":"Local","amendment":"Dallas has a zoning code (unlike Houston) — PD districts common","category":"zoning"},{"code":"IBC 2021","section":"1609","amendment":"Wind speed: 115 mph basic wind speed, tornado shelter requirements for certain occupancies","category":"structural"},{"code":"DBC","section":"Local","amendment":"Tree preservation ordinance — mitigation required for removal of protected trees","category":"environmental"}]'::jsonb,
   'Dallas Dev Services', 'https://dallascityhall.com/departments/sustainabledevelopment/pages/default.aspx', 'online', 14,
   '{"phone":"(214) 948-4480","email":"","address":"320 E Jefferson Blvd, Suite 118, Dallas, TX 75203","hours":"Mon-Fri 8AM-5PM"}'::jsonb,
   'Dallas uses IBC 2021 with local amendments. Has zoning (unlike Houston). Tree preservation and tornado shelter requirements are notable additions.');
