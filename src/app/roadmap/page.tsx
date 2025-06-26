"use client";
import { Color } from "@/types/Color";
import { COLUMN_WIDTHS, HEADER_CLASSNAME } from "./_lib/constants";
import TaskList from "./_lib/components/TaskList";
import { SheetAddFeature } from "./_lib/components/SheetAddFeature";
import { useRef, useState } from "react";
import { Tab, Task } from "./_lib/types";
import RoadmapTabs from "./_lib/components/RoadmapTabs";

export default function RoadmapPage() {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [existingTask, setExistingTask] = useState<Task | null>(null);
  const [selectedTab, setSelectedTab] = useState<Tab>("current");
  return (
    <main className="p-4">
      <div className="flex justify-between items-center mb-4">
        {/* Left Side: Title & Description */}
        <div>
          <h1 className="text-2xl text-darkBlue font-bold">Roadmap</h1>
          <p className="text-sm" style={{ color: Color.GRAY }}>
            See and make changes to the upcoming bugs and features in this very software!
          </p>
        </div>
        <SheetAddFeature
          isOpen={isSheetOpen}
          setIsOpen={setIsSheetOpen}
          existingTask={existingTask}
          setExistingTask={setExistingTask}
          setSelectedTab={setSelectedTab}
        />
      </div>
      <RoadmapTabs selectedTab={selectedTab} setSelectedTab={setSelectedTab} />
      <table className="min-w-full border-collapse border border-gray-200">
        {/* Header */}
        <thead className="bg-gray-100">
          <tr className="border-b border-gray-200">
            <th className={`${HEADER_CLASSNAME}`} style={{ width: `${COLUMN_WIDTHS.taskName}px` }}>
              Name
            </th>
            <th className={`${HEADER_CLASSNAME}`}>Description</th>
            <th className={`${HEADER_CLASSNAME} w-[${COLUMN_WIDTHS.type}px]`}>Type</th>
            <th className={`${HEADER_CLASSNAME} w-[${COLUMN_WIDTHS.status}px]`}>Status</th>
          </tr>
        </thead>
        <TaskList
          selectedTab={selectedTab}
          setExistingTask={setExistingTask}
          setIsOpen={setIsSheetOpen}
        />
      </table>
    </main>
  );
}
