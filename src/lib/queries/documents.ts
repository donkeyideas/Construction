import { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDateShort, toDateStr } from "@/lib/utils/format";

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
  folder_id?: string | null;
  thumbnail_url?: string | null;
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
   resolveUploaderNames - Fill in uploader info for docs where FK join
   returned null (e.g. tenant users not in company_members)
   ------------------------------------------------------------------ */

async function resolveUploaderNames(docs: DocumentRow[]): Promise<void> {
  const missing = docs.filter(
    (d) => !d.uploader && d.uploaded_by
  );
  if (missing.length === 0) return;

  const userIds = [...new Set(missing.map((d) => d.uploaded_by))];
  const admin = createAdminClient();
  const { data: profiles } = await admin
    .from("user_profiles")
    .select("id, full_name, email")
    .in("id", userIds);

  if (!profiles || profiles.length === 0) return;

  const profileMap = new Map(
    profiles.map((p: { id: string; full_name: string; email: string }) => [
      p.id,
      { full_name: p.full_name, email: p.email },
    ])
  );

  for (const doc of missing) {
    const profile = profileMap.get(doc.uploaded_by);
    if (profile) {
      doc.uploader = profile;
    }
  }
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
    .select("*")
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
    // Also handle leading-slash variant for backwards compatibility
    const fp = filters.folderPath;
    const altFp = fp.startsWith("/") ? fp.slice(1) : `/${fp}`;
    query = query.or(
      `folder_path.eq.${fp},folder_path.like.${fp}/%,folder_path.eq.${altFp},folder_path.like.${altFp}/%`
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

  const docs = (data ?? []) as DocumentRow[];

  // Batch-fetch uploader profiles, projects, and properties
  const uploaderIds = new Set<string>();
  const docProjectIds = new Set<string>();
  const docPropertyIds = new Set<string>();
  for (const d of docs) {
    if (d.uploaded_by) uploaderIds.add(d.uploaded_by);
    if (d.project_id) docProjectIds.add(d.project_id);
    if (d.property_id) docPropertyIds.add(d.property_id);
  }

  const [uploaderRes, projRes, propRes] = await Promise.all([
    uploaderIds.size > 0
      ? supabase.from("user_profiles").select("id, full_name, email").in("id", [...uploaderIds])
      : Promise.resolve({ data: null }),
    docProjectIds.size > 0
      ? supabase.from("projects").select("id, name, code").in("id", [...docProjectIds])
      : Promise.resolve({ data: null }),
    docPropertyIds.size > 0
      ? supabase.from("properties").select("id, name").in("id", [...docPropertyIds])
      : Promise.resolve({ data: null }),
  ]);

  const uploaderMap = new Map((uploaderRes.data ?? []).map((p: { id: string; full_name: string; email: string }) => [p.id, { full_name: p.full_name, email: p.email }]));
  const docProjMap = new Map((projRes.data ?? []).map((p: { id: string; name: string; code: string }) => [p.id, p]));
  const docPropMap = new Map((propRes.data ?? []).map((p: { id: string; name: string }) => [p.id, p]));

  for (const d of docs) {
    d.uploader = d.uploaded_by ? uploaderMap.get(d.uploaded_by) ?? null : null;
    d.project = d.project_id ? docProjMap.get(d.project_id) ?? null : null;
    d.property = d.property_id ? docPropMap.get(d.property_id) ?? null : null;
  }

  // Resolve missing uploader names (e.g. tenant users blocked by RLS)
  await resolveUploaderNames(docs);

  return docs;
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
    .select("*")
    .eq("id", documentId)
    .single();

  if (error) {
    console.error("getDocumentById error:", error);
    return null;
  }

  const doc = data as DocumentRow;

  // Fetch uploader, project, property in parallel
  const [uploaderRes2, projRes2, propRes2] = await Promise.all([
    doc.uploaded_by
      ? supabase.from("user_profiles").select("id, full_name, email").eq("id", doc.uploaded_by).maybeSingle()
      : Promise.resolve({ data: null }),
    doc.project_id
      ? supabase.from("projects").select("id, name, code").eq("id", doc.project_id).maybeSingle()
      : Promise.resolve({ data: null }),
    doc.property_id
      ? supabase.from("properties").select("id, name").eq("id", doc.property_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  doc.uploader = uploaderRes2.data ? { full_name: uploaderRes2.data.full_name, email: uploaderRes2.data.email } : null;
  doc.project = projRes2.data ?? null;
  doc.property = propRes2.data ?? null;

  await resolveUploaderNames([doc]);
  return doc;
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
    .select("*")
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

  const planDocs = (data ?? []) as DocumentRow[];

  // Batch-fetch uploader profiles, projects, and drawing sets
  const planUploaderIds = new Set<string>();
  const planProjectIds = new Set<string>();
  const planDrawingSetIds = new Set<string>();
  for (const d of planDocs) {
    if (d.uploaded_by) planUploaderIds.add(d.uploaded_by);
    if (d.project_id) planProjectIds.add(d.project_id);
    if (d.drawing_set_id) planDrawingSetIds.add(d.drawing_set_id);
  }

  const [planUploaderRes, planProjRes, planDsRes] = await Promise.all([
    planUploaderIds.size > 0
      ? supabase.from("user_profiles").select("id, full_name, email").in("id", [...planUploaderIds])
      : Promise.resolve({ data: null }),
    planProjectIds.size > 0
      ? supabase.from("projects").select("id, name, code").in("id", [...planProjectIds])
      : Promise.resolve({ data: null }),
    planDrawingSetIds.size > 0
      ? supabase.from("drawing_sets").select("id, name, discipline, status").in("id", [...planDrawingSetIds])
      : Promise.resolve({ data: null }),
  ]);

  const planUploaderMap = new Map((planUploaderRes.data ?? []).map((p: { id: string; full_name: string; email: string }) => [p.id, { full_name: p.full_name, email: p.email }]));
  const planProjMap = new Map((planProjRes.data ?? []).map((p: { id: string; name: string; code: string }) => [p.id, p]));
  const planDsMap = new Map((planDsRes.data ?? []).map((d: { id: string; name: string; discipline: string | null; status: string }) => [d.id, d]));

  for (const d of planDocs) {
    d.uploader = d.uploaded_by ? planUploaderMap.get(d.uploaded_by) ?? null : null;
    d.project = d.project_id ? planProjMap.get(d.project_id) ?? null : null;
    d.drawing_set = d.drawing_set_id ? planDsMap.get(d.drawing_set_id) ?? null : null;
  }

  return planDocs;
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
    .select("*")
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

  const versionDocs = (data ?? []) as DocumentRow[];

  // Batch-fetch uploader profiles
  const versionUploaderIds = [...new Set(versionDocs.map((d) => d.uploaded_by).filter(Boolean))];
  if (versionUploaderIds.length > 0) {
    const { data: profiles } = await supabase
      .from("user_profiles")
      .select("id, full_name, email")
      .in("id", versionUploaderIds);
    const versionUploaderMap = new Map(
      (profiles ?? []).map((p: { id: string; full_name: string; email: string }) => [p.id, { full_name: p.full_name, email: p.email }])
    );
    for (const d of versionDocs) {
      d.uploader = d.uploaded_by ? versionUploaderMap.get(d.uploaded_by) ?? null : null;
    }
  }

  return versionDocs;
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
        .select("*")
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

  // Batch-fetch uploader profiles and projects for recent documents
  const ovUploaderIds = new Set<string>();
  const ovProjectIds = new Set<string>();
  for (const d of recentDocuments) {
    if (d.uploaded_by) ovUploaderIds.add(d.uploaded_by);
    if (d.project_id) ovProjectIds.add(d.project_id);
  }
  const [ovUploaderRes, ovProjRes] = await Promise.all([
    ovUploaderIds.size > 0
      ? supabase.from("user_profiles").select("id, full_name, email").in("id", [...ovUploaderIds])
      : Promise.resolve({ data: null }),
    ovProjectIds.size > 0
      ? supabase.from("projects").select("id, name, code").in("id", [...ovProjectIds])
      : Promise.resolve({ data: null }),
  ]);
  const ovUploaderMap = new Map((ovUploaderRes.data ?? []).map((p: { id: string; full_name: string; email: string }) => [p.id, { full_name: p.full_name, email: p.email }]));
  const ovProjMap = new Map((ovProjRes.data ?? []).map((p: { id: string; name: string; code: string }) => [p.id, p]));
  for (const d of recentDocuments) {
    d.uploader = d.uploaded_by ? ovUploaderMap.get(d.uploaded_by) ?? null : null;
    d.project = d.project_id ? ovProjMap.get(d.project_id) ?? null : null;
  }

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
    const label = formatDateShort(toDateStr(weekStart));
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

/* ------------------------------------------------------------------
   Types for Document Folders & Asset Library
   ------------------------------------------------------------------ */

export interface DocumentFolderRow {
  id: string;
  company_id: string;
  name: string;
  parent_id: string | null;
  color: string;
  sort_order: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AssetLibraryRow {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  file_path: string;
  file_type: string | null;
  file_size: number;
  thumbnail_url: string | null;
  asset_type: string;
  tags: string[];
  usage_count: number;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
}

/* ------------------------------------------------------------------
   getDocumentFolders - List virtual folders for a company
   ------------------------------------------------------------------ */

export async function getDocumentFolders(
  supabase: SupabaseClient,
  companyId: string
): Promise<DocumentFolderRow[]> {
  const { data, error } = await supabase
    .from("document_folders")
    .select("*")
    .eq("company_id", companyId)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    console.error("getDocumentFolders error:", error);
    return [];
  }

  return (data ?? []) as DocumentFolderRow[];
}

/* ------------------------------------------------------------------
   getAssetLibrary - List asset library items for a company
   ------------------------------------------------------------------ */

export async function getAssetLibrary(
  supabase: SupabaseClient,
  companyId: string
): Promise<AssetLibraryRow[]> {
  const { data, error } = await supabase
    .from("asset_library")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getAssetLibrary error:", error);
    return [];
  }

  return (data ?? []) as AssetLibraryRow[];
}

/* ------------------------------------------------------------------
   createDocumentFolder - Create a new virtual folder
   ------------------------------------------------------------------ */

export async function createDocumentFolder(
  supabase: SupabaseClient,
  companyId: string,
  name: string,
  parentId?: string | null,
  color?: string
): Promise<{ folder: DocumentFolderRow | null; error: string | null }> {
  const { data, error } = await supabase
    .from("document_folders")
    .insert({
      company_id: companyId,
      name,
      parent_id: parentId ?? null,
      color: color ?? "#6366f1",
    })
    .select()
    .single();

  if (error) {
    console.error("createDocumentFolder error:", error);
    return { folder: null, error: error.message };
  }

  return { folder: data as DocumentFolderRow, error: null };
}

/* ------------------------------------------------------------------
   moveDocumentsToFolder - Move documents to a folder (or unfiled)
   ------------------------------------------------------------------ */

export async function moveDocumentsToFolder(
  supabase: SupabaseClient,
  documentIds: string[],
  folderId: string | null
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("documents")
    .update({ folder_id: folderId })
    .in("id", documentIds);

  if (error) {
    console.error("moveDocumentsToFolder error:", error);
    return { error: error.message };
  }

  return { error: null };
}
