"use client";

import { AllWeeksList } from "@/features/workTrackers/components/AllWeeksList";

export default function WorkTrackersPage() {
  return (
    <table className="min-w-full border-collapse border border-gray-200">
      {/* Header */}
      <thead className="bg-gray-100">
        <tr className="border-b border-gray-200">
          <th className="p-3 text-left font-semibold">Week</th>
        </tr>
      </thead>

      <AllWeeksList />
    </table>
  );
}
