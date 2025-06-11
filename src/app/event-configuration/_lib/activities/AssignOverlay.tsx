"use client";

import { CreateEventButton } from "@/app/(dashboards)/bleachers-dashboard/_lib/_components/event-configuration/CreateEventButton";
import FilterDashboard from "@/app/(dashboards)/bleachers-dashboard/_lib/_components/FilterDashboard";
// import Dashboard from "@/app/(dashboards)/bleachers-dashboard/_lib/_components/dashboard/Dashboard";
import { useCurrentEventStore } from "@/app/(dashboards)/bleachers-dashboard/_lib/useCurrentEventStore";
import { useFilterDashboardStore } from "@/app/(dashboards)/bleachers-dashboard/_lib/useFilterDashboardStore";
import { CloseButton } from "@/components/CloseButton";
import dynamic from "next/dynamic";

const Dashboard = dynamic(
  () => import("@/app/(dashboards)/bleachers-dashboard/_lib/_components/dashboard/Dashboard"),
  {
    ssr: false,
  }
);
export default function FullscreenModal() {
  const yAxis = useFilterDashboardStore((s) => s.yAxis);
  return (
    <div className="fixed top-0 left-0 w-screen h-screen z-5 bg-white p-2">
      <div className="flex justify-between items-center">
        <FilterDashboard />
        <CloseButton />
      </div>
      <Dashboard yAxis={yAxis} />
    </div>
  );
}
