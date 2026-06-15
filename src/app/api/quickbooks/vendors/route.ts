import { getBaseUrl, getQboAccessTokenAndRealmId } from "@/features/quickbooks-integration/util";
import { requireAuth } from "@/features/userAccess/logic/requireAuth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    await requireAuth();

    const connectionId = req.nextUrl.searchParams.get("connectionId");
    if (!connectionId) {
      return NextResponse.json({ error: "connectionId is required" }, { status: 400 });
    }
    const { accessToken, realmId } = await getQboAccessTokenAndRealmId(connectionId);
    const baseUrl = getBaseUrl();

    const allVendors: any[] = [];
    const pageSize = 1000;
    let startPosition = 1;

    // Paginate through all vendors
    while (true) {
      const query = encodeURIComponent(
        `select * from Vendor where Active = true startPosition ${startPosition} maxResults ${pageSize}`,
      );
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
      const vendors = data.QueryResponse?.Vendor || [];
      allVendors.push(...vendors);

      if (vendors.length < pageSize) break;
      startPosition += pageSize;
    }

    // Transform to simpler format for dropdown
    const formattedVendors = allVendors.map((vendor: any) => ({
      id: vendor.Id,
      displayName: vendor.DisplayName,
      companyName: vendor.CompanyName,
      active: vendor.Active,
    }));

    return NextResponse.json({ vendors: formattedVendors });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("QuickBooks vendors error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
