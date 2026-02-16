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
  // Plan room fields
  drawing_set_id?: string | null;
  discipline?: string | null;
  revision_label?: string | null;
  is_current?: boolean;
  // Joined fields
  uploader?: { full_name: string; email: string } | null;
  project?: { id: string; name: string; code: string } | null;
  property?: { id: string; name: string } | null;
  drawing_set?: { id: string; name: string; discipline: string | null; status: string } | null;
}

export interface DrawingSetRow {
  id: string;
  company_id: string;
  project_id: string | null;
  name: string;
  description: string | null;
  discipline: string | null;
  status: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  document_count?: number;
}

export interface PlanRoomFilters {
  projectId?: string;
  discipline?: string;
  drawingSetId?: string;
  search?: string;
  showSuperseded?: boolean;
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
    // Match exact folder or child folders (prefix match)
    query = query.or(
      `folder_path.eq.${filters.folderPath},folder_path.like.${filters.folderPath}/%`
    );
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

/* ------------------------------------------------------------------
   getPlanRoomDocuments - Fetch plan/spec documents with drawing set joins
   ------------------------------------------------------------------ */

export async function getPlanRoomDocuments(
  supabase: SupabaseClient,
  companyId: string,
  filters?: PlanRoomFilters
): Promise<DocumentRow[]> {
  let query = supabase
    .from("documents")
    .select(
      `
      *,
      uploader:user_profiles!documents_uploader_profile_fkey(full_name, email),
      project:projects!documents_project_id_fkey(id, name, code),
      drawing_set:drawing_sets!documents_drawing_set_id_fkey(id, name, discipline, status)
    `
    )
    .eq("company_id", companyId)
    .in("category", ["plan", "spec"])
    .order("name", { ascending: true });

  if (!filters?.showSuperseded) {
    query = query.eq("is_current", true);
  }

  if (filters?.projectId) {
    query = query.eq("project_id", filters.projectId);
  }

  if (filters?.discipline) {
    query = query.eq("discipline", filters.discipline);
  }

  if (filters?.drawingSetId) {
    query = query.eq("drawing_set_id", filters.drawingSetId);
  }

  if (filters?.search) {
    const term = `%${filters.search}%`;
    query = query.or(`name.ilike.${term}`);
  }

  const { data, error } = await query;

  if (error) {
    console.error("getPlanRoomDocuments error:", error);
    return [];
  }

  return (data ?? []) as DocumentRow[];
}

/* ------------------------------------------------------------------
   getDrawingSets - List drawing sets for a company
   ------------------------------------------------------------------ */

export async function getDrawingSets(
  supabase: SupabaseClient,
  companyId: string,
  projectId?: string
): Promise<DrawingSetRow[]> {
  let query = supabase
    .from("drawing_sets")
    .select("*, documents(count)")
    .eq("company_id", companyId)
    .order("name", { ascending: true });

  if (projectId) {
    query = query.eq("project_id", projectId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("getDrawingSets error:", error);
    return [];
  }

  return (data ?? []).map((row: Record<string, unknown>) => {
    const docs = row.documents as { count: number }[] | undefined;
    return {
      ...row,
      document_count: docs?.[0]?.count ?? 0,
    };
  }) as DrawingSetRow[];
}

/* ------------------------------------------------------------------
   createDrawingSet - Insert a new drawing set
   ------------------------------------------------------------------ */

export async function createDrawingSet(
  supabase: SupabaseClient,
  companyId: string,
  userId: string,
  data: { name: string; description?: string; discipline?: string; project_id?: string }
): Promise<{ set: DrawingSetRow | null; error: string | null }> {
  const { data: row, error } = await supabase
    .from("drawing_sets")
    .insert({
      company_id: companyId,
      name: data.name,
      description: data.description ?? null,
      discipline: data.discipline ?? null,
      project_id: data.project_id ?? null,
      created_by: userId,
    })
    .select()
    .single();

  if (error) {
    console.error("createDrawingSet error:", error);
    return { set: null, error: error.message };
  }

  return { set: row as DrawingSetRow, error: null };
}

/* ------------------------------------------------------------------
   getDocumentVersionHistory - Get all versions of a document
   ------------------------------------------------------------------ */

export async function getDocumentVersionHistory(
  supabase: SupabaseClient,
  companyId: string,
  docName: string,
  projectId: string | null,
  drawingSetId: string | null
): Promise<DocumentRow[]> {
  let query = supabase
    .from("documents")
    .select(
      `
      *,
      uploader:user_profiles!documents_uploader_profile_fkey(full_name, email)
    `
    )
    .eq("company_id", companyId)
    .eq("name", docName)
    .order("version", { ascending: false });

  if (projectId) {
    query = query.eq("project_id", projectId);
  } else {
    query = query.is("project_id", null);
  }

  if (drawingSetId) {
    query = query.eq("drawing_set_id", drawingSetId);
  } else {
    query = query.is("drawing_set_id", null);
  }

  const { data, error } = await query;

  if (error) {
    console.error("getDocumentVersionHistory error:", error);
    return [];
  }

  return (data ?? []) as DocumentRow[];
}

/* ------------------------------------------------------------------
   getDocumentSignedUrl - Create a signed URL for file download/preview
   ------------------------------------------------------------------ */

export async function getDocumentSignedUrl(
  _supabase: SupabaseClient,
  filePath: string
): Promise<{ url: string | null; error: string | null }> {
  // Use admin client via storage helper to bypass RLS
  const { storageSignedUrl } = await import("@/lib/supabase/storage");
  const { data, error } = await storageSignedUrl(filePath, 3600);

  if (error) {
    console.error("getDocumentSignedUrl error:", error);
    return { url: null, error: error.message };
  }

  return { url: data?.signedUrl ?? null, error: null };
}

// ---------------------------------------------------------------------------
// getDocumentsOverview - Overview dashboard data
// ---------------------------------------------------------------------------

export interface DocumentsOverviewData {
  totalCount: number;
  planSpecCount: number;
  drawingSetCount: number;
  recentUploadCount: number;
  categoryBreakdown: { category: string; count: number }[];
  weeklyUploads: { week: string; count: number }[];
  recentDocuments: DocumentRow[];
}

export async function getDocumentsOverview(
  supabase: SupabaseClient,
  companyId: string
): Promise<DocumentsOverviewData> {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    .toISOString();
  const twelveWeeksAgo = new Date(now.getTime() - 12 * 7 * 24 * 60 * 60 * 1000)
    .toISOString();

  const [allDocsRes, recentDocsRes, drawingSetsRes, docsForTrendRes] =
    await Promise.all([
      supabase
        .from("documents")
        .select("id, category")
        .eq("company_id", companyId),
      supabase
        .from("documents")
        .select("*, uploader:user_profiles!documents_uploaded_by_fkey(full_name, email), project:projects!documents_project_id_fkey(id, name, code)")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("drawing_sets")
        .select("id")
        .eq("company_id", companyId),
      supabase
        .from("documents")
        .select("id, created_at")
        .eq("company_id", companyId)
        .gte("created_at", twelveWeeksAgo),
    ]);

  const allDocs = allDocsRes.data ?? [];
  const recentDocuments = (recentDocsRes.data ?? []) as DocumentRow[];
  const drawingSets = drawingSetsRes.data ?? [];
  const docsForTrend = docsForTrendRes.data ?? [];

  const totalCount = allDocs.length;
  const planSpecCount = allDocs.filter(
    (d) => d.category === "plan" || d.category === "spec"
  ).length;
  const drawingSetCount = drawingSets.length;
  const recentUploadCount = docsForTrend.filter(
    (d) => new Date(d.created_at) >= new Date(sevenDaysAgo)
  ).length;

  // Category breakdown
  const catMap = new Map<string, number>();
  for (const d of allDocs) {
    const cat = d.category || "other";
    catMap.set(cat, (catMap.get(cat) ?? 0) + 1);
  }
  const categoryBreakdown = Array.from(catMap.entries()).map(
    ([category, count]) => ({ category, count })
  );

  // Weekly uploads (12 weeks)
  const weeklyMap = new Map<string, number>();
  for (let w = 11; w >= 0; w--) {
    const weekStart = new Date(now.getTime() - w * 7 * 24 * 60 * 60 * 1000);
    const label = weekStart.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    weeklyMap.set(label, 0);
  }
  const weekLabels = Array.from(weeklyMap.keys());
  for (const d of docsForTrend) {
    const docDate = new Date(d.created_at);
    const weeksAgo = Math.floor(
      (now.getTime() - docDate.getTime()) / (7 * 24 * 60 * 60 * 1000)
    );
    const idx = 11 - weeksAgo;
    if (idx >= 0 && idx < weekLabels.length) {
      const label = weekLabels[idx];
      weeklyMap.set(label, (weeklyMap.get(label) ?? 0) + 1);
    }
  }
  const weeklyUploads = Array.from(weeklyMap.entries()).map(
    ([week, count]) => ({ week, count })
  );

  return {
    totalCount,
    planSpecCount,
    drawingSetCount,
    recentUploadCount,
    categoryBreakdown,
    weeklyUploads,
    recentDocuments,
  };
}
