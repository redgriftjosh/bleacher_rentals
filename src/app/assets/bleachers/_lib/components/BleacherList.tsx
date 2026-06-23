"use client";
import { useBleachersQuery } from "../db";
import { BleacherItemRow } from "./BleacherItemRow";
import { BleacherListSkeleton } from "./BleacherListSkeleton";

export function BleacherList({ showDeleted = false }: { showDeleted?: boolean }) {
  const bleachers = useBleachersQuery(showDeleted);

  // if (isLoading) return <BleacherListSkeleton />;
  if (!bleachers) return null;

  return (
    <tbody>
      {bleachers.length === 0 ? (
        <tr>
          <td colSpan={13} className="px-4 py-12 text-center text-sm text-gray-400">
            No bleachers to show.
          </td>
        </tr>
      ) : (
        bleachers.map((row, index) => <BleacherItemRow key={index} {...row} />)
      )}
    </tbody>
  );
}
