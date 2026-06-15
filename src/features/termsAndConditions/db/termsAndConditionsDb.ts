import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "../../../../database.types";
import { db, powerSyncDb } from "@/components/providers/SystemProvider";
import { createErrorToast } from "@/components/toasts/ErrorToast";

export type TermsAndConditionsRow = {
  id: string;
  name: string;
  html_content: string;
  created_at: string;
  deleted: number;
};

export async function fetchAllTermsAndConditions(): Promise<TermsAndConditionsRow[]> {
  const compiled = db
    .selectFrom("TermsAndConditions")
    .select(["id", "name", "html_content", "created_at", "deleted"])
    .where("deleted", "=", 0)
    .orderBy("created_at", "desc")
    .compile();

  return powerSyncDb.getAll<TermsAndConditionsRow>(compiled.sql, compiled.parameters as any[]);
}

export async function fetchTermsAndConditionsById(
  id: string,
): Promise<TermsAndConditionsRow | null> {
  const compiled = db
    .selectFrom("TermsAndConditions")
    .select(["id", "name", "html_content", "created_at", "deleted"])
    .where("id", "=", id)
    .compile();

  const rows = await powerSyncDb.getAll<TermsAndConditionsRow>(
    compiled.sql,
    compiled.parameters as any[],
  );
  return rows[0] ?? null;
}

export async function createTermsAndConditions(
  params: { name: string; htmlContent: string },
  supabase: SupabaseClient<Database>,
): Promise<string> {
  const { data, error } = await supabase
    .from("TermsAndConditions")
    .insert({ name: params.name, html_content: params.htmlContent })
    .select("id")
    .single();

  if (error || !data) {
    createErrorToast(["Failed to create contract template.", error?.message ?? ""]);
    throw error;
  }

  return data.id;
}

export async function updateTermsAndConditions(
  id: string,
  params: { name: string; htmlContent: string },
  supabase: SupabaseClient<Database>,
): Promise<void> {
  const { error } = await supabase
    .from("TermsAndConditions")
    .update({ name: params.name, html_content: params.htmlContent })
    .eq("id", id);

  if (error) {
    createErrorToast(["Failed to update contract template.", error.message ?? ""]);
    throw error;
  }
}

export async function softDeleteTermsAndConditions(
  id: string,
  supabase: SupabaseClient<Database>,
): Promise<void> {
  const { error } = await supabase
    .from("TermsAndConditions")
    .update({ deleted: true })
    .eq("id", id);

  if (error) {
    createErrorToast(["Failed to delete contract template.", error.message ?? ""]);
    throw error;
  }
}
