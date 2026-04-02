"use client";

import { useState } from "react";
import { BleacherList } from "./_lib/components/BleacherList";
import { SheetEditBleacher } from "./_lib/components/sheets/SheetEditBleacher";

export default function BleachersPage() {
  const [showDeleted, setShowDeleted] = useState(false);

  return (
    <main className="">
      <SheetEditBleacher />
      <div className="flex items-center justify-end gap-2 px-3 py-2">
        <label htmlFor="show-deleted" className="text-sm text-gray-600 cursor-pointer select-none">
          Show deleted
        </label>
        <input
          type="checkbox"
          id="show-deleted"
          checked={showDeleted}
          onChange={(e) => setShowDeleted(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500 cursor-pointer"
        />
      </div>
      <table className="min-w-full border-collapse border border-gray-200">
        {/* Header */}
        <thead className="bg-gray-100">
          <tr className="border-b border-gray-200">
            <th className="p-3 text-left font-semibold">#</th>
            <th className="p-3 text-left font-semibold">Rows</th>
            <th className="p-3 text-left font-semibold">Seats</th>
            <th className="p-3 text-left font-semibold">Manufacturer</th>
            <th className="p-3 text-left font-semibold">VIN</th>
            <th className="p-3 text-left font-semibold">Tag #</th>
            <th className="p-3 text-left font-semibold">Hitch Type</th>
            <th className="p-3 text-left font-semibold">Trailer Height</th>
            <th className="p-3 text-left font-semibold">Trailer Length</th>
            <th className="p-3 text-left font-semibold">Opening Direction</th>
            <th className="p-3 text-left font-semibold">GVWR</th>
            <th className="p-3 text-left font-semibold">Home Base</th>
            <th className="p-3 text-left font-semibold">Winter Home Base</th>
          </tr>
        </thead>

        {/* Body */}
        <BleacherList showDeleted={showDeleted} />
      </table>
    </main>
  );
}
