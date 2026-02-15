import { createAdminClient } from "@/lib/supabase/admin";

export interface FeatureFlag {
  id: string;
  name: string;
  description: string | null;
  is_enabled: boolean;
  plan_requirements: string[];
  created_at: string;
  updated_at: string;
}

/**
 * Fetch all feature flags, ordered by name.
 */
export async function getFeatureFlags(): Promise<FeatureFlag[]> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("feature_flags")
    .select("id, name, description, is_enabled, plan_requirements, created_at, updated_at")
    .order("name");

  if (error) {
    console.error("getFeatureFlags error:", error);
    return [];
  }

  return (data ?? []) as FeatureFlag[];
}

/**
 * Update a feature flag by id.
 */
export async function updateFeatureFlag(
  id: string,
  data: {
    is_enabled?: boolean;
    description?: string;
    plan_requirements?: string[];
  }
): Promise<{ error: string | null }> {
  const admin = createAdminClient();

  const { error } = await admin
    .from("feature_flags")
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    console.error("updateFeatureFlag error:", error);
    return { error: "Failed to update feature flag." };
  }

  return { error: null };
}

/**
 * Create a new feature flag.
 */
export async function createFeatureFlag(data: {
  name: string;
  description?: string;
  is_enabled?: boolean;
  plan_requirements?: string[];
}): Promise<{ error: string | null }> {
  const admin = createAdminClient();

  const { error } = await admin.from("feature_flags").insert({
    name: data.name,
    description: data.description || null,
    is_enabled: data.is_enabled ?? false,
    plan_requirements: data.plan_requirements ?? [],
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "A feature flag with this name already exists." };
    }
    console.error("createFeatureFlag error:", error);
    return { error: "Failed to create feature flag." };
  }

  return { error: null };
}

/**
 * Delete a feature flag by id.
 */
export async function deleteFeatureFlag(
  id: string
): Promise<{ error: string | null }> {
  const admin = createAdminClient();

  const { error } = await admin
    .from("feature_flags")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("deleteFeatureFlag error:", error);
    return { error: "Failed to delete feature flag." };
  }

  return { error: null };
}

/**
 * Check if a feature flag is enabled, optionally verifying plan access.
 * For use in application code to gate features.
 */
export async function isFeatureEnabled(
  name: string,
  planName?: string
): Promise<boolean> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("feature_flags")
    .select("is_enabled, plan_requirements")
    .eq("name", name)
    .single();

  if (error || !data) return false;
  if (!data.is_enabled) return false;

  // If no plan name provided, just check if the flag is enabled
  if (!planName) return true;

  // If plan_requirements is empty or null, the flag is available to all plans
  const requirements = data.plan_requirements as string[] | null;
  if (!requirements || requirements.length === 0) return true;

  return requirements.includes(planName);
}
