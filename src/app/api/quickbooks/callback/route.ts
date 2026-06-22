import { createOAuthClient, saveTokens, getBaseUrl } from "@/features/quickbooks-integration/util";
import { setQboConnectionRealmId, setQboConnectionCurrency, deleteQboConnection } from "@/features/quickbooks-integration/db";
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

    // Fetch currency from QBO CompanyInfo
    if (realmId && authResponse.token.access_token) {
      try {
        const baseUrl = getBaseUrl();
        const url = `${baseUrl}/${realmId}/companyinfo/${realmId}?minorversion=40`;
        const res = await fetch(url, {
          headers: {
            Authorization: `Bearer ${authResponse.token.access_token}`,
            Accept: "application/json",
          },
        });
        if (res.ok) {
          const json = await res.json();
          const companyInfo = json?.CompanyInfo;
          // QBO stores currency in Country or we can check the Currency preference
          const currency =
            companyInfo?.HomeCurrency?.value ??
            companyInfo?.Currency?.value ??
            (companyInfo?.Country === "CA" ? "CAD" :
            companyInfo?.Country === "US" ? "USD" :
            null);
          if (currency) {
            await setQboConnectionCurrency(connectionId, currency.toUpperCase());
          }
        }
      } catch (err) {
        console.error("Failed to fetch QBO currency:", err);
      }
    }

    // Redirect back to the QuickBooks connections page
    return NextResponse.redirect(new URL("/quickbooks", req.url));
  } catch (error: any) {
    console.error("QuickBooks callback error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
