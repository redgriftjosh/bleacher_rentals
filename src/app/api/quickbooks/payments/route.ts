import { getBaseUrl, getQboAccessTokenAndRealmId } from "@/features/quickbooks-integration/util";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { accessToken, realmId } = await getQboAccessTokenAndRealmId();
    const baseUrl = getBaseUrl();

    const url = `${baseUrl}/${realmId}/query?query=select * from Payment&minorversion=40`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
      console.error("QuickBooks API error:", errorData);
      return NextResponse.json({ error: errorData }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("QuickBooks payments error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
