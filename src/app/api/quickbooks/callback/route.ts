import { oauthClient } from "@/features/quickbooks-integration/oauthClient";
import { saveTokens } from "@/features/quickbooks-integration/util";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const parseRedirect = req.url;
    const authResponse = await oauthClient.createToken(parseRedirect);
    const tokens = {
      ...authResponse.getJson(),
      realmId: authResponse.token.realmId,
    };
    await saveTokens(tokens);

    // Redirect to payments page to verify connection
    return NextResponse.redirect(new URL("/api/quickbooks/payments", req.url));
  } catch (error: any) {
    console.error("QuickBooks callback error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
