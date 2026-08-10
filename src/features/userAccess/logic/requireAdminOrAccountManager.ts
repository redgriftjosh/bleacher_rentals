import { auth } from "@clerk/nextjs/server";
import { hasAdminOrAccountManagerRole } from "./hasAdminOrAccountManagerRole";
import { resolveUserAccessForRequest } from "./resolveUserAccessForRequest";

/**
 * Server guard for quote tax and similar flows: admin or active account manager.
 */
export async function requireAdminOrAccountManager(): Promise<string> {
  const { userId } = await auth();

  if (!userId) {
    throw new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const access = await resolveUserAccessForRequest(userId);

  if (access.status !== "active" || !hasAdminOrAccountManagerRole(access.roles)) {
    throw new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  return userId;
}
