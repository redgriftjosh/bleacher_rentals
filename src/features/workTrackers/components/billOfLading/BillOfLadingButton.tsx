"use client";

import { useState } from "react";
import { pdf } from "@react-pdf/renderer";
import { FileText } from "lucide-react";
import { Tables } from "../../../../../database.types";
import { useClerkSupabaseClient } from "@/utils/supabase/useClerkSupabaseClient";
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
  const supabase = useClerkSupabaseClient();
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateBOL = async () => {
    if (!workTracker || workTracker.id === "-1") {
      createErrorToast(["Please save the work tracker before generating a Bill of Lading."]);
      return;
    }

    setIsGenerating(true);
    try {
      // ── Fetch bleacher data ──────────────────────────────────────────────
      let bleacher: BOLBleacherData | null = null;
      if (workTracker.bleacher_uuid) {
        const { data, error } = await supabase
          .from("Bleachers")
          .select(
            "bleacher_number, bleacher_rows, bleacher_seats, vin_number, hitch_type, manufacturer, gvwr, trailer_height_in, tag_number",
          )
          .eq("id", workTracker.bleacher_uuid)
          .single();

        if (!error && data) {
          bleacher = data as BOLBleacherData;
        }
      }

      // ── Fetch full address rows if we only have UUIDs ────────────────────
      let pickupRow: Tables<"Addresses"> | null = toAddressRow(pickUpAddress);
      let dropoffRow: Tables<"Addresses"> | null = toAddressRow(dropOffAddress);

      // If street is blank, try fetching from DB by UUID
      if ((!pickupRow?.street) && workTracker.pickup_address_uuid) {
        const { data } = await supabase
          .from("Addresses")
          .select("*")
          .eq("id", workTracker.pickup_address_uuid)
          .single();
        if (data) pickupRow = data;
      }
      if ((!dropoffRow?.street) && workTracker.dropoff_address_uuid) {
        const { data } = await supabase
          .from("Addresses")
          .select("*")
          .eq("id", workTracker.dropoff_address_uuid)
          .single();
        if (data) dropoffRow = data;
      }

      // ── Persist BOL number to DB ─────────────────────────────────────────
      const bolNumber = generateBolNumber(
        workTracker.id,
        bleacher?.bleacher_number,
        workTracker.date,
      );
      await supabase
        .from("WorkTrackers")
        .update({ bol_number: bolNumber, updated_at: new Date().toISOString() })
        .eq("id", workTracker.id);

      // ── Generate PDF blob and trigger download ───────────────────────────
      const blob = await pdf(
        <BillOfLadingDocument
          workTracker={workTracker}
          pickupAddress={pickupRow}
          dropoffAddress={dropoffRow}
          bleacher={bleacher}
          bolNumber={bolNumber}
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