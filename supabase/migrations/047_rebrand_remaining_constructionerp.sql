-- ============================================================
-- 047: Replace all remaining ConstructionERP references with Buildwrk
-- Covers cms_pages title, meta fields, and sections JSON content
-- ============================================================

-- Update all text columns in cms_pages that may contain the old name
UPDATE cms_pages
SET title = REPLACE(title, 'ConstructionERP', 'Buildwrk'),
    meta_title = REPLACE(meta_title, 'ConstructionERP', 'Buildwrk'),
    meta_description = REPLACE(meta_description, 'ConstructionERP', 'Buildwrk'),
    sections = REPLACE(sections::text, 'ConstructionERP', 'Buildwrk')::jsonb
WHERE title LIKE '%ConstructionERP%'
   OR meta_title LIKE '%ConstructionERP%'
   OR meta_description LIKE '%ConstructionERP%'
   OR sections::text LIKE '%ConstructionERP%';

-- Update platform announcements
UPDATE platform_announcements
SET title = REPLACE(title, 'ConstructionERP', 'Buildwrk'),
    content = REPLACE(content, 'ConstructionERP', 'Buildwrk')
WHERE title LIKE '%ConstructionERP%'
   OR content LIKE '%ConstructionERP%';

-- Update notifications
UPDATE notifications
SET title = REPLACE(title, 'ConstructionERP', 'Buildwrk'),
    message = REPLACE(message, 'ConstructionERP', 'Buildwrk')
WHERE title LIKE '%ConstructionERP%'
   OR message LIKE '%ConstructionERP%';
