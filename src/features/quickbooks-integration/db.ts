import { createServiceRoleClient } from "@/utils/supabase/server";

/**
 * Stores encrypted QuickBooks OAuth tokens in the database using service role.
 * Updates existing token if present, otherwise inserts a new one.
 * Should only be called from server-side code (API routes).
 */
export async function setQboTokens(encryptedTokens: string): Promise<void> {
  const supabase = await createServiceRoleClient();

  // Check if a token already exists
  const { data: existingTokens } = await supabase
    .from("QboTokens")
    .select("id")
    .limit(1)
    .maybeSingle();

  if (existingTokens) {
    // Update existing token
    const { error } = await supabase
      .from("QboTokens")
      .update({ encrypted_token_value: encryptedTokens })
      .eq("id", existingTokens.id);

    if (error) {
      console.error("Failed to update QBO tokens:", error);
      throw new Error(`Failed to update QBO tokens: ${error.message}`);
    }
  } else {
    // Insert new token
    const { error } = await supabase
      .from("QboTokens")
      .insert({ encrypted_token_value: encryptedTokens });

    if (error) {
      console.error("Failed to insert QBO tokens:", error);
      throw new Error(`Failed to insert QBO tokens: ${error.message}`);
    }
  }
}

/**
 * Retrieves encrypted QuickBooks OAuth tokens from the database using service role.
 * Should only be called from server-side code (API routes).
 */
export async function getQboTokens(): Promise<string | null> {
  const supabase = await createServiceRoleClient();

  const { data, error } = await supabase
    .from("QboTokens")
    .select("encrypted_token_value")
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Failed to fetch QBO tokens:", error);
    throw new Error(`Failed to fetch QBO tokens: ${error.message}`);
  }

  return data?.encrypted_token_value ?? null;
}
