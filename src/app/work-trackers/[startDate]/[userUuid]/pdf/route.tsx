import {
  fetchDriverName,
  fetchWorkTrackersForUserUuidAndStartDate,
} from "@/features/workTrackers/db/db";
import { headers } from "next/headers";
import React from "react";
import { renderToStream } from "@react-pdf/renderer";
import { NextResponse } from "next/server";
import { calculateFinancialTotals, getDateRange } from "@/features/workTrackers/util";
import { MyDocument } from "@/features/workTrackers/components/PdfComponent";
import { createServerSupabaseClient } from "@/utils/supabase/getClerkSupabaseServerClient";

export async function GET(
  request: Request,
  context: {
    params: Promise<{ userUuid: string; startDate: string }>;
  },
) {
  const { userUuid, startDate } = await context.params;
  // const numericUserId = Number(userId);

  const headerStore = headers();
  // const authHeader = (await headerStore).get("authorization");

  const supabase = createServerSupabaseClient();
  const data = await fetchWorkTrackersForUserUuidAndStartDate(supabase, userUuid, startDate, true);
  const financialTotals = calculateFinancialTotals(data);
  //   console.log("subtotal", subtotal);
  //   console.log("tax", tax);
  //   console.log("total", total);
  console.log("financialTotals", financialTotals);
  const dateRange = getDateRange(startDate);
  const driverName = await fetchDriverName(userUuid, supabase);

  const stream = await renderToStream(
    <MyDocument
      workTrackers={data.workTrackers}
      header={{ dateRange, driverName: driverName }}
      financialTotals={financialTotals}
    />,
  );

  return new NextResponse(stream as unknown as ReadableStream);
}
