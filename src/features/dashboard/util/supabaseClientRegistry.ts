import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "../../../../database.types";

/**
 * Global registry for the Supabase client instance
 * Used by PixiJS components that can't use React hooks
 */
class SupabaseClientRegistry {
  private client: SupabaseClient<Database> | null = null;

  setClient(client: SupabaseClient<Database> | null) {
    this.client = client;
  }

  getClient(): SupabaseClient<Database> | null {
    return this.client;
  }
}

export const supabaseClientRegistry = new SupabaseClientRegistry();
