import { getBaseUrl, getQboAccessTokenAndRealmId } from "@/features/quickbooks-integration/util";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  // Require authentication
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

    // Query for active vendors only
    const query = encodeURIComponent("select * from Vendor where Active = true");
    const url = `${baseUrl}/${realmId}/query?query=${query}&minorversion=40`;

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

    // Transform to simpler format for dropdown
    const vendors = data.QueryResponse?.Vendor || [];
    const formattedVendors = vendors.map((vendor: any) => ({
      id: vendor.Id,
      displayName: vendor.DisplayName,
      companyName: vendor.CompanyName,
      active: vendor.Active,
    }));

    return NextResponse.json({ vendors: formattedVendors });
  } catch (error: any) {
    console.error("QuickBooks vendors error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
