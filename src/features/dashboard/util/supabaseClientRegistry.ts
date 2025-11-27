import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Global registry for the Supabase client instance
 * Used by PixiJS components that can't use React hooks
 */
class SupabaseClientRegistry {
  private client: SupabaseClient | null = null;

  setClient(client: SupabaseClient | null) {
    this.client = client;
  }

  getClient(): SupabaseClient | null {
    return this.client;
  }
}

export const supabaseClientRegistry = new SupabaseClientRegistry();
