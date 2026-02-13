import { SupabaseClient } from "@supabase/supabase-js";

/* ------------------------------------------------------------------
   Types
   ------------------------------------------------------------------ */

export interface DocumentRow {
  id: string;
  company_id: string;
  project_id: string | null;
  property_id: string | null;
  name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  folder_path: string | null;
  category:
    | "plan"
    | "spec"
    | "contract"
    | "photo"
    | "report"
    | "correspondence";
  version: number;
  uploaded_by: string;
  tags: string[] | null;
  ai_extracted_data: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  uploader?: { full_name: string; email: string } | null;
  project?: { id: string; name: string; code: string } | null;
  property?: { id: string; name: string } | null;
}

export interface DocumentFilters {
  projectId?: string;
  propertyId?: string;
  category?: string;
  search?: string;
  folderPath?: string;
}

export interface DocumentUploadMetadata {
  name: string;
  file_type: string;
  file_size: number;
  file_path: string;
  folder_path?: string;
  category?: string;
  project_id?: string;
  property_id?: string;
  tags?: string[];
  version?: number;
}

export interface FolderNode {
  name: string;
  path: string;
  children: FolderNode[];
}

/* ------------------------------------------------------------------
   getDocuments - List documents with optional filters
   ------------------------------------------------------------------ */

export async function getDocuments(
  supabase: SupabaseClient,
  companyId: string,
  filters?: DocumentFilters
): Promise<DocumentRow[]> {
  let query = supabase
    .from("documents")
    .select(
      `
      *,
      uploader:user_profiles!documents_uploader_profile_fkey(full_name, email),
      project:projects!documents_project_id_fkey(id, name, code),
      property:properties!documents_property_id_fkey(id, name)
    `
    )
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (filters?.projectId) {
    query = query.eq("project_id", filters.projectId);
  }

  if (filters?.propertyId) {
    query = query.eq("property_id", filters.propertyId);
  }

  if (filters?.category) {
    query = query.eq("category", filters.category);
  }

  if (filters?.folderPath) {
    query = query.eq("folder_path", filters.folderPath);
  }

  if (filters?.search) {
    const term = `%${filters.search}%`;
    query = query.or(`name.ilike.${term}`);
  }

  const { data, error } = await query;

  if (error) {
    console.error("getDocuments error:", error);
    return [];
  }

  return (data ?? []) as DocumentRow[];
}

/* ------------------------------------------------------------------
   uploadDocument - Insert document metadata record
   ------------------------------------------------------------------ */

export async function uploadDocument(
  supabase: SupabaseClient,
  companyId: string,
  userId: string,
  metadata: DocumentUploadMetadata
): Promise<{ document: DocumentRow | null; error: string | null }> {
  const { data, error } = await supabase
    .from("documents")
    .insert({
      company_id: companyId,
      name: metadata.name,
      file_type: metadata.file_type,
      file_size: metadata.file_size,
      file_path: metadata.file_path,
      folder_path: metadata.folder_path ?? null,
      category: metadata.category ?? "correspondence",
      project_id: metadata.project_id ?? null,
      property_id: metadata.property_id ?? null,
      tags: metadata.tags ?? [],
      version: metadata.version ?? 1,
      uploaded_by: userId,
    })
    .select()
    .single();

  if (error) {
    console.error("uploadDocument error:", error);
    return { document: null, error: error.message };
  }

  return { document: data as DocumentRow, error: null };
}

/* ------------------------------------------------------------------
   deleteDocument - Remove a document record
   ------------------------------------------------------------------ */

export async function deleteDocument(
  supabase: SupabaseClient,
  documentId: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("documents")
    .delete()
    .eq("id", documentId);

  if (error) {
    console.error("deleteDocument error:", error);
    return { error: error.message };
  }

  return { error: null };
}

/* ------------------------------------------------------------------
   getDocumentById - Get a single document's metadata
   ------------------------------------------------------------------ */

export async function getDocumentById(
  supabase: SupabaseClient,
  documentId: string
): Promise<DocumentRow | null> {
  const { data, error } = await supabase
    .from("documents")
    .select(
      `
      *,
      uploader:user_profiles!documents_uploader_profile_fkey(full_name, email),
      project:projects!documents_project_id_fkey(id, name, code),
      property:properties!documents_property_id_fkey(id, name)
    `
    )
    .eq("id", documentId)
    .single();

  if (error) {
    console.error("getDocumentById error:", error);
    return null;
  }

  return data as DocumentRow;
}

/* ------------------------------------------------------------------
   getFolderTree - Build a folder hierarchy from unique folder_path values
   ------------------------------------------------------------------ */

export async function getFolderTree(
  supabase: SupabaseClient,
  companyId: string
): Promise<FolderNode[]> {
  const { data, error } = await supabase
    .from("documents")
    .select("folder_path")
    .eq("company_id", companyId)
    .not("folder_path", "is", null);

  if (error) {
    console.error("getFolderTree error:", error);
    return [];
  }

  // Collect unique folder paths
  const pathSet = new Set<string>();
  for (const row of data ?? []) {
    if (row.folder_path) {
      pathSet.add(row.folder_path);
    }
  }

  // Build tree from paths
  const roots: FolderNode[] = [];
  const nodeMap = new Map<string, FolderNode>();

  const sortedPaths = Array.from(pathSet).sort();

  for (const fullPath of sortedPaths) {
    const segments = fullPath.split("/").filter(Boolean);
    let currentPath = "";

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const parentPath = currentPath;
      currentPath = currentPath ? `${currentPath}/${segment}` : segment;

      if (!nodeMap.has(currentPath)) {
        const node: FolderNode = {
          name: segment,
          path: currentPath,
          children: [],
        };
        nodeMap.set(currentPath, node);

        if (parentPath && nodeMap.has(parentPath)) {
          nodeMap.get(parentPath)!.children.push(node);
        } else if (!parentPath) {
          roots.push(node);
        }
      }
    }
  }

  return roots;
}
