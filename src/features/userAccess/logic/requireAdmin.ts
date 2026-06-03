import { auth } from "@clerk/nextjs/server";
import { createServerSupabaseClient } from "@/utils/supabase/getClerkSupabaseServerClient";

/**
 * Server-side guard: resolves the current Clerk user and verifies they have
 * the admin flag (`is_admin = true`) in the Users table.
 *
 * Uses the anon-key client with Clerk JWT so the query goes through RLS.
 * Users can always read their own row, so the is_admin check works
 * regardless of role.
 *
 * Returns the clerk userId on success, or throws a `Response` (401 / 403)
 * that the caller can return directly from an API route.
 *
 * Usage in a route handler:
 * ```ts
 * const userId = await requireAdmin();   // throws Response on failure
 * ```
 */
export async function requireAdmin(): Promise<string> {
  const { userId } = await auth();

  if (!userId) {
    throw new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from("Users")
    .select("is_admin")
    .eq("clerk_user_id", userId)
    .single();

  if (error || !data || !data.is_admin) {
    throw new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  return userId;
}
