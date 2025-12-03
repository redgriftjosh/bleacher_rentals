// import { createClient } from "@supabase/supabase-js";
// import { SupabaseClient } from "@supabase/supabase-js";

// /* This stops the warning:
// GoTrueClient.ts:198 Multiple GoTrueClient instances detected in the same browser context.
// It is not an error, but this should be avoided as it may produce undefined behavior when
// used concurrently under the same storage key.

// Only creates client with the same token once.
// */

// let currentClient: SupabaseClient<Database> | null = null;
// let currentToken: string | null = null;

// export const supabaseClient = (supabaseToken: string) => {
//   if (currentClient && currentToken === supabaseToken) {
//     return currentClient;
//   }

//   if (currentClient) {
//     currentClient.removeAllChannels();
//   }

//   currentToken = supabaseToken;

//   currentClient = createClient(
//     process.env.NEXT_PUBLIC_SUPABASE_URL!,
//     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
//     {
//       global: {
//         headers: {
//           Authorization: `Bearer ${supabaseToken}`,
//         },
//       },
//       auth: {
//         persistSession: false,
//         autoRefreshToken: false,
//       },
//     }
//   );

//   return currentClient;
// };
