"use client";
import { Tab } from "../types";

const tabs = [
  { id: "backlog", label: "Backlog" },
  { id: "current", label: "Current" },
  { id: "completed", label: "Completed" },
] as const;

export default function RoadmapTabs({
  selectedTab,
  setSelectedTab,
}: {
  selectedTab: Tab;
  setSelectedTab: (tab: Tab) => void;
}) {
  return (
    <div className="flex justify-start mb-6">
      <div className="flex border border-gray-300 bg-gray-100 rounded overflow-hidden">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedTab(tab.id)}
            className={`px-4 py-2 text-sm font-semibold transition ${
              selectedTab === tab.id
                ? "bg-darkBlue text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 cursor-pointer"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
