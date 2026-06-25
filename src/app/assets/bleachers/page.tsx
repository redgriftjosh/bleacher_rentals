"use client";

import { useState } from "react";
import { BleacherList } from "./_lib/components/BleacherList";
import { SheetEditBleacher } from "./_lib/components/sheets/SheetEditBleacher";

const TH =
  "px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 whitespace-nowrap";

export default function BleachersPage() {
  const [showDeleted, setShowDeleted] = useState(false);

  return (
    <main>
      <SheetEditBleacher />

      {/* Toolbar */}
      <div className="flex items-center justify-end px-1 py-2">
        <button
          type="button"
          onClick={() => setShowDeleted((v) => !v)}
          role="switch"
          aria-checked={showDeleted}
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
            showDeleted
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full ${showDeleted ? "bg-red-500" : "bg-gray-300"}`}
          />
          Show deleted
        </button>
      </div>

      {/* macOS-style card containing the table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm ring-1 ring-black/[0.02]">
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-gray-50/80 backdrop-blur-sm">
              <tr className="border-b border-gray-200">
                <th className={TH}>#</th>
                <th className={TH}>Rows</th>
                <th className={TH}>Seats</th>
                <th className={TH}>Manufacturer</th>
                <th className={TH}>VIN</th>
                <th className={TH}>Tag #</th>
                <th className={TH}>Hitch Type</th>
                <th className={TH}>Trailer Height</th>
                <th className={TH}>Trailer Length</th>
                <th className={TH}>Opening Direction</th>
                <th className={TH}>GVWR</th>
                <th className={TH}>Zone</th>
                <th className={TH}>NVIS</th>
              </tr>
            </thead>

            <BleacherList showDeleted={showDeleted} />
          </table>
        </div>
      </div>
    </main>
  );
}
