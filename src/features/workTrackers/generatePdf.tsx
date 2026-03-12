import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "../../../database.types";
import {
  fetchWorkTrackersForUserUuidAndStartDate,
  fetchDriverHeaderInfo,
  fetchDriverName,
} from "./db/db";
import { calculateFinancialTotals, getDateRange } from "./util";
import { MyDocument } from "./components/PdfComponent";

export async function generateDriverPdfBuffer(
  supabase: SupabaseClient<Database>,
  userUuid: string,
  startDate: string,
): Promise<Buffer> {
  const [data, driverHeaderInfo, driverName] = await Promise.all([
    fetchWorkTrackersForUserUuidAndStartDate(supabase, userUuid, startDate, true),
    fetchDriverHeaderInfo(supabase, userUuid),
    fetchDriverName(userUuid, supabase),
  ]);

  const financialTotals = calculateFinancialTotals(data);
  const dateRange = getDateRange(startDate);

  return renderToBuffer(
    <MyDocument
      workTrackers={data.workTrackers}
      header={{ dateRange, driverName }}
      financialTotals={financialTotals}
      driverHeaderInfo={driverHeaderInfo}
    />,
  );
}
