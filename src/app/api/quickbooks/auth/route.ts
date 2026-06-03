import { createOAuthClient } from "@/features/quickbooks-integration/util";
import { requireAdmin } from "@/features/userAccess/logic/requireAdmin";
import OAuthClient from "intuit-oauth-ts";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();

    const connectionId = req.nextUrl.searchParams.get("connectionId");
    if (!connectionId) {
      return NextResponse.json({ error: "connectionId is required" }, { status: 400 });
    }

    const client = createOAuthClient();
    const authUri = client.authorizeUri({
      scope: [OAuthClient.scopes.Accounting],
      state: connectionId,
    });
    return NextResponse.redirect(authUri);
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("QuickBooks auth error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
