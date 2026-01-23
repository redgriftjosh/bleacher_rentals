import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

// Ensure this route is never statically cached
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { userId, getToken } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Optional: allow choosing template via query param (?template=powersync)
  // Safer: lock this down to a short allowlist.
  const url = new URL(req.url);
  const template = url.searchParams.get("template") ?? "powersync";

  if (!["powersync", "supabase"].includes(template)) {
    return NextResponse.json({ error: `Invalid template: ${template}` }, { status: 400 });
  }

  const token = await getToken({ template });

  if (!token) {
    return NextResponse.json({ error: "Could not fetch Clerk token" }, { status: 500 });
  }

  // PowerSync usually expects endpoint + token
  const endpoint = process.env.NEXT_PUBLIC_POWERSYNC_URL;

  if (!endpoint) {
    return NextResponse.json({ error: "NEXT_PUBLIC_POWERSYNC_URL is not set" }, { status: 500 });
  }

  const res = NextResponse.json({ endpoint, token });

  // Extra safety: don’t let intermediaries cache this
  res.headers.set("Cache-Control", "no-store");

  return res;
}
