import {
  fetchDriverName,
  fetchWorkTrackersForUserIdAndStartDate,
} from "@/features/workTrackers/db";
import { getSupabaseServer } from "@/utils/supabase/getSupabaseServer";
import { headers } from "next/headers";
import React from "react";
import { renderToStream } from "@react-pdf/renderer";
import { NextResponse } from "next/server";
import { calculateFinancialTotals, getDateRange } from "@/features/workTrackers/util";
import { MyDocument } from "@/features/workTrackers/components/PdfComponent";

export async function GET(
  request: Request,
  context: {
    params: Promise<{ userId: string; startDate: string }>;
  }
) {
  const { userId, startDate } = await context.params;

  const headerStore = headers();
  const authHeader = (await headerStore).get("authorization");

  const token = authHeader?.replace("Bearer ", "");
  if (!token) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const supabase = await getSupabaseServer(token);
  const data = await fetchWorkTrackersForUserIdAndStartDate(null, userId, startDate, supabase);
  const financialTotals = calculateFinancialTotals(data);
  //   console.log("subtotal", subtotal);
  //   console.log("tax", tax);
  //   console.log("total", total);
  console.log("financialTotals", financialTotals);
  const dateRange = getDateRange(startDate);
  const driverName = await fetchDriverName(userId, supabase);

  const stream = await renderToStream(
    <MyDocument
      workTrackers={data.workTrackers}
      header={{ dateRange, driverName: driverName }}
      financialTotals={financialTotals}
    />
  );

  return new NextResponse(stream as unknown as ReadableStream);
}
