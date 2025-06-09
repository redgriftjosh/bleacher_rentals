"use client";
import { Color } from "@/types/Color";

import { useState } from "react";
const tabs = [
  { id: "bleachers", label: "Bleachers", path: "/assets/bleachers" },
  { id: "other-assets", label: "Other Assets", path: "/assets/other-assets" },
];

export type ExistingUser = {
  user_id: number;
  first_name: string;
  last_name: string;
  email: string;
  role: number;
  status: number;
  homeBases: { id: number; label: string }[];
} | null;

export default function WorkTrackersPage() {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [existingUser, setExistingUser] = useState<ExistingUser>(null);

  return (
    <main className="p-4">
      <div className="flex justify-between items-center mb-4">
        {/* Left Side: Title & Description */}
        <div>
          <h1 className="text-2xl text-darkBlue font-bold">Work Trackers</h1>
          <p className="text-sm" style={{ color: Color.GRAY }}>
            This is where you can see the work trackers for each driver.
          </p>
        </div>
      </div>
      <table className="min-w-full border-collapse border border-gray-200">
        {/* Header */}
        <thead className="bg-gray-100">
          <tr className="border-b border-gray-200">
            <th className="p-3 text-left font-semibold">Name</th>
          </tr>
        </thead>

        {/* Body */}
        {/* <Suspense fallback={<BleacherListSkeleton />}>
          <BleacherList />
        </Suspense> */}
      </table>
    </main>
  );
}
