import { getBaseUrl, getQboAccessTokenAndRealmId } from "@/features/quickbooks-integration/util";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

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

    const query = encodeURIComponent("select * from TaxCode where Active = true");
    const url = `${baseUrl}/${realmId}/query?query=${query}&minorversion=40`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
      return NextResponse.json({ error: errorData }, { status: response.status });
    }

    const data = await response.json();
    const taxCodes = (data.QueryResponse?.TaxCode || []).map((tc: any) => ({
      id: tc.Id,
      name: tc.Name,
      description: tc.Description ?? null,
      taxable: tc.Taxable ?? false,
    }));

    return NextResponse.json({ taxCodes });
  } catch (error: any) {
    console.error("QuickBooks tax-codes error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
