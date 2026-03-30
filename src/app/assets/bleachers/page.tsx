import { Suspense } from "react";
import { BleacherList } from "./_lib/components/BleacherList";
import { BleacherListSkeleton } from "./_lib/components/BleacherListSkeleton";
import { SheetEditBleacher } from "./_lib/components/sheets/SheetEditBleacher";

export default function BleachersPage() {
  return (
    <main className="">
      <SheetEditBleacher />
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
            <th className="p-3 text-left font-semibold">NVIS</th>
          </tr>
        </thead>

        {/* Body */}
        <Suspense fallback={<BleacherListSkeleton />}>
          <BleacherList />
        </Suspense>
      </table>
    </main>
  );
}
