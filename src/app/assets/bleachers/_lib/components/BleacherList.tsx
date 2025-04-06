"use client";
import { useBleachersStore } from "@/state/bleachersStore";
import { fetchBleachers } from "../db";
import { BleacherItemRow } from "./BleacherItemRow";

export function BleacherList() {
  const bleachers = fetchBleachers();
  return (
    <tbody>
      {bleachers.map((row, index) => (
        <BleacherItemRow key={index} {...row} />
      ))}
    </tbody>
  );
}
