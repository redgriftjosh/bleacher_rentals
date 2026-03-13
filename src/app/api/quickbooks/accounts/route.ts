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

    // Fetch all active expense-type accounts
    const query = encodeURIComponent(
      "select * from Account where Active = true and Classification = 'Expense'",
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

    const accounts = data.QueryResponse?.Account || [];
    const formattedAccounts = accounts.map((account: any) => ({
      id: account.Id,
      name: account.Name,
      fullyQualifiedName: account.FullyQualifiedName,
      accountType: account.AccountType,
      accountSubType: account.AccountSubType,
      active: account.Active,
    }));

    return NextResponse.json({ accounts: formattedAccounts });
  } catch (error: any) {
    console.error("QuickBooks accounts error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
