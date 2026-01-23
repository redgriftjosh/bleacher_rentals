"use client";
import { useBleachersQuery } from "../db";
import { BleacherItemRow } from "./BleacherItemRow";
import { BleacherListSkeleton } from "./BleacherListSkeleton";

export function BleacherList() {
  const bleachers = useBleachersQuery();

  // if (isLoading) return <BleacherListSkeleton />;
  if (!bleachers) return null;

  return (
    <tbody>
      {bleachers.map((row, index) => (
        <BleacherItemRow key={index} {...row} />
      ))}
    </tbody>
  );
}
