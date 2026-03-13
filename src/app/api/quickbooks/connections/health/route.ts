import { getBaseUrl, getQboAccessTokenAndRealmId } from "@/features/quickbooks-integration/util";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * Checks whether a QBO connection is healthy by making a lightweight API call.
 */
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const connectionId = req.nextUrl.searchParams.get("connectionId");
  if (!connectionId) {
    return NextResponse.json({ error: "connectionId is required" }, { status: 400 });
  }

  try {
    const { accessToken, realmId } = await getQboAccessTokenAndRealmId(connectionId);
    const baseUrl = getBaseUrl();

    // Lightweight query to verify the connection works
    const query = encodeURIComponent("select count(*) from CompanyInfo");
    const url = `${baseUrl}/${realmId}/query?query=${query}&minorversion=40`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { healthy: false, error: "QBO API returned error" },
        { status: 200 },
      );
    }

    return NextResponse.json({ healthy: true });
  } catch (error: any) {
    return NextResponse.json({ healthy: false, error: error.message }, { status: 200 });
  }
}
