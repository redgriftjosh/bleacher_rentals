import { ErrorToast } from "@/components/toasts/ErrorToast";
import { InsertBleacher } from "@/types/tables/Bleachers";
import React from "react";
import { toast } from "sonner";

type CheckInsertBleacher = {
  bleacher_number: number | null;
  bleacher_rows: number | null;
  bleacher_seats: number | null;
  home_base_id: number | null;
  winter_home_base_id: number | null;
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
    errors.push("Missing: Rows - how many rows is this bleacher?");
  }
  if (!bleacher.bleacher_seats) {
    errors.push("Missing: Seats - how many seats does this bleacher have?");
  }
  if (!bleacher.home_base_id) {
    errors.push("Missing: Homebase");
  }
  if (!bleacher.winter_home_base_id) {
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
