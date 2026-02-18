-- ==========================================================================
-- Migration 028: Plan Room Enhancements
-- Virtual folders, asset library, document improvements
-- ==========================================================================

-- Virtual folders for document organization
CREATE TABLE IF NOT EXISTS document_folders (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  parent_id uuid REFERENCES document_folders(id) ON DELETE CASCADE,
  color text DEFAULT '#6366f1',
  sort_order int DEFAULT 0,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Asset library items (reusable company assets)
CREATE TABLE IF NOT EXISTS asset_library (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  file_path text NOT NULL,
  file_type text,
  file_size bigint DEFAULT 0,
  thumbnail_url text,
  asset_type text NOT NULL DEFAULT 'general', -- logo, standard_detail, template, stamp, photo, general
  tags text[] DEFAULT '{}',
  usage_count int DEFAULT 0,
  uploaded_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add folder_id and thumbnail_url to documents
ALTER TABLE documents ADD COLUMN IF NOT EXISTS folder_id uuid REFERENCES document_folders(id) ON DELETE SET NULL;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS thumbnail_url text;

-- RLS
ALTER TABLE document_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view folders"
  ON document_folders FOR SELECT
  USING (company_id IN (SELECT get_company_ids()));
CREATE POLICY "Company members can manage folders"
  ON document_folders FOR ALL
  USING (company_id IN (SELECT get_company_ids()));

CREATE POLICY "Company members can view assets"
  ON asset_library FOR SELECT
  USING (company_id IN (SELECT get_company_ids()));
CREATE POLICY "Company members can manage assets"
  ON asset_library FOR ALL
  USING (company_id IN (SELECT get_company_ids()));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_document_folders_company ON document_folders(company_id);
CREATE INDEX IF NOT EXISTS idx_document_folders_parent ON document_folders(parent_id);
CREATE INDEX IF NOT EXISTS idx_asset_library_company ON asset_library(company_id, asset_type);
CREATE INDEX IF NOT EXISTS idx_documents_folder ON documents(folder_id);
