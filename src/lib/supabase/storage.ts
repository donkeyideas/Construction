import { createAdminClient } from "./admin";

const BUCKET = "documents";

let bucketReady = false;

/**
 * Ensures the "documents" storage bucket exists.
 * Uses the service-role admin client which bypasses RLS.
 */
async function ensureBucket() {
  if (bucketReady) return;

  const admin = createAdminClient();
  const { data, error } = await admin.storage.getBucket(BUCKET);

  if (error || !data) {
    // Bucket doesn't exist — create it
    const { error: createErr } = await admin.storage.createBucket(BUCKET, {
      public: false,
      fileSizeLimit: 104857600, // 100 MB
    });

    if (createErr && !createErr.message?.includes("already exists")) {
      console.error("Failed to create storage bucket:", createErr);
      throw new Error(`Storage bucket creation failed: ${createErr.message}`);
    }
  }

  bucketReady = true;
}

/** Upload a file to the documents bucket (uses admin client). */
export async function storageUpload(
  path: string,
  file: File | Blob | Buffer,
  options?: { contentType?: string; upsert?: boolean }
) {
  await ensureBucket();
  const admin = createAdminClient();
  return admin.storage.from(BUCKET).upload(path, file, {
    contentType: options?.contentType,
    upsert: options?.upsert ?? false,
  });
}

/** Create a signed download URL (uses admin client). */
export async function storageSignedUrl(path: string, expiresIn = 3600) {
  await ensureBucket();
  const admin = createAdminClient();
  return admin.storage.from(BUCKET).createSignedUrl(path, expiresIn);
}

/** Remove files from the documents bucket (uses admin client). */
export async function storageRemove(paths: string[]) {
  await ensureBucket();
  const admin = createAdminClient();
  return admin.storage.from(BUCKET).remove(paths);
}
