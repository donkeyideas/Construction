import { createAdminClient } from "@/lib/supabase/admin";

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  variables: string[];
  category: "system" | "billing" | "notification" | "marketing" | "onboarding";
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type EmailTemplateInsert = Omit<EmailTemplate, "id" | "created_at" | "updated_at">;
export type EmailTemplateUpdate = Partial<Pick<EmailTemplate, "subject" | "body" | "variables" | "is_active" | "category" | "name">>;

/**
 * Fetch all email templates, ordered by category then name.
 */
export async function getEmailTemplates(): Promise<EmailTemplate[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("email_templates")
    .select("*")
    .order("category", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    console.error("getEmailTemplates error:", error);
    return [];
  }

  return (data ?? []) as EmailTemplate[];
}

/**
 * Fetch a single email template by ID.
 */
export async function getEmailTemplateById(id: string): Promise<EmailTemplate | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("email_templates")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("getEmailTemplateById error:", error);
    return null;
  }

  return data as EmailTemplate;
}

/**
 * Update an email template.
 */
export async function updateEmailTemplate(
  id: string,
  updates: EmailTemplateUpdate
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();

  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (updates.subject !== undefined) updateData.subject = updates.subject;
  if (updates.body !== undefined) updateData.body = updates.body;
  if (updates.variables !== undefined) updateData.variables = updates.variables;
  if (typeof updates.is_active === "boolean") updateData.is_active = updates.is_active;
  if (updates.category !== undefined) updateData.category = updates.category;
  if (updates.name !== undefined) updateData.name = updates.name;

  const { error } = await supabase
    .from("email_templates")
    .update(updateData)
    .eq("id", id);

  if (error) {
    console.error("updateEmailTemplate error:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Create a new email template.
 */
export async function createEmailTemplate(
  data: EmailTemplateInsert
): Promise<{ success: boolean; error?: string; id?: string }> {
  const supabase = createAdminClient();

  const { data: inserted, error } = await supabase
    .from("email_templates")
    .insert({
      name: data.name,
      subject: data.subject,
      body: data.body,
      variables: data.variables,
      category: data.category,
      is_active: data.is_active,
    })
    .select("id")
    .single();

  if (error) {
    console.error("createEmailTemplate error:", error);
    return { success: false, error: error.message };
  }

  return { success: true, id: inserted?.id };
}

/**
 * Delete an email template.
 */
export async function deleteEmailTemplate(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("email_templates")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("deleteEmailTemplate error:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}
