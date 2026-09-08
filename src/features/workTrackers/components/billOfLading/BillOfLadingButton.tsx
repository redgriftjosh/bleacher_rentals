"use client";

import { useState } from "react";
import { pdf } from "@react-pdf/renderer";
import { FileText } from "lucide-react";
import { Tables } from "../../../../../database.types";
import { db } from "@/components/providers/SystemProvider";
import { expect, typedGetAll, typedExecute } from "@/lib/powersync/typedQuery";
import { createErrorToast } from "@/components/toasts/ErrorToast";
import { BillOfLadingDocument, BOLBleacherData } from "./BillOfLadingDocument";
import { AddressData } from "../../../eventConfiguration/state/useCurrentEventStore";

type BillOfLadingButtonProps = {
  workTracker: Tables<"WorkTrackers"> | null;
  pickUpAddress: AddressData | null;
  dropOffAddress: AddressData | null;
};

// ─── BOL Number ───────────────────────────────────────────────────────────────
// Format: {bleacher#}-{YYYYMMDD}-{10-digit number derived from WorkTracker UUID}
function generateBolNumber(
  workTrackerId: string,
  bleacherNumber: number | null | undefined,
  date: string | null | undefined,
): string {
  const bleacher = bleacherNumber ? String(bleacherNumber).padStart(3, "0") : "XXX";
  const dateStr = date ? date.replace(/-/g, "") : "NODATE";
  const hex = workTrackerId.replace(/-/g, "").substring(0, 8);
  const num = parseInt(hex, 16).toString().padStart(10, "0");
  return `${bleacher}-${dateStr}-${num}`;
}

// ─── Convert AddressData → Tables<"Addresses"> shape needed by the Document ──
function toAddressRow(addr: AddressData | null): Tables<"Addresses"> | null {
  if (!addr) return null;
  return {
    id: addr.addressUuid ?? "",
    street: addr.address ?? "",
    city: addr.city ?? "",
    state_province: addr.state ?? "",
    zip_postal: addr.postalCode ?? null,
    // fill required DB fields with safe defaults
    country: null,
    created_at: "",
    updated_at: "",
    latitude: null,
    longitude: null,
    place_id: null,
  } as unknown as Tables<"Addresses">;
}

export default function BillOfLadingButton({
  workTracker,
  pickUpAddress,
  dropOffAddress,
}: BillOfLadingButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  // Local-first read of an address row, shaped to the Document's expected type.
  const fetchAddressRow = async (uuid: string): Promise<Tables<"Addresses"> | null> => {
    const rows = await typedGetAll(
      db
        .selectFrom("Addresses as a")
        .select([
          "a.id as id",
          "a.street as street",
          "a.city as city",
          "a.state_province as state_province",
          "a.zip_postal as zip_postal",
        ])
        .where("a.id", "=", uuid)
        .limit(1)
        .compile(),
      expect<{
        id: string;
        street: string | null;
        city: string | null;
        state_province: string | null;
        zip_postal: string | null;
      }>(),
    );
    const r = rows[0];
    if (!r) return null;
    return {
      ...r,
      country: null,
      created_at: "",
      updated_at: "",
      latitude: null,
      longitude: null,
      place_id: null,
    } as unknown as Tables<"Addresses">;
  };

  const handleGenerateBOL = async () => {
    if (!workTracker || workTracker.id === "-1") {
      createErrorToast(["Please save the work tracker before generating a Bill of Lading."]);
      return;
    }

    setIsGenerating(true);
    try {
      // ── Fetch bleacher data (local-first) ────────────────────────────────
      let bleacher: BOLBleacherData | null = null;
      if (workTracker.bleacher_uuid) {
        const rows = await typedGetAll(
          db
            .selectFrom("Bleachers as b")
            .select([
              "b.bleacher_number as bleacher_number",
              "b.bleacher_rows as bleacher_rows",
              "b.bleacher_seats as bleacher_seats",
              "b.vin_number as vin_number",
              "b.hitch_type as hitch_type",
              "b.manufacturer as manufacturer",
              "b.gvwr as gvwr",
              "b.trailer_height_in as trailer_height_in",
              "b.tag_number as tag_number",
            ])
            .where("b.id", "=", workTracker.bleacher_uuid)
            .limit(1)
            .compile(),
          expect<BOLBleacherData>(),
        );
        if (rows[0]) bleacher = rows[0];
      }

      // ── Resolve the work tracker's type code, to know whether Pickup and
      // Delivery collapse into one generic panel (see BillOfLadingDocument) ─
      let isSingleFieldSetType = false;
      if (workTracker.work_tracker_type_uuid) {
        const rows = await typedGetAll(
          db
            .selectFrom("WorkTrackerTypes as t")
            .select(["t.code as code"])
            .where("t.id", "=", workTracker.work_tracker_type_uuid)
            .limit(1)
            .compile(),
          expect<{ code: string | null }>(),
        );
        isSingleFieldSetType = Boolean(rows[0]?.code && rows[0].code !== "trip");
      }

      // ── Fetch full address rows if we only have UUIDs ────────────────────
      let pickupRow: Tables<"Addresses"> | null = toAddressRow(pickUpAddress);
      let dropoffRow: Tables<"Addresses"> | null = toAddressRow(dropOffAddress);

      // If street is blank, try fetching from the local DB by UUID
      if (!pickupRow?.street && workTracker.pickup_address_uuid) {
        const fetched = await fetchAddressRow(workTracker.pickup_address_uuid);
        if (fetched) pickupRow = fetched;
      }
      if (!dropoffRow?.street && workTracker.dropoff_address_uuid) {
        const fetched = await fetchAddressRow(workTracker.dropoff_address_uuid);
        if (fetched) dropoffRow = fetched;
      }

      // ── Persist BOL number (local-first; BackendConnector syncs upstream) ─
      const bolNumber = generateBolNumber(
        workTracker.id,
        bleacher?.bleacher_number,
        workTracker.date,
      );
      await typedExecute(
        db
          .updateTable("WorkTrackers")
          .set({ bol_number: bolNumber, updated_at: new Date().toISOString() })
          .where("id", "=", workTracker.id)
          .compile(),
      );

      // ── Generate PDF blob and trigger download ───────────────────────────
      const blob = await pdf(
        <BillOfLadingDocument
          workTracker={workTracker}
          pickupAddress={pickupRow}
          dropoffAddress={dropoffRow}
          bleacher={bleacher}
          bolNumber={bolNumber}
          isSingleFieldSetType={isSingleFieldSetType}
        />,
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `BOL-${bolNumber}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("BOL generation error:", err);
      createErrorToast(["Failed to generate Bill of Lading:", String(err)]);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <button
      className="text-sm px-3 py-1 rounded border border-darkBlue text-darkBlue cursor-pointer hover:bg-darkBlue hover:text-white transition-all duration-200 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
      onClick={handleGenerateBOL}
      disabled={isGenerating || !workTracker || workTracker.id === "-1"}
      title={workTracker?.id === "-1" ? "Save the work tracker first" : "Download Bill of Lading"}
    >
      <FileText className="w-4 h-4" />
      {isGenerating ? "Generating…" : "BoL"}
    </button>
  );
}
