"use client";
import { useBleachersStore } from "@/state/bleachersStore";
import { fetchBleachers } from "../db";
import { BleacherItemRow } from "./BleacherItemRow";
import { BleacherListSkeleton } from "./BleacherListSkeleton";

export function BleacherList() {
  const bleachers = fetchBleachers();
  // const loading = useBleachersStore((s) => s.loading);
  // if (loading) return <BleacherListSkeleton />;
  return (
    <tbody>
      {bleachers.map((row, index) => (
        <BleacherItemRow key={index} {...row} />
      ))}
    </tbody>
  );
}
