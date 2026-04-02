import { createOAuthClient, saveTokens } from "@/features/quickbooks-integration/util";
import { setQboConnectionRealmId, deleteQboConnection } from "@/features/quickbooks-integration/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const client = createOAuthClient();
    const parseRedirect = req.url;
    const authResponse = await client.createToken(parseRedirect);
    const tokens = {
      ...authResponse.getJson(),
      realmId: authResponse.token.realmId,
      createdAt: Date.now(),
    };

    // The connectionId was passed as the OAuth state parameter
    const connectionId = req.nextUrl.searchParams.get("state");
    if (!connectionId) {
      return NextResponse.json({ error: "Missing connection state" }, { status: 400 });
    }

    const realmId = authResponse.token.realmId;

    // Check for duplicate company before saving tokens
    if (realmId) {
      try {
        await setQboConnectionRealmId(connectionId, realmId);
      } catch (error: any) {
        // Duplicate company — clean up the placeholder connection
        await deleteQboConnection(connectionId).catch(() => {});
        // Redirect back with error message so the UI can display it
        const errorUrl = new URL("/quickbooks", req.url);
        errorUrl.searchParams.set("error", error.message);
        return NextResponse.redirect(errorUrl);
      }
    }

    await saveTokens(connectionId, tokens);

    // Redirect back to the QuickBooks connections page
    return NextResponse.redirect(new URL("/quickbooks", req.url));
  } catch (error: any) {
    console.error("QuickBooks callback error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
