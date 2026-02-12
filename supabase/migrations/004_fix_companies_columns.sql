-- ============================================================
-- Fix: Add missing columns to companies table
-- The registration route expects created_by and industry_type
-- ============================================================

alter table companies add column if not exists created_by uuid references auth.users(id);
alter table companies add column if not exists industry_type text;
