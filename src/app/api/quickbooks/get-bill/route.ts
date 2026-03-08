import { getBaseUrl, getQboAccessTokenAndRealmId } from "@/features/quickbooks-integration/util";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  // Require authentication
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const billId = searchParams.get("billId");

    if (!billId) {
      return NextResponse.json({ error: "Missing required parameter: billId" }, { status: 400 });
    }

    // Get QuickBooks credentials
    const { accessToken, realmId } = await getQboAccessTokenAndRealmId();
    const baseUrl = getBaseUrl();

    // Fetch the bill from QuickBooks
    const response = await fetch(`${baseUrl}/${realmId}/bill/${billId}?minorversion=40`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
      console.error("QuickBooks API error:", errorData);
      return NextResponse.json(
        {
          error: "Failed to fetch bill from QuickBooks",
          details: errorData,
        },
        { status: response.status },
      );
    }

    const billData = await response.json();
    const bill = billData.Bill;

    if (!bill) {
      return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    }

    // Format the response data
    const formattedBill = {
      id: bill.Id,
      docNumber: bill.DocNumber,
      txnDate: bill.TxnDate,
      vendorRef: {
        value: bill.VendorRef?.value,
        name: bill.VendorRef?.name,
      },
      lineItems: (bill.Line || [])
        .filter((line: any) => line.DetailType === "AccountBasedExpenseLineDetail")
        .map((line: any) => ({
          id: line.Id,
          description: line.Description || "",
          amount: line.Amount || 0,
          accountRef: {
            value: line.AccountBasedExpenseLineDetail?.AccountRef?.value,
            name: line.AccountBasedExpenseLineDetail?.AccountRef?.name,
          },
          classRef: line.AccountBasedExpenseLineDetail?.ClassRef
            ? {
                value: line.AccountBasedExpenseLineDetail.ClassRef.value,
                name: line.AccountBasedExpenseLineDetail.ClassRef.name,
              }
            : null,
        })),
      totalAmt: bill.TotalAmt || 0,
      balance: bill.Balance || 0,
    };

    return NextResponse.json(formattedBill);
  } catch (error: any) {
    console.error("Get bill error:", error);
    return NextResponse.json({ error: error.message || "Failed to get bill" }, { status: 500 });
  }
}
