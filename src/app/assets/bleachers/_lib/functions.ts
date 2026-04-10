import { ErrorToast } from "@/components/toasts/ErrorToast";
import React from "react";
import { toast } from "sonner";

type CheckInsertBleacher = {
  bleacher_number: number | null;
  bleacher_rows: number | null;
  bleacher_seats: number | null;
  summer_home_base_uuid: string | null;
  winter_home_base_uuid: string | null;
};

export function checkInsertBleacherFormRules(
  bleacher: CheckInsertBleacher,
  bleacherNumbers: number[]
): boolean {
  // check if all required fields are filled in
  let errors = [];
  if (!bleacher.bleacher_number) {
    errors.push("Missing: Bleacher Number");
  } else {
    if (bleacherNumbers.includes(bleacher.bleacher_number)) {
      errors.push("Bleacher Number already exists");
    }
  }

  if (!bleacher.bleacher_rows) {
    errors.push("Missing: Rows");
  }
  if (!bleacher.bleacher_seats) {
    errors.push("Missing: Seats");
  }
  if (!bleacher.summer_home_base_uuid) {
    errors.push("Missing: Homebase");
  }
  if (!bleacher.winter_home_base_uuid) {
    errors.push("Missing: Winter Homebase");
  }
  if (errors.length > 0) {
    toast.custom(
      (t) =>
        React.createElement(ErrorToast, {
          id: t,
          lines: errors,
        }),
      {
        duration: 10000, // 20 seconds
      }
    );
    return false;
  } else {
    return true;
  }
}

// Convert total inches to { feet, inches }
export function inchesToFeetAndInches(totalInches: number | null): { feet: number; inches: number } {
  if (totalInches == null) return { feet: 0, inches: 0 };
  return { feet: Math.floor(totalInches / 12), inches: totalInches % 12 };
}

// Convert feet + inches to total inches
export function feetAndInchesToInches(feet: number | null, inches: number | null): number | null {
  const f = feet ?? 0;
  const i = inches ?? 0;
  if (feet == null && inches == null) return null;
  return f * 12 + i;
}

// Format total inches for display: "2ft 1in", "6ft", "9in", or "—"
export function formatInches(totalInches: number | null): string {
  if (totalInches == null) return "—";
  const feet = Math.floor(totalInches / 12);
  const inches = totalInches % 12;
  if (feet > 0 && inches > 0) return `${feet}ft ${inches}in`;
  if (feet > 0) return `${feet}ft`;
  return `${inches}in`;
}
