-- 057: Add multi-language FAQ and value prop to the live homepage CMS sections
-- The defaults file was updated but the live DB homepage still has old content.

-- Step 1: Add "Available in 8 Languages" value prop to the value_props section
UPDATE cms_pages
SET
  sections = (
    SELECT jsonb_agg(
      CASE
        -- Append the language value prop to the value_props section items
        WHEN elem->>'type' = 'value_props' THEN
          jsonb_set(
            elem,
            '{content,items}',
            (elem->'content'->'items') || '[{"title":"Available in 8 Languages","body":"Built-in support for English, Spanish, French, German, Portuguese, Arabic, Hindi, and Chinese — so your global teams work in their preferred language."}]'::jsonb
          )
        -- Update the region FAQ answer and add the language FAQ
        WHEN elem->>'type' = 'faq' THEN
          jsonb_set(
            elem,
            '{content,items}',
            (
              SELECT jsonb_agg(
                CASE
                  WHEN faq_item->>'question' = 'Does Buildwrk work for my region?' THEN
                    jsonb_build_object(
                      'question', 'Does Buildwrk work for my region?',
                      'answer', 'Yes. Buildwrk is used by general contractors, real estate developers, and property managers across the United States, Canada, and internationally. The platform is available in 8 languages — English, Spanish, French, German, Portuguese, Arabic, Hindi, and Chinese — and supports multiple currencies, tax configurations, and regional compliance requirements including certified payroll and prevailing wage tracking.'
                    )
                  ELSE faq_item
                END
              )
              FROM jsonb_array_elements(elem->'content'->'items') AS faq_item
            ) || '[{"question":"What languages does Buildwrk support?","answer":"Buildwrk is available in 8 languages: English, Spanish, French, German, Portuguese (Brazilian), Arabic, Hindi, and Chinese. Every part of the platform — dashboards, reports, notifications, and field worker mobile views — is fully translated. Your team members can each choose their preferred language, making Buildwrk ideal for international construction firms and multilingual crews."}]'::jsonb
          )
        ELSE elem
      END
    )
    FROM jsonb_array_elements(sections) AS elem
  ),
  meta_description = 'All-in-one Buildwrk for general contractors, developers & property managers. Job costing, Gantt scheduling, lease management & AI analytics. Available in 8 languages. 14-day free trial.',
  updated_at = now()
WHERE page_slug = 'homepage'
  AND status = 'published';
