-- ============================================================
-- 015: Rebrand CMS pages + remove redundant draft pages
-- The homepage now contains all sections (about, features,
-- pricing, FAQ, etc.) so the separate draft pages are no
-- longer needed.
-- ============================================================

-- Update homepage title from ConstructionERP to Buildwrk
UPDATE cms_pages
SET title = 'Buildwrk - Build Smarter',
    meta_title = 'Buildwrk | Construction Management Software & Property Management Platform',
    meta_description = 'All-in-one construction ERP for general contractors, developers & property managers. Job costing, Gantt scheduling, lease management & AI analytics. 14-day free trial.'
WHERE page_slug = 'homepage';

-- Delete redundant draft pages (homepage covers all this content)
DELETE FROM cms_pages WHERE page_slug IN ('features', 'pricing', 'about');
