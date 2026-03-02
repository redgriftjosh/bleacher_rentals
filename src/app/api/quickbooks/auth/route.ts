import { oauthClient } from "@/features/quickbooks-integration/oauthClient";
import OAuthClient from "intuit-oauth-ts";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const authUri = oauthClient.authorizeUri({
      scope: [OAuthClient.scopes.Accounting],
      state: "Init",
    });
    return NextResponse.redirect(authUri);
  } catch (error: any) {
    console.error("QuickBooks auth error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
