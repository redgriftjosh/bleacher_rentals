import { createClient } from "@supabase/supabase-js";
import { SupabaseClient } from "@supabase/supabase-js";

const clients = new Map<string, SupabaseClient>();

/* This stops the warning:
GoTrueClient.ts:198 Multiple GoTrueClient instances detected in the same browser context. 
It is not an error, but this should be avoided as it may produce undefined behavior when 
used concurrently under the same storage key.

Only creates client with the same token once.
*/

export const supabaseClient = (supabaseToken: string) => {
  if (clients.has(supabaseToken)) {
    return clients.get(supabaseToken)!;
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${supabaseToken}`,
        },
      },
    }
  );

  clients.set(supabaseToken, supabase);
  return supabase;
};
