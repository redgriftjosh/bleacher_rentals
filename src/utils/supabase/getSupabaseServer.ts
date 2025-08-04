import { createServerClient } from "@supabase/ssr";
import { SupabaseClient } from "@supabase/supabase-js";

export const getSupabaseServer = async (supabaseToken: string): Promise<SupabaseClient> => {
  const token = supabaseToken;
  if (!token) throw new Error("Failed to get Supabase token");

  const supabase = await createClient(token);
  if (!supabase) throw new Error("Failed to create Supabase client");

  return supabase;
};

const createClient = async (token: string) => {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
      cookies: {
        getAll: () => [], // not using cookies here
        setAll: () => {}, // noop to suppress warning
      },
    }
  );
};
