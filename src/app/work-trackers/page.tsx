"use client";
import { DriverList } from "../../features/workTrackers/components/DriverList";

export default function WorkTrackersPage() {
  return (
    <table className="min-w-full border-collapse border border-gray-200">
      {/* Header */}
      <thead className="bg-gray-100">
        <tr className="border-b border-gray-200">
          <th className="p-3 text-left font-semibold">Driver</th>
        </tr>
      </thead>

      <DriverList />
    </table>
  );
}
