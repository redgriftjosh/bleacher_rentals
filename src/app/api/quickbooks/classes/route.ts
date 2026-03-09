import { getBaseUrl, getQboAccessTokenAndRealmId } from "@/features/quickbooks-integration/util";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { accessToken, realmId } = await getQboAccessTokenAndRealmId();
    const baseUrl = getBaseUrl();

    const query = encodeURIComponent("select * from Class where Active = true");
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

    const classes = data.QueryResponse?.Class || [];
    const formattedClasses = classes.map((cls: any) => ({
      id: cls.Id,
      name: cls.Name,
      fullyQualifiedName: cls.FullyQualifiedName,
      active: cls.Active,
    }));

    return NextResponse.json({ classes: formattedClasses });
  } catch (error: any) {
    console.error("QuickBooks classes error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
