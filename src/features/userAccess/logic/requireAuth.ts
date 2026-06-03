import { auth } from "@clerk/nextjs/server";

/**
 * Server-side guard: resolves the current Clerk user.
 *
 * Returns the clerk userId on success, or throws a `Response` (401)
 * that the caller can return directly from an API route.
 *
 * Usage in a route handler:
 * ```ts
 * const userId = await requireAuth();   // throws Response on failure
 * ```
 */
export async function requireAuth(): Promise<string> {
  const { userId } = await auth();

  if (!userId) {
    throw new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  return userId;
}
