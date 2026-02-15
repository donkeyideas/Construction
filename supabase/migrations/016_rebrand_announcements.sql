-- ============================================================
-- 016: Rebrand platform announcements from ConstructionERP → Buildwrk
-- ============================================================

UPDATE platform_announcements
SET title   = REPLACE(title, 'ConstructionERP', 'Buildwrk'),
    content = REPLACE(content, 'ConstructionERP', 'Buildwrk')
WHERE title LIKE '%ConstructionERP%'
   OR content LIKE '%ConstructionERP%';
